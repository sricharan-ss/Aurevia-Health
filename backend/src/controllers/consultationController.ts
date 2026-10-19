import { Request, Response } from 'express';
import type { AppDatabase } from '../db';
import { appendTranscriptSegments, completeConsultation, getConsultation, isValidConsultationId, readTranscript, recoverConsultations, startConsultation, transitionConsultation, type ConsultationStatus } from '../db/consultations';
import { getPatient } from '../db/patients';
import { groqEngine, type EngineResult, type FinalReportData } from '../ai-engine/groqEngine';
import { LiveSessionManager } from '../ai-engine/deepgramLive';
import type { ConsultationResponse, Patient, TranscriptChunk } from '../types';
import { sendApiError } from '../http/errors';

export interface ConsultationEngine {
    processLiveChunk(chunks: TranscriptChunk[], patient: Patient, previous?: ConsultationResponse): Promise<EngineResult<Partial<ConsultationResponse>>>;
    generateFinalReport(transcript: TranscriptChunk[], patient: Patient): Promise<EngineResult<FinalReportData>>;
}

interface CachedInsights { lastProcessedSeq: number; data?: ConsultationResponse; }
const emptyInsights = (): ConsultationResponse => ({ soap: { subjective: [], objective: [], assessment: [], plan: [] }, alerts: [], patientSummary: '', suggestedQuestions: [] });

export function createConsultationController(db: AppDatabase, engine: ConsultationEngine = groqEngine, liveSessions = new LiveSessionManager()) {
    const cache = new Map<string, CachedInsights>();
    const locks = new Map<string, Promise<void>>();
    const withLock = async <T>(id: string, action: () => Promise<T>): Promise<T> => {
        const prior = locks.get(id) ?? Promise.resolve();
        let release!: () => void;
        const current = new Promise<void>(resolve => { release = resolve; });
        const tail = prior.then(() => current);
        locks.set(id, tail);
        await prior;
        try { return await action(); }
        finally { release(); if (locks.get(id) === tail) locks.delete(id); }
    };

    const start = (req: Request, res: Response) => {
        const patientId = req.body?.patientId;
        if (typeof patientId !== 'string' || !patientId.trim()) return sendApiError(res, 400, 'BAD_REQUEST', 'patientId is required.');
        const patient = getPatient(db, patientId);
        if (!patient) return sendApiError(res, 404, 'NOT_FOUND', 'Patient not found.');
        try {
            const startedAt = new Date().toISOString();
            const started = startConsultation(db, patient, startedAt);
            cache.set(started.consultationId, { lastProcessedSeq: 0 });
            return res.json({ message: `Consultation started for patient ${patientId}`, patientId, consultationId: started.consultationId,
                startedAt, ...(started.previousInterruptedConsultationId ? { previousInterruptedConsultationId: started.previousInterruptedConsultationId } : {}) });
        } catch { return sendApiError(res, 500, 'PERSISTENCE_FAILED', 'Consultation could not be started.'); }
    };

    const processChunk = async (req: Request, res: Response) => {
        const { consultationId, chunks } = req.body ?? {};
        if (typeof consultationId !== 'string' || !isValidConsultationId(consultationId)) return sendApiError(res, 400, 'VALIDATION_ERROR', 'consultationId is required.');
        if (chunks !== undefined && (!Array.isArray(chunks) || chunks.some((chunk: unknown) => !chunk || typeof chunk !== 'object' || !['doctor', 'patient'].includes((chunk as { speaker?: string }).speaker ?? '') || typeof (chunk as { text?: unknown }).text !== 'string' || !(chunk as { text: string }).text.trim()))) {
            return sendApiError(res, 400, 'VALIDATION_ERROR', 'chunks must contain valid manually entered text.');
        }
        return withLock(consultationId, async () => {
            const consultation = getConsultation(db, consultationId);
            if (!consultation) return sendApiError(res, 404, 'NOT_FOUND', 'Consultation not found.');
            if (consultation.status !== 'active') return sendApiError(res, 409, 'CONFLICT', 'Only active consultations can be processed.');
            try {
                if (chunks?.length) appendTranscriptSegments(db, consultationId, chunks, 'manual');
                const cached = cache.get(consultationId) ?? { lastProcessedSeq: 0 };
                const available = readTranscript(db, consultationId).filter(segment => segment.seq > cached.lastProcessedSeq);
                if (available.length === 0) return res.json({ ...(cached.data ?? emptyInsights()), consultationId, aiStatus: 'ok' as const });
                const patient = JSON.parse(consultation.patient_snapshot_json) as Patient;
                const newText = available.map(segment => ({ speaker: segment.speaker as 'doctor' | 'patient', text: segment.text }));
                const result = await engine.processLiveChunk(newText, patient, cached.data);
                const data = result.data ?? emptyInsights();
                const response: ConsultationResponse = {
                    soap: data.soap ?? emptyInsights().soap, alerts: data.alerts ?? [], patientSummary: data.patientSummary ?? '',
                    suggestedQuestions: data.suggestedQuestions ?? []
                };
                cache.set(consultationId, { lastProcessedSeq: available[available.length - 1].seq, data: response });
                return res.json({ ...response, consultationId, aiStatus: result.status === 'ok' ? 'ok' : 'fallback' });
            } catch {
                return sendApiError(res, 500, 'AI_FAILED', 'Intelligence pipeline failed.');
            }
        });
    };

    const recent = (req: Request, res: Response) => {
        try {
            const includeIncomplete = req.query.includeIncomplete === 'true';
            const statuses: ConsultationStatus[] = includeIncomplete ? ['completed', 'interrupted', 'failed'] : ['completed'];
            const rows = db.prepare(`SELECT c.id,c.patient_id,c.status,c.started_at,c.ended_at,c.patient_snapshot_json,c.report_json,p.name
                FROM consultations c JOIN patients p ON p.id=c.patient_id WHERE c.status IN (${statuses.map(() => '?').join(',')}) ORDER BY COALESCE(c.ended_at,c.started_at) DESC`).all(...statuses) as Array<{ id: string; patient_id: string; status: ConsultationStatus; started_at: string; ended_at: string | null; patient_snapshot_json: string; report_json: string | null; name: string }>;
            return res.json(rows.map(row => {
                const report = JSON.parse(row.report_json ?? '{}') as { aiSummary?: { narrative?: unknown } };
                const item = { id: row.id, patientId: row.patient_id, patientName: row.name, date: row.ended_at ?? row.started_at,
                    summary: typeof report.aiSummary?.narrative === 'string' ? `${report.aiSummary.narrative.substring(0, 100)}...` : '' };
                return includeIncomplete && row.status !== 'completed' ? { ...item, status: row.status } : item;
            }));
        } catch { return sendApiError(res, 500, 'INTERNAL', 'Failed to fetch consultations.'); }
    };

    const report = (req: Request, res: Response) => {
        const id = req.params.id;
        if (typeof id !== 'string' || !isValidConsultationId(id)) return sendApiError(res, 400, 'BAD_REQUEST', 'Invalid report ID.');
        try {
            const consultation = getConsultation(db, id);
            if (!consultation) return sendApiError(res, 404, 'NOT_FOUND', 'Report not found.');
            const transcript = readTranscript(db, id).map(segment => ({ speaker: segment.speaker, text: segment.text, timestamp: segment.spokenAt }));
            const payload = { id, patient: JSON.parse(consultation.patient_snapshot_json), transcript,
                report: consultation.report_json ? JSON.parse(consultation.report_json) : null };
            return consultation.status === 'completed' ? res.json(payload) : res.json({ ...payload, status: consultation.status });
        } catch { return sendApiError(res, 500, 'INTERNAL', 'Failed to fetch report.'); }
    };

    const end = async (req: Request, res: Response) => {
        const consultationId = req.body?.consultationId;
        if (typeof consultationId !== 'string' || !isValidConsultationId(consultationId)) return sendApiError(res, 400, 'VALIDATION_ERROR', 'consultationId is required.');
        return withLock(consultationId, async () => {
            const consultation = getConsultation(db, consultationId);
            if (!consultation) return sendApiError(res, 404, 'NOT_FOUND', 'Consultation not found.');
            if (consultation.status === 'completed' && consultation.report_json) return res.json({ ...JSON.parse(consultation.report_json), consultationId, status: 'completed', alreadyCompleted: true });
            if (consultation.status === 'finalizing') return sendApiError(res, 409, 'CONFLICT', 'Consultation is already being finalized.');
            if (!['active', 'interrupted', 'failed'].includes(consultation.status)) return sendApiError(res, 409, 'CONFLICT', 'Consultation cannot be finalized from its current state.');
            try {
                if (!transitionConsultation(db, consultationId, ['active', 'interrupted', 'failed'], 'finalizing')) return sendApiError(res, 409, 'CONFLICT', 'Consultation state changed. Retry the request.');
            } catch { return sendApiError(res, 500, 'PERSISTENCE_FAILED', 'Consultation state could not be saved. Please retry.'); }
            const drained = await liveSessions.closeAndWait(consultationId, 5000);
            if (!drained) console.warn(`[Consultation] Deepgram flush timed out for ${consultationId}.`);
            const current = getConsultation(db, consultationId)!;
            const transcriptRows = readTranscript(db, consultationId);
            const transcript = transcriptRows.map(segment => ({ speaker: segment.speaker as 'doctor' | 'patient', text: segment.text, timestamp: segment.spokenAt ?? undefined }));
            const patient = JSON.parse(current.patient_snapshot_json) as Patient;
            let result: EngineResult<FinalReportData>;
            try { result = await engine.generateFinalReport(transcript, patient); }
            catch { result = { status: 'error', reason: 'Report generation failed.' }; }
            if (result.status !== 'ok' || !result.data) {
                try { transitionConsultation(db, consultationId, ['finalizing'], 'failed'); } catch { /* best effort state recovery */ }
                return sendApiError(res, 502, 'AI_FAILED', 'Final report generation failed. The consultation can be retried.', { retryable: true });
            }
            try {
                if (!completeConsultation(db, consultationId, result.data)) throw new Error('Finalization state changed.');
            } catch {
                try { transitionConsultation(db, consultationId, ['finalizing'], 'failed'); } catch { /* leave transcript available for recovery */ }
                return sendApiError(res, 500, 'PERSISTENCE_FAILED', 'Final report could not be saved. The consultation can be retried.', { retryable: true });
            }
            cache.delete(consultationId);
            return res.json({ ...result.data, consultationId, status: 'completed' });
        });
    };

    return { startConsultation: start, processConsultationChunk: processChunk, getRecentConsultations: recent,
        getConsultationReport: report, endConsultation: end, recover: () => recoverConsultations(db) };
}

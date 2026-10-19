import { Request, Response } from 'express';
import type { AppDatabase } from '../db';
import { getPatient } from '../db/patients';
import { groqEngine } from '../ai-engine/groqEngine';
import { ConsultationResponse, ConsultationState, Patient } from '../types';
import { sendApiError } from '../http/errors';
import path from 'node:path';

const activeConsultations: Record<string, ConsultationState & { startedAt: string }> = {};

export function resolveReportPath(directory: string, id: string): string | null {
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) return null;
    const basePath = path.resolve(directory);
    const reportPath = path.resolve(basePath, `${id}.json`);
    const relativePath = path.relative(basePath, reportPath);
    if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) return null;
    return reportPath;
}

function reportSummary(report: Record<string, unknown>): string {
    const aiSummary = report.aiSummary;
    if (!aiSummary || typeof aiSummary !== 'object') return '';
    const narrative = (aiSummary as Record<string, unknown>).narrative;
    return typeof narrative === 'string' ? `${narrative.substring(0, 100)}...` : '';
}

export function createConsultationController(db: AppDatabase) {
    const getAll = (_req: Request, res: Response) => {
        try {
            const rows = db.prepare(`SELECT c.id,c.patient_id,c.ended_at,c.report_json,p.name
                FROM consultations c JOIN patients p ON p.id=c.patient_id WHERE c.status='completed' ORDER BY c.ended_at DESC`).all() as Array<{ id: string; patient_id: string; ended_at: string; report_json: string | null; name: string }>;
            return res.json(rows.map(row => {
                const report = JSON.parse(row.report_json ?? '{}') as Record<string, unknown>;
                return { id: row.id, patientId: row.patient_id, patientName: row.name, date: row.ended_at, summary: reportSummary(report) };
            }));
        } catch {
            return sendApiError(res, 500, 'INTERNAL', 'Failed to fetch consultations.');
        }
    };

    const getReport = (req: Request, res: Response) => {
        const id = req.params.id;
        if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) return sendApiError(res, 400, 'BAD_REQUEST', 'Invalid report ID.');
        try {
            const row = db.prepare('SELECT patient_snapshot_json,report_json FROM consultations WHERE id=? AND status=\'completed\'').get(id) as { patient_snapshot_json: string; report_json: string | null } | undefined;
            if (!row || !row.report_json) return sendApiError(res, 404, 'NOT_FOUND', 'Report not found.');
            const transcript = db.prepare('SELECT speaker,text,spoken_at FROM transcript_segments WHERE consultation_id=? ORDER BY seq').all(id) as Array<{ speaker: string; text: string; spoken_at: string | null }>;
            return res.json({ id, patient: JSON.parse(row.patient_snapshot_json), transcript: transcript.map(segment => ({ speaker: segment.speaker, text: segment.text, timestamp: segment.spoken_at })), report: JSON.parse(row.report_json) });
        } catch { return sendApiError(res, 500, 'INTERNAL', 'Failed to fetch report.'); }
    };

    const start = (req: Request, res: Response) => {
        const patientId = req.body?.patientId;
        if (typeof patientId !== 'string' || !patientId.trim()) return sendApiError(res, 400, 'BAD_REQUEST', 'patientId is required.');
        const patient = getPatient(db, patientId);
        if (!patient) return sendApiError(res, 404, 'NOT_FOUND', 'Patient not found.');
        activeConsultations[patientId] = { patientId, transcript: [], doctorPrescriptions: [], extractedSymptoms: [], startedAt: new Date().toISOString() };
        return res.json({ message: `Consultation started for patient ${patientId}`, patientId });
    };

    const processChunk = async (req: Request, res: Response) => {
        const { patientId, chunks } = req.body ?? {};
        if (typeof patientId !== 'string' || !Array.isArray(chunks) || chunks.length === 0 || chunks.some((chunk: unknown) => !chunk || typeof chunk !== 'object' || !['doctor', 'patient'].includes((chunk as { speaker?: string }).speaker ?? '') || typeof (chunk as { text?: unknown }).text !== 'string')) {
            return sendApiError(res, 400, 'VALIDATION_ERROR', 'patientId and a non-empty array of valid chunks are required.');
        }
        const state = activeConsultations[patientId];
        if (!state) return sendApiError(res, 404, 'NOT_FOUND', 'Active consultation not found.');
        const timestamp = new Date().toISOString();
        for (const chunk of chunks as Array<{ speaker: 'doctor' | 'patient'; text: string }>) state.transcript.push({ ...chunk, timestamp });
        try {
            const patient = getPatient(db, patientId) as Patient | undefined;
            if (!patient) return sendApiError(res, 404, 'NOT_FOUND', 'Patient not found.');
            const insights = await groqEngine.processLiveChunk(chunks, patient, state.lastAIPushSummary);
            const response: ConsultationResponse = {
                soap: insights.soap || { subjective: [], objective: [], assessment: [], plan: [] },
                alerts: insights.alerts || [], patientSummary: insights.patientSummary || '', suggestedQuestions: insights.suggestedQuestions || []
            };
            state.lastAIPushSummary = response;
            return res.json(response);
        } catch {
            console.error('Consultation processing failed.');
            return sendApiError(res, 500, 'AI_FAILED', 'Intelligence pipeline failed.');
        }
    };

    const end = async (req: Request, res: Response) => {
        const patientId = req.body?.patientId;
        const state = typeof patientId === 'string' ? activeConsultations[patientId] : undefined;
        if (!state) return sendApiError(res, 400, 'BAD_REQUEST', 'Active consultation not found.');
        const patient = getPatient(db, patientId) as Patient | undefined;
        if (!patient) return sendApiError(res, 404, 'NOT_FOUND', 'Patient not found.');
        let report: Record<string, unknown>;
        try { report = await groqEngine.generateFinalReport(state.transcript, patient) as unknown as Record<string, unknown>; }
        catch {
            console.error('Final report generation failed.');
            return sendApiError(res, 502, 'AI_FAILED', 'Failed to generate final report.');
        }
        const endedAt = new Date().toISOString();
        const consultationId = `${patientId}_${Date.now()}`;
        try {
            const persist = db.transaction(() => {
                db.prepare(`INSERT INTO consultations (id,patient_id,status,started_at,ended_at,patient_snapshot_json,report_json,report_status,created_via)
                    VALUES (?,?,'completed',?,?,?,?,'generated','app')`).run(consultationId, patientId, state.startedAt, endedAt,
                    JSON.stringify(patient), JSON.stringify(report));
                const insertSegment = db.prepare(`INSERT INTO transcript_segments (consultation_id,seq,speaker,text,source,spoken_at)
                    VALUES (?,?,?,?,'manual',?)`);
                state.transcript.forEach((segment, index) => insertSegment.run(consultationId, index + 1, segment.speaker, segment.text, segment.timestamp ?? null));
            });
            persist();
        } catch {
            return sendApiError(res, 500, 'PERSISTENCE_FAILED', 'Consultation report could not be saved. Please retry.');
        }
        delete activeConsultations[patientId];
        return res.json({ ...report, consultationId });
    };

    return { getRecentConsultations: getAll, getConsultationReport: getReport, startConsultation: start,
        processConsultationChunk: processChunk, endConsultation: end };
}

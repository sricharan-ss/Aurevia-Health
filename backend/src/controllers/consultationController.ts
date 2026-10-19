import { Request, Response } from 'express';
import { Patient, ConsultationState, ConsultationResponse } from '../types';
import patientsData from '../data/patients.json';
import fs from 'fs';

import { groqEngine } from '../ai-engine/groqEngine';
import path from 'path';
import { sendApiError } from '../http/errors';

// In-memory state tracking per patient
const activeConsultations: Record<string, ConsultationState> = {};

export function resolveReportPath(directory: string, id: string): string | null {
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) return null;
    const basePath = path.resolve(directory);
    const reportPath = path.resolve(basePath, `${id}.json`);
    const relativePath = path.relative(basePath, reportPath);
    if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) return null;
    return reportPath;
}

export const startConsultation = (req: Request, res: Response) => {
    const { patientId } = req.body;
    if (!patientId) return sendApiError(res, 400, 'BAD_REQUEST', 'patientId is required.');

    activeConsultations[patientId] = {
        patientId,
        transcript: [],
        doctorPrescriptions: [],
        extractedSymptoms: []
    };
    res.json({ message: `Consultation started for patient ${patientId}`, patientId });
};

export const processConsultationChunk = async (req: Request, res: Response) => {
    const { patientId, chunks } = req.body;

    if (!patientId || !chunks || !Array.isArray(chunks) || chunks.length === 0) {
        return sendApiError(res, 400, 'VALIDATION_ERROR', 'patientId and a non-empty array of chunks are required.');
    }

    if (!activeConsultations[patientId]) {
        activeConsultations[patientId] = {
            patientId,
            transcript: [],
            doctorPrescriptions: [],
            extractedSymptoms: []
        };
    }

    const state = activeConsultations[patientId];
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

    for (const chunk of chunks) {
        state.transcript.push({
            speaker: chunk.speaker,
            text: chunk.text,
            timestamp
        });
    }

    try {
        const patient = (patientsData as Patient[]).find(p => p.id === patientId);
        if (!patient) {
            return sendApiError(res, 404, 'NOT_FOUND', 'Patient not found.');
        }

        // Run Groq Intelligence - INCREMENTAL/DELTA MODE
        // We only pass the NEW chunks to the engine, plus the LAST cumulative summary
        const insights = await groqEngine.processLiveChunk(chunks, patient, state.lastAIPushSummary);

        const response: ConsultationResponse = {
            soap: insights.soap || { subjective: [], objective: [], assessment: [], plan: [] },
            alerts: insights.alerts || [],
            patientSummary: insights.patientSummary || "",
            suggestedQuestions: insights.suggestedQuestions || []
        };

        // Cache this as the "New Previous State" for the next 30s flush
        state.lastAIPushSummary = response;

        res.json(response);
    } catch (err) {
        console.error('Consultation processing failed.');
        sendApiError(res, 500, 'AI_FAILED', 'Intelligence pipeline failed.');
    }
};

export const getRecentConsultations = async (req: Request, res: Response) => {
    try {
        const reportDir = './src/data/consultations';
        const absolutePath = path.resolve(reportDir);
        if (!fs.existsSync(reportDir)) {
            return res.json([]);
        }

        const files = fs.readdirSync(reportDir);

        const consultations = files
            .filter(f => f.endsWith('.json'))
            .map(f => {
                try {
                    const filePath = `${reportDir}/${f}`;
                    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                    const stats = fs.statSync(filePath);
                    return {
                        id: f.replace('.json', ''),
                        patientId: content.patient?.id,
                        patientName: content.patient?.name,
                        date: stats.mtime,
                        summary: content.report?.aiSummary?.narrative?.substring(0, 100) + "..."
                    };
                } catch (parseErr) {
                    console.error('[Recent] Failed to parse a consultation record.');
                    return null;
                }
            })
            .filter(c => c !== null)
            .sort((a, b) => (b as any).date.getTime() - (a as any).date.getTime());

        res.json(consultations);
    } catch (err) {
        console.error('[Recent] Failed to fetch consultations.');
        sendApiError(res, 500, 'INTERNAL', 'Failed to fetch consultations.');
    }
};

export const getConsultationReport = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (typeof id !== 'string') return sendApiError(res, 400, 'BAD_REQUEST', 'Invalid report ID.');
        const reportDir = path.resolve('./src/data/consultations');
        const filePath = resolveReportPath(reportDir, id);

        if (!filePath) return sendApiError(res, 400, 'BAD_REQUEST', 'Invalid report ID.');

        if (!fs.existsSync(filePath)) {
            return sendApiError(res, 404, 'NOT_FOUND', 'Report not found.');
        }

        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        res.json(content);
    } catch (err) {
        console.error('[Report] Failed to fetch consultation report.');
        sendApiError(res, 500, 'INTERNAL', 'Failed to fetch report.');
    }
};

export const endConsultation = async (req: Request, res: Response) => {
    const { patientId } = req.body;
    if (!patientId || !activeConsultations[patientId]) {
        return sendApiError(res, 400, 'BAD_REQUEST', 'Active consultation not found.');
    }

    const state = activeConsultations[patientId];

    try {
        const patient = (patientsData as Patient[]).find(p => p.id === patientId);
        if (!patient) {
            return sendApiError(res, 404, 'NOT_FOUND', 'Patient not found.');
        }

        const report = await groqEngine.generateFinalReport(state.transcript, patient);

        // Final persistence for audit/review
        try {
            const reportDir = './src/data/consultations';
            if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

            const filename = `${patientId}_${Date.now()}.json`;
            fs.writeFileSync(`${reportDir}/${filename}`, JSON.stringify({
                patient,
                transcript: state.transcript,
                report
            }, null, 2));
            console.log('[Controller] Saved final consultation report.');
        } catch (saveErr) {
            console.error('Failed to persist consultation report.');
        }

        // Final cleanup
        delete activeConsultations[patientId];

        res.json(report);
    } catch (err) {
        console.error('Final report generation failed.');
        sendApiError(res, 500, 'AI_FAILED', 'Failed to generate final report.');
    }
};

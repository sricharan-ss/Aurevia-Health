import { Request, Response } from 'express';
import { Patient, ConsultationState, ConsultationResponse } from '../types';
import patientsData from '../data/patients.json';
import { checkDrugInteractions } from '../ai-engine/drugInteractions';
import { transcribeAudio } from '../ai-engine/transcription';
import { deepgramService } from '../ai-engine/deepgramLive';
import fs from 'fs';

import { groqEngine } from '../ai-engine/groqEngine';
import path from 'path';

// In-memory state tracking per patient
const activeConsultations: Record<string, ConsultationState> = {};

export const startConsultation = (req: Request, res: Response) => {
    const { patientId } = req.body;
    if (!patientId) return res.status(400).json({ error: 'patientId is required' });

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
        return res.status(400).json({ error: 'patientId and an array of chunks are required' });
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
            return res.status(404).json({ error: 'Patient not found' });
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
        console.error("Pipeline breakdown:", err);
        res.status(500).json({ error: "Intelligence pipeline failed" });
    }
};

export const transcribeAudioUpload = async (req: Request, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No audio file uploaded.' });
    }

    try {
        const filePath = req.file.path;
        const transcript = await transcribeAudio(filePath);
        res.json({ transcript });
    } catch (error) {
        console.error('Transcription error:', error);
        res.status(500).json({ error: 'Transcription failed', fallback: true });
    }
};

export const liveTranscribe = async (req: Request, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No audio provided.' });
    }

    try {
        const audioBuffer = fs.readFileSync(req.file.path);
        const transcript = await deepgramService.transcribeLive(audioBuffer);

        // Cleanup temp file
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.json({ transcript });
    } catch (error) {
        console.error('Deepgram live transcription error:', error);
        res.status(500).json({ error: 'Deepgram transcription failed', fallback: true });
    }
};

export const getRecentConsultations = async (req: Request, res: Response) => {
    try {
        const reportDir = './src/data/consultations';
        const absolutePath = path.resolve(reportDir);
        console.log(`[Recent] Scanning directory: ${absolutePath}`);

        if (!fs.existsSync(reportDir)) {
            console.log(`[Recent] Directory does not exist: ${absolutePath}`);
            return res.json([]);
        }

        const files = fs.readdirSync(reportDir);
        console.log(`[Recent] Found ${files.length} files:`, files);

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
                    console.error(`[Recent] Error parsing ${f}:`, parseErr);
                    return null;
                }
            })
            .filter(c => c !== null)
            .sort((a, b) => (b as any).date.getTime() - (a as any).date.getTime());

        res.json(consultations);
    } catch (err) {
        console.error("[Recent] Failed to fetch consultations:", err);
        res.status(500).json({ error: "Failed to fetch consultations" });
    }
};

export const getConsultationReport = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const filePath = `./src/data/consultations/${id}.json`;

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: "Report not found" });
        }

        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        res.json(content);
    } catch (err) {
        console.error("[Report] Failed to fetch report:", err);
        res.status(500).json({ error: "Failed to fetch report" });
    }
};

export const endConsultation = async (req: Request, res: Response) => {
    const { patientId } = req.body;
    if (!patientId || !activeConsultations[patientId]) {
        return res.status(400).json({ error: 'Active consultation not found' });
    }

    const state = activeConsultations[patientId];

    try {
        const patient = (patientsData as Patient[]).find(p => p.id === patientId);
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
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
            console.log(`[Controller] Saved final report: ${filename}`);
        } catch (saveErr) {
            console.error("Failed to persist report:", saveErr);
        }

        // Final cleanup
        delete activeConsultations[patientId];

        res.json(report);
    } catch (err) {
        console.error("Final report generation failed:", err);
        res.status(500).json({ error: "Failed to generate final report" });
    }
};

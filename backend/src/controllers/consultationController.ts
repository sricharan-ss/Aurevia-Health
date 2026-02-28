import { Request, Response } from 'express';
import { Patient, ConsultationState, ConsultationResponse } from '../types';
import patientsData from '../data/patients.json';
import { checkDrugInteractions } from '../ai-engine/drugInteractions';
import { transcribeAudio } from '../ai-engine/transcription';
import { deepgramService } from '../ai-engine/deepgramLive';
import fs from 'fs';

import { geminiEngine } from '../ai-engine/geminiEngine';

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
    const { patientId, speaker, text } = req.body;

    if (!patientId || !speaker || !text) {
        return res.status(400).json({ error: 'patientId, speaker, and text are required' });
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

    state.transcript.push({ speaker, text, timestamp });

    try {
        // Run Gemini Intelligence
        const insights = await geminiEngine.processLiveChunk(state.transcript);

        const response: ConsultationResponse = {
            soap: insights.soap || { subjective: [], objective: [], assessment: [], plan: [] },
            alerts: insights.alerts || [],
            patientSummary: insights.patientSummary || "",
            suggestedQuestions: insights.suggestedQuestions || []
        };

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

export const endConsultation = async (req: Request, res: Response) => {
    const { patientId } = req.body;
    if (!patientId || !activeConsultations[patientId]) {
        return res.status(400).json({ error: 'Active consultation not found' });
    }

    const state = activeConsultations[patientId];

    try {
        const report = await geminiEngine.generateFinalReport(state.transcript);

        // Final cleanup
        delete activeConsultations[patientId];

        res.json(report);
    } catch (err) {
        console.error("Final report generation failed:", err);
        res.status(500).json({ error: "Failed to generate final report" });
    }
};

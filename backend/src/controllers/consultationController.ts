import { Request, Response } from 'express';
import { Patient, TranscriptChunk, ConsultationResponse } from '../types';
import patientsData from '../data/patients.json';
import { buildSOAP } from '../ai-engine/soapBuilder';
import { generateSummary } from '../ai-engine/summaryGenerator';
import { checkDrugInteractions } from '../ai-engine/drugInteractions';
import { transcribeAudio } from '../ai-engine/transcription';

// In-memory state tracking per patient
// Key: patientId, Value: array of transcript chunks
const activeConsultations: Record<string, TranscriptChunk[]> = {};

export const startConsultation = (req: Request, res: Response) => {
    const { patientId } = req.body;
    if (!patientId) return res.status(400).json({ error: 'patientId is required' });

    // Initialize or reset state for this patient
    activeConsultations[patientId] = [];
    res.json({ message: `Consultation started for patient ${patientId}` });
};

export const processConsultationChunk = (req: Request, res: Response) => {
    const { patientId, speaker, text } = req.body;

    if (!patientId || !speaker || !text) {
        return res.status(400).json({ error: 'patientId, speaker, and text are required' });
    }

    // Ensure consultation is started
    if (!activeConsultations[patientId]) {
        activeConsultations[patientId] = [];
    }

    // Append new chunk
    activeConsultations[patientId].push({ speaker, text });

    // Fetch patient profile for drug interactions
    const patient = (patientsData as Patient[]).find(p => p.id === patientId);
    const chunks = activeConsultations[patientId];

    // Run intelligence pipeline
    const soap = buildSOAP(chunks);
    const patientSummary = generateSummary(chunks);
    const alerts = patient ? checkDrugInteractions(patient, chunks) : [];

    const response: ConsultationResponse = {
        soap,
        alerts,
        patientSummary
    };

    res.json(response);
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

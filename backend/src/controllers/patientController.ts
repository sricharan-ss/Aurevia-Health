import { Request, Response } from 'express';
import type { AppDatabase } from '../db';
import { createPatient, createPatientSchema, getPatient, listPatients, updatePatient, updatePatientSchema } from '../db/patients';
import { sendApiError } from '../http/errors';

function validationDetails(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
    return Object.fromEntries(error.issues.map(issue => [String(issue.path[0] ?? 'body'), issue.message]));
}

export function createPatientController(db: AppDatabase) {
    return {
        getAllPatients: (_req: Request, res: Response) => res.json(listPatients(db)),
        getPatientById: (req: Request, res: Response) => {
            const patient = getPatient(db, String(req.params.id));
            if (!patient) return sendApiError(res, 404, 'NOT_FOUND', 'Patient not found.');
            return res.json(patient);
        },
        createPatient: (req: Request, res: Response) => {
            const parsed = createPatientSchema.safeParse(req.body);
            if (!parsed.success) return sendApiError(res, 400, 'VALIDATION_ERROR', 'Patient details are invalid.', validationDetails(parsed.error));
            try { return res.status(201).json(createPatient(db, parsed.data)); }
            catch { return sendApiError(res, 500, 'PERSISTENCE_FAILED', 'Patient could not be saved.'); }
        },
        updatePatient: (req: Request, res: Response) => {
            const parsed = updatePatientSchema.safeParse(req.body);
            if (!parsed.success) return sendApiError(res, 400, 'VALIDATION_ERROR', 'Patient details are invalid.', validationDetails(parsed.error));
            try {
                const patient = updatePatient(db, String(req.params.id), parsed.data);
                if (!patient) return sendApiError(res, 404, 'NOT_FOUND', 'Patient not found.');
                return res.json(patient);
            } catch { return sendApiError(res, 500, 'PERSISTENCE_FAILED', 'Patient could not be saved.'); }
        }
    };
}

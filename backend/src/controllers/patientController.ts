import { Request, Response } from 'express';
import patientsData from '../data/patients.json';
import { Patient } from '../types';
import { sendApiError } from '../http/errors';

export const getAllPatients = (req: Request, res: Response) => {
    res.json(patientsData);
};

export const getPatientById = (req: Request, res: Response) => {
    const { id } = req.params;
    const patient = (patientsData as Patient[]).find(p => p.id === id);

    if (!patient) {
        return sendApiError(res, 404, 'NOT_FOUND', 'Patient not found.');
    }

    res.json(patient);
};

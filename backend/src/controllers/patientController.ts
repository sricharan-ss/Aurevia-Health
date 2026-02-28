import { Request, Response } from 'express';
import patientsData from '../data/patients.json';
import { Patient } from '../types';

export const getAllPatients = (req: Request, res: Response) => {
    res.json(patientsData);
};

export const getPatientById = (req: Request, res: Response) => {
    const { id } = req.params;
    const patient = (patientsData as Patient[]).find(p => p.id === id);

    if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(patient);
};

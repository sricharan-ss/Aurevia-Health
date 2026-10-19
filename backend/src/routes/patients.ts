import { Router } from 'express';
import type { AppDatabase } from '../db';
import { createPatientController } from '../controllers/patientController';

export default function patientRoutes(db: AppDatabase): Router {
    const router = Router();
    const controller = createPatientController(db);
    router.get('/', controller.getAllPatients);
    router.post('/', controller.createPatient);
    router.get('/:id', controller.getPatientById);
    router.patch('/:id', controller.updatePatient);
    return router;
}

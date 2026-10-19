import { Router } from 'express';
import type { AppDatabase } from '../db';
import { createConsultationController } from '../controllers/consultationController';

export default function consultationRoutes(db: AppDatabase): Router {
    const router = Router();
    const controller = createConsultationController(db);
    router.get('/recent', controller.getRecentConsultations);
    router.get('/report/:id', controller.getConsultationReport);
    router.post('/start', controller.startConsultation);
    router.post('/process', controller.processConsultationChunk);
    router.post('/end', controller.endConsultation);
    return router;
}

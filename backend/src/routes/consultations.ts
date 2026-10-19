import { Router } from 'express';
import type { AppDatabase } from '../db';
import { createConsultationController, type ConsultationEngine } from '../controllers/consultationController';
import { LiveSessionManager } from '../ai-engine/deepgramLive';

export default function consultationRoutes(db: AppDatabase, engine?: ConsultationEngine, liveSessions?: LiveSessionManager): Router {
    const router = Router();
    const controller = createConsultationController(db, engine, liveSessions);
    router.get('/recent', controller.getRecentConsultations);
    router.get('/report/:id', controller.getConsultationReport);
    router.post('/start', controller.startConsultation);
    router.post('/process', controller.processConsultationChunk);
    router.post('/end', controller.endConsultation);
    return router;
}

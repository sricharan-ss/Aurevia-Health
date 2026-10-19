import { Router } from 'express';
import {
    startConsultation,
    processConsultationChunk,
    endConsultation,
    getRecentConsultations,
    getConsultationReport
} from '../controllers/consultationController';

const router = Router();

router.get('/recent', getRecentConsultations);
router.get('/report/:id', getConsultationReport);
router.post('/start', startConsultation);
router.post('/process', processConsultationChunk);
router.post('/end', endConsultation);

export default router;

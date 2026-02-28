import { Router } from 'express';
import multer from 'multer';
import {
    startConsultation,
    processConsultationChunk,
    transcribeAudioUpload,
    liveTranscribe,
    endConsultation
} from '../controllers/consultationController';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.post('/start', startConsultation);
router.post('/process', processConsultationChunk);
router.post('/transcribe', upload.single('audio'), transcribeAudioUpload);
router.post('/live-transcribe', upload.single('audio'), liveTranscribe);
router.post('/end', endConsultation);

export default router;

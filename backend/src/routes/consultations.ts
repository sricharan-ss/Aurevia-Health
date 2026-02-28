import { Router } from 'express';
import multer from 'multer';
import {
    startConsultation,
    processConsultationChunk,
    transcribeAudioUpload
} from '../controllers/consultationController';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.post('/start', startConsultation);
router.post('/process', processConsultationChunk);
router.post('/transcribe', upload.single('audio'), transcribeAudioUpload);

export default router;

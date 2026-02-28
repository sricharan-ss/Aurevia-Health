import { Router } from 'express';
import { getAllPatients, getPatientById } from '../controllers/patientController';

const router = Router();

router.get('/', getAllPatients);
router.get('/:id', getPatientById);

export default router;

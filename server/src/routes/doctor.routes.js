import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { doctorController } from '../controllers/doctor.controller.js';
import {
  verifyFaceSchema,
  verifyRfidSchema,
  verifyBluetoothSchema,
  verifyWifiSchema,
  verifyGpsSchema,
  prescriptionSchema,
  createPrescriptionSchema,
  completeConsultationSchema,
  startConsultationSchema,
} from '../validators/doctor.validator.js';

const router = Router();
router.use(protect, restrictTo('doctor'));

// Dashboard & schedule
router.get('/dashboard', doctorController.dashboard);
router.get('/schedule', doctorController.schedule);
router.get('/appointments/:id', doctorController.appointmentDetail);

// Consultation flow
router.post('/consultation/start', validate(startConsultationSchema), doctorController.startConsultation);
router.post('/appointments/:id/complete', validate(completeConsultationSchema), doctorController.completeConsultation);
router.post('/appointments/:id/prescription', validate(prescriptionSchema), doctorController.savePrescription);
router.get('/patients/:patientId/history', doctorController.patientHistory);
router.get('/prescriptions', doctorController.prescriptions);
// Standalone prescription creation (doctor selects a patient directly).
router.post('/prescriptions', validate(createPrescriptionSchema), doctorController.createPrescription);
// Patient search for the prescription patient-selector.
router.get('/patients', doctorController.listPatients);

// Presence verification
router.get('/presence', doctorController.presenceState);
router.get('/presence/logs', doctorController.presenceLogs);
router.post('/presence/face', validate(verifyFaceSchema), doctorController.verifyFace);
router.post('/presence/rfid', validate(verifyRfidSchema), doctorController.verifyRfid);
router.post('/presence/bluetooth', validate(verifyBluetoothSchema), doctorController.verifyBluetooth);
router.post('/presence/wifi', validate(verifyWifiSchema), doctorController.verifyWifi);
router.post('/presence/gps', validate(verifyGpsSchema), doctorController.verifyGps);
router.post('/presence/confidence', doctorController.runConfidence);
router.post('/presence/manual', doctorController.manualActivate);

// Account
router.post('/change-password', doctorController.changePassword);

export default router;

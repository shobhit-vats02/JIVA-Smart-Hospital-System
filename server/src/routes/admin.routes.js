import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { adminController } from '../controllers/admin.controller.js';
import {
  createDoctorSchema,
  updateDoctorSchema,
  createPatientSchema,
  updatePatientSchema,
  updateAppointmentSchema,
  createEmergencySchema,
  updateEmergencySchema,
} from '../validators/admin.validator.js';

const router = Router();
router.use(protect, restrictTo('admin'));

// Dashboard
router.get('/dashboard', adminController.dashboard);
router.get('/departments', adminController.departments);

// Doctors
router.get('/doctors', adminController.listDoctors);
router.post('/doctors', validate(createDoctorSchema), adminController.createDoctor);
router.get('/doctors/:id', adminController.doctorDetail);
router.patch('/doctors/:id', validate(updateDoctorSchema), adminController.updateDoctor);
router.delete('/doctors/:id', adminController.deleteDoctor);

// Patients
router.get('/patients', adminController.listPatients);
router.post('/patients', validate(createPatientSchema), adminController.createPatient);
router.patch('/patients/:id', validate(updatePatientSchema), adminController.updatePatient);
router.delete('/patients/:id', adminController.deletePatient);

// Appointments
router.get('/appointments', adminController.listAppointments);
router.patch('/appointments/:id', validate(updateAppointmentSchema), adminController.updateAppointment);

// Analytics
router.get('/analytics', adminController.analytics);

// Emergency Response Center
router.get('/emergency/command', adminController.commandCenter);
router.get('/emergency', adminController.listEmergencies);
router.post('/emergency', validate(createEmergencySchema), adminController.createEmergency);
router.get('/emergency/:id', adminController.getEmergency);
router.post('/emergency/:id/dispatch', adminController.dispatchAmbulance);
router.post('/emergency/:id/alert', adminController.alertHospital);
router.post('/emergency/:id/contact', adminController.notifyContact);
router.post('/emergency/:id/location', adminController.shareLocation);
router.post('/emergency/:id/status', validate(updateEmergencySchema), adminController.updateEmergencyStatus);
router.post('/emergency/mode/activate', adminController.emergencyMode);

// Account
router.post('/change-password', adminController.changePassword);

export default router;

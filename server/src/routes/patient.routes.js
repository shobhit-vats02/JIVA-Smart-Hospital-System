import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  book as bookAppointment,
  preview as previewAppointment,
  list as listAppointments,
  detail as appointmentDetail,
  cancel as cancelAppointment,
} from '../controllers/appointment.controller.js';
import { listDepartments, listDoctors } from '../controllers/department.controller.js';
import { list as listNotifications, markRead, markAllRead } from '../controllers/notification.controller.js';
import { status as queueStatus } from '../controllers/queue.controller.js';
import { getProfile, updateProfile, changePassword, healthPass, prescriptions, createEmergency, listEmergencies, emergencyAction } from '../controllers/patient.controller.js';
import { session as videoSession, start as startVideo, end as endVideo, message as videoMessage } from '../controllers/video.controller.js';
import {
  bookAppointmentSchema,
  cancelAppointmentSchema,
  listAppointmentsSchema,
} from '../validators/appointment.validator.js';
import { z } from 'zod';

const router = Router();

// All patient routes require a logged-in patient.
router.use(protect, restrictTo('patient'));

// Departments & doctors (used by the booking flow).
router.get('/departments', listDepartments);
router.get('/doctors', listDoctors);

// Appointments.
router.get('/appointments', validate(listAppointmentsSchema, 'query'), listAppointments);
router.get('/appointments/:id', appointmentDetail);
router.post('/appointments/preview', validate(bookAppointmentSchema), previewAppointment);
router.post('/appointments', validate(bookAppointmentSchema), bookAppointment);
router.post('/appointments/:id/cancel', validate(cancelAppointmentSchema), cancelAppointment);

// Queue status.
router.get('/queue/status', queueStatus);

// Notifications.
router.get('/notifications', listNotifications);
router.post('/notifications/:id/read', markRead);
router.post('/notifications/read-all', markAllRead);

// Profile.
router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.post('/profile/change-password', changePassword);

// Health pass + prescriptions.
router.get('/health-pass', healthPass);
router.get('/prescriptions', prescriptions);

// Emergency (patient raises + views own cases).
router.get('/emergency', listEmergencies);
router.post('/emergency', createEmergency);
router.post('/emergency/:id/:action', emergencyAction);

// Video consultation.
router.post('/video/session', validate(z.object({ appointmentId: z.string().min(1) })), videoSession);
router.post('/video/:id/start', startVideo);
router.post('/video/:id/end', endVideo);
router.post('/video/:id/message', validate(z.object({ text: z.string().min(1) })), videoMessage);

export default router;

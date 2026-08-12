import { doctorService } from '../services/doctor.service.js';
import { presenceService } from '../services/presence.service.js';
import { success, failure } from '../utils/response.js';
import { asyncHandler } from '../utils/async.js';

// ---- Dashboard & schedule ----
export const dashboard = asyncHandler(async (req, res) => {
  const data = await doctorService.getDashboard(req.user.id);
  return success(res, data, 'Doctor dashboard');
});

export const schedule = asyncHandler(async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const appointments = await doctorService.getTodaySchedule(req.user.id, date);
  return success(res, appointments, 'Schedule retrieved');
});

export const appointmentDetail = asyncHandler(async (req, res) => {
  const a = await doctorService.getAppointmentDetail(req.user.id, req.params.id);
  return success(res, a, 'Appointment detail');
});

// ---- Consultation flow ----
export const startConsultation = asyncHandler(async (req, res) => {
  const a = await doctorService.startConsultation(req.user.id, req.body.appointmentId);
  return success(res, a, 'Consultation started');
});

export const completeConsultation = asyncHandler(async (req, res) => {
  const a = await doctorService.completeConsultation(req.user.id, req.params.id, req.body.notes);
  return success(res, a, 'Consultation completed');
});

export const savePrescription = asyncHandler(async (req, res) => {
  const rx = await doctorService.savePrescription(req.user.id, req.params.id, req.body);
  return success(res, rx, 'Prescription saved');
});

/**
 * Create a standalone prescription. The doctor is taken from the authenticated
 * session (req.user.id) — never from the request body — so the recorded
 * prescriber is always the logged-in doctor.
 */
export const createPrescription = asyncHandler(async (req, res) => {
  const rx = await doctorService.createPrescription(req.user.id, {
    patientId: req.body.patientId,
    medicines: req.body.medicines,
    notes: req.body.notes,
  });
  return success(res, rx, 'Prescription created', 201);
});

/**
 * Search patients (for the doctor to select a patient when writing a
 * prescription). Returns a limited set; only read access for the doctor.
 */
export const listPatients = asyncHandler(async (req, res) => {
  const search = (req.query.search || '').trim();
  const Patient = (await import('../models/Patient.js')).default;
  const filter = search
    ? { $or: [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }, { phone: new RegExp(search, 'i') }] }
    : {};
  const patients = await Patient.find(filter).select('name email phone gender age bloodGroup').sort({ name: 1 }).limit(50).exec();
  return success(res, patients, 'Patients retrieved');
});

export const patientHistory = asyncHandler(async (req, res) => {
  const data = await doctorService.getPatientHistory(req.params.patientId);
  return success(res, data, 'Patient history');
});

export const prescriptions = asyncHandler(async (req, res) => {
  const data = await doctorService.getDoctorPrescriptions(req.user.id);
  return success(res, data, 'Prescriptions retrieved');
});

// ---- Presence verification ----
export const presenceState = asyncHandler(async (req, res) => {
  const state = await presenceService.getPresenceState(req.user.id);
  return success(res, state, 'Presence state');
});

export const verifyFace = asyncHandler(async (req, res) => {
  const r = await presenceService.verifyFace({ doctorId: req.user.id, score: req.body.score });
  return success(res, r, 'Face verification result');
});

export const verifyRfid = asyncHandler(async (req, res) => {
  const r = await presenceService.verifyRfid({ doctorId: req.user.id, cardId: req.body.cardId });
  return success(res, r, 'RFID verification result');
});

export const verifyBluetooth = asyncHandler(async (req, res) => {
  const r = await presenceService.verifyBluetooth({ doctorId: req.user.id, device: req.body.device });
  return success(res, r, 'Bluetooth verification result');
});

export const verifyWifi = asyncHandler(async (req, res) => {
  const r = await presenceService.verifyWifi({ doctorId: req.user.id, ssid: req.body.ssid });
  return success(res, r, 'WiFi verification result');
});

export const verifyGps = asyncHandler(async (req, res) => {
  const r = await presenceService.verifyGps({ doctorId: req.user.id, lat: req.body.lat, lng: req.body.lng });
  return success(res, r, 'GPS verification result');
});

export const runConfidence = asyncHandler(async (req, res) => {
  const r = await presenceService.runConfidenceEngine({ doctorId: req.user.id });
  return success(res, r, 'Presence confidence evaluated');
});

export const manualActivate = asyncHandler(async (req, res) => {
  const doctor = await presenceService.manualActivate({ doctorId: req.user.id });
  return success(res, doctor, 'Presence manually confirmed');
});

export const presenceLogs = asyncHandler(async (req, res) => {
  const logs = await presenceService.getPresenceLogs(req.user.id);
  return success(res, logs, 'Presence logs');
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const Doctor = (await import('../models/Doctor.js')).default;
  const doctor = await Doctor.findById(req.user.id).select('+passwordHash').exec();
  const ok = await doctor.comparePassword(currentPassword);
  if (!ok) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  const bcrypt = (await import('bcryptjs')).default;
  doctor.passwordHash = await bcrypt.hash(newPassword, 12);
  await doctor.save({ validateBeforeSave: false });
  return success(res, null, 'Password updated');
});

export const doctorController = {
  dashboard,
  schedule,
  appointmentDetail,
  startConsultation,
  completeConsultation,
  savePrescription,
  createPrescription,
  listPatients,
  patientHistory,
  presenceState,
  verifyFace,
  verifyRfid,
  verifyBluetooth,
  verifyWifi,
  verifyGps,
  runConfidence,
  manualActivate,
  presenceLogs,
  changePassword,
  prescriptions,
};

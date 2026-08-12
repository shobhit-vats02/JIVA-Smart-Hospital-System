import { patientService } from '../services/patient.service.js';
import { success, created, failure } from '../utils/response.js';
import { asyncHandler } from '../utils/async.js';

export const getProfile = asyncHandler(async (req, res) => {
  const data = await patientService.getProfile(req.user.id);
  return success(res, data, 'Profile retrieved');
});

export const updateProfile = asyncHandler(async (req, res) => {
  const patient = await patientService.updateProfile(req.user.id, req.body);
  return success(res, patient, 'Profile updated');
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const Patient = (await import('../models/Patient.js')).default;
  const patient = await Patient.findById(req.user.id).select('+passwordHash').exec();
  const ok = await patient.comparePassword(currentPassword);
  if (!ok) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  const bcrypt = (await import('bcryptjs')).default;
  patient.passwordHash = await bcrypt.hash(newPassword, 12);
  await patient.save({ validateBeforeSave: false });
  return success(res, null, 'Password updated');
});

export const healthPass = asyncHandler(async (req, res) => {
  const data = await patientService.getHealthPass(req.user.id);
  return success(res, data, 'Health pass retrieved');
});

// ---- Patient emergency ----
export const createEmergency = asyncHandler(async (req, res) => {
  const { emergencyService } = await import('../services/emergency.service.js');
  const Patient = (await import('../models/Patient.js')).default;
  const patient = await Patient.findById(req.user.id).exec();
  const { description, severity, location } = req.body;
  const c = await emergencyService.createEmergency({
    patientId: req.user.id,
    patientName: patient?.name || '',
    phone: patient?.phone || '',
    emergencyContactName: patient?.emergencyContact?.name || '',
    emergencyContactPhone: patient?.emergencyContact?.phone || '',
    description,
    severity: severity || 'high',
    location: location || {},
  });
  return created(res, c, 'Emergency raised');
});

export const listEmergencies = asyncHandler(async (req, res) => {
  const EmergencyCase = (await import('../models/EmergencyCase.js')).default;
  const cases = await EmergencyCase.find({ patient: req.user.id })
    .sort({ createdAt: -1 })
    .limit(10)
    .exec();
  return success(res, cases, 'Emergency cases');
});

export const emergencyAction = asyncHandler(async (req, res) => {
  const { emergencyService } = await import('../services/emergency.service.js');
  const EmergencyCase = (await import('../models/EmergencyCase.js')).default;
  const c = await EmergencyCase.findOne({ _id: req.params.id, patient: req.user.id }).exec();
  if (!c) return failure(res, 'Emergency case not found', 404);

  const action = req.params.action; // dispatch | alert | contact
  let result;
  if (action === 'dispatch') result = await emergencyService.dispatchAmbulance(c._id);
  else if (action === 'alert') result = await emergencyService.alertHospital(c._id);
  else if (action === 'contact') result = await emergencyService.notifyEmergencyContact(c._id);
  else return failure(res, 'Unknown action', 400);
  return success(res, result, 'Emergency action completed');
});

export const prescriptions = asyncHandler(async (req, res) => {
  const data = await patientService.getPrescriptions(req.user.id);
  return success(res, data, 'Prescriptions retrieved');
});

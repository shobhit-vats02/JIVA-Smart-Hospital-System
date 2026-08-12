import { adminService } from '../services/admin.service.js';
import { emergencyService } from '../services/emergency.service.js';
import { departmentService } from '../services/department.service.js';
import { success, created } from '../utils/response.js';
import { asyncHandler } from '../utils/async.js';

// ---- Dashboard ----
export const dashboard = asyncHandler(async (req, res) => {
  const data = await adminService.getDashboard();
  return success(res, data, 'Admin dashboard');
});

// ---- Departments ----
export const departments = asyncHandler(async (req, res) => {
  const data = await departmentService.listDepartments();
  return success(res, data, 'Departments');
});

// ---- Doctors ----
export const listDoctors = asyncHandler(async (req, res) => {
  const doctors = await adminService.listDoctors(req.query);
  return success(res, doctors, 'Doctors');
});
export const createDoctor = asyncHandler(async (req, res) => {
  const doctor = await adminService.createDoctor(req.body);
  return created(res, doctor, 'Doctor created');
});
export const updateDoctor = asyncHandler(async (req, res) => {
  const doctor = await adminService.updateDoctor(req.params.id, req.body);
  return success(res, doctor, 'Doctor updated');
});
export const deleteDoctor = asyncHandler(async (req, res) => {
  await adminService.deleteDoctor(req.params.id);
  return success(res, null, 'Doctor deleted');
});
export const doctorDetail = asyncHandler(async (req, res) => {
  const data = await adminService.getDoctorDetail(req.params.id);
  return success(res, data, 'Doctor detail');
});

// ---- Patients ----
export const listPatients = asyncHandler(async (req, res) => {
  const patients = await adminService.listPatients(req.query);
  return success(res, patients, 'Patients');
});
export const createPatient = asyncHandler(async (req, res) => {
  const patient = await adminService.createPatient(req.body);
  return created(res, patient, 'Patient created');
});
export const updatePatient = asyncHandler(async (req, res) => {
  const patient = await adminService.updatePatient(req.params.id, req.body);
  return success(res, patient, 'Patient updated');
});
export const deletePatient = asyncHandler(async (req, res) => {
  await adminService.deletePatient(req.params.id);
  return success(res, null, 'Patient deleted');
});

// ---- Appointments ----
export const listAppointments = asyncHandler(async (req, res) => {
  const appointments = await adminService.listAppointments(req.query);
  return success(res, appointments, 'Appointments');
});
export const updateAppointment = asyncHandler(async (req, res) => {
  const a = await adminService.updateAppointmentStatus(req.params.id, req.body);
  return success(res, a, 'Appointment updated');
});

// ---- Analytics ----
export const analytics = asyncHandler(async (req, res) => {
  const data = await adminService.getAnalytics();
  return success(res, data, 'Analytics');
});

// ---- Emergency Response Center ----
export const commandCenter = asyncHandler(async (req, res) => {
  const data = await emergencyService.getCommandCenter();
  return success(res, data, 'Command center');
});
export const createEmergency = asyncHandler(async (req, res) => {
  const c = await emergencyService.createEmergency(req.body);
  return created(res, c, 'Emergency case created');
});
export const listEmergencies = asyncHandler(async (req, res) => {
  const cases = await emergencyService.listEmergencies(req.query.status);
  return success(res, cases, 'Emergency cases');
});
export const getEmergency = asyncHandler(async (req, res) => {
  const c = await emergencyService.getEmergency(req.params.id);
  return success(res, c, 'Emergency case');
});
export const dispatchAmbulance = asyncHandler(async (req, res) => {
  const c = await emergencyService.dispatchAmbulance(req.params.id);
  return success(res, c, 'Ambulance dispatched');
});
export const alertHospital = asyncHandler(async (req, res) => {
  const c = await emergencyService.alertHospital(req.params.id);
  return success(res, c, 'Hospital alerted');
});
export const notifyContact = asyncHandler(async (req, res) => {
  const c = await emergencyService.notifyEmergencyContact(req.params.id);
  return success(res, c, 'Emergency contact notified');
});
export const shareLocation = asyncHandler(async (req, res) => {
  const c = await emergencyService.shareLocation(req.params.id, req.body);
  return success(res, c, 'Location shared');
});
export const emergencyMode = asyncHandler(async (req, res) => {
  const r = await emergencyService.activateEmergencyMode();
  return success(res, r, 'Emergency mode activated');
});
export const updateEmergencyStatus = asyncHandler(async (req, res) => {
  const c = await emergencyService.updateStatus(req.params.id, req.body.status);
  return success(res, c, 'Emergency status updated');
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const Admin = (await import('../models/Admin.js')).default;
  const admin = await Admin.findById(req.user.id).select('+passwordHash').exec();
  const ok = await admin.comparePassword(currentPassword);
  if (!ok) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  const bcrypt = (await import('bcryptjs')).default;
  admin.passwordHash = await bcrypt.hash(newPassword, 12);
  await admin.save({ validateBeforeSave: false });
  return success(res, null, 'Password updated');
});

export const adminController = {
  dashboard,
  departments,
  listDoctors,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  doctorDetail,
  listPatients,
  createPatient,
  updatePatient,
  deletePatient,
  listAppointments,
  updateAppointment,
  analytics,
  commandCenter,
  createEmergency,
  listEmergencies,
  getEmergency,
  dispatchAmbulance,
  alertHospital,
  notifyContact,
  shareLocation,
  emergencyMode,
  updateEmergencyStatus,
  changePassword,
};

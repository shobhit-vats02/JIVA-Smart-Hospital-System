import bcrypt from 'bcryptjs';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import Admin from '../models/Admin.js';
import Department from '../models/Department.js';
import Appointment from '../models/Appointment.js';
import EmergencyCase from '../models/EmergencyCase.js';
import HospitalAnalytics from '../models/HospitalAnalytics.js';
import PresenceLog from '../models/PresenceLog.js';
import { AppError } from '../utils/appError.js';
import { notificationService } from './notification.service.js';
import { emitAll } from '../config/realtime.js';

/** Admin dashboard metrics (realtime-ish). */
export async function getDashboard() {
  const date = new Date().toISOString().slice(0, 10);

  const [
    doctors,
    totalAppointmentsToday,
    completedToday,
    emergencies,
    patientsWaiting,
    activeEmergencies,
  ] = await Promise.all([
    Doctor.find({}).populate('department').exec(),
    Appointment.countDocuments({ date, status: { $nin: ['cancelled'] } }),
    Appointment.countDocuments({ date, status: 'completed' }),
    Appointment.countDocuments({ date, status: 'emergency' }),
    Appointment.countDocuments({ date, status: { $in: ['waiting', 'in_consultation'] } }),
    EmergencyCase.countDocuments({ status: { $nin: ['treated', 'closed'] } }),
  ]);

  const doctorsOnline = doctors.filter((d) => d.isPresent).length;
  const doctorsBusy = doctors.filter((d) => d.isAvailable && d.currentPatient).length;
  const doctorsOffline = doctors.length - doctorsOnline;
  const totalWaiting = await Appointment.countDocuments({ date, status: 'waiting' });

  const efficiency = completedToday && totalAppointmentsToday
    ? Math.round((completedToday / totalAppointmentsToday) * 100)
    : 0;

  return {
    metrics: {
      doctorsOnline,
      doctorsBusy,
      doctorsOffline,
      totalDoctors: doctors.length,
      patientsWaiting: totalWaiting,
      appointmentsToday: totalAppointmentsToday,
      completedToday,
      emergenciesToday: emergencies,
      activeEmergencies,
      efficiency,
    },
    recentEmergencies: await EmergencyCase.find({}).sort({ createdAt: -1 }).limit(5).populate('department').exec(),
    recentAppointments: await Appointment.find({ date }).populate('patient').populate('doctor').sort({ createdAt: -1 }).limit(8).exec(),
  };
}

// ===== Doctor management =====

export async function listDoctors(query = {}) {
  const filter = {};
  if (query.search) {
    const re = new RegExp(query.search, 'i');
    filter.$or = [{ name: re }, { staffId: re }, { specialty: re }];
  }
  if (query.departmentId) filter.department = query.departmentId;
  if (query.status === 'online') filter.isPresent = true;
  if (query.status === 'offline') filter.isPresent = false;
  return Doctor.find(filter).populate('department').sort({ name: 1 }).exec();
}

export async function createDoctor(payload) {
  const exists = await Doctor.findOne({ staffId: payload.staffId.toUpperCase() }).exec();
  if (exists) throw new AppError('A doctor with this staff ID already exists', 409);
  const emailExists = await Doctor.findOne({ email: payload.email.toLowerCase() }).exec();
  if (emailExists) throw new AppError('A doctor with this email already exists', 409);

  const passwordHash = await bcrypt.hash(payload.password || 'doctor123', 12);
  const doctor = await Doctor.create({
    name: payload.name,
    staffId: payload.staffId.toUpperCase(),
    email: payload.email.toLowerCase(),
    phone: payload.phone || '',
    passwordHash,
    department: payload.departmentId || null,
    specialty: payload.specialty || '',
    qualification: payload.qualification || '',
    yearsOfExperience: payload.yearsOfExperience || 0,
    avgConsultationMinutes: payload.avgConsultationMinutes || 12,
    rfidTag: payload.rfidTag || '',
  });
  return Doctor.findById(doctor._id).populate('department').exec();
}

export async function updateDoctor(id, payload) {
  const allowed = ['name', 'phone', 'specialty', 'qualification', 'yearsOfExperience', 'avgConsultationMinutes', 'departmentId', 'rfidTag', 'isActive', 'isAvailable', 'isPresent'];
  const clean = {};
  for (const k of allowed) if (payload[k] !== undefined) clean[k === 'departmentId' ? 'department' : k] = payload[k];
  const doctor = await Doctor.findByIdAndUpdate(id, { $set: clean }, { new: true }).populate('department').exec();
  if (!doctor) throw new AppError('Doctor not found', 404);
  return doctor;
}

export async function deleteDoctor(id) {
  await Doctor.findByIdAndDelete(id).exec();
}

export async function getDoctorDetail(id) {
  const doctor = await Doctor.findById(id).populate('department').exec();
  if (!doctor) throw new AppError('Doctor not found', 404);
  const logs = await PresenceLog.find({ doctor: id }).sort({ createdAt: -1 }).limit(20).exec();
  const date = new Date().toISOString().slice(0, 10);
  const schedule = await Appointment.find({ doctor: id, date }).populate('patient').sort({ startTime: 1 }).exec();
  return { doctor, presenceLogs: logs, schedule };
}

// ===== Patient management =====

export async function listPatients(query = {}) {
  const filter = {};
  if (query.search) {
    const re = new RegExp(query.search, 'i');
    filter.$or = [{ name: re }, { email: re }, { phone: re }];
  }
  return Patient.find(filter).sort({ createdAt: -1 }).exec();
}

export async function createPatient(payload) {
  const exists = await Patient.findOne({ email: payload.email.toLowerCase() }).exec();
  if (exists) throw new AppError('A patient with this email already exists', 409);
  const passwordHash = await bcrypt.hash(payload.password || 'patient123', 12);
  return Patient.create({
    name: payload.name,
    email: payload.email.toLowerCase(),
    phone: payload.phone,
    passwordHash,
    gender: payload.gender || 'other',
    age: payload.age,
    bloodGroup: payload.bloodGroup || '',
    address: payload.address || '',
    emergencyContact: payload.emergencyContact || {},
  });
}

export async function updatePatient(id, payload) {
  const allowed = ['name', 'phone', 'age', 'gender', 'bloodGroup', 'address', 'emergencyContact', 'medicalHistory', 'isActive'];
  const clean = {};
  for (const k of allowed) if (payload[k] !== undefined) clean[k] = payload[k];
  const patient = await Patient.findByIdAndUpdate(id, { $set: clean }, { new: true }).exec();
  if (!patient) throw new AppError('Patient not found', 404);
  return patient;
}

export async function deletePatient(id) {
  await Patient.findByIdAndDelete(id).exec();
}

// ===== Appointment management =====

export async function listAppointments(query = {}) {
  const filter = {};
  if (query.date) filter.date = query.date;
  if (query.status && query.status !== 'all') filter.status = query.status;
  if (query.departmentId) filter.department = query.departmentId;
  return Appointment.find(filter)
    .populate('patient')
    .populate('doctor')
    .populate('department')
    .sort({ date: -1, startTime: 1 })
    .exec();
}

export async function updateAppointmentStatus(id, payload) {
  const a = await Appointment.findById(id).exec();
  if (!a) throw new AppError('Appointment not found', 404);

  if (payload.status) a.status = payload.status;
  if (payload.doctorId && payload.doctorId !== a.doctor.toString()) {
    a.doctor = payload.doctorId;
    a.status = 'confirmed';
  }
  if (payload.date) a.date = payload.date;
  if (payload.startTime) {
    a.startTime = payload.startTime;
    const [sh, sm] = payload.startTime.split(':').map(Number);
    const total = sh * 60 + sm + 30;
    a.endTime = `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }
  if (payload.isEmergency !== undefined) a.isEmergency = payload.isEmergency;
  if (a.status === 'rescheduled') a.status = 'rescheduled';

  await a.save();

  // Notify patient.
  if (payload.status === 'cancelled') {
    await notificationService.push({
      role: 'patient',
      recipient: a.patient,
      type: 'appointment_cancelled',
      title: 'Appointment cancelled by hospital',
      message: 'Your appointment was cancelled by the hospital administration.',
      data: { appointmentId: a._id.toString() },
    });
  } else if (payload.status === 'rescheduled' || payload.date || payload.startTime) {
    await notificationService.push({
      role: 'patient',
      recipient: a.patient,
      type: 'appointment_rescheduled',
      title: 'Appointment rescheduled',
      message: `New time: ${a.date} at ${a.startTime}`,
      data: { appointmentId: a._id.toString() },
    });
  }

  return Appointment.findById(a._id).populate('patient').populate('doctor').exec();
}

// ===== Analytics =====

export async function getAnalytics() {
  const today = new Date().toISOString().slice(0, 10);
  const days = 7;
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  const records = await HospitalAnalytics.find({ date: { $in: dates }, hour: -1 }).sort({ date: 1 }).exec();
  const byDate = Object.fromEntries(records.map((r) => [r.date, r]));

  const daily = dates.map((date) => {
    const r = byDate[date] || { appointments: 0, completed: 0, emergencies: 0, avgWaitMinutes: 0, efficiency: 0, hospitalLoad: 0, patientsWaiting: 0, doctorsOnline: 0 };
    return { date, ...r };
  });

  // Department distribution.
  const depts = await Department.find({}).exec();
  const deptCounts = await Promise.all(
    depts.map(async (d) => ({
      name: d.name,
      count: await Appointment.countDocuments({ department: d._id, date: today, status: { $nin: ['cancelled'] } }),
    }))
  );

  // Hourly load for today.
  const hourly = await HospitalAnalytics.find({ date: today, hour: { $gte: 0 } }).sort({ hour: 1 }).exec();

  return { daily, departmentDistribution: deptCounts, hourly };
}

export const adminService = {
  getDashboard,
  listDoctors,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  getDoctorDetail,
  listPatients,
  createPatient,
  updatePatient,
  deletePatient,
  listAppointments,
  updateAppointmentStatus,
  getAnalytics,
};

import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';
import VideoConsultation from '../models/VideoConsultation.js';
import { AppError } from '../utils/appError.js';

/** Get the patient's own profile with counts of their appointments. */
export async function getProfile(patientId) {
  const patient = await Patient.findById(patientId).exec();
  if (!patient) throw new AppError('Patient not found', 404);

  const [upcoming, completed, cancelled, total] = await Promise.all([
    Appointment.countDocuments({ patient: patientId, status: { $in: ['pending', 'confirmed', 'waiting', 'in_consultation'] } }),
    Appointment.countDocuments({ patient: patientId, status: 'completed' }),
    Appointment.countDocuments({ patient: patientId, status: 'cancelled' }),
    Appointment.countDocuments({ patient: patientId }),
  ]);

  return {
    profile: patient.toJSON(),
    stats: { upcoming, completed, cancelled, total },
  };
}

/** Update patient profile fields (non-sensitive). */
export async function updateProfile(patientId, updates) {
  const allowed = ['name', 'phone', 'age', 'bloodGroup', 'address', 'gender', 'emergencyContact', 'medicalHistory', 'healthProfile', 'avatar'];
  const clean = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) clean[key] = updates[key];
  }
  const patient = await Patient.findByIdAndUpdate(patientId, { $set: clean }, { new: true }).exec();
  if (!patient) throw new AppError('Patient not found', 404);
  return patient;
}

/**
 * Health pass data: the patient's structured health profile used by the
 * digital health card / QR feature.
 */
export async function getHealthPass(patientId) {
  const patient = await Patient.findById(patientId).exec();
  if (!patient) throw new AppError('Patient not found', 404);
  const healthProfile = patient.healthProfile || { allergies: [], conditions: [], vaccinations: [], emergencyContact: {} };
  const latestRx = await VideoConsultation.findOne({ patient: patientId, prescription: { $ne: null } })
    .sort({ createdAt: -1 })
    .exec();
  return {
    profile: {
      id: patient._id.toString(),
      name: patient.name,
      email: patient.email,
      phone: patient.phone,
      gender: patient.gender,
      age: patient.age,
      bloodGroup: patient.bloodGroup,
      address: patient.address,
      avatar: patient.avatar,
    },
    healthProfile,
    emergencyContact: patient.emergencyContact || {},
    latestPrescription: latestRx?.toJSON()?.prescription || null,
    verified: true,
  };
}

/**
 * All prescriptions issued to this patient across their video consultations /
 * completed appointments.
 */
export async function getPrescriptions(patientId) {
  const sessions = await VideoConsultation.find({
    patient: patientId,
    prescription: { $ne: null },
  })
    .populate('doctor', 'name staffId specialty')
    .populate('appointment', 'date startTime')
    .sort({ createdAt: -1 })
    .exec();
  return sessions.map((s) => ({
    id: s._id.toString(),
    issuedAt: s.prescription?.issuedAt || s.createdAt,
    doctor: s.doctor,
    patient: patientId,
    appointment: s.appointment,
    medicines: s.prescription?.medicines || [],
    notes: s.prescription?.notes || '',
    doctorNotes: s.doctorNotes || s.prescription?.notes || '',
  }));
}

export const patientService = { getProfile, updateProfile, getHealthPass, getPrescriptions };

import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import QueueEntry from '../models/QueueEntry.js';
import VideoConsultation from '../models/VideoConsultation.js';
import { queueService } from './queue.service.js';
import { notificationService } from './notification.service.js';
import { aiService } from './ai.service.js';
import { emitToRoom, emitAll } from '../config/realtime.js';
import { AppError } from '../utils/appError.js';

/**
 * DoctorService - schedule, consultation flow, patient details, prescription.
 */

/** Today's appointments for the doctor, ordered by start time. */
export async function getTodaySchedule(doctorId, date) {
  const appointments = await Appointment.find({ doctor: doctorId, date })
    .populate('patient')
    .populate('department')
    .sort({ startTime: 1 })
    .exec();
  const now = new Date();
  return appointments.map((a) => {
    const [h, m] = a.startTime.split(':').map(Number);
    const slot = new Date(date + 'T' + a.startTime + ':00');
    const isPast = slot < now;
    return { ...a.toJSON(), isPast };
  });
}

/** Get an appointment's full detail for the doctor. */
export async function getAppointmentDetail(doctorId, appointmentId) {
  const a = await Appointment.findOne({ _id: appointmentId, doctor: doctorId })
    .populate('patient')
    .populate('department')
    .populate('aiRecommendation')
    .exec();
  if (!a) throw new AppError('Appointment not found', 404);
  return a;
}

/** Start the consultation: mark appointment in_consultation and open queue. */
export async function startConsultation(doctorId, appointmentId) {
  const a = await Appointment.findOne({ _id: appointmentId, doctor: doctorId }).exec();
  if (!a) throw new AppError('Appointment not found', 404);

  a.status = 'in_consultation';
  a.consultationStartedAt = new Date();
  await a.save();

  await queueService.startCurrent(doctorId, a.date);
  return a;
}

/** Complete the consultation and advance the queue. */
export async function completeConsultation(doctorId, appointmentId, notes = '') {
  const a = await Appointment.findOne({ _id: appointmentId, doctor: doctorId }).exec();
  if (!a) throw new AppError('Appointment not found', 404);

  a.status = 'completed';
  a.consultationEndedAt = new Date();
  await a.save();

  await queueService.completeCurrent(doctorId, a.date);

  if (notes) {
    await VideoConsultation.findOneAndUpdate(
      { appointment: a._id },
      { $set: { doctorNotes: notes } },
      { new: true }
    ).exec();
  }

  // Notify patient the consultation is complete + prescription available.
  await notificationService.push({
    role: 'patient',
    recipient: a.patient,
    type: 'prescription_available',
    title: 'Consultation completed',
    message: 'Your prescription is ready to view.',
    data: { appointmentId: a._id.toString() },
  });
  return a;
}

/** Save a prescription for the appointment. */
export async function savePrescription(doctorId, appointmentId, prescription) {
  const a = await Appointment.findOne({ _id: appointmentId, doctor: doctorId }).exec();
  if (!a) throw new AppError('Appointment not found', 404);

  let session = await VideoConsultation.findOne({ appointment: a._id }).exec();
  if (!session) {
    session = await VideoConsultation.create({
      appointment: a._id,
      patient: a.patient,
      doctor: doctorId,
    });
  }
  session.prescription = {
    ...prescription,
    issuedAt: new Date().toISOString(),
    doctor: doctorId,
    patient: a.patient,
  };
  await session.save();

  await notificationService.push({
    role: 'patient',
    recipient: a.patient,
    type: 'prescription_available',
    title: 'Prescription issued',
    message: `Dr. ${a.doctor?.name || ''} issued a prescription.`,
    data: { appointmentId: a._id.toString() },
  });
  return session.prescription;
}

/** Get previous visits for a patient (for context during consultation). */
export async function getPatientHistory(patientId) {
  const history = await Appointment.find({ patient: patientId, status: 'completed' })
    .populate('doctor')
    .populate('department')
    .sort({ date: -1 })
    .limit(20)
    .exec();
  const patient = await Patient.findById(patientId).exec();
  return { patient, history };
}

/** Doctor's live dashboard summary. */
export async function getDashboard(doctorId) {
  const date = new Date().toISOString().slice(0, 10);
  const today = await getTodaySchedule(doctorId, date);
  const doctor = await Doctor.findById(doctorId).populate('department').exec();

  const currentPatient = today.find((a) => a.status === 'in_consultation') || null;
  const waiting = today.filter((a) => ['confirmed', 'waiting'].includes(a.status));
  const next = waiting[0] || null;
  const emergencies = today.filter((a) => a.isEmergency && !['completed', 'cancelled'].includes(a.status));

  return {
    doctor: doctor.toJSON(),
    todayCount: today.length,
    completedCount: today.filter((a) => a.status === 'completed').length,
    currentPatient,
    waitingCount: waiting.length,
    nextPatient: next,
    emergencyCount: emergencies.length,
    emergencies,
    isAvailable: doctor.isAvailable,
    isPresent: doctor.isPresent,
    presenceConfidence: doctor.presenceConfidence,
    currentQueue: doctor.currentQueue,
    avgConsultationMinutes: doctor.avgConsultationMinutes,
  };
}

/**
 * Create a standalone prescription for a selected patient. The authenticated
 * doctor is recorded as the prescriber (from the session, never from the body).
 * Stored in the same VideoConsultation.prescription structure the patient side
 * reads, so a single DB record is visible to both doctor and patient.
 */
export async function createPrescription(doctorId, { patientId, medicines, notes }) {
  const patient = await Patient.findById(patientId).exec();
  if (!patient) throw new AppError('Patient not found', 404);

  const doctor = await Doctor.findById(doctorId).exec();
  if (!doctor) throw new AppError('Doctor not found', 404);

  const session = await VideoConsultation.create({
    patient: patientId,
    doctor: doctorId,
    status: 'ended',
    doctorNotes: notes,
    prescription: {
      medicines: medicines.map((m) => ({
        name: m.name,
        dosage: m.dosage || '',
        frequency: m.frequency || '',
        duration: m.duration || '',
        instructions: m.instructions || '',
      })),
      notes: notes || '',
      issuedAt: new Date().toISOString(),
      doctor: doctorId,
      patient: patientId,
    },
  });

  await notificationService.push({
    role: 'patient',
    recipient: patientId,
    type: 'prescription_available',
    title: 'Prescription issued',
    message: `Dr. ${doctor.name} issued a prescription.`,
    data: { consultationId: session._id.toString() },
  });

  // Return in the same shape the patient/doctor views consume.
  return {
    id: session._id.toString(),
    issuedAt: session.prescription.issuedAt,
    doctor,
    patient,
    medicines: session.prescription.medicines,
    notes: session.prescription.notes || '',
    doctorNotes: notes || '',
  };
}

/**
 * All prescriptions the doctor has issued (across video consultations).
 * Mapped into the PrescriptionRecord shape so the client receives top-level
 * medicines/issuedAt/notes (fixes the "Invalid Date" + empty-medicines bug).
 */
export async function getDoctorPrescriptions(doctorId) {
  const sessions = await VideoConsultation.find({
    doctor: doctorId,
    prescription: { $ne: null },
  })
    .populate('patient', 'name age gender bloodGroup')
    .populate('appointment', 'date startTime reason')
    .sort({ createdAt: -1 })
    .exec();
  return sessions.map((s) => ({
    id: s._id.toString(),
    issuedAt: s.prescription?.issuedAt || s.createdAt,
    doctor: s.doctor,
    patient: s.patient,
    appointment: s.appointment,
    medicines: s.prescription?.medicines || [],
    notes: s.prescription?.notes || '',
    doctorNotes: s.doctorNotes || s.prescription?.notes || '',
  }));
}

export const doctorService = {
  getTodaySchedule,
  getAppointmentDetail,
  startConsultation,
  completeConsultation,
  savePrescription,
  createPrescription,
  getPatientHistory,
  getDashboard,
  getDoctorPrescriptions,
};

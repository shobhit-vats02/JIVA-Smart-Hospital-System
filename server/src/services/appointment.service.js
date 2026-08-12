import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import Department from '../models/Department.js';
import Patient from '../models/Patient.js';
import AIRecommendation from '../models/AIRecommendation.js';
import { aiService } from './ai.service.js';
import { queueService } from './queue.service.js';
import { notificationService } from './notification.service.js';
import { AppError } from '../utils/appError.js';

let tokenCounter = 100;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function nextToken() {
  return `T-${++tokenCounter}`;
}

/**
 * Core booking flow:
 * 1. validates doctor availability,
 * 2. computes an AI recommendation,
 * 3. creates the appointment (pending) — the patient chooses to accept or keep,
 * 4. notifies the patient.
 */
export async function bookAppointment({
  patientId,
  departmentId,
  doctorId,
  date,
  startTime,
  reason,
  symptoms,
  isEmergency,
  aiSuggestionAccepted = false,
}) {
  const doctor = await Doctor.findById(doctorId).populate('department').exec();
  if (!doctor) throw new AppError('Doctor not found', 404);
  if (!doctor.isActive) throw new AppError('This doctor is currently inactive', 403);

  const department = await Department.findById(departmentId).exec();
  if (!department) throw new AppError('Department not found', 404);

  // Load the patient so the backend can compute the AI priority score from
  // real patient data (age, existing conditions) — the frontend never supplies it.
  const patient = await Patient.findById(patientId).exec();
  if (!patient) throw new AppError('Patient not found', 404);

  // Detect overlapping bookings for the same doctor+time to avoid double booking.
  const clash = await Appointment.findOne({ doctor: doctor._id, date, startTime, status: { $nin: ['cancelled', 'completed'] } }).exec();
  if (clash) {
    throw new AppError('This slot has just been taken. Please pick another time.', 409);
  }

  const recommendation = await aiService.buildBookingRecommendation({
    patientId,
    doctor,
    department,
    date,
    requestedTime: startTime,
  });

  const slot = aiSuggestionAccepted && recommendation.suggested.slot
    ? recommendation.suggested.slot
    : startTime;

  // endTime = slot + SLOT_MINUTES (30)
  const [sh, sm] = slot.split(':').map(Number);
  const total = sh * 60 + sm + 30;
  const endTime = `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

  // Backend-authoritative AI priority score for this appointment.
  const basePriority = isEmergency ? 'emergency' : 'normal';
  const { points, category } = aiService.computePriorityPoints({
    isEmergency: !!isEmergency,
    priority: basePriority,
    age: patient.age,
    conditions: patient.healthProfile?.conditions || [],
    reason,
    symptoms,
  });

  const appointment = await Appointment.create({
    patient: patientId,
    doctor: doctor._id,
    department: department._id,
    date,
    startTime: slot,
    endTime,
    reason,
    symptoms,
    isEmergency: !!isEmergency,
    status: isEmergency ? 'emergency' : 'pending',
    priority: basePriority,
    priorityPoints: points,
    priorityCategory: category,
    aiSuggestionAccepted: aiSuggestionAccepted || null,
    aiRecommendation: recommendation.id || null,
    estimatedWaitMinutes: recommendation.suggested.waitMinutes,
  });

  // Add to the live queue when the doctor is available.
  const status = appointment.status === 'emergency' ? 'emergency' : 'pending';
  if (doctor.isAvailable) {
    await queueService.addToQueue({
      doctor,
      patient: patientId,
      appointment: appointment._id,
      token: nextToken(),
    });
    await notificationService.push({
      role: 'patient',
      recipient: patientId,
      type: 'appointment_confirmed',
      title: 'Appointment confirmed',
      message: `${doctor.name} · ${date} at ${slot}`,
      data: { appointmentId: appointment._id.toString(), slot },
    });
  } else {
    await notificationService.push({
      role: 'patient',
      recipient: patientId,
      type: 'appointment_confirmed',
      title: 'Appointment booked (pending)',
      message: `${doctor.name} · ${date} at ${slot}. You will be added to the queue when the doctor arrives.`,
      data: { appointmentId: appointment._id.toString(), slot },
    });
  }

  const populated = await Appointment.findById(appointment._id)
    .populate('doctor')
    .populate('department')
    .exec();
  return populated;
}

/** List a patient's appointments, optionally filtered by status. */
export async function listPatientAppointments(patientId, filter = {}) {
  const query = { patient: patientId };
  if (filter.status && filter.status !== 'all') query.status = filter.status;
  return Appointment.find(query)
    .populate('doctor')
    .populate('department')
    .sort({ date: -1, startTime: -1 })
    .exec();
}

/** Get one appointment for a patient (populated). */
export async function getAppointmentForPatient(patientId, appointmentId) {
  const a = await Appointment.findOne({ _id: appointmentId, patient: patientId })
    .populate('doctor')
    .populate('department')
    .exec();
  if (!a) throw new AppError('Appointment not found', 404);
  return a;
}

/** Cancel an appointment (only pending/confirmed/waiting can be cancelled). */
export async function cancelAppointment(patientId, appointmentId, reason = '') {
  const a = await Appointment.findOne({ _id: appointmentId, patient: patientId }).exec();
  if (!a) throw new AppError('Appointment not found', 404);
  if (!['pending', 'confirmed', 'waiting'].includes(a.status)) {
    throw new AppError(`Cannot cancel an appointment in "${a.status}" state`, 400);
  }
  a.status = 'cancelled';
  a.cancelReason = reason;
  await a.save();

  // Remove from active queue if present.
  const QueueEntry = mongoose.model('QueueEntry');
  await QueueEntry.updateMany({ appointment: a._id, status: { $in: ['waiting', 'current'] } }, { $set: { status: 'cancelled' } }).exec();

  await queueService.refreshQueue(a.doctor, a.date);

  await notificationService.push({
    role: 'patient',
    recipient: patientId,
    type: 'appointment_cancelled',
    title: 'Appointment cancelled',
    message: `${a.date} at ${a.startTime} has been cancelled.`,
    data: { appointmentId: a._id.toString() },
  });
  return a;
}

/**
 * Preview the AI recommendation for a booking WITHOUT creating the appointment,
 * so the patient can review the suggested slot/alternative doctor first.
 */
export async function previewRecommendation({ patientId, departmentId, doctorId, date, startTime }) {
  const doctor = await Doctor.findById(doctorId).populate('department').exec();
  if (!doctor) throw new AppError('Doctor not found', 404);
  const department = await Department.findById(departmentId).exec();
  if (!department) throw new AppError('Department not found', 404);
  return aiService.buildBookingRecommendation({
    patientId,
    doctor,
    department,
    date,
    requestedTime: startTime,
  });
}

export const appointmentService = {
  bookAppointment,
  previewRecommendation,
  listPatientAppointments,
  getAppointmentForPatient,
  cancelAppointment,
};

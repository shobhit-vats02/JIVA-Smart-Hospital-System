import VideoConsultation from '../models/VideoConsultation.js';
import Appointment from '../models/Appointment.js';
import { AppError } from '../utils/appError.js';
import { emitToRoom } from '../config/realtime.js';

/**
 * Video consultation service.
 * This is a functional prototype: sessions are persisted, chat is stored, and
 * messages/events are broadcast over Socket.IO (`/video` namespace + rooms).
 * WebRTC media signaling can replace the simulated transport later.
 */
export async function getOrCreateForAppointment(patientId, appointmentId) {
  const appointment = await Appointment.findOne({ _id: appointmentId, patient: patientId })
    .populate('doctor')
    .populate('patient')
    .exec();
  if (!appointment) throw new AppError('Appointment not found', 404);

  // Reuse an existing session or create one.
  let session = await VideoConsultation.findOne({ appointment: appointment._id }).exec();
  if (!session) {
    session = await VideoConsultation.create({
      appointment: appointment._id,
      patient: patientId,
      doctor: appointment.doctor._id,
      status: 'waiting',
    });
  }
  const populated = await VideoConsultation.findById(session._id).populate('doctor').populate('patient').exec();
  return populated;
}

export async function startSession(sessionId) {
  const session = await VideoConsultation.findById(sessionId).exec();
  if (!session) throw new AppError('Session not found', 404);
  session.status = 'active';
  session.startedAt = session.startedAt || new Date();
  await session.save();
  emitToRoom(`video:${sessionId}`, 'video:status', { status: 'active', startedAt: session.startedAt });
  return session;
}

export async function endSession(sessionId) {
  const session = await VideoConsultation.findById(sessionId).exec();
  if (!session) throw new AppError('Session not found', 404);
  if (session.status !== 'ended') {
    session.status = 'ended';
    session.endedAt = new Date();
    if (session.startedAt) {
      session.durationSeconds = Math.round((session.endedAt - session.startedAt) / 1000);
    }
    await session.save();
  }
  emitToRoom(`video:${sessionId}`, 'video:status', { status: 'ended', endedAt: session.endedAt });
  return session;
}

export async function sendMessage(sessionId, from, text) {
  const session = await VideoConsultation.findById(sessionId).exec();
  if (!session) throw new AppError('Session not found', 404);
  session.messages.push({ from, text, at: new Date() });
  await session.save();
  emitToRoom(`video:${sessionId}`, 'video:message', { from, text, at: new Date() });
  return session;
}

export async function saveDoctorNotes(sessionId, notes) {
  const session = await VideoConsultation.findByIdAndUpdate(sessionId, { $set: { doctorNotes: notes } }, { new: true }).exec();
  return session;
}

export async function savePrescription(sessionId, prescription) {
  const session = await VideoConsultation.findByIdAndUpdate(sessionId, { $set: { prescription } }, { new: true }).exec();
  return session;
}

export const videoService = {
  getOrCreateForAppointment,
  startSession,
  endSession,
  sendMessage,
  saveDoctorNotes,
  savePrescription,
};

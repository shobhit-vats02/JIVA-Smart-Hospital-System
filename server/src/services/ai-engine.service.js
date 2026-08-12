import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import Department from '../models/Department.js';
import QueueEntry from '../models/QueueEntry.js';
import EmergencyCase from '../models/EmergencyCase.js';
import HospitalAnalytics from '../models/HospitalAnalytics.js';
import WaitingPrediction from '../models/WaitingPrediction.js';
import AIRecommendation from '../models/AIRecommendation.js';
import { notificationService } from './notification.service.js';
import { queueService } from './queue.service.js';
import { emitAll, emitToRoom } from '../config/realtime.js';

/**
 * JIVA AI Engine — operates silently in the background.
 *
 * It continuously monitors doctor presence, appointments, queues, emergencies
 * and hospital load, and automatically:
 *   - predicts & broadcasts waiting times,
 *   - forecasts doctor delays,
 *   - optimizes queues (reorders by priority/emergency),
 *   - reallocates patients to less-loaded doctors,
 *   - prioritizes emergency cases,
 *   - generates realtime notifications,
 *   - writes hospital analytics.
 *
 * It exposes:
 *   - `runCycle()`  : a full sweep across all doctors (called on an interval),
 *   - `reactToEvent` hooks: doctor arrival, emergency creation, booking.
 */

const TIME_SLOTS = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30'];

/** 0-100 congestion based on active appointments for a date. */
export async function estimateHospitalLoad(date = today()) {
  const active = await Appointment.countDocuments({
    date,
    status: { $in: ['pending', 'confirmed', 'waiting', 'in_consultation'] },
  });
  const emergencies = await EmergencyCase.countDocuments({ status: { $nin: ['treated', 'closed'] } });
  const load = Math.min(100, Math.round((active / 120) * 100 + emergencies * 8));
  return Math.min(100, load);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Live wait prediction for a doctor's current queue. */
export async function predictDoctorWait(doctor, date = today()) {
  if (!doctor.isAvailable) {
    return { waitMinutes: 45, patientsAhead: 0, confidence: 0.4, status: 'unavailable' };
  }
  const waiting = await Appointment.countDocuments({
    doctor: doctor._id,
    date,
    status: { $in: ['confirmed', 'waiting'] },
  });
  const base = doctor.avgConsultationMinutes || 12;
  const load = await estimateHospitalLoad(date);
  const waitMinutes = Math.round(waiting * base * (1 + load / 200));
  const confidence = doctor.isPresent ? 0.88 : 0.6;
  return { waitMinutes, patientsAhead: waiting, confidence, status: 'available' };
}

/**
 * Doctor delay prediction.
 * If a doctor has appointments but is not present/available, or their queue is
 * unexpectedly long vs. schedule, flag an expected delay.
 */
export async function predictDoctorDelay(doctor, date = today()) {
  const delay = { doctor: doctor._id, predictedMinutes: 0, reason: '', confident: false };
  const todayAppts = await Appointment.countDocuments({
    doctor: doctor._id,
    date,
    status: { $in: ['pending', 'confirmed', 'waiting'] },
  });

  if (todayAppts > 0 && !doctor.isAvailable) {
    delay.predictedMinutes = 30;
    delay.reason = 'Doctor has appointments but is not yet available';
    delay.confident = doctor.isPresent === false;
  } else if (doctor.isAvailable) {
    // Estimate if queue is over capacity for remaining schedule.
    const wait = await predictDoctorWait(doctor, date);
    const expectedBacklog = Math.max(0, wait.patientsAhead - Math.ceil(180 / (doctor.avgConsultationMinutes || 12)));
    if (expectedBacklog > 0) {
      delay.predictedMinutes = Math.round(expectedBacklog * (doctor.avgConsultationMinutes || 12) * 0.5);
      delay.reason = `${expectedBacklog} patients beyond expected capacity`;
      delay.confident = wait.confidence > 0.8;
    }
  }
  return delay;
}

/**
 * Reallocate a patient from an overloaded doctor to the least-loaded alternative
 * in the same department (only for pending/confirmed appointments that haven't
 * started).
 */
export async function suggestReallocation(doctor, date = today()) {
  if (!doctor.department) return null;
  const wait = await predictDoctorWait(doctor, date);
  if (wait.patientsAhead < 4) return null; // not overloaded enough

  const candidates = await Doctor.find({
    department: doctor.department,
    _id: { $ne: doctor._id },
    isAvailable: true,
  }).select('name avgConsultationMinutes department');
  let best = null;
  let bestLoad = Infinity;
  for (const d of candidates) {
    const w = await predictDoctorWait(d, date);
    if (w.patientsAhead < bestLoad) {
      bestLoad = w.patientsAhead;
      best = d;
    }
  }
  if (!best || bestLoad >= wait.patientsAhead - 1) return null;

  // Find the patient(s) to reallocate (still waiting to be seen).
  const movable = await Appointment.find({
    doctor: doctor._id,
    date,
    status: { $in: ['pending', 'confirmed', 'waiting'] },
    isEmergency: { $ne: true },
  }).sort({ createdAt: 1 }).limit(1).populate('patient');

  if (!movable.length) return null;
  const target = movable[0];
  return {
    patientId: target.patient?._id?.toString() || null,
    patientName: target.patient?.name || 'Patient',
    appointmentId: target._id.toString(),
    fromDoctor: doctor.name,
    toDoctor: best.name,
    toDoctorId: best._id.toString(),
    reason: `Queue at ${doctor.name} is ${wait.patientsAhead} deep; ${best.name} can see you sooner.`,
  };
}

/**
 * Emergency prioritization: bump emergency patients to the top of their doctor's
 * queue (highest priority).
 */
export async function prioritizeEmergencies() {
  const emergencies = await EmergencyCase.find({ status: { $nin: ['treated', 'closed'] } }).exec();
  const result = { prioritized: 0 };

  // Ensure emergency appointments exist / are top of queue.
  const emergencyAppts = await Appointment.find({
    isEmergency: true,
    status: { $in: ['pending', 'confirmed', 'waiting'] },
  });
  for (const a of emergencyAppts) {
    // Move the emergency appointment to the front of its doctor's queue.
    const entry = await QueueEntry.findOne({ appointment: a._id, status: 'waiting' }).exec();
    if (entry) {
      entry.position = 0;
      entry.status = 'current';
      await entry.save();
      await queueService.refreshQueue(a.doctor, a.date);
      result.prioritized++;
    }
  }
  return { ...result, emergenciesActive: emergencies.length };
}

/**
 * Full analytics snapshot for a date (written to HospitalAnalytics).
 */
export async function computeAnalyticsSnapshot(date = today()) {
  const doctors = await Doctor.find({}).exec();
  const activeAppts = await Appointment.find({
    date,
    status: { $in: ['pending', 'confirmed', 'waiting', 'in_consultation'] },
  }).exec();

  const completed = await Appointment.countDocuments({ date, status: 'completed' });
  const cancelled = await Appointment.countDocuments({ date, status: 'cancelled' });
  const emergencies = await Appointment.countDocuments({ date, status: 'emergency' });

  const doctorsOnline = doctors.filter((d) => d.isPresent).length;
  const doctorsBusy = doctors.filter((d) => d.isAvailable && d.currentPatient).length;
  const doctorsOffline = doctors.length - doctorsOnline;

  const patientsWaiting = activeAppts.filter((a) => ['waiting'].includes(a.status)).length;
  const avgWait = activeAppts.length
    ? Math.round(activeAppts.reduce((s, a) => s + (a.estimatedWaitMinutes || 0), 0) / activeAppts.length)
    : 0;

  const appointments = activeAppts.length + completed;
  const efficiency = appointments ? Math.round((completed / appointments) * 100) : 0;
  const load = await estimateHospitalLoad(date);

  return {
    date,
    hour: -1,
    appointments,
    completed,
    cancelled,
    emergencies,
    patientsWaiting,
    doctorsOnline,
    doctorsBusy,
    doctorsOffline,
    avgWaitMinutes: avgWait,
    avgConsultationMinutes: doctors.length
      ? Math.round(doctors.reduce((s, d) => s + (d.avgConsultationMinutes || 12), 0) / doctors.length)
      : 0,
    efficiency,
    hospitalLoad: load,
  };
}

export async function writeAnalyticsSnapshot(date = today()) {
  const snap = await computeAnalyticsSnapshot(date);
  const saved = await HospitalAnalytics.findOneAndUpdate(
    { date: snap.date, hour: -1 },
    { $set: snap },
    { new: true, upsert: true }
  ).exec();
  emitAll('analytics:update', saved.toJSON());
  return saved;
}

/**
 * Broadcast live waiting predictions for all available doctors.
 */
export async function broadcastWaitingPredictions(date = today()) {
  const doctors = await Doctor.find({ isAvailable: true }).populate('department').exec();
  const payload = {};
  for (const d of doctors) {
    const wait = await predictDoctorWait(d, date);
    payload[d._id.toString()] = wait;
    await WaitingPrediction.create({
      doctor: d._id,
      department: d.department?._id,
      predictedWaitMinutes: wait.waitMinutes,
      patientsAhead: wait.patientsAhead,
      hospitalLoad: await estimateHospitalLoad(date),
      confidence: wait.confidence,
      basedOn: 'realtime',
    });
  }
  emitAll('wait:update', payload);
  return payload;
}

/**
 * Detect doctor delays and notify the affected patients.
 */
export async function detectAndNotifyDelays(date = today()) {
  const doctors = await Doctor.find({}).exec();
  const notifications = [];
  for (const d of doctors) {
    const delay = await predictDoctorDelay(d, date);
    if (delay.predictedMinutes > 15) {
      const affected = await Appointment.find({
        doctor: d._id,
        date,
        status: { $in: ['pending', 'confirmed', 'waiting'] },
      }).exec();
      for (const a of affected) {
        const n = await notificationService.push({
          role: 'patient',
          recipient: a.patient,
          type: 'doctor_delayed',
          title: `Dr. ${d.name} is delayed`,
          message: `Your appointment may start ~${delay.predictedMinutes} min late. ${delay.reason}.`,
          data: { appointmentId: a._id.toString(), predictedMinutes: delay.predictedMinutes },
        });
        notifications.push(n);
      }
    }
  }
  emitAll('delay:update', { checkedAt: new Date().toISOString(), delayed: notifications.length });
  return notifications;
}

/**
 * Recommend better slots to patients with upcoming appointments when their
 * doctor is overloaded.
 */
export async function recommendBetterSlots(date = today()) {
  const doctors = await Doctor.find({ isAvailable: true }).exec();
  const recommendations = [];
  for (const d of doctors) {
    const wait = await predictDoctorWait(d, date);
    if (wait.patientsAhead < 3) continue;

    const patients = await Appointment.find({
      doctor: d._id,
      date,
      status: 'confirmed',
    }).populate('patient').exec();

    for (const a of patients.slice(0, 2)) {
      const rec = await AIRecommendation.create({
        patient: a.patient?._id || a.patient,
        appointment: a._id,
        type: 'expected_wait',
        title: 'Your doctor is busy',
        message: `Expected wait at your slot is ~${wait.waitMinutes} min. Consider a different slot.`,
        suggested: { waitMinutes: wait.waitMinutes },
        reason: `Queue ahead: ${wait.patientsAhead}`,
      });
      recommendations.push(rec);
    }
  }
  return recommendations;
}

/**
 * One full AI engine cycle. Runs on an interval to keep the hospital live.
 */
export async function runCycle() {
  const date = today();
  const results = {
    cycle: new Date().toISOString(),
    date,
    analytics: null,
    waits: null,
    delays: null,
    reallocationSuggestions: 0,
    emergencyPrioritization: null,
  };

  results.analytics = await writeAnalyticsSnapshot(date);
  results.waits = await broadcastWaitingPredictions(date);
  results.delays = await detectAndNotifyDelays(date);
  results.emergencyPrioritization = await prioritizeEmergencies();

  const doctors = await Doctor.find({ isAvailable: true }).exec();
  for (const d of doctors) {
    const realloc = await suggestReallocation(d, date);
    if (realloc) {
      results.reallocationSuggestions++;
      await AIRecommendation.create({
        patient: realloc.patientId,
        appointment: realloc.appointmentId,
        type: 'reallocation',
        title: 'Move to a faster doctor?',
        message: `${realloc.reason}`,
        suggested: { toDoctorId: realloc.toDoctorId, toDoctor: realloc.toDoctor },
        reason: realloc.reason,
      });
      emitAll('ai:suggestion', { type: 'reallocation', ...realloc });
    }
  }

  emitAll('ai:cycle', { cycle: results.cycle, date });
  return results;
}

/** Reacts to a doctor becoming available (presence activation). */
export async function onDoctorAvailable(doctor) {
  const date = today();
  await queueService.refreshQueue(doctor._id, date);
  await broadcastWaitingPredictions(date);
  // Notify waiting patients their doctor is now available.
  const waiting = await Appointment.find({ doctor: doctor._id, date, status: 'waiting' }).exec();
  for (const a of waiting) {
    await notificationService.push({
      role: 'patient',
      recipient: a.patient,
      type: 'doctor_arrived',
      title: `Dr. ${doctor.name} is available`,
      message: 'Your queue position is live. Please be ready.',
      data: { appointmentId: a._id.toString() },
    });
  }
  emitAll('presence:global', { doctorId: doctor._id, isAvailable: true });
}

/** Reacts to a new emergency: prioritize queues + alert load. */
export async function onEmergency() {
  const date = today();
  await prioritizeEmergencies();
  await writeAnalyticsSnapshot(date);
  emitAll('emergency:update', { prioritized: true, at: new Date().toISOString() });
}

export const aiEngine = {
  runCycle,
  onDoctorAvailable,
  onEmergency,
  predictDoctorWait,
  predictDoctorDelay,
  suggestReallocation,
  prioritizeEmergencies,
  estimateHospitalLoad,
  broadcastWaitingPredictions,
  writeAnalyticsSnapshot,
  detectAndNotifyDelays,
};

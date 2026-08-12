import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import WaitingPrediction from '../models/WaitingPrediction.js';
import AIRecommendation from '../models/AIRecommendation.js';

/**
 * Heuristic AI engine for the patient booking flow.
 *
 * In this milestone it makes practical, deterministic decisions that a real
 * scheduling system would use:
 *   - compute the live wait for a doctor from their active queue,
 *   - predict the best slot and an alternative doctor for a booking,
 *   - estimate the "hospital load" for a given date/time.
 * Later milestones add delay forecasting and patient reallocation on top.
 */

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30',
];
const SLOT_MINUTES = 30;

function minutesOf(time) {
  const [h, m] = String(time).split(':').map(Number);
  return h * 60 + m;
}

function formatMinutes(min) {
  const m = Math.round(min);
  return `${Math.floor(m / 60)}h ${m % 60}m`.replace('0h ', '');
}

/** Number of appointments already active (non-terminal) for a doctor on a date. */
async function activeLoadForDoctor(doctorId, date) {
  return Appointment.countDocuments({
    doctor: doctorId,
    date,
    status: { $in: ['pending', 'confirmed', 'waiting', 'in_consultation'] },
  });
}

/** Simple 0-100 congestion estimate based on appointments already booked that day. */
async function estimateHospitalLoad(date) {
  const total = await Appointment.countDocuments({ date });
  // ~200+ bookings in a day indicates high load.
  return Math.min(100, Math.round((total / 200) * 100));
}

/**
 * Predicts the current wait for a doctor in minutes.
 * Uses the number of patients waiting + the doctor's avg consultation time.
 */
async function predictWaitForDoctor(doctor, date) {
  if (!doctor.isAvailable) {
    // Not available -> longer generic estimate.
    return { wait: 45, patientsAhead: 0, confidence: 0.4, reason: 'Doctor is not currently available' };
  }
  const waiting = await Appointment.countDocuments({
    doctor: doctor._id,
    date,
    status: { $in: ['pending', 'confirmed', 'waiting'] },
  });
  const load = await estimateHospitalLoad(date);
  const base = doctor.avgConsultationMinutes || 12;
  const wait = waiting * base * (1 + load / 200);
  const confidence = doctor.isPresent ? 0.85 : 0.6;
  return {
    wait: Math.round(wait),
    patientsAhead: waiting,
    confidence,
    reason: `${waiting} patient(s) ahead · avg ${base}m consult · hospital load ${load}%`,
  };
}

/**
 * Produces the booking-time AI recommendation for a chosen doctor & date.
 * Suggests the best free slot and, when the doctor is overloaded, an
 * alternative doctor from the same department.
 */
export async function buildBookingRecommendation({ patientId, doctor, department, date, requestedTime }) {
  const load = await estimateHospitalLoad(date);
  const currentWait = await predictWaitForDoctor(doctor, date);

  // Find a better slot among the day's available slots for this doctor.
  const existingTimes = await Appointment.find({
    doctor: doctor._id,
    date,
    status: { $in: ['pending', 'confirmed', 'waiting', 'in_consultation'] },
  }).select('startTime');

  const taken = new Set(existingTimes.map((a) => a.startTime));
  const freeSlots = TIME_SLOTS.filter((t) => !taken.has(t));
  const requestedIdx = TIME_SLOTS.indexOf(requestedTime);
  const bestSlot = freeSlots[0] || requestedTime;
  const suggestedSlot =
    requestedIdx >= 0 && freeSlots.some((t) => t === requestedTime)
      ? requestedTime
      : bestSlot;

  // Consider an alternative doctor if the chosen one is unavailable or heavily loaded.
  let alternativeDoctor = null;
  if (!doctor.isAvailable || currentWait.patientsAhead >= 3) {
    const candidates = await Doctor.find({
      department: doctor.department,
      _id: { $ne: doctor._id },
      isAvailable: true,
    }).populate('department');
    // Pick the least loaded candidate.
    let best = null;
    let bestLoad = Infinity;
    for (const d of candidates) {
      const n = await activeLoadForDoctor(d._id, date);
      if (n < bestLoad) {
        bestLoad = n;
        best = d;
      }
    }
    if (best) alternativeDoctor = best;
  }

  const recommendation = {
    type: 'best_slot',
    title: 'AI slot suggestion',
    message: `Best available slot for ${doctor.name} is ${suggestedSlot}. Estimated wait ~${formatMinutes(currentWait.wait)}.`,
    suggested: {
      slot: suggestedSlot,
      waitMinutes: currentWait.wait,
      doctorId: doctor._id.toString(),
      alternativeDoctor: alternativeDoctor
        ? {
            id: alternativeDoctor._id.toString(),
            name: alternativeDoctor.name,
            staffId: alternativeDoctor.staffId,
            specialty: alternativeDoctor.specialty,
            avgConsultationMinutes: alternativeDoctor.avgConsultationMinutes,
          }
        : null,
    },
    reason: currentWait.reason,
  };

  const doc = await AIRecommendation.create({
    patient: patientId,
    type: 'best_slot',
    title: recommendation.title,
    message: recommendation.message,
    suggested: recommendation.suggested,
    reason: recommendation.reason,
  });

  recommendation.id = doc._id.toString();
  recommendation.load = load;
  return recommendation;
}

/**
 * Deterministic AI priority scoring for an appointment (0-100).
 *
 * The score is computed by the backend at booking time and persisted so it
 * never changes on refresh/logout/restart. It is based on information already
 * available in the application:
 *   - emergency flag (highest weight)
 *   - priority category (emergency / senior / disabled / normal)
 *   - patient age (senior citizens)
 *   - patient chronic conditions (from healthProfile, if present)
 *   - reason / symptoms text (severity keywords)
 *
 * The frontend never supplies the score; the backend is authoritative.
 */
export function computePriorityPoints({ isEmergency, priority, age, conditions = [], reason = '', symptoms = '' }) {
  let points = 0;
  const notes = `${reason || ''} ${symptoms || ''}`.toLowerCase();

  // Emergency is the dominant signal.
  if (isEmergency) points += 40;
  if (priority === 'emergency') points += 40;

  // Age — senior citizens get priority.
  if (typeof age === 'number') {
    if (age >= 75) points += 20;
    else if (age >= 60) points += 12;
    else if (age <= 5) points += 8;
  }

  // Existing chronic conditions.
  if (Array.isArray(conditions)) {
    if (conditions.some((c) => /hypertension|diabetes|cardiac|heart|asthma|epilepsy/i.test(c))) points += 10;
  }

  // Severity keywords in reason/symptoms.
  const severe = ['severe', 'chest pain', 'difficulty breathing', 'unconscious', 'bleeding', 'stroke', 'emergency', 'high fever'];
  const moderate = ['pain', 'fever', 'infection', 'migraine', 'nausea', 'dizzy', 'fracture'];
  const severeHits = severe.filter((k) => notes.includes(k)).length;
  const moderateHits = moderate.filter((k) => notes.includes(k)).length;
  points += Math.min(20, severeHits * 8);
  points += Math.min(10, moderateHits * 3);

  // Priority category fallback boost.
  if (priority === 'senior') points += 10;
  if (priority === 'disabled') points += 12;

  // Clamp to 0-100 and map to a human-readable category.
  const final = Math.max(0, Math.min(100, Math.round(points)));
  let category = 'Normal';
  if (final >= 80) category = 'High Priority';
  else if (final >= 50) category = 'Elevated';
  else if (final >= 30) category = 'Moderate';
  return { points: final, category };
}

/**
 * Records a WaitingPrediction row for a doctor (used by queue + home).
 */
export async function recordWaitingPrediction({ doctor, department, date, basedOn = 'queue' }) {
  const { wait, patientsAhead, confidence } = await predictWaitForDoctor(doctor, date);
  const load = await estimateHospitalLoad(date);
  await WaitingPrediction.create({
    doctor: doctor._id,
    department: department?._id,
    predictedWaitMinutes: wait,
    patientsAhead,
    hospitalLoad: load,
    confidence,
    basedOn,
  });
  return { wait, patientsAhead, load, confidence };
}

export const aiService = {
  buildBookingRecommendation,
  recordWaitingPrediction,
  predictWaitForDoctor,
  estimateHospitalLoad,
  computePriorityPoints,
};

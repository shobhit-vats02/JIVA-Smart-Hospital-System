import Doctor from '../models/Doctor.js';
import PresenceLog from '../models/PresenceLog.js';
import { emitToRoom, emitAll } from '../config/realtime.js';
import { notificationService } from './notification.service.js';
import { queueService } from './queue.service.js';
import { AppError } from '../utils/appError.js';

// Hospital network + geofence configuration (representative of a real campus).
const HOSPITAL = {
  wifiSSID: 'JIVA-HOSPITAL',
  bluetoothDevice: 'JIVA-BLE-01',
  geofence: { lat: 23.0225, lng: 72.5714, radiusMeters: 500 },
};

/** Reusable verification-append helper. */
function setMethod(log, method, patch) {
  const current = log[method] || {};
  log[method] = { ...current, ...patch, attempted: true, at: new Date() };
}

/**
 * AI Presence Confidence Engine.
 * Weights each completed verification method and computes a weighted overall
 * confidence. Doctor is activated when confidence > 90%.
 *
 * Weights: face 0.30, rfid 0.25, bluetooth 0.15, wifi 0.15, gps 0.15.
 */
export function computeConfidence(methods) {
  const weights = { face: 0.3, rfid: 0.25, bluetooth: 0.15, wifi: 0.15, gps: 0.15 };
  let weightedSum = 0;
  let completed = 0;
  for (const [key, w] of Object.entries(weights)) {
    const m = methods[key];
    if (m?.attempted && m?.verified) {
      const methodConfidence = (m.score ?? 1) * 100; // face/bluetooth can carry a sub-score
      weightedSum += w * methodConfidence;
      completed++;
    }
  }
  // If no method verified, confidence is 0.
  if (completed === 0) return { confidence: 0, completed };
  return { confidence: weightedSum, completed };
}

/**
 * Face recognition verification (prototype).
 * The client captures a frame and submits a match score; the server evaluates
 * it against a threshold and records the log.
 */
export async function verifyFace({ doctorId, score = 0.98 }) {
  const doctor = await Doctor.findById(doctorId).exec();
  if (!doctor) throw new AppError('Doctor not found', 404);

  let log = await currentPendingLog(doctorId);
  const verified = score >= 0.8;
  setMethod(log, 'face', { verified, score, note: verified ? 'Face matched identity' : 'Face confidence below threshold' });
  log = await log.save();
  emitToRoom(`doctor:${doctorId}`, 'presence:method', { method: 'face', verified, score });
  return { method: 'face', verified, score, log };
}

/**
 * RFID verification. Matches the scanned card to the doctor's registered tag.
 */
export async function verifyRfid({ doctorId, cardId }) {
  const doctor = await Doctor.findById(doctorId).exec();
  if (!doctor) throw new AppError('Doctor not found', 404);

  let log = await currentPendingLog(doctorId);
  const verified = Boolean(cardId) && String(cardId).toUpperCase() === String(doctor.rfidTag || '').toUpperCase();
  setMethod(log, 'rfid', { verified, cardId: cardId || '', note: verified ? 'RFID card matches doctor record' : 'RFID card not recognized' });
  log = await log.save();
  emitToRoom(`doctor:${doctorId}`, 'presence:method', { method: 'rfid', verified });
  return { method: 'rfid', verified, log };
}

/**
 * Bluetooth verification. Searches for the registered hospital device.
 */
export async function verifyBluetooth({ doctorId, device }) {
  let log = await currentPendingLog(doctorId);
  const verified = Boolean(device) && String(device).toUpperCase() === HOSPITAL.bluetoothDevice.toUpperCase();
  setMethod(log, 'bluetooth', { verified, device: device || '', rssi: -45, score: verified ? 0.95 : 0.3, note: verified ? 'Registered hospital device found' : 'Hospital device not found' });
  log = await log.save();
  emitToRoom(`doctor:${doctorId}`, 'presence:method', { method: 'bluetooth', verified });
  return { method: 'bluetooth', verified, log };
}

/**
 * WiFi verification. Confirms the doctor is on the hospital network.
 */
export async function verifyWifi({ doctorId, ssid }) {
  let log = await currentPendingLog(doctorId);
  const verified = Boolean(ssid) && String(ssid).toUpperCase() === HOSPITAL.wifiSSID.toUpperCase();
  setMethod(log, 'wifi', { verified, network: ssid || '', note: verified ? 'Connected to hospital network' : 'Not on hospital network' });
  log = await log.save();
  emitToRoom(`doctor:${doctorId}`, 'presence:method', { method: 'wifi', verified });
  return { method: 'wifi', verified, log };
}

/**
 * GPS geofence verification. Confirms the doctor is inside the hospital area.
 */
export async function verifyGps({ doctorId, lat, lng }) {
  let log = await currentPendingLog(doctorId);
  const inside = isInsideGeofence(lat, lng);
  setMethod(log, 'gps', { verified: inside, insideGeofence: inside, note: inside ? 'Doctor inside hospital geofence' : 'Doctor outside hospital geofence' });
  log = await log.save();
  emitToRoom(`doctor:${doctorId}`, 'presence:method', { method: 'gps', verified: inside });
  return { method: 'gps', verified: inside, log };
}

/**
 * Runs the AI presence confidence engine using the methods verified so far.
 * If confidence > 90% the doctor is activated (isAvailable = true), the queue
 * starts, and patient/doctor notifications are pushed.
 */
export async function runConfidenceEngine({ doctorId }) {
  const doctor = await Doctor.findById(doctorId).exec();
  if (!doctor) throw new AppError('Doctor not found', 404);

  let log = await currentPendingLog(doctorId);
  const { confidence, completed } = computeConfidence({
    face: log.face,
    rfid: log.rfid,
    bluetooth: log.bluetooth,
    wifi: log.wifi,
    gps: log.gps,
  });

  const activated = confidence > 90;
  log.aiConfidence = Math.round(confidence * 100) / 100;
  log.activated = activated;
  log.decision = activated ? 'approved' : 'pending';
  log.summary = activated
    ? `Presence confirmed with ${Math.round(confidence)}% confidence (${completed} methods).`
    : `Insufficient verification (${Math.round(confidence)}%). Complete more methods to activate.`;
  await log.save();

  // Persist confidence on the doctor.
  doctor.presenceConfidence = Math.round(confidence * 100) / 100;

  if (activated) {
    doctor.isPresent = true;
    doctor.isAvailable = true;
    doctor.lastPresentAt = new Date();
    await doctor.save();

    // Start the queue for today and add any pending appointments.
    const date = new Date().toISOString().slice(0, 10);
    await queueService.refreshQueue(doctorId, date);

    // Notify the doctor + all this doctor's patients with pending appointments.
    await notificationService.push({
      role: 'doctor',
      recipient: doctorId,
      type: 'doctor_arrived',
      title: 'Presence confirmed — you are now available',
      message: `Activated with ${Math.round(confidence)}% confidence. Queue is live.`,
      data: { confidence: Math.round(confidence) },
    });
    emitToRoom(`doctor:${doctorId}`, 'presence:activated', { confidence: Math.round(confidence), isAvailable: true });
    emitAll('presence:global', { doctorId, isAvailable: true, confidence: Math.round(confidence) });

    // Kick the AI engine: broadcast waits + notify this doctor's waiting patients.
    const { aiEngine } = await import('./ai-engine.service.js');
    await aiEngine.onDoctorAvailable(doctor).catch((e) => console.error('[AI] onDoctorAvailable', e.message));
  } else {
    await doctor.save();
    emitToRoom(`doctor:${doctorId}`, 'presence:status', { confidence: Math.round(confidence), activated: false });
  }

  return { confidence: log.aiConfidence, completed, activated, log };
}

/** Manual override (e.g. admin or doctor confirms on-site presence). */
export async function manualActivate({ doctorId }) {
  const doctor = await Doctor.findById(doctorId).exec();
  if (!doctor) throw new AppError('Doctor not found', 404);
  doctor.isPresent = true;
  doctor.isAvailable = true;
  doctor.lastPresentAt = new Date();
  doctor.presenceConfidence = 100;
  await doctor.save();

  let log = await currentPendingLog(doctorId);
  log.override = true;
  log.activated = true;
  log.decision = 'approved';
  log.aiConfidence = 100;
  log.summary = 'Manual override: presence verified by administrator/system.';
  await log.save();

  const date = new Date().toISOString().slice(0, 10);
  await queueService.refreshQueue(doctorId, date);
  emitAll('presence:global', { doctorId, isAvailable: true, confidence: 100 });
  return doctor;
}

/** Get the doctor's presence logs (recent). */
export async function getPresenceLogs(doctorId, limit = 20) {
  return PresenceLog.find({ doctor: doctorId }).sort({ createdAt: -1 }).limit(limit).exec();
}

/** Get the doctor's current presence state. */
export async function getPresenceState(doctorId) {
  const doctor = await Doctor.findById(doctorId).exec();
  if (!doctor) throw new AppError('Doctor not found', 404);
  const log = await PresenceLog.findOne({ doctor: doctorId }).sort({ createdAt: -1 }).exec();
  return {
    isPresent: doctor.isPresent,
    isAvailable: doctor.isAvailable,
    presenceConfidence: doctor.presenceConfidence,
    currentQueue: doctor.currentQueue,
    lastPresentAt: doctor.lastPresentAt,
    lastLog: log?.toJSON() || null,
    hospital: { wifiSSID: HOSPITAL.wifiSSID, bluetoothDevice: HOSPITAL.bluetoothDevice },
  };
}

/** Fetch (or create) the latest pending presence log for a doctor. */
async function currentPendingLog(doctorId) {
  const existing = await PresenceLog.findOne({ doctor: doctorId, decision: 'pending' }).sort({ createdAt: -1 }).exec();
  if (existing) return existing;
  return PresenceLog.create({ doctor: doctorId, decision: 'pending' });
}

function isInsideGeofence(lat, lng) {
  if (lat == null || lng == null) return false;
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(HOSPITAL.geofence.lat - lat);
  const dLng = toRad(HOSPITAL.geofence.lng - lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat)) * Math.cos(toRad(HOSPITAL.geofence.lat)) * Math.sin(dLng / 2) ** 2;
  const dist = 2 * R * Math.asin(Math.sqrt(a));
  return dist <= HOSPITAL.geofence.radiusMeters;
}

export const presenceService = {
  verifyFace,
  verifyRfid,
  verifyBluetooth,
  verifyWifi,
  verifyGps,
  runConfidenceEngine,
  manualActivate,
  getPresenceLogs,
  getPresenceState,
};

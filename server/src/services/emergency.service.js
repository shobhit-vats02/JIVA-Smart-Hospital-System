import EmergencyCase from '../models/EmergencyCase.js';
import Patient from '../models/Patient.js';
import Department from '../models/Department.js';
import Doctor from '../models/Doctor.js';
import { emitAll } from '../config/realtime.js';
import { notificationService } from './notification.service.js';
import { AppError } from '../utils/appError.js';

const AMBULANCES = [
  { id: 'AMB-01', driver: 'Rajesh Patil', etaMinutes: 4 },
  { id: 'AMB-02', driver: 'Suresh Kumar', etaMinutes: 7 },
  { id: 'AMB-03', driver: 'Manoj Verma', etaMinutes: 10 },
];

/** Add a timeline event to a case and emit the update. */
async function pushTimeline(caseDoc, type, text) {
  caseDoc.timeline.push({ type, text, at: new Date() });
  await caseDoc.save();
  emitAll('emergency:update', caseDoc.toJSON());
  return caseDoc;
}

/** Create a new emergency case (optionally linked to a patient). */
export async function createEmergency(payload) {
  let patient = null;
  if (payload.patientId) {
    patient = await Patient.findById(payload.patientId).exec();
  }

  const severity = payload.severity || 'high';
  const priorityMap = { critical: 1, high: 2, medium: 3, low: 4 };

  const caseDoc = await EmergencyCase.create({
    patient: patient?._id || null,
    patientName: payload.patientName || patient?.name || '',
    phone: payload.phone || patient?.phone || '',
    emergencyContactName: payload.emergencyContactName || patient?.emergencyContact?.name || '',
    emergencyContactPhone: payload.emergencyContactPhone || patient?.emergencyContact?.phone || '',
    description: payload.description || '',
    department: payload.departmentId || null,
    severity,
    priority: priorityMap[severity] || 2,
    status: 'new',
    location: payload.location || {},
  });

  await pushTimeline(caseDoc, 'created', `Emergency case ${caseDoc.id.slice(-6).toUpperCase()} registered`);

  // Notify admins + doctors via realtime.
  emitAll('emergency:new', caseDoc.toJSON());

  // Kick the AI engine: prioritize queues + refresh analytics.
  const { aiEngine } = await import('./ai-engine.service.js');
  await aiEngine.onEmergency().catch((e) => console.error('[AI] onEmergency', e.message));
  return caseDoc;
}

/** List emergency cases with filtering. */
export async function listEmergencies(status = 'active') {
  const filter =
    status === 'all'
      ? {}
      : status === 'active'
        ? { status: { $nin: ['treated', 'closed'] } }
        : { status };
  return EmergencyCase.find(filter).populate('patient').populate('department').sort({ priority: 1, createdAt: -1 }).exec();
}

export async function getEmergency(id) {
  const c = await EmergencyCase.findById(id).populate('patient').populate('department').exec();
  if (!c) throw new AppError('Emergency case not found', 404);
  return c;
}

/** Dispatch an ambulance for the case. */
export async function dispatchAmbulance(id) {
  let c = await EmergencyCase.findById(id).exec();
  if (!c) throw new AppError('Emergency case not found', 404);

  if (!c.ambulanceDispatched) {
    const amb = AMBULANCES[Math.floor(Math.random() * AMBULANCES.length)];
    c.ambulanceDispatched = true;
    c.ambulance = { id: amb.id, etaMinutes: amb.etaMinutes, driver: amb.driver, status: 'dispatched' };
    c.status = 'dispatched';
    await pushTimeline(c, 'ambulance', `Ambulance ${amb.id} dispatched — ETA ${amb.etaMinutes} min (driver ${amb.driver})`);
    emitAll('emergency:update', c.toJSON());
  }
  return c;
}

/** Alert the whole hospital (doctors, reception, emergency ward, admin). */
export async function alertHospital(id) {
  let c = await EmergencyCase.findById(id).exec();
  if (!c) throw new AppError('Emergency case not found', 404);

  if (!c.hospitalAlerted) {
    c.hospitalAlerted = true;
    c.status = c.status === 'new' ? 'responding' : c.status;
    await pushTimeline(c, 'alert', 'Hospital-wide alert issued to all departments');

    // Notify all online doctors + admins.
    const onlineDoctors = await Doctor.find({ isPresent: true }).select('_id').exec();
    const admins = await (await import('../models/Admin.js')).default.find({}).select('_id').exec();

    for (const d of onlineDoctors) {
      await notificationService.push({
        role: 'doctor',
        recipient: d._id,
        type: 'emergency_alert',
        title: 'Emergency alert',
        message: `${c.patientName || 'Patient'} — ${c.severity.toUpperCase()} priority. Case ${c.id.slice(-6).toUpperCase()}.`,
        data: { emergencyId: c._id.toString() },
      });
    }
    for (const a of admins) {
      await notificationService.push({
        role: 'admin',
        recipient: a._id,
        type: 'emergency_alert',
        title: 'Emergency alert',
        message: `${c.patientName || 'Patient'} — ${c.severity.toUpperCase()} priority.`,
        data: { emergencyId: c._id.toString() },
      });
    }
    emitAll('emergency:alert', { emergencyId: c._id, message: `Emergency: ${c.patientName}` });
  }
  return c;
}

/** Notify the patient's emergency contact (via notification). */
export async function notifyEmergencyContact(id) {
  let c = await EmergencyCase.findById(id).exec();
  if (!c) throw new AppError('Emergency case not found', 404);

  if (!c.emergencyContactNotified) {
    c.emergencyContactNotified = true;
    const contact = c.emergencyContactName || 'your emergency contact';
    await pushTimeline(c, 'contact', `${contact} (${c.emergencyContactPhone || 'phone on file'}) notified`);
  }
  return c;
}

/** Share the patient's location with the response team. */
export async function shareLocation(id, location) {
  let c = await EmergencyCase.findById(id).exec();
  if (!c) throw new AppError('Emergency case not found', 404);
  c.location = location || c.location;
  c.locationShared = true;
  await pushTimeline(c, 'location', `Patient location shared: ${location?.address || 'coordinates'}`);
  return c;
}

/** Activate full emergency mode for the hospital. */
export async function activateEmergencyMode() {
  emitAll('emergency:mode', { active: true, at: new Date().toISOString() });
  return { active: true };
}

/** Update status (treated/closed). */
export async function updateStatus(id, status) {
  let c = await EmergencyCase.findById(id).exec();
  if (!c) throw new AppError('Emergency case not found', 404);
  c.status = status;
  await pushTimeline(c, 'status', `Case marked as ${status}`);
  return c;
}

/** Current emergency command-center dashboard. */
export async function getCommandCenter() {
  const active = await EmergencyCase.find({ status: { $nin: ['treated', 'closed'] } })
    .populate('patient')
    .populate('department')
    .sort({ priority: 1, createdAt: 1 })
    .exec();
  const onlineDoctors = await Doctor.countDocuments({ isPresent: true });
  const departments = await Department.find({}).select('name').exec();
  return {
    activeCases: active.length,
    active,
    onlineDoctors,
    departments: departments.map((d) => d.name),
    ambulances: AMBULANCES,
  };
}

export const emergencyService = {
  createEmergency,
  listEmergencies,
  getEmergency,
  dispatchAmbulance,
  alertHospital,
  notifyEmergencyContact,
  shareLocation,
  activateEmergencyMode,
  updateStatus,
  getCommandCenter,
};

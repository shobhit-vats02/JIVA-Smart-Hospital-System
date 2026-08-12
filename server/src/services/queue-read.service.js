import QueueEntry from '../models/QueueEntry.js';
import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';

/**
 * Read-only access to queue state for a patient's home + queue-status views.
 * Recomputes the doctor's snapshot on demand rather than relying on cached state.
 */
export async function getDoctorQueueSnapshot(doctorId, date) {
  const entries = await QueueEntry.find({ doctor: doctorId, status: { $in: ['waiting', 'current'] } })
    .sort({ position: 1 })
    .populate('patient')
    .populate('appointment')
    .exec();

  const doctor = await Doctor.findById(doctorId).populate('department').exec();

  const current = entries.find((e) => e.status === 'current') || null;
  const waiting = entries.filter((e) => e.status === 'waiting');

  return {
    doctor: doctor ? doctor.toJSON() : null,
    current: current
      ? {
          position: current.position,
          patientName: current.patient?.name,
          token: current.token,
          appointmentId: current.appointment?._id.toString(),
        }
      : null,
    waiting: waiting.map((e) => ({
      position: e.position,
      patientName: e.patient?.name,
      token: e.token,
      estimatedWaitMinutes: e.estimatedWaitMinutes,
      appointmentId: e.appointment?._id.toString(),
    })),
    totalWaiting: waiting.length,
    avgConsultationMinutes: doctor?.avgConsultationMinutes || 12,
  };
}

/**
 * Get a patient's own place in a doctor's queue, plus how many people are ahead.
 */
export async function getPatientQueueInfo(patientId, doctorId) {
  const entries = await QueueEntry.find({ doctor: doctorId, status: { $in: ['waiting', 'current'] } })
    .sort({ position: 1 })
    .populate('patient')
    .exec();

  const me = entries.find((e) => e.patient?._id?.toString() === patientId);
  if (!me) return null;

  const current = entries.find((e) => e.status === 'current');
  const myIndex = entries.findIndex((e) => e._id.toString() === me._id.toString());
  const ahead = entries.slice(0, myIndex).filter((e) => e.status === 'waiting');

  return {
    position: myIndex + 1,
    token: me.token,
    status: me.status,
    patientsAhead: ahead.length,
    estimatedWaitMinutes: ahead.length * (await avgConsult(doctorId)),
    isCurrent: me.status === 'current',
  };
}

async function avgConsult(doctorId) {
  const d = await Doctor.findById(doctorId).select('avgConsultationMinutes').exec();
  return d?.avgConsultationMinutes || 12;
}

export const queueReadService = { getDoctorQueueSnapshot, getPatientQueueInfo };

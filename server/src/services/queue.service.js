import QueueEntry from '../models/QueueEntry.js';
import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import { emitToRoom, emitAll } from '../config/realtime.js';
import { notificationService } from './notification.service.js';

/**
 * QueueService - maintains the live queue for each doctor and pushes realtime
 * updates to everyone subscribed to that doctor's queue room (`doctor:<id>`)
 * and to the patient who moved.
 */
export class QueueService {
  /**
   * Recomputes the waiting queue for a doctor on a date and emits a snapshot.
   * Patients currently 'waiting' are ordered by token; 'current' marks the head.
   * Returns the ordered list of queue entries (populated).
   */
  async refreshQueue(doctorId, date) {
    // Non-terminal queue entries for this doctor.
    const entries = await QueueEntry.find({ doctor: doctorId, status: { $in: ['waiting', 'current'] } })
      .sort({ position: 1 })
      .populate('patient')
      .populate('appointment')
      .exec();

    const doctor = await Doctor.findById(doctorId).exec();

    // Integrate the persisted AI priority as an additional queue signal without
    // replacing the existing ordering: emergencies first, then higher priority
    // points, then arrival order (position). The "current" patient stays head.
    const priorityOf = async (e) => {
      const appt = e.appointment;
      if (!appt || !appt._id) return { emergency: false, points: 0 };
      return { emergency: !!appt.isEmergency, points: appt.priorityPoints || 0 };
    };
    const priorities = new Map();
    for (const e of entries) priorities.set(e._id.toString(), await priorityOf(e));

    const isCurrent = (e) => e.status === 'current';
    const nonCurrent = entries.filter((e) => !isCurrent(e));
    nonCurrent.sort((a, b) => {
      const pa = priorities.get(a._id.toString());
      const pb = priorities.get(b._id.toString());
      if (pa.emergency !== pb.emergency) return pa.emergency ? -1 : 1;
      if (pb.points !== pa.points) return pb.points - pa.points; // higher first
      return a.position - b.position; // stable arrival order
    });
    const ordered = [];
    for (const e of entries) if (isCurrent(e)) ordered.push(e);
    ordered.push(...nonCurrent);

    for (let idx = 0; idx < ordered.length; idx++) {
      const e = ordered[idx];
      e.position = idx + 1;
      await Appointment.updateOne({ _id: e.appointment._id }, { $set: { queuePosition: e.position } });
      await e.save();
    }

    // Keep doctor's current queue count in sync.
    const waitingCount = ordered.filter((e) => e.status === 'waiting').length;
    const current = ordered.find((e) => e.status === 'current') || null;
    await Doctor.updateOne(
      { _id: doctorId },
      { $set: { currentQueue: waitingCount, currentPatient: current ? current.appointment._id : null } }
    ).exec();

    const snapshot = {
      doctor: doctor ? doctor.toJSON() : doctorId,
      date,
      next: ordered.find((e) => e.status === 'waiting')
        ? { position: ordered[0].position, patientName: ordered[0].patient?.name, token: ordered[0].token, appointmentId: ordered[0].appointment._id.toString() }
        : null,
      current: current
        ? { position: current.position, patientName: current.patient?.name, token: current.token, appointmentId: current.appointment._id.toString() }
        : null,
      waiting: ordered
        .filter((e) => e.status === 'waiting')
        .map((e) => ({
          position: e.position,
          patientName: e.patient?.name,
          token: e.token,
          estimatedWaitMinutes: e.estimatedWaitMinutes,
          appointmentId: e.appointment._id.toString(),
        })),
      totalWaiting: waitingCount,
    };

    emitToRoom(`doctor:${doctorId}`, 'queue:update', snapshot);
    emitAll('queue:global', snapshot);
    return snapshot;
  }

  /**
   * Adds an appointment to the doctor's queue for the given date.
   */
  async addToQueue({ doctor, patient, appointment, token }) {
    const waiting = await QueueEntry.countDocuments({
      doctor: doctor._id,
      status: { $in: ['waiting', 'current'] },
    });

    const doc = await Doctor.findById(doctor._id).exec();
    const entry = await QueueEntry.create({
      doctor: doctor._id,
      patient,
      appointment,
      token,
      position: waiting + 1,
      status: 'waiting',
      estimatedWaitMinutes: (waiting) * (doc?.avgConsultationMinutes || 12),
    });

    await Appointment.updateOne({ _id: appointment }, { $set: { status: 'waiting', tokenNumber: entry.position, queuePosition: entry.position } });
    await this.refreshQueue(doctor._id, new Date().toISOString().slice(0, 10));
    return entry;
  }

  /**
   * Marks the first waiting patient as "current" (start of consultation) and
   * refreshes the queue snapshot.
   */
  async startCurrent(doctorId, date) {
    const first = await QueueEntry.findOne({ doctor: doctorId, status: 'waiting' }).sort({ position: 1 }).exec();
    if (first) {
      first.status = 'current';
      await first.save();
      await Appointment.updateOne({ _id: first.appointment }, { $set: { status: 'in_consultation' } });
    }
    return this.refreshQueue(doctorId, date);
  }

  /**
   * Marks the current patient's consultation as complete and advances the queue.
   */
  async completeCurrent(doctorId, date) {
    const current = await QueueEntry.findOne({ doctor: doctorId, status: 'current' }).exec();
    if (current) {
      current.status = 'completed';
      current.consultedAt = new Date();
      await current.save();
      await Appointment.updateOne({ _id: current.appointment }, { $set: { status: 'completed', consultationEndedAt: new Date() } });
    }
    const snapshot = await this.refreshQueue(doctorId, date);
    return snapshot;
  }
}

export const queueService = new QueueService();

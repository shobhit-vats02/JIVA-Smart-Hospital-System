import Appointment from '../models/Appointment.js';
import QueueEntry from '../models/QueueEntry.js';
import PresenceLog from '../models/PresenceLog.js';
import EmergencyCase from '../models/EmergencyCase.js';
import Notification from '../models/Notification.js';
import HospitalAnalytics from '../models/HospitalAnalytics.js';
import VideoConsultation from '../models/VideoConsultation.js';
import AIRecommendation from '../models/AIRecommendation.js';
import WaitingPrediction from '../models/WaitingPrediction.js';
import { aiService } from '../services/ai.service.js';

/**
 * Rich operational data seeding.
 * Populates realistic historical + live data so JIVA looks like it has been
 * operating in a hospital for months:
 *   - appointments across the last 7 days (completed/cancelled/emergency)
 *   - live queue entries for available doctors today
 *   - presence logs for doctors who "came on duty"
 *   - emergency cases + ambulance dispatch history
 *   - notifications for all roles
 *   - hospital analytics snapshots for the last 7 days
 *   - video consultation records + prescriptions
 *   - AI recommendations + waiting predictions
 */

const TIME_SLOTS = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30'];

function addDays(base, n) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function dateStr(d) {
  return d.toISOString().slice(0, 10);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const REASONS = ['Follow-up visit', 'Chest pain', 'Migraine', 'Joint pain', 'Fever', 'Routine check-up', 'Skin rash', 'Blood pressure', 'Persistent cough', 'Back pain'];
const SYMPTOMS = ['Mild discomfort', 'Recurring headache', 'Pain on movement', 'Low energy', 'Redness & itching', 'Nausea', 'Dizziness'];

export async function seedOperationalData({ patients, doctors, departments, admins, adminId }) {
  const today = new Date();
  let token = 40;

  // ---- Clear old operational collections when seeding rich data ----
  await Appointment.deleteMany({});
  await QueueEntry.deleteMany({});
  await PresenceLog.deleteMany({});
  await EmergencyCase.deleteMany({});
  await Notification.deleteMany({});
  await HospitalAnalytics.deleteMany({});
  await VideoConsultation.deleteMany({});
  await AIRecommendation.deleteMany({});
  await WaitingPrediction.deleteMany({});

  // ---- Historical appointments (last 7 days, all completed/cancelled) ----
  let completedCount = 0;
  let cancelledCount = 0;
  let emergencyCount = 0;
  const completedAppts = [];

  for (let day = 7; day >= 1; day--) {
    const date = dateStr(addDays(today, -day));
    const dayDoctors = doctors.slice(0, 3 + (day % 3)); // vary load
    for (const doc of dayDoctors) {
      const nAppts = 4 + Math.floor(Math.random() * 4);
      for (let i = 0; i < nAppts; i++) {
        const patient = pick(patients);
        const startTime = pick(TIME_SLOTS);
        const roll = Math.random();
        let status = 'completed';
        if (roll < 0.12) status = 'cancelled';
        else if (roll < 0.2) status = 'emergency';

        const reason = pick(REASONS);
        const symptoms = Math.random() > 0.5 ? pick(SYMPTOMS) : '';
        const basePriority = status === 'emergency' ? 'emergency' : 'normal';
        const { points, category } = aiService.computePriorityPoints({
          isEmergency: status === 'emergency',
          priority: basePriority,
          age: patient.age,
          conditions: patient.healthProfile?.conditions || [],
          reason,
          symptoms,
        });

        const appt = await Appointment.create({
          patient: patient._id,
          doctor: doc._id,
          department: doc.department,
          date,
          startTime,
          endTime: endTimeFor(startTime),
          reason,
          symptoms,
          isEmergency: status === 'emergency',
          status,
          priority: basePriority,
          priorityPoints: points,
          priorityCategory: category,
          tokenNumber: ++token,
          queuePosition: status === 'completed' || status === 'emergency' ? 1 : 0,
          estimatedWaitMinutes: Math.floor(Math.random() * 30) + 5,
          consultationStartedAt: status === 'completed' ? new Date(`${date}T${startTime}:00`) : undefined,
          consultationEndedAt: status === 'completed' ? new Date(`${date}T${endTimeFor(startTime)}:00`) : undefined,
        });
        if (status === 'completed') { completedCount++; completedAppts.push(appt); }
        if (status === 'cancelled') cancelledCount++;
        if (status === 'emergency') emergencyCount++;
      }
    }
  }

  // ---- Live appointments today for available doctors ----
  const todayStr = dateStr(today);
  const liveAppointments = [];
  // Mark 3 doctors as present/available today.
  const onDuty = doctors.slice(0, 3);
  for (const doc of onDuty) {
    doc.isPresent = true;
    doc.isAvailable = true;
    doc.lastPresentAt = today;
    doc.presenceConfidence = 99.2;
    await doc.save();

    const nAppts = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < nAppts; i++) {
      const patient = pick(patients);
      const startTime = pick(TIME_SLOTS);
      const status = i === 0 ? 'in_consultation' : 'waiting';
      const reason = pick(REASONS);
      const symptoms = pick(SYMPTOMS);
      const { points, category } = aiService.computePriorityPoints({
        isEmergency: false,
        priority: 'normal',
        age: patient.age,
        conditions: patient.healthProfile?.conditions || [],
        reason,
        symptoms,
      });

      const appt = await Appointment.create({
        patient: patient._id,
        doctor: doc._id,
        department: doc.department,
        date: todayStr,
        startTime,
        endTime: endTimeFor(startTime),
        reason,
        symptoms,
        status,
        priority: 'normal',
        priorityPoints: points,
        priorityCategory: category,
        tokenNumber: ++token,
        queuePosition: i + 1,
        estimatedWaitMinutes: i * (doc.avgConsultationMinutes || 12),
        consultationStartedAt: i === 0 ? new Date() : undefined,
      });
      liveAppointments.push(appt);
    }

    // Presence logs for this doctor.
    await PresenceLog.create({
      doctor: doc._id,
      face: { attempted: true, verified: true, score: 0.99 },
      rfid: { attempted: true, verified: true, cardId: doc.rfidTag },
      bluetooth: { attempted: true, verified: true, device: 'JIVA-BLE-01', rssi: -42 },
      wifi: { attempted: true, verified: true, network: 'JIVA-HOSPITAL' },
      gps: { attempted: true, verified: true, insideGeofence: true },
      aiConfidence: 99.2,
      activated: true,
      decision: 'approved',
      summary: 'Presence verified on arrival (seeded).',
    });
  }

  // ---- Queue entries for today ----
  for (const appt of liveAppointments) {
    await QueueEntry.create({
      doctor: appt.doctor,
      patient: appt.patient,
      appointment: appt._id,
      token: `T-${appt.tokenNumber}`,
      position: appt.queuePosition,
      status: appt.status === 'in_consultation' ? 'current' : 'waiting',
      estimatedWaitMinutes: appt.estimatedWaitMinutes,
      consultedAt: appt.consultationStartedAt,
    });
  }

  // ---- Emergency cases (active + resolved) ----
  const activeEmergency = await EmergencyCase.create({
    patientName: pick(patients).name,
    phone: '+91 98765 43210',
    description: 'Severe chest pain, possible cardiac episode',
    severity: 'critical',
    priority: 1,
    status: 'dispatched',
    ambulanceDispatched: true,
    ambulance: { id: 'AMB-01', etaMinutes: 4, driver: 'Rajesh Patil', status: 'enroute' },
    hospitalAlerted: true,
    emergencyContactNotified: true,
    locationShared: true,
    location: { lat: 23.0225, lng: 72.5714, address: 'JIVA Main Campus' },
    timeline: [
      { type: 'created', text: 'Emergency case registered', at: addDays(today, -1) },
      { type: 'ambulance', text: 'Ambulance AMB-01 dispatched', at: addDays(today, -1) },
      { type: 'alert', text: 'Hospital-wide alert issued', at: addDays(today, -1) },
    ],
  });
  for (let i = 1; i <= 3; i++) {
    await EmergencyCase.create({
      patientName: pick(patients).name,
      description: pick(['Traffic accident trauma', 'Stroke symptoms', 'Severe allergic reaction']),
      severity: i === 1 ? 'high' : i === 2 ? 'medium' : 'low',
      priority: i + 1,
      status: 'treated',
      ambulanceDispatched: true,
      ambulance: { id: `AMB-0${i}`, etaMinutes: i * 3, driver: pick(['Rajesh Patil', 'Suresh Kumar', 'Manoj Verma']), status: 'arrived' },
      timeline: [
        { type: 'created', text: 'Emergency case registered', at: addDays(today, -i - 1) },
        { type: 'status', text: 'Case marked as treated', at: addDays(today, -i) },
      ],
    });
  }

  // ---- Notifications for all roles ----
  for (const p of patients) {
    await Notification.create({
      recipientRole: 'patient',
      recipient: p._id,
      type: pick(['appointment_confirmed', 'queue_updated', 'prescription_available', 'doctor_arrived']),
      title: pick(['Appointment confirmed', 'Queue updated', 'Prescription available', 'Your doctor is available']),
      message: 'Seeded notification for your recent activity.',
      read: Math.random() > 0.5,
    });
  }
  for (const d of doctors) {
    await Notification.create({
      recipientRole: 'doctor',
      recipient: d._id,
      type: 'system',
      title: 'Welcome to your shift',
      message: 'Your schedule and queue are ready.',
      read: false,
    });
  }
  if (adminId) {
    await Notification.create({
      recipientRole: 'admin',
      recipient: adminId,
      type: 'system',
      title: 'Hospital operations overview',
      message: 'All systems operational. Review analytics for today.',
      read: false,
    });
  }

  // ---- Hospital analytics for last 7 days ----
  for (let day = 7; day >= 0; day--) {
    const date = dateStr(addDays(today, -day));
    const apptsToday = day === 0 ? liveAppointments.length : 8 + Math.floor(Math.random() * 12);
    const completedToday = day === 0 ? 2 : apptsToday - Math.floor(Math.random() * 3);
    await HospitalAnalytics.create({
      date,
      hour: -1,
      appointments: apptsToday,
      completed: completedToday,
      cancelled: Math.floor(apptsToday * 0.1),
      emergencies: day === 0 ? emergencyCount : Math.floor(Math.random() * 3),
      patientsWaiting: day === 0 ? liveAppointments.filter((a) => a.status === 'waiting').length : 5 + Math.floor(Math.random() * 10),
      doctorsOnline: day === 0 ? onDuty.length : 3 + Math.floor(Math.random() * 3),
      doctorsBusy: day === 0 ? onDuty.length : 2 + Math.floor(Math.random() * 2),
      doctorsOffline: doctors.length - onDuty.length,
      avgWaitMinutes: 8 + Math.floor(Math.random() * 20),
      avgConsultationMinutes: Math.round(doctors.reduce((s, d) => s + d.avgConsultationMinutes, 0) / doctors.length),
      efficiency: Math.round((completedToday / Math.max(1, apptsToday)) * 100),
      hospitalLoad: Math.min(100, Math.round((apptsToday / 25) * 100)),
    });
  }

  // ---- Video consultations + prescriptions for completed appts ----
  for (const appt of completedAppts.slice(0, 8)) {
    await VideoConsultation.create({
      appointment: appt._id,
      patient: appt.patient,
      doctor: appt.doctor,
      status: 'ended',
      startedAt: appt.consultationStartedAt,
      endedAt: appt.consultationEndedAt,
      durationSeconds: 600 + Math.floor(Math.random() * 900),
      messages: [
        { from: 'doctor', text: 'Hello, how are you feeling today?', at: appt.consultationStartedAt },
        { from: 'patient', text: 'Better than last week, doctor.', at: appt.consultationStartedAt },
      ],
      doctorNotes: 'Patient responding well to treatment.',
      prescription: {
        medicines: [
          { name: 'Amlodipine 5mg', dosage: '5mg', frequency: 'Once daily', duration: '30 days', instructions: 'Take in the morning.' },
          { name: 'Metoprolol 25mg', dosage: '25mg', frequency: 'Twice daily', duration: '30 days', instructions: 'Take after meals.' },
        ],
        notes: 'Take after meals. Follow up in 1 month.',
        issuedAt: appt.consultationEndedAt,
      },
    });
  }

  // Guarantee at least one valid prescription for the demo patient "Rahul Verma"
  // so his Patient Portal Prescriptions page shows a record (not the empty state).
  const rahul = patients.find((p) => p.email === 'rahul@jiva.ai');
  if (rahul && doctors.length) {
    const rahulDoc = doctors[0];
    const existingForRahul = await VideoConsultation.findOne({ patient: rahul._id, prescription: { $ne: null } }).exec();
    if (!existingForRahul) {
      await VideoConsultation.create({
        appointment: null,
        patient: rahul._id,
        doctor: rahulDoc._id,
        status: 'ended',
        startedAt: addDays(today, -2),
        endedAt: addDays(today, -2),
        doctorNotes: 'Take adequate rest and stay hydrated.',
        prescription: {
          medicines: [
            { name: 'Paracetamol', dosage: '500 mg', frequency: '3× daily', duration: '7 days', instructions: 'Take after meals.' },
          ],
          notes: 'Take adequate rest and stay hydrated.',
          issuedAt: new Date(`${todayStr}T10:30:00`),
          doctor: rahulDoc._id,
          patient: rahul._id,
        },
      });
    }
  }

  // ---- AI recommendations + waiting predictions ----
  for (const doc of onDuty) {
    await WaitingPrediction.create({
      doctor: doc._id,
      department: doc.department,
      predictedWaitMinutes: 15 + Math.floor(Math.random() * 25),
      patientsAhead: 2 + Math.floor(Math.random() * 3),
      hospitalLoad: 40 + Math.floor(Math.random() * 40),
      confidence: 0.85,
      basedOn: 'realtime',
    });
  }
  await AIRecommendation.create({
    patient: patients[0]._id,
    type: 'best_slot',
    title: 'AI slot suggestion',
    message: 'Best available slot today is 11:30 AM with a ~20 min wait.',
    suggested: { slot: '11:30', waitMinutes: 20 },
    reason: 'Queue ahead: 2 patients',
  });

  return {
    completedCount,
    cancelledCount,
    emergencyCount,
    liveAppointments: liveAppointments.length,
    onDuty: onDuty.length,
    activeEmergency: activeEmergency.id,
  };
}

function endTimeFor(start) {
  const [sh, sm] = start.split(':').map(Number);
  const total = sh * 60 + sm + 30;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

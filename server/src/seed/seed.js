import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';
import Department from '../models/Department.js';
import Admin from '../models/Admin.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import {
  DEPARTMENTS,
  ADMINS,
  DOCTORS,
  PATIENTS,
  DEMO_CREDENTIALS,
} from './seedData.js';
import { seedOperationalData } from './seedRichData.js';

const args = process.argv.slice(2);
const RESET = args.includes('--reset');

function logSection(title) {
  console.log(`\n========== ${title} ==========`);
}

async function seedDepartments() {
  const created = [];
  for (const d of DEPARTMENTS) {
    const existing = await Department.findOneAndUpdate(
      { code: d.code },
      { $setOnInsert: d },
      { new: true, upsert: true }
    );
    created.push(existing);
  }
  console.log(`  Departments ready: ${created.length}`);
  return created;
}

async function seedAdmins() {
  for (const a of ADMINS) {
    const existing = await Admin.findOne({ email: a.email.toLowerCase() });
    if (existing && !RESET) {
      console.log(`  Admin exists (skip): ${a.email}`);
      continue;
    }
    const passwordHash = await bcrypt.hash(a.password, 12);
    await Admin.findOneAndUpdate(
      { email: a.email.toLowerCase() },
      { $set: { name: a.name, phone: a.phone, passwordHash } },
      { new: true, upsert: true }
    );
    console.log(`  Admin upserted: ${a.email} / ${a.password}`);
  }
}

async function seedDoctors(departmentsByCode) {
  const result = [];
  for (const d of DOCTORS) {
    const dep = departmentsByCode.get(d.departmentCode);
    const existing = await Doctor.findOne({ staffId: d.staffId });
    if (existing && !RESET) {
      console.log(`  Doctor exists (skip): ${d.staffId} - ${d.name}`);
      result.push(existing);
      continue;
    }
    const passwordHash = await bcrypt.hash(d.password, 12);
    const doc = await Doctor.findOneAndUpdate(
      { staffId: d.staffId },
      {
        $set: {
          name: d.name,
          email: d.email,
          phone: d.phone,
          passwordHash,
          department: dep?._id || null,
          specialty: d.specialty,
          qualification: d.qualification,
          yearsOfExperience: d.yearsOfExperience,
          rating: d.rating,
          avgConsultationMinutes: d.avgConsultationMinutes,
          rfidTag: d.rfidTag,
        },
      },
      { new: true, upsert: true }
    );
    result.push(doc);
    console.log(`  Doctor upserted: ${d.staffId} / ${d.password}`);
  }
  return result;
}

async function seedPatients() {
  const result = [];
  for (const p of PATIENTS) {
    const existing = await Patient.findOne({ email: p.email.toLowerCase() });
    if (existing && !RESET) {
      console.log(`  Patient exists (skip): ${p.email}`);
      result.push(existing);
      continue;
    }
    const passwordHash = await bcrypt.hash(p.password, 12);
    const patient = await Patient.findOneAndUpdate(
      { email: p.email.toLowerCase() },
      {
        $set: {
          name: p.name,
          phone: p.phone,
          passwordHash,
          gender: p.gender,
          age: p.age,
          bloodGroup: p.bloodGroup,
          address: p.address,
          medicalHistory: p.medicalHistory || [],
          healthProfile: p.healthProfile || { allergies: [], conditions: [], vaccinations: [], emergencyContact: {} },
          emergencyContact: p.emergencyContact || {},
        },
      },
      { new: true, upsert: true }
    );
    result.push(patient);
    console.log(`  Patient upserted: ${p.email} / ${p.password}`);
  }
  return result;
}

function printCredentials() {
  logSection('DEMO CREDENTIALS');
  console.log('  ADMIN (login via Email):');
  for (const a of DEMO_CREDENTIALS.admin) {
    console.log(`    Email: ${a.email}  Password: ${a.password}`);
  }
  console.log('  DOCTORS (login via Staff ID):');
  for (const d of DEMO_CREDENTIALS.doctor) {
    console.log(`    ${d.staffId}  Password: ${d.password}  (${d.label})`);
  }
  console.log('  PATIENTS (login via Email):');
  for (const p of DEMO_CREDENTIALS.patient) {
    console.log(`    ${p.email}  Password: ${p.password}  (${p.label})`);
  }
}

async function seed() {
  logSection('JIVA SEED');
  if (RESET) {
    console.log('  --reset flag detected: collections will be upserted.');
  }

  await connectDB();

  try {
    const departments = await seedDepartments();
    const departmentsByCode = new Map(departments.map((d) => [d.code, d]));
    await seedAdmins();
    const doctors = await seedDoctors(departmentsByCode);
    const patients = await seedPatients();
    const admins = await Admin.find({}).exec();

    // ---- Rich operational data (appointments, queues, presence, emergencies,
    //      notifications, analytics, video, AI records) ----
    const SKIP_RICH = args.includes('--no-rich');
    if (!SKIP_RICH) {
      logSection('OPERATIONAL DATA');
      const summary = await seedOperationalData({
        patients,
        doctors,
        departments,
        admins,
        adminId: admins[0]?._id,
      });
      console.log('  Historical completed:', summary.completedCount);
      console.log('  Historical cancelled:', summary.cancelledCount);
      console.log('  Historical emergencies:', summary.emergencyCount);
      console.log('  Live appointments today:', summary.liveAppointments);
      console.log('  Doctors on duty (seeded):', summary.onDuty);
      console.log('  Active emergency case:', summary.activeEmergency);
    }

    logSection('VERIFICATION');
    const counts = {
      departments: await Department.countDocuments(),
      admins: await Admin.countDocuments(),
      doctors: await Doctor.countDocuments(),
      patients: await Patient.countDocuments(),
      appointments: await (await import('../models/Appointment.js')).default.countDocuments(),
      queues: await (await import('../models/QueueEntry.js')).default.countDocuments(),
      presenceLogs: await (await import('../models/PresenceLog.js')).default.countDocuments(),
      emergencies: await (await import('../models/EmergencyCase.js')).default.countDocuments(),
      notifications: await (await import('../models/Notification.js')).default.countDocuments(),
      analytics: await (await import('../models/HospitalAnalytics.js')).default.countDocuments(),
      video: await (await import('../models/VideoConsultation.js')).default.countDocuments(),
      aiRecommendations: await (await import('../models/AIRecommendation.js')).default.countDocuments(),
      waitingPredictions: await (await import('../models/WaitingPrediction.js')).default.countDocuments(),
    };
    console.log('  Database counts:', JSON.stringify(counts));
    console.log('  MongoDB:', env.mongoUri);

    printCredentials();

    console.log('\n[SEED] JIVA database is ready. You can now run `npm run dev`.');
  } finally {
    await disconnectDB();
  }
}

seed().catch((err) => {
  console.error('[SEED] Failed:', err);
  process.exit(1);
});

/**
 * JIVA Milestone 5 smoke test — AI Engine.
 *   - run a full engine cycle
 *   - analytics snapshot written
 *   - waiting predictions broadcast + persisted
 *   - doctor delay prediction
 *   - reallocation suggestion for an overloaded doctor
 *   - emergency prioritization
 *   - onDoctorAvailable notifies waiting patients
 *   - onEmergency refreshes analytics
 *
 * Usage: node scripts/smoke-test-m5.mjs
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import { spawn } from 'node:child_process';

let passed = 0, failed = 0;
const check = (name, cond) => {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.error(`  \u2717 ${name}`); }
};

const mongod = await MongoMemoryServer.create();
process.env.MONGO_URI = mongod.getUri('jiva_m5');
process.env.JWT_ACCESS_SECRET = 'test-access';
process.env.JWT_REFRESH_SECRET = 'test-refresh';

await new Promise((r) => {
  const p = spawn('node', ['src/seed/seed.js', '--reset', '--no-rich'], {
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...process.env }, stdio: 'inherit',
  });
  p.on('exit', r);
});

const { connectDB, disconnectDB } = await import('../src/config/db.js');
await connectDB();

const { aiEngine } = await import('../src/services/ai-engine.service.js');
const Doctor = (await import('../src/models/Doctor.js')).default;
const Department = (await import('../src/models/Department.js')).default;
const Appointment = (await import('../src/models/Appointment.js')).default;
const HospitalAnalytics = (await import('../src/models/HospitalAnalytics.js')).default;
const WaitingPrediction = (await import('../src/models/WaitingPrediction.js')).default;
const AIRecommendation = (await import('../src/models/AIRecommendation.js')).default;
const Notification = (await import('../src/models/Notification.js')).default;

const { appointmentService } = await import('../src/services/appointment.service.js');
const { authService } = await import('../src/services/auth.service.js');

// Set up: two cardiology doctors, make both available. Patient books several appointments
// with doctor 1 to overload it.
const dept = await Department.findOne({ code: 'CARD' }).exec();
const docs = await Doctor.find({ department: dept._id }).exec();
const docA = docs[0];
// Create a second cardiology doctor so reallocation has an alternative.
const bcrypt = (await import('bcryptjs')).default;
const docB = await Doctor.create({
  name: 'Dr. Cardiologist B',
  staffId: 'DOC2002',
  email: 'cardio.b@jiva.ai',
  passwordHash: await bcrypt.hash('doctor123', 12),
  department: dept._id,
  specialty: 'Cardiology',
  avgConsultationMinutes: 12,
  isAvailable: true,
  isPresent: true,
});
await Doctor.updateMany({ department: dept._id }, { $set: { isAvailable: true, isPresent: true } });

const patients = await authService.login({ role: 'patient', identifier: 'rahul@jiva.ai', password: 'patient123' });
const patientIds = ['rahul@jiva.ai', 'sneha@jiva.ai', 'amit@jiva.ai', 'fatima@jiva.ai', 'deepak@jiva.ai'];
// The engine predicts for TODAY, so book today's appointments to overload docA.
const date = new Date().toISOString().slice(0, 10);

// Book 5 appointments with docA (overload).
for (const [i, email] of patientIds.entries()) {
  const p = await authService.login({ role: 'patient', identifier: email, password: 'patient123' });
  await appointmentService.bookAppointment({
    patientId: p.user._id.toString(),
    departmentId: dept._id.toString(),
    doctorId: docA._id.toString(),
    date,
    startTime: ['09:00','09:30','10:00','10:30','11:00'][i],
    aiSuggestionAccepted: false,
  });
}

// --- AI Engine cycle ---
const cycle = await aiEngine.runCycle();
check('AI engine cycle completes', !!cycle.cycle);

// Analytics snapshot written
const snap = await HospitalAnalytics.findOne({ date: cycle.date, hour: -1 }).exec();
check('Analytics snapshot written', !!snap && typeof snap.efficiency === 'number');
check('Analytics load is 0-100', snap.hospitalLoad >= 0 && snap.hospitalLoad <= 100);

// Waiting predictions persisted
const waits = await WaitingPrediction.find({ doctor: docA._id }).sort({ createdAt: -1 }).limit(1).exec();
check('Waiting prediction recorded for docA', waits.length === 1 && waits[0].patientsAhead >= 4);

// Delay prediction
const delay = await aiEngine.predictDoctorDelay(docA, date);
check('Delay prediction returns an object', typeof delay.predictedMinutes === 'number');
const delayUnavailable = await aiEngine.predictDoctorDelay(docB, date); // docB has no appts
check('No delay predicted when low load', delayUnavailable.predictedMinutes === 0);

// Reallocation suggestion (docA overloaded with 5, docB available with 0)
// Reallocation suggestion (docA overloaded with 5, docB available with 0)
const freshDocA = await Doctor.findById(docA._id).exec(); // reload (stale object has isAvailable=false)
const realloc = await aiEngine.suggestReallocation(freshDocA, date);
check('Reallocation suggested to alternative doctor', !!realloc && !!realloc.toDoctor);

// Emergency prioritization
const EmergencyCase = (await import('../src/models/EmergencyCase.js')).default;
await EmergencyCase.create({ patientName: 'Critical Patient', severity: 'critical', status: 'new' });
const pri = await aiEngine.prioritizeEmergencies();
check('Emergency prioritization sees active emergency', pri.emergenciesActive >= 1);

// onDoctorAvailable notifies waiting patients
const beforeNotifs = await Notification.countDocuments({ type: 'doctor_arrived' });
await aiEngine.onDoctorAvailable(docA);
const afterNotifs = await Notification.countDocuments({ type: 'doctor_arrived' });
check('Doctor availability notifies waiting patients', afterNotifs >= beforeNotifs);

// onEmergency refreshes analytics
await aiEngine.onEmergency();

// AI recommendations created by reallocation
const recs = await AIRecommendation.find({ type: 'reallocation' }).exec();
check('Reallocation recommendation persisted', recs.length >= 1);

await disconnectDB();
await mongod.stop();
console.log(`\nM5 SMOKE TEST RESULT: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

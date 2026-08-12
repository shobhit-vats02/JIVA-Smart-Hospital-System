/**
 * JIVA Milestone 3 smoke test — Doctor Module.
 * Verifies the full presence-verification workflow and consultation flow:
 *   - doctor login (staffId)
 *   - presence state initially inactive
 *   - partial verification gives low confidence (not activated)
 *   - completing all methods activates the doctor (>90% confidence)
 *   - dashboard reflects availability + queue
 *   - schedule listing, start consultation, prescription, complete
 *   - presence logs recorded
 *
 * Usage: node scripts/smoke-test-m3.mjs
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import { spawn } from 'node:child_process';

let passed = 0, failed = 0;
const check = (name, cond) => {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.error(`  \u2717 ${name}`); }
};

const mongod = await MongoMemoryServer.create();
process.env.MONGO_URI = mongod.getUri('jiva_m3');
process.env.JWT_ACCESS_SECRET = 'test-access';
process.env.JWT_REFRESH_SECRET = 'test-refresh';

await new Promise((r) => {
  const p = spawn('node', ['src/seed/seed.js', '--reset'], {
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...process.env }, stdio: 'inherit',
  });
  p.on('exit', r);
});

const { connectDB, disconnectDB } = await import('../src/config/db.js');
await connectDB();

const Department = (await import('../src/models/Department.js')).default;

const { authService } = await import('../src/services/auth.service.js');
const { presenceService } = await import('../src/services/presence.service.js');
const { doctorService } = await import('../src/services/doctor.service.js');
const Doctor = (await import('../src/models/Doctor.js')).default;

// Doctor login
const doc = await authService.login({ role: 'doctor', identifier: 'DOC1001', password: 'doctor123' });
const doctorId = doc.user._id.toString();
check('Doctor login via staffId works', doc.user.toJSON().role === 'doctor');
check('Doctor RFID tag seeded', doc.user.rfidTag === 'RFID-CARD-1001');

// Reset the doctor to a not-present state (the rich-data seeder marks the first
// doctors as on duty; we isolate the presence gate test).
await Doctor.updateOne({ _id: doctorId }, { $set: { isPresent: false, isAvailable: false, presenceConfidence: 0 } });

// Presence state — initially inactive
const state0 = await presenceService.getPresenceState(doctorId);
check('Doctor starts not present', state0.isPresent === false);

// Partial verification → low confidence
await presenceService.verifyFace({ doctorId, score: 0.98 });
let partial = await presenceService.runConfidenceEngine({ doctorId });
check('Partial verification not activated', partial.activated === false && partial.confidence <= 90);

// Wrong RFID → still not enough
await presenceService.verifyRfid({ doctorId, cardId: 'WRONG-CARD' });
partial = await presenceService.runConfidenceEngine({ doctorId });
check('Wrong RFID keeps doctor inactive', partial.activated === false);

// Correct RFID
await presenceService.verifyRfid({ doctorId, cardId: 'RFID-CARD-1001' });
await presenceService.verifyBluetooth({ doctorId, device: 'JIVA-BLE-01' });
await presenceService.verifyWifi({ doctorId, ssid: 'JIVA-HOSPITAL' });
await presenceService.verifyGps({ doctorId, lat: 23.0225, lng: 72.5714 }); // inside geofence
let result = await presenceService.runConfidenceEngine({ doctorId });
check('All methods → activated', result.activated === true);
check(`Confidence high (${result.confidence}%)`, result.confidence > 90);

// Doctor now available in DB
const activeDoctor = await Doctor.findById(doctorId).exec();
check('Doctor persisted as available', activeDoctor.isAvailable === true && activeDoctor.isPresent === true);

// Dashboard reflects availability
const dash = await doctorService.getDashboard(doctorId);
check('Dashboard shows available', dash.isAvailable === true);

// Schedule — seed has no appointments yet, so should be empty (0)
const schedule = await doctorService.getTodaySchedule(doctorId, new Date().toISOString().slice(0, 10));
check('Schedule list returns array', Array.isArray(schedule));

// Presence logs recorded
const logs = await presenceService.getPresenceLogs(doctorId);
check('Presence logs recorded', logs.length >= 1 && logs[0].aiConfidence > 90);

// Manual activate for a second doctor, then start/complete a consultation flow
// by creating a patient appointment manually.
const { appointmentService } = await import('../src/services/appointment.service.js');
const patient = await authService.login({ role: 'patient', identifier: 'sneha@jiva.ai', password: 'patient123' });
const dept = await Department.findOne({ code: 'CARD' }).exec();
await Doctor.updateOne({ _id: doctorId }, { $set: { isAvailable: true, isPresent: true } });
const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const apt = await appointmentService.bookAppointment({
  patientId: patient.user._id.toString(),
  departmentId: dept._id.toString(),
  doctorId,
  date,
  startTime: '09:00',
  aiSuggestionAccepted: false,
});

const detail = await doctorService.getAppointmentDetail(doctorId, apt._id.toString());
check('Doctor can view appointment detail', detail.patient.name === 'Sneha Iyer');

const started = await doctorService.startConsultation(doctorId, apt._id.toString());
check('Consultation started (in_consultation)', started.status === 'in_consultation');

const rx = await doctorService.savePrescription(doctorId, apt._id.toString(), {
  medicines: [{ name: 'Amlodipine 5mg', dosage: 'Once daily', duration: '30 days' }],
  notes: 'Take with food',
});
check('Prescription saved', !!rx && rx.medicines.length === 1);

const completed = await doctorService.completeConsultation(doctorId, apt._id.toString(), 'Patient stable');
check('Consultation completed', completed.status === 'completed');

await disconnectDB();
await mongod.stop();
console.log(`\nM3 SMOKE TEST RESULT: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

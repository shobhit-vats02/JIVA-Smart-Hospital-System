/**
 * JIVA Milestone 2 smoke test.
 * Exercises the patient module end-to-end against in-memory MongoDB:
 *   - departments & doctors listing
 *   - book an appointment (with AI recommendation)
 *   - patient's appointments list
 *   - queue status for the patient
 *   - notifications created
 *   - cancel appointment
 *   - profile retrieval + update
 *   - video session create / start / message / end
 *
 * Usage: node scripts/smoke-test-m2.mjs
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import { spawn } from 'node:child_process';

let passed = 0, failed = 0;
const check = (name, cond) => {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.error(`  \u2717 ${name}`); }
};

const mongod = await MongoMemoryServer.create();
process.env.MONGO_URI = mongod.getUri('jiva_m2');
process.env.JWT_ACCESS_SECRET = 'test-access';
process.env.JWT_REFRESH_SECRET = 'test-refresh';

// Seed.
await new Promise((r) => {
  const p = spawn('node', ['src/seed/seed.js', '--reset'], {
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...process.env }, stdio: 'inherit',
  });
  p.on('exit', r);
});

const { connectDB, disconnectDB } = await import('../src/config/db.js');
await connectDB();

const { departmentService } = await import('../src/services/department.service.js');
const { appointmentService } = await import('../src/services/appointment.service.js');
const { queueReadService } = await import('../src/services/queue-read.service.js');
const { patientService } = await import('../src/services/patient.service.js');
const { videoService } = await import('../src/services/video.service.js');
const Notification = (await import('../src/models/Notification.js')).default;
const { authService } = await import('../src/services/auth.service.js');

// --- departments & doctors ---
const depts = await departmentService.listDepartments();
check(`Departments listed (${depts.length})`, depts.length === 6);
const card = depts.find((d) => d.code === 'CARD');
const doctors = await departmentService.listDoctors(card._id);
check(`Cardiology doctors listed (${doctors.length})`, doctors.length >= 1);

// Login as a patient.
const pat = await authService.login({ role: 'patient', identifier: 'rahul@jiva.ai', password: 'patient123' });
const patientId = pat.user._id.toString();

// Regression: token payload MUST include the role so `protect` works over HTTP.
const { decode } = (await import('jsonwebtoken')).default;
const decoded = decode(pat.accessToken);
check('JWT payload includes role', decoded?.role === 'patient');
const resolvedUser = await authService.findUserByIdentity('patient', patientId);
check('protect can resolve user by role+sub', !!resolvedUser);

// --- book appointment ---
const doc = doctors[0];
// Simulate an on-duty doctor so the appointment joins the live queue.
const Doctor = (await import('../src/models/Doctor.js')).default;
await Doctor.updateOne({ _id: doc._id }, { $set: { isAvailable: true, isPresent: true } });
const booked = await appointmentService.bookAppointment({
  patientId,
  departmentId: card._id.toString(),
  doctorId: doc._id.toString(),
  date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  startTime: '10:00',
  reason: 'Chest discomfort',
  symptoms: 'Occasional pain on exertion',
  aiSuggestionAccepted: false,
});
check('Appointment booked with populated doctor', !!booked.doctor && booked.doctor.name.includes('Dr.'));
check('Appointment has AI recommendation', !!booked.aiRecommendation);
check('Appointment starts at 10:00 (kept original)', booked.startTime === '10:00');

// --- list appointments ---
const list = await appointmentService.listPatientAppointments(patientId);
check(`Patient appointments listed (${list.length})`, list.length >= 1);

// --- queue status ---
const qs = await queueReadService.getDoctorQueueSnapshot(doc._id, new Date().toISOString().slice(0, 10));
check('Queue snapshot has doctor', !!qs.doctor);
const myInfo = await queueReadService.getPatientQueueInfo(patientId, doc._id);
check('Patient queue info present', !!myInfo && myInfo.position >= 1);

// --- notifications created on booking ---
const notifCount = await Notification.countDocuments({ recipient: patientId });
check(`Notification created (${notifCount})`, notifCount >= 1);

// --- profile ---
const profile = await patientService.getProfile(patientId);
check('Profile retrieved with stats', !!profile.profile && typeof profile.stats.total === 'number');
const updated = await patientService.updateProfile(patientId, { bloodGroup: 'A+', phone: '+91 90000 12345' });
check('Profile updated bloodGroup/phone', updated.bloodGroup === 'A+' && updated.phone === '+91 90000 12345');

// --- cancel ---
const cancelled = await appointmentService.cancelAppointment(patientId, booked._id.toString(), 'Changed plans');
check('Appointment cancelled', cancelled.status === 'cancelled');

// --- video session ---
const fresh = await appointmentService.bookAppointment({
  patientId,
  departmentId: card._id.toString(),
  doctorId: doc._id.toString(),
  date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  startTime: '11:00',
  aiSuggestionAccepted: false,
});
const session = await videoService.getOrCreateForAppointment(patientId, fresh._id.toString());
check('Video session created', !!session && session.status === 'waiting');
await videoService.startSession(session._id.toString());
const started = await VideoSessionStatus(session._id.toString());
check('Video session started (active)', started === 'active');
await videoService.sendMessage(session._id.toString(), 'patient', 'Hello doctor');
const withMsg = await videoService.getOrCreateForAppointment(patientId, fresh._id.toString());
check('Chat message stored', withMsg.messages.length >= 1);
await videoService.endSession(session._id.toString());
const ended = await VideoSessionStatus(session._id.toString());
check('Video session ended', ended === 'ended');

async function VideoSessionStatus(id) {
  const V = (await import('../src/models/VideoConsultation.js')).default;
  const s = await V.findById(id).exec();
  return s.status;
}

await disconnectDB();
await mongod.stop();
console.log(`\nM2 SMOKE TEST RESULT: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

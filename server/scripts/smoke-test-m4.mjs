/**
 * JIVA Milestone 4 smoke test — Admin Module + Emergency Response Center.
 *   - admin login
 *   - dashboard metrics
 *   - create/list/update/delete a doctor
 *   - create/list/update a patient
 *   - update an appointment status
 *   - analytics (daily/department/hourly)
 *   - emergency: create, dispatch ambulance, alert hospital, notify contact,
 *     share location, emergency mode, command center
 *
 * Usage: node scripts/smoke-test-m4.mjs
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import { spawn } from 'node:child_process';

let passed = 0, failed = 0;
const check = (name, cond) => {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.error(`  \u2717 ${name}`); }
};

const mongod = await MongoMemoryServer.create();
process.env.MONGO_URI = mongod.getUri('jiva_m4');
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

const { authService } = await import('../src/services/auth.service.js');
const { adminService } = await import('../src/services/admin.service.js');
const { emergencyService } = await import('../src/services/emergency.service.js');
const Department = (await import('../src/models/Department.js')).default;
const Appointment = (await import('../src/models/Appointment.js')).default;
const Patient = (await import('../src/models/Patient.js')).default;

// Admin login
const admin = await authService.login({ role: 'admin', identifier: 'admin@jiva.ai', password: 'admin123' });
check('Admin login works', admin.user.toJSON().role === 'admin');

// Dashboard
const dash = await adminService.getDashboard();
check('Dashboard has metrics', dash.metrics.totalDoctors === 8);
check('Dashboard has doctorsOnline field', typeof dash.metrics.doctorsOnline === 'number');

// Create doctor
const dept = await Department.findOne({ code: 'NEURO' }).exec();
const newDoc = await adminService.createDoctor({
  name: 'Dr. Test Doctor',
  staffId: 'DOC2001',
  email: 'test.doc@jiva.ai',
  departmentId: dept._id.toString(),
  specialty: 'Neurology',
});
check('Doctor created', newDoc.staffId === 'DOC2001');
const newDocId = newDoc._id.toString();

// Update doctor
const updated = await adminService.updateDoctor(newDocId, { specialty: 'Neuro-Surgery', avgConsultationMinutes: 20 });
check('Doctor updated', updated.specialty === 'Neuro-Surgery');

// List + search
const search = await adminService.listDoctors({ search: 'DOC2001' });
check('Doctor search works', search.length === 1);

// Doctor detail (presence logs + schedule)
const detail = await adminService.getDoctorDetail(newDocId);
check('Doctor detail returns presenceLogs + schedule', Array.isArray(detail.presenceLogs) && Array.isArray(detail.schedule));

// Create patient
const newPat = await adminService.createPatient({
  name: 'Admin Created Patient',
  email: 'admin.patient@jiva.ai',
  phone: '+91 99999 88888',
  age: 45,
});
check('Patient created', newPat.email === 'admin.patient@jiva.ai');
const newPatId = newPat._id.toString();

// Update patient
const patUpd = await adminService.updatePatient(newPatId, { bloodGroup: 'O+' });
check('Patient updated', patUpd.bloodGroup === 'O+');

// Appointment management — book an appointment then admin reschedules
const patient = await authService.login({ role: 'patient', identifier: 'rahul@jiva.ai', password: 'patient123' });
const { appointmentService } = await import('../src/services/appointment.service.js');
const doc = await adminService.listDoctors();
const docId = doc[0]._id.toString();
const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const apt = await appointmentService.bookAppointment({
  patientId: patient.user._id.toString(),
  departmentId: dept._id.toString(),
  doctorId: docId,
  date,
  startTime: '09:00',
  aiSuggestionAccepted: false,
});
const apptList = await adminService.listAppointments({});
check('Admin lists appointments', apptList.length >= 1);
const resched = await adminService.updateAppointmentStatus(apt._id.toString(), { status: 'rescheduled', startTime: '11:30' });
check('Admin rescheduled appointment', resched.status === 'rescheduled' && resched.startTime === '11:30');

// Analytics
const analytics = await adminService.getAnalytics();
check('Analytics has daily series', Array.isArray(analytics.daily) && analytics.daily.length === 7);
check('Analytics has department distribution', Array.isArray(analytics.departmentDistribution));

// Emergency flow
const emergency = await emergencyService.createEmergency({
  patientId: patient.user._id.toString(),
  description: 'Severe chest pain',
  severity: 'critical',
  departmentId: dept._id.toString(),
});
check('Emergency case created', emergency.status === 'new' && emergency.severity === 'critical');
const emId = emergency._id.toString();

const dispatched = await emergencyService.dispatchAmbulance(emId);
check('Ambulance dispatched', dispatched.ambulanceDispatched === true && dispatched.ambulance.etaMinutes > 0);

const alerted = await emergencyService.alertHospital(emId);
check('Hospital alerted', alerted.hospitalAlerted === true);

const contact = await emergencyService.notifyEmergencyContact(emId);
check('Emergency contact notified', contact.emergencyContactNotified === true);

const located = await emergencyService.shareLocation(emId, { lat: 23.0, lng: 72.5, address: 'Sector 15, Ahmedabad' });
check('Location shared', located.locationShared === true);

const cmd = await emergencyService.getCommandCenter();
check('Command center has active case', cmd.activeCases >= 1);

const closed = await emergencyService.updateStatus(emId, 'treated');
check('Emergency marked treated', closed.status === 'treated');

const mode = await emergencyService.activateEmergencyMode();
check('Emergency mode activated', mode.active === true);

await disconnectDB();
await mongod.stop();
console.log(`\nM4 SMOKE TEST RESULT: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

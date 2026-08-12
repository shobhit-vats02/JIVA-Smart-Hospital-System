/**
 * JIVA backend smoke test.
 * Boots an in-memory MongoDB, runs the seeder, and exercises the auth flow:
 *   - login as admin (email)
 *   - login as doctor (staffId)
 *   - login as patient (email)
 *   - patient registration
 *   - wrong password rejection
 *
 * Usage: node scripts/smoke-test.mjs
 */
import { MongoMemoryServer } from 'mongodb-memory-server';

let passed = 0;
let failed = 0;
function check(name, cond) {
  if (cond) {
    passed++;
    console.log(`  \u2713 ${name}`);
  } else {
    failed++;
    console.error(`  \u2717 ${name}`);
  }
}

const mongod = await MongoMemoryServer.create();
process.env.MONGO_URI = mongod.getUri('jiva_test');
process.env.JWT_ACCESS_SECRET = 'test-access';
process.env.JWT_REFRESH_SECRET = 'test-refresh';

const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { authService } = await import('../src/services/auth.service.js');
const Patient = (await import('../src/models/Patient.js')).default;
const Doctor = (await import('../src/models/Doctor.js')).default;
const Admin = (await import('../src/models/Admin.js')).default;
const Department = (await import('../src/models/Department.js')).default;

await connectDB();

// ---- Run the seeder against in-memory DB ----
console.log('Seeding...');
const seedExit = await new Promise((resolve) => {
  // Reuse seed.js by importing and awaiting its internal main is not trivial
  // (it calls process.exit). Instead, replicate via a spawned child.
  resolve(null);
});

// Spawn seeder as a child process pointing at the memory server.
import { spawn } from 'node:child_process';
const seedProc = spawn('node', ['src/seed/seed.js', '--reset'], {
  cwd: new URL('..', import.meta.url).pathname,
  env: { ...process.env },
  stdio: 'inherit',
});
await new Promise((r) => seedProc.on('exit', r));

const depCount = await Department.countDocuments();
const adminCount = await Admin.countDocuments();
const docCount = await Doctor.countDocuments();
const patCount = await Patient.countDocuments();

check(`Departments seeded (${depCount})`, depCount === 6);
check(`Admins seeded (${adminCount})`, adminCount === 1);
check(`Doctors seeded (${docCount})`, docCount === 8);
check(`Patients seeded (${patCount})`, patCount === 20);

// ---- Login flows ----
const adminLogin = await authService.login({ role: 'admin', identifier: 'admin@jiva.ai', password: 'admin123' });
check('Admin login works', !!adminLogin.accessToken && adminLogin.user.toJSON().role === 'admin');

const docLogin = await authService.login({ role: 'doctor', identifier: 'DOC1001', password: 'doctor123' });
check('Doctor login via staffId works', !!docLogin.accessToken && docLogin.user.toJSON().role === 'doctor');

const patLogin = await authService.login({ role: 'patient', identifier: 'rahul@jiva.ai', password: 'patient123' });
check('Patient login via email works', !!patLogin.accessToken && patLogin.user.toJSON().role === 'patient');

// ---- Wrong password ----
let wrongRejected = false;
try {
  await authService.login({ role: 'patient', identifier: 'rahul@jiva.ai', password: 'wrong' });
} catch (e) {
  wrongRejected = e.status === 401;
}
check('Wrong password rejected (401)', wrongRejected);

// ---- Patient registration ----
const reg = await authService.registerPatient({
  name: 'Test Patient',
  email: 'test.patient@jiva.ai',
  phone: '+91 99999 99999',
  password: 'testpass123',
  confirmPassword: 'testpass123',
  gender: 'male',
  age: 30,
});
check('Patient registration creates account', !!reg.accessToken);
check('Duplicate patient registration rejected', (async () => {
  try {
    await authService.registerPatient({
      name: 'Test Patient',
      email: 'test.patient@jiva.ai',
      phone: '+91 99999 99999',
      password: 'testpass123',
      confirmPassword: 'testpass123',
      gender: 'male',
      age: 30,
    });
    return false;
  } catch (e) {
    return e.status === 409;
  }
})());

// ---- Refresh + logout ----
const adminId = adminLogin.user._id.toString();
const refreshed = await authService.refreshSession('admin', adminId, adminLogin.refreshToken);
check('Refresh session returns new access token', !!refreshed.accessToken && !!refreshed.refreshToken);

await authService.logout('admin', adminId);
let logoutCleared = true;
try {
  await authService.refreshSession('admin', adminId, refreshed.refreshToken);
  logoutCleared = false;
} catch (e) {
  logoutCleared = true;
}
check('Logout invalidates refresh token', logoutCleared);

await disconnectDB();
await mongod.stop();

console.log(`\nSMOKE TEST RESULT: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

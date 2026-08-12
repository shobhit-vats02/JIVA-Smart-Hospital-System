import { env } from '../config/env.js';

/**
 * Demo / seed data for JIVA.
 * All credentials are safe for local development and demos.
 *
 * Doctors log in with their staffId + password.
 * Patients and Admin log in with email + password.
 */

export const DEPARTMENTS = [
  { name: 'Cardiology', code: 'CARD', wing: 'Main Campus' },
  { name: 'Neurology', code: 'NEURO', wing: 'Main Campus' },
  { name: 'Orthopedics', code: 'ORTHO', wing: 'South Wing' },
  { name: 'Pediatrics', code: 'PEDIA', wing: 'Main Campus' },
  { name: 'Dermatology', code: 'DERMA', wing: 'East Wing' },
  { name: 'General Medicine', code: 'GENERAL', wing: 'Main Campus' },
];

export const ADMINS = [
  {
    name: 'JIVA Hospital Administrator',
    email: env.seedAdminEmail, // admin@jiva.ai
    password: env.seedAdminPassword, // admin123
    phone: '+91 90000 00000',
  },
];

export const DOCTORS = [
  {
    staffId: 'DOC1001',
    name: 'Dr. Priya Sharma',
    email: 'priya.sharma@jiva.ai',
    phone: '+91 90001 10001',
    password: 'doctor123',
    departmentCode: 'CARD',
    specialty: 'Cardiology',
    qualification: 'MD, DM (Cardiology)',
    yearsOfExperience: 15,
    rating: 4.9,
    avgConsultationMinutes: 18,
    rfidTag: 'RFID-CARD-1001',
  },
  {
    staffId: 'DOC1002',
    name: 'Dr. Rajesh Kumar',
    email: 'rajesh.kumar@jiva.ai',
    phone: '+91 90001 10002',
    password: 'doctor123',
    departmentCode: 'NEURO',
    specialty: 'Neurology',
    qualification: 'MD, DM (Neurology)',
    yearsOfExperience: 12,
    rating: 4.8,
    avgConsultationMinutes: 22,
    rfidTag: 'RFID-NEURO-1002',
  },
  {
    staffId: 'DOC1003',
    name: 'Dr. Anita Desai',
    email: 'anita.desai@jiva.ai',
    phone: '+91 90001 10003',
    password: 'doctor123',
    departmentCode: 'ORTHO',
    specialty: 'Orthopedics',
    qualification: 'MS (Orthopedics)',
    yearsOfExperience: 10,
    rating: 4.7,
    avgConsultationMinutes: 20,
    rfidTag: 'RFID-ORTHO-1003',
  },
  {
    staffId: 'DOC1004',
    name: 'Dr. Vikram Singh',
    email: 'vikram.singh@jiva.ai',
    phone: '+91 90001 10004',
    password: 'doctor123',
    departmentCode: 'PEDIA',
    specialty: 'Pediatrics',
    qualification: 'MD (Pediatrics)',
    yearsOfExperience: 18,
    rating: 4.9,
    avgConsultationMinutes: 15,
    rfidTag: 'RFID-PEDIA-1004',
  },
  {
    staffId: 'DOC1005',
    name: 'Dr. Meera Patel',
    email: 'meera.patel@jiva.ai',
    phone: '+91 90001 10005',
    password: 'doctor123',
    departmentCode: 'DERMA',
    specialty: 'Dermatology',
    qualification: 'MD (Dermatology)',
    yearsOfExperience: 8,
    rating: 4.6,
    avgConsultationMinutes: 12,
    rfidTag: 'RFID-DERMA-1005',
  },
  {
    staffId: 'DOC1006',
    name: 'Dr. Arjun Nair',
    email: 'arjun.nair@jiva.ai',
    phone: '+91 90001 10006',
    password: 'doctor123',
    departmentCode: 'GENERAL',
    specialty: 'General Medicine',
    qualification: 'MD (Internal Medicine)',
    yearsOfExperience: 20,
    rating: 4.8,
    avgConsultationMinutes: 10,
    rfidTag: 'RFID-GENERAL-1006',
  },
  {
    staffId: 'DOC1007',
    name: 'Dr. Kavya Menon',
    email: 'kavya.menon@jiva.ai',
    phone: '+91 90001 10007',
    password: 'doctor123',
    departmentCode: 'CARD',
    specialty: 'Interventional Cardiology',
    qualification: 'MD, DM (Cardiology)',
    yearsOfExperience: 11,
    rating: 4.7,
    avgConsultationMinutes: 20,
    rfidTag: 'RFID-CARD-1007',
  },
  {
    staffId: 'DOC1008',
    name: 'Dr. Rahul Kapoor',
    email: 'rahul.kapoor@jiva.ai',
    phone: '+91 90001 10008',
    password: 'doctor123',
    departmentCode: 'NEURO',
    specialty: 'Neurosurgery',
    qualification: 'MCh (Neurosurgery)',
    yearsOfExperience: 16,
    rating: 4.9,
    avgConsultationMinutes: 25,
    rfidTag: 'RFID-NEURO-1008',
  },
];

export const PATIENTS = [
  { name: 'Rahul Verma', email: 'rahul@jiva.ai', password: 'patient123', phone: '+91 90002 10001', gender: 'male', age: 34, bloodGroup: 'B+', address: '12, Gandhi Nagar, Ahmedabad' },
  { name: 'Sneha Iyer', email: 'sneha@jiva.ai', password: 'patient123', phone: '+91 90002 10002', gender: 'female', age: 28, bloodGroup: 'O+', address: '4, Marine Drive, Mumbai' },
  { name: 'Amit Joshi', email: 'amit@jiva.ai', password: 'patient123', phone: '+91 90002 10003', gender: 'male', age: 41, bloodGroup: 'A+', address: '88, MG Road, Pune' },
  { name: 'Fatima Khan', email: 'fatima@jiva.ai', password: 'patient123', phone: '+91 90002 10004', gender: 'female', age: 52, bloodGroup: 'AB+', address: '21, Park Street, Kolkata' },
  { name: 'Deepak Rao', email: 'deepak@jiva.ai', password: 'patient123', phone: '+91 90002 10005', gender: 'male', age: 37, bloodGroup: 'O-', address: '3, Residency Road, Bengaluru' },
  { name: 'Kavita Nair', email: 'kavita@jiva.ai', password: 'patient123', phone: '+91 90002 10006', gender: 'female', age: 45, bloodGroup: 'B-', address: '9, Boat Club Road, Chennai' },
  { name: 'Rohan Gupta', email: 'rohan@jiva.ai', password: 'patient123', phone: '+91 90002 10007', gender: 'male', age: 24, bloodGroup: 'A-', address: '45, Connaught Place, New Delhi' },
  { name: 'Pooja Reddy', email: 'pooja@jiva.ai', password: 'patient123', phone: '+91 90002 10008', gender: 'female', age: 31, bloodGroup: 'AB-', address: '16, Jubilee Hills, Hyderabad' },
  { name: 'Vikram Mehta', email: 'vikram@jiva.ai', password: 'patient123', phone: '+91 90002 10009', gender: 'male', age: 60, bloodGroup: 'O+', address: '7, Civil Lines, Jaipur' },
  { name: 'Ananya Bose', email: 'ananya@jiva.ai', password: 'patient123', phone: '+91 90002 10010', gender: 'female', age: 22, bloodGroup: 'B+', address: '33, Salt Lake, Kolkata' },
  { name: 'Karan Malhotra', email: 'karan@jiva.ai', password: 'patient123', phone: '+91 90002 10011', gender: 'male', age: 39, bloodGroup: 'A+', address: '5, Linking Road, Mumbai' },
  { name: 'Ishita Roy', email: 'ishita@jiva.ai', password: 'patient123', phone: '+91 90002 10012', gender: 'female', age: 27, bloodGroup: 'O+', address: '12, Park Street, Kolkata' },
  { name: 'Mohammed Irfan', email: 'mohammed@jiva.ai', password: 'patient123', phone: '+91 90002 10013', gender: 'male', age: 48, bloodGroup: 'B+', address: '8, Charminar Road, Hyderabad' },
  { name: 'Divya Sharma', email: 'divya@jiva.ai', password: 'patient123', phone: '+91 90002 10014', gender: 'female', age: 33, bloodGroup: 'AB+', address: '22, CP, New Delhi' },
  { name: 'Rajat Sinha', email: 'rajat@jiva.ai', password: 'patient123', phone: '+91 90002 10015', gender: 'male', age: 55, bloodGroup: 'O-', address: '3, Sector 17, Chandigarh' },
  { name: 'Neha Jain', email: 'neha@jiva.ai', password: 'patient123', phone: '+91 90002 10016', gender: 'female', age: 30, bloodGroup: 'A-', address: '14, MG Road, Indore' },
  { name: 'Suresh Iyer', email: 'suresh@jiva.ai', password: 'patient123', phone: '+91 90002 10017', gender: 'male', age: 63, bloodGroup: 'B+', address: '9, T Nagar, Chennai' },
  { name: 'Aisha Khan', email: 'aisha@jiva.ai', password: 'patient123', phone: '+91 90002 10018', gender: 'female', age: 25, bloodGroup: 'O+', address: '18, Hazratganj, Lucknow' },
  { name: 'Gaurav Patel', email: 'gaurav@jiva.ai', password: 'patient123', phone: '+91 90002 10019', gender: 'male', age: 44, bloodGroup: 'A+', address: '27, SG Highway, Ahmedabad' },
  { name: 'Meghna Das', email: 'meghna@jiva.ai', password: 'patient123', phone: '+91 90002 10020', gender: 'female', age: 36, bloodGroup: 'AB-', address: '6, Salt Lake, Kolkata' },
];

// Enrich each patient with a realistic health profile + emergency contact so
// the Health Pass feature has data to show.
const ALLERGIES_POOL = ['Penicillin', 'Latex', 'Peanuts', 'Dust', 'Pollen', 'None'];
const CONDITIONS_POOL = ['Hypertension', 'Type 2 Diabetes', 'Asthma', 'Migraine', 'None'];
const VAX_POOL = ['COVID-19', 'Hepatitis B', 'Influenza', 'Tetanus'];

PATIENTS.forEach((p, i) => {
  p.medicalHistory = p.medicalHistory || ['Routine check-up', 'Annual physical'];
  p.healthProfile = {
    allergies: i % 3 === 0 ? [ALLERGIES_POOL[i % ALLERGIES_POOL.length]] : [],
    conditions: i % 4 === 0 ? [CONDITIONS_POOL[i % CONDITIONS_POOL.length]] : [],
    vaccinations: VAX_POOL.slice(0, 1 + (i % 3)),
  };
  p.emergencyContact = p.emergencyContact || {
    name: `${p.name.split(' ')[0]} Family`,
    phone: '+91 90000 99999',
    relation: 'Family',
  };
});

export const DEMO_CREDENTIALS = {
  admin: [
    { label: 'Hospital Administrator', email: env.seedAdminEmail, password: env.seedAdminPassword, login: 'Email' },
  ],
  doctor: DOCTORS.map((d) => ({
    label: d.name,
    staffId: d.staffId,
    password: d.password,
    login: 'Staff ID',
  })),
  patient: PATIENTS.map((p) => ({
    label: p.name,
    email: p.email,
    password: p.password,
    login: 'Email',
  })),
};

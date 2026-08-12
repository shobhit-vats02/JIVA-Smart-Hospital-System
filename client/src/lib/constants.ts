import {
  HeartPulse,
  Stethoscope,
  ShieldCheck,
  UserRound,
  Video,
  Activity,
} from 'lucide-react';

/** Role metadata used across login, navigation, and route guards. */
export const ROLES = {
  patient: {
    label: 'Patient',
    description: 'Book appointments, track queues, and consult doctors online.',
    icon: UserRound,
    loginLabel: 'Email',
    loginPlaceholder: 'you@example.com',
  },
  doctor: {
    label: 'Doctor',
    description: 'Manage your schedule, consultations, and presence verification.',
    icon: Stethoscope,
    loginLabel: 'Staff ID',
    loginPlaceholder: 'DOC1001',
  },
  admin: {
    label: 'Administrator',
    description: 'Oversee hospital operations, staff, and emergency response.',
    icon: ShieldCheck,
    loginLabel: 'Email',
    loginPlaceholder: 'admin@jiva.ai',
  },
} as const;

export type Role = keyof typeof ROLES;

/** Departments surfaced in the booking flow / displays. */
export const DEPARTMENTS = [
  { name: 'Cardiology', code: 'CARD', description: 'Heart & vascular care', icon: HeartPulse },
  { name: 'Neurology', code: 'NEURO', description: 'Brain & nervous system', icon: Activity },
  { name: 'Orthopedics', code: 'ORTHO', description: 'Bones, joints & spine', icon: Activity },
  { name: 'Pediatrics', code: 'PEDIA', description: 'Child healthcare', icon: Stethoscope },
  { name: 'Dermatology', code: 'DERMA', description: 'Skin & hair', icon: Video },
  { name: 'General Medicine', code: 'GENERAL', description: 'Internal medicine', icon: Activity },
] as const;

/** Demo credentials shown on the login screen. */
export const DEMO_CREDENTIALS = {
  admin: [{ label: 'Hospital Administrator', email: 'admin@jiva.ai', password: 'admin123' }],
  doctor: [
    { label: 'Dr. Priya Sharma', staffId: 'DOC1001', password: 'doctor123' },
    { label: 'Dr. Rajesh Kumar', staffId: 'DOC1002', password: 'doctor123' },
    { label: 'Dr. Anita Desai', staffId: 'DOC1003', password: 'doctor123' },
    { label: 'Dr. Vikram Singh', staffId: 'DOC1004', password: 'doctor123' },
    { label: 'Dr. Meera Patel', staffId: 'DOC1005', password: 'doctor123' },
  ],
  patient: [
    { label: 'Rahul Verma', email: 'rahul@jiva.ai', password: 'patient123' },
    { label: 'Sneha Iyer', email: 'sneha@jiva.ai', password: 'patient123' },
    { label: 'Amit Joshi', email: 'amit@jiva.ai', password: 'patient123' },
  ],
} as const;

export const APP_NAME = 'JIVA';
export const APP_TAGLINE = 'AI Powered Smart Healthcare Platform';

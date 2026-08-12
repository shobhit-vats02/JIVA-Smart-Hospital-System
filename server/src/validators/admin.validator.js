import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('A valid email is required');

export const createDoctorSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  staffId: z.string().min(3, 'Staff ID is required'),
  email,
  phone: z.string().optional().default(''),
  password: z.string().min(8).optional().default('doctor123'),
  departmentId: z.string().optional(),
  specialty: z.string().optional().default(''),
  qualification: z.string().optional().default(''),
  yearsOfExperience: z.coerce.number().min(0).optional().default(0),
  avgConsultationMinutes: z.coerce.number().min(1).optional().default(12),
  rfidTag: z.string().optional().default(''),
});

export const updateDoctorSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  specialty: z.string().optional(),
  qualification: z.string().optional(),
  yearsOfExperience: z.coerce.number().optional(),
  avgConsultationMinutes: z.coerce.number().optional(),
  departmentId: z.string().optional(),
  rfidTag: z.string().optional(),
  isActive: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  isPresent: z.boolean().optional(),
});

export const createPatientSchema = z.object({
  name: z.string().min(2),
  email,
  phone: z.string().min(7),
  password: z.string().min(8).optional().default('patient123'),
  gender: z.enum(['male', 'female', 'other']).optional(),
  age: z.coerce.number().int().min(0).max(150).optional(),
  bloodGroup: z.string().optional().default(''),
  address: z.string().optional().default(''),
  emergencyContact: z
    .object({ name: z.string().optional(), phone: z.string().optional(), relation: z.string().optional() })
    .optional(),
});

export const updatePatientSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  age: z.coerce.number().optional(),
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.object({ name: z.string().optional(), phone: z.string().optional(), relation: z.string().optional() }).optional(),
  medicalHistory: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const updateAppointmentSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'waiting', 'in_consultation', 'completed', 'cancelled', 'rescheduled', 'emergency']).optional(),
  doctorId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  isEmergency: z.boolean().optional(),
});

export const createEmergencySchema = z.object({
  patientId: z.string().optional(),
  patientName: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  emergencyContactName: z.string().optional().default(''),
  emergencyContactPhone: z.string().optional().default(''),
  description: z.string().optional().default(''),
  departmentId: z.string().optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low']).optional().default('high'),
  location: z.object({ lat: z.number().optional(), lng: z.number().optional(), address: z.string().optional() }).optional(),
});

export const updateEmergencySchema = z.object({
  status: z.enum(['new', 'dispatched', 'responding', 'at_hospital', 'treated', 'closed']),
});

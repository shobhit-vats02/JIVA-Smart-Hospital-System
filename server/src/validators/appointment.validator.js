import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:mm');

export const bookAppointmentSchema = z.object({
  departmentId: z.string().min(1, 'Department is required'),
  doctorId: z.string().min(1, 'Doctor is required'),
  date: dateSchema,
  startTime: timeSchema,
  reason: z.string().optional().default(''),
  symptoms: z.string().optional().default(''),
  isEmergency: z.boolean().optional().default(false),
  aiSuggestionAccepted: z.boolean().optional().default(false),
});

export const cancelAppointmentSchema = z.object({
  reason: z.string().optional().default(''),
});

export const listAppointmentsSchema = z.object({
  status: z
    .enum(['all', 'upcoming', 'completed', 'cancelled', 'rescheduled', 'emergency'])
    .optional()
    .default('all'),
});

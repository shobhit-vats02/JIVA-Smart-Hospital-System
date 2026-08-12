import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('A valid email is required');
const password = z.string().min(8, 'Password must be at least 8 characters');

export const loginSchema = z.object({
  role: z.enum(['patient', 'doctor', 'admin'], {
    errorMap: () => ({ message: 'Role must be patient, doctor or admin' }),
  }),
  // Patients/admins use email; doctors use staffId. A single flexible field.
  identifier: z.string().trim().min(1, 'Identifier is required'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional().default(false),
});

export const patientRegisterSchema = z.object({
  name: z.string().trim().min(2, 'Full name is required'),
  email,
  phone: z.string().trim().min(7, 'A valid phone number is required'),
  password,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  gender: z.enum(['male', 'female', 'other']),
  age: z.coerce.number().int().min(0).max(150).optional(),
  bloodGroup: z
    .enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''])
    .optional()
    .default(''),
  address: z.string().trim().optional().default(''),
  emergencyContact: z
    .object({
      name: z.string().trim().optional().default(''),
      phone: z.string().trim().optional().default(''),
      relation: z.string().trim().optional().default(''),
    })
    .optional()
    .default({}),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      path: ['confirmPassword'],
      message: 'Passwords do not match',
    });
  }
});

export const refreshTokenSchema = z.object({
  role: z.enum(['patient', 'doctor', 'admin']),
  id: z.string().min(1, 'id is required'),
  // The refresh token normally arrives via the HttpOnly cookie; a body token is
  // only a fallback for non-browser clients, so it is optional.
  refreshToken: z.string().optional(),
});

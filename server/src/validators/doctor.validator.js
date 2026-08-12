import { z } from 'zod';

export const verifyFaceSchema = z.object({
  score: z.number().min(0).max(1).optional().default(0.98),
});

export const verifyRfidSchema = z.object({
  cardId: z.string().min(1, 'RFID card ID is required'),
});

export const verifyBluetoothSchema = z.object({
  device: z.string().min(1, 'Device is required'),
});

export const verifyWifiSchema = z.object({
  ssid: z.string().min(1, 'SSID is required'),
});

export const verifyGpsSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export const prescriptionSchema = z.object({
  medicines: z
    .array(
      z.object({
        name: z.string().min(1),
        dosage: z.string().optional().default(''),
        frequency: z.string().optional().default(''),
        duration: z.string().optional().default(''),
        instructions: z.string().optional().default(''),
      })
    )
    .optional()
    .default([]),
  notes: z.string().optional().default(''),
});

/**
 * Schema for a standalone prescription created directly from the doctor's
 * Prescriptions page (doctor selects a patient — not tied to a consultation).
 */
export const createPrescriptionSchema = z.object({
  patientId: z.string().min(1, 'Select a patient'),
  medicines: z
    .array(
      z
        .object({
          name: z.string().min(1, 'Medicine name is required'),
          dosage: z.string().optional().default(''),
          frequency: z.string().optional().default(''),
          duration: z.string().optional().default(''),
          instructions: z.string().optional().default(''),
        })
        .refine((m) => m.name.trim().length > 0, { message: 'Medicine name is required' })
    )
    .min(1, 'Add at least one medicine'),
  notes: z.string().optional().default(''),
});

export const completeConsultationSchema = z.object({
  notes: z.string().optional().default(''),
});

export const startConsultationSchema = z.object({
  appointmentId: z.string().min(1),
});

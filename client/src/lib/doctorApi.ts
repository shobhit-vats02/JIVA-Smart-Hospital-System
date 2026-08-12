import { api } from './api';
import type {
  Appointment,
  DoctorDashboardData,
  PresenceLog,
  PresenceMethodResult,
  PresenceState,
  ConfidenceResult,
  PatientHistoryResult,
  Prescription,
  PrescriptionRecord,
  MedicineItem,
} from '@/types';

/** All doctor module API calls. */
export const doctorApi = {
  // Dashboard & schedule
  getDashboard: () => api<DoctorDashboardData>('/doctor/dashboard'),
  getSchedule: (date?: string) => api<Appointment[]>(`/doctor/schedule${date ? `?date=${date}` : ''}`),
  getAppointment: (id: string) => api<Appointment>(`/doctor/appointments/${id}`),

  // Consultation
  startConsultation: (appointmentId: string) =>
    api<Appointment>('/doctor/consultation/start', { method: 'POST', body: JSON.stringify({ appointmentId }) }),
  completeConsultation: (id: string, notes?: string) =>
    api<Appointment>(`/doctor/appointments/${id}/complete`, { method: 'POST', body: JSON.stringify({ notes }) }),
  savePrescription: (id: string, prescription: Prescription) =>
    api<Prescription>(`/doctor/appointments/${id}/prescription`, { method: 'POST', body: JSON.stringify(prescription) }),
  getPatientHistory: (patientId: string) => api<PatientHistoryResult>(`/doctor/patients/${patientId}/history`),
  getPrescriptions: () => api<PrescriptionRecord[]>('/doctor/prescriptions'),
  createPrescription: (payload: { patientId: string; medicines: MedicineItem[]; notes?: string }) =>
    api<PrescriptionRecord>('/doctor/prescriptions', { method: 'POST', body: JSON.stringify(payload) }),
  listPatients: (search?: string) =>
    api<{ id: string; name: string; email: string; phone: string; gender?: string; age?: number; bloodGroup?: string }[]>(
      `/doctor/patients${search ? `?search=${encodeURIComponent(search)}` : ''}`
    ),

  // Presence
  getPresenceState: () => api<PresenceState>('/doctor/presence'),
  getPresenceLogs: () => api<PresenceLog[]>('/doctor/presence/logs'),
  verifyFace: (score = 0.98) =>
    api<PresenceMethodResult>('/doctor/presence/face', { method: 'POST', body: JSON.stringify({ score }) }),
  verifyRfid: (cardId: string) =>
    api<PresenceMethodResult>('/doctor/presence/rfid', { method: 'POST', body: JSON.stringify({ cardId }) }),
  verifyBluetooth: (device: string) =>
    api<PresenceMethodResult>('/doctor/presence/bluetooth', { method: 'POST', body: JSON.stringify({ device }) }),
  verifyWifi: (ssid: string) =>
    api<PresenceMethodResult>('/doctor/presence/wifi', { method: 'POST', body: JSON.stringify({ ssid }) }),
  verifyGps: (lat: number, lng: number) =>
    api<PresenceMethodResult>('/doctor/presence/gps', { method: 'POST', body: JSON.stringify({ lat, lng }) }),
  runConfidence: () => api<ConfidenceResult>('/doctor/presence/confidence', { method: 'POST' }),
  manualActivate: () => api('/doctor/presence/manual', { method: 'POST' }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api('/doctor/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
};

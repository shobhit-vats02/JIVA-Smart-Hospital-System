import { api } from './api';
import type {
  AdminDashboardData,
  AnalyticsData,
  Appointment,
  CommandCenterData,
  Department,
  DoctorAdmin,
  DoctorSummary,
  EmergencyCase,
  PatientAdmin,
} from '@/types';

/** All admin module API calls. */
export const adminApi = {
  // Dashboard
  getDashboard: () => api<AdminDashboardData>('/admin/dashboard'),
  listDepartments: () => api<Department[]>('/admin/departments'),

  // Doctors
  listDoctors: (params?: { search?: string; departmentId?: string; status?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return api<DoctorAdmin[]>(`/admin/doctors${q ? `?${q}` : ''}`);
  },
  createDoctor: (payload: Record<string, unknown>) =>
    api<DoctorAdmin>('/admin/doctors', { method: 'POST', body: JSON.stringify(payload) }),
  updateDoctor: (id: string, payload: Record<string, unknown>) =>
    api<DoctorAdmin>(`/admin/doctors/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteDoctor: (id: string) => api<null>(`/admin/doctors/${id}`, { method: 'DELETE' }),
  getDoctorDetail: (id: string) => api<{ doctor: DoctorAdmin; presenceLogs: unknown[]; schedule: Appointment[] }>(`/admin/doctors/${id}`),

  // Patients
  listPatients: (search?: string) =>
    api<PatientAdmin[]>(`/admin/patients${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  createPatient: (payload: Record<string, unknown>) =>
    api<PatientAdmin>('/admin/patients', { method: 'POST', body: JSON.stringify(payload) }),
  updatePatient: (id: string, payload: Record<string, unknown>) =>
    api<PatientAdmin>(`/admin/patients/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deletePatient: (id: string) => api<null>(`/admin/patients/${id}`, { method: 'DELETE' }),

  // Appointments
  listAppointments: (params?: { status?: string; date?: string }) => {
    const q = new URLSearchParams((params || {}) as Record<string, string>).toString();
    return api<Appointment[]>(`/admin/appointments${q ? `?${q}` : ''}`);
  },
  updateAppointment: (id: string, payload: Record<string, unknown>) =>
    api<Appointment>(`/admin/appointments/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  // Analytics
  getAnalytics: () => api<AnalyticsData>('/admin/analytics'),

  // Emergency Response Center
  getCommandCenter: () => api<CommandCenterData>('/admin/emergency/command'),
  listEmergencies: (status = 'active') => api<EmergencyCase[]>(`/admin/emergency?status=${status}`),
  createEmergency: (payload: Record<string, unknown>) =>
    api<EmergencyCase>('/admin/emergency', { method: 'POST', body: JSON.stringify(payload) }),
  dispatchAmbulance: (id: string) => api<EmergencyCase>(`/admin/emergency/${id}/dispatch`, { method: 'POST' }),
  alertHospital: (id: string) => api<EmergencyCase>(`/admin/emergency/${id}/alert`, { method: 'POST' }),
  notifyContact: (id: string) => api<EmergencyCase>(`/admin/emergency/${id}/contact`, { method: 'POST' }),
  shareLocation: (id: string, location: Record<string, unknown>) =>
    api<EmergencyCase>(`/admin/emergency/${id}/location`, { method: 'POST', body: JSON.stringify(location) }),
  updateEmergencyStatus: (id: string, status: string) =>
    api<EmergencyCase>(`/admin/emergency/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
  activateEmergencyMode: () => api<{ active: boolean }>('/admin/emergency/mode/activate', { method: 'POST' }),

  // Account
  changePassword: (currentPassword: string, newPassword: string) =>
    api('/admin/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
};

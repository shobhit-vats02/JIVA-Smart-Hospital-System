import { api } from './api';
import type {
  Appointment,
  AIBookingRecommendation,
  Department,
  DoctorSummary,
  EmergencyCase,
  HealthPassData,
  NotificationItem,
  PatientQueueInfo,
  PatientProfile,
  PrescriptionRecord,
  QueueSnapshot,
  VideoSession,
} from '@/types';

/** All patient module API calls. Everything hits the backend + MongoDB. */
export const patientApi = {
  // Departments & doctors for booking
  listDepartments: () => api<Department[]>('/patient/departments'),
  listDoctors: (departmentId?: string) =>
    api<DoctorSummary[]>(`/patient/doctors${departmentId ? `?departmentId=${departmentId}` : ''}`),

  // Appointments
  bookAppointment: (payload: {
    departmentId: string;
    doctorId: string;
    date: string;
    startTime: string;
    reason?: string;
    symptoms?: string;
    isEmergency?: boolean;
    aiSuggestionAccepted?: boolean;
  }) => api<Appointment>('/patient/appointments', { method: 'POST', body: JSON.stringify(payload) }),

  previewRecommendation: (payload: {
    departmentId: string;
    doctorId: string;
    date: string;
    startTime: string;
  }) => api<AIBookingRecommendation>('/patient/appointments/preview', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  listAppointments: (status = 'all') =>
    api<Appointment[]>(`/patient/appointments?status=${status}`),
  getAppointment: (id: string) => api<Appointment>(`/patient/appointments/${id}`),
  cancelAppointment: (id: string, reason?: string) =>
    api<Appointment>(`/patient/appointments/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Queue
  queueStatus: (appointmentId?: string) =>
    api<{ queue: QueueSnapshot; myInfo: PatientQueueInfo | null; appointment: Appointment | null }>(
      `/patient/queue/status${appointmentId ? `?appointmentId=${appointmentId}` : ''}`
    ),

  // Notifications
  listNotifications: () =>
    api<{ notifications: NotificationItem[]; unread: number }>('/patient/notifications'),
  markNotificationRead: (id: string) =>
    api<NotificationItem>(`/patient/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => api<null>('/patient/notifications/read-all', { method: 'POST' }),

  // Profile
  getProfile: () => api<PatientProfile>('/patient/profile'),
  updateProfile: (updates: Record<string, unknown>) =>
    api('/patient/profile', { method: 'PATCH', body: JSON.stringify(updates) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api('/patient/profile/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  // Health pass + prescriptions
  getHealthPass: () => api<HealthPassData>('/patient/health-pass'),
  getPrescriptions: () => api<PrescriptionRecord[]>('/patient/prescriptions'),

  // Emergency
  listEmergencies: () => api<EmergencyCase[]>('/patient/emergency'),
  createEmergency: (payload: Record<string, unknown>) =>
    api<EmergencyCase>('/patient/emergency', { method: 'POST', body: JSON.stringify(payload) }),
  emergencyAction: (id: string, action: 'dispatch' | 'alert' | 'contact') =>
    api<EmergencyCase>(`/patient/emergency/${id}/${action}`, { method: 'POST' }),

  // Video consultation
  createVideoSession: (appointmentId: string) =>
    api<VideoSession>('/patient/video/session', {
      method: 'POST',
      body: JSON.stringify({ appointmentId }),
    }),
  startVideo: (id: string) => api<VideoSession>(`/patient/video/${id}/start`, { method: 'POST' }),
  endVideo: (id: string) => api<VideoSession>(`/patient/video/${id}/end`, { method: 'POST' }),
  sendVideoMessage: (id: string, text: string) =>
    api<VideoSession>(`/patient/video/${id}/message`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
};

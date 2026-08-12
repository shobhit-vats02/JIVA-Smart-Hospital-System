import { api } from './api';
import type { NotificationItem } from '@/types';

/** Role-agnostic notifications (works for patient, doctor, admin). */
export const notificationApi = {
  list: () => api<{ notifications: NotificationItem[]; unread: number }>('/notifications'),
  markRead: (id: string) => api<NotificationItem>(`/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () => api<null>('/notifications/read-all', { method: 'POST' }),
};

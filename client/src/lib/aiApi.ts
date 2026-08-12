import { api } from './api';

/** AI engine status endpoints (admin-only; engine itself is silent/headless). */
export const aiApi = {
  triggerCycle: () => api<Record<string, unknown>>('/ai/cycle', { method: 'POST' }),
  currentPredictions: () =>
    api<Record<string, { waitMinutes: number; patientsAhead: number; confidence: number; status: string }>>('/ai/predictions'),
  history: () =>
    api<
      {
        id: string;
        doctor: { id: string; name: string; staffId: string };
        predictedWaitMinutes: number;
        patientsAhead: number;
        hospitalLoad: number;
        confidence: number;
        createdAt: string;
      }[]
    >('/ai/history'),
  recommendations: () =>
    api<{ id: string; type: string; title: string; message: string; patient?: { id: string; name: string }; createdAt: string }[]>(
      '/ai/recommendations'
    ),
};

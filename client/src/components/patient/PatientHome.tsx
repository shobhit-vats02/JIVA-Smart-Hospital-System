'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  CalendarClock,
  Clock,
  Activity,
  Sparkles,
  BellRing,
  ListOrdered,
  Stethoscope,
  CheckCircle2,
} from 'lucide-react';
import { patientApi } from '@/lib/patientApi';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Spinner';
import { formatDate, formatMinutes } from '@/lib/utils';
import type { Appointment, NotificationItem } from '@/types';

const statusTone: Record<string, 'success' | 'warning' | 'danger' | 'primary' | 'neutral'> = {
  pending: 'warning',
  confirmed: 'primary',
  waiting: 'warning',
  in_consultation: 'success',
  completed: 'neutral',
  cancelled: 'danger',
  emergency: 'danger',
};

export function PatientHome({ onNavigate }: { onNavigate: (id: string) => void }) {
  const { user } = useAuth();

  const { data: apptsData, isLoading: apptsLoading } = useQuery({
    queryKey: ['patient', 'appointments', 'all'],
    queryFn: async () => (await patientApi.listAppointments('all')).data,
  });

  const upcoming = (apptsData || []).find((a: Appointment) =>
    ['pending', 'confirmed', 'waiting', 'in_consultation'].includes(a.status)
  );

  const { data: queueData } = useQuery({
    queryKey: ['patient', 'queue', upcoming?.id],
    queryFn: async () => {
      if (!upcoming?.doctor || typeof upcoming.doctor === 'string') return null;
      return (await patientApi.queueStatus(upcoming.id)).data;
    },
    enabled: !!upcoming,
  });

  const { data: notifData } = useQuery({
    queryKey: ['patient', 'notifications'],
    queryFn: async () => (await patientApi.listNotifications()).data,
  });

  if (apptsLoading) return <PageLoader label="Loading your care status" />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold">
          Hi, <span className="text-gradient">{user?.name?.split(' ')[0]}</span>
        </h2>
        <p className="text-ink-2">Here's when you'll meet your doctor.</p>
      </motion.div>

      {/* Upcoming appointment + doctor status */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {upcoming ? (
            <div className="glass glow-border glass-hover h-full p-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <CalendarClock className="h-4 w-4 text-primary" /> Upcoming Appointment
                </span>
                <Badge tone={statusTone[upcoming.status]} dot>
                  {upcoming.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-royal text-white">
                  <Stethoscope className="h-6 w-6" />
                </span>
                <div className="flex-1">
                  <p className="text-lg font-bold">
                    {typeof upcoming.doctor === 'object' ? upcoming.doctor.name : 'Doctor'}
                  </p>
                  <p className="text-sm text-ink-2">
                    {typeof upcoming.department === 'object' ? upcoming.department.name : 'Department'} ·{' '}
                    {formatDate(upcoming.date)} at {upcoming.startTime}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-ink-2">
                    <span className="flex items-center gap-1.5">
                      <ListOrdered className="h-4 w-4 text-primary" />
                      Queue position: <b className="text-ink">{upcoming.queuePosition || '—'}</b>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-primary" />
                      Est. wait: <b className="text-ink">{formatMinutes(upcoming.estimatedWaitMinutes || 0)}</b>
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onNavigate('queue')}
                className="btn-glass mt-5 w-full rounded-xl px-4 py-2.5 text-sm font-medium"
              >
                View live queue status
              </button>
            </div>
          ) : (
            <div className="glass flex h-full flex-col items-center justify-center p-8 text-center">
              <Sparkles className="mb-3 h-8 w-8 text-primary" />
              <p className="font-semibold">No upcoming appointment</p>
              <p className="mt-1 text-sm text-ink-2">Book one to see your queue position and wait time.</p>
              <button
                onClick={() => onNavigate('book')}
                className="btn-primary mt-4 rounded-xl px-5 py-2.5 text-sm font-medium"
              >
                Book Appointment
              </button>
            </div>
          )}
        </div>

        {/* Hospital live status */}
        <div className="glass p-6">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-primary" /> Hospital Live Status
          </p>
          <div className="space-y-3 text-sm">
            {[
              { label: 'Overall load', value: 'Medium', tone: 'text-amber-500' },
              { label: 'Doctors on duty', value: '18', tone: 'text-emerald-500' },
              { label: 'Patients waiting', value: '24', tone: 'text-primary' },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between rounded-xl bg-primary-soft/40 px-3 py-2.5">
                <span className="text-ink-2">{s.label}</span>
                <b className={s.tone}>{s.value}</b>
              </div>
            ))}
            <div className="h-2 w-full overflow-hidden rounded-full bg-primary-soft">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-violet"
                initial={{ width: 0 }}
                animate={{ width: '58%' }}
                transition={{ duration: 1 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* AI recommendation */}
      {queueData?.myInfo && (
        <div className="glass glow-border flex items-start gap-4 p-6">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet to-royal text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="font-semibold">AI recommendation</p>
            <p className="mt-1 text-sm text-ink-2">
              You are <b>#{queueData.myInfo.position}</b> in the queue with about{' '}
              <b>{formatMinutes(queueData.myInfo.estimatedWaitMinutes)}</b> remaining. The doctor's
              average consultation is {queueData.queue?.avgConsultationMinutes || 12} minutes.
            </p>
          </div>
        </div>
      )}

      {/* Recent notifications */}
      <div className="glass p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <BellRing className="h-4 w-4 text-primary" /> Recent notifications
          </p>
          <button onClick={() => onNavigate('notifications')} className="text-sm text-primary hover:underline">
            View all
          </button>
        </div>
        <div className="space-y-2">
          {(notifData?.notifications || []).slice(0, 4).map((n: NotificationItem) => (
            <div
              key={n.id}
              className="flex items-center gap-3 rounded-xl bg-primary-soft/40 px-3 py-2.5"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{n.title}</p>
                {n.message && <p className="truncate text-xs text-ink-3">{n.message}</p>}
              </div>
              <span className="text-xs text-ink-3">
                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
          {!notifData?.notifications?.length && (
            <p className="py-4 text-center text-sm text-ink-3">No notifications yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Stethoscope,
  Users,
  CalendarDays,
  Siren,
  Activity,
  UserRound,
  Timer,
} from 'lucide-react';
import { adminApi } from '@/lib/adminApi';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Spinner';

export function AdminHome({ onNavigate }: { onNavigate: (id: string) => void }) {
  const { user, accessToken } = useAuth();
  const qc = useQueryClient();
  const socket = useSocket(accessToken, !!accessToken);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => (await adminApi.getDashboard()).data,
  });

  // Realtime refresh on emergency/queue/presence events.
  useEffect(() => {
    const s = socket.current;
    if (!s) return;
    const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    const onEmergency = () => { refresh(); };
    s.on('emergency:update', onEmergency);
    s.on('emergency:new', onEmergency);
    s.on('presence:global', refresh);
    s.on('queue:global', refresh);
    return () => {
      s.off('emergency:update', onEmergency);
      s.off('emergency:new', onEmergency);
      s.off('presence:global', refresh);
      s.off('queue:global', refresh);
    };
  }, [socket, qc]);

  if (isLoading) return <PageLoader label="Loading hospital status" />;

  const m = data?.metrics;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">
            Hospital overview, <span className="text-gradient">{user?.name?.split(' ')[0]}</span>
          </h2>
          <p className="text-ink-2">Realtime operational metrics across JIVA.</p>
        </div>
        <button onClick={() => onNavigate('emergency')} className="btn-danger flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium">
          <Siren className="h-4 w-4" /> Emergency Response Center
        </button>
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric icon={Stethoscope} label="Doctors online" value={m?.doctorsOnline} sub={`${m?.doctorsBusy} busy · ${m?.doctorsOffline} offline`} tone="text-emerald-500" />
        <Metric icon={Users} label="Patients waiting" value={m?.patientsWaiting} sub="in queues" tone="text-amber-500" />
        <Metric icon={CalendarDays} label="Appointments today" value={m?.appointmentsToday} sub={`${m?.completedToday} completed`} tone="text-primary" />
        <Metric icon={Siren} label="Active emergencies" value={m?.activeEmergencies} sub={`${m?.emergenciesToday} today`} tone="text-danger" />
      </div>

      {/* Efficiency bar */}
      <div className="glass p-6">
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-2 font-semibold"><Activity className="h-4 w-4 text-primary" /> Hospital efficiency</p>
          <span className="font-bold text-primary">{m?.efficiency}%</span>
        </div>
        <div className="h-4 w-full overflow-hidden rounded-full bg-primary-soft">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${m?.efficiency || 0}%` }}
            transition={{ duration: 1 }}
          />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-primary-soft/40 p-3">
            <div className="text-2xl font-bold text-primary">{m?.doctorsOnline}</div>
            <div className="text-xs text-ink-2">Doctors online</div>
          </div>
          <div className="rounded-xl bg-primary-soft/40 p-3">
            <div className="text-2xl font-bold text-amber-500">{m?.patientsWaiting}</div>
            <div className="text-xs text-ink-2">Waiting</div>
          </div>
          <div className="rounded-xl bg-primary-soft/40 p-3">
            <div className="text-2xl font-bold text-emerald-500">{m?.completedToday}</div>
            <div className="text-xs text-ink-2">Completed today</div>
          </div>
        </div>
      </div>

      {/* Recent emergencies */}
      <div className="glass p-6">
        <p className="mb-3 flex items-center gap-2 font-semibold"><Siren className="h-4 w-4 text-danger" /> Recent emergencies</p>
        {data?.recentEmergencies?.length ? (
          <div className="space-y-2">
            {data.recentEmergencies.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-xl bg-primary-soft/40 px-4 py-2.5 text-sm">
                <span className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-danger" />
                  {e.patientName || 'Patient'}
                </span>
                <Badge tone={e.severity === 'critical' ? 'danger' : e.severity === 'high' ? 'warning' : 'primary'}>{e.severity}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-3">No recent emergencies.</p>
        )}
      </div>

      {/* Recent appointments */}
      <div className="glass p-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4 text-primary" /> Recent appointments</p>
          <button onClick={() => onNavigate('appointments')} className="text-sm text-primary hover:underline">Manage all</button>
        </div>
        <div className="space-y-2">
          {data?.recentAppointments?.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl bg-primary-soft/40 px-4 py-2.5 text-sm">
              <span>{a.patient && typeof a.patient === 'object' ? (a.patient as unknown as { name: string }).name : 'Patient'} · {a.startTime}</span>
              <Badge tone="neutral">{a.status.replace('_', ' ')}</Badge>
            </div>
          ))}
          {!data?.recentAppointments?.length && <p className="text-sm text-ink-3">No appointments today yet.</p>}
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, sub, tone }: { icon: typeof Users; label: string; value?: number; sub: string; tone: string }) {
  return (
    <div className="glass glass-hover p-5">
      <Icon className={`mb-2 h-6 w-6 ${tone}`} />
      <div className={`font-display text-3xl font-bold ${tone}`}>{value ?? '—'}</div>
      <div className="text-sm font-medium text-ink">{label}</div>
      <div className="text-xs text-ink-3">{sub}</div>
    </div>
  );
}

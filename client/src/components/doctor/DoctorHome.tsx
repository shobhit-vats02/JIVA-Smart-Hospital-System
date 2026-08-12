'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  Users,
  Stethoscope,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  ScanFace,
} from 'lucide-react';
import { doctorApi } from '@/lib/doctorApi';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Spinner';
import { formatDate, formatTime } from '@/lib/utils';
import type { Appointment } from '@/types';

export function DoctorHome({ onNavigate }: { onNavigate: (id: string) => void }) {
  const { user, accessToken } = useAuth();
  const qc = useQueryClient();
  const socket = useSocket(accessToken, !!accessToken);

  const { data, isLoading } = useQuery({
    queryKey: ['doctor', 'dashboard'],
    queryFn: async () => (await doctorApi.getDashboard()).data,
  });

  // Listen for realtime presence/queue updates.
  useEffect(() => {
    const s = socket.current;
    if (!s) return;
    const refresh = () => qc.invalidateQueries({ queryKey: ['doctor', 'dashboard'] });
    s.on('presence:activated', refresh);
    s.on('presence:global', refresh);
    s.on('queue:global', refresh);
    return () => {
      s.off('presence:activated', refresh);
      s.off('presence:global', refresh);
      s.off('queue:global', refresh);
    };
  }, [socket, qc]);

  if (isLoading) return <PageLoader label="Loading your day" />;

  const doc = data?.doctor;
  const current = data?.currentPatient as Appointment | null;
  const next = data?.nextPatient as Appointment | null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              Good day, <span className="text-gradient">Dr. {user?.name?.replace('Dr. ', '').split(' ')[0]}</span>
            </h2>
            <p className="text-ink-2">{doc?.specialty} · {data?.todayCount ?? 0} appointments today</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={data?.isAvailable ? 'success' : 'warning'} dot>
              {data?.isAvailable ? 'On duty' : 'Not on duty'}
            </Badge>
            {data?.emergencyCount ? <Badge tone="danger">{data.emergencyCount} emergency</Badge> : null}
          </div>
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={CalendarDays} label="Today's appts" value={data?.todayCount ?? 0} tone="text-primary" />
        <Stat icon={Users} label="Patients waiting" value={data?.waitingCount ?? 0} tone="text-amber-500" />
        <Stat icon={CheckCircle2} label="Completed" value={data?.completedCount ?? 0} tone="text-emerald-500" />
        <Stat icon={AlertTriangle} label="Emergencies" value={data?.emergencyCount ?? 0} tone="text-danger" />
      </div>

      {/* Current + next patient */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="glass glow-border p-6">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Stethoscope className="h-4 w-4 text-primary" /> Current patient
          </p>
          {current ? (
            <div>
              <p className="text-xl font-bold">{current.patient && typeof current.patient === 'object' ? (current.patient as unknown as { name: string }).name : 'Patient'}</p>
              <p className="text-sm text-ink-2">Token {current.tokenNumber || '—'} · since {formatTime(current.consultationStartedAt || current.createdAt)}</p>
              <button onClick={() => onNavigate('consult')} className="btn-primary mt-4 rounded-xl px-4 py-2 text-sm">
                Open consultation
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 text-center">
              <Stethoscope className="mb-2 h-8 w-8 text-ink-3" />
              <p className="text-sm text-ink-2">No patient in consultation.</p>
            </div>
          )}
        </div>

        <div className="glass p-6">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-primary" /> Next patient
          </p>
          {next ? (
            <div>
              <p className="text-xl font-bold">{next.patient && typeof next.patient === 'object' ? (next.patient as unknown as { name: string }).name : 'Patient'}</p>
              <p className="text-sm text-ink-2">Token {next.tokenNumber || '—'} · at {next.startTime}</p>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-ink-3">
              No one waiting next.
            </p>
          )}
        </div>
      </div>

      {/* Presence status */}
      <div className="glass p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet to-royal text-white">
              <ScanFace className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">Presence status</p>
              <p className="text-sm text-ink-2">
                {data?.isAvailable ? `Active · ${data.presenceConfidence}% confidence` : 'Not verified yet'}
              </p>
            </div>
          </div>
          {!data?.isAvailable ? (
            <button onClick={() => onNavigate('presence')} className="btn-primary rounded-xl px-5 py-2.5 text-sm font-medium">
              Verify presence to start queue
            </button>
          ) : (
            <Badge tone="success" dot>Queue live · {data.currentQueue ?? 0} waiting</Badge>
          )}
        </div>
      </div>

      {/* AI suggestion */}
      <div className="glass flex items-start gap-4 p-6">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet to-royal text-white">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <p className="font-semibold">AI suggestion</p>
          <p className="text-sm text-ink-2">
            {data?.waitingCount
              ? `You have ${data.waitingCount} patient(s) waiting. Estimated wait ${(data.waitingCount || 0) * (data.avgConsultationMinutes || 12)} min.`
              : 'No queue pressure right now. Enjoy the calm — patients will be routed to you when they book.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone: string }) {
  return (
    <div className="glass glass-hover p-4">
      <Icon className={`mb-1 h-5 w-5 ${tone}`} />
      <div className={`font-display text-2xl font-bold ${tone}`}>{value}</div>
      <div className="text-xs text-ink-2">{label}</div>
    </div>
  );
}

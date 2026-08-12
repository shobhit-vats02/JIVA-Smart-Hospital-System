'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ListOrdered, Users, Clock, Stethoscope, CheckCircle2, Timer } from 'lucide-react';
import { patientApi } from '@/lib/patientApi';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Spinner';
import { formatMinutes } from '@/lib/utils';
import type { Appointment } from '@/types';

export function QueueStatus() {
  const { accessToken } = useAuth();
  const socket = useSocket(accessToken, !!accessToken);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['patient', 'queue'],
    queryFn: async () => (await patientApi.queueStatus()).data,
  });

  // Subscribe to the doctor's live queue room for realtime updates.
  useQuery({
    queryKey: ['patient', 'queue', 'subscribe', data?.queue?.doctor?.id],
    queryFn: async () => {
      const s = socket.current;
      if (!s) return null;
      s.emit('queue:subscribe', { doctorId: data?.queue?.doctor?.id });
      // Keep listening for updates via the socket handler that invalidates.
      return null;
    },
    enabled: !!data?.queue?.doctor?.id && !!accessToken,
  });

  if (isLoading) return <PageLoader label="Loading queue" />;

  const myInfo = data?.myInfo;
  const queue = data?.queue;
  const appointment = data?.appointment as Appointment | null;
  const position = myInfo?.position ?? 0;
  const progress = queue?.totalWaiting && queue.totalWaiting > 0
    ? Math.min(100, Math.round((1 - (position - 1) / queue.totalWaiting) * 100))
    : 100;

  const doctor = queue?.doctor && typeof queue.doctor === 'object' ? queue.doctor : null;

  if (!appointment || !queue) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="glass p-10 text-center">
          <ListOrdered className="mx-auto mb-3 h-10 w-10 text-ink-3" />
          <p className="font-semibold">You're not in an active queue</p>
          <p className="mt-1 text-sm text-ink-2">
            Book an appointment with an on-duty doctor to see your live queue status here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="glass glow-border p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            <p className="font-semibold">{doctor?.name || 'Doctor'}</p>
          </div>
          <Badge tone={doctor?.isAvailable ? 'success' : 'warning'} dot>
            {doctor?.isAvailable ? 'Available' : 'Unavailable'}
          </Badge>
        </div>

        {/* Progress animation */}
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-ink-2">Queue progress</span>
          <span className="font-semibold text-primary">{progress}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-primary-soft">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-violet"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8 }}
          />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat icon={ListOrdered} label="Queue position" value={myInfo ? `#${myInfo.position}` : '—'} tone="text-primary" />
          <Stat icon={Users} label="Patients ahead" value={myInfo ? `${myInfo.patientsAhead}` : '—'} tone="text-amber-500" />
          <Stat icon={Clock} label="Est. wait" value={myInfo ? formatMinutes(myInfo.estimatedWaitMinutes) : '—'} tone="text-emerald-500" />
          <Stat icon={Timer} label="Avg consult" value={`${queue.avgConsultationMinutes}m`} tone="text-violet" />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Current patient */}
        <div className="glass p-6">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Now being seen
          </p>
          {queue.current ? (
            <div className="rounded-xl bg-emerald-500/10 p-4">
              <p className="text-lg font-bold">{queue.current.patientName}</p>
              <p className="text-sm text-ink-2">Token {queue.current.token}</p>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-ink-3">
              {queue.next ? `Next: ${queue.next.patientName} (${queue.next.token})` : 'No patient currently being seen.'}
            </p>
          )}
        </div>

        {/* Up next */}
        <div className="glass p-6">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-primary" /> Waiting list
          </p>
          <div className="space-y-2">
            {queue.waiting.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-ink-3">
                No patients waiting.
              </p>
            ) : (
              queue.waiting.slice(0, 6).map((w, i) => (
                <div
                  key={w.appointmentId}
                  className={cn_highlight(i)}
                >
                  <span className="text-sm font-medium">{i + 1}.</span>
                  <span className="flex-1 truncate text-sm">{w.patientName}</span>
                  <span className="text-xs text-ink-3">{w.token}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <button onClick={() => refetch()} className="btn-glass w-full rounded-xl px-4 py-2.5 text-sm font-medium">
        Refresh now
      </button>
    </div>
  );
}

function cn_highlight(i: number) {
  return `flex items-center gap-2 rounded-xl px-3 py-2 ${
    i === 0 ? 'bg-primary-soft/60' : 'bg-primary-soft/30'
  }`;
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl bg-primary-soft/40 p-4">
      <Icon className={`mb-1 h-5 w-5 ${tone}`} />
      <div className={`font-display text-2xl font-bold ${tone}`}>{value}</div>
      <div className="text-xs text-ink-2">{label}</div>
    </div>
  );
}

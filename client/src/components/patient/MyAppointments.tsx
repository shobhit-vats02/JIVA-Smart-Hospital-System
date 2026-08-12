'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Clock, X, Stethoscope, ListOrdered } from 'lucide-react';
import { patientApi } from '@/lib/patientApi';
import { useToast } from '@/components/ui/Toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Spinner';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types';

const TABS = ['all', 'upcoming', 'completed', 'cancelled', 'emergency'] as const;
type Tab = (typeof TABS)[number];

const statusTone: Record<string, 'success' | 'warning' | 'danger' | 'primary' | 'neutral'> = {
  pending: 'warning',
  confirmed: 'primary',
  waiting: 'warning',
  in_consultation: 'success',
  completed: 'neutral',
  cancelled: 'danger',
  rescheduled: 'primary',
  emergency: 'danger',
};

export function MyAppointments() {
  const toast = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['patient', 'appointments', tab],
    queryFn: async () => (await patientApi.listAppointments(tab)).data,
  });

  const appointments = data || [];

  const onCancel = async (a: Appointment) => {
    if (!confirm('Cancel this appointment?')) return;
    try {
      await patientApi.cancelAppointment(a.id, 'Cancelled by patient');
      toast('success', 'Appointment cancelled');
      qc.invalidateQueries({ queryKey: ['patient', 'appointments'] });
      qc.invalidateQueries({ queryKey: ['patient', 'queue'] });
    } catch (e) {
      toast('error', 'Could not cancel', e instanceof Error ? e.message : 'Try again.');
    }
  };

  if (isLoading) return <PageLoader label="Loading appointments" />;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-all',
              tab === t ? 'bg-gradient-to-r from-primary to-royal text-white' : 'btn-glass'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {appointments.length === 0 ? (
        <div className="glass p-10 text-center">
          <CalendarDays className="mx-auto mb-3 h-10 w-10 text-ink-3" />
          <p className="font-semibold">No appointments found</p>
          <p className="text-sm text-ink-2">Bookings will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {appointments.map((a) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass glass-hover p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-royal text-white">
                      <Stethoscope className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-bold">
                        {typeof a.doctor === 'object' ? a.doctor.name : 'Doctor'}
                      </p>
                      <p className="text-sm text-ink-2">
                        {typeof a.department === 'object' ? a.department.name : ''} ·{' '}
                        {formatDate(a.date)} · {a.startTime}–{a.endTime}
                      </p>
                      {(a.reason || a.symptoms) && (
                        <p className="mt-1 text-xs text-ink-3">
                          {a.reason}
                          {a.reason && a.symptoms ? ' — ' : ''}
                          {a.symptoms}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge tone={statusTone[a.status]} dot>
                    {a.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-3 text-sm text-ink-2">
                  <span className="flex items-center gap-1.5">
                    <ListOrdered className="h-4 w-4 text-primary" /> Queue: {a.tokenNumber || '—'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-primary" /> Est. wait:{' '}
                    {a.estimatedWaitMinutes ? `${a.estimatedWaitMinutes}m` : '—'}
                  </span>
                  {a.isEmergency && <Badge tone="danger">Emergency</Badge>}
                  <div className="ml-auto">
                    {['pending', 'confirmed', 'waiting'].includes(a.status) && (
                      <Button variant="danger" size="sm" onClick={() => onCancel(a)} leftIcon={<X className="h-4 w-4" />}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CalendarDays, CheckCircle2, Ban, RefreshCcw } from 'lucide-react';
import { adminApi } from '@/lib/adminApi';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Spinner';
import { formatDate } from '@/lib/utils';
import type { Appointment } from '@/types';

const STATUSES = ['all', 'pending', 'confirmed', 'waiting', 'in_consultation', 'completed', 'cancelled', 'emergency'];

export function AppointmentsAdmin() {
  const toast = useToast();
  const qc = useQueryClient();
  const [status, setStatus] = useState('all');
  const [date, setDate] = useState('');
  const [selected, setSelected] = useState<Appointment | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'appointments', status, date],
    queryFn: async () => (await adminApi.listAppointments({ status, date })).data,
  });

  const act = async (a: Appointment, action: string) => {
    try {
      await adminApi.updateAppointment(a.id, { status: action });
      toast('success', `Appointment ${action}`);
      qc.invalidateQueries({ queryKey: ['admin', 'appointments'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      setSelected(null);
    } catch (e) {
      toast('error', 'Update failed', e instanceof Error ? e.message : 'Try again.');
    }
  };

  if (isLoading) return <PageLoader label="Loading appointments" />;

  const appointments = data || [];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <h2 className="text-xl font-bold">Appointments</h2>

      <div className="flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`rounded-full px-3.5 py-1.5 text-sm capitalize transition-all ${status === s ? 'bg-gradient-to-r from-primary to-royal text-white' : 'btn-glass'}`}>
            {s.replace('_', ' ')}
          </button>
        ))}
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input ml-auto w-auto" />
      </div>

      <div className="space-y-2">
        {appointments.map((a) => (
          <div key={a.id} className="glass glass-hover flex flex-wrap items-center gap-4 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-royal text-white">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{a.patient && typeof a.patient === 'object' ? (a.patient as unknown as { name: string }).name : 'Patient'}</p>
              <p className="text-xs text-ink-2">
                {formatDate(a.date)} · {a.startTime}–{a.endTime} · {typeof a.doctor === 'object' ? (a.doctor as unknown as { name: string }).name : ''}
              </p>
            </div>
            <Badge tone={a.status === 'cancelled' ? 'danger' : a.status === 'completed' ? 'neutral' : a.status === 'emergency' ? 'danger' : a.status === 'in_consultation' ? 'success' : 'primary'}>
              {a.status.replace('_', ' ')}
            </Badge>
            <div className="flex gap-1">
              <Button size="sm" variant="glass" onClick={() => setSelected(a)}>Manage</Button>
            </div>
          </div>
        ))}
        {!appointments.length && <p className="py-10 text-center text-ink-3">No appointments match.</p>}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
            <motion.div initial={{ scale: 0.94 }} animate={{ scale: 1 }} exit={{ scale: 0.94 }} className="glass max-h-[90vh] w-full max-w-md overflow-y-auto p-6 shadow-glass-lg">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">Manage appointment</h3>
                <button onClick={() => setSelected(null)} className="rounded-lg p-2 text-ink-3 hover:bg-primary-soft"><X className="h-5 w-5" /></button>
              </div>
              <p className="mb-4 text-sm text-ink-2">
                {selected.patient && typeof selected.patient === 'object' ? (selected.patient as unknown as { name: string }).name : 'Patient'} · {formatDate(selected.date)} at {selected.startTime}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => act(selected, 'confirmed')}>Confirm</Button>
                <Button size="sm" variant="glass" leftIcon={<RefreshCcw className="h-4 w-4" />} onClick={() => act(selected, 'rescheduled')}>Reschedule</Button>
                <Button size="sm" variant="danger" leftIcon={<Ban className="h-4 w-4" />} onClick={() => act(selected, 'cancelled')}>Cancel</Button>
                <Button size="sm" variant="success" onClick={() => act(selected, 'completed')}>Complete</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

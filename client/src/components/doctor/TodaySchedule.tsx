'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, UserRound, AlertTriangle, BellRing, CheckCircle2 } from 'lucide-react';
import { doctorApi } from '@/lib/doctorApi';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Spinner';
import { PatientConsultation } from '@/components/doctor/PatientConsultation';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types';

const statusTone: Record<string, 'success' | 'warning' | 'danger' | 'primary' | 'neutral'> = {
  pending: 'warning',
  confirmed: 'primary',
  waiting: 'warning',
  in_consultation: 'success',
  completed: 'neutral',
  cancelled: 'danger',
  emergency: 'danger',
};

export function TodaySchedule({ onOpenConsult }: { onOpenConsult: (id: string) => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [selected, setSelected] = useState<Appointment | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['doctor', 'schedule', date],
    queryFn: async () => (await doctorApi.getSchedule(date)).data,
  });

  const onComplete = async (a: Appointment) => {
    try {
      await doctorApi.completeConsultation(a.id);
      toast('success', 'Appointment completed', `${a.patient && typeof a.patient === 'object' ? (a.patient as unknown as { name: string }).name : 'Patient'} marked as completed.`);
      qc.invalidateQueries({ queryKey: ['doctor', 'schedule'] });
      qc.invalidateQueries({ queryKey: ['doctor', 'dashboard'] });
    } catch (e) {
      toast('error', 'Could not complete', e instanceof Error ? e.message : 'Try again.');
    }
  };

  if (isLoading) return <PageLoader label="Loading schedule" />;

  const appointments = data || [];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <CalendarDays className="h-5 w-5 text-primary" /> Today's schedule
        </h2>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input w-auto" />
      </div>

      {appointments.length === 0 ? (
        <div className="glass p-10 text-center">
          <CalendarDays className="mx-auto mb-3 h-10 w-10 text-ink-3" />
          <p className="font-semibold">No appointments for this date</p>
          <p className="text-sm text-ink-2">Patients will appear here when they book with you.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((a) => {
            const patientName =
              a.patient && typeof a.patient === 'object' ? (a.patient as unknown as { name: string }).name : 'Patient';
            return (
              <div key={a.id} className="glass glass-hover flex flex-wrap items-center gap-4 p-4">
                <div className="w-20 shrink-0 text-center">
                  <div className="font-display text-lg font-bold text-primary">{a.startTime}</div>
                  <div className="text-xs text-ink-3">{a.endTime}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{patientName}</p>
                    {a.isEmergency && <AlertTriangle className="h-4 w-4 text-danger" />}
                  </div>
                  <p className="text-xs text-ink-2">
                    {(a.reason || 'No reason')} · Token {a.tokenNumber || '—'}
                  </p>
                </div>
                {/* Compact AI priority display */}
                <div className="flex shrink-0 flex-col items-center rounded-xl bg-primary-soft/50 px-3 py-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-ink-3">AI Priority</span>
                  <span className={`font-display text-sm font-bold ${(a.priorityPoints || 0) >= 80 ? 'text-danger' : (a.priorityPoints || 0) >= 50 ? 'text-amber-500' : 'text-primary'}`}>
                    {a.priorityPoints ?? 0} pts
                  </span>
                </div>
                <Badge tone={statusTone[a.status]} dot>{a.status.replace('_', ' ')}</Badge>
                {!['completed', 'cancelled'].includes(a.status) && (
                  <>
                    <Button size="sm" leftIcon={<BellRing className="h-4 w-4" />} onClick={() => setSelected(a)}>
                      Call In Patient
                    </Button>
                    <Button size="sm" variant="success" leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => onComplete(a)}>
                      Completed
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Patient consultation details + Add Prescription */}
      {selected && (
        <PatientConsultation
          appointment={selected}
          onClose={() => {
            setSelected(null);
            qc.invalidateQueries({ queryKey: ['doctor', 'prescriptions'] });
          }}
        />
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Stethoscope,
  Timer,
  Plus,
  Trash2,
  FileText,
  CheckCircle2,
  History,
  AlertTriangle,
} from 'lucide-react';
import { doctorApi } from '@/lib/doctorApi';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Spinner';
import { formatDate } from '@/lib/utils';
import type { Appointment, MedicineItem } from '@/types';

export function CurrentConsultation({ initialId }: { initialId?: string }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [appointmentId, setAppointmentId] = useState(initialId || '');
  const [notes, setNotes] = useState('');
  const [meds, setMeds] = useState<MedicineItem[]>([{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);

  // Live consultation timer.
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: appointment, isLoading } = useQuery({
    queryKey: ['doctor', 'appointment', appointmentId],
    queryFn: async () => (await doctorApi.getAppointment(appointmentId)).data,
    enabled: !!appointmentId,
  });

  const patientId =
    appointment?.patient && typeof appointment.patient === 'object'
      ? (appointment.patient as unknown as { id: string }).id
      : null;

  const { data: historyData } = useQuery({
    queryKey: ['doctor', 'patient-history', patientId],
    queryFn: async () => (await doctorApi.getPatientHistory(patientId!)).data,
    enabled: !!patientId,
  });

  if (!appointmentId) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="glass p-10 text-center">
          <Stethoscope className="mx-auto mb-3 h-10 w-10 text-ink-3" />
          <p className="font-semibold">No consultation open</p>
          <p className="text-sm text-ink-2">Start a consultation from Today's Schedule to begin.</p>
        </div>
      </div>
    );
  }

  if (isLoading) return <PageLoader label="Loading consultation" />;

  const a = appointment!;
  const patient = a.patient && typeof a.patient === 'object' ? (a.patient as unknown as { name: string; age?: number; gender?: string; bloodGroup?: string }) : null;
  const history = historyData?.history || [];

  const addMed = () => setMeds((m) => [...m, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  const updateMed = (i: number, patch: Partial<MedicineItem>) =>
    setMeds((m) => m.map((med, idx) => (idx === i ? { ...med, ...patch } : med)));
  const removeMed = (i: number) => setMeds((m) => m.filter((_, idx) => idx !== i));

  const onComplete = async () => {
    setSaving(true);
    try {
      await doctorApi.savePrescription(a.id, { medicines: meds.filter((m) => m.name), notes });
      await doctorApi.completeConsultation(a.id, notes);
      toast('success', 'Consultation completed', 'Prescription saved and patient notified.');
      qc.invalidateQueries({ queryKey: ['doctor'] });
      setAppointmentId('');
    } catch (e) {
      toast('error', 'Could not complete', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="glass glow-border p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-royal text-white">
              <UserRoundFallback />
            </span>
            <div>
              <h2 className="text-2xl font-bold">{patient?.name || 'Patient'}</h2>
              <p className="text-sm text-ink-2">
                {patient?.age || '—'} · {patient?.gender || '—'} · Blood {patient?.bloodGroup || '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-xl bg-primary-soft px-3 py-2 text-sm font-semibold">
              <Timer className="h-4 w-4 text-primary" /> {fmtTime(elapsed)}
            </span>
            <Badge tone="success" dot>In consultation</Badge>
          </div>
        </div>
        {a.symptoms && (
          <p className="mt-3 rounded-xl bg-primary-soft/40 p-3 text-sm">
            <b>Symptoms:</b> {a.symptoms}
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Previous visits */}
        <div className="glass p-6">
          <p className="mb-3 flex items-center gap-2 font-semibold">
            <History className="h-4 w-4 text-primary" /> Previous visits
          </p>
          {history.length === 0 ? (
            <p className="text-sm text-ink-3">No previous completed visits.</p>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 5).map((h) => (
                <div key={h.id} className="rounded-xl bg-primary-soft/40 p-3 text-sm">
                  <div className="flex justify-between">
                    <b>{typeof h.doctor === 'object' ? (h.doctor as unknown as { name: string }).name : 'Visit'}</b>
                    <span className="text-xs text-ink-3">{formatDate(h.date)}</span>
                  </div>
                  <p className="text-xs text-ink-2">{h.reason || 'Consultation'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="glass p-6">
          <p className="mb-3 flex items-center gap-2 font-semibold">
            <FileText className="h-4 w-4 text-primary" /> Consultation notes
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Clinical notes, observations, advice…"
            className="input min-h-[160px] resize-none"
          />
        </div>
      </div>

      {/* Prescription */}
      <div className="glass p-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-2 font-semibold">
            <FileText className="h-4 w-4 text-primary" /> Prescription
          </p>
          <Button variant="glass" size="sm" onClick={addMed} leftIcon={<Plus className="h-4 w-4" />}>
            Add medicine
          </Button>
        </div>
        <div className="space-y-2">
          {meds.map((m, i) => (
            <div key={i} className="rounded-xl bg-primary-soft/30 p-3">
              <div className="grid grid-cols-12 gap-2">
                <input value={m.name} onChange={(e) => updateMed(i, { name: e.target.value })} placeholder="Medicine name" className="input col-span-8 text-sm" />
                <input value={m.dosage} onChange={(e) => updateMed(i, { dosage: e.target.value })} placeholder="Dosage" className="input col-span-3 text-sm" />
                <button onClick={() => removeMed(i)} className="grid place-items-center text-danger" aria-label="Remove">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 grid grid-cols-12 gap-2">
                <input value={m.frequency} onChange={(e) => updateMed(i, { frequency: e.target.value })} placeholder="Frequency (e.g. 3× daily)" className="input col-span-4 text-sm" />
                <input value={m.duration} onChange={(e) => updateMed(i, { duration: e.target.value })} placeholder="Duration" className="input col-span-4 text-sm" />
                <input value={m.instructions} onChange={(e) => updateMed(i, { instructions: e.target.value })} placeholder="Instructions" className="input col-span-4 text-sm" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={onComplete}
          loading={saving}
          variant="success"
          className="flex-1"
          leftIcon={<CheckCircle2 className="h-4 w-4" />}
        >
          Complete &amp; generate prescription
        </Button>
        <Button variant="glass" className="flex-1" leftIcon={<AlertTriangle className="h-4 w-4 text-amber-500" />}>
          Mark emergency
        </Button>
      </div>
    </div>
  );
}

function UserRoundFallback() {
  return <Stethoscope className="h-7 w-7" />;
}

function fmtTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

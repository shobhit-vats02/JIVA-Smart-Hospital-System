'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  UserRound,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  Stethoscope,
  CalendarDays,
  Clock,
  Hash,
  Activity,
} from 'lucide-react';
import { doctorApi } from '@/lib/doctorApi';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import type { Appointment, MedicineItem } from '@/types';

const statusTone: Record<string, 'success' | 'warning' | 'danger' | 'primary' | 'neutral'> = {
  pending: 'warning',
  confirmed: 'primary',
  waiting: 'warning',
  in_consultation: 'success',
  completed: 'neutral',
  cancelled: 'danger',
  emergency: 'danger',
};

/**
 * Doctor-side patient consultation/details view opened from the Patients page.
 * Shows the patient + appointment context and lets the doctor build and save a
 * prescription, which is persisted via the existing appointment-prescription
 * endpoint (associated with the authenticated doctor and the appointment's
 * patient) and becomes visible to that patient in Patient Portal → Prescriptions.
 */
export function PatientConsultation({
  appointment,
  onClose,
}: {
  appointment: Appointment;
  onClose: () => void;
}) {
  const toast = useToast();
  const [showBuilder, setShowBuilder] = useState(false);
  const [meds, setMeds] = useState<MedicineItem[]>([
    { name: '', dosage: '', frequency: '', duration: '', instructions: '' },
  ]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const patient =
    appointment.patient && typeof appointment.patient === 'object'
      ? (appointment.patient as unknown as { id?: string; name: string; age?: number; gender?: string; bloodGroup?: string })
      : null;
  const dept =
    appointment.department && typeof appointment.department === 'object'
      ? (appointment.department as unknown as { name: string })
      : null;

  // Reset the builder whenever a different patient is opened.
  useEffect(() => {
    setShowBuilder(false);
    setMeds([{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
    setNotes('');
    setError('');
  }, [appointment.id]);

  const addMed = () => setMeds((m) => [...m, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  const updateMed = (i: number, patch: Partial<MedicineItem>) =>
    setMeds((m) => m.map((med, idx) => (idx === i ? { ...med, ...patch } : med)));
  const removeMed = (i: number) => setMeds((m) => (m.length > 1 ? m.filter((_, idx) => idx !== i) : m));

  const save = async () => {
    const validMeds = meds.filter((m) => m.name.trim());
    if (validMeds.length === 0) {
      setError('Add at least one medicine with a name.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      // Existing endpoint: associates the appointment + authenticated doctor +
      // the appointment's patient, persists to MongoDB, notifies the patient.
      await doctorApi.savePrescription(appointment.id, { medicines: validMeds, notes });
      toast('success', 'Prescription saved successfully', `Prescription created for ${patient?.name || 'patient'}.`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save prescription. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
        onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
      >
        <motion.div
          initial={{ scale: 0.94, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.94, y: 10 }}
          className="glass max-h-[92vh] w-full max-w-2xl overflow-y-auto p-6 shadow-glass-lg"
        >
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <Stethoscope className="h-5 w-5 text-primary" /> Patient Consultation
            </h3>
            <button
              onClick={() => !saving && onClose()}
              className="rounded-lg p-2 text-ink-3 hover:bg-primary-soft"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Patient + appointment details */}
          <div className="glass glow-border p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-royal text-white">
                <UserRound className="h-7 w-7" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xl font-bold">{patient?.name || 'Patient'}</p>
                <p className="text-sm text-ink-2">
                  {patient?.age || '—'} · {patient?.gender || '—'}
                  {patient?.bloodGroup ? ` · Blood ${patient.bloodGroup}` : ''}
                  {patient?.id ? ` · ID #${patient.id.slice(-6).toUpperCase()}` : ''}
                </p>
              </div>
              <Badge tone={statusTone[appointment.status]} dot>{appointment.status.replace('_', ' ')}</Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
              <Detail icon={CalendarDays} label="Date" value={formatDate(appointment.date)} />
              <Detail icon={Clock} label="Time" value={`${appointment.startTime}–${appointment.endTime}`} />
              <Detail icon={Hash} label="Token" value={`#${appointment.tokenNumber || '—'}`} />
              <Detail icon={Activity} label="Department" value={dept?.name || '—'} />
            </div>

            {/* AI priority */}
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-primary-soft/50 px-3 py-2">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-3">AI Priority</span>
              <span className={`font-display text-lg font-bold ${(appointment.priorityPoints || 0) >= 80 ? 'text-danger' : (appointment.priorityPoints || 0) >= 50 ? 'text-amber-500' : 'text-primary'}`}>
                {appointment.priorityPoints ?? 0} pts
              </span>
              <Badge tone={(appointment.priorityPoints || 0) >= 80 ? 'danger' : (appointment.priorityPoints || 0) >= 50 ? 'warning' : 'primary'}>
                {appointment.priorityCategory || 'Normal'}
              </Badge>
            </div>

            {appointment.reason && (
              <p className="mt-3 rounded-xl bg-primary-soft/40 px-3 py-2 text-sm">
                <b>Reason:</b> {appointment.reason}
              </p>
            )}
            {appointment.symptoms && (
              <p className="mt-2 rounded-xl bg-primary-soft/40 px-3 py-2 text-sm">
                <b>Symptoms:</b> {appointment.symptoms}
              </p>
            )}
          </div>

          {/* Add Prescription action */}
          {!showBuilder ? (
            <Button
              className="mt-5 w-full"
              leftIcon={<FileText className="h-4 w-4" />}
              onClick={() => setShowBuilder(true)}
            >
              Add Prescription
            </Button>
          ) : (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-2 font-semibold">
                  <FileText className="h-4 w-4 text-primary" /> New Prescription
                </p>
                <Button variant="glass" size="sm" onClick={addMed} leftIcon={<Plus className="h-4 w-4" />}>
                  Add Medicine
                </Button>
              </div>

              {/* Medicines */}
              <div className="space-y-2">
                {meds.map((m, i) => (
                  <div key={i} className="rounded-xl bg-primary-soft/30 p-3">
                    <div className="grid grid-cols-12 gap-2">
                      <input
                        value={m.name}
                        onChange={(e) => updateMed(i, { name: e.target.value })}
                        placeholder="Medicine name *"
                        className="input col-span-8 text-sm"
                      />
                      <input
                        value={m.dosage}
                        onChange={(e) => updateMed(i, { dosage: e.target.value })}
                        placeholder="Dosage"
                        className="input col-span-3 text-sm"
                      />
                      <button onClick={() => removeMed(i)} className="grid place-items-center text-danger" aria-label="Remove medicine">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-12 gap-2">
                      <input
                        value={m.frequency}
                        onChange={(e) => updateMed(i, { frequency: e.target.value })}
                        placeholder="Frequency (e.g. 3× daily)"
                        className="input col-span-4 text-sm"
                      />
                      <input
                        value={m.duration}
                        onChange={(e) => updateMed(i, { duration: e.target.value })}
                        placeholder="Duration (e.g. 7 days)"
                        className="input col-span-4 text-sm"
                      />
                      <input
                        value={m.instructions}
                        onChange={(e) => updateMed(i, { instructions: e.target.value })}
                        placeholder="Instructions"
                        className="input col-span-4 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Doctor notes */}
              <div className="mt-4">
                <label className="mb-1.5 block text-sm font-medium text-ink-2">Doctor notes / advice</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Take adequate rest and stay hydrated…"
                  className="input min-h-[80px] resize-none"
                />
              </div>

              {error && (
                <p className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
              )}

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Button variant="glass" className="flex-1" onClick={() => setShowBuilder(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={save} loading={saving} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
                  {saving ? 'Saving prescription…' : 'Save Prescription'}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Detail({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-primary-soft/40 p-3">
      <div className="flex items-center gap-1.5 text-xs text-ink-3">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="truncate font-medium">{value}</div>
    </div>
  );
}

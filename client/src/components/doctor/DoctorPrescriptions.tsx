'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { FileText, Pill, Printer, Download, Plus, X, Trash2, UserRound, CheckCircle2, Search } from 'lucide-react';
import { doctorApi } from '@/lib/doctorApi';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Spinner';
import { formatDate, formatTime } from '@/lib/utils';
import type { MedicineItem, PrescriptionRecord } from '@/types';

function formatRxDate(date: string | Date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return `${formatDate(d)} · ${formatTime(d)}`;
}

function prescriptionHTML(rx: PrescriptionRecord, doctorName: string, doctorSpecialty: string, patientName: string) {
  const meds = (rx.medicines || [])
    .map((m) => {
      const bits = [
        m.name,
        m.dosage && `Dosage: ${m.dosage}`,
        m.frequency && `Frequency: ${m.frequency}`,
        m.duration && `Duration: ${m.duration}`,
        m.instructions && `Instructions: ${m.instructions}`,
      ].filter(Boolean);
      return `<li><b>${bits[0]}</b>${bits.slice(1).map((b) => `<br/><span class="muted">${b}</span>`).join('')}</li>`;
    })
    .join('');
  return `<!DOCTYPE html><html><head><title>Prescription</title>
  <style>
    body{font-family:Inter,Arial;padding:40px;color:#0f172a}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #06b6d4;padding-bottom:12px}
    h1{color:#0891b2;margin:0}
    .brand{color:#475569;font-size:12px}
    ul{list-style:none;padding:0;line-height:1.9}
    li{background:#f0f9ff;border-radius:8px;padding:10px 14px;margin-bottom:8px}
    .muted{color:#475569;font-weight:400;font-size:13px}
    .rx-title{color:#0891b2;font-size:13px;text-transform:uppercase;letter-spacing:1px}
  </style></head>
  <body>
    <div class="head">
      <div><h1>JIVA</h1><div class="brand">AI Powered Smart Healthcare Platform</div></div>
      <div style="text-align:right">
        <div class="rx-title">Prescription</div>
        <div style="margin-top:6px">Dr. ${doctorName}<br/><span class="muted">${doctorSpecialty}</span></div>
        <div class="muted" style="margin-top:6px">${formatRxDate(rx.issuedAt)}</div>
      </div>
    </div>
    <h3 style="margin-top:20px">Patient: ${patientName}</h3>
    <h4 class="rx-title" style="margin:16px 0 8px">Medicines</h4>
    <ul>${meds || '<li>No medicines</li>'}</ul>
    ${rx.doctorNotes || rx.notes ? `<p style="margin-top:16px"><b>Doctor notes / advice:</b><br/>${rx.doctorNotes || rx.notes}</p>` : ''}
    <p style="margin-top:40px;text-align:right"><i>Signed electronically by Dr. ${doctorName}</i></p>
  </body></html>`;
}

function openPrint(rx: PrescriptionRecord, doctorName: string, doctorSpecialty: string, patientName: string) {
  const w = window.open('', '_blank', 'width=820,height=900');
  if (w) {
    w.document.write(prescriptionHTML(rx, doctorName, doctorSpecialty, patientName));
    w.document.close();
    w.focus();
    w.print();
  }
}

export function DoctorPrescriptions() {
  const toast = useToast();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatients, setShowPatients] = useState(false);
  const [meds, setMeds] = useState<MedicineItem[]>([{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['doctor', 'prescriptions'],
    queryFn: async () => (await doctorApi.getPrescriptions()).data,
  });

  const { data: patientsData } = useQuery({
    queryKey: ['doctor', 'patients', patientSearch],
    queryFn: async () => (await doctorApi.listPatients(patientSearch)).data,
    enabled: modalOpen,
  });
  const patients = patientsData || [];

  const openModal = () => {
    setModalOpen(true);
    setPatientId('');
    setPatientName('');
    setPatientSearch('');
    setMeds([{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
    setNotes('');
    setError('');
  };

  const addMed = () => setMeds((m) => [...m, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  const updateMed = (i: number, patch: Partial<MedicineItem>) =>
    setMeds((m) => m.map((med, idx) => (idx === i ? { ...med, ...patch } : med)));
  const removeMed = (i: number) => setMeds((m) => (m.length > 1 ? m.filter((_, idx) => idx !== i) : m));

  const pickPatient = (p: { id: string; name: string }) => {
    setPatientId(p.id);
    setPatientName(p.name);
    setShowPatients(false);
    setPatientSearch(p.name);
  };

  const save = async () => {
    // Validation
    if (!patientId) {
      setError('Please select a patient.');
      return;
    }
    const validMeds = meds.filter((m) => m.name.trim());
    if (validMeds.length === 0) {
      setError('Add at least one medicine with a name.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await doctorApi.createPrescription({ patientId, medicines: validMeds, notes });
      toast('success', 'Prescription saved', `Prescription created for ${patientName}.`);
      qc.invalidateQueries({ queryKey: ['doctor', 'prescriptions'] });
      setModalOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save prescription.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <PageLoader label="Loading prescriptions" />;

  const prescriptions = data || [];

  const print = (rx: PrescriptionRecord) => {
    const patient = (rx.patient && typeof rx.patient === 'object' ? rx.patient : { name: '' }) as { name: string };
    const doctor = (typeof rx.doctor === 'object' ? rx.doctor : { name: 'Doctor', specialty: '' }) as {
      name: string;
      specialty?: string;
    };
    openPrint(rx, doctor.name, doctor.specialty || '', patient.name || '');
  };

  const download = (rx: PrescriptionRecord) => {
    const patient = (rx.patient && typeof rx.patient === 'object' ? rx.patient : { name: '' }) as { name: string };
    const doctor = (typeof rx.doctor === 'object' ? rx.doctor : { name: 'Doctor', specialty: '' }) as {
      name: string;
      specialty?: string;
    };
    const html = prescriptionHTML(rx, doctor.name, doctor.specialty || '', patient.name || '');
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prescription-${rx.id.slice(-6)}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast('success', 'Prescription downloaded');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <FileText className="h-6 w-6 text-primary" /> Prescriptions
        </h2>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openModal}>
          New Prescription
        </Button>
      </div>

      {prescriptions.length === 0 ? (
        <div className="glass p-10 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-ink-3" />
          <p className="font-semibold">No prescriptions issued yet</p>
          <p className="text-sm text-ink-2">Create your first prescription using the button above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((rx) => {
            const patient = (rx.patient && typeof rx.patient === 'object' ? rx.patient : { name: 'Patient' }) as { name: string };
            const doctor = (typeof rx.doctor === 'object' ? rx.doctor : { name: 'Doctor', specialty: '' }) as {
              name: string;
              specialty?: string;
            };
            return (
              <div key={rx.id} className="glass glass-hover p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{patient.name || 'Patient'}</p>
                    <p className="text-sm text-ink-2">
                      {doctor.name}
                      {doctor.specialty ? ` · ${doctor.specialty}` : ''} ·{' '}
                      <span className="font-medium">{formatRxDate(rx.issuedAt)}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="glass" leftIcon={<Printer className="h-4 w-4" />} onClick={() => print(rx)}>
                      Print
                    </Button>
                    <Button size="sm" variant="glass" leftIcon={<Download className="h-4 w-4" />} onClick={() => download(rx)}>
                      Download
                    </Button>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {(rx.medicines || []).map((m, i) => (
                    <div key={i} className="rounded-xl bg-primary-soft/40 px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Pill className="h-4 w-4 text-primary" />
                        <b>{m.name}</b>
                        {m.dosage && <span className="text-ink-2">{m.dosage}</span>}
                      </div>
                      {(m.frequency || m.duration || m.instructions) && (
                        <div className="mt-1 pl-6 text-xs text-ink-2">
                          {[m.frequency, m.duration, m.instructions].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {(rx.doctorNotes || rx.notes) && (
                  <p className="mt-3 text-sm text-ink-2">
                    <b>Notes:</b> {rx.doctorNotes || rx.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New prescription modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
            onClick={(e) => e.target === e.currentTarget && !saving && setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.94, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 10 }}
              className="glass max-h-[92vh] w-full max-w-2xl overflow-y-auto p-6 shadow-glass-lg"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">New Prescription</h3>
                <button
                  onClick={() => !saving && setModalOpen(false)}
                  className="rounded-lg p-2 text-ink-3 hover:bg-primary-soft"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Patient selection */}
              <div className="mb-4">
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-2">
                  <UserRound className="h-4 w-4" /> Patient
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
                  <input
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setShowPatients(true);
                      setPatientId('');
                      setPatientName('');
                    }}
                    onFocus={() => setShowPatients(true)}
                    placeholder="Search patient by name, email or phone…"
                    className="input pl-10"
                  />
                  {showPatients && (
                    <div className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-border bg-card-solid shadow-glass-lg">
                      {patients.length === 0 ? (
                        <p className="p-3 text-sm text-ink-3">No patients found.</p>
                      ) : (
                        patients.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => pickPatient(p)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-primary-soft"
                          >
                            <span className="flex-1">
                              <b>{p.name}</b>
                              <span className="block text-xs text-ink-3">
                                {p.email} · {p.phone}
                              </span>
                            </span>
                            {patientId === p.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {patientName && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Selected: {patientName}
                  </p>
                )}
              </div>

              {/* Medicines */}
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-ink-2">Medicines</label>
                <Button variant="glass" size="sm" onClick={addMed} leftIcon={<Plus className="h-4 w-4" />}>
                  Add Medicine
                </Button>
              </div>
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

              {/* Notes */}
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
                <Button variant="glass" className="flex-1" onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={save} loading={saving} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
                  {saving ? 'Saving…' : 'Save Prescription'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { FileText, Printer, Download, Pill } from 'lucide-react';
import { patientApi } from '@/lib/patientApi';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Spinner';
import { formatDate, formatTime } from '@/lib/utils';
import type { PrescriptionRecord } from '@/types';

function formatRxDate(date: string | Date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return `${formatDate(d)} · ${formatTime(d)}`;
}

function prescriptionHTML(rx: PrescriptionRecord, patientName: string) {
  const doctor = (typeof rx.doctor === 'object' ? rx.doctor : { name: 'Doctor', specialty: '' }) as {
    name: string;
    specialty?: string;
  };
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
        <div style="margin-top:6px">Dr. ${doctor.name}<br/><span class="muted">${doctor.specialty || ''}</span></div>
        <div class="muted" style="margin-top:6px">${formatRxDate(rx.issuedAt)}</div>
      </div>
    </div>
    <h3 style="margin-top:20px">Patient: ${patientName}</h3>
    <h4 class="rx-title" style="margin:16px 0 8px">Medicines</h4>
    <ul>${meds || '<li>No medicines</li>'}</ul>
    ${rx.doctorNotes || rx.notes ? `<p style="margin-top:16px"><b>Doctor notes / advice:</b><br/>${rx.doctorNotes || rx.notes}</p>` : ''}
    <p style="margin-top:40px;text-align:right"><i>Signed electronically by Dr. ${doctor.name}</i></p>
  </body></html>`;
}

export function PrescriptionsView() {
  const toast = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ['patient', 'prescriptions'],
    queryFn: async () => (await patientApi.getPrescriptions()).data,
  });

  const print = (rx: PrescriptionRecord, patientName: string) => {
    const w = window.open('', '_blank', 'width=820,height=900');
    if (w) {
      w.document.write(prescriptionHTML(rx, patientName));
      w.document.close();
      w.focus();
      w.print();
    }
  };

  const download = (rx: PrescriptionRecord, patientName: string) => {
    const blob = new Blob([prescriptionHTML(rx, patientName)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prescription-${rx.id.slice(-6)}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast('success', 'Prescription downloaded');
  };

  if (isLoading) return <PageLoader label="Loading prescriptions" />;

  const prescriptions = data || [];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <h2 className="flex items-center gap-2 text-2xl font-bold">
        <FileText className="h-6 w-6 text-primary" /> Prescriptions
      </h2>

      {prescriptions.length === 0 ? (
        <div className="glass p-10 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-ink-3" />
          <p className="font-semibold">No prescriptions yet</p>
          <p className="text-sm text-ink-2">Prescriptions from your consultations will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((rx) => {
            const doctor = (typeof rx.doctor === 'object' ? rx.doctor : { name: 'Doctor', specialty: '' }) as {
              name: string;
              specialty?: string;
            };
            return (
              <div key={rx.id} className="glass glass-hover p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{doctor.name}</p>
                    <p className="text-sm text-ink-2">
                      {doctor.specialty || 'Physician'} · <span className="font-medium">{formatRxDate(rx.issuedAt)}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="glass" leftIcon={<Printer className="h-4 w-4" />} onClick={() => print(rx, '')}>
                      Print
                    </Button>
                    <Button size="sm" variant="glass" leftIcon={<Download className="h-4 w-4" />} onClick={() => download(rx, '')}>
                      Download
                    </Button>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {(rx.medicines || []).map((m, i) => (
                    <div key={i} className="rounded-xl bg-primary-soft/40 px-3 py-2 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill className="h-4 w-4 text-primary" />
                        <b>{m.name}</b>
                        {m.dosage && <span>{m.dosage}</span>}
                      </div>
                      {(m.frequency || m.duration || m.instructions) && (
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 pl-6 text-xs text-ink-2">
                          {m.frequency && <span><b className="text-ink-3">Frequency:</b> {m.frequency}</span>}
                          {m.duration && <span><b className="text-ink-3">Duration:</b> {m.duration}</span>}
                          {m.instructions && <span><b className="text-ink-3">Instructions:</b> {m.instructions}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {(rx.doctorNotes || rx.notes) && (
                  <p className="mt-3 rounded-xl bg-primary-soft/30 px-3 py-2 text-sm text-ink-2">
                    <b>Doctor notes / advice:</b> {rx.doctorNotes || rx.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

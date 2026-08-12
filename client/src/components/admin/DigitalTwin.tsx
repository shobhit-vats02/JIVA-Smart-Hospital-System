'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Building2, Users, Stethoscope, Activity, AlertTriangle } from 'lucide-react';
import { adminApi } from '@/lib/adminApi';
import { patientApi } from '@/lib/patientApi';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Spinner';
import type { Department, DoctorSummary } from '@/types';

/**
 * Digital Twin — an interactive hospital floor map. Click a department wing to
 * see live doctors, patients, queue and emergency status for that department.
 */
export function DigitalTwin() {
  const [selected, setSelected] = useState<Department | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const { data: deptsData, isLoading } = useQuery({
    queryKey: ['admin', 'departments'],
    queryFn: async () => (await adminApi.listDepartments()).data,
  });
  const depts = deptsData || [];

  const { data: doctorsData } = useQuery({
    queryKey: ['admin', 'doctors', 'all'],
    queryFn: async () => (await adminApi.listDoctors()).data,
  });

  const { data: apptsData } = useQuery({
    queryKey: ['admin', 'appointments', 'all'],
    queryFn: async () => (await adminApi.listAppointments({})).data,
  });

  if (isLoading) return <PageLoader label="Loading digital twin" />;

  const doctors = doctorsData || [];
  const appts = apptsData || [];
  const today = new Date().toISOString().slice(0, 10);
  const todayAppts = appts.filter((a) => a.date === today);

  const wings = ['Main Campus', 'South Wing', 'East Wing'];
  const wingDepts = (wing: string) => depts.filter((d) => d.wing === wing);

  const deptStats = (id: string) => {
    const doc = doctors.filter((d) => d.department && typeof d.department === 'object' && (d.department as { id: string }).id === id);
    const available = doc.filter((d) => d.isAvailable).length;
    const present = doc.filter((d) => d.isPresent).length;
    const deptAppts = todayAppts.filter((a) => a.department && typeof a.department === 'object' && (a.department as { id: string }).id === id);
    const waiting = deptAppts.filter((a) => a.status === 'waiting').length;
    const emergency = deptAppts.filter((a) => a.isEmergency).length;
    return { doctors: doc.length, available, present, waiting, emergency };
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Building2 className="h-6 w-6 text-primary" /> Digital Twin
        </h2>
        <span className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-ink-2">Live hospital model</span>
        </span>
      </div>

      {/* Floor map */}
      <div className="grid gap-4 lg:grid-cols-3">
        {wings.map((wing) => (
          <div key={wing} className="glass p-5">
            <p className="mb-3 font-semibold">{wing}</p>
            <div className="space-y-2">
              {wingDepts(wing).map((d) => {
                const s = deptStats(d.id);
                const isOpen = open === d.id;
                return (
                  <div key={d.id}>
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      onClick={() => {
                        setOpen(isOpen ? null : d.id);
                        setSelected(d);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all ${
                        isOpen ? 'border-primary bg-primary-soft' : 'border-border hover:bg-primary-soft/40'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{d.name}</span>
                      </span>
                      <Badge tone={s.emergency ? 'danger' : s.waiting ? 'warning' : 'success'} dot>
                        {s.emergency ? `${s.emergency} emerg` : s.waiting ? `${s.waiting} wait` : 'Open'}
                      </Badge>
                    </motion.button>

                    {isOpen && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                        <div className="mt-2 grid grid-cols-4 gap-2 rounded-xl bg-primary-soft/40 p-3 text-center">
                          <Mini icon={Stethoscope} label="Doctors" value={s.available} />
                          <Mini icon={Users} label="Present" value={s.present} />
                          <Mini icon={Activity} label="Waiting" value={s.waiting} />
                          <Mini icon={AlertTriangle} label="Emergency" value={s.emergency} />
                        </div>
                        {/* Department doctors */}
                        <div className="mt-2 space-y-1">
                          {doctors.filter((d) => d.department && typeof d.department === 'object' && (d.department as { id: string }).id === d.id).map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between rounded-lg bg-primary-soft/30 px-3 py-1.5 text-xs">
                              <span>{doc.name}</span>
                              <Badge tone={doc.isPresent ? 'success' : 'neutral'} dot>{doc.isPresent ? 'On duty' : 'Off'}</Badge>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Selected department detail */}
      {selected && (
        <div className="glass p-5">
          <p className="mb-2 font-semibold">{selected.name} — {selected.wing}</p>
          <p className="text-sm text-ink-2">{selected.description || 'Live operational view for this department.'}</p>
        </div>
      )}
    </div>
  );
}

function Mini({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div>
      <Icon className="mx-auto mb-1 h-4 w-4 text-primary" />
      <div className="text-lg font-bold text-ink">{value}</div>
      <div className="text-[10px] text-ink-3">{label}</div>
    </div>
  );
}

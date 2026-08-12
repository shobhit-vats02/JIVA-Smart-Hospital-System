'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Siren,
  Ambulance,
  BellRing,
  Phone,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  X,
  Plus,
  ShieldAlert,
  Users,
  Building2,
} from 'lucide-react';
import { adminApi } from '@/lib/adminApi';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';
import type { EmergencyCase } from '@/types';

const severityTone: Record<string, 'danger' | 'warning' | 'primary' | 'neutral'> = {
  critical: 'danger', high: 'warning', medium: 'primary', low: 'neutral',
};

export function EmergencyCenter() {
  const toast = useToast();
  const qc = useQueryClient();
  const { accessToken } = useAuth();
  const socket = useSocket(accessToken, !!accessToken);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ patientName: '', phone: '', description: '', severity: 'high' });
  const [saving, setSaving] = useState(false);
  const [modeOn, setModeOn] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'command'],
    queryFn: async () => (await adminApi.getCommandCenter()).data,
  });

  // Realtime emergency updates.
  useEffect(() => {
    const s = socket.current;
    if (!s) return;
    const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'command'] });
    const onAlert = (p: { message: string }) => { toast('warning', 'Emergency alert', p.message); refresh(); };
    const onMode = () => { setModeOn(true); toast('warning', 'Emergency mode activated'); };
    s.on('emergency:update', refresh);
    s.on('emergency:new', refresh);
    s.on('emergency:alert', onAlert);
    s.on('emergency:mode', onMode);
    return () => {
      s.off('emergency:update', refresh);
      s.off('emergency:new', refresh);
      s.off('emergency:alert', onAlert);
      s.off('emergency:mode', onMode);
    };
  }, [socket, qc, toast]);

  const act = async (id: string, fn: (id: string) => Promise<{ data: EmergencyCase }>, msg: string) => {
    await fn(id);
    toast('success', msg);
    qc.invalidateQueries({ queryKey: ['admin', 'command'] });
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.createEmergency(form);
      toast('success', 'Emergency case created');
      setCreateOpen(false);
      setForm({ patientName: '', phone: '', description: '', severity: 'high' });
      qc.invalidateQueries({ queryKey: ['admin', 'command'] });
    } catch (err) {
      toast('error', 'Could not create', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <PageLoader label="Loading command center" />;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Siren className="h-6 w-6 text-danger" /> Emergency Response Center
          </h2>
          <p className="text-ink-2">Hospital command center · {data?.activeCases} active case(s)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="danger" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>New emergency</Button>
          <Button variant="glass" leftIcon={<ShieldAlert className="h-4 w-4 text-amber-500" />} onClick={() => adminApi.activateEmergencyMode().then(() => { setModeOn(true); toast('success', 'Emergency mode activated'); })}>
            {modeOn ? 'Mode active' : 'Activate emergency mode'}
          </Button>
        </div>
      </div>

      {/* Status strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Status icon={Siren} label="Active cases" value={data?.activeCases} tone="text-danger" />
        <Status icon={Users} label="Doctors online" value={data?.onlineDoctors} tone="text-emerald-500" />
        <Status icon={Building2} label="Departments" value={data?.departments?.length} tone="text-primary" />
        <Status icon={Ambulance} label="Ambulances" value={data?.ambulances?.length} tone="text-amber-500" />
      </div>

      {/* Ambulance fleet */}
      <div className="glass p-6">
        <p className="mb-3 font-semibold">Ambulance fleet</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {(data?.ambulances || []).map((a) => (
            <div key={a.id} className="rounded-xl bg-primary-soft/40 p-4">
              <div className="flex items-center justify-between">
                <span className="font-bold">{a.id}</span>
                <Badge tone="success" dot>Ready</Badge>
              </div>
              <p className="text-sm text-ink-2">Driver: {a.driver}</p>
              <p className="text-xs text-ink-3">ETA {a.etaMinutes} min</p>
            </div>
          ))}
        </div>
      </div>

      {/* Active cases */}
      <div className="space-y-3">
        {(data?.active || []).map((c) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn('glass p-5', c.severity === 'critical' && 'border-danger/40')}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={cn('grid h-11 w-11 place-items-center rounded-2xl text-white', c.severity === 'critical' ? 'bg-gradient-to-br from-danger to-rose-600' : 'bg-gradient-to-br from-amber-500 to-orange-500')}>
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-bold">{c.patientName || 'Unknown patient'}</p>
                  <p className="text-xs text-ink-2">{c.description || 'No description'} · Priority #{c.priority}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Badge tone={severityTone[c.severity]}>{c.severity}</Badge>
                    <Badge tone="neutral">{c.status}</Badge>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <ActionBtn disabled={c.ambulanceDispatched} onClick={() => act(c.id, (id) => adminApi.dispatchAmbulance(id), `Ambulance dispatched (${c.ambulance?.id})`)} icon={Ambulance} label="Call ambulance" />
                <ActionBtn disabled={c.hospitalAlerted} onClick={() => act(c.id, (id) => adminApi.alertHospital(id), 'Hospital alerted')} icon={BellRing} label="Alert hospital" />
                <ActionBtn disabled={c.emergencyContactNotified} onClick={() => act(c.id, (id) => adminApi.notifyContact(id), 'Emergency contact notified')} icon={Phone} label="Notify contact" />
                <ActionBtn onClick={() => act(c.id, (id) => adminApi.shareLocation(id, { lat: 23.0, lng: 72.5, address: 'Shared' }), 'Location shared')} icon={MapPin} label="Share location" />
              </div>
            </div>

            {/* Ambulance status */}
            {c.ambulanceDispatched && (
              <div className="mt-3 rounded-xl bg-primary-soft/40 p-3">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span className="flex items-center gap-2 font-semibold">
                    <Ambulance className="h-4 w-4 text-danger" /> {c.ambulance?.id}
                  </span>
                  <span>Driver: {c.ambulance?.driver}</span>
                  <span className="flex items-center gap-1 text-amber-500">
                    <motion.span className="h-2 w-2 rounded-full bg-amber-500" animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} />
                    ETA {c.ambulance?.etaMinutes} min
                  </span>
                </div>
              </div>
            )}

            {/* Timeline */}
            {c.timeline?.length > 0 && (
              <div className="mt-3 border-t border-border pt-3">
                <div className="space-y-1">
                  {c.timeline.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-ink-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      {t.text}
                      <span className="ml-auto text-ink-3">{new Date(t.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 flex justify-end">
              <Button size="sm" variant="success" onClick={() => act(c.id, (id) => adminApi.updateEmergencyStatus(id, 'treated'), 'Marked treated')}>
                Mark treated
              </Button>
            </div>
          </motion.div>
        ))}
        {!data?.active?.length && (
          <div className="glass p-10 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
            <p className="font-semibold">No active emergencies</p>
            <p className="text-sm text-ink-2">The command center is standing by.</p>
          </div>
        )}
      </div>

      {/* Create modal */}
      <AnimatePresence>
        {createOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && setCreateOpen(false)}>
            <motion.div initial={{ scale: 0.94 }} animate={{ scale: 1 }} exit={{ scale: 0.94 }} className="glass w-full max-w-md p-6 shadow-glass-lg">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">New emergency case</h3>
                <button onClick={() => setCreateOpen(false)} className="rounded-lg p-2 text-ink-3 hover:bg-primary-soft"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={create} className="space-y-3">
                <input value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} placeholder="Patient name" className="input" />
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="input" />
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description / symptoms" className="input min-h-[80px] resize-none" />
                <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className="input">
                  <option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                </select>
                <Button type="submit" loading={saving} variant="danger" className="w-full" leftIcon={<Plus className="h-4 w-4" />}>Create case</Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Status({ icon: Icon, label, value, tone }: { icon: typeof Siren; label: string; value?: number; tone: string }) {
  return (
    <div className="glass glass-hover p-4">
      <Icon className={`mb-1 h-5 w-5 ${tone}`} />
      <div className={`font-display text-2xl font-bold ${tone}`}>{value ?? '—'}</div>
      <div className="text-xs text-ink-2">{label}</div>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick, disabled }: { icon: typeof Ambulance; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
        disabled
          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 cursor-default'
          : 'btn-glass hover:border-primary/40'
      )}
    >
      <Icon className="h-3.5 w-3.5" /> {disabled ? 'Done' : label}
    </button>
  );
}

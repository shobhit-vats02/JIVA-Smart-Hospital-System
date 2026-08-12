'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Siren,
  Ambulance,
  BellRing,
  Phone,
  Sparkles,
  AlertTriangle,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { patientApi } from '@/lib/patientApi';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { EmergencyCase } from '@/types';

const severityTone: Record<string, 'danger' | 'warning' | 'primary' | 'neutral'> = {
  critical: 'danger', high: 'warning', medium: 'primary', low: 'neutral',
};

export function PatientEmergency() {
  const toast = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('high');
  const [submitting, setSubmitting] = useState(false);

  const { data: casesData } = useQuery({
    queryKey: ['patient', 'emergencies'],
    queryFn: async () => (await patientApi.listEmergencies()).data,
  });
  const myCases = (casesData || []) as EmergencyCase[];

  const raiseEmergency = async () => {
    setSubmitting(true);
    try {
      const res = await patientApi.createEmergency({ description, severity });
      // Auto-trigger the full response flow for the patient.
      await patientApi.emergencyAction(res.data.id, 'dispatch');
      await patientApi.emergencyAction(res.data.id, 'alert');
      await patientApi.emergencyAction(res.data.id, 'contact');
      toast('success', 'Emergency raised', 'Ambulance dispatched and hospital alerted.');
      setDescription('');
      qc.invalidateQueries({ queryKey: ['patient', 'emergencies'] });
    } catch (e) {
      toast('error', 'Could not raise emergency', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const action = async (id: string, act: 'dispatch' | 'alert' | 'contact', msg: string) => {
    await patientApi.emergencyAction(id, act);
    toast('success', msg);
    qc.invalidateQueries({ queryKey: ['patient', 'emergencies'] });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h2 className="flex items-center gap-2 text-2xl font-bold">
        <Siren className="h-6 w-6 text-danger" /> Emergency
      </h2>

      {/* Raise emergency */}
      <div className="glass glow-border border-danger/30 p-6">
        <p className="mb-4 flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-5 w-5 text-danger" /> Need urgent help?
        </p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the emergency (e.g. severe chest pain, difficulty breathing)…"
          className="input min-h-[100px] resize-none"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-violet" />
            <span className="text-ink-2">AI severity:</span>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="input w-32">
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <Button className="ml-auto" variant="danger" loading={submitting} leftIcon={<Siren className="h-4 w-4" />} onClick={raiseEmergency}>
            Raise emergency
          </Button>
        </div>
      </div>

      {/* Active cases */}
      <div className="space-y-3">
        {myCases.map((c) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold">Case #{c.id.slice(-6).toUpperCase()}</p>
                  <Badge tone={severityTone[c.severity]}>{c.severity}</Badge>
                  <Badge tone="neutral">{c.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-ink-2">{c.description || 'No description'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionBtn disabled={c.ambulanceDispatched} icon={Ambulance} label="Call ambulance" onClick={() => action(c.id, 'dispatch', 'Ambulance dispatched')} />
                <ActionBtn disabled={c.hospitalAlerted} icon={BellRing} label="Alert hospital" onClick={() => action(c.id, 'alert', 'Hospital alerted')} />
                <ActionBtn disabled={c.emergencyContactNotified} icon={Phone} label="Notify contact" onClick={() => action(c.id, 'contact', 'Contact notified')} />
              </div>
            </div>

            {c.ambulanceDispatched && (
              <div className="mt-3 flex flex-wrap items-center gap-4 rounded-xl bg-primary-soft/40 p-3 text-sm">
                <span className="flex items-center gap-2 font-semibold"><Ambulance className="h-4 w-4 text-danger" /> {c.ambulance?.id}</span>
                <span>Driver: {c.ambulance?.driver}</span>
                <span className="flex items-center gap-1 text-amber-500">
                  <motion.span className="h-2 w-2 rounded-full bg-amber-500" animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} />
                  ETA {c.ambulance?.etaMinutes} min
                </span>
                <span className="flex items-center gap-1 text-ink-2"><Building2 className="h-3.5 w-3.5" /> JIVA Main Campus</span>
              </div>
            )}

            {c.timeline?.length > 0 && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="mb-2 text-xs font-semibold uppercase text-ink-3">Timeline</p>
                <div className="space-y-1">
                  {c.timeline.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-ink-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> {t.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ))}
        {!myCases.length && (
          <div className="glass p-8 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
            <p className="font-semibold">No emergency cases</p>
            <p className="text-sm text-ink-2">Raise an emergency above if you need help.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick, disabled }: { icon: typeof Ambulance; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
        disabled ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 cursor-default' : 'btn-glass'
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {disabled ? 'Done' : label}
    </button>
  );
}

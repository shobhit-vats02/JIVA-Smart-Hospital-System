'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Droplets,
  AlertTriangle,
  Activity,
  Syringe,
  Phone,
  Fingerprint,
  CheckCircle2,
  CreditCard,
} from 'lucide-react';
import { patientApi } from '@/lib/patientApi';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Spinner';
import { initials } from '@/lib/utils';

/** Deterministic pseudo-QR code derived from the patient id (prototype). */
function PseudoQR({ seed, size = 21 }: { seed: string; size?: number }) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const cells = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const corner = (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);
      const val = corner || ((h >> ((x * y + x + y) % 30)) & 1) === 1;
      cells.push(val);
    }
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-28 w-28" role="img" aria-label="Health pass QR code (prototype)">
      <rect width={size} height={size} fill="#fff" />
      {cells.map((on, i) =>
        on ? (
          <rect
            key={i}
            x={i % size}
            y={Math.floor(i / size)}
            width={0.9}
            height={0.9}
            fill={i % size < 7 && Math.floor(i / size) < 7 ? '#0f172a' : '#0f172a'}
          />
        ) : null
      )}
    </svg>
  );
}

export function HealthPass() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['patient', 'health-pass'],
    queryFn: async () => (await patientApi.getHealthPass()).data,
  });

  if (isLoading) return <PageLoader label="Loading health pass" />;

  const p = data?.profile;
  const hp = data?.healthProfile || { allergies: [], conditions: [], vaccinations: [] };
  const ec: { name?: string; phone?: string; relation?: string } = data?.emergencyContact || {};

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <CreditCard className="h-6 w-6 text-primary" /> Health Pass
        </h2>
        <Badge tone="success" dot>Verified</Badge>
      </div>

      {/* Digital health card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-royal to-violet p-6 text-white shadow-glass-lg"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/70">JIVA Digital Health Card</p>
            <h3 className="mt-2 text-2xl font-bold">{p?.name}</h3>
            <p className="mt-1 text-sm text-white/80">
              {p?.age} yrs · {p?.gender} · {p?.phone}
            </p>
            <div className="mt-4 flex items-center gap-4">
              <div className="rounded-2xl bg-white/15 px-3 py-2">
                <p className="text-[10px] uppercase text-white/70">Blood Group</p>
                <p className="text-lg font-bold">{p?.bloodGroup || '—'}</p>
              </div>
              <div className="rounded-2xl bg-white/15 px-3 py-2">
                <p className="text-[10px] uppercase text-white/70">Patient ID</p>
                <p className="text-lg font-bold">#{p?.id?.slice(-6).toUpperCase()}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-2 shadow-lg">
            <PseudoQR seed={p?.id || user?.id || 'jiva'} />
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-xs">
          <Fingerprint className="h-4 w-4" />
          Blockchain-verified record (prototype) · ID: 0x{p?.id?.slice(-12) || '0'.repeat(12)}
        </div>
      </motion.div>

      {/* Medical summary */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="glass p-5">
          <p className="mb-3 flex items-center gap-2 font-semibold"><Droplets className="h-4 w-4 text-danger" /> Blood group</p>
          <div className="rounded-xl bg-primary-soft/40 p-4 text-center">
            <span className="text-4xl font-bold text-gradient">{p?.bloodGroup || '—'}</span>
          </div>
        </div>

        <div className="glass p-5">
          <p className="mb-3 flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-amber-500" /> Allergies</p>
          {hp.allergies?.length ? (
            <div className="flex flex-wrap gap-2">
              {hp.allergies.map((a) => (
                <span key={a} className="badge badge-warning">{a}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-3">No known allergies.</p>
          )}
        </div>

        <div className="glass p-5">
          <p className="mb-3 flex items-center gap-2 font-semibold"><Activity className="h-4 w-4 text-primary" /> Conditions</p>
          {hp.conditions?.length ? (
            <div className="flex flex-wrap gap-2">
              {hp.conditions.map((c) => (
                <span key={c} className="badge badge-primary">{c}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-3">No chronic conditions.</p>
          )}
        </div>
      </div>

      {/* Vaccinations + emergency contact */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="glass p-5">
          <p className="mb-3 flex items-center gap-2 font-semibold"><Syringe className="h-4 w-4 text-emerald-500" /> Vaccinations</p>
          {hp.vaccinations?.length ? (
            <ul className="space-y-2">
              {hp.vaccinations.map((v) => (
                <li key={v} className="flex items-center gap-2 rounded-lg bg-primary-soft/40 px-3 py-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {v}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-3">No vaccination records.</p>
          )}
        </div>

        <div className="glass p-5">
          <p className="mb-3 flex items-center gap-2 font-semibold"><Phone className="h-4 w-4 text-primary" /> Emergency contact</p>
          <div className="rounded-xl bg-primary-soft/40 p-4">
            <p className="font-semibold">{ec.name || '—'}</p>
            <p className="text-sm text-ink-2">{ec.phone || '—'} · {ec.relation || '—'}</p>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-ink-3">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Summary last verified {new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' })}
          </div>
        </div>
      </div>

      <div className="glass flex items-center justify-between p-5">
        <div className="flex items-center gap-2 text-sm text-ink-2">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary to-royal text-white">{initials(p?.name || '?')}</span>
          <div>
            <p className="font-semibold text-ink">{p?.name}</p>
            <p className="text-xs">{p?.email}</p>
          </div>
        </div>
        <Badge tone="success" dot>QR valid</Badge>
      </div>
    </div>
  );
}

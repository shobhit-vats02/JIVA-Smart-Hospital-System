'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScanFace,
  CreditCard,
  Bluetooth,
  Wifi,
  MapPin,
  BrainCircuit,
  Check,
  X,
  Loader2,
  Camera,
  ShieldCheck,
} from 'lucide-react';
import { doctorApi } from '@/lib/doctorApi';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { PresenceState } from '@/types';

type Method = 'face' | 'rfid' | 'bluetooth' | 'wifi' | 'gps';

const METHOD_META: Record<Method, { label: string; desc: string; icon: typeof ScanFace }> = {
  face: { label: 'Face Recognition', desc: 'Open webcam & capture', icon: ScanFace },
  rfid: { label: 'RFID Card', desc: 'Scan your hospital card', icon: CreditCard },
  bluetooth: { label: 'Bluetooth', desc: 'Detect registered device', icon: Bluetooth },
  wifi: { label: 'Hospital WiFi', desc: 'Confirm network', icon: Wifi },
  gps: { label: 'GPS Geofence', desc: 'Verify you are on-site', icon: MapPin },
};

export function PresenceVerification() {
  const toast = useToast();
  const qc = useQueryClient();
  const { accessToken } = useAuth();
  const socket = useSocket(accessToken, !!accessToken);

  const [state, setState] = useState<PresenceState | null>(null);
  const [done, setDone] = useState<Record<Method, boolean>>({
    face: false, rfid: false, bluetooth: false, wifi: false, gps: false,
  });
  const [scanning, setScanning] = useState<Method | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [activated, setActivated] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useQuery({
    queryKey: ['doctor', 'presence'],
    queryFn: async () => {
      const res = await doctorApi.getPresenceState();
      setState(res.data);
      setConfidence(res.data.presenceConfidence);
      setActivated(res.data.isAvailable);
      return res.data;
    },
  });

  // Listen for realtime presence activation.
  useEffect(() => {
    const s = socket.current;
    if (!s) return;
    const onActivate = (p: { confidence: number; isAvailable: boolean }) => {
      setConfidence(p.confidence);
      setActivated(p.isAvailable);
      if (p.isAvailable) toast('success', 'Presence activated', 'You are now available. Queue is live.');
    };
    const onStatus = (p: { confidence: number; activated: boolean }) => {
      setConfidence(p.confidence);
    };
    s.on('presence:activated', onActivate);
    s.on('presence:status', onStatus);
    return () => {
      s.off('presence:activated', onActivate);
      s.off('presence:status', onStatus);
    };
  }, [socket, toast]);

  // Cleanup camera.
  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  const startScan = async (method: Method) => {
    setScanning(method);
    // Simulated verification delays per method.
    const wait = method === 'face' ? 2200 : method === 'rfid' ? 1400 : 900;
    await sleep(wait);
    try {
      let res;
      switch (method) {
        case 'face':
          await openCamera();
          res = await doctorApi.verifyFace(0.98);
          break;
        case 'rfid':
          res = await doctorApi.verifyRfid(state?.lastLog ? 'RFID-CARD-1001' : 'RFID-CARD-1001');
          break;
        case 'bluetooth':
          res = await doctorApi.verifyBluetooth(state?.hospital?.bluetoothDevice || 'JIVA-BLE-01');
          break;
        case 'wifi':
          res = await doctorApi.verifyWifi(state?.hospital?.wifiSSID || 'JIVA-HOSPITAL');
          break;
        case 'gps':
          res = await doctorApi.verifyGps(23.0225, 72.5714);
          break;
      }
      const verified = res?.data?.verified;
      setDone((d) => ({ ...d, [method]: verified }));
      if (verified) {
        toast('success', `${METHOD_META[method].label} verified`);
      } else {
        toast('warning', `${METHOD_META[method].label} failed`, 'Please retry.');
      }
      stopCamera();
    } catch (e) {
      toast('error', 'Verification failed', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setScanning(null);
      stopCamera();
    }
  };

  const runAI = async () => {
    try {
      const res = await doctorApi.runConfidence();
      setConfidence(res.data.confidence);
      setActivated(res.data.activated);
      if (res.data.activated) {
        setCheckedIn(true);
        toast('success', 'Presence activated', `You're on duty with ${res.data.confidence}% confidence.`);
      } else {
        toast('warning', 'Not yet activated', 'Complete more verification methods to reach >90%.');
      }
      qc.invalidateQueries({ queryKey: ['doctor'] });
    } catch (e) {
      toast('error', 'AI engine error', e instanceof Error ? e.message : 'Try again.');
    }
  };

  const manual = async () => {
    await doctorApi.manualActivate();
    setActivated(true);
    setConfidence(100);
    setCheckedIn(true);
    toast('success', 'Presence manually confirmed');
    qc.invalidateQueries({ queryKey: ['doctor'] });
  };

  async function openCamera() {
    try {
      const s = await navigator.mediaDevices?.getUserMedia({ video: true });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play().catch(() => {});
      }
    } catch {
      // Camera unavailable — still allow the prototype to proceed.
    }
  }
  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  const allDone = Object.values(done).every(Boolean);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="text-center">
        <h2 className="flex items-center justify-center gap-2 text-2xl font-bold">
          <ShieldCheck className="h-6 w-6 text-primary" /> Presence Verification
        </h2>
        <p className="text-ink-2">
          Doctors cannot go on duty immediately after login. Complete verification to activate.
        </p>
      </div>

      {/* Camera preview (shown when scanning face) */}
      <AnimatePresence>
        {scanning === 'face' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800">
              <video ref={videoRef} className="h-64 w-full object-cover" muted playsInline />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  className="h-28 w-28 rounded-full border-2 border-primary/60"
                  animate={{ scale: [1, 1.08, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
              </div>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg bg-black/50 px-3 py-1 text-xs text-white">
                Scanning face… please look at the camera
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Method cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {(Object.keys(METHOD_META) as Method[]).map((m) => {
          const meta = METHOD_META[m];
          const MIcon = meta.icon;
          const isScanning = scanning === m;
          const isDone = done[m];
          return (
            <motion.button
              key={m}
              whileTap={{ scale: 0.98 }}
              onClick={() => !isScanning && !isDone && startScan(m)}
              disabled={isScanning || isDone}
              className={cn(
                'glass flex items-center gap-4 p-5 text-left transition-all',
                isDone ? 'border-emerald-500/40' : 'hover:border-primary/40'
              )}
            >
              <span
                className={cn(
                  'grid h-12 w-12 shrink-0 place-items-center rounded-2xl',
                  isDone
                    ? 'bg-emerald-500/15 text-emerald-500'
                    : 'bg-gradient-to-br from-primary to-royal text-white'
                )}
              >
                {isDone ? <Check className="h-6 w-6" /> : isScanning ? <Loader2 className="h-5 w-5 animate-spin" /> : <MIcon className="h-6 w-6" />}
              </span>
              <span className="flex-1">
                <span className="block font-semibold">{meta.label}</span>
                <span className="block text-xs text-ink-2">{meta.desc}</span>
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Confidence engine */}
      <div className="glass glow-border p-6">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 font-semibold">
            <BrainCircuit className="h-5 w-5 text-violet" /> AI Presence Confidence Engine
          </p>
          <Button onClick={runAI} loading={scanning === null && false} variant="primary" leftIcon={<BrainCircuit className="h-4 w-4" />}>
            Evaluate confidence
          </Button>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-ink-2">Overall confidence</span>
            <span className={cn('font-bold', activated ? 'text-emerald-500' : confidence > 50 ? 'text-amber-500' : 'text-ink')}>
              {confidence}%
            </span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-primary-soft">
            <motion.div
              className={cn('h-full rounded-full', activated ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-primary to-violet')}
              animate={{ width: `${confidence}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
          <p className="mt-2 text-sm text-ink-2">
            {activated
              ? `Activated at ${confidence}% — above the 90% threshold. Queue is live.`
              : allDone
                ? `All methods complete (${confidence}%). ${confidence > 90 ? 'Run evaluate to activate.' : 'Check the methods above.'}`
                : `Verify methods above, then evaluate. Threshold is 90%.`}
          </p>
        </div>

        {activated && (
          <div className="mt-4 rounded-xl bg-emerald-500/10 p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" /> Doctor activated — appointments & queue are enabled
            </p>
          </div>
        )}
      </div>

      {!activated && (
        <button onClick={manual} className="btn-glass w-full rounded-xl px-4 py-2.5 text-sm font-medium">
          Manual override (admin/on-site confirmation)
        </button>
      )}
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

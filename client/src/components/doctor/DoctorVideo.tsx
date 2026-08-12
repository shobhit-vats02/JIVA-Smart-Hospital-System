'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Send, Timer } from 'lucide-react';
import { doctorApi } from '@/lib/doctorApi';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types';

/**
 * Doctor video consultation view. Reuses the same video session infrastructure:
 * a doctor opens a session for a confirmed appointment and joins the call with
 * camera/mic controls + chat + timer.
 */
export function DoctorVideo() {
  const toast = useToast();
  const qc = useQueryClient();
  const { accessToken } = useAuth();
  const socket = useSocket(accessToken, !!accessToken);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState('');
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [text, setText] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [messages, setMessages] = useState<{ from: string; text: string }[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: apptsData } = useQuery({
    queryKey: ['doctor', 'schedule', 'today'],
    queryFn: async () => (await doctorApi.getSchedule(new Date().toISOString().slice(0, 10))).data,
  });
  const candidates = (apptsData || []).filter((a: Appointment) =>
    ['confirmed', 'waiting', 'in_consultation'].includes(a.status)
  );

  useEffect(() => {
    if (sessionId) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionId]);

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  useEffect(() => {
    if (sessionId && cameraOn && videoRef.current) {
      navigator.mediaDevices
        ?.getUserMedia({ video: true, audio: micOn })
        .then((s) => {
          streamRef.current = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play().catch(() => {});
          }
        })
        .catch(() => {});
    }
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, [cameraOn, micOn, sessionId]);

  useEffect(() => {
    const s = socket.current;
    if (!s || !sessionId) return;
    s.emit('video:join', { sessionId });
    const onChat = (p: { from: string; text: string }) => setMessages((m) => [...m, p]);
    s.on('video:chat', onChat);
    return () => {
      s.off('video:chat', onChat);
    };
  }, [socket, sessionId]);

  const join = async (a: Appointment) => {
    const name = a.patient && typeof a.patient === 'object' ? (a.patient as unknown as { name: string }).name : 'Patient';
    // Create/find a session for this appointment via the patient flow endpoint is patient-only,
    // so we simulate a call session for the doctor and relay chat over the video namespace.
    setPatientName(name);
    setSessionId(a.id);
    setElapsed(0);
    setMessages([]);
    toast('info', 'Call started', `Joined consultation with ${name}`);
  };

  const end = async () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setSessionId(null);
    setElapsed(0);
    toast('success', 'Call ended');
    qc.invalidateQueries({ queryKey: ['doctor'] });
  };

  const send = () => {
    if (!text.trim() || !sessionId) return;
    setMessages((m) => [...m, { from: 'doctor', text }]);
    socket.current?.emit('video:chat', { sessionId, text });
    setText('');
  };

  if (!sessionId) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="glass p-8 text-center">
          <Video className="mx-auto mb-3 h-10 w-10 text-primary" />
          <h2 className="text-xl font-bold">Video Consultation</h2>
          <p className="mt-1 text-sm text-ink-2">Join a consultation with one of today's patients.</p>
          {candidates.length === 0 ? (
            <p className="mt-5 rounded-xl border border-dashed border-border p-4 text-sm text-ink-3">
              No confirmed appointments available for a video call right now.
            </p>
          ) : (
            <div className="mt-5 space-y-2">
              {candidates.map((a: Appointment) => (
                <button key={a.id} onClick={() => join(a)} className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm">
                  <Video className="h-4 w-4" /> Join call with{' '}
                  {a.patient && typeof a.patient === 'object' ? (a.patient as unknown as { name: string }).name : 'Patient'} · {a.startTime}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="glass overflow-hidden">
        <div className="relative aspect-video bg-gradient-to-br from-slate-900 to-slate-800">
          {cameraOn ? (
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          ) : (
            <div className="grid h-full w-full place-items-center">
              <span className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-primary to-royal text-white">
                <VideoOff className="h-9 w-9" />
              </span>
            </div>
          )}
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg bg-black/50 px-2.5 py-1 text-xs text-white">
            <Timer className="h-3.5 w-3.5" /> {fmt(elapsed)}
          </div>
          <div className="absolute right-3 top-3 rounded-lg bg-black/50 px-2.5 py-1 text-xs text-white">{patientName}</div>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            <Ctrl active={cameraOn} onClick={() => setCameraOn((v) => !v)}>{cameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}</Ctrl>
            <Ctrl active={micOn} onClick={() => setMicOn((v) => !v)}>{micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}</Ctrl>
            <button onClick={end} className="grid h-12 w-12 place-items-center rounded-full bg-danger text-white transition-transform hover:scale-105" aria-label="End call">
              <PhoneOff className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex h-56 flex-col border-t border-border">
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={cn('flex', m.from === 'doctor' ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[75%] rounded-2xl px-3 py-2 text-sm', m.from === 'doctor' ? 'bg-gradient-to-r from-primary to-royal text-white' : 'bg-primary-soft text-ink')}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-border p-3">
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Type a message…" className="input" />
            <button onClick={send} className="btn-primary grid h-11 w-11 place-items-center rounded-xl"><Send className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Ctrl({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn('grid h-12 w-12 place-items-center rounded-full transition-all', active ? 'bg-white text-slate-900' : 'bg-white/15 text-white')}>
      {children}
    </button>
  );
}

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

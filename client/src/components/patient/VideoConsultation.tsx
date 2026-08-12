'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Send,
  MessageSquare,
  Timer,
  Loader2,
} from 'lucide-react';
import { patientApi } from '@/lib/patientApi';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import type { VideoSession, Appointment } from '@/types';

export function VideoConsultation() {
  const toast = useToast();
  const qc = useQueryClient();
  const { accessToken } = useAuth();
  const socket = useSocket(accessToken, !!accessToken);

  const [session, setSession] = useState<VideoSession | null>(null);
  const [joining, setJoining] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [text, setText] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [messages, setMessages] = useState<VideoSession['messages']>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: apptsData } = useQuery({
    queryKey: ['patient', 'appointments', 'upcoming'],
    queryFn: async () => (await patientApi.listAppointments('upcoming')).data,
  });
  const candidates = (apptsData || []).filter((a: Appointment) =>
    ['confirmed', 'waiting', 'in_consultation'].includes(a.status)
  );

  // Timer for the call.
  useEffect(() => {
    if (session?.status === 'active') {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session?.status]);

  // Cleanup stream on unmount.
  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  // Apply camera on/off + subscribe to chat relay via socket.
  useEffect(() => {
    if (session?.status === 'active' && cameraOn && videoRef.current) {
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
  }, [cameraOn, micOn, session?.status]);

  // Socket chat relay for the session room.
  useEffect(() => {
    const s = socket.current;
    if (!s || !session?.id) return;
    s.emit('video:join', { sessionId: session.id });
    const onChat = (p: { from: string; text: string; at: string }) => {
      setMessages((m) => [...m, { from: p.from as 'patient' | 'doctor', text: p.text, at: p.at }]);
    };
    s.on('video:chat', onChat);
    return () => {
      s.off('video:chat', onChat);
    };
  }, [socket, session?.id]);

  const join = async (appointmentId: string) => {
    setJoining(true);
    try {
      const res = await patientApi.createVideoSession(appointmentId);
      setSession(res.data);
      setMessages(res.data.messages || []);
      toast('info', 'Consultation room ready', 'Starting the call…');
      await patientApi.startVideo(res.data.id);
      setSession((prev) => (prev ? { ...prev, status: 'active' } : prev));
    } catch (e) {
      toast('error', 'Could not start video', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setJoining(false);
    }
  };

  const endCall = async () => {
    if (session?.id) {
      await patientApi.endVideo(session.id);
      qc.invalidateQueries({ queryKey: ['patient', 'appointments'] });
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setSession(null);
    setElapsed(0);
    toast('success', 'Call ended');
  };

  const sendChat = async () => {
    if (!text.trim() || !session?.id) return;
    const body = text.trim();
    setMessages((m) => [...m, { from: 'patient', text: body, at: new Date().toISOString() }]);
    setText('');
    socket.current?.emit('video:chat', { sessionId: session.id, text: body });
    await patientApi.sendVideoMessage(session.id, body).catch(() => {});
  };

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="glass p-8 text-center">
          <Video className="mx-auto mb-3 h-10 w-10 text-primary" />
          <h2 className="text-xl font-bold">Video Consultation</h2>
          <p className="mt-1 text-sm text-ink-2">Start a consultation with your doctor from a confirmed appointment.</p>

          {candidates.length === 0 ? (
            <p className="mt-5 rounded-xl border border-dashed border-border p-4 text-sm text-ink-3">
              No confirmed appointments available for a video call yet.
            </p>
          ) : (
            <div className="mt-5 space-y-2">
              {candidates.map((a: Appointment) => (
                <button
                  key={a.id}
                  onClick={() => join(a.id)}
                  disabled={joining}
                  className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium"
                >
                  {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                  Join call with {typeof a.doctor === 'object' ? a.doctor.name : 'doctor'} · {a.startTime}
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
        {/* Video area */}
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

          {/* Timer */}
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg bg-black/50 px-2.5 py-1 text-xs font-medium text-white">
            <Timer className="h-3.5 w-3.5" /> {fmtTime(elapsed)}
          </div>

          {/* Doctor label */}
          <div className="absolute right-3 top-3 rounded-lg bg-black/50 px-2.5 py-1 text-xs font-medium text-white">
            {typeof session.doctor === 'object' ? session.doctor.name : 'Doctor'}
          </div>

          {/* Controls */}
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            <CtrlBtn active={cameraOn} onClick={() => setCameraOn((v) => !v)} label="Camera">
              {cameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </CtrlBtn>
            <CtrlBtn active={micOn} onClick={() => setMicOn((v) => !v)} label="Microphone">
              {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </CtrlBtn>
            <CtrlBtn active={chatOpen} onClick={() => setChatOpen((v) => !v)} label="Chat">
              <MessageSquare className="h-5 w-5" />
            </CtrlBtn>
            <button
              onClick={endCall}
              className="grid h-12 w-12 place-items-center rounded-full bg-danger text-white shadow-lg transition-transform hover:scale-105"
              aria-label="End call"
            >
              <PhoneOff className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Chat panel */}
        {chatOpen && (
          <div className="flex h-64 flex-col border-t border-border">
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {messages.length === 0 && (
                <p className="text-center text-sm text-ink-3">Start the conversation…</p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={cn('flex', m.from === 'patient' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[75%] rounded-2xl px-3 py-2 text-sm',
                      m.from === 'patient' ? 'bg-gradient-to-r from-primary to-royal text-white' : 'bg-primary-soft text-ink'
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 border-t border-border p-3">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                placeholder="Type a message…"
                className="input"
              />
              <button onClick={sendChat} className="btn-primary grid h-11 w-11 place-items-center rounded-xl">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="mt-3 text-center text-xs text-ink-3">
        Video consultation prototype · camera &amp; mic use local preview · chat is persisted to the backend.
      </p>
    </div>
  );
}

function CtrlBtn({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        'grid h-12 w-12 place-items-center rounded-full transition-all',
        active ? 'bg-white text-slate-900' : 'bg-white/15 text-white'
      )}
    >
      {children}
    </button>
  );
}

function fmtTime(s: number) {
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

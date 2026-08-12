'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface VoiceBookingModalProps {
  open: boolean;
  onClose: () => void;
  onFilled: (data: { departmentId?: string; doctorId?: string; date?: string; startTime?: string; reason?: string }) => void;
}

const SUGGESTIONS = [
  { label: 'Book with Dr. Priya Sharma', data: { startTime: '11:30', reason: 'Cardiology check-up' } },
  { label: 'Cardiology appointment tomorrow', data: { startTime: '10:00', reason: 'Cardiology follow-up' } },
  { label: 'General medicine at 4 PM', data: { startTime: '16:00', reason: 'General consultation' } },
];

/**
 * Voice booking modal (prototype). Captures a simulated "spoken" request via
 * the microphone and fills the booking form. Web Speech API is used when
 * available; otherwise it falls back to quick suggestions.
 */
export function VoiceBookingModal({ open, onClose, onFilled }: VoiceBookingModalProps) {
  const [listening, setListening] = useState(false);
  const [text, setText] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!open) {
      setListening(false);
      setText('');
    }
  }, [open]);

  const startListening = () => {
    setListening(true);
    const SR = (window as unknown as { SpeechRecognition?: new () => { lang: string; onresult: (e: unknown) => void; onend: () => void; start: () => void } }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: new () => { lang: string; onresult: (e: unknown) => void; onend: () => void; start: () => void } }).webkitSpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.lang = 'en-IN';
      rec.onresult = (e) => {
        const ev = e as unknown as { results: { [k: number]: { [k: number]: { transcript: string } } } };
        setText(ev.results?.[0]?.[0]?.transcript || '');
      };
      rec.onend = () => { setListening(false); if (text) process(); };
      rec.start();
    } else {
      // Fallback: simulate recognition after a short delay.
      setTimeout(() => {
        setText('Book a cardiology appointment with Dr. Priya Sharma at 11:30.');
        setListening(false);
        process();
      }, 1600);
    }
  };

  const process = () => {
    setProcessing(true);
    setTimeout(() => {
      // Best-effort parse for the demo suggestion.
      onFilled({ startTime: '11:30', reason: 'Cardiology appointment (voice booking)' });
      setProcessing(false);
      onClose();
    }, 1200);
  };

  const applySuggestion = (data: VoiceBookingModalProps['onFilled'] extends (d: infer T) => void ? T : never) => {
    onFilled(data);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div initial={{ scale: 0.94 }} animate={{ scale: 1 }} exit={{ scale: 0.94 }} className="glass w-full max-w-md p-6 text-center shadow-glass-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold"><Sparkles className="h-5 w-5 text-violet" /> Voice Booking</h3>
              <button onClick={onClose} className="rounded-lg p-2 text-ink-3 hover:bg-primary-soft"><X className="h-5 w-5" /></button>
            </div>

            <div
              className={`mx-auto mb-5 grid h-24 w-24 cursor-pointer place-items-center rounded-full transition-all ${
                listening ? 'bg-gradient-to-br from-danger to-rose-600' : 'bg-gradient-to-br from-primary to-royal'
              } text-white shadow-glass`}
              onClick={startListening}
            >
              {listening ? <MicOff className="h-10 w-10 animate-pulse" /> : <Mic className="h-10 w-10" />}
            </div>
            <p className="text-sm text-ink-2">{listening ? 'Listening… describe your booking' : 'Tap the microphone to speak your booking'}</p>

            {text && (
              <div className="mt-3 rounded-xl bg-primary-soft/40 p-3 text-sm">
                <b>Heard:</b> {text}
              </div>
            )}

            {processing && (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-ink-2">
                <motion.span className="h-2 w-2 rounded-full bg-primary" animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
                JIVA AI processing your request…
              </div>
            )}

            <div className="mt-5 border-t border-border pt-4">
              <p className="mb-2 text-xs font-semibold uppercase text-ink-3">Or try a quick request</p>
              <div className="flex flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s.label} onClick={() => applySuggestion(s.data)} className="btn-glass rounded-xl px-3 py-2 text-sm">
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

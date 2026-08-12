'use client';

import { motion } from 'framer-motion';
import { Video, Mic, MessageSquare, FileText, Timer, PhoneOff } from 'lucide-react';

const controls = [
  { icon: Video, label: 'Camera', active: true },
  { icon: Mic, label: 'Microphone', active: true },
  { icon: MessageSquare, label: 'Chat', active: false },
  { icon: FileText, label: 'Prescription', active: false },
  { icon: Timer, label: 'Timer', active: false },
  { icon: PhoneOff, label: 'End call', active: false },
];

export function VideoSection() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative order-2 lg:order-1"
        >
          <div className="glass glow-border overflow-hidden p-4 shadow-glass-lg">
            <div className="relative aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-slate-900">
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-primary to-royal text-white">
                    <Video className="h-7 w-7" />
                  </div>
                  <p className="text-sm font-medium text-white/90">Patient &amp; Doctor in call</p>
                  <p className="text-xs text-white/50">Dr. Priya Sharma · Cardiology</p>
                </div>
              </div>
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
                {controls.map((c, i) => (
                  <motion.button
                    key={c.label}
                    whileHover={{ y: -2 }}
                    className={`grid h-11 w-11 place-items-center rounded-full ${
                      c.active ? 'bg-white text-slate-900' : 'bg-white/15 text-white'
                    }`}
                    aria-label={c.label}
                  >
                    <c.icon className="h-5 w-5" />
                  </motion.button>
                ))}
              </div>
              <div className="absolute right-3 top-3 rounded-lg bg-black/40 px-2 py-1 text-xs font-medium text-white">
                <Timer className="mr-1 inline h-3.5 w-3.5" /> 04:32
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-ink-3">
              In-platform video consultations with chat, doctor notes &amp; prescriptions.
            </p>
          </div>
        </motion.div>

        <div className="order-1 lg:order-2">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="badge badge-primary mb-5"
          >
            <Video className="h-3.5 w-3.5" /> Video Consultations
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-bold sm:text-5xl"
          >
            Meet your doctor <span className="text-gradient">from anywhere</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-5 max-w-xl text-lg text-ink-2"
          >
            A professional consultation experience with camera and mic controls, a live timer,
            chat, and a doctor notes &amp; prescription panel — all inside one call.
          </motion.p>
        </div>
      </div>
    </section>
  );
}

'use client';

import { motion } from 'framer-motion';
import {
  CalendarClock,
  Users,
  Video,
  ShieldCheck,
  Timer,
  HeartPulse,
} from 'lucide-react';

const features = [
  {
    icon: CalendarClock,
    title: 'Smart Appointments',
    desc: 'Book by department and doctor with AI-recommended best slots and wait-time predictions.',
  },
  {
    icon: Users,
    title: 'Realtime Queues',
    desc: 'Live queue positions, estimated waits and doctor status updated over Socket.IO.',
  },
  {
    icon: Video,
    title: 'Video Consultations',
    desc: 'Secure in-platform video calls with chat, notes and prescription panels.',
  },
  {
    icon: ShieldCheck,
    title: 'Presence Verification',
    desc: 'Doctors activate via face, RFID, Bluetooth, WiFi and GPS with an AI confidence engine.',
  },
  {
    icon: Timer,
    title: 'AI Wait Engine',
    desc: 'Predicts delays, optimizes queues and reallocates patients before issues arise.',
  },
  {
    icon: HeartPulse,
    title: 'Emergency Response',
    desc: 'A command center that dispatches ambulances and alerts the entire hospital instantly.',
  },
];

export function Features() {
  return (
    <section className="px-6 py-20" id="features">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-bold sm:text-5xl"
          >
            One platform, <span className="text-gradient">every care path</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-4 max-w-2xl text-lg text-ink-2"
          >
            Purpose-built modules for patients, doctors and administrators — each one performing
            real work against a shared, live database.
          </motion.p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.5 }}
              className="glass glass-hover glow-border p-6"
            >
              <div className="mb-4 inline-grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-royal text-white shadow-glass">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-ink-2">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

'use client';

import { motion } from 'framer-motion';
import { Siren, Ambulance, BellRing, MapPin, Phone } from 'lucide-react';

export function EmergencySection() {
  return (
    <section className="px-6 py-24" id="emergency">
      <div className="mx-auto max-w-6xl">
        <div className="glass glow-border relative overflow-hidden p-8 sm:p-12">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-rose-500/20 blur-3xl" />
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <motion.span
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="badge badge-danger mb-5"
              >
                <Siren className="h-3.5 w-3.5" /> Emergency Response Center
              </motion.span>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-4xl font-bold sm:text-5xl"
              >
                Every second <span className="text-gradient">counts</span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="mt-5 text-lg text-ink-2"
              >
                A hospital command center that dispatches ambulances, alerts every department,
                and keeps priority queues updated in realtime.
              </motion.p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: Ambulance, label: 'Dispatch ambulance', tone: 'from-rose-500 to-red-500' },
                { icon: BellRing, label: 'Alert entire hospital', tone: 'from-amber-500 to-orange-500' },
                { icon: MapPin, label: 'Share patient location', tone: 'from-primary to-royal' },
                { icon: Phone, label: 'Notify emergency contact', tone: 'from-violet to-purple-500' },
              ].map((b, i) => (
                <motion.div
                  key={b.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                  className="glass flex items-center gap-3 p-4"
                >
                  <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${b.tone} text-white`}>
                    <b.icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium">{b.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

'use client';

import { motion } from 'framer-motion';
import { BrainCircuit, Clock3, Route, AlertTriangle, Users, BellRing } from 'lucide-react';

const capabilities = [
  { icon: Clock3, label: 'Wait-time prediction' },
  { icon: Route, label: 'Queue optimization' },
  { icon: AlertTriangle, label: 'Doctor delay forecasting' },
  { icon: Users, label: 'Patient reallocation' },
  { icon: BellRing, label: 'Automatic notifications' },
];

export function AISection() {
  return (
    <section className="px-6 py-24" id="ai">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="badge badge-violet mb-5"
          >
            <BrainCircuit className="h-3.5 w-3.5" /> JIVA AI Engine
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-bold sm:text-5xl"
          >
            Intelligence that works <span className="text-gradient">silently</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-5 text-lg text-ink-2"
          >
            No dashboards, no toggles. JIVA's AI engine continuously monitors presence,
            appointments and queues — and acts the moment conditions change.
          </motion.p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {capabilities.map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="glass flex items-center gap-3 px-4 py-3"
              >
                <c.icon className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{c.label}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* AI engine visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative"
        >
          <div className="glass glow-border p-6 shadow-glass-lg">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              AI Engine — monitoring live
            </div>
            <div className="space-y-3">
              {[
                { from: 'Dr. DOC1002 arrival', to: 'Queue recalculated · 3 patients notified', tone: 'from-primary to-royal' },
                { from: 'Emergency T-045 triaged', to: 'Prioritized · ambulance dispatched', tone: 'from-rose-500 to-orange-500' },
                { from: 'Delay predicted +8m', to: 'Patients offered earlier slot', tone: 'from-amber-500 to-orange-500' },
              ].map((row, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.15 }}
                  className="rounded-xl bg-primary-soft p-3 text-sm"
                >
                  <div className="font-medium text-ink">{row.from}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-ink-2">
                    <span className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${row.tone}`} />
                    {row.to}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

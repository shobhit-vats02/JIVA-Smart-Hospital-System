'use client';

import { motion } from 'framer-motion';
import { Counter } from '@/components/ui/Counter';

const stats = [
  { value: 5000, suffix: '+', label: 'Daily consultations', decimals: 0 },
  { value: 98.6, suffix: '%', label: 'Presence verification accuracy', decimals: 1 },
  { value: 12, suffix: 'm', label: 'Average wait time reduction', decimals: 0 },
  { value: 40, suffix: '+', label: 'Connected departments', decimals: 0 },
];

export function Stats() {
  return (
    <section className="px-6 py-20" id="about">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass p-8 shadow-glass"
        >
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center md:text-left">
                <div className="font-display text-4xl font-bold text-gradient">
                  <Counter to={s.value} suffix={s.suffix} decimals={s.decimals} />
                </div>
                <div className="mt-2 text-sm text-ink-2">{s.label}</div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-ink-3 md:text-left">
            Built to feel like a modern hospital operating system — secure, realtime, and
            intelligent from the ground up.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

'use client';

import { motion } from 'framer-motion';
import { Building2, Network, Waypoints, Globe2 } from 'lucide-react';

export function HospitalNetwork() {
  return (
    <section className="px-6 py-24" id="network">
      <div className="mx-auto max-w-6xl text-center">
        <motion.span
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="badge badge-violet mb-5"
        >
          <Network className="h-3.5 w-3.5" /> Connected Network
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl font-bold sm:text-5xl"
        >
          A network of <span className="text-gradient">care</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mx-auto mt-4 max-w-2xl text-lg text-ink-2"
        >
          Departments, wings and facilities share one live operational layer — so queues,
          presence and emergencies stay synchronized everywhere.
        </motion.p>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Building2, title: 'Main Campus', desc: 'Cardiology, Neurology, Pediatrics' },
            { icon: Waypoints, title: 'South Wing', desc: 'Orthopedics & rehabilitation' },
            { icon: Globe2, title: 'East Wing', desc: 'Dermatology & outpatient' },
            { icon: Network, title: 'Command Center', desc: 'Emergency & analytics hub' },
          ].map((n, i) => (
            <motion.div
              key={n.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass glass-hover p-6"
            >
              <n.icon className="mx-auto mb-4 h-9 w-9 text-primary" />
              <h3 className="text-lg font-semibold">{n.title}</h3>
              <p className="mt-1 text-sm text-ink-2">{n.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

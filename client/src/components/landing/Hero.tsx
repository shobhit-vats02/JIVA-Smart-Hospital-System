'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, ShieldCheck, Activity, PlayCircle } from 'lucide-react';
import Link from 'next/link';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' as const },
  }),
};

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pb-20 pt-32">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div>
          <motion.div variants={fadeUp} custom={0} initial="hidden" animate="show">
            <span className="badge badge-primary mb-6 inline-flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" /> AI Powered Smart Healthcare
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            custom={1}
            initial="hidden"
            animate="show"
            className="text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl"
          >
            Care for <br />
            <span className="text-gradient">every life</span>,
            <br /> intelligently.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={2}
            initial="hidden"
            animate="show"
            className="mt-6 max-w-xl text-lg text-ink-2"
          >
            JIVA unifies appointments, realtime queues, doctor presence, video
            consultations and emergency response into one intelligent hospital
            operating system.
          </motion.p>

          <motion.div
            variants={fadeUp}
            custom={3}
            initial="hidden"
            animate="show"
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link
              href="/login"
              className="btn-primary inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold"
            >
              Get Started <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="#features"
              className="btn-glass inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-base font-medium"
            >
              <PlayCircle className="h-5 w-5 text-primary" /> See how it works
            </a>
          </motion.div>

          <motion.div
            variants={fadeUp}
            custom={4}
            initial="hidden"
            animate="show"
            className="mt-10 flex flex-wrap gap-6 text-sm text-ink-2"
          >
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> JWT Secured
            </span>
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Realtime via Socket.IO
            </span>
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet" /> AI Presence &amp; Queue Engine
            </span>
          </motion.div>
        </div>

        {/* Hero visual - glass dashboard mock */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative"
        >
          <div className="glass glow-border p-5 shadow-glass-lg">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-semibold">Live Hospital Overview</div>
              <span className="badge badge-success">● Live</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Patients in queue', value: '24', tone: 'text-primary' },
                { label: 'Doctors online', value: '18', tone: 'text-emerald-500' },
                { label: 'Avg. wait', value: '12m', tone: 'text-amber-500' },
                { label: 'Today consultations', value: '147', tone: 'text-violet' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-primary-soft p-3">
                  <div className={`font-display text-2xl font-bold ${s.tone}`}>{s.value}</div>
                  <div className="text-xs text-ink-2">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-primary-soft">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-violet"
                initial={{ width: 0 }}
                animate={{ width: '68%' }}
                transition={{ duration: 1.2, delay: 0.6 }}
              />
            </div>
            <p className="mt-2 text-xs text-ink-3">Queue throughput — optimizing in realtime</p>
          </div>

          {/* floating chips */}
          <motion.div
            className="absolute -left-6 top-8 glass px-3 py-2 text-xs font-medium shadow-glass"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity }}
          >
            ⚡ AI slot suggestion
          </motion.div>
          <motion.div
            className="absolute -right-4 bottom-10 glass px-3 py-2 text-xs font-medium shadow-glass"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 6, repeat: Infinity }}
          >
            🚨 Emergency response
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

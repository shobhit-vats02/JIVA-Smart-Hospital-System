'use client';

import { motion } from 'framer-motion';

/** Floating gradient orbs rendered over the animated mesh background. */
export function AnimatedBackground() {
  return (
    <>
      <div className="jiva-mesh" aria-hidden />
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <motion.div
          className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-[color-mix(in_srgb,var(--primary)_25%,transparent)] blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-[color-mix(in_srgb,var(--violet)_25%,transparent)] blur-3xl"
          animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-[color-mix(in_srgb,var(--royal)_20%,transparent)] blur-3xl"
          animate={{ x: [0, 30, 0], y: [0, -40, 0] }}
          transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </>
  );
}

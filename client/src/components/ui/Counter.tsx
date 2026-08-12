'use client';

import { useEffect, useRef } from 'react';
import { useInView, useMotionValue, useSpring } from 'framer-motion';

/** Animated count-up number that triggers when scrolled into view. */
export function Counter({
  to,
  from = 0,
  duration = 1.6,
  decimals = 0,
  suffix = '',
  prefix = '',
  className,
}: {
  to: number;
  from?: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const motionValue = useMotionValue(from);
  const spring = useSpring(motionValue, { duration: duration * 1000, bounce: 0 });

  useEffect(() => {
    if (inView) motionValue.set(to);
  }, [inView, to, motionValue]);

  useEffect(() => {
    const unsub = spring.on('change', (v) => {
      if (ref.current) {
        ref.current.textContent = `${prefix}${v.toFixed(decimals)}${suffix}`;
      }
    });
    return unsub;
  }, [spring, decimals, prefix, suffix]);

  return <span ref={ref} className={className}>{`${prefix}${from.toFixed(decimals)}${suffix}`}</span>;
}

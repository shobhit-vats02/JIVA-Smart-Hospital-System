'use client';

import { AnimatedBackground } from '@/components/ui/AnimatedBackground';

/**
 * Shared shell for auth screens: animated mesh background + floating shapes.
 * Theme toggle is rendered inline by each screen.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <AnimatedBackground />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}

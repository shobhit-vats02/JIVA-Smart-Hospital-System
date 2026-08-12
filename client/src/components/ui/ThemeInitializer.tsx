'use client';

import { useEffect, type ReactNode } from 'react';

const THEME_KEY = 'jiva_theme';

/**
 * Applies the persisted theme class to <html> on mount to avoid FOUC.
 * (Also keeps it in sync for first paint.)
 */
export function ThemeInitializer({ children }: { children: ReactNode }) {
  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    const dark =
      stored === 'dark' ||
      (!stored && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  }, []);

  return <>{children}</>;
}

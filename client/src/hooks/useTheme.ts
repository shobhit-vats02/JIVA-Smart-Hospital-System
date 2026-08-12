'use client';

import { useEffect, useState, useCallback } from 'react';

const THEME_KEY = 'jiva_theme';

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(THEME_KEY) as 'light' | 'dark' | null;
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Theme provider hook with localStorage persistence + smooth transition. */
export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Hydrate once on mount.
  useEffect(() => {
    setTheme(getInitialTheme());
  }, []);

  // Apply class + persist whenever theme changes.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggle, isDark: theme === 'dark' };
}

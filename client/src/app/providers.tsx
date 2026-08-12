'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeInitializer } from '@/components/ui/ThemeInitializer';
import { ToastProvider } from '@/components/ui/Toast';

/**
 * Global providers:
 *  - ThemeInitializer: applies the persisted theme before first paint.
 *  - QueryClientProvider: server-state caching (TanStack Query).
 *  - AuthProvider: session state + login/register/logout.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      })
  );

  return (
    <ThemeInitializer>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeInitializer>
  );
}

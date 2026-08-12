'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { PageLoader } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';

/**
 * Auth guard for all protected dashboards.
 * Redirects unauthenticated users to /login, then lets the role-specific
 * page render inside its own DashboardShell.
 */
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading || !isAuthenticated) {
    return (
      <div className="relative min-h-screen">
        <AnimatedBackground />
        <PageLoader label="Verifying session" />
      </div>
    );
  }

  return <>{children}</>;
}

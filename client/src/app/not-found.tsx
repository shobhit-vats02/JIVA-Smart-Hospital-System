import Link from 'next/link';
import { HeartPulse, Home, ArrowLeft } from 'lucide-react';

/** Custom 404 page matching the JIVA design language. */
export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <div className="jiva-mesh" aria-hidden />
      <div className="relative z-10 mx-auto max-w-lg text-center">
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-primary to-royal text-white shadow-glass">
          <HeartPulse className="h-10 w-10" />
        </div>
        <p className="font-display text-7xl font-bold text-gradient">404</p>
        <h1 className="mt-3 text-2xl font-bold">This page is off duty</h1>
        <p className="mt-2 text-ink-2">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="btn-primary inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold">
            <Home className="h-4 w-4" /> Back to home
          </Link>
          <Link href="/login" className="btn-glass inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium">
            <ArrowLeft className="h-4 w-4" /> Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

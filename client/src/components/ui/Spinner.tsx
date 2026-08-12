import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-primary', className)} />;
}

export function PageLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
      <span className="relative grid h-12 w-12 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-2xl bg-primary/30" />
        <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-royal text-white shadow-glass">
          <Loader2 className="h-6 w-6 animate-spin" />
        </span>
      </span>
      <p className="text-sm text-ink-3">{label}...</p>
    </div>
  );
}

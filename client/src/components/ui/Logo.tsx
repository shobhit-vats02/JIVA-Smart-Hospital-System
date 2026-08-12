import { HeartPulse } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}

const sizes = {
  sm: { icon: 'h-8 w-8', text: 'text-lg' },
  md: { icon: 'h-10 w-10', text: 'text-2xl' },
  lg: { icon: 'h-14 w-14', text: 'text-4xl' },
};

/** JIVA brand logo - gradient mark + wordmark. */
export function Logo({ size = 'md', className, showText = true }: LogoProps) {
  const s = sizes[size];
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="relative grid place-items-center">
        <span className={cn('absolute inset-0 rounded-2xl blur-lg', s.icon, 'bg-[color-mix(in_srgb,var(--primary)_40%,transparent)]')} />
        <span
          className={cn(
            'relative grid place-items-center rounded-2xl bg-gradient-to-br from-primary to-royal text-white shadow-glass',
            s.icon
          )}
        >
          <HeartPulse className={size === 'lg' ? 'h-8 w-8' : 'h-5 w-5'} strokeWidth={2.5} />
        </span>
      </span>
      {showText && (
        <div className="leading-none">
          <span className={cn('font-display font-bold tracking-tight text-gradient', s.text)}>
            JIVA
          </span>
        </div>
      )}
    </div>
  );
}

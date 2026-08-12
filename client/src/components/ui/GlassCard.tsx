import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  glow?: boolean;
  padded?: boolean;
}

/** Glassmorphism card with optional hover elevation + gradient border. */
export function GlassCard({
  children,
  hover = false,
  glow = false,
  padded = true,
  className,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        'glass',
        hover && 'glass-hover',
        glow && 'glow-border',
        padded && 'p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

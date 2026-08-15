import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'accent';

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-muted text-text-secondary border-border',
  accent: 'bg-accent text-accent-contrast border-transparent',
  success: 'bg-success/10 text-success border-success/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
  error: 'bg-error/10 text-error border-error/30',
  info: 'bg-info/10 text-info border-info/30',
};

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

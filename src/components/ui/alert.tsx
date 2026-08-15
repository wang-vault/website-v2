import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  className?: string;
}

const variantConfig: Record<AlertVariant, { classes: string; icon: typeof Info }> = {
  info: { classes: 'border-info/30 bg-info/5 text-info', icon: Info },
  success: { classes: 'border-success/30 bg-success/5 text-success', icon: CheckCircle2 },
  warning: { classes: 'border-warning/30 bg-warning/5 text-warning', icon: AlertTriangle },
  error: { classes: 'border-error/30 bg-error/5 text-error', icon: XCircle },
};

export function Alert({ variant = 'info', title, children, className }: AlertProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-lg border p-4 text-sm', config.classes, className)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={cn('leading-relaxed', title && 'mt-0.5')}>{children}</div>
      </div>
    </div>
  );
}

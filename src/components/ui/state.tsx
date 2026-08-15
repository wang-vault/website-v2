import type { ReactNode } from 'react';
import { Inbox, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-6 py-12 text-center', className)}>
      <div className="mb-1 text-text-muted" aria-hidden="true">
        {icon ?? <Inbox className="h-8 w-8" />}
      </div>
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      {description ? <p className="max-w-sm text-sm text-text-secondary">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label = 'Memuat…', className }: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex items-center justify-center gap-3 py-16 text-sm text-text-muted', className)}
    >
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorState({
  title = 'Terjadi kesalahan',
  description,
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center gap-2 rounded-lg border border-error/30 bg-error/5 px-6 py-10 text-center', className)}>
      <AlertCircle className="mb-1 h-7 w-7 text-error" aria-hidden="true" />
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      {description ? <p className="max-w-sm text-sm text-text-secondary">{description}</p> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-md bg-surface-muted', className)} />;
}

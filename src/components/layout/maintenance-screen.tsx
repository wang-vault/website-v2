import { Wrench } from 'lucide-react';
import { Logo } from '@/components/logo';
import type { MaintenanceState } from '@/lib/maintenance';

export function MaintenanceScreen({ state }: { state: MaintenanceState }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="container-page flex h-14 items-center">
          <Logo />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="max-w-md text-center">
          <span className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-text-secondary">
            <Wrench className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">{state.title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-text-secondary">{state.message}</p>
          {state.estimatedRestoration ? (
            <p className="mt-4 inline-block rounded-md bg-surface-muted px-3 py-1.5 text-xs text-text-secondary">
              Estimasi selesai: {state.estimatedRestoration}
            </p>
          ) : null}
        </div>
      </main>
      <footer className="border-t border-border py-4 text-center text-xs text-text-muted">
        © {new Date().getFullYear()} WangStore
      </footer>
    </div>
  );
}

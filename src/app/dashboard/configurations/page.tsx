import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { DeleteConfigButton } from '@/components/dashboard/config-actions';
import { EmptyState } from '@/components/ui/state';
import { formatDate } from '@/lib/utils';
import { TIER_LABELS } from '@/types';

export default async function DashboardConfigurationsPage() {
  const sessionContext = await getSession();
  if (!sessionContext) return null;
  const db = await getDb();
  const configs = await db.savedConfigurations.listByUser(sessionContext.session.sub);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Konfigurasi Tersimpan</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Konfigurasi yang Anda simpan dari Server Builder. Maksimal 50 konfigurasi per akun.
        </p>
      </header>
      {configs.length === 0 ? (
        <EmptyState
          title="Belum ada konfigurasi tersimpan"
          description="Simpan konfigurasi favorit Anda dari Server Builder agar mudah digunakan kembali."
          action={
            <Link
              href="/server-builder"
              className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-contrast hover:bg-text-secondary"
            >
              Buka Server Builder
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {configs.map((config) => (
            <li key={config.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-primary">{config.name}</p>
                <p className="mt-0.5 font-mono text-xs text-text-muted">
                  {TIER_LABELS[config.tier]} · {config.cpu} vCore / {config.ramGb} GB / {config.storageGb} GB
                  {config.packageId ? ` · ${config.packageId}` : ''} · {formatDate(config.createdAt)}
                </p>
              </div>
              <DeleteConfigButton id={config.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

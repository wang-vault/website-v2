import type { Metadata } from 'next';
import { ShieldAlert } from 'lucide-react';
import { redirect } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button-link';
import { getSession } from '@/lib/auth/session';
import {
  PERMISSION_LABELS,
  ROLE_DEFINITIONS,
  minimumRoleFor,
  type Permission,
} from '@/lib/auth/rbac';
import { ROLE_LABELS } from '@/types';

export const metadata: Metadata = {
  title: 'Akses Ditolak',
  robots: { index: false, follow: false },
};

function isPermission(value: string): value is Permission {
  return value in PERMISSION_LABELS;
}

/**
 * Halaman 403 panel admin.
 * Ditampilkan saat sebuah role membuka halaman yang izinnya tidak dimiliki —
 * menjelaskan secara jujur izin apa yang kurang dan siapa yang memilikinya,
 * alih-alih memberi error mentah.
 */
export default async function AdminForbiddenPage({
  searchParams,
}: {
  searchParams: Promise<{ permission?: string }>;
}) {
  const sessionContext = await getSession();
  if (!sessionContext) redirect('/login?next=/admin');
  const role = sessionContext.session.role;
  const definition = ROLE_DEFINITIONS[role];

  const raw = (await searchParams).permission ?? '';
  const permission = isPermission(raw) ? raw : null;
  const requiredRole = permission ? minimumRoleFor(permission) : null;

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-error" aria-hidden="true" />
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Akses Ditolak</h1>
        </div>
        <p className="mt-2 text-sm text-text-secondary">
          Anda masuk sebagai <Badge variant="accent">{ROLE_LABELS[role]}</Badge> dan halaman ini berada di luar
          wewenang peran tersebut.
        </p>
      </header>

      <Alert variant="error" title="Izin yang dibutuhkan">
        {permission ? (
          <p>
            Halaman ini memerlukan izin <code className="font-mono text-xs">{permission}</code> —{' '}
            {PERMISSION_LABELS[permission]}. Izin tersebut dimiliki oleh peran{' '}
            <strong>{requiredRole ? ROLE_LABELS[requiredRole] : '—'}</strong> ke atas.
          </p>
        ) : (
          <p>Peran Anda tidak memiliki izin untuk membuka halaman ini.</p>
        )}
      </Alert>

      <section aria-labelledby="wewenang" className="rounded-lg border border-border bg-surface p-5">
        <h2 id="wewenang" className="text-base font-semibold text-text-primary">
          Wewenang peran {definition.label}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">{definition.summary}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-success">Dapat dilakukan</p>
            <ul className="mt-2 space-y-1.5 text-sm text-text-secondary">
              {definition.can.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-error">Di luar wewenang</p>
            <ul className="mt-2 space-y-1.5 text-sm text-text-secondary">
              {definition.cannot.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/admin" variant="primary">
          Kembali ke Ringkasan
        </ButtonLink>
        <ButtonLink href="/admin/roles" variant="outline">
          Lihat Matriks Peran &amp; Izin
        </ButtonLink>
      </div>

      <p className="text-xs leading-relaxed text-text-muted">
        Butuh akses lebih? Hubungi Owner WangStore — hanya Owner yang dapat mengubah role pengguna, dan setiap
        perubahan role tercatat di Audit Log.
      </p>
    </div>
  );
}

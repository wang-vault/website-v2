import type { Metadata } from 'next';
import { Fragment } from 'react';
import { Check, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { requireAdminPage } from '@/lib/auth/page-guards';
import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  ROLE_DEFINITIONS,
  ROLE_ORDER,
  ROLE_PERMISSIONS,
  hasPermission,
} from '@/lib/auth/rbac';
import { ROLE_LABELS } from '@/types';
import type { Role } from '@/types';

export const metadata: Metadata = {
  title: 'Peran & Izin',
  robots: { index: false, follow: false },
};

const MATRIX_ROLES: readonly Role[] = ROLE_ORDER.filter((role) => role !== 'customer');

/**
 * Dokumentasi hidup matriks RBAC.
 * Tabel dirender langsung dari src/lib/auth/rbac.ts sehingga tidak pernah
 * basi: apa yang tampil di sini persis dengan yang ditegakkan server.
 */
export default async function AdminRolesPage() {
  const { role } = await requireAdminPage();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Peran &amp; Izin</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Hierarki: Owner &gt; Admin &gt; Staff &gt; Pelanggan. Tabel di bawah dihasilkan langsung dari matriks
          RBAC yang ditegakkan server (<code className="font-mono text-xs">src/lib/auth/rbac.ts</code>) — bukan
          daftar manual yang bisa basi.
        </p>
      </header>

      <Alert variant="info" title="Peran Anda saat ini">
        <p>
          <strong>{ROLE_LABELS[role]}</strong> — {ROLE_DEFINITIONS[role].summary} Peran Anda memiliki{' '}
          {ROLE_PERMISSIONS[role].length} dari {Object.keys(PERMISSION_LABELS).length} izin yang tersedia.
        </p>
      </Alert>

      <section aria-labelledby="ringkasan-peran" className="space-y-4">
        <h2 id="ringkasan-peran" className="text-base font-semibold text-text-primary">
          Pembagian Tanggung Jawab
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {MATRIX_ROLES.map((entry) => {
            const definition = ROLE_DEFINITIONS[entry];
            return (
              <article
                key={entry}
                className={`rounded-lg border bg-surface p-5 ${
                  entry === role ? 'border-accent' : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-text-primary">{definition.label}</h3>
                  <Badge variant={entry === role ? 'accent' : 'neutral'}>
                    {ROLE_PERMISSIONS[entry].length} izin
                  </Badge>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-text-secondary">{definition.summary}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-success">Dapat</p>
                <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-text-secondary">
                  {definition.can.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-error">Tidak dapat</p>
                <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-text-secondary">
                  {definition.cannot.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="matriks" className="space-y-4">
        <h2 id="matriks" className="text-base font-semibold text-text-primary">
          Matriks Izin
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">Matriks izin per peran</caption>
            <thead>
              <tr className="border-b border-border text-left">
                <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Izin
                </th>
                {MATRIX_ROLES.map((entry) => (
                  <th
                    key={entry}
                    scope="col"
                    className="w-24 px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-text-muted"
                  >
                    {ROLE_LABELS[entry]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map((group) => (
                <Fragment key={group.label}>
                  <tr className="border-b border-border bg-surface-muted">
                    <th
                      scope="colgroup"
                      colSpan={MATRIX_ROLES.length + 1}
                      className="px-5 py-2.5 text-left text-xs font-semibold text-text-primary"
                    >
                      {group.label}
                      <span className="ml-2 font-normal text-text-muted">{group.description}</span>
                    </th>
                  </tr>
                  {group.permissions.map((permission) => (
                    <tr key={permission} className="border-b border-border last:border-0">
                      <th scope="row" className="px-5 py-3 text-left font-normal">
                        <span className="block text-text-primary">{PERMISSION_LABELS[permission]}</span>
                        <code className="mt-0.5 block font-mono text-xs text-text-muted">{permission}</code>
                      </th>
                      {MATRIX_ROLES.map((entry) => {
                        const allowed = hasPermission(entry, permission);
                        return (
                          <td key={entry} className="px-5 py-3 text-center">
                            {allowed ? (
                              <>
                                <Check className="mx-auto h-4 w-4 text-success" aria-hidden="true" />
                                <span className="sr-only">
                                  {ROLE_LABELS[entry]} memiliki izin {permission}
                                </span>
                              </>
                            ) : (
                              <>
                                <Minus className="mx-auto h-4 w-4 text-text-muted" aria-hidden="true" />
                                <span className="sr-only">
                                  {ROLE_LABELS[entry]} tidak memiliki izin {permission}
                                </span>
                              </>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="rounded-lg border border-border bg-surface-muted p-4 text-xs leading-relaxed text-text-muted">
        Penegakan berlapis: middleware memblokir non-staf di <code className="font-mono">/admin</code>, setiap
        halaman memanggil guard izinnya sendiri, dan setiap API route memverifikasi ulang izin di server. Menyembunyikan
        menu hanyalah kenyamanan UI — bukan mekanisme keamanan. Perubahan role hanya dapat dilakukan Owner dan selalu
        tercatat di Audit Log.
      </p>
    </div>
  );
}

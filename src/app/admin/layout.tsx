import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/logo';
import { AdminNav } from '@/components/admin/admin-nav';
import { LogoutButton } from '@/components/auth/logout-button';
import { getValidatedSessionContext } from '@/lib/auth/page-guards';
import { isStaff } from '@/lib/auth/session';
import { Badge } from '@/components/ui/badge';
import { navGroupsForRole } from '@/lib/admin/nav';
import { ROLE_DEFINITIONS } from '@/lib/auth/rbac';
import { ROLE_LABELS } from '@/types';

export const metadata: Metadata = {
  title: 'Panel Admin',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const sessionContext = await getValidatedSessionContext();
  if (!sessionContext) redirect('/login?next=/admin');
  const role = sessionContext.session.role;
  if (!isStaff(role)) redirect('/dashboard');

  // Menu difilter di server berdasarkan izin role — menu di luar wewenang
  // tidak pernah dikirim ke browser. Guard sesungguhnya ada di tiap halaman & API.
  const groups = navGroupsForRole(role);

  return (
    <div className="container-page py-8">
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-60 lg:shrink-0">
          <div className="rounded-lg border border-border bg-surface p-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
              <Logo href="/admin" />
              <Badge variant="accent">{ROLE_LABELS[role]}</Badge>
            </div>
            <AdminNav groups={groups} />
            <div className="mt-4 space-y-2 border-t border-border pt-4">
              <p className="flex items-center gap-2 px-3 text-xs text-text-muted">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="truncate">{sessionContext.session.email}</span>
              </p>
              <p className="px-3 text-[0.7rem] leading-relaxed text-text-muted">{ROLE_DEFINITIONS[role].summary}</p>
              <LogoutButton />
            </div>
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { User } from 'lucide-react';
import { Logo } from '@/components/logo';
import { DashboardNav } from '@/components/dashboard/dashboard-nav';
import { LogoutButton } from '@/components/auth/logout-button';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { ButtonLink } from '@/components/ui/button-link';

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const sessionContext = await getSession();
  if (!sessionContext) redirect('/login?next=/dashboard');

  const db = await getDb();
  const [profile, unreadCount, settings] = await Promise.all([
    db.profiles.get(sessionContext.session.sub),
    db.notifications.unreadCount(sessionContext.session.sub),
    db.settings.get(),
  ]);

  return (
    <div className="container-page py-8">
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-60 lg:shrink-0">
          <div className="rounded-lg border border-border bg-surface p-4 lg:sticky lg:top-20">
            <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
              <Logo href="/dashboard" />
            </div>
            <DashboardNav
              unreadNotifications={unreadCount}
              contact={{
                whatsappNumber: settings.whatsappNumber,
                discordInviteUrl: settings.discordInviteUrl,
              }}
            />
            <div className="mt-4 space-y-2 border-t border-border pt-4">
              <p className="flex items-center gap-2 px-3 text-xs text-text-muted">
                <User className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="truncate">{profile?.fullName || sessionContext.session.email}</span>
              </p>
              <LogoutButton />
              <ButtonLink href="/" variant="ghost" size="sm" className="w-full">
                Kembali ke Situs
              </ButtonLink>
            </div>
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

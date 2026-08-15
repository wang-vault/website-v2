import type { Metadata } from 'next';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import './globals.css';
import { Navbar, type NavAnnouncement } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { ThemeProvider } from '@/components/theme-provider';
import { ToastProvider } from '@/components/ui/toast';
import { MaintenanceScreen } from '@/components/layout/maintenance-screen';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { getMaintenanceState } from '@/lib/maintenance';
import { isStaff } from '@/lib/auth/session';

export async function generateMetadata(): Promise<Metadata> {
  const db = await getDb();
  const settings = await db.settings.get();
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
    title: {
      default: `${settings.siteName} — ${settings.tagline}`,
      template: `%s | ${settings.siteName}`,
    },
    description: settings.siteDescription,
    keywords: [
      'hosting',
      'minecraft hosting',
      'vps',
      'dedicated server',
      'panel hosting',
      'server builder',
      'wangstore',
    ],
    openGraph: {
      type: 'website',
      siteName: settings.siteName,
      title: `${settings.siteName} — ${settings.tagline}`,
      description: settings.siteDescription,
      locale: 'id_ID',
    },
    twitter: {
      card: 'summary',
      title: `${settings.siteName} — ${settings.tagline}`,
      description: settings.siteDescription,
    },
    robots: {
      index: true,
      follow: true,
    },
    icons: {
      icon: '/icon.svg',
    },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const headerStore = await headers();
  const pathname = headerStore.get('x-pathname') ?? '/';

  const [db, sessionContext] = await Promise.all([getDb(), getSession()]);
  const [settings, announcements] = await Promise.all([
    db.settings.get(),
    db.announcements.listActive(),
  ]);

  const maintenance = await getMaintenanceState(
    pathname,
    sessionContext?.session.role ?? null,
  );

  const navAnnouncements: NavAnnouncement[] =
    settings.announcementBanner.trim() !== ''
      ? [{ id: 'banner', message: settings.announcementBanner, href: '/status' }]
      : announcements.map((a) => ({
          id: a.id,
          message: a.message,
          href: '/status',
        }));

  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <a href="#konten-utama" className="skip-link">
          Lewati ke konten utama
        </a>
        <ThemeProvider>
          <ToastProvider>
            {maintenance ? (
              <MaintenanceScreen state={maintenance} />
            ) : (
              <>
                <Navbar
                  session={{
                    loggedIn: Boolean(sessionContext),
                    isStaff: sessionContext ? isStaff(sessionContext.session.role) : false,
                  }}
                  announcements={navAnnouncements}
                />
                <main id="konten-utama" className="min-h-[60vh]">
                  {children}
                </main>
                <Footer
                  contact={{
                    whatsappNumber: settings.whatsappNumber,
                    discordInviteUrl: settings.discordInviteUrl,
                    contactEmail: settings.contactEmail,
                  }}
                />
              </>
            )}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

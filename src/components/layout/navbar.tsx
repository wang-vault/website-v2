'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-provider';
import { ButtonLink } from '@/components/ui/button-link';
import { cn } from '@/lib/utils';

export interface NavSession {
  loggedIn: boolean;
  isStaff: boolean;
}

export interface NavAnnouncement {
  id: string;
  message: string;
  href?: string;
}

const NAV_LINKS: { href: string; label: string; match: string }[] = [
  { href: '/server-builder', label: 'Server Builder', match: '/server-builder' },
  { href: '/vps', label: 'VPS', match: '/vps' },
  { href: '/features', label: 'Fitur', match: '/features' },
  { href: '/blog', label: 'Blog', match: '/blog' },
  { href: '/knowledge-base', label: 'Knowledge Base', match: '/knowledge-base' },
  { href: '/status', label: 'Status', match: '/status' },
  { href: '/contact', label: 'Kontak', match: '/contact' },
];

export function Navbar({
  session,
  announcements,
}: {
  session: NavSession;
  announcements: NavAnnouncement[];
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Tutup menu mobile saat pindah halaman.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      {announcements.length > 0 ? (
        <div className="border-b border-border bg-surface-muted">
          <div className="container-page flex items-center gap-2 py-1.5 text-xs text-text-secondary">
            <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-info" />
            <p className="truncate">
              {announcements[0]?.message}
              {announcements[0]?.href ? (
                <>
                  {' '}
                  <Link href={announcements[0].href} className="font-medium underline underline-offset-2 hover:text-text-primary">
                    Selengkapnya
                  </Link>
                </>
              ) : null}
            </p>
          </div>
        </div>
      ) : null}
      <div className="container-page flex h-14 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav aria-label="Navigasi utama" className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  pathname.startsWith(link.match)
                    ? 'text-text-primary'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {session.loggedIn ? (
            <ButtonLink
              href={session.isStaff ? '/admin' : '/dashboard'}
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
            >
              {session.isStaff ? 'Panel Admin' : 'Dashboard'}
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                Masuk
              </ButtonLink>
              <ButtonLink href="/register" variant="primary" size="sm" className="hidden sm:inline-flex">
                Daftar
              </ButtonLink>
            </>
          )}
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-primary hover:bg-surface-muted md:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'}
            onClick={() => setMobileOpen((current) => !current)}
          >
            {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>
      {mobileOpen ? (
        <nav
          id="mobile-nav"
          aria-label="Navigasi mobile"
          className="border-t border-border bg-background md:hidden"
        >
          <div className="container-page flex flex-col gap-1 py-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-md px-3 py-2.5 text-sm font-medium',
                  pathname.startsWith(link.match)
                    ? 'bg-surface-muted text-text-primary'
                    : 'text-text-secondary',
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2 border-t border-border pt-3">
              {session.loggedIn ? (
                <ButtonLink href={session.isStaff ? '/admin' : '/dashboard'} variant="outline" className="flex-1">
                  {session.isStaff ? 'Panel Admin' : 'Dashboard'}
                </ButtonLink>
              ) : (
                <>
                  <ButtonLink href="/login" variant="outline" className="flex-1">
                    Masuk
                  </ButtonLink>
                  <ButtonLink href="/register" variant="primary" className="flex-1">
                    Daftar
                  </ButtonLink>
                </>
              )}
            </div>
          </div>
        </nav>
      ) : null}
    </header>
  );
}

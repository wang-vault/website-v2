'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  CreditCard,
  ExternalLink,
  Home,
  MessageCircle,
  Package,
  Save,
  Settings,
  Ticket,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DashboardNavLink {
  href: string;
  label: string;
  icon: 'home' | 'orders' | 'configs' | 'tickets' | 'coupons' | 'notifications' | 'profile';
}

const ICONS = {
  home: Home,
  orders: Package,
  configs: Save,
  tickets: Ticket,
  coupons: CreditCard,
  notifications: Bell,
  profile: Settings,
} as const;

const NAV_LINKS: DashboardNavLink[] = [
  { href: '/dashboard', label: 'Ringkasan', icon: 'home' },
  { href: '/dashboard/orders', label: 'Pesanan', icon: 'orders' },
  { href: '/dashboard/configurations', label: 'Konfigurasi Tersimpan', icon: 'configs' },
  { href: '/dashboard/tickets', label: 'Tiket', icon: 'tickets' },
  { href: '/dashboard/coupons', label: 'Kupon', icon: 'coupons' },
  { href: '/dashboard/notifications', label: 'Notifikasi', icon: 'notifications' },
  { href: '/dashboard/profile', label: 'Profil', icon: 'profile' },
];

export function DashboardNav({
  unreadNotifications,
  contact,
}: {
  unreadNotifications: number;
  contact: { whatsappNumber: string; discordInviteUrl: string };
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigasi dashboard" className="flex flex-col gap-1">
      {NAV_LINKS.map((link) => {
        const Icon = ICONS[link.icon];
        const active = link.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-surface-muted text-text-primary'
                : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1 truncate">{link.label}</span>
            {link.icon === 'notifications' && unreadNotifications > 0 ? (
              <span className="rounded-full bg-error px-1.5 py-0.5 text-[10px] font-bold text-white">
                {unreadNotifications > 99 ? '99+' : unreadNotifications}
              </span>
            ) : null}
          </Link>
        );
      })}

      <p className="mt-4 border-t border-border px-3 pt-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
        Sumber Daya
      </p>
      <Link
        href="/knowledge-base"
        className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-muted hover:text-text-primary"
      >
        <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
        Knowledge Base
        <ExternalLink className="ml-auto h-3 w-3 text-text-muted" aria-hidden="true" />
      </Link>
      {contact.whatsappNumber ? (
        <a
          href={`https://wa.me/${contact.whatsappNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-muted hover:text-text-primary"
        >
          <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          WhatsApp
          <ExternalLink className="ml-auto h-3 w-3 text-text-muted" aria-hidden="true" />
        </a>
      ) : null}
      {contact.discordInviteUrl ? (
        <a
          href={contact.discordInviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-muted hover:text-text-primary"
        >
          <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Discord
          <ExternalLink className="ml-auto h-3 w-3 text-text-muted" aria-hidden="true" />
        </a>
      ) : null}
    </nav>
  );
}

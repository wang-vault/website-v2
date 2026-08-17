'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  BookOpen,
  CreditCard,
  ExternalLink,
  Eye,
  FileText,
  Gauge,
  HardDrive,
  HelpCircle,
  Home,
  KeyRound,
  LayoutGrid,
  MapPin,
  MessageSquare,
  Package,
  ScrollText,
  Server,
  Settings,
  Shield,
  Ticket,
  Users,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminNavGroup } from '@/lib/admin/nav';

const ICONS: Record<string, typeof Home> = {
  home: Home,
  orders: Package,
  customers: Users,
  tickets: Ticket,
  pricing: Gauge,
  coupons: CreditCard,
  analytics: LayoutGrid,
  products: Server,
  blog: FileText,
  kb: BookOpen,
  faq: HelpCircle,
  testimonials: MessageSquare,
  pages: ScrollText,
  infrastructure: HardDrive,
  incidents: Shield,
  announcements: Bell,
  theme: Settings,
  social: ExternalLink,
  maintenance: Wrench,
  audit: ScrollText,
  roles: KeyRound,
};

/**
 * Navigasi panel admin.
 * Daftar menu diterima sudah TERFILTER dari server (lihat src/lib/admin/nav.ts)
 * sehingga menu di luar wewenang role tidak pernah dikirim ke browser.
 */
export function AdminNav({ groups }: { groups: AdminNavGroup[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigasi admin" className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.section} className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-text-muted">
            {group.label}
          </p>
          {group.items.map((item) => {
            const Icon = ICONS[item.icon] ?? Home;
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-surface-muted text-text-primary'
                    : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
                {item.readOnly ? (
                  <span title="Baca-saja untuk peran Anda" className="ml-auto shrink-0">
                    <Eye className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
                    <span className="sr-only">baca-saja</span>
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
      <div className="mt-2 flex items-center gap-2 border-t border-border px-3 pt-4">
        <MapPin className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
        <Link href="/" className="text-xs font-medium text-text-muted hover:text-text-primary">
          Lihat Situs Publik
        </Link>
      </div>
    </nav>
  );
}

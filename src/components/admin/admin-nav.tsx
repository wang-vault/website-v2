'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  BookOpen,
  CreditCard,
  ExternalLink,
  FileText,
  Gauge,
  HardDrive,
  HelpCircle,
  Home,
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

export interface AdminNavItem {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
}

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
};

export const ADMIN_NAV: AdminNavItem[] = [
  { href: '/admin', label: 'Ringkasan', icon: 'home', exact: true },
  { href: '/admin/orders', label: 'Pesanan', icon: 'orders' },
  { href: '/admin/customers', label: 'Pelanggan', icon: 'customers' },
  { href: '/admin/tickets', label: 'Tiket & Kontak', icon: 'tickets' },
  { href: '/admin/pricing', label: 'Formula Harga', icon: 'pricing' },
  { href: '/admin/coupons', label: 'Kupon & Promosi', icon: 'coupons' },
  { href: '/admin/analytics', label: 'Analitik', icon: 'analytics' },
  { href: '/admin/products', label: 'Produk & Paket', icon: 'products' },
  { href: '/admin/blog', label: 'Blog', icon: 'blog' },
  { href: '/admin/knowledge-base', label: 'Knowledge Base', icon: 'kb' },
  { href: '/admin/faq', label: 'FAQ', icon: 'faq' },
  { href: '/admin/testimonials', label: 'Testimoni', icon: 'testimonials' },
  { href: '/admin/pages', label: 'Halaman & Legal', icon: 'pages' },
  { href: '/admin/infrastructure', label: 'Infrastruktur & Lokasi', icon: 'infrastructure' },
  { href: '/admin/incidents', label: 'Insiden & Maintenance', icon: 'incidents' },
  { href: '/admin/announcements', label: 'Pengumuman', icon: 'announcements' },
  { href: '/admin/theme', label: 'Tema & Branding', icon: 'theme' },
  { href: '/admin/social', label: 'Sosial & Kontak', icon: 'social' },
  { href: '/admin/maintenance', label: 'Mode Maintenance', icon: 'maintenance' },
  { href: '/admin/audit-logs', label: 'Audit Log', icon: 'audit' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigasi admin" className="flex flex-col gap-1">
      {ADMIN_NAV.map((item) => {
        const Icon = ICONS[item.icon] ?? Home;
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
          </Link>
        );
      })}
      <div className="mt-4 flex items-center gap-2 border-t border-border px-3 pt-4">
        <MapPin className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
        <Link href="/" className="text-xs font-medium text-text-muted hover:text-text-primary">
          Lihat Situs Publik
        </Link>
      </div>
    </nav>
  );
}

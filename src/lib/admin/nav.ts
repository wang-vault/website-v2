import type { Permission } from '@/lib/auth/rbac';
import { hasPermission } from '@/lib/auth/rbac';
import type { Role } from '@/types';

/**
 * Definisi navigasi panel admin.
 *
 * Modul ini SENGAJA bukan client component: daftar menu difilter di server
 * berdasarkan izin role, sehingga menu yang tidak boleh diakses tidak pernah
 * ikut terkirim ke browser. Filter menu hanyalah kenyamanan UI — setiap
 * halaman dan setiap API route tetap memverifikasi izin secara terpisah.
 */

export type AdminNavSection = 'operasional' | 'katalog' | 'konten' | 'pengaturan' | 'kepemilikan';

export interface AdminNavItem {
  href: string;
  label: string;
  icon: string;
  section: AdminNavSection;
  exact?: boolean;
  /** Izin minimum untuk membuka halaman. Tanpa nilai: seluruh pengguna panel. */
  permission?: Permission;
  /** Izin untuk mengubah data di halaman ini. Tanpa izin ini → mode baca-saja. */
  writePermission?: Permission;
}

export const ADMIN_NAV_SECTIONS: Record<AdminNavSection, string> = {
  operasional: 'Operasional',
  katalog: 'Katalog & Harga',
  konten: 'Konten',
  pengaturan: 'Pengaturan',
  kepemilikan: 'Kepemilikan',
};

export const ADMIN_NAV: readonly AdminNavItem[] = [
  { href: '/admin', label: 'Ringkasan', icon: 'home', section: 'operasional', exact: true },
  { href: '/admin/orders', label: 'Pesanan', icon: 'orders', section: 'operasional', permission: 'orders.read', writePermission: 'orders.update' },
  { href: '/admin/tickets', label: 'Tiket & Kontak', icon: 'tickets', section: 'operasional', permission: 'tickets.read', writePermission: 'tickets.reply' },
  { href: '/admin/incidents', label: 'Insiden & Maintenance', icon: 'incidents', section: 'operasional', permission: 'status.read', writePermission: 'status.manage' },
  { href: '/admin/customers', label: 'Pelanggan', icon: 'customers', section: 'operasional', permission: 'customers.read', writePermission: 'customers.update' },

  { href: '/admin/pricing', label: 'Formula Harga', icon: 'pricing', section: 'katalog', permission: 'pricing.read', writePermission: 'pricing.manage' },
  { href: '/admin/coupons', label: 'Kupon & Promosi', icon: 'coupons', section: 'katalog', permission: 'coupons.read', writePermission: 'coupons.manage' },
  { href: '/admin/products', label: 'Produk & Paket', icon: 'products', section: 'katalog', permission: 'products.read', writePermission: 'products.manage' },
  { href: '/admin/analytics', label: 'Analitik', icon: 'analytics', section: 'katalog', permission: 'analytics.read' },

  { href: '/admin/blog', label: 'Blog', icon: 'blog', section: 'konten', permission: 'content.read', writePermission: 'content.manage' },
  { href: '/admin/knowledge-base', label: 'Knowledge Base', icon: 'kb', section: 'konten', permission: 'content.read', writePermission: 'content.manage' },
  { href: '/admin/faq', label: 'FAQ', icon: 'faq', section: 'konten', permission: 'content.read', writePermission: 'content.manage' },
  { href: '/admin/testimonials', label: 'Testimoni', icon: 'testimonials', section: 'konten', permission: 'content.read', writePermission: 'content.manage' },
  { href: '/admin/announcements', label: 'Pengumuman', icon: 'announcements', section: 'konten', permission: 'content.read', writePermission: 'content.manage' },
  { href: '/admin/pages', label: 'Halaman & Legal', icon: 'pages', section: 'konten', permission: 'content.read', writePermission: 'content.manage' },

  { href: '/admin/theme', label: 'Tema & Branding', icon: 'theme', section: 'pengaturan', permission: 'settings.manage' },
  { href: '/admin/social', label: 'Sosial & Kontak', icon: 'social', section: 'pengaturan', permission: 'settings.manage' },
  { href: '/admin/infrastructure', label: 'Infrastruktur & Lokasi', icon: 'infrastructure', section: 'pengaturan', permission: 'settings.manage' },
  { href: '/admin/audit-logs', label: 'Audit Log', icon: 'audit', section: 'pengaturan', permission: 'audit.read' },

  { href: '/admin/roles', label: 'Peran & Izin', icon: 'roles', section: 'kepemilikan' },
  { href: '/admin/maintenance', label: 'Mode Maintenance', icon: 'maintenance', section: 'kepemilikan', permission: 'maintenance.manage' },
];

export interface VisibleNavItem extends AdminNavItem {
  /** True bila role hanya boleh membaca halaman ini. */
  readOnly: boolean;
}

/** Menu yang boleh dilihat sebuah role, lengkap dengan penanda baca-saja. */
export function navItemsForRole(role: Role): VisibleNavItem[] {
  return ADMIN_NAV.filter((item) => !item.permission || hasPermission(role, item.permission)).map((item) => ({
    ...item,
    readOnly: Boolean(item.writePermission) && !hasPermission(role, item.writePermission as Permission),
  }));
}

export interface AdminNavGroup {
  section: AdminNavSection;
  label: string;
  items: VisibleNavItem[];
}

/** Menu yang sudah dikelompokkan per bagian; bagian kosong dibuang. */
export function navGroupsForRole(role: Role): AdminNavGroup[] {
  const visible = navItemsForRole(role);
  return (Object.keys(ADMIN_NAV_SECTIONS) as AdminNavSection[])
    .map((section) => ({
      section,
      label: ADMIN_NAV_SECTIONS[section],
      items: visible.filter((item) => item.section === section),
    }))
    .filter((group) => group.items.length > 0);
}

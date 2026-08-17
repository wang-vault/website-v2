import type { Role } from '@/types';
import { ROLE_HIERARCHY } from '@/types';

/**
 * Matriks izin RBAC WangStore.
 *
 * Hierarchy: Owner > Admin > Staff > Customer.
 *
 * Model izin bersifat EKSPLISIT per role (bukan sekadar perbandingan angka
 * hierarki): setiap role memiliki daftar izin yang dituliskan satu per satu di
 * ROLE_PERMISSIONS. Admin mewarisi seluruh izin Staff, Owner mewarisi seluruh
 * izin Admin — pewarisan ditulis eksplisit lewat spread sehingga daftar izin
 * efektif setiap role dapat dibaca langsung dari kode dan diuji.
 *
 * Perbedaan inti Admin vs Staff:
 * - STAFF = peran OPERASIONAL. Menjalankan pekerjaan harian: memproses order,
 *   membalas tiket, dan memperbarui status layanan/insiden. Untuk data yang
 *   bersifat kebijakan (harga, kupon, produk, konten, pelanggan) staff hanya
 *   mendapat akses BACA agar dapat menjawab pelanggan dengan akurat.
 * - ADMIN = peran KONFIGURASI. Seluruh kemampuan staff, ditambah wewenang
 *   MENGUBAH hal yang berdampak komersial dan publik: formula harga, kupon,
 *   produk & paket, konten/CMS, dokumen legal, pengaturan situs, serta membaca
 *   analitik dan audit log.
 * - OWNER = peran KEPEMILIKAN. Seluruh kemampuan admin, ditambah dua wewenang
 *   yang tidak pernah didelegasikan: mengubah role pengguna dan menyalakan mode
 *   maintenance situs.
 *
 * Setiap API route admin WAJIB memanggil requireAdmin(permission) — verifikasi
 * dilakukan ulang di setiap route, tidak hanya di UI.
 */

export type Permission =
  // ── operasional (staff+)
  | 'orders.read'
  | 'orders.update'
  | 'tickets.read'
  | 'tickets.reply'
  | 'status.read'
  | 'status.manage'
  // ── baca-saja untuk mendukung pekerjaan operasional (staff+)
  | 'customers.read'
  | 'pricing.read'
  | 'coupons.read'
  | 'products.read'
  | 'content.read'
  | 'settings.read'
  // ── konfigurasi (admin+)
  | 'customers.update'
  | 'pricing.manage'
  | 'coupons.manage'
  | 'products.manage'
  | 'packages.manage'
  | 'content.manage'
  | 'legal.manage'
  | 'settings.manage'
  | 'analytics.read'
  | 'audit.read'
  // ── kepemilikan (owner)
  | 'roles.manage'
  | 'maintenance.manage';

/** Izin milik Staff — peran operasional harian. */
const STAFF_PERMISSIONS = [
  'orders.read',
  'orders.update',
  'tickets.read',
  'tickets.reply',
  'status.read',
  'status.manage',
  'customers.read',
  'pricing.read',
  'coupons.read',
  'products.read',
  'content.read',
  'settings.read',
] as const satisfies readonly Permission[];

/** Izin milik Admin — seluruh izin staff + wewenang konfigurasi. */
const ADMIN_PERMISSIONS = [
  ...STAFF_PERMISSIONS,
  'customers.update',
  'pricing.manage',
  'coupons.manage',
  'products.manage',
  'packages.manage',
  'content.manage',
  'legal.manage',
  'settings.manage',
  'analytics.read',
  'audit.read',
] as const satisfies readonly Permission[];

/** Izin milik Owner — seluruh izin admin + wewenang kepemilikan. */
const OWNER_PERMISSIONS = [
  ...ADMIN_PERMISSIONS,
  'roles.manage',
  'maintenance.manage',
] as const satisfies readonly Permission[];

/** Matriks izin efektif per role. Customer tidak memiliki izin panel apa pun. */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  customer: [],
  staff: STAFF_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  owner: OWNER_PERMISSIONS,
};

const ROLE_PERMISSION_SETS: Record<Role, ReadonlySet<Permission>> = {
  customer: new Set(ROLE_PERMISSIONS.customer),
  staff: new Set(ROLE_PERMISSIONS.staff),
  admin: new Set(ROLE_PERMISSIONS.admin),
  owner: new Set(ROLE_PERMISSIONS.owner),
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSION_SETS[role]?.has(permission) ?? false;
}

/** True bila role memiliki MINIMAL SATU dari daftar izin (untuk menu/halaman). */
export function hasAnyPermission(role: Role, permissions: readonly Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

/** True bila role memiliki SELURUH izin pada daftar. */
export function hasAllPermissions(role: Role, permissions: readonly Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

export function assertPermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    const error = new Error('FORBIDDEN');
    (error as Error & { status?: number }).status = 403;
    throw error;
  }
}

/** Role terendah yang memiliki izin ini — dipakai untuk dokumentasi & UI. */
export function minimumRoleFor(permission: Permission): Role {
  const roles: Role[] = ['staff', 'admin', 'owner'];
  return roles.find((role) => hasPermission(role, permission)) ?? 'owner';
}

/** Perbandingan hierarki — dipakai untuk aturan khusus (mis. proteksi owner). */
export function outranks(actor: Role, target: Role): boolean {
  return ROLE_HIERARCHY[actor] > ROLE_HIERARCHY[target];
}

// ─────────────────────────────────────────── metadata untuk UI & dokumentasi

export const PERMISSION_LABELS: Record<Permission, string> = {
  'orders.read': 'Lihat pesanan',
  'orders.update': 'Ubah status pesanan',
  'tickets.read': 'Lihat tiket',
  'tickets.reply': 'Balas tiket',
  'status.read': 'Lihat status & insiden',
  'status.manage': 'Kelola status layanan, insiden & jendela maintenance',
  'customers.read': 'Lihat daftar pelanggan',
  'pricing.read': 'Lihat formula harga',
  'coupons.read': 'Lihat kupon',
  'products.read': 'Lihat produk & paket',
  'content.read': 'Lihat konten (blog, KB, FAQ, halaman)',
  'settings.read': 'Lihat pengaturan situs',
  'customers.update': 'Ubah data pelanggan',
  'pricing.manage': 'Ubah formula harga',
  'coupons.manage': 'Buat & ubah kupon',
  'products.manage': 'Kelola produk',
  'packages.manage': 'Kelola paket',
  'content.manage': 'Buat, ubah & hapus konten',
  'legal.manage': 'Kelola dokumen legal',
  'settings.manage': 'Ubah pengaturan situs & branding',
  'analytics.read': 'Lihat analitik',
  'audit.read': 'Baca audit log',
  'roles.manage': 'Ubah role pengguna',
  'maintenance.manage': 'Kelola mode maintenance situs',
};

export interface PermissionGroup {
  label: string;
  description: string;
  permissions: readonly Permission[];
}

/** Pengelompokan izin untuk tabel matriks di halaman /admin/roles. */
export const PERMISSION_GROUPS: readonly PermissionGroup[] = [
  {
    label: 'Operasional harian',
    description: 'Pekerjaan rutin memproses pesanan dan melayani pelanggan.',
    permissions: ['orders.read', 'orders.update', 'tickets.read', 'tickets.reply', 'status.read', 'status.manage'],
  },
  {
    label: 'Akses baca',
    description: 'Data referensi yang boleh dilihat agar staf dapat menjawab pelanggan dengan akurat.',
    permissions: ['customers.read', 'pricing.read', 'coupons.read', 'products.read', 'content.read', 'settings.read'],
  },
  {
    label: 'Konfigurasi komersial',
    description: 'Perubahan yang berdampak pada harga dan penawaran.',
    permissions: ['pricing.manage', 'coupons.manage', 'products.manage', 'packages.manage'],
  },
  {
    label: 'Konten & pengaturan publik',
    description: 'Apa yang dilihat pengunjung situs.',
    permissions: ['content.manage', 'legal.manage', 'settings.manage'],
  },
  {
    label: 'Data sensitif & kepemilikan',
    description: 'Akses yang dibatasi ketat dan selalu tercatat di audit log.',
    permissions: ['customers.update', 'analytics.read', 'audit.read', 'roles.manage', 'maintenance.manage'],
  },
];

export interface RoleDefinition {
  role: Role;
  label: string;
  /** Ringkasan satu kalimat tentang tujuan role. */
  summary: string;
  /** Poin utama yang BOLEH dilakukan. */
  can: readonly string[];
  /** Batas tegas yang TIDAK boleh dilakukan. */
  cannot: readonly string[];
}

export const ROLE_DEFINITIONS: Record<Role, RoleDefinition> = {
  owner: {
    role: 'owner',
    label: 'Owner',
    summary: 'Pemilik platform — seluruh wewenang admin ditambah kendali role dan mode maintenance.',
    can: [
      'Semua yang dapat dilakukan Admin',
      'Mengubah role pengguna (menaikkan/menurunkan Staff dan Admin)',
      'Menyalakan dan mematikan mode maintenance situs',
    ],
    cannot: ['Menurunkan role Owner lain — proteksi agar kepemilikan tidak dapat dibajak'],
  },
  admin: {
    role: 'admin',
    label: 'Admin',
    summary: 'Pengelola konfigurasi — mengatur harga, penawaran, konten, dan pengaturan situs.',
    can: [
      'Semua yang dapat dilakukan Staff',
      'Mengubah formula harga, kupon, produk, dan paket',
      'Mengelola blog, knowledge base, FAQ, testimoni, halaman, dan dokumen legal',
      'Mengubah pengaturan situs, branding, kontak, dan infrastruktur',
      'Membaca analitik dan audit log',
    ],
    cannot: [
      'Mengubah role pengguna (khusus Owner)',
      'Menyalakan mode maintenance situs (khusus Owner)',
      'Mengubah nominal harga pada order yang sudah dibuat',
    ],
  },
  staff: {
    role: 'staff',
    label: 'Staff',
    summary: 'Pelaksana operasional — memproses pesanan, membalas tiket, dan memperbarui status layanan.',
    can: [
      'Melihat dan memperbarui status pesanan',
      'Membaca dan membalas tiket dukungan',
      'Mengelola status layanan, insiden, dan jendela maintenance terjadwal',
      'Melihat (baca-saja) pelanggan, harga, kupon, produk, dan konten sebagai rujukan',
    ],
    cannot: [
      'Mengubah formula harga, kupon, produk, atau paket',
      'Membuat atau mengubah konten, halaman, dan dokumen legal',
      'Mengubah pengaturan situs',
      'Membaca analitik dan audit log',
      'Mengubah role pengguna atau mode maintenance',
    ],
  },
  customer: {
    role: 'customer',
    label: 'Pelanggan',
    summary: 'Pengguna akhir — hanya dapat mengakses dashboard, pesanan, dan tiket miliknya sendiri.',
    can: ['Membuat pesanan dan tiket', 'Mengelola profil dan konfigurasi tersimpan miliknya sendiri'],
    cannot: ['Mengakses panel admin dalam bentuk apa pun'],
  },
};

/** Urutan tampil dari wewenang tertinggi ke terendah. */
export const ROLE_ORDER: readonly Role[] = ['owner', 'admin', 'staff', 'customer'];

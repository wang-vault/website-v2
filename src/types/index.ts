/**
 * Tipe domain inti WangStore.
 * Struktur ini dicerminkan oleh database/schema.sql (PostgreSQL/Supabase)
 * dan oleh fallback JSON datastore lokal.
 */

export type Role = 'owner' | 'admin' | 'staff' | 'customer';

export type Tier = 'low' | 'medium' | 'high';

/**
 * Jenis layanan yang dijual. `minecraft` memakai tier Low/Medium/High
 * (Server Builder), `vps` memakai katalog paket VPS tersendiri.
 */
export type ServiceType = 'minecraft' | 'vps';

/** Kunci katalog yang ketersediaannya dapat diatur admin: tier Minecraft + VPS. */
export type CatalogKey = Tier | 'vps';

export type TierStatus = 'available' | 'ongoing' | 'unavailable';

export type OrderStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'paid'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'refunded';

export type TicketStatus = 'open' | 'pending' | 'closed';

export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';

export type IncidentSeverity = 'none' | 'minor' | 'major' | 'critical';

export type MaintenanceStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

export type PublishStatus = 'draft' | 'published';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  emailVerified: boolean;
  emailVerificationToken: string | null;
  resetToken: string | null;
  resetTokenExpiresAt: string | null;
  tokenVersion: number;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface ProfileRecord {
  userId: string;
  fullName: string;
  whatsapp: string;
  discord: string;
  bio: string;
  updatedAt: string;
}

export interface ProductRecord {
  id: string;
  slug: string;
  name: string;
  description: string;
  tier: Tier;
  status: 'active' | 'inactive';
  /**
   * Kaitan ke katalog yang benar-benar dijual (tier Minecraft atau VPS).
   * null = entri katalog informasional (layanan yang belum ditawarkan) —
   * ditampilkan tanpa tombol pemesanan.
   */
  catalogKey: CatalogKey | null;
  packageId: string | null;
  price: number | null;
  visibility: 'public' | 'hidden';
  metadata: Record<string, string>;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PackageRecord {
  id: string; // slug, mis. high-4c8g
  label: string;
  tier: Tier;
  cpu: number;
  ramGb: number;
  storageGb: number;
  price: number;
  popular: boolean;
  /**
   * Layanan pada paket ini dapat diperpanjang pelanggan. Paket promo atau
   * paket yang dihentikan dapat ditandai false — pelanggan diberi tahu jujur
   * bahwa perpanjangan tidak tersedia, bukan dibiarkan memesan lalu ditolak.
   */
  renewable: boolean;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Paket VPS — katalog terpisah dari paket Minecraft karena atribut yang
 * dijual berbeda (bandwidth, sistem operasi, lokasi, IPv4).
 * Harga bersifat final; tidak ada formula turunan seperti tier Low.
 */
export interface VpsPackageRecord {
  id: string; // slug, mis. vps-2c4g
  label: string;
  description: string;
  vcpu: number;
  ramGb: number;
  storageGb: number;
  /** Kuota transfer data per bulan (TB). 0 = tidak dibatasi/tidak dicantumkan. */
  bandwidthTb: number;
  /** Paket VPS ini dapat diperpanjang pelanggan setelah masa aktif berjalan. */
  renewable: boolean;
  /** Sistem operasi yang tersedia, mis. Ubuntu 24.04, Debian 12. */
  operatingSystems: string[];
  /** Lokasi datacenter yang ditawarkan untuk paket ini. */
  locations: string[];
  price: number;
  popular: boolean;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PricingRulesRecord {
  id: string;
  base: number;
  perCore: number;
  perGbRam: number;
  perGbStorage: number;
  roundTo: number;
  minPrice: number;
  updatedBy: string | null;
  updatedAt: string;
}

export interface CouponRecord {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrder: number;
  maxUses: number | null;
  usedCount: number;
  usesPerCustomer: number;
  active: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  applicableTiers: Tier[];
  applicablePackages: string[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CouponUsageRecord {
  id: string;
  couponId: string;
  orderId: string;
  customerKey: string;
  createdAt: string;
}

export interface OrderRecord {
  id: string;
  userId: string | null;
  customerName: string;
  customerWhatsapp: string;
  customerEmail: string;
  serverName: string;
  notes: string;
  /** Layanan yang dipesan. Order lama tanpa nilai dianggap 'minecraft'. */
  service: ServiceType;
  /** Tier hanya berlaku untuk layanan Minecraft — null untuk order VPS. */
  tier: Tier | null;
  packageId: string | null;
  cpu: number;
  ramGb: number;
  storageGb: number;
  unitPrice: number;
  discountAmount: number;
  couponCode: string | null;
  total: number;
  status: OrderStatus;
  ipAddress: string | null;
  /**
   * Masa aktif layanan — ditetapkan admin setelah layanan benar-benar
   * disiapkan. Tidak diisi otomatis saat order dibuat karena aktivasi
   * bergantung pada proses di luar aplikasi.
   */
  activatedAt: string | null;
  /** Akhir masa berlaku layanan. null = belum ditentukan. */
  expiresAt: string | null;
  /**
   * Tahap pengingat yang sudah dikirim untuk siklus masa aktif saat ini
   * (jumlah hari sebelum kedaluwarsa; 0 = hari kedaluwarsa). Direset saat
   * admin memperpanjang masa aktif.
   */
  remindersSent: number[];
  /** Waktu pengingat terakhir dikirim — untuk transparansi di panel. */
  lastReminderAt: string | null;
  /**
   * Order induk bila order ini adalah PERPANJANGAN layanan. null = order baru.
   * Harga perpanjangan dihitung ulang dari katalog saat perpanjangan dibuat.
   */
  renewalOfOrderId: string | null;
  /**
   * Waktu perpanjangan ini diterapkan ke masa aktif order induk. Menjaga
   * agar satu order perpanjangan tidak pernah menambah masa aktif dua kali.
   */
  renewalAppliedAt: string | null;
  /** Hash SHA-256 dari token akses untuk halaman konfirmasi (guest). */
  accessTokenHash: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItemRecord {
  id: string;
  orderId: string;
  productId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface SavedConfigurationRecord {
  id: string;
  userId: string;
  name: string;
  tier: Tier;
  packageId: string | null;
  cpu: number;
  ramGb: number;
  storageGb: number;
  createdAt: string;
  updatedAt: string;
}

export interface TicketRecord {
  id: string;
  userId: string | null;
  customerEmail: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
}

export interface TicketMessageRecord {
  id: string;
  ticketId: string;
  authorEmail: string;
  isStaff: boolean;
  message: string;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface BlogCategoryRecord {
  id: string;
  slug: string;
  name: string;
  description: string;
}

export interface BlogPostRecord {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  categoryId: string | null;
  tags: string[];
  author: string;
  status: PublishStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeArticleRecord {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  status: PublishStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FaqItemRecord {
  id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  active: boolean;
}

export interface TestimonialRecord {
  id: string;
  name: string;
  role: string;
  content: string;
  rating: number | null;
  active: boolean;
  createdAt: string;
}

export interface CmsPageRecord {
  id: string;
  slug: string;
  title: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  updatedAt: string;
}

export interface LegalDocumentRecord {
  id: string;
  slug: string;
  title: string;
  content: string;
  version: string;
  publishedAt: string | null;
  updatedAt: string;
}

export interface IncidentUpdateRecord {
  id: string;
  message: string;
  status: IncidentStatus;
  createdAt: string;
}

export interface IncidentRecord {
  id: string;
  title: string;
  description: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  affectedServices: string[];
  startedAt: string;
  resolvedAt: string | null;
  updates: IncidentUpdateRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceWindowRecord {
  id: string;
  title: string;
  description: string;
  status: MaintenanceStatus;
  affectedServices: string[];
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementRecord {
  id: string;
  title: string;
  message: string;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  actorId: string | null;
  actorEmail: string;
  action: string;
  resource: string;
  resourceId: string | null;
  ipAddress: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ServiceStatusRecord {
  name: string;
  status: 'operational' | 'degraded' | 'outage' | 'maintenance';
  description: string;
}

export interface SettingsRecord {
  /** nama situs, tagline, deskripsi meta */
  siteName: string;
  tagline: string;
  siteDescription: string;
  /** kontak */
  whatsappNumber: string;
  discordInviteUrl: string;
  contactEmail: string;
  /** maintenance mode */
  maintenanceMode: boolean;
  maintenanceTitle: string;
  maintenanceMessage: string;
  maintenanceEstimatedRestoration: string;
  maintenanceAllowedPaths: string[];
  /** status layanan */
  platformStatus: 'operational' | 'degraded' | 'outage' | 'maintenance';
  services: ServiceStatusRecord[];
  /**
   * Ketersediaan katalog per tier Minecraft dan VPS.
   * Menentukan apakah sebuah layanan dapat dipesan — diverifikasi server-side
   * pada pembuatan order, bukan hanya disembunyikan di UI.
   */
  catalogStatus: Record<CatalogKey, TierStatus>;
  /** infrastruktur */
  infrastructureNote: string;
  locations: string[];
  /** pembayaran manual */
  paymentInstructions: string;
  /** pengumuman ditampilkan sebagai banner */
  announcementBanner: string;
}

export interface RateLimitRecord {
  key: string;
  count: number;
  resetAt: number;
}

export const TIER_LABELS: Record<Tier, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const TIER_DESCRIPTIONS: Record<Tier, string> = {
  low: 'Konfigurasi custom dengan CPU, RAM, dan penyimpanan yang Anda tentukan sendiri.',
  medium: 'Paket tetap kelas menengah dengan spesifikasi dan harga final.',
  high: 'Paket tetap dengan spesifikasi dan harga final yang sudah ditentukan.',
};

/**
 * Ketersediaan bawaan bila belum pernah diatur admin.
 * Nilai runtime yang berlaku selalu berasal dari settings.catalogStatus.
 */
export const DEFAULT_CATALOG_STATUS: Record<CatalogKey, TierStatus> = {
  low: 'available',
  medium: 'available',
  high: 'available',
  vps: 'available',
};

export const CATALOG_LABELS: Record<CatalogKey, string> = {
  low: 'Minecraft — Low',
  medium: 'Minecraft — Medium',
  high: 'Minecraft — High',
  vps: 'VPS',
};

export const TIER_STATUS_LABELS: Record<TierStatus, string> = {
  available: 'Tersedia',
  ongoing: 'Sedang Disiapkan',
  unavailable: 'Tidak Tersedia',
};

export const SERVICE_LABELS: Record<ServiceType, string> = {
  minecraft: 'Minecraft Hosting',
  vps: 'VPS',
};

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  staff: 'Staff',
  customer: 'Pelanggan',
};

export const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 3,
  admin: 2,
  staff: 1,
  customer: 0,
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Menunggu',
  awaiting_payment: 'Menunggu Pembayaran',
  paid: 'Lunas',
  processing: 'Diproses',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  expired: 'Kedaluwarsa',
  refunded: 'Dikembalikan',
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Terbuka',
  pending: 'Menunggu Balasan',
  closed: 'Ditutup',
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Rendah',
  medium: 'Normal',
  high: 'Tinggi',
  critical: 'Kritis',
};

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  investigating: 'Sedang Diselidiki',
  identified: 'Terdeteksi',
  monitoring: 'Dalam Pemantauan',
  resolved: 'Selesai',
};

export const INCIDENT_SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  none: 'Tidak Berdampak',
  minor: 'Minor',
  major: 'Mayor',
  critical: 'Kritis',
};

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  scheduled: 'Terjadwal',
  active: 'Berlangsung',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

export const KB_CATEGORIES = [
  'Memulai',
  'Pemesanan',
  'Pembayaran',
  'Minecraft',
  'Server',
  'Troubleshooting',
  'Akun',
  'Kebijakan',
] as const;

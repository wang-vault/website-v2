import type { OrderRecord, OrderStatus, TierStatus } from '@/types';

/**
 * Perpanjangan layanan.
 *
 * Perpanjangan dibuat sebagai ORDER BARU yang tertaut ke order induk
 * (`renewalOfOrderId`), dengan harga dihitung ulang dari katalog saat itu —
 * bukan menyalin harga lama. Setelah order perpanjangan ditandai lunas oleh
 * admin, masa aktif order induk otomatis mundur satu bulan.
 *
 * Tidak semua layanan dapat diperpanjang: paket (Minecraft maupun VPS) memiliki
 * penanda `renewable`. Paket promo atau paket yang dihentikan dapat ditandai
 * tidak dapat diperpanjang, dan pelanggan diberi tahu alasannya secara jujur
 * di muka — bukan dibiarkan memesan lalu ditolak belakangan.
 *
 * Modul ini murni (tanpa I/O) agar dapat diuji.
 */

/** Satu perpanjangan menambah satu bulan masa aktif. */
export const RENEWAL_MONTHS = 1;

export type RenewalBlockReason =
  | 'package_not_renewable'
  | 'package_missing'
  | 'catalog_unavailable'
  | 'order_inactive'
  | 'period_not_set'
  | 'renewal_pending'
  | 'is_renewal_order';

export interface RenewalEligibility {
  allowed: boolean;
  reason: RenewalBlockReason | null;
  /** Penjelasan yang ditampilkan apa adanya kepada pelanggan. */
  message: string;
}

/** Status order induk yang tidak dapat diperpanjang. */
const CLOSED_STATUSES: ReadonlySet<OrderStatus> = new Set<OrderStatus>(['cancelled', 'refunded']);

/** Status order perpanjangan yang masih berjalan (mencegah duplikasi). */
const PENDING_STATUSES: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  'pending',
  'awaiting_payment',
  'paid',
  'processing',
]);

export function isRenewalPending(renewals: Pick<OrderRecord, 'status' | 'renewalAppliedAt'>[]): boolean {
  return renewals.some((renewal) => !renewal.renewalAppliedAt && PENDING_STATUSES.has(renewal.status));
}

export interface RenewalContext {
  order: Pick<OrderRecord, 'status' | 'expiresAt' | 'renewalOfOrderId'>;
  /** Penanda renewable paket terkait. null bila layanan tidak memakai paket (tier Low custom). */
  packageRenewable: boolean | null;
  /** Paket masih ada di katalog & aktif. Tier Low custom selalu true. */
  packageAvailable: boolean;
  /** Status katalog layanan tersebut (available/ongoing/unavailable). */
  catalogStatus: TierStatus;
  /** Ada order perpanjangan yang masih berjalan. */
  renewalPending: boolean;
}

export function evaluateRenewal(context: RenewalContext): RenewalEligibility {
  const { order } = context;

  if (order.renewalOfOrderId) {
    return {
      allowed: false,
      reason: 'is_renewal_order',
      message:
        'Order ini adalah order perpanjangan. Perpanjangan berikutnya dilakukan dari order layanan utama.',
    };
  }

  if (CLOSED_STATUSES.has(order.status)) {
    return {
      allowed: false,
      reason: 'order_inactive',
      message: 'Order yang dibatalkan atau direfund tidak dapat diperpanjang.',
    };
  }

  if (!order.expiresAt) {
    return {
      allowed: false,
      reason: 'period_not_set',
      message:
        'Masa aktif layanan ini belum ditetapkan tim WangStore, jadi belum ada yang dapat diperpanjang.',
    };
  }

  if (context.packageRenewable === false) {
    return {
      allowed: false,
      reason: 'package_not_renewable',
      message:
        'Paket ini tidak menyediakan perpanjangan. Hubungi tim WangStore untuk pindah ke paket lain yang tersedia.',
    };
  }

  if (!context.packageAvailable) {
    return {
      allowed: false,
      reason: 'package_missing',
      message:
        'Paket pada order ini sudah tidak tersedia di katalog, sehingga tidak dapat diperpanjang. Hubungi tim WangStore untuk paket pengganti.',
    };
  }

  if (context.catalogStatus !== 'available') {
    return {
      allowed: false,
      reason: 'catalog_unavailable',
      message:
        context.catalogStatus === 'ongoing'
          ? 'Layanan ini sedang dipersiapkan sehingga perpanjangan belum dibuka.'
          : 'Layanan ini sedang tidak tersedia sehingga perpanjangan tidak dapat diproses.',
    };
  }

  if (context.renewalPending) {
    return {
      allowed: false,
      reason: 'renewal_pending',
      message:
        'Sudah ada order perpanjangan yang sedang diproses untuk layanan ini. Selesaikan order tersebut terlebih dahulu.',
    };
  }

  return {
    allowed: true,
    reason: null,
    message: `Perpanjang layanan ${RENEWAL_MONTHS} bulan. Harga mengikuti katalog yang berlaku saat ini.`,
  };
}

/**
 * Menambah bulan pada sebuah tanggal dengan aman terhadap akhir bulan
 * (31 Januari + 1 bulan → 28/29 Februari, bukan melompat ke Maret).
 */
export function addMonths(from: Date, months: number): Date {
  const result = new Date(from.getTime());
  const day = result.getUTCDate();
  result.setUTCMonth(result.getUTCMonth() + months);
  if (result.getUTCDate() < day) {
    // Melewati akhir bulan → mundur ke hari terakhir bulan tujuan.
    result.setUTCDate(0);
  }
  return result;
}

/**
 * Tanggal kedaluwarsa baru setelah perpanjangan.
 *
 * Dihitung dari tanggal kedaluwarsa lama bila masih berjalan (sisa hari tidak
 * hangus), atau dari sekarang bila masa aktif sudah lewat.
 */
export function nextExpiry(currentExpiry: string | null, now: Date = new Date()): string {
  const current = currentExpiry ? new Date(currentExpiry) : null;
  const base = current && !Number.isNaN(current.getTime()) && current.getTime() > now.getTime() ? current : now;
  return addMonths(base, RENEWAL_MONTHS).toISOString();
}

/** Label untuk UI daftar order. */
export function renewalLabel(order: Pick<OrderRecord, 'renewalOfOrderId'>): string | null {
  return order.renewalOfOrderId ? `Perpanjangan dari ${order.renewalOfOrderId}` : null;
}

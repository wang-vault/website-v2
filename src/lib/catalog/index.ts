import { CATALOG_LABELS, DEFAULT_CATALOG_STATUS, SERVICE_LABELS, TIER_LABELS, TIER_STATUS_LABELS } from '@/types';
import type { CatalogKey, ServiceType, SettingsRecord, Tier, TierStatus } from '@/types';

/**
 * Ketersediaan katalog (tier Minecraft Low/Medium/High + VPS).
 *
 * Status disimpan di settings sehingga admin dapat mengubahnya dari panel —
 * tidak lagi dikunci di kode. Status inilah yang menentukan apakah sebuah
 * layanan dapat dipesan, dan SELALU diverifikasi ulang di server saat order
 * dibuat (bukan hanya disembunyikan di UI).
 *
 * - available   : dijual, dapat dipesan.
 * - ongoing     : sedang disiapkan, ditampilkan tetapi belum dapat dipesan.
 * - unavailable : tidak ditawarkan sama sekali.
 */

export const CATALOG_KEYS: readonly CatalogKey[] = ['low', 'medium', 'high', 'vps'];

function isTierStatus(value: unknown): value is TierStatus {
  return value === 'available' || value === 'ongoing' || value === 'unavailable';
}

/**
 * Membaca status katalog dari settings dengan fallback ke nilai bawaan.
 * Toleran terhadap baris settings lama yang belum memiliki kolom catalogStatus.
 */
export function resolveCatalogStatus(
  settings: Pick<SettingsRecord, 'catalogStatus'> | null | undefined,
): Record<CatalogKey, TierStatus> {
  const stored = (settings?.catalogStatus ?? {}) as Partial<Record<CatalogKey, unknown>>;
  const resolved = {} as Record<CatalogKey, TierStatus>;
  for (const key of CATALOG_KEYS) {
    const value = stored[key];
    resolved[key] = isTierStatus(value) ? value : DEFAULT_CATALOG_STATUS[key];
  }
  return resolved;
}

/** Hanya status `available` yang dapat dipesan. */
export function isOrderable(status: TierStatus): boolean {
  return status === 'available';
}

/** Alasan penolakan yang jujur untuk ditampilkan ke pelanggan. */
export function unavailableReason(key: CatalogKey, status: TierStatus): string {
  const label = CATALOG_LABELS[key];
  if (status === 'ongoing') {
    return `${label} sedang dipersiapkan dan belum dapat dipesan.`;
  }
  return `${label} sedang tidak tersedia untuk dipesan.`;
}

/** Kode error API sesuai status — dipakai untuk membedakan 409 vs 409 unavailable. */
export function unavailableCode(status: TierStatus): 'TIER_ONGOING' | 'TIER_UNAVAILABLE' {
  return status === 'ongoing' ? 'TIER_ONGOING' : 'TIER_UNAVAILABLE';
}

export function statusLabel(status: TierStatus): string {
  return TIER_STATUS_LABELS[status];
}

/** Tier Minecraft yang sedang dijual, untuk UI Server Builder. */
export function orderableTiers(status: Record<CatalogKey, TierStatus>): Tier[] {
  return (['low', 'medium', 'high'] as Tier[]).filter((tier) => isOrderable(status[tier]));
}

/**
 * Label layanan sebuah order untuk ditampilkan di UI dan pesan WhatsApp.
 * Order Minecraft memakai label tier, order VPS memakai label VPS —
 * satu helper agar tidak ada `TIER_LABELS[order.tier]` yang pecah saat null.
 */
export function orderCatalogLabel(order: { service: ServiceType; tier: Tier | null }): string {
  if (order.service === 'vps') return SERVICE_LABELS.vps;
  return order.tier ? TIER_LABELS[order.tier] : SERVICE_LABELS.minecraft;
}

/** Kunci katalog sebuah order (untuk statistik dan pengelompokan). */
export function orderCatalogKey(order: { service: ServiceType; tier: Tier | null }): CatalogKey {
  return order.service === 'vps' ? 'vps' : (order.tier ?? 'low');
}

import type { OrderRecord } from '@/types';

/**
 * Pengingat masa aktif layanan.
 *
 * Masa aktif ditetapkan ADMIN (bukan otomatis saat order dibuat), karena
 * aktivasi layanan terjadi di luar aplikasi. Dua tanggal disimpan pada order:
 * - activatedAt : layanan mulai berjalan.
 * - expiresAt   : akhir masa berlaku.
 *
 * Modul ini murni (tanpa I/O) agar dapat diuji: ia hanya menentukan keadaan
 * layanan dan tahap pengingat mana yang jatuh tempo. Pengiriman notifikasi &
 * email dilakukan oleh src/lib/reminders/service.ts.
 *
 * Kejujuran: aplikasi TIDAK mengubah status order secara otomatis saat masa
 * aktif habis — keputusan itu milik admin (pelanggan bisa saja sudah membayar
 * perpanjangan di luar sistem). Pengingat hanya memberi tahu.
 */

/** Tahap pengingat dalam jumlah hari sebelum kedaluwarsa. 0 = hari kedaluwarsa. */
export const REMINDER_STAGES: readonly number[] = [7, 3, 1, 0];

/** Ambang "akan segera berakhir" untuk badge dan ringkasan admin. */
export const EXPIRING_SOON_DAYS = 7;

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type ServiceState =
  /** Admin belum menetapkan masa aktif. */
  | 'unset'
  /** Tanggal aktif masih di masa depan. */
  | 'scheduled'
  /** Sedang berjalan. */
  | 'active'
  /** Berjalan, tetapi tersisa ≤ EXPIRING_SOON_DAYS hari. */
  | 'expiring_soon'
  /** Sudah melewati tanggal kedaluwarsa. */
  | 'expired';

export const SERVICE_STATE_LABELS: Record<ServiceState, string> = {
  unset: 'Belum diatur',
  scheduled: 'Terjadwal',
  active: 'Aktif',
  expiring_soon: 'Segera berakhir',
  expired: 'Masa aktif habis',
};

export interface ServicePeriod {
  activatedAt: string | null;
  expiresAt: string | null;
}

function toTime(value: string | null): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

/**
 * Sisa hari menuju kedaluwarsa (dibulatkan ke atas).
 * 1 = berakhir dalam ≤ 24 jam, 0 = tepat/lewat hari ini, negatif = sudah lewat.
 */
export function daysUntilExpiry(expiresAt: string | null, now: Date = new Date()): number | null {
  const expiry = toTime(expiresAt);
  if (expiry === null) return null;
  return Math.ceil((expiry - now.getTime()) / MS_PER_DAY);
}

/** Lama layanan sudah berjalan dalam hari (null bila belum aktif). */
export function daysSinceActivation(activatedAt: string | null, now: Date = new Date()): number | null {
  const activated = toTime(activatedAt);
  if (activated === null) return null;
  return Math.floor((now.getTime() - activated) / MS_PER_DAY);
}

export function serviceState(period: ServicePeriod, now: Date = new Date()): ServiceState {
  const activated = toTime(period.activatedAt);
  const expiry = toTime(period.expiresAt);
  if (activated === null && expiry === null) return 'unset';
  if (activated !== null && activated > now.getTime()) return 'scheduled';
  if (expiry === null) return 'active';
  const remaining = Math.ceil((expiry - now.getTime()) / MS_PER_DAY);
  if (remaining < 0) return 'expired';
  if (remaining <= EXPIRING_SOON_DAYS) return 'expiring_soon';
  return 'active';
}

/** Status order yang tidak perlu diingatkan lagi. */
const INACTIVE_ORDER_STATUSES = new Set(['cancelled', 'refunded', 'expired']);

export function reminderEligible(order: Pick<OrderRecord, 'status' | 'expiresAt'>): boolean {
  if (!order.expiresAt) return false;
  return !INACTIVE_ORDER_STATUSES.has(order.status);
}

/**
 * Tahap pengingat yang jatuh tempo untuk sebuah order.
 *
 * Aturan: sebuah tahap H-n jatuh tempo ketika sisa hari ≤ n dan tahap itu
 * belum pernah dikirim pada siklus berjalan. Bila beberapa tahap terlewat
 * (mis. cron mati beberapa hari), hanya tahap TERDEKAT yang dikirim agar
 * pelanggan tidak menerima banjir pesan sekaligus — sisanya ditandai terkirim
 * oleh pemanggil.
 */
export function dueStages(
  order: Pick<OrderRecord, 'status' | 'expiresAt' | 'remindersSent'>,
  now: Date = new Date(),
): number[] {
  if (!reminderEligible(order)) return [];
  const remaining = daysUntilExpiry(order.expiresAt, now);
  if (remaining === null) return [];
  const sent = new Set(order.remindersSent ?? []);
  return REMINDER_STAGES.filter((stage) => remaining <= stage && !sent.has(stage));
}

/**
 * Tahap yang benar-benar dikirim (paling dekat dengan kedaluwarsa) beserta
 * tahap lain yang harus ditandai terkirim agar tidak menumpuk di kemudian hari.
 */
export function nextReminder(
  order: Pick<OrderRecord, 'status' | 'expiresAt' | 'remindersSent'>,
  now: Date = new Date(),
): { stage: number; alsoMark: number[] } | null {
  const due = dueStages(order, now);
  if (due.length === 0) return null;
  const stage = Math.min(...due);
  return { stage, alsoMark: due.filter((value) => value !== stage) };
}

export function reminderStageLabel(stage: number): string {
  if (stage <= 0) return 'Masa aktif berakhir hari ini';
  if (stage === 1) return 'Masa aktif berakhir besok';
  return `Masa aktif berakhir dalam ${stage} hari`;
}

/** Ringkasan untuk panel admin. */
export interface ExpirySummary {
  expiringSoon: number;
  expired: number;
  scheduled: number;
  active: number;
}

export function summarizeExpiry(
  orders: Pick<OrderRecord, 'status' | 'activatedAt' | 'expiresAt'>[],
  now: Date = new Date(),
): ExpirySummary {
  const summary: ExpirySummary = { expiringSoon: 0, expired: 0, scheduled: 0, active: 0 };
  for (const order of orders) {
    if (INACTIVE_ORDER_STATUSES.has(order.status)) continue;
    const state = serviceState(order, now);
    if (state === 'expiring_soon') summary.expiringSoon += 1;
    else if (state === 'expired') summary.expired += 1;
    else if (state === 'scheduled') summary.scheduled += 1;
    else if (state === 'active') summary.active += 1;
  }
  return summary;
}

/** Teks sisa waktu yang jujur untuk UI ("3 hari lagi", "lewat 2 hari"). */
export function remainingLabel(expiresAt: string | null, now: Date = new Date()): string {
  const remaining = daysUntilExpiry(expiresAt, now);
  if (remaining === null) return '—';
  if (remaining < 0) return `Lewat ${Math.abs(remaining)} hari`;
  if (remaining === 0) return 'Berakhir hari ini';
  if (remaining === 1) return 'Berakhir besok';
  return `${remaining} hari lagi`;
}

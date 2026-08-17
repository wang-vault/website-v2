import { createHash, randomBytes } from 'node:crypto';
import { getDb } from '@/lib/db';
import { ApiErrorException } from '@/lib/api';
import { resolveCatalogStatus } from '@/lib/catalog';
import { calculateLowPrice, findHighPackage, TIER_DEFINITIONS } from '@/lib/pricing';
import { buildWhatsAppOrderUrl } from '@/lib/whatsapp';
import { formatDateTime, formatRupiah } from '@/lib/utils';
import { RENEWAL_MONTHS, evaluateRenewal, isRenewalPending, nextExpiry } from '@/lib/renewals';
import type { RenewalEligibility } from '@/lib/renewals';
import type { DataStore } from '@/lib/db/types';
import type { CatalogKey, OrderRecord } from '@/types';

/**
 * Layanan perpanjangan.
 *
 * Perpanjangan SELALU menjadi order baru yang tertaut ke order induk, dengan
 * harga dihitung ulang dari katalog saat ini — harga lama tidak pernah disalin
 * dan nilai dari klien tidak pernah dipercaya.
 */

export interface RenewalPricing {
  /** Harga satu periode perpanjangan menurut katalog saat ini. */
  unitPrice: number;
  description: string;
  packageId: string | null;
  cpu: number;
  ramGb: number;
  storageGb: number;
  /** Penanda renewable paket (null bila tier Low custom). */
  packageRenewable: boolean | null;
  packageAvailable: boolean;
}

function catalogKeyOf(order: Pick<OrderRecord, 'service' | 'tier'>): CatalogKey {
  return order.service === 'vps' ? 'vps' : (order.tier ?? 'low');
}

/**
 * Harga & kelayakan paket untuk perpanjangan sebuah order, dibaca dari katalog
 * yang berlaku sekarang (paket bisa berubah harga, dinonaktifkan, atau ditandai
 * tidak dapat diperpanjang sejak order pertama dibuat).
 */
export async function resolveRenewalPricing(db: DataStore, order: OrderRecord): Promise<RenewalPricing> {
  if (order.service === 'vps') {
    const pkg = order.packageId ? await db.vpsPackages.get(order.packageId) : null;
    return {
      unitPrice: pkg?.price ?? 0,
      description: `Perpanjangan ${RENEWAL_MONTHS} bulan — VPS ${pkg?.label ?? order.packageId ?? ''} (${order.serverName})`,
      packageId: order.packageId,
      cpu: pkg?.vcpu ?? order.cpu,
      ramGb: pkg?.ramGb ?? order.ramGb,
      storageGb: pkg?.storageGb ?? order.storageGb,
      packageRenewable: pkg ? pkg.renewable : null,
      packageAvailable: Boolean(pkg && pkg.active),
    };
  }

  const tier = order.tier ?? 'low';
  if (TIER_DEFINITIONS[tier].mode === 'package') {
    const pkg = order.packageId ? await db.packages.get(order.packageId) : null;
    const fallback = !pkg && tier === 'high' ? findHighPackage(order.packageId ?? '') : null;
    const source = pkg ?? fallback;
    return {
      unitPrice: source?.price ?? 0,
      description: `Perpanjangan ${RENEWAL_MONTHS} bulan — ${source?.label ?? order.packageId ?? ''} (${order.serverName})`,
      packageId: order.packageId,
      cpu: source?.cpu ?? order.cpu,
      ramGb: source?.ramGb ?? order.ramGb,
      storageGb: source?.storageGb ?? order.storageGb,
      packageRenewable: pkg ? pkg.renewable : fallback ? true : null,
      packageAvailable: Boolean(pkg ? pkg.active && pkg.tier === tier : fallback),
    };
  }

  // Tier Low: konfigurasi custom — harga dihitung ulang dengan formula saat ini.
  const rules = await db.pricing.get();
  const price = calculateLowPrice(
    { cpu: order.cpu, ramGb: order.ramGb, storageGb: order.storageGb },
    {
      base: rules.base,
      perCore: rules.perCore,
      perGbRam: rules.perGbRam,
      perGbStorage: rules.perGbStorage,
      roundTo: rules.roundTo,
      minPrice: rules.minPrice,
    },
  );
  return {
    unitPrice: price,
    description: `Perpanjangan ${RENEWAL_MONTHS} bulan — Server custom ${order.cpu}C/${order.ramGb}G/${order.storageGb}G (${order.serverName})`,
    packageId: null,
    cpu: order.cpu,
    ramGb: order.ramGb,
    storageGb: order.storageGb,
    packageRenewable: null,
    packageAvailable: true,
  };
}

export interface RenewalStatus {
  eligibility: RenewalEligibility;
  pricing: RenewalPricing;
  /** Perkiraan masa berlaku baru bila perpanjangan diselesaikan sekarang. */
  projectedExpiry: string;
  months: number;
}

/** Status perpanjangan sebuah order — dipakai UI dan endpoint. */
export async function getRenewalStatus(db: DataStore, order: OrderRecord): Promise<RenewalStatus> {
  const [pricing, settings, renewals] = await Promise.all([
    resolveRenewalPricing(db, order),
    db.settings.get(),
    db.orders.listRenewals(order.id),
  ]);
  const catalogStatus = resolveCatalogStatus(settings)[catalogKeyOf(order)];

  const eligibility = evaluateRenewal({
    order,
    packageRenewable: pricing.packageRenewable,
    packageAvailable: pricing.packageAvailable,
    catalogStatus,
    renewalPending: isRenewalPending(renewals),
  });

  return {
    eligibility,
    pricing,
    projectedExpiry: nextExpiry(order.expiresAt),
    months: RENEWAL_MONTHS,
  };
}

export interface CreateRenewalContext {
  userId: string | null;
  actorEmail: string;
  ipAddress: string | null;
  appUrl: string;
}

export interface CreateRenewalResult {
  order: OrderRecord;
  whatsappUrl: string | null;
  accessToken: string;
}

function hashAccessToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Membuat order perpanjangan untuk sebuah order induk.
 * Kelayakan dan harga diverifikasi ulang di sini — bukan hanya di UI.
 */
export async function createRenewalOrder(
  parentOrderId: string,
  context: CreateRenewalContext,
): Promise<CreateRenewalResult> {
  const db = await getDb();
  const parent = await db.orders.findById(parentOrderId);
  if (!parent) {
    throw new ApiErrorException(404, 'NOT_FOUND', 'Order tidak ditemukan.');
  }

  const status = await getRenewalStatus(db, parent);
  if (!status.eligibility.allowed) {
    throw new ApiErrorException(
      409,
      `RENEWAL_${(status.eligibility.reason ?? 'BLOCKED').toUpperCase()}`,
      status.eligibility.message,
    );
  }
  if (status.pricing.unitPrice <= 0) {
    throw new ApiErrorException(
      409,
      'RENEWAL_PRICE_UNAVAILABLE',
      'Harga perpanjangan belum tersedia untuk paket ini. Hubungi tim WangStore.',
    );
  }

  const settings = await db.settings.get();
  const accessToken = randomBytes(24).toString('base64url');

  const order = await db.orders.create({
    order: {
      userId: parent.userId,
      customerName: parent.customerName,
      customerWhatsapp: parent.customerWhatsapp,
      customerEmail: parent.customerEmail,
      serverName: parent.serverName,
      notes: `Perpanjangan layanan untuk order ${parent.id}.`,
      service: parent.service,
      tier: parent.tier,
      packageId: status.pricing.packageId,
      cpu: status.pricing.cpu,
      ramGb: status.pricing.ramGb,
      storageGb: status.pricing.storageGb,
      unitPrice: status.pricing.unitPrice,
      discountAmount: 0,
      couponCode: null,
      total: status.pricing.unitPrice,
      status: 'pending',
      ipAddress: context.ipAddress,
      activatedAt: null,
      expiresAt: null,
      remindersSent: [],
      lastReminderAt: null,
      renewalOfOrderId: parent.id,
      renewalAppliedAt: null,
      accessTokenHash: hashAccessToken(accessToken),
    },
    item: {
      description: status.pricing.description,
      quantity: 1,
      unitPrice: status.pricing.unitPrice,
      total: status.pricing.unitPrice,
    },
    coupon: null,
    audit: {
      actorId: context.userId,
      actorEmail: context.actorEmail,
      ipAddress: context.ipAddress,
    },
  });

  if (parent.userId) {
    await db.notifications.create({
      userId: parent.userId,
      type: 'renewal_created',
      title: `Order perpanjangan ${order.id} dibuat`,
      message: `Perpanjangan ${RENEWAL_MONTHS} bulan untuk ${parent.serverName} sebesar ${formatRupiah(order.total)} menunggu pembayaran.`,
      read: false,
    });
  }

  const whatsappUrl = buildWhatsAppOrderUrl(order, settings, context.appUrl);
  return { order, whatsappUrl, accessToken };
}

/**
 * Menerapkan perpanjangan ke masa aktif order induk.
 *
 * Dipanggil saat admin menandai order perpanjangan lunas/selesai. Idempoten:
 * `renewalAppliedAt` memastikan satu order perpanjangan hanya pernah menambah
 * masa aktif satu kali.
 */
export async function applyRenewal(
  db: DataStore,
  renewalOrder: OrderRecord,
  now: Date = new Date(),
): Promise<{ applied: boolean; parentId: string | null; newExpiry: string | null }> {
  if (!renewalOrder.renewalOfOrderId || renewalOrder.renewalAppliedAt) {
    return { applied: false, parentId: renewalOrder.renewalOfOrderId, newExpiry: null };
  }
  const parent = await db.orders.findById(renewalOrder.renewalOfOrderId);
  if (!parent) return { applied: false, parentId: renewalOrder.renewalOfOrderId, newExpiry: null };

  const newExpiry = nextExpiry(parent.expiresAt, now);
  await db.orders.updateServicePeriod(parent.id, {
    // Layanan yang belum pernah aktif dianggap mulai berjalan sekarang.
    activatedAt: parent.activatedAt ?? now.toISOString(),
    expiresAt: newExpiry,
    // Periode baru → siklus pengingat diulang.
    remindersSent: [],
  });
  await db.orders.markRenewalApplied(renewalOrder.id, now.toISOString());

  if (parent.userId) {
    await db.notifications.create({
      userId: parent.userId,
      type: 'renewal_applied',
      title: `Layanan ${parent.serverName} diperpanjang`,
      message: `Masa aktif diperpanjang ${RENEWAL_MONTHS} bulan, berlaku sampai ${formatDateTime(newExpiry)}.`,
      read: false,
    });
  }

  return { applied: true, parentId: parent.id, newExpiry };
}

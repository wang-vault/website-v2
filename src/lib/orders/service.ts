import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import {
  calculateHighPrice,
  calculateLowPrice,
  findHighPackage,
  isOngoing,
  normalizeLowConfig,
  TIER_DEFINITIONS,
} from '@/lib/pricing';
import { buildWhatsAppOrderUrl } from '@/lib/whatsapp';
import { sanitizeObject } from '@/lib/security/sanitize';
import { ApiErrorException } from '@/lib/api';
import { formatRupiah } from '@/lib/utils';
import type { OrderRecord, Tier } from '@/types';

/**
 * Service pembuatan order — SATU-SATUNYA jalur pembuatan order.
 *
 * Urutan (sesuai spesifikasi):
 * request → Zod validation → normalization → verify tier → reject ongoing
 * → verify package (High) → verify coupon → server-side pricing
 * → create order (transaksional) → audit log → WhatsApp URL → response.
 *
 * Harga dari klien DIABAIKAN SEPENUHNYA dan dihitung ulang di server.
 */

export const orderSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, 'Nama minimal 2 karakter.')
    .max(80, 'Nama maksimal 80 karakter.'),
  customerWhatsapp: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{7,20}$/, 'Format nomor WhatsApp tidak valid.'),
  customerEmail: z.string().trim().email('Format email tidak valid.').max(254),
  serverName: z
    .string()
    .trim()
    .min(2, 'Nama server minimal 2 karakter.')
    .max(64, 'Nama server maksimal 64 karakter.')
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9 _.-]*$/, 'Nama server hanya boleh huruf, angka, spasi, titik, dan strip.'),
  notes: z.string().trim().max(2000, 'Catatan maksimal 2000 karakter.').optional().default(''),
  couponCode: z.string().trim().max(40).optional().default(''),
  tier: z.enum(['low', 'medium', 'high']),
  // Nilai dari klien hanya dipakai sebagai bahan normalisasi — harga selalu dihitung server.
  packageId: z.string().trim().max(80).nullable().optional(),
  cpu: z.number().int().min(0).max(1024).optional().default(0),
  ramGb: z.number().min(0).max(4096).optional().default(0),
  storageGb: z.number().min(0).max(100_000).optional().default(0),
  agreeTerms: z.literal(true, {
    errorMap: () => ({ message: 'Anda harus menyetujui Syarat & Ketentuan sebelum memesan.' }),
  }),
});

export type OrderInput = z.infer<typeof orderSchema>;

export interface CreateOrderContext {
  userId: string | null;
  actorEmail: string;
  ipAddress: string | null;
  appUrl: string;
}

export interface CreateOrderResult {
  order: OrderRecord;
  whatsappUrl: string | null;
  accessToken: string;
}

function hashAccessToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function resolveOrderConfig(input: {
  tier: Tier;
  packageId: string | null;
  cpu: number;
  ramGb: number;
  storageGb: number;
}): { cpu: number; ramGb: number; storageGb: number; packageId: string | null; unitPrice: number } {
  const tier = input.tier;

  // Verify tier — tier tidak dikenal langsung ditolak.
  const def = TIER_DEFINITIONS[tier];
  if (!def) {
    throw new ApiErrorException(422, 'UNKNOWN_TIER', 'Tier tidak dikenal.');
  }

  // Reject ongoing (Medium) — HTTP 409.
  if (isOngoing(tier)) {
    throw new ApiErrorException(
      409,
      'TIER_ONGOING',
      'Tier Medium sedang dipersiapkan dan belum dapat dipesan.',
    );
  }

  if (tier === 'high') {
    const packageId = input.packageId ?? '';
    const pkg = findHighPackage(packageId);
    if (!pkg) {
      throw new ApiErrorException(422, 'INVALID_PACKAGE', 'Paket tidak valid untuk tier High.');
    }
    return {
      cpu: pkg.cpu,
      ramGb: pkg.ramGb,
      storageGb: pkg.storageGb,
      packageId,
      unitPrice: calculateHighPrice(packageId),
    };
  }

  // Tier Low: normalisasi (clamp) nilai dari klien.
  const normalized = normalizeLowConfig({
    cpu: input.cpu,
    ramGb: input.ramGb,
    storageGb: input.storageGb,
  });
  return {
    cpu: normalized.cpu,
    ramGb: normalized.ramGb,
    storageGb: normalized.storageGb,
    packageId: null,
    unitPrice: calculateLowPrice(normalized),
  };
}

export async function createOrder(
  rawInput: unknown,
  context: CreateOrderContext,
): Promise<CreateOrderResult> {
  // 1. Zod validation
  const parsed = orderSchema.safeParse(rawInput);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new ApiErrorException(
      422,
      'VALIDATION_ERROR',
      first ? first.message : 'Data pesanan tidak valid.',
    );
  }

  // 2. Sanitasi + normalisasi nilai.
  const input = sanitizeObject({
    ...parsed.data,
    customerName: parsed.data.customerName,
    customerWhatsapp: parsed.data.customerWhatsapp,
    customerEmail: parsed.data.customerEmail.toLowerCase(),
    serverName: parsed.data.serverName,
    notes: parsed.data.notes,
    couponCode: parsed.data.couponCode.toUpperCase(),
  }) as OrderInput;

  const db = await getDb();

  // 3–5. Verify tier → reject ongoing → verify package → harga server-side.
  const config = resolveOrderConfig({
    tier: input.tier,
    packageId: input.packageId ?? null,
    cpu: input.cpu,
    ramGb: input.ramGb,
    storageGb: input.storageGb,
  });

  // 6. Verify coupon (server-side; nilai diskon tidak pernah dari klien).
  const customerKey = `${input.customerEmail.toLowerCase()}:${input.customerWhatsapp.replace(/\D/g, '')}`;
  let couponResult: Awaited<ReturnType<typeof db.coupons.validate>> | null = null;
  if (input.couponCode) {
    couponResult = await db.coupons.validate({
      code: input.couponCode,
      tier: input.tier,
      packageId: config.packageId,
      subtotal: config.unitPrice,
      customerKey,
    });
    if (!couponResult.ok) {
      throw new ApiErrorException(422, `COUPON_${couponResult.code ?? 'INVALID'}`, couponResult.reason ?? 'Kupon tidak valid.');
    }
  }

  const discount = couponResult?.ok ? (couponResult.discount ?? 0) : 0;
  const total = Math.max(config.unitPrice - discount, 0);
  if (total <= 0) {
    throw new ApiErrorException(500, 'INVALID_PRICE', 'Total order tidak valid. Hubungi tim WangStore.');
  }

  // 7. Create order (transaksional di Supabase; antrean tulis di JSON).
  const settings = await db.settings.get();
  const accessToken = randomBytes(24).toString('base64url');
  const order = await db.orders.create({
    order: {
      userId: context.userId,
      customerName: input.customerName,
      customerWhatsapp: input.customerWhatsapp,
      customerEmail: input.customerEmail.toLowerCase(),
      serverName: input.serverName,
      notes: input.notes,
      tier: input.tier,
      packageId: config.packageId,
      cpu: config.cpu,
      ramGb: config.ramGb,
      storageGb: config.storageGb,
      unitPrice: config.unitPrice,
      discountAmount: discount,
      couponCode: couponResult?.ok ? (couponResult.code ?? null) : null,
      total,
      status: 'pending',
      ipAddress: context.ipAddress,
      accessTokenHash: hashAccessToken(accessToken),
    },
    item: {
      description:
        config.packageId ?? `Server ${input.tier === 'low' ? 'custom' : 'paket'} (${config.cpu} vCore / ${config.ramGb} GB / ${config.storageGb} GB)`,
      quantity: 1,
      unitPrice: config.unitPrice,
      total,
    },
    coupon: couponResult?.ok
      ? { couponId: couponResult.coupon?.id ?? '', discount, customerKey }
      : null,
    audit: {
      actorId: context.userId,
      actorEmail: context.actorEmail,
      ipAddress: context.ipAddress,
    },
  });

  // 8. Notifikasi untuk pengguna terautentikasi.
  if (context.userId) {
    await db.notifications.create({
      userId: context.userId,
      type: 'order_created',
      title: 'Order berhasil dibuat',
      message: `Order ${order.id} (${formatRupiah(total)}) berhasil dibuat.`,
      read: false,
    });
  }

  // 9. WhatsApp URL dari nomor yang dikonfigurasi admin.
  const whatsappUrl = buildWhatsAppOrderUrl(order, settings, context.appUrl);

  return { order, whatsappUrl, accessToken };
}

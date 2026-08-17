import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession, isStaff } from '@/lib/auth/session';
import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireWriteSecurity } from '@/lib/api/guards';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';
import { verifyTurnstile } from '@/lib/security/turnstile';
import { createRenewalOrder, getRenewalStatus } from '@/lib/renewals/service';
import type { OrderRecord } from '@/types';

/**
 * Perpanjangan layanan.
 *
 * GET  — status kelayakan & harga perpanjangan (dari katalog saat ini).
 * POST — membuat order perpanjangan baru yang tertaut ke order induk.
 *
 * Akses sama dengan halaman order: staff, pemilik order (login), atau pemegang
 * token akses. Kelayakan diverifikasi ulang di server, bukan hanya di UI.
 */

async function authorize(
  request: NextRequest,
  id: string,
): Promise<
  | { ok: true; order: OrderRecord; userId: string | null; actorEmail: string }
  | { ok: false; response: Response }
> {
  const token = request.nextUrl.searchParams.get('token') ?? '';
  const [db, sessionContext] = await Promise.all([getDb(), getSession()]);
  const order = await db.orders.findById(id);
  if (!order) return { ok: false, response: apiError(404, 'NOT_FOUND', 'Order tidak ditemukan.') };

  const staff = sessionContext ? isStaff(sessionContext.session.role) : false;
  const isOwner = sessionContext && order.userId ? sessionContext.session.sub === order.userId : false;
  const tokenValid =
    token && order.accessTokenHash
      ? createHash('sha256').update(token).digest('hex') === order.accessTokenHash
      : false;

  if (!staff && !isOwner && !tokenValid) {
    return { ok: false, response: apiError(404, 'NOT_FOUND', 'Order tidak ditemukan.') };
  }
  return {
    ok: true,
    order,
    userId: sessionContext?.session.sub ?? order.userId,
    actorEmail: sessionContext?.session.email ?? order.customerEmail,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    const auth = await authorize(request, id);
    if (!auth.ok) return auth.response;

    const db = await getDb();
    const status = await getRenewalStatus(db, auth.order);
    return apiOk({
      allowed: status.eligibility.allowed,
      reason: status.eligibility.reason,
      message: status.eligibility.message,
      months: status.months,
      price: status.pricing.unitPrice,
      projectedExpiry: status.projectedExpiry,
      currentExpiry: auth.order.expiresAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    await requireWriteSecurity();
    const ip = await clientIp();
    // Perpanjangan memakai kuota rate limit yang sama dengan pembuatan order.
    await rateLimit('order', { ip });

    const auth = await authorize(request, id);
    if (!auth.ok) return auth.response;

    const body: unknown = await request.json().catch(() => null);
    const payload = (body ?? {}) as { agreeTerms?: unknown; turnstileToken?: unknown };
    if (payload.agreeTerms !== true) {
      return apiError(422, 'VALIDATION_ERROR', 'Anda harus menyetujui Syarat & Ketentuan sebelum memperpanjang.');
    }
    const turnstileOk = await verifyTurnstile(
      typeof payload.turnstileToken === 'string' ? payload.turnstileToken : null,
      ip ?? '',
    );
    if (!turnstileOk) {
      return apiError(403, 'TURNSTILE_FAILED', 'Verifikasi bot gagal. Muat ulang halaman dan coba lagi.');
    }

    const result = await createRenewalOrder(id, {
      userId: auth.userId,
      actorEmail: auth.actorEmail,
      ipAddress: ip,
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin,
    });

    return apiOk(
      {
        order: result.order,
        whatsappUrl: result.whatsappUrl,
        accessToken: result.accessToken,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}

import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession, isStaff } from '@/lib/auth/session';
import { apiError, apiOk, handleApiError } from '@/lib/api';

/**
 * GET /api/orders/[id] — status order publik.
 * Akses: staff, pemilik order (login), atau token akses (?token=).
 * Tidak pernah mengembalikan data order milik orang lain.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    const token = request.nextUrl.searchParams.get('token') ?? '';

    const [db, sessionContext] = await Promise.all([getDb(), getSession()]);
    const order = await db.orders.findById(id);
    if (!order) return apiError(404, 'NOT_FOUND', 'Order tidak ditemukan.');

    const staff = sessionContext ? isStaff(sessionContext.session.role) : false;
    const isOwner =
      sessionContext && order.userId ? sessionContext.session.sub === order.userId : false;
    const tokenValid =
      token && order.accessTokenHash
        ? createHash('sha256').update(token).digest('hex') === order.accessTokenHash
        : false;

    if (!staff && !isOwner && !tokenValid) {
      return apiError(404, 'NOT_FOUND', 'Order tidak ditemukan.');
    }

    return apiOk({
      id: order.id,
      status: order.status,
      tier: order.tier,
      packageId: order.packageId,
      cpu: order.cpu,
      ramGb: order.ramGb,
      storageGb: order.storageGb,
      unitPrice: order.unitPrice,
      discountAmount: order.discountAmount,
      couponCode: order.couponCode,
      total: order.total,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

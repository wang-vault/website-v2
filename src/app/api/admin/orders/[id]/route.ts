import { z } from 'zod';
import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireAdmin, requireWriteSecurity } from '@/lib/api/guards';
import { canTransition } from '@/lib/payments';
import { clientIp } from '@/lib/security/rate-limit';
import type { OrderStatus } from '@/types';

const statusSchema = z.object({
  status: z.enum(['pending', 'awaiting_payment', 'paid', 'processing', 'completed', 'cancelled', 'expired', 'refunded']),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { db } = await requireAdmin('orders.read');
    const { id } = await params;
    const order = await db.orders.findById(id);
    if (!order) return apiError(404, 'NOT_FOUND', 'Order tidak ditemukan.');
    return apiOk(order);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/admin/orders/[id] — perubahan status order (staff+).
 * Perubahan harga oleh siapa pun TIDAK didukung — harga tidak pernah diedit.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { db, session } = await requireAdmin('orders.update');
    await requireWriteSecurity();
    const ip = await clientIp();
    const { id } = await params;

    const order = await db.orders.findById(id);
    if (!order) return apiError(404, 'NOT_FOUND', 'Order tidak ditemukan.');

    const body: unknown = await request.json().catch(() => null);
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) return apiError(422, 'VALIDATION_ERROR', 'Status tidak valid.');

    const nextStatus = parsed.data.status as OrderStatus;
    if (!canTransition(order.status, nextStatus)) {
      return apiError(409, 'INVALID_TRANSITION', `Status tidak dapat diubah dari ${order.status} ke ${nextStatus}.`);
    }

    const updated = await db.orders.updateStatus(id, nextStatus);

    // Notifikasi ke pelanggan (jika order terhubung ke akun).
    if (order.userId) {
      await db.notifications.create({
        userId: order.userId,
        type: 'order_status',
        title: `Status order ${order.id} diperbarui`,
        message: `Status order Anda sekarang: ${nextStatus}.`,
        read: false,
      });
    }

    await db.audit.log({
      actorId: session.sub,
      actorEmail: session.email,
      action: 'update',
      resource: 'order',
      resourceId: id,
      ipAddress: ip,
      metadata: { from: order.status, to: nextStatus },
    });

    return apiOk(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

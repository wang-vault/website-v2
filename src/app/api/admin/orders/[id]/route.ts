import { z } from 'zod';
import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireAdmin, requireWriteSecurity } from '@/lib/api/guards';
import { canTransition } from '@/lib/payments';
import { clientIp } from '@/lib/security/rate-limit';
import { formatDateTime } from '@/lib/utils';
import type { OrderStatus } from '@/types';

/**
 * Perubahan status order DAN masa aktif layanan.
 * Harga tidak pernah dapat diedit oleh siapa pun.
 */
const updateSchema = z
  .object({
    status: z
      .enum(['pending', 'awaiting_payment', 'paid', 'processing', 'completed', 'cancelled', 'expired', 'refunded'])
      .optional(),
    /** ISO 8601 atau null untuk mengosongkan. */
    activatedAt: z.string().trim().min(1).max(40).nullable().optional(),
    expiresAt: z.string().trim().min(1).max(40).nullable().optional(),
  })
  .refine(
    (value) => value.status !== undefined || value.activatedAt !== undefined || value.expiresAt !== undefined,
    { message: 'Tidak ada perubahan yang dikirim.' },
  );

function parseDate(value: string | null | undefined): { ok: true; value: string | null } | { ok: false } {
  if (value === undefined || value === null) return { ok: true, value: null };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { ok: false };
  return { ok: true, value: date.toISOString() };
}

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
 * PATCH /api/admin/orders/[id] — status order dan/atau masa aktif layanan (staff+).
 *
 * Masa aktif ditetapkan manual oleh admin karena aktivasi layanan terjadi di
 * luar aplikasi. Mengubah tanggal kedaluwarsa MERESET tahap pengingat sehingga
 * siklus pengingat (H-7, H-3, H-1, hari-H) berjalan lagi untuk periode baru.
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
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return apiError(422, 'VALIDATION_ERROR', first ? first.message : 'Data tidak valid.');
    }

    let updated = order;

    // ── Masa aktif layanan
    const touchesPeriod = parsed.data.activatedAt !== undefined || parsed.data.expiresAt !== undefined;
    if (touchesPeriod) {
      const activated = parseDate(
        parsed.data.activatedAt !== undefined ? parsed.data.activatedAt : order.activatedAt,
      );
      const expires = parseDate(parsed.data.expiresAt !== undefined ? parsed.data.expiresAt : order.expiresAt);
      if (!activated.ok || !expires.ok) {
        return apiError(422, 'VALIDATION_ERROR', 'Format tanggal tidak valid.');
      }
      if (activated.value && expires.value && new Date(expires.value) <= new Date(activated.value)) {
        return apiError(422, 'VALIDATION_ERROR', 'Tanggal kedaluwarsa harus setelah tanggal aktif.');
      }

      // Periode baru → siklus pengingat diulang.
      const expiryChanged = expires.value !== order.expiresAt;
      const remindersSent = expiryChanged ? [] : order.remindersSent;

      const result = await db.orders.updateServicePeriod(id, {
        activatedAt: activated.value,
        expiresAt: expires.value,
        remindersSent,
      });
      if (result) updated = result;

      if (order.userId) {
        await db.notifications.create({
          userId: order.userId,
          type: 'service_period',
          title: `Masa aktif layanan ${order.serverName} diperbarui`,
          message: expires.value
            ? `Layanan berlaku sampai ${formatDateTime(expires.value)}.`
            : 'Masa aktif layanan dikosongkan oleh tim WangStore.',
          read: false,
        });
      }

      await db.audit.log({
        actorId: session.sub,
        actorEmail: session.email,
        action: 'update',
        resource: 'order_service_period',
        resourceId: id,
        ipAddress: ip,
        metadata: {
          activatedFrom: order.activatedAt,
          activatedTo: activated.value,
          expiresFrom: order.expiresAt,
          expiresTo: expires.value,
          remindersReset: expiryChanged,
        },
      });
    }

    // ── Status order
    if (parsed.data.status !== undefined) {
      const nextStatus = parsed.data.status as OrderStatus;
      if (nextStatus !== order.status) {
        if (!canTransition(order.status, nextStatus)) {
          return apiError(
            409,
            'INVALID_TRANSITION',
            `Status tidak dapat diubah dari ${order.status} ke ${nextStatus}.`,
          );
        }
        const result = await db.orders.updateStatus(id, nextStatus);
        if (result) updated = result;

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
      }
    }

    return apiOk(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

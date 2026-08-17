import { apiOk, handleApiError } from '@/lib/api';
import { requireAdmin, requireWriteSecurity } from '@/lib/api/guards';
import { clientIp } from '@/lib/security/rate-limit';
import { runReminders } from '@/lib/reminders/service';
import { serviceState, summarizeExpiry } from '@/lib/reminders';

/**
 * GET  /api/admin/reminders — ringkasan masa aktif layanan (staff+).
 * POST /api/admin/reminders — menjalankan pengingat sekarang (staff+),
 *   berguna saat scheduler belum dikonfigurasi atau untuk verifikasi manual.
 *   Idempoten: tahap yang sudah dikirim tidak dikirim ulang.
 */
export async function GET(): Promise<Response> {
  try {
    const { db } = await requireAdmin('orders.read');
    const orders = await db.orders.listWithExpiry({ limit: 500 });
    const now = new Date();
    return apiOk({
      summary: summarizeExpiry(orders, now),
      items: orders.slice(0, 100).map((order) => ({
        id: order.id,
        serverName: order.serverName,
        customerEmail: order.customerEmail,
        status: order.status,
        activatedAt: order.activatedAt,
        expiresAt: order.expiresAt,
        state: serviceState(order, now),
        remindersSent: order.remindersSent,
        lastReminderAt: order.lastReminderAt,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(): Promise<Response> {
  try {
    const { db, session } = await requireAdmin('orders.update');
    await requireWriteSecurity();
    const ip = await clientIp();

    const summary = await runReminders();

    await db.audit.log({
      actorId: session.sub,
      actorEmail: session.email,
      action: 'run_reminders',
      resource: 'order',
      resourceId: null,
      ipAddress: ip,
      metadata: { checked: summary.checked, sent: summary.sent, emailFailures: summary.failures },
    });

    return apiOk({
      checked: summary.checked,
      sent: summary.sent,
      emailFailures: summary.failures,
      results: summary.results,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

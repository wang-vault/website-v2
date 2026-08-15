import { z } from 'zod';
import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireAdmin, requireWriteSecurity } from '@/lib/api/guards';
import { clientIp } from '@/lib/security/rate-limit';
import { sanitizeObject } from '@/lib/security/sanitize';

const messageSchema = z.object({
  message: z.string().trim().min(1, 'Pesan tidak boleh kosong.').max(5000),
});

/** POST /api/admin/tickets/[id]/messages — balasan staf. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { db, session } = await requireAdmin('tickets.reply');
    await requireWriteSecurity();
    const ip = await clientIp();
    const { id } = await params;

    const ticket = await db.tickets.findById(id);
    if (!ticket) return apiError(404, 'NOT_FOUND', 'Tiket tidak ditemukan.');
    if (ticket.status === 'closed') {
      return apiError(409, 'TICKET_CLOSED', 'Tiket sudah ditutup. Buka kembali untuk membalas.');
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = messageSchema.safeParse(body);
    if (!parsed.success) return apiError(422, 'VALIDATION_ERROR', 'Pesan tidak valid.');
    const input = sanitizeObject(parsed.data);

    const message = await db.tickets.addMessage({
      ticketId: id,
      authorEmail: session.email,
      isStaff: true,
      message: input.message,
    });

    if (ticket.status === 'open') {
      await db.tickets.updateStatus(id, 'pending');
    }
    if (ticket.userId) {
      await db.notifications.create({
        userId: ticket.userId,
        type: 'ticket_reply',
        title: `Balasan tiket ${ticket.id}`,
        message: 'Tim WangStore membalas tiket Anda.',
        read: false,
      });
    }

    await db.audit.log({
      actorId: session.sub,
      actorEmail: session.email,
      action: 'create',
      resource: 'ticket_message',
      resourceId: id,
      ipAddress: ip,
      metadata: {},
    });

    return apiOk(message, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

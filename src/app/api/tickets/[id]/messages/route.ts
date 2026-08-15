import { z } from 'zod';
import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireUser, requireWriteSecurity } from '@/lib/api/guards';
import { isStaff } from '@/lib/auth/session';
import { sanitizeObject } from '@/lib/security/sanitize';

const messageSchema = z.object({
  message: z.string().trim().min(1, 'Pesan tidak boleh kosong.').max(5000),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { db, session } = await requireUser();
    await requireWriteSecurity();
    const { id } = await params;

    const ticket = await db.tickets.findById(id);
    if (!ticket) return apiError(404, 'NOT_FOUND', 'Tiket tidak ditemukan.');
    const staff = isStaff(session.role);
    if (!staff && ticket.userId !== session.sub) {
      return apiError(404, 'NOT_FOUND', 'Tiket tidak ditemukan.');
    }
    if (ticket.status === 'closed') {
      return apiError(409, 'TICKET_CLOSED', 'Tiket sudah ditutup.');
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = messageSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(422, 'VALIDATION_ERROR', 'Pesan tidak valid.');
    }
    const input = sanitizeObject(parsed.data);

    const message = await db.tickets.addMessage({
      ticketId: id,
      authorEmail: session.email,
      isStaff: staff,
      message: input.message,
    });

    // Staf membalas → notifikasi ke pelanggan (jika terautentikasi).
    if (staff && ticket.userId) {
      await db.notifications.create({
        userId: ticket.userId,
        type: 'ticket_reply',
        title: `Balasan tiket ${ticket.id}`,
        message: 'Tim WangStore membalas tiket Anda.',
        read: false,
      });
    }

    return apiOk(message, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

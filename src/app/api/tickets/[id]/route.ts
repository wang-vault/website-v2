import { z } from 'zod';
import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireUser, requireWriteSecurity } from '@/lib/api/guards';
import { isStaff } from '@/lib/auth/session';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { db, session } = await requireUser();
    const { id } = await params;
    const ticket = await db.tickets.findById(id);
    if (!ticket) return apiError(404, 'NOT_FOUND', 'Tiket tidak ditemukan.');
    const staff = isStaff(session.role);
    const isOwner = ticket.userId === session.sub;
    if (!staff && !isOwner) return apiError(404, 'NOT_FOUND', 'Tiket tidak ditemukan.');
    const messages = await db.tickets.messages(ticket.id);
    return apiOk({ ticket, messages });
  } catch (error) {
    return handleApiError(error);
  }
}

const updateSchema = z.object({
  status: z.enum(['open', 'pending', 'closed']).optional(),
});

export async function PATCH(
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
    const body: unknown = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return apiError(422, 'VALIDATION_ERROR', 'Data tidak valid.');
    if (!parsed.data.status) return apiOk(ticket);

    // Pelanggan hanya boleh menutup/membuka ulang tiketya sendiri.
    if (!staff && parsed.data.status !== 'closed' && parsed.data.status !== 'open') {
      return apiError(403, 'FORBIDDEN', 'Anda tidak memiliki izin untuk tindakan ini.');
    }
    const updated = await db.tickets.updateStatus(id, parsed.data.status);
    await db.audit.log({
      actorId: session.sub,
      actorEmail: session.email,
      action: 'update',
      resource: 'ticket',
      resourceId: id,
      ipAddress: null,
      metadata: { status: parsed.data.status },
    });
    return apiOk(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

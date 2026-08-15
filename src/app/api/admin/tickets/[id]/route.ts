import { z } from 'zod';
import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireAdmin, requireWriteSecurity } from '@/lib/api/guards';
import { clientIp } from '@/lib/security/rate-limit';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { db } = await requireAdmin('tickets.read');
    const { id } = await params;
    const ticket = await db.tickets.findById(id);
    if (!ticket) return apiError(404, 'NOT_FOUND', 'Tiket tidak ditemukan.');
    const messages = await db.tickets.messages(id);
    return apiOk({ ticket, messages });
  } catch (error) {
    return handleApiError(error);
  }
}

const ticketPatchSchema = z.object({
  status: z.enum(['open', 'pending', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

export async function PATCH(
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

    const body: unknown = await request.json().catch(() => null);
    const parsed = ticketPatchSchema.safeParse(body);
    if (!parsed.success) return apiError(422, 'VALIDATION_ERROR', 'Data tidak valid.');

    let updated = ticket;
    if (parsed.data.status) updated = (await db.tickets.updateStatus(id, parsed.data.status)) ?? updated;
    if (parsed.data.priority) updated = (await db.tickets.updatePriority(id, parsed.data.priority)) ?? updated;

    await db.audit.log({
      actorId: session.sub,
      actorEmail: session.email,
      action: 'update',
      resource: 'ticket',
      resourceId: id,
      ipAddress: ip,
      metadata: parsed.data,
    });
    return apiOk(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

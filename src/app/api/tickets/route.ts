import { z } from 'zod';
import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireUser, requireWriteSecurity } from '@/lib/api/guards';
import { isStaff } from '@/lib/auth/session';
import { rateLimit, clientIp } from '@/lib/security/rate-limit';
import { sanitizeObject } from '@/lib/security/sanitize';

const ticketSchema = z.object({
  subject: z.string().trim().min(5, 'Subjek minimal 5 karakter.').max(200),
  message: z.string().trim().min(10, 'Pesan minimal 10 karakter.').max(5000),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
});

export async function GET(): Promise<Response> {
  try {
    const { db, session } = await requireUser();
    if (isStaff(session.role)) {
      const result = await db.tickets.listAdmin({ page: 1, pageSize: 100 });
      return apiOk(result);
    }
    const tickets = await db.tickets.listByUser(session.sub);
    return apiOk(tickets);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { db, session } = await requireUser();
    await requireWriteSecurity();
    const ip = await clientIp();
    await rateLimit('ticket', { ip, userId: session.sub });

    const body: unknown = await request.json().catch(() => null);
    const parsed = ticketSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return apiError(422, 'VALIDATION_ERROR', first ? first.message : 'Data tidak valid.');
    }
    const input = sanitizeObject(parsed.data);

    const ticket = await db.tickets.create({
      ticket: {
        userId: session.sub,
        customerEmail: session.email,
        subject: input.subject,
        status: 'open',
        priority: input.priority,
      },
      firstMessage: {
        ticketId: '',
        authorEmail: session.email,
        isStaff: false,
        message: input.message,
      },
    });

    await db.audit.log({
      actorId: session.sub,
      actorEmail: session.email,
      action: 'create',
      resource: 'ticket',
      resourceId: ticket.id,
      ipAddress: ip,
      metadata: { priority: input.priority },
    });

    return apiOk(ticket, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

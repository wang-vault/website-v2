import { z } from 'zod';
import { getDb } from '@/lib/db';
import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireWriteSecurity, assertNotInMaintenance } from '@/lib/api/guards';
import { rateLimit, clientIp } from '@/lib/security/rate-limit';
import { verifyTurnstile } from '@/lib/security/turnstile';

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter.').max(80),
  email: z.string().trim().email('Format email tidak valid.').max(254),
  subject: z.string().trim().min(3, 'Subjek minimal 3 karakter.').max(200),
  message: z.string().trim().min(10, 'Pesan minimal 10 karakter.').max(5000),
  turnstileToken: z.string().max(4096).nullable().optional(),
});

/**
 * POST /api/contact — pesan kontak masuk sebagai tiket (prioritas normal)
 * sehingga tim dapat membalas dan menutupnya dari panel admin.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const ip = await clientIp();
    await rateLimit('contact', { ip });
    await assertNotInMaintenance('/api/contact');
    await requireWriteSecurity();

    const body: unknown = await request.json().catch(() => null);
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return apiError(422, 'VALIDATION_ERROR', first ? first.message : 'Data tidak valid.');
    }

    const botOk = await verifyTurnstile(parsed.data.turnstileToken ?? null, ip);
    if (!botOk) {
      return apiError(400, 'BOT_CHECK_FAILED', 'Verifikasi bot gagal. Muat ulang halaman dan coba lagi.');
    }

    const db = await getDb();
    await db.tickets.create({
      ticket: {
        userId: null,
        customerEmail: parsed.data.email.toLowerCase(),
        subject: `[Kontak] ${parsed.data.subject}`,
        status: 'open',
        priority: 'medium',
      },
      firstMessage: {
        ticketId: '',
        authorEmail: parsed.data.email.toLowerCase(),
        isStaff: false,
        message: `Nama: ${parsed.data.name}\nEmail: ${parsed.data.email}\n\n${parsed.data.message}`,
      },
    });

    await db.audit.log({
      actorId: null,
      actorEmail: parsed.data.email.toLowerCase(),
      action: 'create',
      resource: 'ticket',
      resourceId: null,
      ipAddress: ip,
      metadata: { source: 'contact_form' },
    });

    return apiOk({ received: true }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

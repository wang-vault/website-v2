import { z } from 'zod';
import { getDb } from '@/lib/db';
import { generateEmailToken, resetPasswordEmail, sendEmail } from '@/lib/email';
import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireWriteSecurity } from '@/lib/api/guards';
import { rateLimit, clientIp } from '@/lib/security/rate-limit';
import { normalizeEmail } from '@/lib/security/sanitize';
import { toIso } from '@/lib/utils';

const forgotSchema = z.object({
  email: z.string().trim().email('Format email tidak valid.').max(254),
});

/**
 * POST /api/auth/forgot-password
 * Respons selalu generik: tidak membocorkan apakah email terdaftar.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const ip = await clientIp();
    await rateLimit('login', { ip: `forgot:${ip}`, userId: null });
    await requireWriteSecurity();

    const body: unknown = await request.json().catch(() => null);
    const parsed = forgotSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(422, 'VALIDATION_ERROR', 'Format email tidak valid.');
    }

    const email = normalizeEmail(parsed.data.email);
    const db = await getDb();
    const user = await db.users.findByEmail(email);

    if (user) {
      const token = generateEmailToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await db.users.update(user.id, { resetToken: token, resetTokenExpiresAt: expiresAt });
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const message = resetPasswordEmail(appUrl, token);
      await sendEmail({ ...message, to: email });
      await db.audit.log({
        actorId: null,
        actorEmail: email,
        action: 'password_reset_requested',
        resource: 'user',
        resourceId: user.id,
        ipAddress: ip,
        metadata: {},
      });
    }

    return apiOk({ requested: true });
  } catch (error) {
    return handleApiError(error);
  }
}

import { z } from 'zod';
import { getDb } from '@/lib/db';
import { verifyDummyPassword, verifyPassword } from '@/lib/auth/password';
import { setSessionCookie, signSession } from '@/lib/auth/session';
import { setCsrfCookie } from '@/lib/security/csrf';
import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireWriteSecurity } from '@/lib/api/guards';
import { rateLimit, clientIp } from '@/lib/security/rate-limit';
import { normalizeEmail } from '@/lib/security/sanitize';
import { toIso } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().trim().email('Format email tidak valid.').max(254),
  password: z.string().min(1).max(72),
  remember: z.boolean().optional().default(false),
});

const GENERIC_ERROR = 'Email atau kata sandi salah.';

/**
 * POST /api/auth/login
 * - Rate limited per IP dan per email.
 * - Generic error (tidak membocorkan keberadaan email).
 * - Timing-resistant: email tidak dikenal tetap melalui perbandingan hash dummy.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const ip = await clientIp();
    await requireWriteSecurity();

    const body: unknown = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(422, 'VALIDATION_ERROR', GENERIC_ERROR);
    }

    const email = normalizeEmail(parsed.data.email);
    await rateLimit('login', { ip });
    await rateLimit('login', { ip: `email:${email}`, userId: null });

    const db = await getDb();
    const user = await db.users.findByEmail(email);

    if (!user) {
      // Perbandingan dummy — waktu respons tidak membocorkan keberadaan email.
      const ok = await verifyDummyPassword(parsed.data.password);
      void ok;
      await db.audit.log({
        actorId: null,
        actorEmail: email,
        action: 'failed_login',
        resource: 'user',
        resourceId: null,
        ipAddress: ip,
        metadata: { reason: 'unknown_email' },
      });
      return apiError(401, 'INVALID_CREDENTIALS', GENERIC_ERROR);
    }

    const passwordOk = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!passwordOk) {
      await db.audit.log({
        actorId: null,
        actorEmail: email,
        action: 'failed_login',
        resource: 'user',
        resourceId: user.id,
        ipAddress: ip,
        metadata: { reason: 'wrong_password' },
      });
      return apiError(401, 'INVALID_CREDENTIALS', GENERIC_ERROR);
    }

    if (!user.emailVerified) {
      return apiError(403, 'EMAIL_NOT_VERIFIED', 'Verifikasi email Anda terlebih dahulu sebelum masuk.');
    }

    const token = await signSession(
      { sub: user.id, email: user.email, role: user.role, tv: user.tokenVersion },
      parsed.data.remember,
    );
    await setSessionCookie(token, parsed.data.remember);
    await setCsrfCookie();
    await db.users.update(user.id, { lastLoginAt: toIso() });
    await db.audit.log({
      actorId: user.id,
      actorEmail: user.email,
      action: 'login',
      resource: 'user',
      resourceId: user.id,
      ipAddress: ip,
      metadata: {},
    });

    return apiOk({ email: user.email, role: user.role });
  } catch (error) {
    return handleApiError(error);
  }
}

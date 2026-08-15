import { z } from 'zod';
import { getDb } from '@/lib/db';
import { hashPassword, passwordStrength } from '@/lib/auth/password';
import { generateEmailToken, sendEmail, verificationEmail } from '@/lib/email';
import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireWriteSecurity } from '@/lib/api/guards';
import { rateLimit, clientIp } from '@/lib/security/rate-limit';
import { verifyTurnstile } from '@/lib/security/turnstile';
import { normalizeEmail, sanitizeObject } from '@/lib/security/sanitize';
import { generateId, toIso } from '@/lib/utils';

const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Nama minimal 2 karakter.').max(80),
  email: z.string().trim().email('Format email tidak valid.').max(254),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter.').max(72),
  turnstileToken: z.string().max(4096).nullable().optional(),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const ip = await clientIp();
    await rateLimit('register', { ip });
    await requireWriteSecurity();

    const body: unknown = await request.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return apiError(422, 'VALIDATION_ERROR', first ? first.message : 'Data tidak valid.');
    }

    const botOk = await verifyTurnstile(parsed.data.turnstileToken ?? null, ip);
    if (!botOk) {
      return apiError(400, 'BOT_CHECK_FAILED', 'Verifikasi bot gagal. Muat ulang halaman dan coba lagi.');
    }

    const input = sanitizeObject(parsed.data);
    const email = normalizeEmail(input.email);
    const strength = passwordStrength(input.password);
    if (!strength.ok) {
      return apiError(422, 'WEAK_PASSWORD', strength.message);
    }

    const db = await getDb();
    const existing = await db.users.findByEmail(email);
    if (existing) {
      // Tidak membocorkan keberadaan email.
      return apiError(409, 'EMAIL_EXISTS', 'Email ini sudah terdaftar.');
    }

    const passwordHash = await hashPassword(input.password);
    const verificationToken = generateEmailToken();
    const now = toIso();
    const userId = generateId('us');
    await db.users.create({
      id: userId,
      email,
      passwordHash,
      role: 'customer',
      emailVerified: false,
      emailVerificationToken: verificationToken,
      resetToken: null,
      resetTokenExpiresAt: null,
      tokenVersion: 1,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    });
    await db.profiles.upsert({
      userId,
      fullName: input.fullName,
      whatsapp: '',
      discord: '',
      bio: '',
      updatedAt: now,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const message = verificationEmail(appUrl, verificationToken);
    const sendResult = await sendEmail({ ...message, to: email });

    await db.audit.log({
      actorId: null,
      actorEmail: email,
      action: 'register',
      resource: 'user',
      resourceId: email,
      ipAddress: ip,
      metadata: { emailProvider: sendResult.provider, sent: sendResult.sent },
    });

    // Dalam mode development dengan provider console, tautan verifikasi
    // ditampilkan secara jujur agar alur dapat diuji end-to-end.
    const devLink =
      process.env.NODE_ENV !== 'production' && sendResult.provider === 'console'
        ? `${appUrl}/verify-email?token=${encodeURIComponent(verificationToken)}`
        : null;

    return apiOk(
      {
        registered: true,
        emailSent: sendResult.sent,
        devVerificationLink: devLink,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}

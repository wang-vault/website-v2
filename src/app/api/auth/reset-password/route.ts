import { z } from 'zod';
import { getDb } from '@/lib/db';
import { hashPassword, passwordStrength } from '@/lib/auth/password';
import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireWriteSecurity } from '@/lib/api/guards';
import { toIso } from '@/lib/utils';

const resetSchema = z.object({
  token: z.string().min(16).max(128),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter.').max(72),
});

/** POST /api/auth/reset-password — token sekali pakai, berlaku 1 jam. */
export async function POST(request: Request): Promise<Response> {
  try {
    await requireWriteSecurity();
    const body: unknown = await request.json().catch(() => null);
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return apiError(422, 'VALIDATION_ERROR', first ? first.message : 'Data tidak valid.');
    }

    const strength = passwordStrength(parsed.data.password);
    if (!strength.ok) {
      return apiError(422, 'WEAK_PASSWORD', strength.message);
    }

    const db = await getDb();
    const target = await db.users.findByResetToken(parsed.data.token);
    if (!target || !target.resetTokenExpiresAt) {
      return apiError(400, 'INVALID_TOKEN', 'Tautan reset tidak valid atau sudah kedaluwarsa.');
    }
    if (new Date(target.resetTokenExpiresAt) <= new Date()) {
      return apiError(400, 'INVALID_TOKEN', 'Tautan reset sudah kedaluwarsa. Ajukan permintaan baru.');
    }

    const passwordHash = await hashPassword(parsed.data.password);
    await db.users.update(target.id, {
      passwordHash,
      resetToken: null,
      resetTokenExpiresAt: null,
      tokenVersion: target.tokenVersion + 1,
      updatedAt: toIso(),
    });
    await db.audit.log({
      actorId: target.id,
      actorEmail: target.email,
      action: 'password_reset',
      resource: 'user',
      resourceId: target.id,
      ipAddress: null,
      metadata: {},
    });
    return apiOk({ reset: true });
  } catch (error) {
    return handleApiError(error);
  }
}

import { z } from 'zod';
import { getDb } from '@/lib/db';
import { hashPassword, passwordStrength, verifyPassword } from '@/lib/auth/password';
import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireUser, requireWriteSecurity } from '@/lib/api/guards';
import { toIso } from '@/lib/utils';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: z.string().min(8, 'Kata sandi minimal 8 karakter.').max(72),
});

/** POST /api/auth/change-password — pengguna terautentikasi mengganti kata sandi. */
export async function POST(request: Request): Promise<Response> {
  try {
    const { db, session } = await requireUser();
    await requireWriteSecurity();

    const body: unknown = await request.json().catch(() => null);
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return apiError(422, 'VALIDATION_ERROR', first ? first.message : 'Data tidak valid.');
    }

    const user = await db.users.findById(session.sub);
    if (!user) return apiError(401, 'UNAUTHENTICATED', 'Sesi tidak valid.');

    const currentOk = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!currentOk) {
      return apiError(400, 'WRONG_PASSWORD', 'Kata sandi saat ini salah.');
    }

    const strength = passwordStrength(parsed.data.newPassword);
    if (!strength.ok) {
      return apiError(422, 'WEAK_PASSWORD', strength.message);
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);
    await db.users.update(user.id, {
      passwordHash,
      tokenVersion: user.tokenVersion + 1,
      updatedAt: toIso(),
    });
    await db.audit.log({
      actorId: user.id,
      actorEmail: user.email,
      action: 'password_change',
      resource: 'user',
      resourceId: user.id,
      ipAddress: null,
      metadata: {},
    });
    return apiOk({ changed: true });
  } catch (error) {
    return handleApiError(error);
  }
}

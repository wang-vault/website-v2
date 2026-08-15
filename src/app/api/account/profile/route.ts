import { z } from 'zod';
import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireUser, requireWriteSecurity } from '@/lib/api/guards';
import { sanitizeObject } from '@/lib/security/sanitize';
import { toIso } from '@/lib/utils';

const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Nama minimal 2 karakter.').max(80),
  whatsapp: z.string().trim().regex(/^\+?[0-9]{0,20}$/, 'Format nomor WhatsApp tidak valid.').optional().or(z.literal('')),
  discord: z.string().trim().max(64).optional().or(z.literal('')),
  bio: z.string().trim().max(500).optional().or(z.literal('')),
});

export async function GET(): Promise<Response> {
  try {
    const { db, session } = await requireUser();
    const [profile, user] = await Promise.all([
      db.profiles.get(session.sub),
      db.users.findById(session.sub),
    ]);
    if (!user) return apiError(401, 'UNAUTHENTICATED', 'Sesi tidak valid.');
    return apiOk({
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      fullName: profile?.fullName ?? '',
      whatsapp: profile?.whatsapp ?? '',
      discord: profile?.discord ?? '',
      bio: profile?.bio ?? '',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const { db, session } = await requireUser();
    await requireWriteSecurity();

    const body: unknown = await request.json().catch(() => null);
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return apiError(422, 'VALIDATION_ERROR', first ? first.message : 'Data tidak valid.');
    }
    const input = sanitizeObject(parsed.data);
    await db.profiles.upsert({
      userId: session.sub,
      fullName: input.fullName,
      whatsapp: input.whatsapp ?? '',
      discord: input.discord ?? '',
      bio: input.bio ?? '',
      updatedAt: toIso(),
    });
    await db.audit.log({
      actorId: session.sub,
      actorEmail: session.email,
      action: 'update',
      resource: 'profile',
      resourceId: session.sub,
      ipAddress: null,
      metadata: { fields: ['fullName', 'whatsapp', 'discord', 'bio'] },
    });
    return apiOk({ updated: true });
  } catch (error) {
    return handleApiError(error);
  }
}

import { z } from 'zod';
import { apiError, apiOk, handleApiError, ApiErrorException } from '@/lib/api';
import { requireAdmin, requireWriteSecurity } from '@/lib/api/guards';
import { assertPermission } from '@/lib/auth/rbac';
import { clientIp } from '@/lib/security/rate-limit';
import { ROLE_HIERARCHY } from '@/types';
import type { Role } from '@/types';

const customerUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(80).optional(),
  whatsapp: z.string().trim().max(20).optional(),
  discord: z.string().trim().max(64).optional(),
  role: z.enum(['owner', 'admin', 'staff', 'customer']).optional(),
});

/**
 * PATCH /api/admin/customers/[id]
 * - Profil: admin+.
 * - Perubahan role: OWNER ONLY, dan tidak boleh menurunkan role owner lain.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { db, session } = await requireAdmin('customers.update');
    await requireWriteSecurity();
    const ip = await clientIp();
    const { id } = await params;

    const target = await db.users.findById(id);
    if (!target) return apiError(404, 'NOT_FOUND', 'Pengguna tidak ditemukan.');

    const body: unknown = await request.json().catch(() => null);
    const parsed = customerUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return apiError(422, 'VALIDATION_ERROR', first ? first.message : 'Data tidak valid.');
    }

    if (parsed.data.role) {
      assertPermission(session.role, 'roles.manage');
      const newRole = parsed.data.role as Role;
      // Owner tidak boleh mengubah role owner lain (termasuk dirinya).
      if (target.role === 'owner' && ROLE_HIERARCHY[newRole] < ROLE_HIERARCHY.owner) {
        throw new ApiErrorException(403, 'FORBIDDEN', 'Role owner tidak dapat diturunkan.');
      }
      if (target.role !== 'owner' && newRole === 'owner') {
        throw new ApiErrorException(
          403,
          'FORBIDDEN',
          'Role owner tidak dapat ditetapkan lewat panel — akun Owner dibuat lewat npm run db:seed.',
        );
      }
      await db.users.update(id, { role: newRole });
      await db.audit.log({
        actorId: session.sub,
        actorEmail: session.email,
        action: 'role_change',
        resource: 'user',
        resourceId: id,
        ipAddress: ip,
        metadata: { from: target.role, to: newRole },
      });
    }

    const profilePatch = {
      fullName: parsed.data.fullName,
      whatsapp: parsed.data.whatsapp,
      discord: parsed.data.discord,
    };
    if (Object.values(profilePatch).some((value) => value !== undefined)) {
      const current = await db.profiles.get(id);
      await db.profiles.upsert({
        userId: id,
        fullName: profilePatch.fullName ?? current?.fullName ?? '',
        whatsapp: profilePatch.whatsapp ?? current?.whatsapp ?? '',
        discord: profilePatch.discord ?? current?.discord ?? '',
        bio: current?.bio ?? '',
        updatedAt: new Date().toISOString(),
      });
      await db.audit.log({
        actorId: session.sub,
        actorEmail: session.email,
        action: 'update',
        resource: 'profile',
        resourceId: id,
        ipAddress: ip,
        metadata: { fields: Object.keys(profilePatch).filter((k) => profilePatch[k as keyof typeof profilePatch] !== undefined) },
      });
    }

    return apiOk({ updated: true });
  } catch (error) {
    return handleApiError(error);
  }
}

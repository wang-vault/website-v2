import { z } from 'zod';
import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireAdmin, requireWriteSecurity } from '@/lib/api/guards';
import { clientIp } from '@/lib/security/rate-limit';

const couponPatchSchema = z.object({
  code: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9_-]+$/).optional(),
  type: z.enum(['percentage', 'fixed']).optional(),
  value: z.number().int().min(1).max(100_000_000).optional(),
  minOrder: z.number().int().min(0).max(1_000_000_000).optional(),
  maxUses: z.number().int().min(1).max(10_000_000).nullable().optional(),
  usesPerCustomer: z.number().int().min(1).max(1000).optional(),
  active: z.boolean().optional(),
  startsAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  applicableTiers: z.array(z.enum(['low', 'medium', 'high'])).optional(),
  applicablePackages: z.array(z.string().max(80)).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { db, session } = await requireAdmin('coupons.manage');
    await requireWriteSecurity();
    const ip = await clientIp();
    const { id } = await params;

    const body: unknown = await request.json().catch(() => null);
    const parsed = couponPatchSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return apiError(422, 'VALIDATION_ERROR', first ? first.message : 'Data tidak valid.');
    }
    if (parsed.data.type === 'percentage' && parsed.data.value !== undefined && parsed.data.value > 100) {
      return apiError(422, 'VALIDATION_ERROR', 'Diskon persentase maksimal 100%.');
    }

    const patch = { ...parsed.data, updatedAt: new Date().toISOString() };
    const updated = await db.coupons.update(id, patch);
    if (!updated) return apiError(404, 'NOT_FOUND', 'Kupon tidak ditemukan.');

    await db.audit.log({
      actorId: session.sub,
      actorEmail: session.email,
      action: 'update',
      resource: 'coupon',
      resourceId: id,
      ipAddress: ip,
      metadata: { fields: Object.keys(parsed.data) },
    });
    return apiOk(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { db, session } = await requireAdmin('coupons.manage');
    await requireWriteSecurity();
    const ip = await clientIp();
    const { id } = await params;
    await db.coupons.remove(id);
    await db.audit.log({
      actorId: session.sub,
      actorEmail: session.email,
      action: 'delete',
      resource: 'coupon',
      resourceId: id,
      ipAddress: ip,
      metadata: {},
    });
    return apiOk({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}

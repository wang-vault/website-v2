import { z } from 'zod';
import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireAdmin, requireWriteSecurity } from '@/lib/api/guards';
import { clientIp } from '@/lib/security/rate-limit';

const packagePatchSchema = z.object({
  label: z.string().trim().min(2).max(120).optional(),
  tier: z.enum(['medium', 'high']).optional(),
  cpu: z.number().int().min(1).max(256).optional(),
  ramGb: z.number().int().min(1).max(4096).optional(),
  storageGb: z.number().int().min(1).max(100_000).optional(),
  price: z.number().int().min(0).max(1_000_000_000).optional(),
  popular: z.boolean().optional(),
  renewable: z.boolean().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { db, session } = await requireAdmin('packages.manage');
    await requireWriteSecurity();
    const ip = await clientIp();
    const { id } = await params;
    const current = await db.packages.get(id);
    if (!current) return apiError(404, 'NOT_FOUND', 'Paket tidak ditemukan.');

    const body: unknown = await request.json().catch(() => null);
    const parsed = packagePatchSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return apiError(422, 'VALIDATION_ERROR', first ? first.message : 'Data tidak valid.');
    }
    const updated = { ...current, ...parsed.data, updatedAt: new Date().toISOString() };
    await db.packages.upsert(updated);
    await db.audit.log({
      actorId: session.sub,
      actorEmail: session.email,
      action: 'update',
      resource: 'package',
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
    const { db, session } = await requireAdmin('packages.manage');
    await requireWriteSecurity();
    const ip = await clientIp();
    const { id } = await params;
    await db.packages.remove(id);
    await db.audit.log({
      actorId: session.sub,
      actorEmail: session.email,
      action: 'delete',
      resource: 'package',
      resourceId: id,
      ipAddress: ip,
      metadata: {},
    });
    return apiOk({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}

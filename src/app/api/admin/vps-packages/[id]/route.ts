import { z } from 'zod';
import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireAdmin, requireWriteSecurity } from '@/lib/api/guards';
import { clientIp } from '@/lib/security/rate-limit';

const vpsPackagePatchSchema = z.object({
  label: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(300).optional(),
  vcpu: z.number().int().min(1).max(256).optional(),
  ramGb: z.number().int().min(1).max(4096).optional(),
  storageGb: z.number().int().min(1).max(100_000).optional(),
  bandwidthTb: z.number().int().min(0).max(1000).optional(),
  operatingSystems: z.array(z.string().trim().min(2).max(60)).max(20).optional(),
  locations: z.array(z.string().trim().min(2).max(80)).max(20).optional(),
  price: z.number().int().min(0).max(1_000_000_000).optional(),
  popular: z.boolean().optional(),
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
    const current = await db.vpsPackages.get(id);
    if (!current) return apiError(404, 'NOT_FOUND', 'Paket VPS tidak ditemukan.');

    const body: unknown = await request.json().catch(() => null);
    const parsed = vpsPackagePatchSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return apiError(422, 'VALIDATION_ERROR', first ? first.message : 'Data tidak valid.');
    }
    const updated = { ...current, ...parsed.data, updatedAt: new Date().toISOString() };
    await db.vpsPackages.upsert(updated);
    await db.audit.log({
      actorId: session.sub,
      actorEmail: session.email,
      action: 'update',
      resource: 'vps_package',
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
    await db.vpsPackages.remove(id);
    await db.audit.log({
      actorId: session.sub,
      actorEmail: session.email,
      action: 'delete',
      resource: 'vps_package',
      resourceId: id,
      ipAddress: ip,
      metadata: {},
    });
    return apiOk({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}

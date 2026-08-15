import { z } from 'zod';
import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireAdmin, requireWriteSecurity } from '@/lib/api/guards';
import { clientIp } from '@/lib/security/rate-limit';

const productPatchSchema = z.object({
  slug: z.string().trim().min(2).max(80).optional(),
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().min(5).max(2000).optional(),
  tier: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  packageId: z.string().max(80).nullable().optional(),
  price: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  visibility: z.enum(['public', 'hidden']).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { db, session } = await requireAdmin('products.manage');
    await requireWriteSecurity();
    const ip = await clientIp();
    const { id } = await params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = productPatchSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return apiError(422, 'VALIDATION_ERROR', first ? first.message : 'Data tidak valid.');
    }
    const patch = { ...parsed.data, updatedAt: new Date().toISOString() };
    const updated = await db.products.update(id, patch);
    if (!updated) return apiError(404, 'NOT_FOUND', 'Produk tidak ditemukan.');
    await db.audit.log({
      actorId: session.sub,
      actorEmail: session.email,
      action: 'update',
      resource: 'product',
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
    const { db, session } = await requireAdmin('products.manage');
    await requireWriteSecurity();
    const ip = await clientIp();
    const { id } = await params;
    await db.products.remove(id);
    await db.audit.log({
      actorId: session.sub,
      actorEmail: session.email,
      action: 'delete',
      resource: 'product',
      resourceId: id,
      ipAddress: ip,
      metadata: {},
    });
    return apiOk({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}

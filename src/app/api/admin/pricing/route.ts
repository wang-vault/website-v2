import { z } from 'zod';
import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireAdmin, requireWriteSecurity } from '@/lib/api/guards';
import { clientIp } from '@/lib/security/rate-limit';

const pricingSchema = z.object({
  base: z.number().int().min(0).max(100_000_000),
  perCore: z.number().int().min(0).max(100_000_000),
  perGbRam: z.number().int().min(0).max(100_000_000),
  perGbStorage: z.number().int().min(0).max(100_000_000),
  roundTo: z.number().int().min(1).max(1_000_000),
  minPrice: z.number().int().min(0).max(100_000_000),
});

/** GET /api/admin/pricing — formula harga aktif (admin+). */
export async function GET(): Promise<Response> {
  try {
    const { db } = await requireAdmin('pricing.manage');
    const rules = await db.pricing.get();
    return apiOk(rules);
  } catch (error) {
    return handleApiError(error);
  }
}

/** PUT /api/admin/pricing — perbarui formula harga (admin+), dengan audit. */
export async function PUT(request: Request): Promise<Response> {
  try {
    const { db, session } = await requireAdmin('pricing.manage');
    await requireWriteSecurity();
    const ip = await clientIp();

    const body: unknown = await request.json().catch(() => null);
    const parsed = pricingSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return apiError(422, 'VALIDATION_ERROR', first ? first.message : 'Data tidak valid.');
    }

    const current = await db.pricing.get();
    const updated = {
      ...current,
      ...parsed.data,
      updatedBy: session.email,
      updatedAt: new Date().toISOString(),
    };
    await db.pricing.update(updated);

    await db.audit.log({
      actorId: session.sub,
      actorEmail: session.email,
      action: 'update',
      resource: 'pricing',
      resourceId: 'pricing-low',
      ipAddress: ip,
      metadata: { from: current, to: updated },
    });

    return apiOk(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

import { z } from 'zod';
import { getDb } from '@/lib/db';
import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireWriteSecurity } from '@/lib/api/guards';

const validateSchema = z.object({
  code: z.string().trim().min(1).max(40),
  /** null / tidak dikirim untuk layanan non-tier seperti VPS. */
  tier: z.enum(['low', 'medium', 'high']).nullable().optional().default(null),
  packageId: z.string().max(80).nullable(),
  subtotal: z.number().finite().min(0).max(1_000_000_000),
});

/**
 * POST /api/coupons/validate
 * Validasi kupon SELALU server-side; nilai diskon dihitung server.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    await requireWriteSecurity();
    const body: unknown = await request.json().catch(() => null);
    const parsed = validateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(422, 'VALIDATION_ERROR', 'Data kupon tidak valid.');
    }
    const db = await getDb();
    const result = await db.coupons.validate({
      code: parsed.data.code,
      tier: parsed.data.tier ?? null,
      packageId: parsed.data.packageId,
      subtotal: parsed.data.subtotal,
      customerKey: 'preview',
    });
    if (!result.ok) {
      return apiError(422, `COUPON_${result.code ?? 'INVALID'}`, result.reason ?? 'Kupon tidak valid.');
    }
    return apiOk({ code: result.code, discount: result.discount ?? 0 });
  } catch (error) {
    return handleApiError(error);
  }
}

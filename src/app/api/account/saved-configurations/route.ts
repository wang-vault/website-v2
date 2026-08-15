import { z } from 'zod';
import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireUser, requireWriteSecurity } from '@/lib/api/guards';
import { normalizeLowConfig } from '@/lib/pricing';
import { TIER_DEFINITIONS } from '@/lib/pricing';
import { sanitizeObject } from '@/lib/security/sanitize';

const savedConfigSchema = z.object({
  name: z.string().trim().min(2).max(80),
  tier: z.enum(['low', 'medium', 'high']),
  packageId: z.string().max(80).nullable(),
  cpu: z.number().int().min(0).max(1024),
  ramGb: z.number().min(0).max(4096),
  storageGb: z.number().min(0).max(100_000),
});

export async function GET(): Promise<Response> {
  try {
    const { db, session } = await requireUser();
    const configs = await db.savedConfigurations.listByUser(session.sub);
    return apiOk(configs);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { db, session } = await requireUser();
    await requireWriteSecurity();

    const body: unknown = await request.json().catch(() => null);
    const parsed = savedConfigSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return apiError(422, 'VALIDATION_ERROR', first ? first.message : 'Data tidak valid.');
    }
    const input = sanitizeObject(parsed.data);
    const def = TIER_DEFINITIONS[input.tier];
    if (!def) return apiError(422, 'UNKNOWN_TIER', 'Tier tidak dikenal.');

    const normalized = normalizeLowConfig({
      cpu: input.cpu,
      ramGb: input.ramGb,
      storageGb: input.storageGb,
    });

    const configs = await db.savedConfigurations.listByUser(session.sub);
    if (configs.length >= 50) {
      return apiError(400, 'LIMIT_REACHED', 'Maksimal 50 konfigurasi tersimpan per akun.');
    }

    const created = await db.savedConfigurations.create({
      userId: session.sub,
      name: input.name,
      tier: input.tier,
      packageId: input.tier === 'high' ? input.packageId : null,
      cpu: input.tier === 'low' ? normalized.cpu : input.cpu,
      ramGb: input.tier === 'low' ? normalized.ramGb : input.ramGb,
      storageGb: input.tier === 'low' ? normalized.storageGb : input.storageGb,
    });
    return apiOk(created, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

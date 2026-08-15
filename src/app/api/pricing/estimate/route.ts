import { z } from 'zod';
import {
  calculateHighPrice,
  calculateLowPrice,
  estimatePerformance,
  findHighPackage,
  isOngoing,
  normalizeLowConfig,
} from '@/lib/pricing';
import { apiError, apiOk, handleApiError } from '@/lib/api';
import type { Tier } from '@/types';

const estimateSchema = z.object({
  tier: z.enum(['low', 'medium', 'high']),
  packageId: z.string().max(80).nullable().optional(),
  cpu: z.number().min(0).max(1024).optional().default(0),
  ramGb: z.number().min(0).max(4096).optional().default(0),
  storageGb: z.number().min(0).max(100_000).optional().default(0),
});

/**
 * POST /api/pricing/estimate — estimasi harga & performa dari konfigurasi.
 * Memakai modul pricing yang sama dengan UI dan /api/orders.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json().catch(() => null);
    const parsed = estimateSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return apiError(422, 'VALIDATION_ERROR', first ? first.message : 'Data tidak valid.');
    }

    const { tier, packageId, cpu, ramGb, storageGb } = parsed.data;

    if (!['low', 'medium', 'high'].includes(tier)) {
      return apiError(422, 'UNKNOWN_TIER', 'Tier tidak dikenal.');
    }
    if (isOngoing(tier as Tier)) {
      return apiError(409, 'TIER_ONGOING', 'Tier Medium sedang dipersiapkan dan belum dapat dipesan.');
    }

    if (tier === 'high') {
      const pkg = findHighPackage(packageId ?? '');
      if (!pkg) {
        return apiError(422, 'INVALID_PACKAGE', 'Paket tidak valid untuk tier High.');
      }
      return apiOk({
        tier,
        packageId: pkg.id,
        cpu: pkg.cpu,
        ramGb: pkg.ramGb,
        storageGb: pkg.storageGb,
        price: calculateHighPrice(pkg.id),
        estimate: estimatePerformance({ tier, cpu: pkg.cpu, ramGb: pkg.ramGb, storageGb: pkg.storageGb }),
      });
    }

    const normalized = normalizeLowConfig({ cpu, ramGb, storageGb });
    const price = calculateLowPrice(normalized);
    return apiOk({
      tier,
      packageId: null,
      cpu: normalized.cpu,
      ramGb: normalized.ramGb,
      storageGb: normalized.storageGb,
      price,
      estimate: estimatePerformance({ tier: 'low', ...normalized }),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

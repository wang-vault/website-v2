import { z } from 'zod';
import { getDb } from '@/lib/db';
import {
  calculateLowPrice,
  estimatePerformance,
  findHighPackage,
  normalizeLowConfig,
  TIER_DEFINITIONS,
} from '@/lib/pricing';
import { isOrderable, resolveCatalogStatus, unavailableCode, unavailableReason } from '@/lib/catalog';
import { apiError, apiOk, handleApiError } from '@/lib/api';

const estimateSchema = z.object({
  tier: z.enum(['low', 'medium', 'high']),
  packageId: z.string().max(80).nullable().optional(),
  cpu: z.number().min(0).max(1024).optional().default(0),
  ramGb: z.number().min(0).max(4096).optional().default(0),
  storageGb: z.number().min(0).max(100_000).optional().default(0),
});

/**
 * POST /api/pricing/estimate — estimasi harga & performa dari konfigurasi.
 * Memakai modul pricing yang sama dengan UI dan /api/orders, serta status
 * ketersediaan yang sama (settings.catalogStatus) agar tidak ada estimasi
 * untuk layanan yang tidak dijual.
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

    const db = await getDb();
    const catalogStatus = resolveCatalogStatus(await db.settings.get());
    const status = catalogStatus[tier];
    if (!isOrderable(status)) {
      return apiError(409, unavailableCode(status), unavailableReason(tier, status));
    }

    // Tier dengan paket tetap (Medium & High) — harga diambil dari katalog.
    if (TIER_DEFINITIONS[tier].mode === 'package') {
      const dbPackage = packageId ? await db.packages.get(packageId) : null;
      const pkg =
        dbPackage && dbPackage.active && dbPackage.tier === tier
          ? { id: dbPackage.id, cpu: dbPackage.cpu, ramGb: dbPackage.ramGb, storageGb: dbPackage.storageGb, price: dbPackage.price }
          : tier === 'high'
            ? findHighPackage(packageId ?? '')
            : null;
      if (!pkg) {
        return apiError(422, 'INVALID_PACKAGE', `Paket tidak valid untuk tier ${TIER_DEFINITIONS[tier].label}.`);
      }
      return apiOk({
        tier,
        packageId: pkg.id,
        cpu: pkg.cpu,
        ramGb: pkg.ramGb,
        storageGb: pkg.storageGb,
        price: pkg.price,
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

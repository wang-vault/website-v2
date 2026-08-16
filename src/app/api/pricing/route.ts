import { getDb } from '@/lib/db';
import { DEFAULT_LOW_PRICING, LOW_LIMITS, TIER_DEFINITIONS } from '@/lib/pricing';
import { resolveCatalogStatus } from '@/lib/catalog';
import { apiOk, handleApiError } from '@/lib/api';
import type { PackageRecord, Tier } from '@/types';

/**
 * GET /api/pricing — konstanta harga, katalog paket, dan status ketersediaan
 * yang sedang berlaku. Paket dibaca dari basis data (dikelola admin), status
 * dibaca dari settings.catalogStatus.
 */
export async function GET(): Promise<Response> {
  try {
    const db = await getDb();
    const [rules, allPackages, vpsPackages, settings] = await Promise.all([
      db.pricing.get(),
      db.packages.list(),
      db.vpsPackages.list(),
      db.settings.get(),
    ]);

    const activePackages = allPackages.filter((pkg) => pkg.active);
    const byTier = (tier: Tier): PackageRecord[] => activePackages.filter((pkg) => pkg.tier === tier);
    const catalogStatus = resolveCatalogStatus(settings);

    return apiOk({
      low: {
        base: rules.base,
        perCore: rules.perCore,
        perGbRam: rules.perGbRam,
        perGbStorage: rules.perGbStorage,
        roundTo: rules.roundTo,
        minPrice: rules.minPrice,
        limits: LOW_LIMITS,
      },
      medium: { packages: byTier('medium') },
      high: { packages: byTier('high') },
      vps: { packages: vpsPackages.filter((pkg) => pkg.active) },
      tiers: {
        low: { status: catalogStatus.low, perfFactor: TIER_DEFINITIONS.low.perfFactor },
        medium: { status: catalogStatus.medium, perfFactor: TIER_DEFINITIONS.medium.perfFactor },
        high: { status: catalogStatus.high, perfFactor: TIER_DEFINITIONS.high.perfFactor },
      },
      catalogStatus,
      defaultLowPricing: DEFAULT_LOW_PRICING,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

import { getDb } from '@/lib/db';
import { DEFAULT_LOW_PRICING, HIGH_PACKAGES, LOW_LIMITS, TIER_DEFINITIONS } from '@/lib/pricing';
import { apiOk, handleApiError } from '@/lib/api';

/** GET /api/pricing — konstanta harga dan batas konfigurasi yang berlaku. */
export async function GET(): Promise<Response> {
  try {
    const db = await getDb();
    const rules = await db.pricing.get();
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
      high: {
        packages: HIGH_PACKAGES,
      },
      tiers: {
        low: { status: TIER_DEFINITIONS.low.status, perfFactor: TIER_DEFINITIONS.low.perfFactor },
        medium: { status: TIER_DEFINITIONS.medium.status, perfFactor: TIER_DEFINITIONS.medium.perfFactor },
        high: { status: TIER_DEFINITIONS.high.status, perfFactor: TIER_DEFINITIONS.high.perfFactor },
      },
      defaultLowPricing: DEFAULT_LOW_PRICING,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

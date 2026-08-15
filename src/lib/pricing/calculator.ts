import {
  DEFAULT_LOW_PRICING,
  HIGH_PACKAGE_MAP,
  LOW_LIMITS,
  type LowPricingConstants,
} from './constants';

export interface LowConfig {
  tier: 'low';
  cpu: number;
  ramGb: number;
  storageGb: number;
}

export interface NormalizedLowConfig {
  cpu: number;
  ramGb: number;
  storageGb: number;
}

/** Membulatkan nilai ke kelipatan terdekat. */
function roundToMultiple(value: number, multiple: number): number {
  if (multiple <= 0) return Math.round(value);
  return Math.round(value / multiple) * multiple;
}

/**
 * Normalisasi nilai konfigurasi Low.
 * Nilai di luar batas DIPANGKAS (clamp), tidak ditolak, kecuali tipe yang salah.
 * Penyimpanan tidak pernah melebihi 160 GB.
 */
export function normalizeLowConfig(input: {
  cpu: number;
  ramGb: number;
  storageGb: number;
}): NormalizedLowConfig {
  const clamp = (value: number, min: number, max: number, step: number): number => {
    if (!Number.isFinite(value)) return min;
    const clamped = Math.min(Math.max(value, min), max);
    // Snap ke kelipatan step dari minimum agar slider & nilai manual konsisten.
    const snapped = min + Math.round((clamped - min) / step) * step;
    return Math.min(Math.max(snapped, min), max);
  };

  return {
    cpu: clamp(input.cpu, LOW_LIMITS.cpu.min, LOW_LIMITS.cpu.max, LOW_LIMITS.cpu.step),
    ramGb: clamp(input.ramGb, LOW_LIMITS.ram.min, LOW_LIMITS.ram.max, LOW_LIMITS.ram.step),
    storageGb: clamp(
      input.storageGb,
      LOW_LIMITS.storage.min,
      LOW_LIMITS.storage.max,
      LOW_LIMITS.storage.step,
    ),
  };
}

/**
 * Formula harga Low:
 * base + (CPU × perCore) + (RAM × perGbRam) + (Storage × perGbStorage),
 * dibulatkan ke kelipatan roundTo, dengan harga minimum.
 */
export function calculateLowPrice(config: NormalizedLowConfig, pricing?: LowPricingConstants): number {
  const p = pricing ?? DEFAULT_LOW_PRICING;
  const raw =
    p.base +
    config.cpu * p.perCore +
    config.ramGb * p.perGbRam +
    config.storageGb * p.perGbStorage;
  const rounded = roundToMultiple(raw, p.roundTo);
  return Math.max(rounded, p.minPrice);
}

/** Harga paket High adalah harga final dari katalog. */
export function calculateHighPrice(packageId: string): number {
  const pkg = HIGH_PACKAGE_MAP.get(packageId);
  if (!pkg) {
    throw new Error(`Paket tidak dikenal: ${packageId}`);
  }
  return pkg.price;
}

export interface PriceBreakdown {
  base: number;
  cpuCost: number;
  ramCost: number;
  storageCost: number;
  subtotal: number;
  rounded: number;
  minimumApplied: boolean;
  final: number;
}

/** Rincian harga Low untuk ditampilkan di UI. */
export function lowPriceBreakdown(config: NormalizedLowConfig, pricing?: LowPricingConstants): PriceBreakdown {
  const p = pricing ?? DEFAULT_LOW_PRICING;
  const cpuCost = config.cpu * p.perCore;
  const ramCost = config.ramGb * p.perGbRam;
  const storageCost = config.storageGb * p.perGbStorage;
  const subtotal = p.base + cpuCost + ramCost + storageCost;
  const rounded = roundToMultiple(subtotal, p.roundTo);
  const final = Math.max(rounded, p.minPrice);
  return {
    base: p.base,
    cpuCost,
    ramCost,
    storageCost,
    subtotal,
    rounded,
    minimumApplied: final === p.minPrice && rounded < p.minPrice,
    final,
  };
}

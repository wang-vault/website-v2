import type { Tier } from '@/types';

/**
 * Satu-satunya sumber kebenaran untuk katalog tier, paket High,
 * batas konfigurasi Low, dan konstanta harga.
 *
 * Baik UI (Server Builder) maupun API (/api/orders, /api/pricing)
 * WAJIB mengimpor dari modul ini. Dilarang menduplikasi formula harga
 * di tempat lain.
 */

export interface LowLimits {
  cpu: { min: number; max: number; step: number };
  ram: { min: number; max: number; step: number };
  storage: { min: number; max: number; step: number };
}

export interface TierDefinition {
  tier: Tier;
  label: string;
  cpuName: string;
  mode: 'custom' | 'package';
  status: 'available' | 'ongoing' | 'unavailable';
  perfFactor: number;
}

export interface HighPackage {
  id: string;
  label: string;
  tier: 'high';
  cpu: number;
  ramGb: number;
  storageGb: number;
  price: number;
  popular: boolean;
  sortOrder: number;
}

export interface LowPricingConstants {
  base: number;
  perCore: number;
  perGbRam: number;
  perGbStorage: number;
  roundTo: number;
  minPrice: number;
}

export const LOW_LIMITS: LowLimits = {
  cpu: { min: 2, max: 16, step: 1 },
  ram: { min: 4, max: 32, step: 2 },
  storage: { min: 20, max: 160, step: 10 },
};

/** 160 GB adalah batas maksimum absolut penyimpanan tier Low. */
export const MAX_STORAGE_GB = 160;

export const TIER_DEFINITIONS: Record<Tier, TierDefinition> = {
  low: {
    tier: 'low',
    label: 'Low',
    cpuName: 'Intel Xeon E5-2690 v4',
    mode: 'custom',
    status: 'available',
    perfFactor: 0.82,
  },
  medium: {
    tier: 'medium',
    label: 'Medium',
    cpuName: 'Intel Xeon Gold 6138',
    mode: 'package',
    status: 'ongoing',
    perfFactor: 1.0,
  },
  high: {
    tier: 'high',
    label: 'High',
    cpuName: 'AMD Ryzen 9 9950X',
    mode: 'package',
    status: 'available',
    perfFactor: 1.45,
  },
};

export const ONGOING_TIERS: Tier[] = ['medium'];

export const HIGH_PACKAGES: HighPackage[] = [
  { id: 'high-2c4g', label: 'Paket 2C/4G', tier: 'high', cpu: 2, ramGb: 4, storageGb: 30, price: 300_000, popular: false, sortOrder: 1 },
  { id: 'high-3c6g', label: 'Paket 3C/6G', tier: 'high', cpu: 3, ramGb: 6, storageGb: 40, price: 420_000, popular: false, sortOrder: 2 },
  { id: 'high-4c8g', label: 'Paket 4C/8G', tier: 'high', cpu: 4, ramGb: 8, storageGb: 50, price: 600_000, popular: true, sortOrder: 3 },
  { id: 'high-6c12g', label: 'Paket 6C/12G', tier: 'high', cpu: 6, ramGb: 12, storageGb: 60, price: 850_000, popular: false, sortOrder: 4 },
  { id: 'high-8c16g', label: 'Paket 8C/16G', tier: 'high', cpu: 8, ramGb: 16, storageGb: 70, price: 1_100_000, popular: false, sortOrder: 5 },
  { id: 'high-10c32g', label: 'Paket 10C/32G', tier: 'high', cpu: 10, ramGb: 32, storageGb: 110, price: 2_100_000, popular: false, sortOrder: 6 },
];

export const HIGH_PACKAGE_MAP: ReadonlyMap<string, HighPackage> = new Map(
  HIGH_PACKAGES.map((pkg) => [pkg.id, pkg]),
);

export const DEFAULT_LOW_PRICING: LowPricingConstants = {
  base: 5_000,
  perCore: 7_000,
  perGbRam: 4_500,
  perGbStorage: 300,
  roundTo: 500,
  minPrice: 45_000,
};

export function isOngoing(tier: Tier): boolean {
  return TIER_DEFINITIONS[tier].status === 'ongoing';
}

/** Mencari paket High berdasarkan id paket (tanpa lookup basis data). */
export function findHighPackage(packageId: string): HighPackage | null {
  return HIGH_PACKAGE_MAP.get(packageId) ?? null;
}

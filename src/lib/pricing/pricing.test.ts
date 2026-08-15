import { describe, expect, it } from 'vitest';
import {
  HIGH_PACKAGES,
  LOW_LIMITS,
  MAX_STORAGE_GB,
  calculateHighPrice,
  calculateLowPrice,
  normalizeLowConfig,
  estimatePerformance,
} from './index';

describe('Katalog paket High', () => {
  it('berisi 6 paket dengan id yang benar', () => {
    expect(HIGH_PACKAGES.map((p) => p.id)).toEqual([
      'high-2c4g',
      'high-3c6g',
      'high-4c8g',
      'high-6c12g',
      'high-8c16g',
      'high-10c32g',
    ]);
  });

  it('high-4c8g ditandai Populer', () => {
    expect(HIGH_PACKAGES.find((p) => p.id === 'high-4c8g')?.popular).toBe(true);
  });
});

describe('Harga paket High (Test 1)', () => {
  it('menghasilkan harga tepat untuk semua paket', () => {
    const expected: Record<string, number> = {
      'high-2c4g': 300_000,
      'high-3c6g': 420_000,
      'high-4c8g': 600_000,
      'high-6c12g': 850_000,
      'high-8c16g': 1_100_000,
      'high-10c32g': 2_100_000,
    };
    for (const pkg of HIGH_PACKAGES) {
      expect(calculateHighPrice(pkg.id), pkg.id).toBe(expected[pkg.id]);
    }
  });

  it('menolak paket palsu', () => {
    expect(() => calculateHighPrice('fake-package')).toThrow();
  });
});

describe('Harga Low', () => {
  it('konfigurasi minimum 2 core / 4 GB / 20 GB = Rp45.000 (Test 2)', () => {
    const price = calculateLowPrice({ cpu: 2, ramGb: 4, storageGb: 20 });
    expect(price).toBe(45_000);
  });

  it('menerapkan harga minimum', () => {
    // 2 core / 4 GB / 20 GB secara mentah di bawah minimum.
    const raw =
      5_000 + 2 * 7_000 + 4 * 4_500 + 20 * 300;
    expect(raw).toBeLessThan(45_000);
    expect(calculateLowPrice({ cpu: 2, ramGb: 4, storageGb: 20 })).toBe(45_000);
  });

  it('membulatkan ke kelipatan Rp500', () => {
    const price = calculateLowPrice({ cpu: 3, ramGb: 6, storageGb: 30 });
    expect(price % 500).toBe(0);
  });

  it('menggunakan batas maksimum yang benar', () => {
    expect(LOW_LIMITS.storage.max).toBe(MAX_STORAGE_GB);
  });
});

describe('Normalisasi konfigurasi Low (Test 3)', () => {
  it('memangkas overflow 20 core / 64 GB / 900 GB menjadi 16 / 32 / 160', () => {
    const normalized = normalizeLowConfig({ cpu: 20, ramGb: 64, storageGb: 900 });
    expect(normalized).toEqual({ cpu: 16, ramGb: 32, storageGb: 160 });
  });

  it('memangkas nilai di bawah minimum', () => {
    const normalized = normalizeLowConfig({ cpu: 0, ramGb: 0, storageGb: 0 });
    expect(normalized).toEqual({ cpu: 2, ramGb: 4, storageGb: 20 });
  });

  it('tidak pernah menghasilkan penyimpanan di atas 160 GB', () => {
    const normalized = normalizeLowConfig({ cpu: 2, ramGb: 4, storageGb: 1_000_000 });
    expect(normalized.storageGb).toBeLessThanOrEqual(MAX_STORAGE_GB);
  });

  it('snap ke step yang benar (RAM step 2 GB)', () => {
    const normalized = normalizeLowConfig({ cpu: 5, ramGb: 9, storageGb: 25 });
    expect(normalized.ramGb).toBe(10);
    expect(normalized.storageGb).toBe(30);
  });
});

describe('Model estimasi performa', () => {
  it('deterministik untuk input yang sama', () => {
    const a = estimatePerformance({ tier: 'low', cpu: 4, ramGb: 8, storageGb: 40 });
    const b = estimatePerformance({ tier: 'low', cpu: 4, ramGb: 8, storageGb: 40 });
    expect(a).toEqual(b);
  });

  it('tier High memiliki kapasitas lebih besar dari tier Low', () => {
    const low = estimatePerformance({ tier: 'low', cpu: 4, ramGb: 8, storageGb: 40 });
    const high = estimatePerformance({ tier: 'high', cpu: 4, ramGb: 8, storageGb: 40 });
    expect(high.concurrentPlayers).toBeGreaterThan(low.concurrentPlayers);
  });

  it('semua angka berada dalam rentang yang valid', () => {
    const result = estimatePerformance({ tier: 'high', cpu: 10, ramGb: 32, storageGb: 110 });
    expect(result.tps).toBeGreaterThanOrEqual(0);
    expect(result.tps).toBeLessThanOrEqual(20);
    expect(result.cpuLoadPercent).toBeGreaterThanOrEqual(0);
    expect(result.cpuLoadPercent).toBeLessThanOrEqual(100);
    expect(result.ramUsageGb).toBeGreaterThanOrEqual(0);
  });
});

import { describe, expect, it } from 'vitest';
import {
  CATALOG_KEYS,
  isOrderable,
  orderCatalogKey,
  orderCatalogLabel,
  orderableTiers,
  resolveCatalogStatus,
  unavailableCode,
  unavailableReason,
} from '@/lib/catalog';
import { DEFAULT_CATALOG_STATUS } from '@/types';
import type { SettingsRecord, TierStatus } from '@/types';

function settingsWith(catalogStatus: unknown): Pick<SettingsRecord, 'catalogStatus'> {
  return { catalogStatus } as Pick<SettingsRecord, 'catalogStatus'>;
}

describe('status ketersediaan katalog', () => {
  it('memakai nilai bawaan bila settings belum punya catalogStatus', () => {
    expect(resolveCatalogStatus(null)).toEqual(DEFAULT_CATALOG_STATUS);
    expect(resolveCatalogStatus(settingsWith(undefined))).toEqual(DEFAULT_CATALOG_STATUS);
  });

  it('memakai nilai tersimpan bila valid', () => {
    const resolved = resolveCatalogStatus(
      settingsWith({ low: 'available', medium: 'ongoing', high: 'unavailable', vps: 'available' }),
    );
    expect(resolved.medium).toBe('ongoing');
    expect(resolved.high).toBe('unavailable');
    expect(resolved.vps).toBe('available');
  });

  it('mengabaikan nilai rusak dan kembali ke bawaan per kunci', () => {
    const resolved = resolveCatalogStatus(settingsWith({ low: 'nonsense', vps: 42 }));
    expect(resolved.low).toBe(DEFAULT_CATALOG_STATUS.low);
    expect(resolved.vps).toBe(DEFAULT_CATALOG_STATUS.vps);
  });

  it('selalu mengembalikan seluruh kunci katalog', () => {
    const resolved = resolveCatalogStatus(settingsWith({}));
    expect(Object.keys(resolved).sort()).toEqual([...CATALOG_KEYS].sort());
  });

  it('hanya status available yang dapat dipesan', () => {
    expect(isOrderable('available')).toBe(true);
    expect(isOrderable('ongoing')).toBe(false);
    expect(isOrderable('unavailable')).toBe(false);
  });

  it('kode dan alasan penolakan sesuai status', () => {
    expect(unavailableCode('ongoing')).toBe('TIER_ONGOING');
    expect(unavailableCode('unavailable')).toBe('TIER_UNAVAILABLE');
    expect(unavailableReason('medium', 'ongoing')).toContain('sedang dipersiapkan');
    expect(unavailableReason('vps', 'unavailable')).toContain('tidak tersedia');
  });

  it('orderableTiers hanya memuat tier Minecraft yang dijual', () => {
    const status: Record<'low' | 'medium' | 'high' | 'vps', TierStatus> = {
      low: 'available',
      medium: 'ongoing',
      high: 'available',
      vps: 'available',
    };
    expect(orderableTiers(status)).toEqual(['low', 'high']);
  });
});

describe('label layanan order', () => {
  it('order Minecraft memakai label tier', () => {
    expect(orderCatalogLabel({ service: 'minecraft', tier: 'high' })).toBe('High');
    expect(orderCatalogKey({ service: 'minecraft', tier: 'medium' })).toBe('medium');
  });

  it('order VPS tidak memakai tier', () => {
    expect(orderCatalogLabel({ service: 'vps', tier: null })).toBe('VPS');
    expect(orderCatalogKey({ service: 'vps', tier: null })).toBe('vps');
  });

  it('order Minecraft tanpa tier tetap punya label yang aman', () => {
    expect(orderCatalogLabel({ service: 'minecraft', tier: null })).toBe('Minecraft Hosting');
  });
});

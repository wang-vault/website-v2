import { describe, expect, it } from 'vitest';
import {
  RENEWAL_MONTHS,
  addMonths,
  evaluateRenewal,
  isRenewalPending,
  nextExpiry,
  renewalLabel,
  type RenewalContext,
} from '@/lib/renewals';
import type { OrderRecord } from '@/types';

const NOW = new Date('2026-08-17T10:00:00.000Z');

function daysFromNow(days: number): string {
  return new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function context(overrides: Partial<RenewalContext> = {}): RenewalContext {
  return {
    order: { status: 'completed', expiresAt: daysFromNow(5), renewalOfOrderId: null },
    packageRenewable: true,
    packageAvailable: true,
    catalogStatus: 'available',
    renewalPending: false,
    ...overrides,
  };
}

describe('kelayakan perpanjangan', () => {
  it('mengizinkan layanan aktif dengan paket renewable', () => {
    const result = evaluateRenewal(context());
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeNull();
  });

  it('mengizinkan perpanjangan meski masa aktif sudah lewat', () => {
    const result = evaluateRenewal(
      context({ order: { status: 'completed', expiresAt: daysFromNow(-10), renewalOfOrderId: null } }),
    );
    expect(result.allowed).toBe(true);
  });

  it('menolak paket yang ditandai tidak dapat diperpanjang', () => {
    const result = evaluateRenewal(context({ packageRenewable: false }));
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('package_not_renewable');
    expect(result.message).toContain('tidak menyediakan perpanjangan');
  });

  it('menolak bila paket sudah tidak ada di katalog', () => {
    const result = evaluateRenewal(context({ packageAvailable: false }));
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('package_missing');
  });

  it('menolak bila layanan sedang disiapkan atau tidak tersedia', () => {
    expect(evaluateRenewal(context({ catalogStatus: 'ongoing' })).reason).toBe('catalog_unavailable');
    expect(evaluateRenewal(context({ catalogStatus: 'unavailable' })).reason).toBe('catalog_unavailable');
  });

  it('menolak bila masa aktif belum ditetapkan admin', () => {
    const result = evaluateRenewal(
      context({ order: { status: 'paid', expiresAt: null, renewalOfOrderId: null } }),
    );
    expect(result.reason).toBe('period_not_set');
  });

  it('menolak order yang dibatalkan atau direfund', () => {
    for (const status of ['cancelled', 'refunded'] as const) {
      const result = evaluateRenewal(
        context({ order: { status, expiresAt: daysFromNow(5), renewalOfOrderId: null } }),
      );
      expect(result.reason).toBe('order_inactive');
    }
  });

  it('menolak perpanjangan dari order perpanjangan', () => {
    const result = evaluateRenewal(
      context({ order: { status: 'paid', expiresAt: daysFromNow(5), renewalOfOrderId: 'ws_induk' } }),
    );
    expect(result.reason).toBe('is_renewal_order');
  });

  it('menolak bila sudah ada perpanjangan berjalan', () => {
    const result = evaluateRenewal(context({ renewalPending: true }));
    expect(result.reason).toBe('renewal_pending');
  });

  it('tier Low custom (tanpa paket) tetap dapat diperpanjang', () => {
    expect(evaluateRenewal(context({ packageRenewable: null })).allowed).toBe(true);
  });
});

describe('deteksi perpanjangan berjalan', () => {
  const renewal = (status: OrderRecord['status'], applied: string | null = null) => ({
    status,
    renewalAppliedAt: applied,
  });

  it('order perpanjangan yang belum diterapkan dianggap berjalan', () => {
    expect(isRenewalPending([renewal('awaiting_payment')])).toBe(true);
    expect(isRenewalPending([renewal('paid')])).toBe(true);
  });

  it('perpanjangan yang sudah diterapkan tidak menghalangi', () => {
    expect(isRenewalPending([renewal('completed', '2026-08-01T00:00:00.000Z')])).toBe(false);
  });

  it('perpanjangan yang dibatalkan tidak menghalangi', () => {
    expect(isRenewalPending([renewal('cancelled')])).toBe(false);
  });
});

describe('perhitungan masa berlaku baru', () => {
  it('menambah satu bulan dari tanggal kedaluwarsa bila masih berjalan', () => {
    const result = nextExpiry('2026-09-10T00:00:00.000Z', NOW);
    expect(result.startsWith('2026-10-10')).toBe(true);
  });

  it('menghitung dari sekarang bila masa aktif sudah lewat', () => {
    const result = nextExpiry(daysFromNow(-30), NOW);
    expect(result.startsWith('2026-09-17')).toBe(true);
  });

  it('menghitung dari sekarang bila belum ada tanggal kedaluwarsa', () => {
    expect(nextExpiry(null, NOW).startsWith('2026-09-17')).toBe(true);
  });

  it('aman terhadap akhir bulan (31 Jan + 1 bulan → 28 Feb)', () => {
    const result = addMonths(new Date('2026-01-31T00:00:00.000Z'), 1);
    expect(result.toISOString().startsWith('2026-02-28')).toBe(true);
  });

  it('satu perpanjangan menambah satu bulan', () => {
    expect(RENEWAL_MONTHS).toBe(1);
  });
});

describe('label order perpanjangan', () => {
  it('memberi label untuk order perpanjangan saja', () => {
    expect(renewalLabel({ renewalOfOrderId: 'ws_abc' })).toContain('ws_abc');
    expect(renewalLabel({ renewalOfOrderId: null })).toBeNull();
  });
});

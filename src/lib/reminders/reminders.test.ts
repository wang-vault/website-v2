import { describe, expect, it } from 'vitest';
import {
  EXPIRING_SOON_DAYS,
  REMINDER_STAGES,
  daysSinceActivation,
  daysUntilExpiry,
  dueStages,
  nextReminder,
  remainingLabel,
  reminderEligible,
  reminderStageLabel,
  serviceState,
  summarizeExpiry,
} from '@/lib/reminders';
import type { OrderRecord } from '@/types';

const NOW = new Date('2026-08-17T10:00:00.000Z');

function daysFromNow(days: number): string {
  return new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

type ReminderOrder = Pick<OrderRecord, 'status' | 'activatedAt' | 'expiresAt' | 'remindersSent'>;

function order(overrides: Partial<ReminderOrder> = {}): ReminderOrder {
  return {
    status: 'completed',
    activatedAt: daysFromNow(-30),
    expiresAt: daysFromNow(30),
    remindersSent: [],
    ...overrides,
  };
}

describe('perhitungan masa aktif', () => {
  it('menghitung sisa hari menuju kedaluwarsa', () => {
    expect(daysUntilExpiry(daysFromNow(7), NOW)).toBe(7);
    expect(daysUntilExpiry(daysFromNow(0.5), NOW)).toBe(1);
    expect(daysUntilExpiry(daysFromNow(-2), NOW)).toBe(-2);
    expect(daysUntilExpiry(null, NOW)).toBeNull();
  });

  it('menghitung lama layanan berjalan', () => {
    expect(daysSinceActivation(daysFromNow(-10), NOW)).toBe(10);
    expect(daysSinceActivation(null, NOW)).toBeNull();
  });

  it('mengabaikan tanggal yang tidak valid', () => {
    expect(daysUntilExpiry('bukan-tanggal', NOW)).toBeNull();
  });
});

describe('keadaan layanan', () => {
  it('unset bila admin belum mengatur tanggal', () => {
    expect(serviceState({ activatedAt: null, expiresAt: null }, NOW)).toBe('unset');
  });

  it('scheduled bila tanggal aktif masih di masa depan', () => {
    expect(serviceState({ activatedAt: daysFromNow(3), expiresAt: daysFromNow(33) }, NOW)).toBe('scheduled');
  });

  it('active bila masih jauh dari kedaluwarsa', () => {
    expect(serviceState({ activatedAt: daysFromNow(-1), expiresAt: daysFromNow(30) }, NOW)).toBe('active');
  });

  it('expiring_soon pada ambang tujuh hari', () => {
    expect(serviceState({ activatedAt: daysFromNow(-1), expiresAt: daysFromNow(EXPIRING_SOON_DAYS) }, NOW)).toBe(
      'expiring_soon',
    );
  });

  it('expired setelah tanggal kedaluwarsa', () => {
    expect(serviceState({ activatedAt: daysFromNow(-40), expiresAt: daysFromNow(-1) }, NOW)).toBe('expired');
  });

  it('aktif tanpa batas bila exp belum diisi', () => {
    expect(serviceState({ activatedAt: daysFromNow(-5), expiresAt: null }, NOW)).toBe('active');
  });
});

describe('kelayakan pengingat', () => {
  it('order tanpa tanggal exp tidak diingatkan', () => {
    expect(reminderEligible({ status: 'completed', expiresAt: null })).toBe(false);
  });

  it('order batal, refund, atau kedaluwarsa tidak diingatkan', () => {
    for (const status of ['cancelled', 'refunded', 'expired'] as const) {
      expect(reminderEligible({ status, expiresAt: daysFromNow(1) })).toBe(false);
    }
  });

  it('order aktif dengan exp diingatkan', () => {
    expect(reminderEligible({ status: 'paid', expiresAt: daysFromNow(1) })).toBe(true);
  });
});

describe('tahap pengingat', () => {
  it('belum ada tahap jatuh tempo saat masih jauh', () => {
    expect(dueStages(order({ expiresAt: daysFromNow(30) }), NOW)).toEqual([]);
  });

  it('H-7 jatuh tempo saat sisa tujuh hari', () => {
    expect(dueStages(order({ expiresAt: daysFromNow(7) }), NOW)).toEqual([7]);
  });

  it('tahap yang sudah dikirim tidak diulang', () => {
    expect(dueStages(order({ expiresAt: daysFromNow(7), remindersSent: [7] }), NOW)).toEqual([]);
  });

  it('mengirim tahap terdekat saja bila beberapa tahap terlewat', () => {
    const result = nextReminder(order({ expiresAt: daysFromNow(1) }), NOW);
    expect(result?.stage).toBe(1);
    expect(result?.alsoMark.sort((a, b) => b - a)).toEqual([7, 3]);
  });

  it('tahap hari kedaluwarsa dikirim saat sudah lewat', () => {
    const result = nextReminder(order({ expiresAt: daysFromNow(-3), remindersSent: [7, 3, 1] }), NOW);
    expect(result?.stage).toBe(0);
  });

  it('tidak ada pengingat setelah seluruh tahap terkirim', () => {
    expect(nextReminder(order({ expiresAt: daysFromNow(-3), remindersSent: [...REMINDER_STAGES] }), NOW)).toBeNull();
  });

  it('order yang dibatalkan tidak menghasilkan pengingat', () => {
    expect(nextReminder(order({ status: 'cancelled', expiresAt: daysFromNow(1) }), NOW)).toBeNull();
  });

  it('label tahap jujur dan mudah dibaca', () => {
    expect(reminderStageLabel(7)).toContain('7 hari');
    expect(reminderStageLabel(1)).toContain('besok');
    expect(reminderStageLabel(0)).toContain('hari ini');
  });
});

describe('ringkasan & label untuk UI', () => {
  it('menghitung layanan per keadaan tanpa order tidak aktif', () => {
    const summary = summarizeExpiry(
      [
        order({ expiresAt: daysFromNow(2) }),
        order({ expiresAt: daysFromNow(-1) }),
        order({ expiresAt: daysFromNow(60) }),
        order({ activatedAt: daysFromNow(5), expiresAt: daysFromNow(35) }),
        order({ status: 'cancelled', expiresAt: daysFromNow(1) }),
      ],
      NOW,
    );
    expect(summary).toEqual({ expiringSoon: 1, expired: 1, active: 1, scheduled: 1 });
  });

  it('label sisa waktu jujur', () => {
    expect(remainingLabel(daysFromNow(5), NOW)).toBe('5 hari lagi');
    expect(remainingLabel(daysFromNow(0.5), NOW)).toBe('Berakhir besok');
    expect(remainingLabel(daysFromNow(-2), NOW)).toBe('Lewat 2 hari');
    expect(remainingLabel(null, NOW)).toBe('—');
  });
});

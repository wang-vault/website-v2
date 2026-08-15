'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Select } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { EmptyState, LoadingState } from '@/components/ui/state';
import { useToast } from '@/components/ui/toast';
import { formatDate, formatRupiah } from '@/lib/utils';
import { TIER_LABELS } from '@/types';
import type { CouponRecord, Tier } from '@/types';

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)ws_csrf=([^;]+)/);
  return match?.[1] ?? '';
}

interface EmptyCouponForm {
  code: string;
  type: 'percentage' | 'fixed';
  value: string;
  minOrder: string;
  maxUses: string;
  usesPerCustomer: string;
  active: boolean;
  startsAt: string;
  expiresAt: string;
  applicableTiers: Tier[];
}

const EMPTY_FORM: EmptyCouponForm = {
  code: '',
  type: 'percentage',
  value: '10',
  minOrder: '0',
  maxUses: '',
  usesPerCustomer: '1',
  active: true,
  startsAt: '',
  expiresAt: '',
  applicableTiers: [],
};

export function CouponsManager() {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<EmptyCouponForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/coupons', { cache: 'no-store' });
      const result = (await response.json()) as { success: boolean; data?: CouponRecord[] };
      if (result.success && result.data) setCoupons(result.data);
    } catch {
      toast({ variant: 'error', title: 'Gagal memuat kupon' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((coupon: CouponRecord) => {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: String(coupon.value),
      minOrder: String(coupon.minOrder),
      maxUses: coupon.maxUses === null ? '' : String(coupon.maxUses),
      usesPerCustomer: String(coupon.usesPerCustomer),
      active: coupon.active,
      startsAt: coupon.startsAt ?? '',
      expiresAt: coupon.expiresAt ?? '',
      applicableTiers: [...coupon.applicableTiers],
    });
    setModalOpen(true);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        code: form.code,
        type: form.type,
        value: Number(form.value),
        minOrder: Number(form.minOrder),
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        usesPerCustomer: Number(form.usesPerCustomer) || 1,
        active: form.active,
        startsAt: form.startsAt || null,
        expiresAt: form.expiresAt || null,
        applicableTiers: form.applicableTiers,
        applicablePackages: [],
      };
      const url = editingId ? `/api/admin/coupons/${editingId}` : '/api/admin/coupons';
      const response = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { success: boolean; message?: string };
      if (result.success) {
        toast({ variant: 'success', title: editingId ? 'Kupon diperbarui' : 'Kupon dibuat' });
        setModalOpen(false);
        await load();
      } else {
        toast({ variant: 'error', title: 'Gagal menyimpan', message: result.message });
      }
    } catch {
      toast({ variant: 'error', title: 'Jaringan bermasalah' });
    } finally {
      setSaving(false);
    }
  }, [editingId, form, load, toast]);

  const remove = useCallback(
    async (coupon: CouponRecord) => {
      if (!window.confirm(`Hapus kupon ${coupon.code}? Tindakan ini dicatat di Audit Log.`)) return;
      try {
        const response = await fetch(`/api/admin/coupons/${coupon.id}`, {
          method: 'DELETE',
          headers: { 'x-csrf-token': getCsrfToken() },
        });
        if (response.ok) {
          toast({ variant: 'success', title: 'Kupon dihapus' });
          await load();
        }
      } catch {
        toast({ variant: 'error', title: 'Jaringan bermasalah' });
      }
    },
    [load, toast],
  );

  const toggleTier = useCallback((tier: Tier) => {
    setForm((current) => ({
      ...current,
      applicableTiers: current.applicableTiers.includes(tier)
        ? current.applicableTiers.filter((t) => t !== tier)
        : [...current.applicableTiers, tier],
    }));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Buat Kupon
        </Button>
      </div>

      {loading ? (
        <LoadingState label="Memuat kupon…" />
      ) : coupons.length === 0 ? (
        <EmptyState title="Belum ada kupon" description="Buat kupon pertama Anda untuk promosi." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Kode</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Diskon</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Berlaku untuk</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Penggunaan</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Status</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Kedaluwarsa</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-text-primary">{coupon.code}</td>
                  <td className="px-4 py-3 text-xs">
                    {coupon.type === 'percentage' ? `${coupon.value}%` : formatRupiah(coupon.value)}
                    {coupon.minOrder > 0 ? <p className="text-text-muted">min {formatRupiah(coupon.minOrder)}</p> : null}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {coupon.applicableTiers.length > 0
                      ? coupon.applicableTiers.map((t) => TIER_LABELS[t]).join(', ')
                      : 'Semua tier'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {coupon.usedCount}
                    {coupon.maxUses !== null ? ` / ${coupon.maxUses}` : ''}
                    <p className="text-text-muted">maks {coupon.usesPerCustomer}×/pelanggan</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={coupon.active ? 'success' : 'neutral'}>{coupon.active ? 'Aktif' : 'Nonaktif'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">
                    {coupon.expiresAt ? formatDate(coupon.expiresAt) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => openEdit(coupon)}>
                        Edit
                      </Button>
                      <button
                        type="button"
                        onClick={() => void remove(coupon)}
                        aria-label={`Hapus kupon ${coupon.code}`}
                        className="rounded-md p-1.5 text-text-muted hover:bg-surface-muted hover:text-error"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Kupon' : 'Buat Kupon'}
        description="Validasi kupon selalu dilakukan server-side; nilai diskon tidak pernah berasal dari klien."
      >
        <div className="space-y-4">
          <Field label="Kode Kupon" required>
            <Input
              value={form.code}
              onChange={(e) => setForm((c) => ({ ...c, code: e.target.value.toUpperCase() }))}
              placeholder="WANGSTORE10"
              className="font-mono uppercase"
              maxLength={40}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Jenis Diskon" required>
              <Select
                value={form.type}
                onChange={(e) => setForm((c) => ({ ...c, type: e.target.value as 'percentage' | 'fixed' }))}
                options={[
                  { value: 'percentage', label: 'Persentase (%)' },
                  { value: 'fixed', label: 'Nominal (Rp)' },
                ]}
              />
            </Field>
            <Field label={form.type === 'percentage' ? 'Nilai (%)' : 'Nilai (Rp)'} required>
              <Input
                type="number"
                min={1}
                value={form.value}
                onChange={(e) => setForm((c) => ({ ...c, value: e.target.value }))}
                inputMode="numeric"
              />
            </Field>
            <Field label="Minimum Order (Rp)">
              <Input
                type="number"
                min={0}
                value={form.minOrder}
                onChange={(e) => setForm((c) => ({ ...c, minOrder: e.target.value }))}
                inputMode="numeric"
              />
            </Field>
            <Field label="Batas Total Penggunaan" hint="Kosongkan untuk tanpa batas.">
              <Input
                type="number"
                min={1}
                value={form.maxUses}
                onChange={(e) => setForm((c) => ({ ...c, maxUses: e.target.value }))}
                inputMode="numeric"
              />
            </Field>
            <Field label="Maksimum per Pelanggan" required>
              <Input
                type="number"
                min={1}
                value={form.usesPerCustomer}
                onChange={(e) => setForm((c) => ({ ...c, usesPerCustomer: e.target.value }))}
                inputMode="numeric"
              />
            </Field>
            <Field label="Berlaku Mulai" hint="Opsional (tanggal-waktu).">
              <Input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm((c) => ({ ...c, startsAt: e.target.value }))}
              />
            </Field>
            <Field label="Kedaluwarsa" hint="Opsional (tanggal-waktu).">
              <Input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm((c) => ({ ...c, expiresAt: e.target.value }))}
              />
            </Field>
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-text-primary">Berlaku untuk tier</legend>
            <div className="flex flex-wrap gap-4">
              {(['low', 'medium', 'high'] as Tier[]).map((tier) => (
                <Checkbox
                  key={tier}
                  checked={form.applicableTiers.includes(tier)}
                  onChange={() => toggleTier(tier)}
                  label={TIER_LABELS[tier]}
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-text-muted">Tidak dicentang = berlaku untuk semua tier.</p>
          </fieldset>
          <Checkbox
            checked={form.active}
            onChange={(e) => setForm((c) => ({ ...c, active: e.target.checked }))}
            label="Kupon aktif"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => void save()} loading={saving}>
              Simpan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

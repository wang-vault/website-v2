'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { EmptyState, LoadingState } from '@/components/ui/state';
import { useToast } from '@/components/ui/toast';
import { formatRupiah } from '@/lib/utils';
import type { VpsPackageRecord } from '@/types';

/**
 * Pengelolaan katalog paket VPS.
 * Mode baca-saja aktif untuk peran tanpa izin packages.manage (mis. Staff).
 */

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)ws_csrf=([^;]+)/);
  return match?.[1] ?? '';
}

interface VpsForm {
  id: string;
  label: string;
  description: string;
  vcpu: string;
  ramGb: string;
  storageGb: string;
  bandwidthTb: string;
  operatingSystems: string;
  locations: string;
  price: string;
  popular: boolean;
  active: boolean;
  sortOrder: string;
}

const EMPTY_FORM: VpsForm = {
  id: '',
  label: '',
  description: '',
  vcpu: '2',
  ramGb: '4',
  storageGb: '80',
  bandwidthTb: '4',
  operatingSystems: 'Ubuntu 24.04 LTS, Debian 12',
  locations: '',
  price: '175000',
  popular: false,
  active: true,
  sortOrder: '0',
};

function toList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function VpsPackagesManager({ readOnly = false }: { readOnly?: boolean }) {
  const { toast } = useToast();
  const [items, setItems] = useState<VpsPackageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VpsForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/vps-packages', { cache: 'no-store' });
      const result = (await response.json()) as { success: boolean; data?: VpsPackageRecord[] };
      if (result.success && result.data) setItems(result.data);
    } catch {
      toast({ variant: 'error', title: 'Gagal memuat paket VPS' });
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

  const openEdit = useCallback((pkg: VpsPackageRecord) => {
    setEditingId(pkg.id);
    setForm({
      id: pkg.id,
      label: pkg.label,
      description: pkg.description,
      vcpu: String(pkg.vcpu),
      ramGb: String(pkg.ramGb),
      storageGb: String(pkg.storageGb),
      bandwidthTb: String(pkg.bandwidthTb),
      operatingSystems: pkg.operatingSystems.join(', '),
      locations: pkg.locations.join(', '),
      price: String(pkg.price),
      popular: pkg.popular,
      active: pkg.active,
      sortOrder: String(pkg.sortOrder),
    });
    setModalOpen(true);
  }, []);

  const save = useCallback(async () => {
    if (readOnly) return;
    setSaving(true);
    try {
      const payload = {
        id: form.id.trim().toLowerCase(),
        label: form.label.trim(),
        description: form.description.trim(),
        vcpu: Number(form.vcpu) || 0,
        ramGb: Number(form.ramGb) || 0,
        storageGb: Number(form.storageGb) || 0,
        bandwidthTb: Number(form.bandwidthTb) || 0,
        operatingSystems: toList(form.operatingSystems),
        locations: toList(form.locations),
        price: Number(form.price) || 0,
        popular: form.popular,
        active: form.active,
        sortOrder: Number(form.sortOrder) || 0,
      };
      const url = editingId ? `/api/admin/vps-packages/${editingId}` : '/api/admin/vps-packages';
      const response = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { success: boolean; message?: string };
      if (result.success) {
        toast({ variant: 'success', title: 'Paket VPS disimpan' });
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
  }, [editingId, form, load, readOnly, toast]);

  const remove = useCallback(
    async (pkg: VpsPackageRecord) => {
      if (readOnly) return;
      if (!window.confirm(`Hapus paket VPS "${pkg.label}"? Tindakan dicatat di Audit Log.`)) return;
      try {
        const response = await fetch(`/api/admin/vps-packages/${pkg.id}`, {
          method: 'DELETE',
          headers: { 'x-csrf-token': getCsrfToken() },
        });
        if (response.ok) {
          toast({ variant: 'success', title: 'Paket VPS dihapus' });
          await load();
        }
      } catch {
        toast({ variant: 'error', title: 'Jaringan bermasalah' });
      }
    },
    [load, readOnly, toast],
  );

  if (loading) return <LoadingState label="Memuat paket VPS…" />;

  return (
    <div className="space-y-4">
      {readOnly ? (
        <Alert variant="info" title="Mode baca-saja">
          <p>
            Peran Anda dapat melihat katalog VPS sebagai rujukan saat melayani pelanggan, tetapi mengubah paket
            adalah wewenang Admin.
          </p>
        </Alert>
      ) : (
        <div className="flex justify-end">
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tambah Paket VPS
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          title="Belum ada paket VPS"
          description="Tambahkan paket VPS untuk mulai menjual layanan ini di halaman /vps."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Paket</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Spesifikasi</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Transfer</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Harga</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Status</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((pkg) => (
                <tr key={pkg.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-text-primary">{pkg.label}</p>
                    <p className="font-mono text-xs text-text-muted">{pkg.id}</p>
                    {pkg.popular ? <Badge variant="accent">Populer</Badge> : null}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {pkg.vcpu} vCPU / {pkg.ramGb} GB / {pkg.storageGb} GB
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {pkg.bandwidthTb > 0 ? `${pkg.bandwidthTb} TB/bln` : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{formatRupiah(pkg.price)}/bulan</td>
                  <td className="px-4 py-3">
                    <Badge variant={pkg.active ? 'success' : 'neutral'}>{pkg.active ? 'Aktif' : 'Nonaktif'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => openEdit(pkg)}>
                        {readOnly ? 'Lihat' : 'Edit'}
                      </Button>
                      {readOnly ? null : (
                        <button
                          type="button"
                          onClick={() => void remove(pkg)}
                          aria-label={`Hapus paket ${pkg.label}`}
                          className="rounded-md p-1.5 text-text-muted hover:bg-surface-muted hover:text-error"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs leading-relaxed text-text-muted">
        Paket aktif langsung tampil di halaman publik <span className="font-mono">/vps</span>. Harga final
        dihitung ulang server-side saat order dibuat — nilai dari browser tidak pernah dipercaya.
      </p>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={readOnly ? 'Detail Paket VPS' : editingId ? 'Edit Paket VPS' : 'Tambah Paket VPS'}
        description="Cantumkan hanya spesifikasi yang benar-benar tersedia."
        className="max-w-2xl"
      >
        <fieldset disabled={readOnly} className="m-0 space-y-4 border-0 p-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Id Paket" required hint="Contoh: vps-standard-2c4g">
              <Input
                value={form.id}
                onChange={(e) => setForm((c) => ({ ...c, id: e.target.value.toLowerCase() }))}
                className="font-mono"
                disabled={Boolean(editingId)}
              />
            </Field>
            <Field label="Label" required>
              <Input value={form.label} onChange={(e) => setForm((c) => ({ ...c, label: e.target.value }))} />
            </Field>
          </div>
          <Field label="Deskripsi Singkat" hint="Ditampilkan pada kartu paket di halaman /vps.">
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="vCPU" required>
              <Input type="number" value={form.vcpu} onChange={(e) => setForm((c) => ({ ...c, vcpu: e.target.value }))} />
            </Field>
            <Field label="RAM (GB)" required>
              <Input type="number" value={form.ramGb} onChange={(e) => setForm((c) => ({ ...c, ramGb: e.target.value }))} />
            </Field>
            <Field label="Penyimpanan (GB)" required>
              <Input
                type="number"
                value={form.storageGb}
                onChange={(e) => setForm((c) => ({ ...c, storageGb: e.target.value }))}
              />
            </Field>
            <Field label="Transfer Data (TB/bulan)" hint="Isi 0 bila tidak dicantumkan.">
              <Input
                type="number"
                value={form.bandwidthTb}
                onChange={(e) => setForm((c) => ({ ...c, bandwidthTb: e.target.value }))}
              />
            </Field>
            <Field label="Harga per Bulan (Rp)" required>
              <Input type="number" value={form.price} onChange={(e) => setForm((c) => ({ ...c, price: e.target.value }))} />
            </Field>
            <Field label="Urutan Tampil">
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((c) => ({ ...c, sortOrder: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="Sistem Operasi" hint="Pisahkan dengan koma. Kosongkan bila belum ditentukan.">
            <Input
              value={form.operatingSystems}
              onChange={(e) => setForm((c) => ({ ...c, operatingSystems: e.target.value }))}
            />
          </Field>
          <Field label="Lokasi" hint="Pisahkan dengan koma. Cantumkan hanya lokasi yang benar-benar tersedia.">
            <Input value={form.locations} onChange={(e) => setForm((c) => ({ ...c, locations: e.target.value }))} />
          </Field>
          <div className="flex flex-wrap gap-6">
            <Checkbox
              checked={form.popular}
              onChange={(e) => setForm((c) => ({ ...c, popular: e.target.checked }))}
              label="Tandai Populer"
            />
            <Checkbox
              checked={form.active}
              onChange={(e) => setForm((c) => ({ ...c, active: e.target.checked }))}
              label="Aktif (tampil di halaman publik)"
            />
          </div>
        </fieldset>
        <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="ghost" onClick={() => setModalOpen(false)}>
            {readOnly ? 'Tutup' : 'Batal'}
          </Button>
          {readOnly ? null : (
            <Button onClick={() => void save()} loading={saving}>
              Simpan
            </Button>
          )}
        </div>
      </Modal>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Tabs } from '@/components/ui/tabs';
import { EmptyState, LoadingState } from '@/components/ui/state';
import { useToast } from '@/components/ui/toast';
import { formatRupiah } from '@/lib/utils';
import { CATALOG_LABELS, TIER_LABELS } from '@/types';
import type { CatalogKey, PackageRecord, ProductRecord, Tier } from '@/types';

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)ws_csrf=([^;]+)/);
  return match?.[1] ?? '';
}

interface ProductForm {
  slug: string;
  name: string;
  description: string;
  tier: Tier;
  /** '' = entri informasional tanpa katalog yang dijual. */
  catalogKey: CatalogKey | '';
  status: 'active' | 'inactive';
  visibility: 'public' | 'hidden';
  sortOrder: string;
}

const EMPTY_PRODUCT: ProductForm = {
  slug: '',
  name: '',
  description: '',
  tier: 'low',
  catalogKey: '',
  status: 'active',
  visibility: 'public',
  sortOrder: '0',
};

interface PackageForm {
  id: string;
  label: string;
  tier: 'medium' | 'high';
  cpu: string;
  ramGb: string;
  storageGb: string;
  price: string;
  popular: boolean;
  active: boolean;
  sortOrder: string;
}

const EMPTY_PACKAGE: PackageForm = {
  id: '',
  label: '',
  tier: 'high',
  cpu: '4',
  ramGb: '8',
  storageGb: '50',
  price: '600000',
  popular: false,
  active: true,
  sortOrder: '0',
};

/** Mode baca-saja aktif untuk peran tanpa izin products.manage (mis. Staff). */
export function ProductsManager({ readOnly = false }: { readOnly?: boolean }) {
  const { toast } = useToast();
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [productModal, setProductModal] = useState(false);
  const [productForm, setProductForm] = useState<ProductForm>(EMPTY_PRODUCT);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [packageModal, setPackageModal] = useState(false);
  const [packageForm, setPackageForm] = useState<PackageForm>(EMPTY_PACKAGE);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [productsResponse, packagesResponse] = await Promise.all([
        fetch('/api/admin/products', { cache: 'no-store' }),
        fetch('/api/admin/packages', { cache: 'no-store' }),
      ]);
      const productsResult = (await productsResponse.json()) as { success: boolean; data?: ProductRecord[] };
      const packagesResult = (await packagesResponse.json()) as { success: boolean; data?: PackageRecord[] };
      if (productsResult.success && productsResult.data) setProducts(productsResult.data);
      if (packagesResult.success && packagesResult.data) setPackages(packagesResult.data);
    } catch {
      toast({ variant: 'error', title: 'Gagal memuat data' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveProduct = useCallback(async () => {
    if (readOnly) return;
    setSaving(true);
    try {
      const payload = {
        ...productForm,
        catalogKey: productForm.catalogKey === '' ? null : productForm.catalogKey,
        sortOrder: Number(productForm.sortOrder) || 0,
        packageId: null,
        price: null,
        metadata: {},
      };
      const url = editingProductId ? `/api/admin/products/${editingProductId}` : '/api/admin/products';
      const response = await fetch(url, {
        method: editingProductId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { success: boolean; message?: string };
      if (result.success) {
        toast({ variant: 'success', title: 'Produk disimpan' });
        setProductModal(false);
        await load();
      } else {
        toast({ variant: 'error', title: 'Gagal', message: result.message });
      }
    } catch {
      toast({ variant: 'error', title: 'Jaringan bermasalah' });
    } finally {
      setSaving(false);
    }
  }, [editingProductId, load, productForm, readOnly, toast]);

  const deleteProduct = useCallback(
    async (product: ProductRecord) => {
      if (readOnly) return;
      if (!window.confirm(`Hapus produk "${product.name}"?`)) return;
      try {
        await fetch(`/api/admin/products/${product.id}`, {
          method: 'DELETE',
          headers: { 'x-csrf-token': getCsrfToken() },
        });
        toast({ variant: 'success', title: 'Produk dihapus' });
        await load();
      } catch {
        toast({ variant: 'error', title: 'Jaringan bermasalah' });
      }
    },
    [load, readOnly, toast],
  );

  const savePackage = useCallback(async () => {
    if (readOnly) return;
    setSaving(true);
    try {
      const payload = {
        ...packageForm,
        cpu: Number(packageForm.cpu),
        ramGb: Number(packageForm.ramGb),
        storageGb: Number(packageForm.storageGb),
        price: Number(packageForm.price),
        sortOrder: Number(packageForm.sortOrder) || 0,
      };
      const url = editingPackageId ? `/api/admin/packages/${editingPackageId}` : '/api/admin/packages';
      const response = await fetch(url, {
        method: editingPackageId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { success: boolean; message?: string };
      if (result.success) {
        toast({ variant: 'success', title: 'Paket disimpan' });
        setPackageModal(false);
        await load();
      } else {
        toast({ variant: 'error', title: 'Gagal', message: result.message });
      }
    } catch {
      toast({ variant: 'error', title: 'Jaringan bermasalah' });
    } finally {
      setSaving(false);
    }
  }, [editingPackageId, load, packageForm, readOnly, toast]);

  const deletePackage = useCallback(
    async (pkg: PackageRecord) => {
      if (readOnly) return;
      if (!window.confirm(`Hapus paket "${pkg.id}"?`)) return;
      try {
        await fetch(`/api/admin/packages/${pkg.id}`, {
          method: 'DELETE',
          headers: { 'x-csrf-token': getCsrfToken() },
        });
        toast({ variant: 'success', title: 'Paket dihapus' });
        await load();
      } catch {
        toast({ variant: 'error', title: 'Jaringan bermasalah' });
      }
    },
    [load, readOnly, toast],
  );

  const productTab = (
    <div className="space-y-4">
      {readOnly ? (
        <Alert variant="info" title="Mode baca-saja">
          <p>
            Peran Anda dapat melihat katalog produk sebagai rujukan, tetapi menambah, mengubah, dan menghapus
            produk adalah wewenang Admin.
          </p>
        </Alert>
      ) : (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setEditingProductId(null);
              setProductForm(EMPTY_PRODUCT);
              setProductModal(true);
            }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tambah Produk
          </Button>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted">
              <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Nama</th>
              <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Tier</th>
              <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Status</th>
              <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Visibilitas</th>
              <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-border last:border-b-0">
                <td className="px-4 py-3">
                  <p className="text-xs font-medium text-text-primary">{product.name}</p>
                  <p className="font-mono text-xs text-text-muted">{product.slug}</p>
                </td>
                <td className="px-4 py-3 text-xs">
                  <Badge variant={product.tier === 'medium' ? 'warning' : 'neutral'}>{TIER_LABELS[product.tier]}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={product.status === 'active' ? 'success' : 'neutral'}>
                    {product.status === 'active' ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs">{product.visibility === 'public' ? 'Publik' : 'Tersembunyi'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingProductId(product.id);
                        setProductForm({
                          slug: product.slug,
                          name: product.name,
                          description: product.description,
                          tier: product.tier,
                          catalogKey: product.catalogKey ?? '',
                          status: product.status,
                          visibility: product.visibility,
                          sortOrder: String(product.sortOrder),
                        });
                        setProductModal(true);
                      }}
                    >
                      {readOnly ? 'Lihat' : 'Edit'}
                    </Button>
                    {readOnly ? null : (
                      <button
                        type="button"
                        onClick={() => void deleteProduct(product)}
                        aria-label={`Hapus produk ${product.name}`}
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
    </div>
  );

  const packageTab = (
    <div className="space-y-4">
      {readOnly ? (
        <Alert variant="info" title="Mode baca-saja">
          <p>
            Peran Anda dapat melihat daftar paket dan harganya, tetapi mengubah paket adalah wewenang Admin.
          </p>
        </Alert>
      ) : (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setEditingPackageId(null);
              setPackageForm(EMPTY_PACKAGE);
              setPackageModal(true);
            }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tambah Paket
          </Button>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted">
              <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Paket</th>
              <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Tier</th>
              <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">CPU / RAM / Storage</th>
              <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Harga</th>
              <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Status</th>
              <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg) => (
              <tr key={pkg.id} className="border-b border-border last:border-b-0">
                <td className="px-4 py-3">
                  <p className="font-mono text-xs font-semibold text-text-primary">{pkg.id}</p>
                  {pkg.popular ? <Badge variant="accent">Populer</Badge> : null}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="neutral">{TIER_LABELS[pkg.tier]}</Badge>
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {pkg.cpu} vCore / {pkg.ramGb} GB / {pkg.storageGb} GB
                </td>
                <td className="px-4 py-3 font-mono text-xs font-semibold">{formatRupiah(pkg.price)}/bulan</td>
                <td className="px-4 py-3">
                  <Badge variant={pkg.active ? 'success' : 'neutral'}>{pkg.active ? 'Aktif' : 'Nonaktif'}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingPackageId(pkg.id);
                        setPackageForm({
                          id: pkg.id,
                          label: pkg.label,
                          tier: pkg.tier === 'medium' ? 'medium' : 'high',
                          cpu: String(pkg.cpu),
                          ramGb: String(pkg.ramGb),
                          storageGb: String(pkg.storageGb),
                          price: String(pkg.price),
                          popular: pkg.popular,
                          active: pkg.active,
                          sortOrder: String(pkg.sortOrder),
                        });
                        setPackageModal(true);
                      }}
                    >
                      {readOnly ? 'Lihat' : 'Edit'}
                    </Button>
                    {readOnly ? null : (
                      <button
                        type="button"
                        onClick={() => void deletePackage(pkg)}
                        aria-label={`Hapus paket ${pkg.id}`}
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
      <p className="text-xs text-text-muted">
        Harga paket Medium & High bersifat final. Perubahan harga berlaku untuk order baru; order lama tidak berubah.
      </p>
    </div>
  );

  if (loading) return <LoadingState label="Memuat data…" />;

  return (
    <div>
      <Tabs
        items={[
          { key: 'products', label: `Produk (${products.length})`, content: productTab },
          { key: 'packages', label: `Paket Minecraft (${packages.length})`, content: packageTab },
        ]}
      />

      <Modal
        open={productModal}
        onClose={() => setProductModal(false)}
        title={readOnly ? 'Detail Produk' : editingProductId ? 'Edit Produk' : 'Tambah Produk'}
        description="Katalog produk ditampilkan di beranda dan dipakai Server Builder."
      >
        <fieldset disabled={readOnly} className="m-0 space-y-4 border-0 p-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama" required>
              <Input
                value={productForm.name}
                onChange={(e) => setProductForm((c) => ({ ...c, name: e.target.value }))}
              />
            </Field>
            <Field label="Slug" required>
              <Input
                value={productForm.slug}
                onChange={(e) => setProductForm((c) => ({ ...c, slug: e.target.value.toLowerCase() }))}
                className="font-mono"
              />
            </Field>
          </div>
          <Field label="Deskripsi" required>
            <Textarea
              value={productForm.description}
              onChange={(e) => setProductForm((c) => ({ ...c, description: e.target.value }))}
              rows={3}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Katalog yang Dijual"
              hint="Menentukan badge ketersediaan dan tautan pemesanan di beranda."
            >
              <Select
                value={productForm.catalogKey}
                onChange={(e) =>
                  setProductForm((c) => ({ ...c, catalogKey: e.target.value as CatalogKey | '' }))
                }
                options={[
                  { value: '', label: 'Tidak dijual (informasional)' },
                  ...(['low', 'medium', 'high', 'vps'] as CatalogKey[]).map((key) => ({
                    value: key,
                    label: CATALOG_LABELS[key],
                  })),
                ]}
              />
            </Field>
            <Field label="Tier">
              <Select
                value={productForm.tier}
                onChange={(e) => setProductForm((c) => ({ ...c, tier: e.target.value as Tier }))}
                options={(['low', 'medium', 'high'] as Tier[]).map((t) => ({ value: t, label: TIER_LABELS[t] }))}
              />
            </Field>
            <Field label="Status">
              <Select
                value={productForm.status}
                onChange={(e) => setProductForm((c) => ({ ...c, status: e.target.value as 'active' | 'inactive' }))}
                options={[
                  { value: 'active', label: 'Aktif' },
                  { value: 'inactive', label: 'Nonaktif' },
                ]}
              />
            </Field>
            <Field label="Visibilitas">
              <Select
                value={productForm.visibility}
                onChange={(e) => setProductForm((c) => ({ ...c, visibility: e.target.value as 'public' | 'hidden' }))}
                options={[
                  { value: 'public', label: 'Publik' },
                  { value: 'hidden', label: 'Tersembunyi' },
                ]}
              />
            </Field>
          </div>
          <Field label="Urutan Tampil">
            <Input
              type="number"
              value={productForm.sortOrder}
              onChange={(e) => setProductForm((c) => ({ ...c, sortOrder: e.target.value }))}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setProductModal(false)}>
              {readOnly ? 'Tutup' : 'Batal'}
            </Button>
            {readOnly ? null : (
              <Button onClick={() => void saveProduct()} loading={saving}>
                Simpan
              </Button>
            )}
          </div>
        </fieldset>
      </Modal>

      <Modal
        open={packageModal}
        onClose={() => setPackageModal(false)}
        title={readOnly ? 'Detail Paket' : editingPackageId ? 'Edit Paket' : 'Tambah Paket'}
        description="Paket tetap tier Medium atau High dengan harga final."
      >
        <fieldset disabled={readOnly} className="m-0 space-y-4 border-0 p-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Id Paket" required hint="Contoh: high-4c8g">
              <Input
                value={packageForm.id}
                onChange={(e) => setPackageForm((c) => ({ ...c, id: e.target.value.toLowerCase() }))}
                className="font-mono"
                disabled={Boolean(editingPackageId)}
              />
            </Field>
            <Field label="Label" required>
              <Input
                value={packageForm.label}
                onChange={(e) => setPackageForm((c) => ({ ...c, label: e.target.value }))}
              />
            </Field>
            <Field label="Tier" required hint="Tier Low memakai konfigurasi custom, bukan paket tetap.">
              <Select
                value={packageForm.tier}
                onChange={(e) => setPackageForm((c) => ({ ...c, tier: e.target.value as 'medium' | 'high' }))}
                options={[
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                ]}
              />
            </Field>
            <Field label="CPU (vCore)" required>
              <Input
                type="number"
                value={packageForm.cpu}
                onChange={(e) => setPackageForm((c) => ({ ...c, cpu: e.target.value }))}
              />
            </Field>
            <Field label="RAM (GB)" required>
              <Input
                type="number"
                value={packageForm.ramGb}
                onChange={(e) => setPackageForm((c) => ({ ...c, ramGb: e.target.value }))}
              />
            </Field>
            <Field label="Penyimpanan (GB)" required>
              <Input
                type="number"
                value={packageForm.storageGb}
                onChange={(e) => setPackageForm((c) => ({ ...c, storageGb: e.target.value }))}
              />
            </Field>
            <Field label="Harga per Bulan (Rp)" required>
              <Input
                type="number"
                value={packageForm.price}
                onChange={(e) => setPackageForm((c) => ({ ...c, price: e.target.value }))}
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-6">
            <Checkbox
              checked={packageForm.popular}
              onChange={(e) => setPackageForm((c) => ({ ...c, popular: e.target.checked }))}
              label="Tandai Populer"
            />
            <Checkbox
              checked={packageForm.active}
              onChange={(e) => setPackageForm((c) => ({ ...c, active: e.target.checked }))}
              label="Aktif"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setPackageModal(false)}>
              {readOnly ? 'Tutup' : 'Batal'}
            </Button>
            {readOnly ? null : (
              <Button onClick={() => void savePackage()} loading={saving}>
                Simpan
              </Button>
            )}
          </div>
        </fieldset>
      </Modal>

      {products.length === 0 && packages.length === 0 ? (
        <EmptyState title="Belum ada produk" description="Tambahkan produk dan paket untuk katalog Anda." />
      ) : null}
    </div>
  );
}

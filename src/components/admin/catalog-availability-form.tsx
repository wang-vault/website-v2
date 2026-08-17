'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, Select } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { CATALOG_LABELS, TIER_STATUS_LABELS } from '@/types';
import type { CatalogKey, TierStatus } from '@/types';

/**
 * Pengaturan ketersediaan katalog (tier Minecraft + VPS).
 *
 * Status ini bukan sekadar label: server menolak pembuatan order untuk katalog
 * yang tidak berstatus "Tersedia" (HTTP 409), sehingga mengubahnya di sini
 * benar-benar membuka atau menutup penjualan layanan tersebut.
 */

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)ws_csrf=([^;]+)/);
  return match?.[1] ?? '';
}

const KEYS: CatalogKey[] = ['low', 'medium', 'high', 'vps'];
const STATUSES: TierStatus[] = ['available', 'ongoing', 'unavailable'];

const DESCRIPTIONS: Record<CatalogKey, string> = {
  low: 'Konfigurasi custom Minecraft (CPU, RAM, penyimpanan) dengan formula harga.',
  medium: 'Paket tetap Minecraft kelas menengah.',
  high: 'Paket tetap Minecraft performa tinggi.',
  vps: 'Katalog paket VPS pada halaman /vps.',
};

export function CatalogAvailabilityForm({
  initial,
  readOnly = false,
}: {
  initial: Record<CatalogKey, TierStatus>;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<Record<CatalogKey, TierStatus>>(initial);
  const [saving, setSaving] = useState(false);

  const save = useCallback(async () => {
    if (readOnly) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify({ catalogStatus: status }),
      });
      const result = (await response.json()) as { success: boolean; message?: string };
      if (result.success) {
        toast({ variant: 'success', title: 'Ketersediaan layanan diperbarui' });
        router.refresh();
      } else {
        toast({ variant: 'error', title: 'Gagal menyimpan', message: result.message });
      }
    } catch {
      toast({ variant: 'error', title: 'Jaringan bermasalah' });
    } finally {
      setSaving(false);
    }
  }, [readOnly, router, status, toast]);

  return (
    <div className="space-y-4">
      {readOnly ? (
        <Alert variant="info" title="Mode baca-saja">
          <p>Peran Anda dapat melihat status katalog, tetapi mengubah ketersediaan adalah wewenang Admin.</p>
        </Alert>
      ) : (
        <Alert variant="info" title="Status ini menentukan bisa-tidaknya dipesan">
          <p>
            Hanya katalog berstatus <strong>Tersedia</strong> yang dapat dipesan. Status{' '}
            <strong>Sedang Disiapkan</strong> tetap ditampilkan ke pengunjung dengan keterangan jujur, sedangkan{' '}
            <strong>Tidak Tersedia</strong> menutup pemesanan. Server memverifikasi ulang status ini saat order
            dibuat.
          </p>
        </Alert>
      )}

      <fieldset disabled={readOnly} className="m-0 grid gap-4 border-0 p-0 sm:grid-cols-2">
        {KEYS.map((key) => (
          <div key={key} className="rounded-lg border border-border bg-surface p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-text-primary">{CATALOG_LABELS[key]}</p>
              <Badge
                variant={
                  status[key] === 'available' ? 'success' : status[key] === 'ongoing' ? 'warning' : 'neutral'
                }
              >
                {TIER_STATUS_LABELS[status[key]]}
              </Badge>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-text-secondary">{DESCRIPTIONS[key]}</p>
            <Field label="Status">
              <Select
                value={status[key]}
                onChange={(e) => setStatus((current) => ({ ...current, [key]: e.target.value as TierStatus }))}
                options={STATUSES.map((value) => ({ value, label: TIER_STATUS_LABELS[value] }))}
                aria-label={`Status ${CATALOG_LABELS[key]}`}
              />
            </Field>
          </div>
        ))}
      </fieldset>

      {readOnly ? null : (
        <div className="flex gap-3">
          <Button onClick={() => void save()} loading={saving}>
            Simpan Ketersediaan
          </Button>
        </div>
      )}
    </div>
  );
}

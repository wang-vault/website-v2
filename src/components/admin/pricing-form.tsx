'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { useToast } from '@/components/ui/toast';
import { formatRupiah } from '@/lib/utils';

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)ws_csrf=([^;]+)/);
  return match?.[1] ?? '';
}

export interface PricingFormValues {
  base: number;
  perCore: number;
  perGbRam: number;
  perGbStorage: number;
  roundTo: number;
  minPrice: number;
}

const FIELDS: { key: keyof PricingFormValues; label: string; hint: string }[] = [
  { key: 'base', label: 'Biaya Dasar (Rp)', hint: 'Ditambahkan ke setiap konfigurasi Low.' },
  { key: 'perCore', label: 'Harga per vCore (Rp)', hint: 'Dikalikan jumlah CPU.' },
  { key: 'perGbRam', label: 'Harga per GB RAM (Rp)', hint: 'Dikalikan kapasitas RAM.' },
  { key: 'perGbStorage', label: 'Harga per GB Penyimpanan (Rp)', hint: 'Dikalikan kapasitas penyimpanan.' },
  { key: 'roundTo', label: 'Pembulatan (Rp)', hint: 'Harga dibulatkan ke kelipatan ini.' },
  { key: 'minPrice', label: 'Harga Minimum (Rp)', hint: 'Harga tidak akan berada di bawah nilai ini.' },
];

export interface PricingFormProps {
  initial: PricingFormValues;
  defaultPricing: PricingFormValues;
  /** Mode baca-saja untuk peran tanpa izin pricing.manage (mis. Staff). */
  readOnly?: boolean;
}

export function PricingForm({ initial, defaultPricing, readOnly = false }: PricingFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<PricingFormValues>(initial);
  const [saving, setSaving] = useState(false);

  const update = useCallback((field: keyof PricingFormValues, value: string) => {
    const parsed = Number(value);
    setForm((current) => ({ ...current, [field]: Number.isFinite(parsed) ? parsed : 0 }));
  }, []);

  const examplePrice = form.base + 2 * form.perCore + 4 * form.perGbRam + 20 * form.perGbStorage;

  const save = useCallback(async () => {
    if (readOnly) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as { success: boolean; message?: string };
      if (result.success) {
        toast({ variant: 'success', title: 'Formula harga diperbarui' });
        router.refresh();
      } else {
        toast({ variant: 'error', title: 'Gagal menyimpan', message: result.message });
      }
    } catch {
      toast({ variant: 'error', title: 'Jaringan bermasalah' });
    } finally {
      setSaving(false);
    }
  }, [form, readOnly, router, toast]);

  const reset = useCallback(() => setForm(defaultPricing), [defaultPricing]);

  return (
    <div className="space-y-6">
      {readOnly ? (
        <Alert variant="info" title="Mode baca-saja">
          <p>
            Peran Anda dapat melihat formula harga agar dapat menjelaskan perhitungan kepada pelanggan, tetapi
            mengubah formula adalah wewenang Admin.
          </p>
        </Alert>
      ) : (
        <Alert variant="info" title="Formula ini dipakai oleh UI dan API">
          <p>
            Server Builder dan API pemesanan mengimpor modul pricing yang sama. Perubahan di sini langsung berlaku
            untuk perhitungan harga berikutnya dan dicatat di Audit Log.
          </p>
        </Alert>
      )}

      <fieldset disabled={readOnly} className="m-0 grid gap-4 border-0 p-0 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <Field key={field.key} label={field.label} hint={field.hint}>
            <Input
              type="number"
              min={0}
              value={String(form[field.key])}
              onChange={(e) => update(field.key, e.target.value)}
              inputMode="numeric"
            />
          </Field>
        ))}
      </fieldset>

      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <Calculator className="h-4 w-4 text-text-muted" aria-hidden="true" />
          Contoh harga minimum (2 vCore / 4 GB / 20 GB):
        </p>
        <p className="mt-1 font-mono text-lg font-semibold text-text-primary">
          {formatRupiah(Math.max(examplePrice, form.minPrice))}/bulan
        </p>
        <p className="mt-1 text-xs text-text-muted">
          Harga minimum yang berlaku saat ini: {formatRupiah(form.minPrice)}. Konfigurasi minimum menghasilkan
          tepat {formatRupiah(form.minPrice)}/bulan.
        </p>
      </div>

      {readOnly ? null : (
        <div className="flex gap-3">
          <Button onClick={() => void save()} loading={saving}>
            Simpan Formula
          </Button>
          <Button variant="outline" onClick={reset}>
            Kembalikan ke Default
          </Button>
        </div>
      )}
    </div>
  );
}

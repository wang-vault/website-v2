'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Cpu, HardDrive, MemoryStick, Network, ShoppingCart, Sparkles } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Textarea } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/state';
import { useToast } from '@/components/ui/toast';
import { formatRupiah, formatRupiahPerMonth } from '@/lib/utils';
import { ORDER_AGREEMENT, PURCHASE_WARNING } from '@/lib/whatsapp';
import { TIER_STATUS_LABELS } from '@/types';
import type { TierStatus, VpsPackageRecord } from '@/types';

/**
 * Katalog & pemesanan VPS.
 *
 * Alur pemesanan identik dengan Minecraft Hosting: order dibuat lewat
 * POST /api/orders (service: 'vps'), harga dihitung ulang server-side dari
 * katalog, lalu pelanggan diarahkan ke halaman konfirmasi order.
 */

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)ws_csrf=([^;]+)/);
  return match?.[1] ?? '';
}

export interface VpsSession {
  email: string;
  fullName: string;
  whatsapp: string;
}

interface OrderFormState {
  customerName: string;
  customerWhatsapp: string;
  customerEmail: string;
  serverName: string;
  notes: string;
  couponCode: string;
  agreeTerms: boolean;
}

export function VpsCatalog({
  packages,
  status,
  session,
  turnstileSiteKey,
}: {
  packages: VpsPackageRecord[];
  status: TierStatus;
  session: VpsSession | null;
  turnstileSiteKey: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const orderable = status === 'available';
  const [packageId, setPackageId] = useState<string | null>(packages[0]?.id ?? null);
  const [form, setForm] = useState<OrderFormState>({
    customerName: session?.fullName ?? '',
    customerWhatsapp: session?.whatsapp ?? '',
    customerEmail: session?.email ?? '',
    serverName: '',
    notes: '',
    couponCode: '',
    agreeTerms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [coupon, setCoupon] = useState<{ status: 'idle' | 'checking' | 'valid' | 'invalid'; message: string; discount: number }>({
    status: 'idle',
    message: '',
    discount: 0,
  });

  const selected = useMemo(() => packages.find((pkg) => pkg.id === packageId) ?? null, [packages, packageId]);
  const price = selected?.price ?? 0;
  const total = Math.max(price - (coupon.status === 'valid' ? coupon.discount : 0), 0);

  const update = useCallback((field: keyof OrderFormState, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const validateCoupon = useCallback(async () => {
    const code = form.couponCode.trim();
    if (!code || !selected) {
      setCoupon({ status: 'idle', message: '', discount: 0 });
      return;
    }
    setCoupon({ status: 'checking', message: '', discount: 0 });
    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Layanan VPS tidak memiliki tier — kupon bertarget tier tidak berlaku.
        body: JSON.stringify({ code, tier: null, packageId: selected.id, subtotal: price }),
      });
      const result = (await response.json()) as { success: boolean; message: string; data?: { discount: number } | null };
      if (result.success && result.data) {
        setCoupon({
          status: 'valid',
          message: `Kupon berlaku. Potongan ${formatRupiah(result.data.discount)}.`,
          discount: result.data.discount,
        });
      } else {
        setCoupon({ status: 'invalid', message: result.message, discount: 0 });
      }
    } catch {
      setCoupon({ status: 'invalid', message: 'Tidak dapat memvalidasi kupon. Coba lagi.', discount: 0 });
    }
  }, [form.couponCode, price, selected]);

  const submitOrder = useCallback(async () => {
    const nextErrors: Record<string, string> = {};
    if (!selected) nextErrors.packageId = 'Pilih paket VPS terlebih dahulu.';
    if (form.customerName.trim().length < 2) nextErrors.customerName = 'Nama minimal 2 karakter.';
    if (!/^\+?[0-9]{7,20}$/.test(form.customerWhatsapp.trim())) {
      nextErrors.customerWhatsapp = 'Format nomor WhatsApp tidak valid. Contoh: 6281234567890';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail.trim())) {
      nextErrors.customerEmail = 'Format email tidak valid.';
    }
    if (form.serverName.trim().length < 2) nextErrors.serverName = 'Hostname minimal 2 karakter.';
    if (!form.agreeTerms) nextErrors.agreeTerms = 'Anda harus menyetujui kebijakan sebelum memesan.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !selected) return;

    setSubmitting(true);
    try {
      let turnstileToken: string | null = null;
      if (turnstileSiteKey && typeof window !== 'undefined' && 'turnstile' in window) {
        turnstileToken =
          (window as unknown as { turnstile?: { getResponse: () => string } }).turnstile?.getResponse() ?? '';
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify({
          customerName: form.customerName.trim(),
          customerWhatsapp: form.customerWhatsapp.trim(),
          customerEmail: form.customerEmail.trim(),
          serverName: form.serverName.trim(),
          notes: form.notes.trim(),
          couponCode: form.couponCode.trim(),
          service: 'vps',
          packageId: selected.id,
          agreeTerms: true,
          turnstileToken,
        }),
      });
      const result = (await response.json()) as {
        success: boolean;
        message: string;
        data?: { order: { id: string }; accessToken: string } | null;
      };
      if (result.success && result.data) {
        toast({ variant: 'success', title: 'Order dibuat', message: `Order ${result.data.order.id} berhasil dibuat.` });
        router.push(`/order/${result.data.order.id}?token=${encodeURIComponent(result.data.accessToken)}`);
        return;
      }
      toast({ variant: 'error', title: 'Order gagal', message: result.message });
    } catch {
      toast({ variant: 'error', title: 'Jaringan bermasalah', message: 'Order tidak terkirim. Coba lagi.' });
    } finally {
      setSubmitting(false);
    }
  }, [form, router, selected, toast, turnstileSiteKey]);

  if (packages.length === 0) {
    return (
      <EmptyState
        title="Belum ada paket VPS"
        description="Katalog VPS belum dipublikasikan. Silakan cek kembali nanti atau hubungi tim WangStore."
      />
    );
  }

  return (
    <div className="space-y-8">
      {orderable ? null : (
        <Alert variant="warning" title={`VPS — ${TIER_STATUS_LABELS[status]}`}>
          <p>
            {status === 'ongoing'
              ? 'Layanan VPS sedang dipersiapkan. Spesifikasi dan harga di bawah dapat dilihat, tetapi pemesanan belum dibuka.'
              : 'Layanan VPS sedang tidak tersedia untuk dipesan.'}
          </p>
        </Alert>
      )}

      <section aria-labelledby="paket-vps">
        <h2 id="paket-vps" className="mb-3 text-base font-semibold text-text-primary">
          Pilih Paket VPS
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {packages.map((pkg) => {
            const isSelected = packageId === pkg.id;
            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => setPackageId(pkg.id)}
                aria-pressed={isSelected}
                className={
                  isSelected
                    ? 'relative rounded-lg border-2 border-accent bg-surface p-4 text-left'
                    : 'relative rounded-lg border border-border bg-surface p-4 text-left hover:border-text-muted'
                }
              >
                {pkg.popular ? (
                  <Badge variant="accent" className="absolute -top-2.5 right-3">
                    <Sparkles className="h-3 w-3" aria-hidden="true" /> Populer
                  </Badge>
                ) : null}
                <p className="text-sm font-semibold text-text-primary">{pkg.label}</p>
                {pkg.description ? (
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">{pkg.description}</p>
                ) : null}
                <ul className="mt-3 space-y-1.5 text-sm text-text-secondary">
                  <li className="flex items-center justify-between gap-4">
                    <span className="inline-flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5" aria-hidden="true" /> vCPU
                    </span>
                    <span className="font-mono text-text-primary">{pkg.vcpu}</span>
                  </li>
                  <li className="flex items-center justify-between gap-4">
                    <span className="inline-flex items-center gap-1.5">
                      <MemoryStick className="h-3.5 w-3.5" aria-hidden="true" /> RAM
                    </span>
                    <span className="font-mono text-text-primary">{pkg.ramGb} GB</span>
                  </li>
                  <li className="flex items-center justify-between gap-4">
                    <span className="inline-flex items-center gap-1.5">
                      <HardDrive className="h-3.5 w-3.5" aria-hidden="true" /> Penyimpanan
                    </span>
                    <span className="font-mono text-text-primary">{pkg.storageGb} GB</span>
                  </li>
                  {pkg.bandwidthTb > 0 ? (
                    <li className="flex items-center justify-between gap-4">
                      <span className="inline-flex items-center gap-1.5">
                        <Network className="h-3.5 w-3.5" aria-hidden="true" /> Transfer
                      </span>
                      <span className="font-mono text-text-primary">{pkg.bandwidthTb} TB/bln</span>
                    </li>
                  ) : null}
                </ul>
                {pkg.renewable ? null : (
                  <p className="mt-3 inline-flex rounded-md border border-warning/30 bg-warning/5 px-2 py-1 text-xs text-warning">
                    Tanpa perpanjangan — layanan berhenti di akhir masa aktif
                  </p>
                )}
                {pkg.operatingSystems.length > 0 ? (
                  <p className="mt-3 text-xs text-text-muted">OS: {pkg.operatingSystems.join(', ')}</p>
                ) : null}
                {pkg.locations.length > 0 ? (
                  <p className="mt-1 text-xs text-text-muted">Lokasi: {pkg.locations.join(', ')}</p>
                ) : null}
                <p className="mt-3 border-t border-border pt-3 font-mono text-base font-semibold text-text-primary">
                  {formatRupiahPerMonth(pkg.price)}
                </p>
                {isSelected ? (
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-success">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" /> Dipilih
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        {errors.packageId ? (
          <p role="alert" className="mt-2 text-xs font-medium text-error">
            {errors.packageId}
          </p>
        ) : null}
      </section>

      {orderable ? (
        <section aria-labelledby="pesan-vps" className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4 rounded-lg border border-border bg-surface p-5">
            <h2 id="pesan-vps" className="text-base font-semibold text-text-primary">
              Data Pemesan
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama Lengkap" required error={errors.customerName}>
                <Input value={form.customerName} onChange={(e) => update('customerName', e.target.value)} />
              </Field>
              <Field label="Nomor WhatsApp" required error={errors.customerWhatsapp} hint="Contoh: 6281234567890">
                <Input
                  value={form.customerWhatsapp}
                  onChange={(e) => update('customerWhatsapp', e.target.value)}
                  inputMode="numeric"
                />
              </Field>
              <Field label="Email" required error={errors.customerEmail}>
                <Input type="email" value={form.customerEmail} onChange={(e) => update('customerEmail', e.target.value)} />
              </Field>
              <Field label="Hostname" required error={errors.serverName} hint="Nama VPS Anda, contoh: app-produksi">
                <Input value={form.serverName} onChange={(e) => update('serverName', e.target.value)} />
              </Field>
            </div>
            <Field label="Catatan" hint="Opsional — sistem operasi pilihan, kebutuhan khusus, dsb.">
              <Textarea rows={3} value={form.notes} onChange={(e) => update('notes', e.target.value)} />
            </Field>
            <Field label="Kode Kupon" hint="Opsional. Diskon dihitung ulang oleh server saat order dibuat.">
              <div className="flex gap-2">
                <Input
                  value={form.couponCode}
                  onChange={(e) => update('couponCode', e.target.value.toUpperCase())}
                  className="font-mono uppercase"
                />
                <Button variant="outline" onClick={() => void validateCoupon()} loading={coupon.status === 'checking'}>
                  Cek
                </Button>
              </div>
            </Field>
            {coupon.status === 'valid' || coupon.status === 'invalid' ? (
              <p
                role="status"
                className={coupon.status === 'valid' ? 'text-xs font-medium text-success' : 'text-xs font-medium text-error'}
              >
                {coupon.message}
              </p>
            ) : null}
            <Checkbox
              checked={form.agreeTerms}
              onChange={(e) => update('agreeTerms', e.target.checked)}
              label={ORDER_AGREEMENT}
            />
            {errors.agreeTerms ? (
              <p role="alert" className="text-xs font-medium text-error">
                {errors.agreeTerms}
              </p>
            ) : null}
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-border bg-surface p-5">
              <h2 className="text-sm font-semibold text-text-primary">Ringkasan</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-text-secondary">Layanan</dt>
                  <dd className="font-medium text-text-primary">VPS</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-secondary">Paket</dt>
                  <dd className="text-right font-medium text-text-primary">{selected?.label ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-secondary">Spesifikasi</dt>
                  <dd className="text-right font-mono text-xs text-text-primary">
                    {selected ? `${selected.vcpu} vCPU / ${selected.ramGb} GB / ${selected.storageGb} GB` : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-secondary">Perpanjangan</dt>
                  <dd className="text-right text-xs text-text-primary">
                    {selected ? (selected.renewable ? 'Dapat diperpanjang' : 'Tidak tersedia') : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-border pt-2">
                  <dt className="text-text-secondary">Harga</dt>
                  <dd className="font-mono text-text-primary">{formatRupiah(price)}</dd>
                </div>
                {coupon.status === 'valid' ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-text-secondary">Diskon kupon</dt>
                    <dd className="font-mono text-success">-{formatRupiah(coupon.discount)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4 border-t border-border pt-2">
                  <dt className="font-medium text-text-primary">Total</dt>
                  <dd className="font-mono text-base font-semibold text-text-primary">{formatRupiah(total)}</dd>
                </div>
              </dl>
              <Button className="mt-4 w-full" size="lg" onClick={() => void submitOrder()} loading={submitting}>
                <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                Pesan VPS
              </Button>
              <p className="mt-2 text-xs leading-relaxed text-text-muted">
                Harga final dihitung ulang oleh server saat order dibuat — nilai dari browser tidak dipercaya.
              </p>
            </div>
            <Alert variant="warning" title="Perhatian sebelum memesan">
              <p>{PURCHASE_WARNING}</p>
            </Alert>
          </aside>
        </section>
      ) : null}
    </div>
  );
}

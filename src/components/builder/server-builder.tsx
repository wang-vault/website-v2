'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Check,
  Loader2,
  RotateCcw,
  Save,
  ShieldAlert,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';
import {
  DEFAULT_LOW_PRICING,
  LOW_LIMITS,
  TIER_DEFINITIONS,
  calculateLowPrice,
  estimatePerformance,
  lowPriceBreakdown,
  normalizeLowConfig,
  type LowPricingConstants,
} from '@/lib/pricing';
import { formatRupiah, formatRupiahPerMonth } from '@/lib/utils';
import { ORDER_AGREEMENT, PURCHASE_WARNING, buildClientOrderSummary } from '@/lib/whatsapp';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Textarea } from '@/components/ui/input';
import { SliderField } from './slider-field';
import { EstimatePanel } from './estimate-panel';
import { useToast } from '@/components/ui/toast';
import type { PackageRecord, Tier } from '@/types';

export interface BuilderSession {
  loggedIn: boolean;
  email: string;
  fullName: string;
  whatsapp: string;
}

export interface SavedConfig {
  id: string;
  name: string;
  tier: Tier;
  packageId: string | null;
  cpu: number;
  ramGb: number;
  storageGb: number;
  savedAt: string;
}

const LOCAL_STORAGE_KEY = 'wangstore-saved-configs';

function readLocalConfigs(): SavedConfig[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 20) as SavedConfig[];
  } catch {
    return [];
  }
}

function writeLocalConfigs(configs: SavedConfig[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(configs));
}

type BuilderStep = 'configure' | 'order';

interface OrderFormState {
  customerName: string;
  customerWhatsapp: string;
  customerEmail: string;
  serverName: string;
  notes: string;
  couponCode: string;
  agreeTerms: boolean;
}

const EMPTY_FORM: OrderFormState = {
  customerName: '',
  customerWhatsapp: '',
  customerEmail: '',
  serverName: '',
  notes: '',
  couponCode: '',
  agreeTerms: false,
};

export function ServerBuilder({
  session,
  packages,
  pricing,
  whatsappNumber,
  turnstileSiteKey,
}: {
  session: BuilderSession | null;
  packages: PackageRecord[];
  pricing: LowPricingConstants;
  whatsappNumber: string;
  turnstileSiteKey: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<BuilderStep>('configure');
  const [tier, setTier] = useState<Tier>('low');
  const [cpu, setCpu] = useState(LOW_LIMITS.cpu.min);
  const [ramGb, setRamGb] = useState(LOW_LIMITS.ram.min);
  const [storageGb, setStorageGb] = useState(LOW_LIMITS.storage.min);
  const [packageId, setPackageId] = useState<string | null>(null);
  const [form, setForm] = useState<OrderFormState>(() => ({
    ...EMPTY_FORM,
    customerName: session?.fullName ?? '',
    customerEmail: session?.email ?? '',
    customerWhatsapp: session?.whatsapp ?? '',
  }));
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [couponState, setCouponState] = useState<{
    status: 'idle' | 'checking' | 'valid' | 'invalid';
    message: string;
    discount: number;
  }>({ status: 'idle', message: '', discount: 0 });
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>(readLocalConfigs);

  const activePackage = useMemo(
    () => packages.find((p) => p.id === packageId && p.active) ?? null,
    [packages, packageId],
  );

  // Harga & estimasi seluruhnya diturunkan (derived) dari state — tidak ada duplikasi formula.
  const normalized = useMemo(() => normalizeLowConfig({ cpu, ramGb, storageGb }), [cpu, ramGb, storageGb]);

  const price = useMemo(() => {
    if (tier === 'high') return activePackage?.price ?? 0;
    if (tier === 'medium') return 0;
    return calculateLowPrice(normalized, pricing);
  }, [tier, activePackage, normalized, pricing]);

  const breakdown = useMemo(() => lowPriceBreakdown(normalized, pricing), [normalized, pricing]);

  const estimate = useMemo(
    () =>
      estimatePerformance({
        tier,
        cpu: tier === 'high' ? activePackage?.cpu ?? 0 : normalized.cpu,
        ramGb: tier === 'high' ? activePackage?.ramGb ?? 0 : normalized.ramGb,
        storageGb: tier === 'high' ? activePackage?.storageGb ?? 0 : normalized.storageGb,
      }),
    [tier, activePackage, normalized],
  );

  const effectiveConfig = useMemo(
    () => ({
      tier,
      packageId: tier === 'high' ? packageId : null,
      cpu: tier === 'high' ? activePackage?.cpu ?? 0 : normalized.cpu,
      ramGb: tier === 'high' ? activePackage?.ramGb ?? 0 : normalized.ramGb,
      storageGb: tier === 'high' ? activePackage?.storageGb ?? 0 : normalized.storageGb,
    }),
    [tier, packageId, activePackage, normalized],
  );

  const tierOngoing = TIER_DEFINITIONS[tier].status === 'ongoing';

  const selectTier = useCallback((next: Tier) => {
    setTier(next);
    if (next === 'high') {
      const first = packages.find((p) => p.active);
      setPackageId(first?.id ?? null);
    }
  }, [packages]);

  const resetConfig = useCallback(() => {
    setCpu(LOW_LIMITS.cpu.min);
    setRamGb(LOW_LIMITS.ram.min);
    setStorageGb(LOW_LIMITS.storage.min);
    setPackageId(packages.find((p) => p.active)?.id ?? null);
    setCouponState({ status: 'idle', message: '', discount: 0 });
  }, [packages]);

  const saveConfig = useCallback(async () => {
    const name = `Konfigurasi ${TIER_DEFINITIONS[tier].label} ${effectiveConfig.cpu}C/${effectiveConfig.ramGb}G`;
    if (session?.loggedIn) {
      const response = await fetch('/api/account/saved-configurations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify({
          name,
          tier: effectiveConfig.tier,
          packageId: effectiveConfig.packageId,
          cpu: effectiveConfig.cpu,
          ramGb: effectiveConfig.ramGb,
          storageGb: effectiveConfig.storageGb,
        }),
      });
      const result = (await response.json()) as { success: boolean; message: string };
      if (result.success) {
        toast({ variant: 'success', title: 'Konfigurasi tersimpan', message: 'Tersimpan ke akun Anda.' });
      } else {
        toast({ variant: 'error', title: 'Gagal menyimpan', message: result.message });
      }
      return;
    }
    const record: SavedConfig = {
      id: `${Date.now()}`,
      name,
      tier: effectiveConfig.tier,
      packageId: effectiveConfig.packageId,
      cpu: effectiveConfig.cpu,
      ramGb: effectiveConfig.ramGb,
      storageGb: effectiveConfig.storageGb,
      savedAt: new Date().toISOString(),
    };
    const next = [record, ...savedConfigs].slice(0, 20);
    setSavedConfigs(next);
    writeLocalConfigs(next);
    toast({ variant: 'success', title: 'Konfigurasi tersimpan', message: 'Tersimpan di perangkat Anda.' });
  }, [session, tier, effectiveConfig, savedConfigs, toast]);

  const loadConfig = useCallback(
    (config: SavedConfig) => {
      setTier(config.tier);
      setCpu(config.cpu);
      setRamGb(config.ramGb);
      setStorageGb(config.storageGb);
      setPackageId(config.packageId);
      toast({ variant: 'info', title: 'Konfigurasi dimuat', message: config.name });
    },
    [toast],
  );

  const removeLocalConfig = useCallback((id: string) => {
    setSavedConfigs((current) => {
      const next = current.filter((c) => c.id !== id);
      writeLocalConfigs(next);
      return next;
    });
  }, []);

  const updateField = useCallback((field: keyof OrderFormState, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const validateCoupon = useCallback(async () => {
    const code = form.couponCode.trim();
    if (!code) {
      setCouponState({ status: 'idle', message: '', discount: 0 });
      return;
    }
    setCouponState({ status: 'checking', message: '', discount: 0 });
    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          tier: effectiveConfig.tier,
          packageId: effectiveConfig.packageId,
          subtotal: price,
        }),
      });
      const result = (await response.json()) as {
        success: boolean;
        message: string;
        data?: { discount: number } | null;
      };
      if (result.success && result.data) {
        setCouponState({
          status: 'valid',
          message: `Kupon berlaku. Potongan ${formatRupiah(result.data.discount)}.`,
          discount: result.data.discount,
        });
      } else {
        setCouponState({ status: 'invalid', message: result.message, discount: 0 });
      }
    } catch {
      setCouponState({ status: 'invalid', message: 'Tidak dapat memvalidasi kupon. Coba lagi.', discount: 0 });
    }
  }, [form.couponCode, effectiveConfig, price]);

  const estimatedTotal = Math.max(price - (couponState.status === 'valid' ? couponState.discount : 0), 0);

  const startOrder = useCallback(() => {
    setFormErrors({});
    setStep('order');
  }, []);

  const submitOrder = useCallback(async () => {
    const errors: Record<string, string> = {};
    if (form.customerName.trim().length < 2) errors.customerName = 'Nama minimal 2 karakter.';
    if (!/^\+?[0-9]{7,20}$/.test(form.customerWhatsapp.trim())) {
      errors.customerWhatsapp = 'Format nomor WhatsApp tidak valid. Contoh: 6281234567890';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail.trim())) {
      errors.customerEmail = 'Format email tidak valid.';
    }
    if (form.serverName.trim().length < 2) errors.serverName = 'Nama server minimal 2 karakter.';
    if (!form.agreeTerms) errors.agreeTerms = 'Anda harus menyetujui kebijakan sebelum memesan.';
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

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
          tier: effectiveConfig.tier,
          packageId: effectiveConfig.packageId,
          cpu: effectiveConfig.cpu,
          ramGb: effectiveConfig.ramGb,
          storageGb: effectiveConfig.storageGb,
          agreeTerms: true,
          turnstileToken,
        }),
      });

      if (response.ok) {
        const result = (await response.json()) as {
          success: boolean;
          data?: { order: { id: string }; accessToken: string } | null;
        };
        if (result.success && result.data) {
          router.push(`/order/${result.data.order.id}?token=${encodeURIComponent(result.data.accessToken)}`);
          return;
        }
        throw new Error('Respons tidak valid.');
      }

      const errorResult = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      // Network/API gagal → fallback WhatsApp dengan ringkasan klien
      // (bukan order resmi sampai server berhasil membuat order).
      if (!response.ok && response.status >= 500 && whatsappNumber) {
        const summary = buildClientOrderSummary({
          tier: TIER_DEFINITIONS[effectiveConfig.tier].label,
          packageId: effectiveConfig.packageId,
          cpu: effectiveConfig.cpu,
          ramGb: effectiveConfig.ramGb,
          storageGb: effectiveConfig.storageGb,
          price,
          total: estimatedTotal,
          couponCode: form.couponCode.trim() || null,
          customerName: form.customerName.trim(),
          customerWhatsapp: form.customerWhatsapp.trim(),
          customerEmail: form.customerEmail.trim(),
          serverName: form.serverName.trim(),
        });
        window.open(`https://wa.me/${whatsappNumber}?text=${summary}`, '_blank', 'noopener');
        toast({
          variant: 'error',
          title: 'Server tidak dapat dihubungi',
          message:
            'Ringkasan konfigurasi dibuka di WhatsApp, tetapi ini bukan order resmi. Silakan coba lagi atau hubungi kami.',
        });
        return;
      }

      toast({
        variant: 'error',
        title: 'Order gagal dibuat',
        message: errorResult?.message ?? 'Terjadi kesalahan. Silakan coba lagi.',
      });
    } catch {
      toast({ variant: 'error', title: 'Jaringan bermasalah', message: 'Tidak dapat menghubungi server. Periksa koneksi Anda.' });
    } finally {
      setSubmitting(false);
    }
  }, [
    form,
    effectiveConfig,
    price,
    estimatedTotal,
    whatsappNumber,
    turnstileSiteKey,
    router,
    toast,
  ]);

  const configReady = tierOngoing || (tier === 'high' && !activePackage);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        {step === 'configure' ? (
          <>
            <section aria-labelledby="langkah-tier">
              <h2 id="langkah-tier" className="mb-3 text-base font-semibold text-text-primary">
                Langkah 1 — Pilih Tier
              </h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {(['low', 'medium', 'high'] as Tier[]).map((t) => {
                  const def = TIER_DEFINITIONS[t];
                  const selected = tier === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => selectTier(t)}
                      aria-pressed={selected}
                      className={
                        selected
                          ? 'rounded-lg border-2 border-accent bg-surface p-4 text-left'
                          : 'rounded-lg border border-border bg-surface p-4 text-left hover:border-text-muted'
                      }
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-text-primary">{def.label}</span>
                        {def.status === 'ongoing' ? (
                          <Badge variant="warning">Ongoing</Badge>
                        ) : def.status === 'available' ? (
                          <Badge variant="success">Tersedia</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-text-muted">{def.cpuName}</p>
                      <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                        {def.mode === 'custom' ? 'Konfigurasi custom (CPU, RAM, penyimpanan)' : 'Paket tetap dengan harga final'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            {tier === 'low' ? (
              <section aria-labelledby="langkah-low" className="rounded-lg border border-border bg-surface p-5">
                <h2 id="langkah-low" className="mb-4 text-base font-semibold text-text-primary">
                  Langkah 2 — Atur Konfigurasi
                </h2>
                <div className="space-y-6">
                  <SliderField
                    label="CPU"
                    value={cpu}
                    min={LOW_LIMITS.cpu.min}
                    max={LOW_LIMITS.cpu.max}
                    step={LOW_LIMITS.cpu.step}
                    unit="vCore"
                    onChange={setCpu}
                    description="Jumlah virtual core yang dialokasikan untuk server Anda."
                  />
                  <SliderField
                    label="RAM"
                    value={ramGb}
                    min={LOW_LIMITS.ram.min}
                    max={LOW_LIMITS.ram.max}
                    step={LOW_LIMITS.ram.step}
                    unit="GB"
                    onChange={setRamGb}
                    description="Memori untuk server game dan plugin."
                  />
                  <SliderField
                    label="Penyimpanan"
                    value={storageGb}
                    min={LOW_LIMITS.storage.min}
                    max={LOW_LIMITS.storage.max}
                    step={LOW_LIMITS.storage.step}
                    unit="GB"
                    onChange={setStorageGb}
                    description={`Batas maksimum absolut ${LOW_LIMITS.storage.max} GB. Tanpa kuota bandwidth.`}
                  />
                </div>
                <div className="mt-5 rounded-md border border-border bg-background p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Rincian harga</p>
                  <dl className="mt-2 space-y-1 text-sm text-text-secondary">
                    <div className="flex justify-between">
                      <dt>Biaya dasar</dt>
                      <dd className="font-mono">{formatRupiah(breakdown.base)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>
                        CPU ({normalized.cpu} × {formatRupiah(pricing.perCore)})
                      </dt>
                      <dd className="font-mono">{formatRupiah(breakdown.cpuCost)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>
                        RAM ({normalized.ramGb} × {formatRupiah(pricing.perGbRam)})
                      </dt>
                      <dd className="font-mono">{formatRupiah(breakdown.ramCost)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>
                        Penyimpanan ({normalized.storageGb} × {formatRupiah(pricing.perGbStorage)})
                      </dt>
                      <dd className="font-mono">{formatRupiah(breakdown.storageCost)}</dd>
                    </div>
                  </dl>
                </div>
              </section>
            ) : null}

            {tier === 'high' ? (
              <section aria-labelledby="langkah-high">
                <h2 id="langkah-high" className="mb-3 text-base font-semibold text-text-primary">
                  Langkah 2 — Pilih Paket
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {packages
                    .filter((p) => p.active)
                    .map((pkg) => {
                      const selected = packageId === pkg.id;
                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => setPackageId(pkg.id)}
                          aria-pressed={selected}
                          className={
                            selected
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
                          <ul className="mt-3 space-y-1.5 text-sm text-text-secondary">
                            <li className="flex justify-between gap-4">
                              <span>CPU</span>
                              <span className="font-mono text-text-primary">{pkg.cpu} vCore</span>
                            </li>
                            <li className="flex justify-between gap-4">
                              <span>RAM</span>
                              <span className="font-mono text-text-primary">{pkg.ramGb} GB</span>
                            </li>
                            <li className="flex justify-between gap-4">
                              <span>Penyimpanan</span>
                              <span className="font-mono text-text-primary">{pkg.storageGb} GB</span>
                            </li>
                          </ul>
                          <p className="mt-3 border-t border-border pt-3 font-mono text-base font-semibold text-text-primary">
                            {formatRupiahPerMonth(pkg.price)}
                          </p>
                          {selected ? (
                            <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-success">
                              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Dipilih
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                </div>
              </section>
            ) : null}

            {tier === 'medium' ? (
              <section aria-labelledby="langkah-medium">
                <Alert variant="warning" title="Ongoing — Paket belum tersedia untuk pemesanan">
                  <p>Tier Medium sedang dipersiapkan dan belum dapat dipesan.</p>
                </Alert>
                <div className="mt-4">
                  <Button variant="secondary" disabled>
                    Paket Belum Tersedia
                  </Button>
                </div>
              </section>
            ) : null}

            <Alert variant="warning" title="Perhatian sebelum memesan">
              <p>{PURCHASE_WARNING}</p>
            </Alert>

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" size="lg" onClick={startOrder} disabled={configReady}>
                <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                Pesan Sekarang
              </Button>
              <Button variant="outline" onClick={saveConfig} disabled={configReady}>
                <Save className="h-4 w-4" aria-hidden="true" />
                Simpan Konfigurasi
              </Button>
              <Button variant="ghost" onClick={resetConfig}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reset
              </Button>
            </div>

            {savedConfigs.length > 0 ? (
              <section aria-labelledby="konfigurasi-tersimpan" className="rounded-lg border border-border bg-surface p-5">
                <h2 id="konfigurasi-tersimpan" className="text-sm font-semibold text-text-primary">
                  Konfigurasi Tersimpan ({session?.loggedIn ? 'akun' : 'perangkat ini'})
                </h2>
                <ul className="mt-3 divide-y divide-border">
                  {savedConfigs.slice(0, 5).map((config) => (
                    <li key={config.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text-primary">{config.name}</p>
                        <p className="text-xs text-text-muted">
                          {TIER_DEFINITIONS[config.tier].label} · {config.cpu} vCore / {config.ramGb} GB /{' '}
                          {config.storageGb} GB
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button variant="outline" size="sm" onClick={() => loadConfig(config)}>
                          Muat
                        </Button>
                        {!session?.loggedIn ? (
                          <Button variant="ghost" size="sm" onClick={() => removeLocalConfig(config.id)}>
                            Hapus
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        ) : (
          <section aria-labelledby="form-order">
            <h2 id="form-order" className="mb-1 text-base font-semibold text-text-primary">
              Informasi Pemesanan
            </h2>
            <p className="mb-4 text-sm text-text-secondary">
              Data ini digunakan untuk memproses order dan konfirmasi melalui WhatsApp.
            </p>

            <div className="rounded-lg border border-border bg-surface p-5">
              <dl className="space-y-1.5 text-sm text-text-secondary">
                <div className="flex justify-between">
                  <dt>Tier</dt>
                  <dd className="font-medium text-text-primary">{TIER_DEFINITIONS[tier].label}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Paket</dt>
                  <dd className="font-medium text-text-primary">{activePackage?.id ?? 'Konfigurasi custom'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>CPU / RAM / Penyimpanan</dt>
                  <dd className="font-mono font-medium text-text-primary">
                    {effectiveConfig.cpu} / {effectiveConfig.ramGb} / {effectiveConfig.storageGb}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-border pt-2">
                  <dt>Harga</dt>
                  <dd className="font-mono font-semibold text-text-primary">{formatRupiahPerMonth(price)}</dd>
                </div>
                {couponState.status === 'valid' ? (
                  <div className="flex justify-between text-success">
                    <dt>Potongan kupon</dt>
                    <dd className="font-mono">−{formatRupiah(couponState.discount)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between border-t border-border pt-2">
                  <dt className="font-semibold text-text-primary">Estimasi total</dt>
                  <dd className="font-mono text-base font-bold text-text-primary">
                    {formatRupiah(estimatedTotal)}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-text-muted">
                Harga final dihitung ulang oleh server saat order dibuat. Nilai harga dari browser tidak dipercaya.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <Field label="Nama" required error={formErrors.customerName}>
                <Input
                  value={form.customerName}
                  onChange={(e) => updateField('customerName', e.target.value)}
                  invalid={Boolean(formErrors.customerName)}
                  autoComplete="name"
                  placeholder="Nama lengkap Anda"
                />
              </Field>
              <Field
                label="WhatsApp"
                required
                error={formErrors.customerWhatsapp}
                hint="Format internasional tanpa +, contoh: 6281234567890"
              >
                <Input
                  value={form.customerWhatsapp}
                  onChange={(e) => updateField('customerWhatsapp', e.target.value)}
                  invalid={Boolean(formErrors.customerWhatsapp)}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="6281234567890"
                />
              </Field>
              <Field label="Email" required error={formErrors.customerEmail}>
                <Input
                  type="email"
                  value={form.customerEmail}
                  onChange={(e) => updateField('customerEmail', e.target.value)}
                  invalid={Boolean(formErrors.customerEmail)}
                  autoComplete="email"
                  placeholder="nama@email.com"
                />
              </Field>
              <Field
                label="Nama Server"
                required
                error={formErrors.serverName}
                hint="Huruf, angka, spasi, titik, dan strip. Maksimal 64 karakter."
              >
                <Input
                  value={form.serverName}
                  onChange={(e) => updateField('serverName', e.target.value)}
                  invalid={Boolean(formErrors.serverName)}
                  placeholder="nama-server"
                />
              </Field>
              <Field label="Catatan" hint="Opsional — kebutuhan khusus yang ingin disampaikan.">
                <Textarea
                  value={form.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="Contoh: server untuk komunitas survival, sekitar 15 pemain."
                  maxLength={2000}
                />
              </Field>
              <Field
                label="Kupon"
                error={couponState.status === 'invalid' ? couponState.message : undefined}
                hint="Opsional — kupon divalidasi ulang oleh server saat order dibuat."
              >
                <div className="flex gap-2">
                  <Input
                    value={form.couponCode}
                    onChange={(e) => {
                      updateField('couponCode', e.target.value.toUpperCase());
                      setCouponState({ status: 'idle', message: '', discount: 0 });
                    }}
                    placeholder="KODEKUPON"
                    maxLength={40}
                    className="font-mono uppercase"
                  />
                  <Button
                    variant="secondary"
                    onClick={validateCoupon}
                    disabled={!form.couponCode.trim() || couponState.status === 'checking'}
                  >
                    {couponState.status === 'checking' ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      'Periksa'
                    )}
                  </Button>
                </div>
                {couponState.status === 'valid' ? (
                  <p className="mt-1 flex items-center gap-1 text-xs font-medium text-success" role="status">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" /> {couponState.message}
                  </p>
                ) : null}
              </Field>

              <Alert variant="warning" title="Pembelian bersifat final">
                <p>{PURCHASE_WARNING}</p>
              </Alert>

              <Checkbox
                checked={form.agreeTerms}
                onChange={(e) => updateField('agreeTerms', e.target.checked)}
                label={
                  <span>
                    {ORDER_AGREEMENT} (<a href="/terms" className="underline underline-offset-2">Syarat &amp; Ketentuan</a>,{' '}
                    <a href="/refund" className="underline underline-offset-2">Refund</a>,{' '}
                    <a href="/sla" className="underline underline-offset-2">SLA</a>)
                  </span>
                }
                className={formErrors.agreeTerms ? 'text-error' : undefined}
              />
              {formErrors.agreeTerms ? (
                <p role="alert" className="text-xs font-medium text-error">
                  {formErrors.agreeTerms}
                </p>
              ) : null}

              {!whatsappNumber ? (
                <Alert variant="info" title="Nomor WhatsApp admin belum dikonfigurasi">
                  <p>
                    Order Anda tetap akan tersimpan, namun tombol konfirmasi WhatsApp belum aktif. Hubungi kami
                    melalui halaman Kontak atau tiket.
                  </p>
                </Alert>
              ) : null}

              <div className="flex flex-wrap gap-3 pt-2">
                <Button variant="primary" size="lg" onClick={submitOrder} loading={submitting}>
                  <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                  Buat Order
                </Button>
                <Button variant="ghost" onClick={() => setStep('configure')} disabled={submitting}>
                  Kembali ke Konfigurasi
                </Button>
              </div>
            </div>
          </section>
        )}
      </div>

      <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start" aria-label="Ringkasan konfigurasi">
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Ringkasan</p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Tier</span>
              <span className="font-medium text-text-primary">{TIER_DEFINITIONS[tier].label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">CPU</span>
              <span className="font-mono font-medium text-text-primary">{effectiveConfig.cpu} vCore</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">RAM</span>
              <span className="font-mono font-medium text-text-primary">{effectiveConfig.ramGb} GB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Penyimpanan</span>
              <span className="font-mono font-medium text-text-primary">{effectiveConfig.storageGb} GB</span>
            </div>
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs text-text-muted">Estimasi harga bulanan</p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-text-primary">
              {tierOngoing ? '—' : formatRupiah(price)}
            </p>
            <p className="text-xs text-text-muted">/bulan</p>
          </div>
          {couponState.status === 'valid' ? (
            <p className="mt-2 text-xs font-medium text-success" role="status">
              Potongan kupon: −{formatRupiah(couponState.discount)}
            </p>
          ) : null}
        </div>
        {!tierOngoing && effectiveConfig.cpu > 0 ? <EstimatePanel estimate={estimate} /> : null}
        <Alert variant="info" title="Estimasi, bukan jaminan">
          <p>
            Angka estimasi dihitung dari model deterministik berdasarkan konfigurasi. Estimasi bukan SLA atau
            jaminan performa.
          </p>
        </Alert>
        {tierOngoing ? (
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              Tier {TIER_DEFINITIONS[tier].label} sedang dipersiapkan dan belum dapat dipesan. Pilih tier lain
              untuk melanjutkan.
            </p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)ws_csrf=([^;]+)/);
  return match?.[1] ?? '';
}

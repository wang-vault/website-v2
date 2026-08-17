'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { formatDateTime, formatRupiah } from '@/lib/utils';
import { ORDER_AGREEMENT } from '@/lib/whatsapp';

/**
 * Tombol perpanjangan layanan pada halaman order.
 *
 * Kelayakan sudah dievaluasi di server (prop `allowed`/`message`) dan
 * DIVERIFIKASI ULANG saat permintaan dikirim — tombol ini hanya kenyamanan UI.
 */
function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)ws_csrf=([^;]+)/);
  return match?.[1] ?? '';
}

export interface RenewOrderProps {
  orderId: string;
  allowed: boolean;
  message: string;
  price: number;
  months: number;
  projectedExpiry: string;
  /** Token akses untuk pemesan tamu (tanpa akun). */
  accessToken?: string | null;
  turnstileSiteKey?: string | null;
}

export function RenewOrder({
  orderId,
  allowed,
  message,
  price,
  months,
  projectedExpiry,
  accessToken,
  turnstileSiteKey,
}: RenewOrderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    if (!allowed) return;
    if (!agree) {
      setError('Anda harus menyetujui kebijakan sebelum memperpanjang.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      let turnstileToken: string | null = null;
      if (turnstileSiteKey && typeof window !== 'undefined' && 'turnstile' in window) {
        turnstileToken =
          (window as unknown as { turnstile?: { getResponse: () => string } }).turnstile?.getResponse() ?? '';
      }
      const query = accessToken ? `?token=${encodeURIComponent(accessToken)}` : '';
      const response = await fetch(`/api/orders/${orderId}/renew${query}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify({ agreeTerms: true, turnstileToken }),
      });
      const result = (await response.json()) as {
        success: boolean;
        message: string;
        data?: { order: { id: string }; accessToken: string } | null;
      };
      if (result.success && result.data) {
        toast({
          variant: 'success',
          title: 'Order perpanjangan dibuat',
          message: `Order ${result.data.order.id} menunggu pembayaran.`,
        });
        router.push(`/order/${result.data.order.id}?token=${encodeURIComponent(result.data.accessToken)}`);
        return;
      }
      setError(result.message);
      toast({ variant: 'error', title: 'Perpanjangan gagal', message: result.message });
    } catch {
      toast({ variant: 'error', title: 'Jaringan bermasalah', message: 'Perpanjangan tidak terkirim.' });
    } finally {
      setSubmitting(false);
    }
  }, [accessToken, agree, allowed, orderId, router, toast, turnstileSiteKey]);

  if (!allowed) {
    return (
      <Alert variant="info" title="Perpanjangan tidak tersedia">
        <p>{message}</p>
      </Alert>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h2 className="text-base font-semibold text-text-primary">Perpanjang Layanan</h2>
      <p className="mt-1 text-sm leading-relaxed text-text-secondary">
        Perpanjangan {months} bulan dengan harga katalog saat ini. Order perpanjangan baru akan dibuat dan
        dikonfirmasi seperti pembelian biasa.
      </p>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-text-secondary">Biaya perpanjangan</dt>
          <dd className="font-mono font-semibold text-text-primary">{formatRupiah(price)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-secondary">Berlaku sampai setelah diperpanjang</dt>
          <dd className="text-right text-text-primary">{formatDateTime(projectedExpiry)}</dd>
        </div>
      </dl>
      <div className="mt-4">
        <Checkbox checked={agree} onChange={(e) => setAgree(e.target.checked)} label={ORDER_AGREEMENT} />
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-xs font-medium text-error">
          {error}
        </p>
      ) : null}
      <Button className="mt-4" onClick={() => void submit()} loading={submitting}>
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Perpanjang {months} Bulan
      </Button>
      <p className="mt-2 text-xs leading-relaxed text-text-muted">
        Masa aktif bertambah setelah tim WangStore memverifikasi pembayaran. Sisa hari yang belum terpakai tidak
        hangus — perpanjangan dihitung dari tanggal kedaluwarsa saat ini.
      </p>
    </div>
  );
}

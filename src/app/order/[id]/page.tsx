import type { Metadata } from 'next';
import { createHash } from 'node:crypto';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, MessageCircle, ShieldAlert } from 'lucide-react';
import { getDb } from '@/lib/db';
import { getSession, isStaff } from '@/lib/auth/session';
import { buildWhatsAppOrderUrl } from '@/lib/whatsapp';
import { ORDER_AGREEMENT, PURCHASE_WARNING } from '@/lib/whatsapp';
import { formatDate, formatDateTime, formatRupiah } from '@/lib/utils';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button-link';
import { orderCatalogLabel } from '@/lib/catalog';
import { ORDER_STATUS_LABELS } from '@/types';

export const metadata: Metadata = {
  title: 'Konfirmasi Order',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}

const STATUS_VARIANT: Record<string, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  pending: 'info',
  awaiting_payment: 'warning',
  paid: 'success',
  processing: 'info',
  completed: 'success',
  cancelled: 'error',
  expired: 'neutral',
  refunded: 'warning',
};

export default async function OrderConfirmationPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { token } = await searchParams;

  const [db, sessionContext] = await Promise.all([getDb(), getSession()]);
  const order = await db.orders.findById(id);
  if (!order) notFound();

  // Kontrol akses: pemilik order (login), staff, atau token akses yang valid.
  const staff = sessionContext ? isStaff(sessionContext.session.role) : false;
  const isOwner =
    sessionContext && order.userId ? sessionContext.session.sub === order.userId : false;
  const tokenValid =
    token && order.accessTokenHash
      ? createHash('sha256').update(token).digest('hex') === order.accessTokenHash
      : false;

  if (!staff && !isOwner && !tokenValid) notFound();

  const settings = await db.settings.get();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const whatsappUrl = buildWhatsAppOrderUrl(order, settings, appUrl);

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">Order Berhasil Dibuat</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Order Anda telah tersimpan di sistem WangStore. Simpan halaman ini untuk memantau status order.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-text-muted">Order ID</p>
              <p className="mt-0.5 font-mono text-lg font-bold text-text-primary">{order.id}</p>
            </div>
            <Badge variant={STATUS_VARIANT[order.status] ?? 'neutral'}>
              {ORDER_STATUS_LABELS[order.status]}
            </Badge>
          </div>

          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Tanggal</dt>
              <dd className="text-right text-text-primary">{formatDateTime(order.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Pelanggan</dt>
              <dd className="text-right text-text-primary">{order.customerName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">WhatsApp</dt>
              <dd className="text-right font-mono text-text-primary">{order.customerWhatsapp}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Email</dt>
              <dd className="text-right text-text-primary">{order.customerEmail}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Nama Server</dt>
              <dd className="text-right font-mono text-text-primary">{order.serverName}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-3">
              <dt className="text-text-secondary">Layanan</dt>
              <dd className="text-right font-medium text-text-primary">
                {orderCatalogLabel(order)}
                {order.packageId ? ` — ${order.packageId}` : ''}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">CPU</dt>
              <dd className="text-right font-mono text-text-primary">{order.cpu} vCore</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">RAM</dt>
              <dd className="text-right font-mono text-text-primary">{order.ramGb} GB</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Penyimpanan</dt>
              <dd className="text-right font-mono text-text-primary">{order.storageGb} GB</dd>
            </div>
            {order.notes ? (
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-text-secondary">Catatan</dt>
                <dd className="max-w-[60%] break-words text-right text-text-primary">{order.notes}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 border-t border-border pt-3">
              <dt className="text-text-secondary">Harga</dt>
              <dd className="text-right font-mono text-text-primary">{formatRupiah(order.unitPrice)}/bulan</dd>
            </div>
            {order.discountAmount > 0 ? (
              <div className="flex justify-between gap-4 text-success">
                <dt>Diskon {order.couponCode ? `(${order.couponCode})` : ''}</dt>
                <dd className="text-right font-mono">−{formatRupiah(order.discountAmount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 border-t border-border pt-3">
              <dt className="font-semibold text-text-primary">Total</dt>
              <dd className="text-right font-mono text-lg font-bold text-text-primary">
                {formatRupiah(order.total)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-6 space-y-4">
          <Alert variant="warning" title="Perhatian">
            <p>{PURCHASE_WARNING}</p>
          </Alert>

          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-medium text-accent-contrast hover:bg-text-secondary"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Konfirmasi via WhatsApp
            </a>
          ) : (
            <Alert variant="info" title="Nomor WhatsApp admin belum dikonfigurasi">
              <p>
                Konfirmasi WhatsApp belum tersedia. Hubungi kami melalui{' '}
                <Link href="/contact" className="underline underline-offset-2">
                  halaman Kontak
                </Link>{' '}
                atau tiket dukungan, dan sertakan Order ID Anda.
              </p>
            </Alert>
          )}

          {settings.paymentInstructions ? (
            <div className="rounded-lg border border-border bg-surface p-5">
              <h2 className="text-sm font-semibold text-text-primary">Pembayaran</h2>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{settings.paymentInstructions}</p>
            </div>
          ) : null}

          <p className="text-center text-xs leading-relaxed text-text-muted">
            <ShieldAlert className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
            {ORDER_AGREEMENT} ·{' '}
            <Link href="/terms" className="underline underline-offset-2 hover:text-text-primary">Syarat &amp; Ketentuan</Link>
            {' · '}
            <Link href="/refund" className="underline underline-offset-2 hover:text-text-primary">Refund</Link>
            {' · '}
            <Link href="/sla" className="underline underline-offset-2 hover:text-text-primary">SLA</Link>
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            {sessionContext ? (
              <ButtonLink href="/dashboard/orders" variant="outline" className="flex-1">
                Lihat di Dashboard
              </ButtonLink>
            ) : (
              <ButtonLink href="/register" variant="outline" className="flex-1">
                Buat Akun untuk Memantau Order
              </ButtonLink>
            )}
            <ButtonLink href="/" variant="ghost" className="flex-1">
              Kembali ke Beranda
            </ButtonLink>
          </div>

          <p className="text-center text-xs text-text-muted">
            Dibuat {formatDate(order.createdAt)} · Order ID dapat digunakan sebagai referensi saat menghubungi tim kami.
          </p>
        </div>
      </div>
    </div>
  );
}

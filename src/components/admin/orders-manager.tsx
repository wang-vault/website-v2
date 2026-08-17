'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { BellRing, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Pagination } from '@/components/ui/table';
import { EmptyState, LoadingState } from '@/components/ui/state';
import { useToast } from '@/components/ui/toast';
import { formatDate, formatDateTime, formatRupiah } from '@/lib/utils';
import { orderCatalogLabel } from '@/lib/catalog';
import {
  REMINDER_STAGES,
  SERVICE_STATE_LABELS,
  remainingLabel,
  serviceState,
  type ServiceState,
} from '@/lib/reminders';
import { ORDER_STATUS_LABELS } from '@/types';
import type { OrderRecord, OrderStatus } from '@/types';

const ALL_STATUSES: OrderStatus[] = [
  'pending',
  'awaiting_payment',
  'paid',
  'processing',
  'completed',
  'cancelled',
  'expired',
  'refunded',
];

const SERVICE_STATE_VARIANT: Record<ServiceState, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  unset: 'neutral',
  scheduled: 'info',
  active: 'success',
  expiring_soon: 'warning',
  expired: 'error',
};

/** ISO → nilai untuk <input type="datetime-local"> (waktu lokal peramban). */
function toLocalInput(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const STATUS_VARIANT: Record<OrderStatus, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  pending: 'info',
  awaiting_payment: 'warning',
  paid: 'success',
  processing: 'info',
  completed: 'success',
  cancelled: 'error',
  expired: 'neutral',
  refunded: 'warning',
};

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)ws_csrf=([^;]+)/);
  return match?.[1] ?? '';
}

interface OrdersResponse {
  success: boolean;
  message?: string;
  data?: { items: OrderRecord[]; total: number; page: number; pageSize: number };
}

const PAGE_SIZE = 25;

export function OrdersManager() {
  const { toast } = useToast();
  const [items, setItems] = useState<OrderRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [periodForm, setPeriodForm] = useState<{ activatedAt: string; expiresAt: string }>({
    activatedAt: '',
    expiresAt: '',
  });
  const [runningReminders, setRunningReminders] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const load = useCallback(
    async (targetPage: number, targetStatus: string, targetQuery: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(targetPage), pageSize: String(PAGE_SIZE) });
        if (targetStatus) params.set('status', targetStatus);
        if (targetQuery) params.set('q', targetQuery);
        const response = await fetch(`/api/admin/orders?${params.toString()}`, { cache: 'no-store' });
        const result = (await response.json()) as OrdersResponse;
        if (result.success && result.data) {
          setItems(result.data.items);
          setTotal(result.data.total);
        }
      } catch {
        toast({ variant: 'error', title: 'Gagal memuat order' });
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  // Efek murni untuk sinkronisasi data dari server.
  useEffect(() => {
    void load(page, status, debouncedQuery);
  }, [load, page, status, debouncedQuery]);

  const onQueryChange = (value: string): void => {
    setQuery(value);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setDebouncedQuery(value);
      setPage(1);
    }, 350);
  };

  const updateStatus = useCallback(
    async (order: OrderRecord, next: OrderStatus) => {
      setUpdatingId(order.id);
      try {
        const response = await fetch(`/api/admin/orders/${order.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
          body: JSON.stringify({ status: next }),
        });
        const result = (await response.json()) as { success: boolean; message?: string };
        if (result.success) {
          toast({ variant: 'success', title: `Status ${order.id} diperbarui` });
          await load(page, status, debouncedQuery);
        } else {
          toast({ variant: 'error', title: 'Gagal memperbarui', message: result.message });
        }
      } catch {
        toast({ variant: 'error', title: 'Jaringan bermasalah' });
      } finally {
        setUpdatingId(null);
      }
    },
    [load, page, status, debouncedQuery, toast],
  );

  /** Menyimpan masa aktif layanan. Mengubah tanggal exp mereset siklus pengingat. */
  const saveServicePeriod = useCallback(
    async (order: OrderRecord) => {
      setUpdatingId(order.id);
      try {
        const response = await fetch(`/api/admin/orders/${order.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
          body: JSON.stringify({
            activatedAt: periodForm.activatedAt ? new Date(periodForm.activatedAt).toISOString() : null,
            expiresAt: periodForm.expiresAt ? new Date(periodForm.expiresAt).toISOString() : null,
          }),
        });
        const result = (await response.json()) as { success: boolean; message?: string };
        if (result.success) {
          toast({ variant: 'success', title: `Masa aktif ${order.id} disimpan` });
          await load(page, status, debouncedQuery);
        } else {
          toast({ variant: 'error', title: 'Gagal menyimpan masa aktif', message: result.message });
        }
      } catch {
        toast({ variant: 'error', title: 'Jaringan bermasalah' });
      } finally {
        setUpdatingId(null);
      }
    },
    [load, page, periodForm, status, debouncedQuery, toast],
  );

  const runReminders = useCallback(async () => {
    setRunningReminders(true);
    try {
      const response = await fetch('/api/admin/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
      });
      const result = (await response.json()) as {
        success: boolean;
        message?: string;
        data?: { checked: number; sent: number; emailFailures: number };
      };
      if (result.success && result.data) {
        toast({
          variant: result.data.emailFailures > 0 ? 'info' : 'success',
          title: `Pengingat dijalankan: ${result.data.sent} terkirim`,
          message:
            result.data.emailFailures > 0
              ? `${result.data.emailFailures} email gagal dikirim — periksa konfigurasi email.`
              : `${result.data.checked} layanan bermasa aktif diperiksa.`,
        });
        await load(page, status, debouncedQuery);
      } else {
        toast({ variant: 'error', title: 'Gagal menjalankan pengingat', message: result.message });
      }
    } catch {
      toast({ variant: 'error', title: 'Jaringan bermasalah' });
    } finally {
      setRunningReminders(false);
    }
  }, [load, page, status, debouncedQuery, toast]);

  const statusOptions = useMemo(
    () => [
      { value: '', label: 'Semua status' },
      ...ALL_STATUSES.map((s) => ({ value: s, label: ORDER_STATUS_LABELS[s] })),
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
          <Input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Cari ID, nama, email, server…"
            aria-label="Cari order"
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          options={statusOptions}
          aria-label="Filter status"
          className="w-auto min-w-[160px]"
        />
        <Button variant="outline" onClick={() => void runReminders()} loading={runningReminders}>
          <BellRing className="h-4 w-4" aria-hidden="true" />
          Jalankan Pengingat
        </Button>
      </div>

      {loading ? (
        <LoadingState label="Memuat order…" />
      ) : items.length === 0 ? (
        <EmptyState
          title="Belum ada order"
          description="Order yang masuk dari Server Builder akan muncul di sini."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Order</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Pelanggan</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Konfigurasi</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Total</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Status</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Masa Aktif</th>
                <th scope="col" className="px-4 py-2.5 font-medium text-text-secondary">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((order) => (
                <Fragment key={order.id}>
                  <tr className="border-b border-border last:border-b-0">
                    <td className="px-4 py-3">
                      <Link href={`/order/${order.id}`} className="font-mono text-xs font-medium text-text-primary hover:underline">
                        {order.id}
                      </Link>
                      <p className="mt-0.5 text-xs text-text-muted">{formatDate(order.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-text-primary">{order.customerName}</p>
                      <p className="text-xs text-text-muted">{order.customerEmail}</p>
                      <p className="font-mono text-xs text-text-muted">{order.customerWhatsapp}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-text-primary">
                      {orderCatalogLabel(order)}{' '}
                      {order.packageId ?? `${order.cpu}C/${order.ramGb}G/${order.storageGb}G`}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-semibold text-text-primary">{formatRupiah(order.total)}</p>
                      {order.couponCode ? (
                        <p className="text-xs text-success">−{formatRupiah(order.discountAmount)} ({order.couponCode})</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={SERVICE_STATE_VARIANT[serviceState(order)]}>
                        {SERVICE_STATE_LABELS[serviceState(order)]}
                      </Badge>
                      {order.expiresAt ? (
                        <p className="mt-1 text-xs text-text-muted">
                          {formatDate(order.expiresAt)} · {remainingLabel(order.expiresAt)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const next = expandedId === order.id ? null : order.id;
                          setExpandedId(next);
                          if (next) {
                            setPeriodForm({
                              activatedAt: toLocalInput(order.activatedAt),
                              expiresAt: toLocalInput(order.expiresAt),
                            });
                          }
                        }}
                        aria-expanded={expandedId === order.id}
                      >
                        {expandedId === order.id ? 'Tutup' : 'Kelola'}
                      </Button>
                    </td>
                  </tr>
                  {expandedId === order.id ? (
                    <tr className="border-b border-border bg-surface-muted/50">
                      <td colSpan={7} className="px-4 py-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                          Status order
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          {ALL_STATUSES.map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => void updateStatus(order, s)}
                              disabled={updatingId === order.id || s === order.status}
                              className={
                                s === order.status
                                  ? 'rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-contrast'
                                  : 'rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-muted disabled:opacity-50'
                              }
                            >
                              {ORDER_STATUS_LABELS[s]}
                            </button>
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-text-muted">
                          Terakhir diperbarui {formatDateTime(order.updatedAt)}. Harga order tidak dapat diubah — hanya status.
                        </p>

                        <div className="mt-4 border-t border-border pt-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                            Masa aktif layanan
                          </p>
                          <div className="flex flex-wrap items-end gap-3">
                            <label className="text-xs text-text-secondary">
                              <span className="mb-1 block">Aktif sejak</span>
                              <Input
                                type="datetime-local"
                                value={periodForm.activatedAt}
                                onChange={(e) => setPeriodForm((c) => ({ ...c, activatedAt: e.target.value }))}
                                className="h-9 w-[220px]"
                              />
                            </label>
                            <label className="text-xs text-text-secondary">
                              <span className="mb-1 block">Berlaku sampai (exp)</span>
                              <Input
                                type="datetime-local"
                                value={periodForm.expiresAt}
                                onChange={(e) => setPeriodForm((c) => ({ ...c, expiresAt: e.target.value }))}
                                className="h-9 w-[220px]"
                              />
                            </label>
                            <Button
                              size="sm"
                              onClick={() => void saveServicePeriod(order)}
                              loading={updatingId === order.id}
                            >
                              Simpan Masa Aktif
                            </Button>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-text-muted">
                            Pengingat otomatis dikirim pada H-{REMINDER_STAGES.filter((s) => s > 0).join(', H-')},
                            dan hari kedaluwarsa — lewat notifikasi dashboard serta email pelanggan.
                            {order.remindersSent.length > 0
                              ? ` Sudah terkirim: ${order.remindersSent
                                  .map((stage) => (stage === 0 ? 'hari-H' : `H-${stage}`))
                                  .join(', ')}${order.lastReminderAt ? ` (terakhir ${formatDateTime(order.lastReminderAt)})` : ''}.`
                              : ' Belum ada pengingat terkirim untuk periode ini.'}{' '}
                            Mengubah tanggal kedaluwarsa akan mengulang siklus pengingat. Status order tidak
                            berubah otomatis saat masa aktif habis.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}

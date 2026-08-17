import Link from 'next/link';
import { ArrowRight, Bell, CreditCard, Package, Save, Ticket } from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { StatCard } from '@/components/ui/misc';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate, formatRupiah } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { orderCatalogLabel } from '@/lib/catalog';
import { ORDER_STATUS_LABELS } from '@/types';
import { EmptyState } from '@/components/ui/state';

export default async function DashboardPage() {
  const sessionContext = await getSession();
  if (!sessionContext) return null; // layout yang melakukan redirect
  const db = await getDb();

  const [orders, configs, tickets, notifications, unread] = await Promise.all([
    db.orders.listByUser(sessionContext.session.sub),
    db.savedConfigurations.listByUser(sessionContext.session.sub),
    db.tickets.listByUser(sessionContext.session.sub),
    db.notifications.listByUser(sessionContext.session.sub, 5),
    db.notifications.unreadCount(sessionContext.session.sub),
  ]);

  const openTickets = tickets.filter((t) => t.status !== 'closed').length;
  const activeOrders = orders.filter((o) => !['completed', 'cancelled', 'expired', 'refunded'].includes(o.status));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Ringkasan</h1>
        <p className="mt-1 text-sm text-text-secondary">Status layanan dan aktivitas akun Anda.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Pesanan" value={String(orders.length)} icon={<Package className="h-4 w-4" aria-hidden="true" />} />
        <StatCard label="Pesanan Aktif" value={String(activeOrders.length)} icon={<ArrowRight className="h-4 w-4" aria-hidden="true" />} />
        <StatCard label="Tiket Terbuka" value={String(openTickets)} icon={<Ticket className="h-4 w-4" aria-hidden="true" />} />
        <StatCard
          label="Notifikasi Belum Dibaca"
          value={String(unread)}
          icon={<Bell className="h-4 w-4" aria-hidden="true" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-text-primary">Pesanan Terbaru</h2>
              <Link href="/dashboard/orders" className="text-sm font-medium text-text-primary underline underline-offset-4">
                Lihat semua
              </Link>
            </div>
            {orders.length === 0 ? (
              <EmptyState
                title="Belum ada pesanan"
                description="Pesanan yang Anda buat akan muncul di sini. Mulai dengan Server Builder."
                action={
                  <Link
                    href="/server-builder"
                    className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-contrast hover:bg-text-secondary"
                  >
                    Buat Server
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {orders.slice(0, 5).map((order) => (
                  <li key={order.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link href={`/order/${order.id}`} className="font-mono text-sm font-medium text-text-primary hover:underline">
                        {order.id}
                      </Link>
                      <p className="text-xs text-text-muted">
                        {orderCatalogLabel(order)} {order.packageId ? `· ${order.packageId}` : ''} · {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-mono text-sm font-semibold text-text-primary">{formatRupiah(order.total)}</span>
                      <Badge variant={order.status === 'completed' ? 'success' : order.status === 'cancelled' || order.status === 'expired' ? 'error' : 'info'}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-text-primary">Aktivitas</h2>
              <Link href="/dashboard/tickets" className="text-sm font-medium text-text-primary underline underline-offset-4">
                Buka tiket
              </Link>
            </div>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Save className="mt-0.5 h-4 w-4 text-text-muted" aria-hidden="true" />
                <p className="text-sm text-text-secondary">
                  <span className="font-medium text-text-primary">{configs.length}</span> konfigurasi tersimpan di akun Anda.{' '}
                  <Link href="/dashboard/configurations" className="underline underline-offset-2">
                    Kelola
                  </Link>
                </p>
              </li>
              <li className="flex items-start gap-3">
                <CreditCard className="mt-0.5 h-4 w-4 text-text-muted" aria-hidden="true" />
                <p className="text-sm text-text-secondary">
                  Kupon yang sedang aktif dapat dilihat di{' '}
                  <Link href="/dashboard/coupons" className="underline underline-offset-2">
                    halaman Kupon
                  </Link>
                  .
                </p>
              </li>
              {notifications.length > 0 ? (
                <li className="border-t border-border pt-4">
                  <p className="mb-2 text-sm font-medium text-text-primary">Notifikasi terbaru</p>
                  <ul className="space-y-2">
                    {notifications.slice(0, 3).map((notification) => (
                      <li key={notification.id} className="rounded-md bg-surface-muted px-3 py-2">
                        <p className="text-sm font-medium text-text-primary">{notification.title}</p>
                        <p className="text-xs text-text-secondary">{notification.message}</p>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : null}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { ArrowRight, CreditCard, Package, Ticket, Users } from 'lucide-react';
import { getDb } from '@/lib/db';
import { StatCard } from '@/components/ui/misc';
import { formatDate, formatRupiah } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ORDER_STATUS_LABELS, TIER_LABELS } from '@/types';
import { EmptyState } from '@/components/ui/state';

export default async function AdminOverviewPage() {
  const db = await getDb();
  const [stats, orders, openTickets, customers] = await Promise.all([
    db.orders.stats(),
    db.orders.listAdmin({ page: 1, pageSize: 5 }),
    db.tickets.listAdmin({ page: 1, pageSize: 100 }),
    db.users.count(),
  ]);

  const openTicketCount = openTickets.items.filter((t) => t.status !== 'closed').length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Ringkasan</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Angka di bawah dihitung langsung dari data yang tersimpan — tanpa angka palsu.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Order" value={String(stats.totalOrders)} icon={<Package className="h-4 w-4" aria-hidden="true" />} />
        <StatCard label="Order Hari Ini" value={String(stats.ordersToday)} hint={`${stats.ordersThisMonth} bulan ini`} />
        <StatCard label="Pelanggan Terdaftar" value={String(customers)} icon={<Users className="h-4 w-4" aria-hidden="true" />} />
        <StatCard label="Tiket Terbuka" value={String(openTicketCount)} icon={<Ticket className="h-4 w-4" aria-hidden="true" />} />
        <StatCard
          label="Pendapatan (order non-batal)"
          value={formatRupiah(stats.revenue)}
          icon={<CreditCard className="h-4 w-4" aria-hidden="true" />}
          hint="Total nilai order dengan status selain batal/kedaluwarsa/refund."
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="order-terbaru">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="order-terbaru" className="text-base font-semibold text-text-primary">
              Order Terbaru
            </h2>
            <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm font-medium text-text-primary underline underline-offset-4">
              Semua order <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          {orders.items.length === 0 ? (
            <EmptyState
              title="Belum ada order"
              description="Order yang masuk akan muncul di sini."
            />
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
              {orders.items.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-medium text-text-primary">{order.id}</p>
                    <p className="mt-0.5 truncate text-xs text-text-muted">
                      {order.customerName} · {TIER_LABELS[order.tier]}{' '}
                      {order.packageId ? `· ${order.packageId}` : `· ${order.cpu}C/${order.ramGb}G`} ·{' '}
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-text-primary">{formatRupiah(order.total)}</span>
                    <Badge variant="neutral">{ORDER_STATUS_LABELS[order.status]}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="panduan">
          <h2 id="panduan" className="mb-3 text-base font-semibold text-text-primary">
            Aksi Cepat
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { href: '/admin/orders', label: 'Proses Pesanan', description: 'Ubah status order dan verifikasi pembayaran.' },
              { href: '/admin/tickets', label: 'Balas Tiket', description: 'Balas tiket pelanggan dan kontak masuk.' },
              { href: '/admin/pricing', label: 'Formula Harga', description: 'Perbarui konstanta harga tier Low.' },
              { href: '/admin/coupons', label: 'Buat Kupon', description: 'Buat kupon diskon dengan aturan lengkap.' },
              { href: '/admin/infrastructure', label: 'Status Layanan', description: 'Atur status platform, layanan, dan lokasi.' },
              { href: '/admin/blog', label: 'Tulis Artikel', description: 'Kelola blog dan knowledge base.' },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-text-muted"
              >
                <p className="text-sm font-semibold text-text-primary">{action.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">{action.description}</p>
              </Link>
            ))}
          </div>
          <p className="mt-4 rounded-lg border border-border bg-surface-muted p-4 text-xs leading-relaxed text-text-muted">
            Setiap tindakan di panel admin dicatat dalam Audit Log dan diverifikasi ulang di sisi server
            (RBAC). Harga order tidak pernah dapat diubah — hanya statusnya.
          </p>
        </section>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { ArrowRight, CreditCard, Package, Ticket, Users } from 'lucide-react';
import { getDb } from '@/lib/db';
import { StatCard } from '@/components/ui/misc';
import { formatDate, formatRupiah } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { orderCatalogLabel } from '@/lib/catalog';
import { ORDER_STATUS_LABELS, ROLE_LABELS } from '@/types';
import { EmptyState } from '@/components/ui/state';
import { requireAdminPage } from '@/lib/auth/page-guards';
import { ROLE_DEFINITIONS, type Permission } from '@/lib/auth/rbac';

interface QuickAction {
  href: string;
  label: string;
  description: string;
  permission: Permission;
}

/** Aksi cepat difilter berdasarkan izin — staf tidak melihat pintasan yang berujung 403. */
const QUICK_ACTIONS: readonly QuickAction[] = [
  { href: '/admin/orders', label: 'Proses Pesanan', description: 'Ubah status order dan verifikasi pembayaran.', permission: 'orders.update' },
  { href: '/admin/tickets', label: 'Balas Tiket', description: 'Balas tiket pelanggan dan kontak masuk.', permission: 'tickets.reply' },
  { href: '/admin/incidents', label: 'Status Layanan', description: 'Perbarui status platform, insiden, dan maintenance.', permission: 'status.manage' },
  { href: '/admin/pricing', label: 'Formula Harga', description: 'Perbarui konstanta harga tier Low.', permission: 'pricing.manage' },
  { href: '/admin/coupons', label: 'Buat Kupon', description: 'Buat kupon diskon dengan aturan lengkap.', permission: 'coupons.manage' },
  { href: '/admin/blog', label: 'Tulis Artikel', description: 'Kelola blog dan knowledge base.', permission: 'content.manage' },
  { href: '/admin/audit-logs', label: 'Periksa Audit Log', description: 'Telusuri siapa mengubah apa dan kapan.', permission: 'audit.read' },
  { href: '/admin/maintenance', label: 'Mode Maintenance', description: 'Nyalakan halaman pemeliharaan situs.', permission: 'maintenance.manage' },
];

export default async function AdminOverviewPage() {
  const { role, can } = await requireAdminPage();
  const db = await getDb();
  const [stats, orders, openTickets, customers] = await Promise.all([
    db.orders.stats(),
    db.orders.listAdmin({ page: 1, pageSize: 5 }),
    db.tickets.listAdmin({ page: 1, pageSize: 100 }),
    db.users.count(),
  ]);

  const openTicketCount = openTickets.items.filter((t) => t.status !== 'closed').length;
  const actions = QUICK_ACTIONS.filter((action) => can(action.permission));
  const definition = ROLE_DEFINITIONS[role];

  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Ringkasan</h1>
          <Badge variant="accent">{ROLE_LABELS[role]}</Badge>
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          {definition.summary} Angka di bawah dihitung langsung dari data yang tersimpan — tanpa angka palsu.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Order" value={String(stats.totalOrders)} icon={<Package className="h-4 w-4" aria-hidden="true" />} />
        <StatCard label="Order Hari Ini" value={String(stats.ordersToday)} hint={`${stats.ordersThisMonth} bulan ini`} />
        {can('customers.read') ? (
          <StatCard label="Pelanggan Terdaftar" value={String(customers)} icon={<Users className="h-4 w-4" aria-hidden="true" />} />
        ) : null}
        <StatCard label="Tiket Terbuka" value={String(openTicketCount)} icon={<Ticket className="h-4 w-4" aria-hidden="true" />} />
        {can('analytics.read') ? (
          <StatCard
            label="Pendapatan (order non-batal)"
            value={formatRupiah(stats.revenue)}
            icon={<CreditCard className="h-4 w-4" aria-hidden="true" />}
            hint="Total nilai order dengan status selain batal/kedaluwarsa/refund."
          />
        ) : null}
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
                      {order.customerName} · {orderCatalogLabel(order)}{' '}
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
            Aksi Cepat untuk Peran Anda
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {actions.map((action) => (
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
          <div className="mt-4 space-y-2 rounded-lg border border-border bg-surface-muted p-4 text-xs leading-relaxed text-text-muted">
            <p>
              Di luar wewenang {ROLE_LABELS[role]}: {definition.cannot.join('; ')}.{' '}
              <Link href="/admin/roles" className="font-medium text-text-primary underline underline-offset-4">
                Lihat matriks peran &amp; izin
              </Link>
              .
            </p>
            <p>
              Setiap tindakan di panel admin dicatat dalam Audit Log dan diverifikasi ulang di sisi server
              (RBAC). Harga order tidak pernah dapat diubah — hanya statusnya.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

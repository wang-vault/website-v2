import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { Table, type Column } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/state';
import { formatDate, formatRupiah } from '@/lib/utils';
import { orderCatalogLabel } from '@/lib/catalog';
import { ORDER_STATUS_LABELS } from '@/types';
import type { OrderRecord } from '@/types';

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

export default async function DashboardOrdersPage() {
  const sessionContext = await getSession();
  if (!sessionContext) return null;
  const db = await getDb();
  const orders = await db.orders.listByUser(sessionContext.session.sub);

  const columns: Column<OrderRecord>[] = [
    {
      key: 'id',
      header: 'Order ID',
      render: (order) => (
        <Link href={`/order/${order.id}`} className="font-mono text-xs font-medium text-text-primary hover:underline">
          {order.id}
        </Link>
      ),
    },
    {
      key: 'tanggal',
      header: 'Tanggal',
      render: (order) => formatDate(order.createdAt),
    },
    {
      key: 'produk',
      header: 'Layanan',
      render: (order) => (
        <span className="text-xs">
          {orderCatalogLabel(order)}
          {order.packageId ? ` · ${order.packageId}` : ` · ${order.cpu}C/${order.ramGb}G/${order.storageGb}G`}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      render: (order) => <span className="font-mono text-xs font-semibold">{formatRupiah(order.total)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (order) => (
        <Badge variant={STATUS_VARIANT[order.status] ?? 'neutral'}>{ORDER_STATUS_LABELS[order.status]}</Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Pesanan</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Riwayat order yang terhubung dengan akun Anda. Order yang dibuat tanpa login tidak muncul di sini —
          gunakan tautan halaman konfirmasi order untuk melihatnya.
        </p>
      </header>
      {orders.length === 0 ? (
        <EmptyState
          title="Belum ada pesanan"
          description="Buat server pertama Anda melalui Server Builder."
          action={
            <Link
              href="/server-builder"
              className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-contrast hover:bg-text-secondary"
            >
              Buka Server Builder
            </Link>
          }
        />
      ) : (
        <Table columns={columns} rows={orders} emptyMessage="Belum ada pesanan." />
      )}
    </div>
  );
}

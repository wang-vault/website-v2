import { OrdersManager } from '@/components/admin/orders-manager';

export default function AdminOrdersPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Pesanan</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Kelola order yang masuk. Perubahan status dicatat di Audit Log dan pelanggan menerima notifikasi.
        </p>
      </header>
      <OrdersManager />
    </div>
  );
}

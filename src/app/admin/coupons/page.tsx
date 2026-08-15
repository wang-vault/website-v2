import { CouponsManager } from '@/components/admin/coupons-manager';

export default function AdminCouponsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Kupon & Promosi</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Kelola kupon diskon: persentase atau nominal, dengan aturan minimum order, masa berlaku, batas
          penggunaan, dan batas per pelanggan. Semua perubahan dicatat di Audit Log.
        </p>
      </header>
      <CouponsManager />
    </div>
  );
}

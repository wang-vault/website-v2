import { getSession } from '@/lib/auth/session';
import { CustomersManager } from '@/components/admin/customers-manager';

export default async function AdminCustomersPage() {
  const sessionContext = await getSession();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Pelanggan</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Kelola akun pelanggan dan role staf. Hierarchy: Owner &gt; Admin &gt; Staff.
        </p>
      </header>
      <CustomersManager currentRole={sessionContext?.session.role ?? 'customer'} />
    </div>
  );
}

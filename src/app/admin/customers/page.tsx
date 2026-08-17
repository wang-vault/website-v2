import { requireAdminPage } from '@/lib/auth/page-guards';
import { CustomersManager } from '@/components/admin/customers-manager';
import { Alert } from '@/components/ui/alert';

export default async function AdminCustomersPage() {
  // Staff boleh melihat daftar pelanggan (baca-saja) untuk verifikasi saat
  // melayani tiket; mengubah data pelanggan butuh customers.update (Admin),
  // dan mengubah role butuh roles.manage (Owner).
  const { can } = await requireAdminPage('customers.read');
  const canUpdate = can('customers.update');
  const canManageRoles = can('roles.manage');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Pelanggan</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Daftar akun pelanggan dan staf. Hierarchy: Owner &gt; Admin &gt; Staff &gt; Pelanggan.
        </p>
      </header>
      {canManageRoles ? null : (
        <Alert variant="info" title={canUpdate ? 'Perubahan role khusus Owner' : 'Mode baca-saja'}>
          <p>
            {canUpdate
              ? 'Anda dapat melihat dan memperbarui data pelanggan, tetapi hanya Owner yang dapat mengubah role pengguna.'
              : 'Peran Anda dapat melihat daftar akun untuk verifikasi saat melayani pelanggan, tetapi tidak dapat mengubah data maupun role.'}
          </p>
        </Alert>
      )}
      <CustomersManager canUpdate={canUpdate} canManageRoles={canManageRoles} />
    </div>
  );
}

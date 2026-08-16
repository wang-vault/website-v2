import { requireAdminPage } from '@/lib/auth/page-guards';
import { AuditLogsManager } from '@/components/admin/audit-logs-manager';

export default async function AdminAuditLogsPage() {
  await requireAdminPage('audit.read');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Audit Log</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Catatan tindakan: login, logout, login gagal, create, update, delete, perubahan harga, kupon, order,
          pelanggan, CMS, legal, role, dan maintenance. Kata sandi dan secret tidak pernah disimpan di log.
        </p>
      </header>
      <AuditLogsManager />
    </div>
  );
}

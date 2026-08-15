import { getDb } from '@/lib/db';
import { StatusManager } from '@/components/admin/status-manager';

export default async function AdminIncidentsPage() {
  const db = await getDb();
  const settings = await db.settings.get();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Insiden, Maintenance & Status</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Kelola status layanan, insiden dengan timeline, dan jendela pemeliharaan untuk halaman status publik.
          WangStore tidak menampilkan data monitoring palsu.
        </p>
      </header>
      <StatusManager
        initialSettings={{
          platformStatus: settings.platformStatus,
          services: settings.services,
        }}
      />
    </div>
  );
}

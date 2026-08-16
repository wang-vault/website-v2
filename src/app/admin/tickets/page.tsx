import { requireAdminPage } from '@/lib/auth/page-guards';
import { TicketsManager } from '@/components/admin/tickets-manager';

export default async function AdminTicketsPage() {
  await requireAdminPage('tickets.read');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Tiket & Kontak</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Tiket pelanggan dan pesan masuk dari formulir kontak. Target respons: Kritis 15 menit · Tinggi 1 jam ·
          Normal 4 jam · Rendah 12 jam.
        </p>
      </header>
      <TicketsManager />
    </div>
  );
}

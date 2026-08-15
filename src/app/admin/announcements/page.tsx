import { CmsManager, type CmsManagerConfig } from '@/components/admin/cms-manager';

const ANNOUNCEMENTS_CONFIG: CmsManagerConfig = {
  resource: 'announcements',
  emptyTitle: 'Belum ada pengumuman',
  emptyDescription: 'Pengumuman aktif ditampilkan sebagai banner di seluruh situs.',
  titleField: 'title',
  deletable: true,
  columns: [
    { key: 'title', header: 'Judul' },
    { key: 'message', header: 'Pesan' },
    { key: 'active', header: 'Aktif' },
    { key: 'createdAt', header: 'Dibuat' },
  ],
  fields: [
    { name: 'title', label: 'Judul', type: 'text', required: true },
    { name: 'message', label: 'Pesan Banner', type: 'textarea', required: true },
    { name: 'active', label: 'Aktif', type: 'checkbox', defaultValue: 'true' },
    { name: 'startsAt', label: 'Mulai Tayang', type: 'datetime', hint: 'Opsional.' },
    { name: 'endsAt', label: 'Berakhir', type: 'datetime', hint: 'Opsional.' },
  ],
};

export default function AdminAnnouncementsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Pengumuman</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Pengumuman ditampilkan sebagai banner di bagian atas situs.
        </p>
      </header>
      <CmsManager config={ANNOUNCEMENTS_CONFIG} />
    </div>
  );
}

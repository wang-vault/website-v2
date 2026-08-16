import { requireAdminPage } from '@/lib/auth/page-guards';
import { CmsManager, type CmsManagerConfig } from '@/components/admin/cms-manager';

const FAQ_CONFIG: CmsManagerConfig = {
  resource: 'faq',
  emptyTitle: 'Belum ada pertanyaan',
  emptyDescription: 'Tambahkan pertanyaan yang sering diajukan.',
  titleField: 'question',
  deletable: true,
  columns: [
    { key: 'question', header: 'Pertanyaan' },
    { key: 'category', header: 'Kategori' },
    { key: 'sortOrder', header: 'Urutan' },
    { key: 'active', header: 'Aktif' },
  ],
  fields: [
    { name: 'question', label: 'Pertanyaan', type: 'text', required: true },
    { name: 'answer', label: 'Jawaban', type: 'markdown', required: true },
    { name: 'category', label: 'Kategori', type: 'text', required: true, defaultValue: 'Umum' },
    { name: 'sortOrder', label: 'Urutan Tampil', type: 'number', defaultValue: '1' },
    { name: 'active', label: 'Aktif', type: 'checkbox', defaultValue: 'true' },
  ],
};

export default async function AdminFaqPage() {
  const { can } = await requireAdminPage('content.read');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">FAQ</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Pertanyaan yang tampil di halaman FAQ publik dan bagian FAQ beranda.
        </p>
      </header>
      <CmsManager config={FAQ_CONFIG} readOnly={!can('content.manage')} />
    </div>
  );
}

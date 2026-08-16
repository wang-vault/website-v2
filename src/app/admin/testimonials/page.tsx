import { requireAdminPage } from '@/lib/auth/page-guards';
import { CmsManager, type CmsManagerConfig } from '@/components/admin/cms-manager';
import { Alert } from '@/components/ui/alert';

const TESTIMONIALS_CONFIG: CmsManagerConfig = {
  resource: 'testimonials',
  emptyTitle: 'Belum ada testimoni',
  emptyDescription: 'WangStore tidak membuat testimoni palsu — hanya testimoni pelanggan asli yang ditampilkan.',
  titleField: 'name',
  deletable: true,
  columns: [
    { key: 'name', header: 'Nama' },
    { key: 'role', header: 'Peran' },
    { key: 'rating', header: 'Rating' },
    { key: 'active', header: 'Aktif' },
  ],
  fields: [
    { name: 'name', label: 'Nama Pelanggan', type: 'text', required: true },
    { name: 'role', label: 'Peran / Komunitas', type: 'text', hint: 'Contoh: Pemilik server komunitas survival.' },
    { name: 'content', label: 'Testimoni', type: 'textarea', required: true },
    { name: 'rating', label: 'Rating (1–5)', type: 'number', defaultValue: '5' },
    { name: 'active', label: 'Tampilkan di situs', type: 'checkbox', defaultValue: 'true' },
  ],
};

export default async function AdminTestimonialsPage() {
  const { can } = await requireAdminPage('content.read');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Testimoni</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Kelola testimoni pelanggan. Hanya testimoni pelanggan asli yang boleh ditambahkan.
        </p>
      </header>
      <Alert variant="info" title="Kebijakan kejujuran">
        <p>
          WangStore tidak menampilkan testimoni palsu. Jika belum ada testimoni, halaman publik menampilkan
          empty state secara jujur.
        </p>
      </Alert>
      <CmsManager config={TESTIMONIALS_CONFIG} readOnly={!can('content.manage')} />
    </div>
  );
}

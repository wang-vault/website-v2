import { requireAdminPage } from '@/lib/auth/page-guards';
import { CmsManager, type CmsManagerConfig } from '@/components/admin/cms-manager';
import { Tabs } from '@/components/ui/tabs';

const PAGES_CONFIG: CmsManagerConfig = {
  resource: 'pages',
  emptyTitle: 'Belum ada halaman',
  emptyDescription: 'Halaman konten CMS: beranda, tentang, fitur, infrastruktur, kontak.',
  titleField: 'title',
  deletable: false,
  columns: [
    { key: 'slug', header: 'Slug' },
    { key: 'title', header: 'Judul' },
    { key: 'updatedAt', header: 'Diperbarui' },
  ],
  fields: [
    { name: 'slug', label: 'Slug', type: 'text', required: true, hint: 'home, about, features, why-wangstore, infrastructure, contact' },
    { name: 'title', label: 'Judul Halaman', type: 'text', required: true },
    { name: 'content', label: 'Konten', type: 'markdown', required: true },
    { name: 'metaTitle', label: 'Meta Title (SEO)', type: 'text' },
    { name: 'metaDescription', label: 'Meta Description (SEO)', type: 'textarea' },
  ],
};

const LEGAL_CONFIG: CmsManagerConfig = {
  resource: 'legal',
  emptyTitle: 'Belum ada dokumen',
  emptyDescription: 'Dokumen legal: terms, privacy, refund, sla, acceptable-use, cookie-policy.',
  titleField: 'title',
  deletable: false,
  columns: [
    { key: 'slug', header: 'Slug' },
    { key: 'title', header: 'Judul' },
    { key: 'version', header: 'Versi' },
    { key: 'updatedAt', header: 'Diperbarui' },
  ],
  fields: [
    { name: 'slug', label: 'Slug', type: 'text', required: true },
    { name: 'title', label: 'Judul Dokumen', type: 'text', required: true },
    { name: 'content', label: 'Isi Dokumen', type: 'markdown', required: true },
    { name: 'version', label: 'Versi', type: 'text', defaultValue: '1.0' },
  ],
};

export default async function AdminPagesPage() {
  const { can } = await requireAdminPage('content.read');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Halaman & Legal</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Seluruh konten situs dikelola dari dashboard — tanpa menyentuh kode. Perubahan dokumen legal dicatat
          di Audit Log.
        </p>
      </header>
      <Tabs
        items={[
          {
            key: 'pages',
            label: 'Halaman Konten',
            content: <CmsManager config={PAGES_CONFIG} readOnly={!can('content.manage')} />,
          },
          {
            key: 'legal',
            label: 'Dokumen Legal',
            content: <CmsManager config={LEGAL_CONFIG} readOnly={!can('legal.manage')} />,
          },
        ]}
      />
    </div>
  );
}

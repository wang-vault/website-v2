import { CmsManager, type CmsManagerConfig } from '@/components/admin/cms-manager';
import { KB_CATEGORIES } from '@/types';

const KB_CONFIG: CmsManagerConfig = {
  resource: 'knowledgeBase',
  emptyTitle: 'Belum ada artikel',
  emptyDescription: 'Tulis artikel knowledge base untuk membantu pelanggan.',
  titleField: 'title',
  deletable: true,
  columns: [
    { key: 'title', header: 'Judul' },
    { key: 'category', header: 'Kategori' },
    { key: 'status', header: 'Status' },
    { key: 'publishedAt', header: 'Terbit' },
  ],
  fields: [
    { name: 'title', label: 'Judul', type: 'text', required: true },
    { name: 'slug', label: 'Slug', type: 'text', required: true, hint: 'Huruf kecil dan strip.' },
    { name: 'excerpt', label: 'Ringkasan', type: 'textarea' },
    { name: 'content', label: 'Konten', type: 'markdown', required: true },
    {
      name: 'category',
      label: 'Kategori',
      type: 'select',
      required: true,
      options: KB_CATEGORIES.map((c) => ({ value: c, label: c })),
    },
    { name: 'tags', label: 'Tag', type: 'tags', hint: 'Pisahkan dengan koma.' },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'published', label: 'Terbit' },
      ],
    },
  ],
};

export default function AdminKnowledgeBasePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Knowledge Base</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Dokumentasi resmi WangStore dengan kategori tetap: Memulai, Pemesanan, Pembayaran, Minecraft, Server,
          Troubleshooting, Akun, dan Kebijakan.
        </p>
      </header>
      <CmsManager config={KB_CONFIG} />
    </div>
  );
}

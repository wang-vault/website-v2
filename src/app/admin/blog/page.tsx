import { requireAdminPage } from '@/lib/auth/page-guards';
import { CmsManager, type CmsManagerConfig } from '@/components/admin/cms-manager';
import { BlogCategoriesManager } from '@/components/admin/blog-categories-manager';

const BLOG_CONFIG: CmsManagerConfig = {
  resource: 'blog',
  emptyTitle: 'Belum ada artikel',
  emptyDescription: 'Tulis artikel pertama Anda untuk blog WangStore.',
  titleField: 'title',
  deletable: true,
  columns: [
    { key: 'title', header: 'Judul' },
    { key: 'slug', header: 'Slug' },
    { key: 'status', header: 'Status' },
    { key: 'publishedAt', header: 'Terbit' },
    { key: 'author', header: 'Penulis' },
  ],
  selectSources: { categoryId: { resource: 'blogCategories', valueField: 'id', labelField: 'name' } },
  fields: [
    { name: 'title', label: 'Judul', type: 'text', required: true },
    { name: 'slug', label: 'Slug', type: 'text', required: true, hint: 'Huruf kecil dan strip, contoh: panduan-server' },
    { name: 'excerpt', label: 'Ringkasan', type: 'textarea', hint: 'Ditampilkan di daftar artikel dan SEO.' },
    { name: 'content', label: 'Konten', type: 'markdown', required: true },
    { name: 'categoryId', label: 'Kategori', type: 'select', options: [] },
    { name: 'tags', label: 'Tag', type: 'tags', hint: 'Pisahkan dengan koma, contoh: minecraft, server' },
    { name: 'author', label: 'Penulis', type: 'text', required: true, defaultValue: 'Tim WangStore' },
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

export default async function AdminBlogPage() {
  const { can } = await requireAdminPage('content.read');
  const readOnly = !can('content.manage');

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Blog</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Kelola artikel blog: Markdown, kategori, tag, draft/terbit, dan tanggal terbit.
        </p>
      </header>
      <BlogCategoriesManager readOnly={readOnly} />
      <CmsManager config={BLOG_CONFIG} readOnly={readOnly} />
    </div>
  );
}

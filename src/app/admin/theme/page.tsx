import { getDb } from '@/lib/db';
import { SettingsForm } from '@/components/admin/settings-form';

export default async function AdminThemePage() {
  const db = await getDb();
  const settings = await db.settings.get();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Tema & Branding</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Nama situs, tagline, dan deskripsi meta yang dipakai di seluruh halaman dan SEO.
        </p>
      </header>
      <div className="max-w-xl rounded-lg border border-border bg-surface p-5">
        <SettingsForm
          fields={[
            { key: 'siteName', label: 'Nama Situs', type: 'text' },
            { key: 'tagline', label: 'Tagline', type: 'text' },
            { key: 'siteDescription', label: 'Deskripsi Situs (meta description)', type: 'textarea' },
            { key: 'announcementBanner', label: 'Teks Banner (opsional)', type: 'text', hint: 'Ditampilkan di atas navigasi.' },
          ]}
          initial={{
            siteName: settings.siteName,
            tagline: settings.tagline,
            siteDescription: settings.siteDescription,
            announcementBanner: settings.announcementBanner,
          }}
          successMessage="Branding diperbarui"
        />
      </div>
    </div>
  );
}

import { getDb } from '@/lib/db';
import { SettingsForm } from '@/components/admin/settings-form';
import { Alert } from '@/components/ui/alert';

export default async function AdminSocialPage() {
  const db = await getDb();
  const settings = await db.settings.get();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Sosial & Kontak</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Kanal kontak yang ditampilkan di halaman Kontak, footer, dan dipakai untuk pesan WhatsApp order.
        </p>
      </header>
      <div className="max-w-xl space-y-4">
        <Alert variant="info" title="Kanal yang belum dikonfigurasi tidak ditampilkan">
          <p>
            Jika nomor WhatsApp kosong, tombol konfirmasi WhatsApp di halaman order tidak aktif dan statusnya
            ditampilkan secara jujur kepada pelanggan.
          </p>
        </Alert>
        <div className="rounded-lg border border-border bg-surface p-5">
          <SettingsForm
            fields={[
              { key: 'whatsappNumber', label: 'Nomor WhatsApp', type: 'text', hint: 'Format internasional tanpa +, contoh: 6281234567890' },
              { key: 'discordInviteUrl', label: 'Tautan Undangan Discord', type: 'text', hint: 'Kosongkan jika belum tersedia.' },
              { key: 'contactEmail', label: 'Email Kontak', type: 'text', hint: 'Kosongkan jika belum tersedia.' },
            ]}
            initial={{
              whatsappNumber: settings.whatsappNumber,
              discordInviteUrl: settings.discordInviteUrl,
              contactEmail: settings.contactEmail,
            }}
            successMessage="Kontak diperbarui"
          />
        </div>
      </div>
    </div>
  );
}

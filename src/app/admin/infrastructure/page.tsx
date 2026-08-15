import { getDb } from '@/lib/db';
import { SettingsForm } from '@/components/admin/settings-form';
import { Alert } from '@/components/ui/alert';

export default async function AdminInfrastructurePage() {
  const db = await getDb();
  const settings = await db.settings.get();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Infrastruktur & Lokasi</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Informasi infrastruktur yang ditampilkan di halaman publik. WangStore tidak mengiklankan hardware,
          uptime, atau lokasi yang tidak dimiliki.
        </p>
      </header>
      <div className="max-w-xl space-y-4">
        <Alert variant="warning" title="Kebijakan kejujuran">
          <p>
            Jika informasi infrastruktur belum tersedia, halaman publik menampilkan &quot;Informasi
            infrastruktur sedang diperbarui&quot; — jangan mengisi data yang tidak dapat diverifikasi.
          </p>
        </Alert>
        <div className="rounded-lg border border-border bg-surface p-5">
          <SettingsForm
            fields={[
              { key: 'infrastructureNote', label: 'Catatan Infrastruktur', type: 'textarea', hint: 'Penjelasan jujur tentang batas platform.' },
              { key: 'locations', label: 'Lokasi Server', type: 'string-list', hint: 'Pisahkan dengan koma. Kosongkan jika belum tersedia.' },
              { key: 'paymentInstructions', label: 'Instruksi Pembayaran (Manual)', type: 'textarea', hint: 'Ditampilkan sebagai panduan pembayaran.' },
            ]}
            initial={{
              infrastructureNote: settings.infrastructureNote,
              locations: settings.locations,
              paymentInstructions: settings.paymentInstructions,
            }}
            successMessage="Informasi infrastruktur diperbarui"
          />
        </div>
      </div>
    </div>
  );
}

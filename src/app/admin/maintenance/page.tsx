import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { SettingsForm } from '@/components/admin/settings-form';
import { Alert } from '@/components/ui/alert';

export default async function AdminMaintenancePage() {
  const sessionContext = await getSession();
  const db = await getDb();
  const settings = await db.settings.get();
  const isOwner = sessionContext?.session.role === 'owner';

  if (!isOwner) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Mode Maintenance</h1>
        </header>
        <Alert variant="error" title="Khusus Owner">
          <p>Mode maintenance hanya dapat dikelola oleh Owner. Hubungi owner WangStore untuk perubahan ini.</p>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Mode Maintenance</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Aktifkan mode maintenance dengan pesan, estimasi selesai, dan allowed paths. Staff ke atas tetap
          dapat mengakses situs (admin bypass).
        </p>
      </header>
      <div className="max-w-xl space-y-4">
        <Alert variant="warning" title="Perhatian">
          <p>Saat mode aktif, seluruh halaman publik menampilkan halaman pemeliharaan dan API mengembalikan HTTP 503.</p>
        </Alert>
        <div className="rounded-lg border border-border bg-surface p-5">
          <SettingsForm
            fields={[
              { key: 'maintenanceMode', label: 'Aktifkan Mode Maintenance', type: 'checkbox' },
              { key: 'maintenanceTitle', label: 'Judul', type: 'text' },
              { key: 'maintenanceMessage', label: 'Pesan', type: 'textarea' },
              { key: 'maintenanceEstimatedRestoration', label: 'Estimasi Selesai', type: 'text', hint: 'Contoh: 2 jam ke depan' },
              { key: 'maintenanceAllowedPaths', label: 'Allowed Paths', type: 'string-list', hint: 'Path yang tetap dapat diakses, pisahkan dengan koma. Contoh: /status' },
            ]}
            initial={{
              maintenanceMode: settings.maintenanceMode,
              maintenanceTitle: settings.maintenanceTitle,
              maintenanceMessage: settings.maintenanceMessage,
              maintenanceEstimatedRestoration: settings.maintenanceEstimatedRestoration,
              maintenanceAllowedPaths: settings.maintenanceAllowedPaths,
            }}
            successMessage="Pengaturan maintenance disimpan"
          />
        </div>
      </div>
    </div>
  );
}

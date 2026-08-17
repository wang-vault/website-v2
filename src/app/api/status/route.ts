import { getDb } from '@/lib/db';
import { apiOk } from '@/lib/api';

/**
 * GET /api/status — status platform, layanan, insiden, dan pemeliharaan.
 * Hanya menampilkan data yang dikelola admin — tanpa data monitoring palsu.
 *
 * Blok `system` memuat diagnosa datastore (driver & kesehatan) agar masalah
 * deployment dapat dicek dari browser tanpa membaca log server. Endpoint ini
 * TETAP mengembalikan 200 saat datastore bermasalah: status platform
 * dilaporkan sebagai pemeliharaan dan penyebabnya disampaikan di `system.hint`.
 */
export async function GET(): Promise<Response> {
  try {
    const db = await getDb();
    const [settings, incidents, maintenance] = await Promise.all([
      db.settings.get(),
      db.incidents.listOpen(),
      db.maintenance.listActive(),
    ]);
    return apiOk({
      platformStatus: settings.platformStatus,
      services: settings.services,
      openIncidents: incidents,
      activeMaintenance: maintenance,
      uptime: {
        target: '99.9%',
        measured: null,
        note: 'Data uptime terukur belum tersedia — sistem monitoring belum terhubung.',
      },
      system: {
        ok: true,
        datastore: db.driver,
        maintenanceMode: settings.maintenanceMode,
      },
    });
  } catch (error) {
    console.error('[wangstore] GET /api/status gagal memuat data:', error);
    const cause = error instanceof Error ? error.message : String(error);
    return apiOk({
      platformStatus: 'maintenance',
      services: [],
      openIncidents: [],
      activeMaintenance: [],
      uptime: {
        target: '99.9%',
        measured: null,
        note: 'Data uptime terukur belum tersedia — sistem monitoring belum terhubung.',
      },
      system: {
        ok: false,
        datastore: 'unavailable',
        maintenanceMode: false,
        hint:
          'Datastore tidak dapat diakses. Periksa log server (Vercel → Functions → Logs). ' +
          'Penyebab umum: Supabase belum dikonfigurasi / skema belum dijalankan di environment production. ' +
          'Lihat docs/DEPLOYMENT.md (bagian Troubleshooting).',
        error: cause,
      },
    });
  }
}

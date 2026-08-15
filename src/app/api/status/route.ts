import { getDb } from '@/lib/db';
import { apiOk, handleApiError } from '@/lib/api';

/**
 * GET /api/status — status platform, layanan, insiden, dan pemeliharaan.
 * Hanya menampilkan data yang dikelola admin — tanpa data monitoring palsu.
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
    });
  } catch (error) {
    return handleApiError(error);
  }
}

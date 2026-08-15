import path from 'node:path';
import { JsonDataStore } from './json-store';
import { SupabaseDataStore } from './supabase-store';
import type { DataStore } from './types';

/**
 * Memilih datastore berdasarkan konfigurasi environment.
 *
 * - Supabase (production): jika NEXT_PUBLIC_SUPABASE_URL dan
 *   SUPABASE_SERVICE_ROLE_KEY tersedia.
 * - JSON (development/fallback): otomatis di-seed ke data/wangstore.json.
 *
 * JSON datastore HANYA untuk pengembangan lokal / fallback, bukan
 * datastore production (filesystem tidak persisten di serverless).
 */

const globalStore = globalThis as unknown as {
  __wangstoreDb?: Promise<DataStore>;
  __wangstoreDriver?: string;
};

function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export async function getDb(): Promise<DataStore> {
  const mode = process.env.NEXT_PUBLIC_SUPABASE_URL ? 'supabase' : 'json';
  const cacheKey = `${mode}`;
  if (globalStore.__wangstoreDb && globalStore.__wangstoreDriver === cacheKey) {
    return globalStore.__wangstoreDb;
  }
  const promise = (async (): Promise<DataStore> => {
    if (supabaseConfigured()) {
      const store = new SupabaseDataStore(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      );
      const ok = await store.ping();
      if (!ok) {
        console.warn('[wangstore] Supabase tidak dapat dihubungi. Periksa NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY.');
      }
      return store;
    }
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[wangstore] Supabase belum dikonfigurasi pada environment production. ' +
          'Menggunakan fallback JSON datastore — TIDAK direkomendasikan untuk production.',
      );
    }
    const filePath = path.join(process.cwd(), 'data', 'wangstore.json');
    const store = new JsonDataStore(filePath);
    await store.init();
    return store;
  })();
  globalStore.__wangstoreDb = promise;
  globalStore.__wangstoreDriver = cacheKey;
  return promise;
}

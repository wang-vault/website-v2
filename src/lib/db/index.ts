import path from 'node:path';
import { promises as fs } from 'node:fs';
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
 * Di production tanpa Supabase, fallback JSON hanya diizinkan bila
 * filesystem benar-benar dapat ditulis (mis. server self-hosted dengan
 * disk persisten) — di Vercel/Cloudflare filesystem read-only, sehingga
 * getDb() gagal dengan pesan yang jelas alih-alih error 500 misterius.
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

/** Menulis (dan menghapus) file probe untuk memastikan direktori dapat ditulis. */
async function isDirectoryWritable(dir: string): Promise<boolean> {
  try {
    await fs.mkdir(dir, { recursive: true });
    const probe = path.join(dir, '.wangstore-write-probe');
    await fs.writeFile(probe, 'ok', 'utf8');
    await fs.unlink(probe);
    return true;
  } catch {
    return false;
  }
}

function productionDatastoreError(): string {
  return [
    'Datastore production tidak tersedia.',
    'Environment production memerlukan Supabase PostgreSQL, tetapi NEXT_PUBLIC_SUPABASE_URL dan ' +
      'SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi. Fallback JSON datastore juga tidak dapat dipakai ' +
      'karena filesystem serverless bersifat read-only (tidak dapat menulis data/wangstore.json).',
    'Langkah perbaikan:',
    '  1. Buat project Supabase, lalu jalankan SELURUH isi database/schema.sql lewat SQL Editor.',
    '  2. Isi NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di environment deployment (Production & Preview), lalu redeploy.',
    '  3. Buat akun Owner: ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run db:seed.',
    '  4. Isi JWT_SECRET (openssl rand -base64 48), NEXT_PUBLIC_APP_URL, dan CRON_SECRET.',
    'Panduan lengkap: docs/DEPLOYMENT.md (bagian "Troubleshooting").',
  ].join('\n');
}

/**
 * Audit konfigurasi production — dicatat SATU KALI per proses (bukan per
 * request) agar kekurangan environment variable langsung terlihat di log
 * Vercel/Cloudflare sejak awal, tanpa perlu membaca stack trace.
 */
let configAuditLogged = false;

function logProductionConfigAudit(): void {
  if (configAuditLogged || process.env.NODE_ENV !== 'production') return;
  configAuditLogged = true;

  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL (database production)');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY (database production)');
  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET (login/register akan gagal)');
  if (!process.env.CRON_SECRET) missing.push('CRON_SECRET (pengingat masa aktif tidak akan berjalan)');
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    missing.push('NEXT_PUBLIC_APP_URL (tautan WhatsApp/email akan memakai localhost)');
  }
  if (!process.env.EMAIL_PROVIDER || process.env.EMAIL_PROVIDER === 'console') {
    missing.push('EMAIL_PROVIDER=resend (verifikasi email & reset password hanya dicetak ke log)');
  }

  if (missing.length === 0) return;

  console.warn('[wangstore] Audit konfigurasi production — environment berikut belum terisi:');
  for (const item of missing) {
    console.warn(`  - ${item}`);
  }
  if (!supabaseConfigured()) {
    console.warn(
      '  → Datastore memakai fallback JSON. Di Vercel/Cloudflare (filesystem read-only) seluruh halaman akan ' +
        'mengembalikan 500. Konfigurasikan Supabase — lihat docs/DEPLOYMENT.md.',
    );
  }
}

export async function getDb(): Promise<DataStore> {
  logProductionConfigAudit();
  const configured = supabaseConfigured();
  const cacheKey = configured ? 'supabase' : 'json';
  if (globalStore.__wangstoreDb && globalStore.__wangstoreDriver === cacheKey) {
    return globalStore.__wangstoreDb;
  }
  const promise = (async (): Promise<DataStore> => {
    if (configured) {
      const store = new SupabaseDataStore(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      );
      const ok = await store.ping();
      if (!ok) {
        console.warn(
          '[wangstore] Supabase TIDAK siap digunakan (ping ke tabel settings gagal). ' +
            'Periksa URL/key (Project Settings → API), pastikan project tidak di-pause, ' +
            'jalankan seluruh isi database/schema.sql lewat SQL Editor, lalu npm run db:seed. ' +
            'Lihat docs/DEPLOYMENT.md (bagian Troubleshooting).',
        );
      }
      return store;
    }

    const filePath = path.join(process.cwd(), 'data', 'wangstore.json');

    if (process.env.NODE_ENV !== 'production') {
      const store = new JsonDataStore(filePath);
      await store.init();
      return store;
    }

    // Production tanpa Supabase: hanya izinkan fallback JSON bila filesystem
    // dapat ditulis (server self-hosted). Di serverless read-only (Vercel),
    // gagal lebih awal dengan pesan yang jelas — bukan 500 misterius.
    console.warn(
      '[wangstore] Supabase belum dikonfigurasi pada environment production. ' +
        'Menggunakan fallback JSON datastore — TIDAK direkomendasikan untuk production.',
    );
    const writable = await isDirectoryWritable(path.dirname(filePath));
    if (!writable) {
      throw new Error(productionDatastoreError());
    }
    const store = new JsonDataStore(filePath);
    await store.init();
    return store;
  })();
  globalStore.__wangstoreDb = promise;
  globalStore.__wangstoreDriver = cacheKey;
  return promise;
}

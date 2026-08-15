/**
 * Seed akun Owner + baris settings untuk production (Supabase).
 *
 * Jalankan setelah menerapkan database/schema.sql:
 *   ADMIN_EMAIL=owner@domain.com ADMIN_PASSWORD='...' npm run db:seed
 *
 * - ADMIN_EMAIL / ADMIN_PASSWORD wajib diisi di production.
 * - Idempotent: tidak menimpa akun yang sudah ada.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { SupabaseDataStore } from '../src/lib/db/supabase-store';
import { hashPassword } from '../src/lib/auth/password';
import { generateId, toIso } from '../src/lib/utils';
import type { SettingsRecord, UserRecord } from '../src/types';

/** Memuat .env.local sederhana (Next.js memuatnya otomatis hanya saat `next` berjalan). */
function loadEnvFile(): void {
  const filePath = path.join(process.cwd(), '.env.local');
  try {
    const raw = readFileSync(filePath, 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env.local tidak ada — environment diambil dari shell.
  }
}

loadEnvFile();

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error(
      'NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi.\n' +
        'Salin .env.example ke .env.local terlebih dahulu.',
    );
    process.exit(1);
  }

  const email = (process.env.ADMIN_EMAIL ?? 'admin@wangstore.id').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD?.trim() ?? '';
  if (!password || password.length < 12) {
    console.error('ADMIN_PASSWORD wajib diisi (minimal 12 karakter) untuk production.');
    process.exit(1);
  }

  const store = new SupabaseDataStore(url, serviceRoleKey);

  const existing = await store.users.findByEmail(email);
  if (existing) {
    console.log(`Akun ${email} sudah ada — tidak diubah.`);
  } else {
    const now = toIso();
    const user: UserRecord = {
      id: generateId('us'),
      email,
      passwordHash: await hashPassword(password),
      role: 'owner',
      emailVerified: true,
      emailVerificationToken: null,
      resetToken: null,
      resetTokenExpiresAt: null,
      tokenVersion: 1,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    };
    await store.users.create(user);
    await store.profiles.upsert({
      userId: user.id,
      fullName: 'Owner WangStore',
      whatsapp: '',
      discord: '',
      bio: '',
      updatedAt: now,
    });
    console.log(`Akun owner dibuat: ${email}`);
  }

  // Pastikan baris settings utama ada.
  try {
    await store.settings.get();
    console.log('Baris settings utama sudah tersedia.');
  } catch {
    const settings: SettingsRecord = {
      siteName: 'WangStore',
      tagline: 'Build Your Own Server.',
      siteDescription: '',
      whatsappNumber: process.env.WHATSAPP_NUMBER ?? '',
      discordInviteUrl: process.env.DISCORD_INVITE_URL ?? '',
      contactEmail: '',
      maintenanceMode: false,
      maintenanceTitle: 'Sedang Dalam Pemeliharaan',
      maintenanceMessage: 'WangStore sedang dalam pemeliharaan terjadwal. Kami akan segera kembali.',
      maintenanceEstimatedRestoration: '',
      maintenanceAllowedPaths: ['/status'],
      platformStatus: 'operational',
      services: [
        { name: 'Website & API', status: 'operational', description: 'Halaman web, Server Builder, dan API pemesanan.' },
        { name: 'Sistem Pemesanan', status: 'operational', description: 'Pembuatan order dan integrasi WhatsApp.' },
        { name: 'Panel Pelanggan', status: 'operational', description: 'Dashboard pelanggan dan tiket dukungan.' },
      ],
      infrastructureNote: '',
      locations: [],
      paymentInstructions: '',
      announcementBanner: '',
    };
    // Settings di-seed melalui jalur yang sama dengan runtime: update dari kosong.
    await store.settings.update(settings);
    console.log('Baris settings utama dibuat.');
  }

  console.log('Seed selesai.');
  process.exit(0);
}

main().catch((error) => {
  console.error('Seed gagal:', error);
  process.exit(1);
});

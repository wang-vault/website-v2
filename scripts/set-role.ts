/**
 * Menetapkan role panel (owner/admin/staff/customer) untuk sebuah akun.
 *
 * Dipakai untuk BOOTSTRAP admin/staff pertama di production — setelah itu
 * perubahan role sebaiknya dilakukan Owner melalui panel (/admin/customers)
 * agar tercatat di Audit Log dengan aktor yang jelas.
 *
 * Contoh:
 *   npm run db:role -- --email staf@domain.com --role staff
 *   npm run db:role -- --email admin@domain.com --role admin
 *
 * Catatan keamanan:
 *  - Skrip ini hanya berjalan di mesin yang memegang SUPABASE_SERVICE_ROLE_KEY.
 *  - Perubahan menaikkan tokenVersion sehingga sesi lama akun tersebut batal
 *    dan role baru langsung berlaku (tidak ada sesi dengan role usang).
 *  - Setiap perubahan dicatat ke audit log dengan aktor "cli".
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { SupabaseDataStore } from '../src/lib/db/supabase-store';
import { ROLE_HIERARCHY } from '../src/types';
import type { Role } from '../src/types';

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

function readArg(name: string): string {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  const next = index >= 0 ? process.argv[index + 1] : undefined;
  if (next) return next.trim();
  const inline = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  return inline ? inline.slice(flag.length + 1).trim() : '';
}

function isRole(value: string): value is Role {
  return value in ROLE_HIERARCHY;
}

async function main(): Promise<void> {
  loadEnvFile();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error('NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi.');
    process.exit(1);
  }

  const email = readArg('email').toLowerCase();
  const role = readArg('role').toLowerCase();
  if (!email || !role) {
    console.error('Pemakaian: npm run db:role -- --email <email> --role <owner|admin|staff|customer>');
    process.exit(1);
  }
  if (!isRole(role)) {
    console.error(`Role tidak dikenal: ${role}. Pilihan: owner, admin, staff, customer.`);
    process.exit(1);
  }

  const store = new SupabaseDataStore(url, serviceRoleKey);
  const user = await store.users.findByEmail(email);
  if (!user) {
    console.error(`Akun ${email} tidak ditemukan. Pengguna harus mendaftar terlebih dahulu.`);
    process.exit(1);
  }
  if (user.role === role) {
    console.log(`Akun ${email} sudah berperan ${role} — tidak ada perubahan.`);
    process.exit(0);
  }

  // tokenVersion dinaikkan agar seluruh sesi lama batal dan role baru berlaku seketika.
  await store.users.update(user.id, { role, tokenVersion: user.tokenVersion + 1 });
  await store.audit.log({
    actorId: null,
    actorEmail: 'cli',
    action: 'role_change',
    resource: 'user',
    resourceId: user.id,
    ipAddress: null,
    metadata: { from: user.role, to: role, via: 'scripts/set-role.ts' },
  });

  console.log(`Role ${email}: ${user.role} → ${role}. Sesi lama akun tersebut dibatalkan.`);
  process.exit(0);
}

main().catch((error) => {
  console.error('Gagal menetapkan role:', error);
  process.exit(1);
});

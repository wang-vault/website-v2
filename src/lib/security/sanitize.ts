/**
 * Sanitasi rekursif terhadap data input.
 * Tidak mengizinkan nilai tipe lain melewati batas API, dan membatasi
 * panjang string agar payload tidak dapat menyalahgunakan memori/log.
 */

const MAX_STRING_LENGTH = 100_000;
const MAX_DEPTH = 10;
const MAX_KEYS = 500;

function sanitizeString(value: string): string {
  // Buang karakter kontrol (kecuali newline/tab untuk teks multi-baris).
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .slice(0, MAX_STRING_LENGTH);
}

export function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return null;
  if (typeof value === 'string') return sanitizeString(value);
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;
  if (value === null) return null;
  if (Array.isArray(value)) {
    return value.slice(0, 200).map((item) => sanitizeValue(item, depth + 1));
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    const entries = Object.entries(value as Record<string, unknown>).slice(0, MAX_KEYS);
    for (const [key, val] of entries) {
      result[key.slice(0, 200)] = sanitizeValue(val, depth + 1);
    }
    return result;
  }
  return null;
}

export function sanitizeObject<T extends Record<string, unknown>>(value: T): T {
  return sanitizeValue(value) as T;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhone(value: string): string {
  return value.replace(/[^\d]/g, '').slice(0, 20);
}

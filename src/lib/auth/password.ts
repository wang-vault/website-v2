import bcrypt from 'bcryptjs';

/** Bcrypt cost 12 untuk seluruh hash kata sandi. */
const BCRYPT_COST = 12;

/**
 * Hash dummy untuk email yang tidak dikenal pada saat login.
 * Digunakan agar waktu respons login tidak membocorkan keberadaan email
 * (timing-resistant behavior).
 */
const DUMMY_HASH = bcrypt.hashSync('wangstore-dummy-password-not-in-use', BCRYPT_COST);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Perbandingan dummy untuk email yang tidak terdaftar. */
export async function verifyDummyPassword(password: string): Promise<boolean> {
  await bcrypt.compare(password, DUMMY_HASH);
  return false;
}

export function passwordStrength(password: string): {
  ok: boolean;
  message: string;
} {
  if (password.length < 8) {
    return { ok: false, message: 'Kata sandi minimal 8 karakter.' };
  }
  if (password.length > 72) {
    return { ok: false, message: 'Kata sandi maksimal 72 karakter.' };
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { ok: false, message: 'Kata sandi harus mengandung huruf dan angka.' };
  }
  return { ok: true, message: '' };
}

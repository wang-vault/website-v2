import { headers } from 'next/headers';
import { getDb } from '@/lib/db';

/**
 * Rate limiting berdasarkan IP + endpoint + user (jika terautentikasi).
 *
 * - Supabase: counter tersimpan di tabel rate_limits (kompatibel dengan
 *   serverless — tidak bergantung pada memori proses).
 * - JSON (dev): counter in-memory per proses. Cukup untuk pengembangan
 *   lokal; didokumentasikan sebagai keterbatasan fallback.
 */

function envInt(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

export interface RateLimitConfig {
  max: number;
  windowSeconds: number;
}

export const RATE_LIMITS = {
  login: (): RateLimitConfig => ({
    max: envInt('RATE_LIMIT_LOGIN_MAX', 5),
    windowSeconds: envInt('RATE_LIMIT_LOGIN_WINDOW_SECONDS', 900),
  }),
  register: (): RateLimitConfig => ({ max: envInt('RATE_LIMIT_REGISTER_MAX', 5), windowSeconds: 3600 }),
  order: (): RateLimitConfig => ({
    max: envInt('RATE_LIMIT_ORDER_MAX', 10),
    windowSeconds: envInt('RATE_LIMIT_ORDER_WINDOW_SECONDS', 3600),
  }),
  contact: (): RateLimitConfig => ({
    max: envInt('RATE_LIMIT_CONTACT_MAX', 3),
    windowSeconds: envInt('RATE_LIMIT_CONTACT_WINDOW_SECONDS', 3600),
  }),
  ticket: (): RateLimitConfig => ({ max: 10, windowSeconds: 3600 }),
  default: (): RateLimitConfig => ({ max: 60, windowSeconds: 60 }),
} as const;

export async function clientIp(): Promise<string> {
  const headerStore = await headers();
  const forwarded = headerStore.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown';
  const realIp = headerStore.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super('Terlalu banyak percobaan. Silakan coba lagi nanti.');
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function rateLimit(
  endpoint: keyof typeof RATE_LIMITS,
  opts: { ip?: string; userId?: string | null } = {},
): Promise<void> {
  const config = RATE_LIMITS[endpoint]();
  const ip = opts.ip ?? (await clientIp());
  const identity = opts.userId ? `user:${opts.userId}` : ip;
  const key = `rl:${endpoint}:${identity}`;
  const db = await getDb();
  const result = await db.rateLimits.check(key, config.max, config.windowSeconds);
  if (!result.allowed) {
    throw new RateLimitError(result.retryAfterSeconds);
  }
}

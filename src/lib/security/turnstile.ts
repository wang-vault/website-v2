/**
 * Cloudflare Turnstile (opsional).
 * Aktif hanya ketika TURNSTILE_SECRET_KEY dikonfigurasi.
 * WangStore tidak membuat CAPTCHA sendiri.
 */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function turnstileEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstile(token: string | null, ip: string): Promise<boolean> {
  if (!turnstileEnabled()) return true; // Tidak aktif → lewati.
  if (!token) return false;
  try {
    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: ip,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

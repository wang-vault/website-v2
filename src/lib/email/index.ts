import { randomBytes } from 'node:crypto';

/**
 * Abstraksi pengiriman email untuk verifikasi email & reset kata sandi.
 *
 * Provider:
 * - "console": mencetak tautan ke log server (development). Tautan juga
 *   dikembalikan ke caller agar UI dev dapat menampilkannya secara jujur.
 * - "resend": mengirim via Resend API (serverless-compatible, free tier).
 *
 * Tidak ada provider yang "pura-pura sukses": status pengiriman selalu
 * dilaporkan apa adanya.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailSendResult {
  sent: boolean;
  provider: string;
  error: string | null;
}

export function generateEmailToken(): string {
  return randomBytes(32).toString('hex');
}

export function emailProvider(): string {
  return process.env.EMAIL_PROVIDER?.trim().toLowerCase() || 'console';
}

export async function sendEmail(message: EmailMessage): Promise<EmailSendResult> {
  const provider = emailProvider();
  if (provider === 'console') {
    console.log('[email:console]', JSON.stringify(message, null, 2));
    return { sent: true, provider, error: null };
  }
  if (provider === 'resend') {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return { sent: false, provider, error: 'RESEND_API_KEY belum dikonfigurasi.' };
    }
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'WangStore <no-reply@wangstore.example>',
          to: [message.to],
          subject: message.subject,
          text: message.text,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        return { sent: false, provider, error: `Resend HTTP ${response.status}` };
      }
      return { sent: true, provider, error: null };
    } catch (error) {
      return {
        sent: false,
        provider,
        error: error instanceof Error ? error.message : 'Gagal mengirim email.',
      };
    }
  }
  return { sent: false, provider, error: `Provider email tidak dikenal: ${provider}` };
}

export function verificationEmail(appUrl: string, token: string): EmailMessage {
  const link = `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  return {
    to: '',
    subject: 'Verifikasi Email — WangStore',
    text: `Verifikasi alamat email Anda untuk akun WangStore dengan membuka tautan berikut:\n\n${link}\n\nTautan berlaku terbatas. Jika Anda tidak merasa mendaftar di WangStore, abaikan email ini.`,
  };
}

export function resetPasswordEmail(appUrl: string, token: string): EmailMessage {
  const link = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  return {
    to: '',
    subject: 'Reset Kata Sandi — WangStore',
    text: `Kami menerima permintaan reset kata sandi untuk akun Anda. Buka tautan berikut untuk membuat kata sandi baru:\n\n${link}\n\nTautan berlaku 1 jam dan hanya sekali pakai. Jika Anda tidak meminta reset, abaikan email ini.`,
  };
}

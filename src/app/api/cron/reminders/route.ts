import { NextRequest } from 'next/server';
import { apiError, apiOk, handleApiError } from '@/lib/api';
import { runReminders } from '@/lib/reminders/service';

/**
 * GET/POST /api/cron/reminders — pengingat masa aktif layanan.
 *
 * Dipanggil scheduler platform (Vercel Cron mengirim header
 * `Authorization: Bearer $CRON_SECRET`). Tidak ada cron lokal / proses
 * long-running di aplikasi — sesuai batasan arsitektur serverless.
 *
 * Keamanan: endpoint menolak semua permintaan bila CRON_SECRET belum
 * dikonfigurasi (fail closed), dan membandingkan secret secara konstan-waktu.
 * Endpoint ini tidak pernah membocorkan data order pada respons.
 */

export const dynamic = 'force-dynamic';

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get('authorization') ?? '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const custom = request.headers.get('x-cron-secret')?.trim() ?? '';
  return timingSafeEqual(bearer, secret) || timingSafeEqual(custom, secret);
}

async function handle(request: NextRequest): Promise<Response> {
  try {
    if (!authorized(request)) {
      return apiError(
        401,
        'UNAUTHORIZED',
        'Endpoint cron memerlukan CRON_SECRET yang valid.',
      );
    }
    const summary = await runReminders();
    return apiOk({
      checked: summary.checked,
      sent: summary.sent,
      emailFailures: summary.failures,
      stages: summary.results.map((result) => ({ orderId: result.orderId, stage: result.stage })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest): Promise<Response> {
  return handle(request);
}

export async function POST(request: NextRequest): Promise<Response> {
  return handle(request);
}

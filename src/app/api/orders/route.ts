import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createOrder } from '@/lib/orders/service';
import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireWriteSecurity, assertNotInMaintenance } from '@/lib/api/guards';
import { rateLimit, clientIp } from '@/lib/security/rate-limit';
import { verifyTurnstile } from '@/lib/security/turnstile';

/**
 * POST /api/orders
 *
 * Urutan: payload limit → authentication (opsional) → CSRF → Zod →
 * sanitization → normalization → business validation → server-side pricing
 * → database transaction → audit → response.
 *
 * Harga dari klien DIABAIKAN SEPENUHNYA — server menghitung ulang harga.
 * Audit log ditulis di dalam transaksi pembuatan order.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    // 1. Payload limit
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > 64 * 1024) {
      return apiError(413, 'PAYLOAD_TOO_LARGE', 'Ukuran payload melebihi batas.');
    }

    const ip = await clientIp();

    // 2. Rate limit (IP atau user)
    const sessionContext = await getSession();
    await rateLimit('order', { ip, userId: sessionContext?.session.sub ?? null });

    // 3. Maintenance
    await assertNotInMaintenance('/api/orders');

    // 4. Origin/CSRF
    await requireWriteSecurity();

    const body: unknown = await request.json().catch(() => {
      throw new SyntaxError('bad json');
    });

    // 5. Turnstile (opsional, hanya jika dikonfigurasi)
    const raw = body as Record<string, unknown> | null;
    const turnstileToken = typeof raw?.turnstileToken === 'string' ? raw.turnstileToken : null;
    const botOk = await verifyTurnstile(turnstileToken, ip);
    if (!botOk) {
      return apiError(400, 'BOT_CHECK_FAILED', 'Verifikasi bot gagal. Muat ulang halaman dan coba lagi.');
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const result = await createOrder(body, {
      userId: sessionContext?.session.sub ?? null,
      actorEmail: sessionContext?.session.email ?? 'guest',
      ipAddress: ip,
      appUrl,
    });

    return apiOk(
      {
        order: result.order,
        whatsappUrl: result.whatsappUrl,
        accessToken: result.accessToken,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextResponse } from 'next/server';

/**
 * Envelope respons API yang konsisten:
 * { success, code, message, data? }
 * Stack trace tidak pernah dikirim ke klien.
 */

export interface ApiError {
  code: string;
  message: string;
}

export class ApiErrorException extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiErrorException';
    this.status = status;
    this.code = code;
  }
}

export function apiOk<T>(data: T, init?: { status?: number; headers?: Record<string, string> }): NextResponse {
  return NextResponse.json(
    { success: true, code: 'OK', message: 'Berhasil.', data },
    { status: init?.status ?? 200, headers: init?.headers },
  );
}

export function apiError(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ success: false, code, message, data: null }, { status });
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiErrorException) {
    return apiError(error.status, error.code, error.message);
  }
  if (error instanceof Error && error.message === 'FORBIDDEN') {
    return apiError(403, 'FORBIDDEN', 'Anda tidak memiliki izin untuk tindakan ini.');
  }
  if (error instanceof Error && error.name === 'RateLimitError') {
    const retryAfter = Math.ceil((error as Error & { retryAfterSeconds?: number }).retryAfterSeconds ?? 60);
    return apiError(429, 'RATE_LIMITED', `Terlalu banyak percobaan. Silakan coba lagi dalam ${retryAfter} detik.`);
  }
  if (error instanceof SyntaxError) {
    return apiError(400, 'BAD_JSON', 'Format JSON tidak valid.');
  }
  console.error('[wangstore] API error:', error);
  return apiError(500, 'INTERNAL_ERROR', 'Terjadi kesalahan pada server. Silakan coba lagi.');
}

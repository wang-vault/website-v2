'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[wangstore] global error:', error);
  }, [error]);

  return (
    <html lang="id">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#ffffff', color: '#111111' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888888' }}>
            500
          </p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.75rem' }}>Terjadi kesalahan sistem</h1>
          <p style={{ fontSize: '0.9rem', color: '#666666', maxWidth: '28rem', marginTop: '0.75rem' }}>
            Terjadi kesalahan yang tidak terduga pada aplikasi WangStore. Coba muat ulang halaman.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '1.5rem',
              padding: '0.625rem 1.25rem',
              borderRadius: '0.375rem',
              background: '#111111',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Coba Lagi
          </button>
        </div>
      </body>
    </html>
  );
}

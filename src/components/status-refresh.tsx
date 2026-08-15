'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Menyegarkan data halaman status maksimal setiap 60 detik.
 * Memakai router.refresh() (Server Component re-fetch) — tanpa polling API buatan.
 */
export function StatusAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const interval = window.setInterval(() => {
      router.refresh();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [router]);

  return null;
}

'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)ws_csrf=([^;]+)/);
  return match?.[1] ?? '';
}

export function MarkAllReadButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const markAll = useCallback(async () => {
    setBusy(true);
    try {
      await fetch('/api/account/notifications', {
        method: 'PATCH',
        headers: { 'x-csrf-token': getCsrfToken() },
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }, [router]);

  return (
    <Button variant="outline" size="sm" onClick={() => void markAll()} disabled={disabled || busy} loading={busy}>
      <CheckCheck className="h-4 w-4" aria-hidden="true" />
      Tandai Semua Dibaca
    </Button>
  );
}

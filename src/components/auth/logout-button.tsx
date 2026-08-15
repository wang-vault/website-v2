'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)ws_csrf=([^;]+)/);
  return match?.[1] ?? '';
}

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const logout = useCallback(async () => {
    setBusy(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'x-csrf-token': getCsrfToken() },
      });
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }, [router]);

  return (
    <button
      type="button"
      onClick={() => void logout()}
      disabled={busy}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-muted hover:text-text-primary disabled:opacity-50',
        className,
      )}
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      Keluar
    </button>
  );
}

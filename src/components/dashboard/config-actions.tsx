'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)ws_csrf=([^;]+)/);
  return match?.[1] ?? '';
}

export function DeleteConfigButton({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const remove = useCallback(async () => {
    setBusy(true);
    try {
      const response = await fetch(`/api/account/saved-configurations/${id}`, {
        method: 'DELETE',
        headers: { 'x-csrf-token': getCsrfToken() },
      });
      if (response.ok) {
        toast({ variant: 'success', title: 'Konfigurasi dihapus' });
        router.refresh();
      } else {
        toast({ variant: 'error', title: 'Gagal menghapus' });
      }
    } catch {
      toast({ variant: 'error', title: 'Jaringan bermasalah' });
    } finally {
      setBusy(false);
    }
  }, [id, router, toast]);

  return (
    <button
      type="button"
      onClick={() => void remove()}
      disabled={busy}
      aria-label="Hapus konfigurasi"
      className="rounded-md p-1.5 text-text-muted hover:bg-surface-muted hover:text-error disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

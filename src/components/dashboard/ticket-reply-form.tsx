'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)ws_csrf=([^;]+)/);
  return match?.[1] ?? '';
}

export function TicketReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify({ message }),
      });
      const result = (await response.json()) as { success: boolean; message: string };
      if (result.success) {
        setMessage('');
        router.refresh();
      } else {
        toast({ variant: 'error', title: 'Gagal mengirim', message: result.message });
      }
    } catch {
      toast({ variant: 'error', title: 'Jaringan bermasalah' });
    } finally {
      setSubmitting(false);
    }
  }, [message, ticketId, router, toast]);

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Tulis balasan…"
        rows={4}
        aria-label="Balasan tiket"
      />
      <Button type="submit" loading={submitting} disabled={!message.trim()}>
        <Send className="h-4 w-4" aria-hidden="true" />
        Kirim Balasan
      </Button>
    </form>
  );
}

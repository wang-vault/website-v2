'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)ws_csrf=([^;]+)/);
  return match?.[1] ?? '';
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Rendah — pertanyaan umum' },
  { value: 'medium', label: 'Normal — masalah umum' },
  { value: 'high', label: 'Tinggi — gangguan berdampak' },
  { value: 'critical', label: 'Kritis — gangguan total' },
];

export function TicketForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState({ subject: '', message: '', priority: 'medium' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const update = useCallback((field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const submit = useCallback(async () => {
    const nextErrors: Record<string, string> = {};
    if (form.subject.trim().length < 5) nextErrors.subject = 'Subjek minimal 5 karakter.';
    if (form.message.trim().length < 10) nextErrors.message = 'Pesan minimal 10 karakter.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as { success: boolean; message: string; data?: { id: string } };
      if (result.success && result.data) {
        toast({ variant: 'success', title: 'Tiket berhasil dibuat', message: `Tiket ${result.data.id}` });
        router.push(`/dashboard/tickets/${result.data.id}`);
        router.refresh();
      } else {
        toast({ variant: 'error', title: 'Gagal membuat tiket', message: result.message });
      }
    } catch {
      toast({ variant: 'error', title: 'Jaringan bermasalah' });
    } finally {
      setSubmitting(false);
    }
  }, [form, router, toast]);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      noValidate
    >
      <Field label="Subjek" required error={errors.subject}>
        <Input
          value={form.subject}
          onChange={(e) => update('subject', e.target.value)}
          invalid={Boolean(errors.subject)}
          placeholder="Contoh: Pertanyaan tentang paket High"
        />
      </Field>
      <Field label="Prioritas" hint="Kritis hanya untuk gangguan total layanan.">
        <Select
          value={form.priority}
          onChange={(e) => update('priority', e.target.value)}
          options={PRIORITY_OPTIONS}
        />
      </Field>
      <Field label="Pesan" required error={errors.message}>
        <Textarea
          value={form.message}
          onChange={(e) => update('message', e.target.value)}
          invalid={Boolean(errors.message)}
          placeholder="Jelaskan pertanyaan atau masalah Anda selengkap mungkin."
          rows={6}
        />
      </Field>
      <Button type="submit" loading={submitting}>
        <Send className="h-4 w-4" aria-hidden="true" />
        Buat Tiket
      </Button>
    </form>
  );
}

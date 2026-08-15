'use client';

import { useCallback, useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)ws_csrf=([^;]+)/);
  return match?.[1] ?? '';
}

export function ContactForm({ turnstileSiteKey }: { turnstileSiteKey: string | null }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const update = useCallback((field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const submit = useCallback(async () => {
    const nextErrors: Record<string, string> = {};
    if (form.name.trim().length < 2) nextErrors.name = 'Nama minimal 2 karakter.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Format email tidak valid.';
    if (form.subject.trim().length < 3) nextErrors.subject = 'Subjek minimal 3 karakter.';
    if (form.message.trim().length < 10) nextErrors.message = 'Pesan minimal 10 karakter.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      let turnstileToken: string | null = null;
      if (turnstileSiteKey && typeof window !== 'undefined' && 'turnstile' in window) {
        turnstileToken =
          (window as unknown as { turnstile?: { getResponse: () => string } }).turnstile?.getResponse() ?? '';
      }
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify({ ...form, turnstileToken }),
      });
      const result = (await response.json()) as { success: boolean; message: string };
      if (result.success) {
        setForm({ name: '', email: '', subject: '', message: '' });
        toast({ variant: 'success', title: 'Pesan terkirim', message: 'Tim kami akan menghubungi Anda secepatnya.' });
      } else {
        toast({ variant: 'error', title: 'Gagal mengirim', message: result.message });
      }
    } catch {
      toast({ variant: 'error', title: 'Jaringan bermasalah', message: 'Tidak dapat menghubungi server. Coba lagi.' });
    } finally {
      setSubmitting(false);
    }
  }, [form, turnstileSiteKey, toast]);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      noValidate
    >
      <Field label="Nama" required error={errors.name}>
        <Input
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          invalid={Boolean(errors.name)}
          autoComplete="name"
          placeholder="Nama Anda"
        />
      </Field>
      <Field label="Email" required error={errors.email}>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          invalid={Boolean(errors.email)}
          autoComplete="email"
          placeholder="nama@email.com"
        />
      </Field>
      <Field label="Subjek" required error={errors.subject}>
        <Input
          value={form.subject}
          onChange={(e) => update('subject', e.target.value)}
          invalid={Boolean(errors.subject)}
          placeholder="Konsultasi sebelum memesan"
        />
      </Field>
      <Field label="Pesan" required error={errors.message}>
        <Textarea
          value={form.message}
          onChange={(e) => update('message', e.target.value)}
          invalid={Boolean(errors.message)}
          placeholder="Ceritakan kebutuhan atau pertanyaan Anda."
          rows={6}
          maxLength={5000}
        />
      </Field>
      <Button type="submit" loading={submitting}>
        <Send className="h-4 w-4" aria-hidden="true" />
        Kirim Pesan
      </Button>
    </form>
  );
}

'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)ws_csrf=([^;]+)/);
  return match?.[1] ?? '';
}

export interface ProfileFormValues {
  fullName: string;
  whatsapp: string;
  discord: string;
  bio: string;
}

export function ProfileForm({ initial }: { initial: ProfileFormValues }) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<ProfileFormValues>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const update = useCallback((field: keyof ProfileFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const submit = useCallback(async () => {
    const nextErrors: Record<string, string> = {};
    if (form.fullName.trim().length < 2) nextErrors.fullName = 'Nama minimal 2 karakter.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as { success: boolean; message: string };
      if (result.success) {
        toast({ variant: 'success', title: 'Profil diperbarui' });
        router.refresh();
      } else {
        toast({ variant: 'error', title: 'Gagal menyimpan', message: result.message });
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
      <Field label="Nama Lengkap" required error={errors.fullName}>
        <Input value={form.fullName} onChange={(e) => update('fullName', e.target.value)} invalid={Boolean(errors.fullName)} />
      </Field>
      <Field label="WhatsApp" hint="Format internasional tanpa +, contoh: 6281234567890">
        <Input value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} inputMode="tel" />
      </Field>
      <Field label="Discord" hint="Username Discord Anda (opsional).">
        <Input value={form.discord} onChange={(e) => update('discord', e.target.value)} />
      </Field>
      <Field label="Bio" hint="Opsional — maksimal 500 karakter.">
        <Textarea value={form.bio} onChange={(e) => update('bio', e.target.value)} rows={3} maxLength={500} />
      </Field>
      <Button type="submit" loading={submitting}>
        <Save className="h-4 w-4" aria-hidden="true" />
        Simpan Profil
      </Button>
    </form>
  );
}

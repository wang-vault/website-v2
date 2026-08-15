'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)ws_csrf=([^;]+)/);
  return match?.[1] ?? '';
}

export interface SettingsFieldDef {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'checkbox' | 'select' | 'string-list';
  hint?: string;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export function SettingsForm({
  fields,
  initial,
  endpoint = '/api/admin/settings',
  successMessage = 'Pengaturan disimpan',
}: {
  fields: SettingsFieldDef[];
  initial: Record<string, unknown>;
  endpoint?: string;
  successMessage?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, unknown>>(() => {
    const next: Record<string, unknown> = {};
    for (const field of fields) {
      const raw = initial[field.key];
      if (field.type === 'string-list') {
        next[field.key] = Array.isArray(raw) ? (raw as string[]).join(', ') : String(raw ?? '');
      } else {
        next[field.key] = raw ?? (field.type === 'checkbox' ? false : '');
      }
    }
    return next;
  });
  const [saving, setSaving] = useState(false);

  const set = useCallback((key: string, value: unknown) => {
    setForm((current) => ({ ...current, [key]: value }));
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const field of fields) {
        const raw = form[field.key];
        if (field.type === 'string-list') {
          payload[field.key] = String(raw ?? '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
        } else {
          payload[field.key] = raw;
        }
      }
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { success: boolean; message?: string };
      if (result.success) {
        toast({ variant: 'success', title: successMessage });
        router.refresh();
      } else {
        toast({ variant: 'error', title: 'Gagal menyimpan', message: result.message });
      }
    } catch {
      toast({ variant: 'error', title: 'Jaringan bermasalah' });
    } finally {
      setSaving(false);
    }
  }, [endpoint, fields, form, router, successMessage, toast]);

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const value = form[field.key];
        switch (field.type) {
          case 'textarea':
            return (
              <Field key={field.key} label={field.label} hint={field.hint}>
                <Textarea
                  value={String(value ?? '')}
                  onChange={(e) => set(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={4}
                />
              </Field>
            );
          case 'checkbox':
            return (
              <div key={field.key}>
                <Checkbox checked={value === true} onChange={(e) => set(field.key, e.target.checked)} label={field.label} />
                {field.hint ? <p className="mt-1 text-xs text-text-muted">{field.hint}</p> : null}
              </div>
            );
          case 'select':
            return (
              <Field key={field.key} label={field.label} hint={field.hint}>
                <Select
                  value={String(value ?? '')}
                  onChange={(e) => set(field.key, e.target.value)}
                  options={field.options ?? []}
                />
              </Field>
            );
          case 'string-list':
            return (
              <Field key={field.key} label={field.label} hint={field.hint ?? 'Pisahkan dengan koma.'}>
                <Input value={String(value ?? '')} onChange={(e) => set(field.key, e.target.value)} placeholder={field.placeholder} />
              </Field>
            );
          default:
            return (
              <Field key={field.key} label={field.label} hint={field.hint}>
                <Input value={String(value ?? '')} onChange={(e) => set(field.key, e.target.value)} placeholder={field.placeholder} />
              </Field>
            );
        }
      })}
      <Button onClick={() => void save()} loading={saving}>
        <Save className="h-4 w-4" aria-hidden="true" />
        Simpan
      </Button>
    </div>
  );
}

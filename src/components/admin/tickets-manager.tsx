'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Textarea } from '@/components/ui/input';
import { Pagination } from '@/components/ui/table';
import { EmptyState, LoadingState } from '@/components/ui/state';
import { useToast } from '@/components/ui/toast';
import { formatDateTime } from '@/lib/utils';
import { TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS } from '@/types';
import type { TicketMessageRecord, TicketPriority, TicketRecord, TicketStatus } from '@/types';

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)ws_csrf=([^;]+)/);
  return match?.[1] ?? '';
}

interface TicketListResponse {
  success: boolean;
  data?: { items: TicketRecord[]; total: number; page: number; pageSize: number };
}

interface TicketDetailResponse {
  success: boolean;
  data?: { ticket: TicketRecord; messages: TicketMessageRecord[] };
}

const PAGE_SIZE = 25;

export function TicketsManager() {
  const { toast } = useToast();
  const [items, setItems] = useState<TicketRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ ticket: TicketRecord; messages: TicketMessageRecord[] } | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(
    async (targetPage: number, targetStatus: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(targetPage), pageSize: String(PAGE_SIZE) });
        if (targetStatus) params.set('status', targetStatus);
        const response = await fetch(`/api/admin/tickets?${params.toString()}`, { cache: 'no-store' });
        const result = (await response.json()) as TicketListResponse;
        if (result.success && result.data) {
          setItems(result.data.items);
          setTotal(result.data.total);
        }
      } catch {
        toast({ variant: 'error', title: 'Gagal memuat tiket' });
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    void load(page, status);
  }, [load, page, status]);

  const openTicket = useCallback(
    async (id: string) => {
      setActiveId(id);
      setDetail(null);
      try {
        const response = await fetch(`/api/admin/tickets/${id}`, { cache: 'no-store' });
        const result = (await response.json()) as TicketDetailResponse;
        if (result.success && result.data) setDetail(result.data);
      } catch {
        toast({ variant: 'error', title: 'Gagal memuat tiket' });
      }
    },
    [toast],
  );

  const updateTicket = useCallback(
    async (id: string, patch: { status?: TicketStatus; priority?: TicketPriority }) => {
      try {
        const response = await fetch(`/api/admin/tickets/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
          body: JSON.stringify(patch),
        });
        const result = (await response.json()) as { success: boolean; message?: string };
        if (result.success) {
          toast({ variant: 'success', title: 'Tiket diperbarui' });
          await Promise.all([load(page, status), openTicket(id)]);
        } else {
          toast({ variant: 'error', title: 'Gagal', message: result.message });
        }
      } catch {
        toast({ variant: 'error', title: 'Jaringan bermasalah' });
      }
    },
    [load, openTicket, page, status, toast],
  );

  const sendReply = useCallback(async () => {
    if (!activeId || !reply.trim()) return;
    setSending(true);
    try {
      const response = await fetch(`/api/admin/tickets/${activeId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify({ message: reply }),
      });
      const result = (await response.json()) as { success: boolean; message?: string };
      if (result.success) {
        setReply('');
        toast({ variant: 'success', title: 'Balasan terkirim' });
        await Promise.all([load(page, status), openTicket(activeId)]);
      } else {
        toast({ variant: 'error', title: 'Gagal mengirim', message: result.message });
      }
    } catch {
      toast({ variant: 'error', title: 'Jaringan bermasalah' });
    } finally {
      setSending(false);
    }
  }, [activeId, reply, load, openTicket, page, status, toast]);

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <section aria-label="Daftar tiket" className="space-y-3">
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          options={[
            { value: '', label: 'Semua status' },
            { value: 'open', label: 'Terbuka' },
            { value: 'pending', label: 'Menunggu Balasan' },
            { value: 'closed', label: 'Ditutup' },
          ]}
          aria-label="Filter status tiket"
        />
        {loading ? (
          <LoadingState label="Memuat tiket…" />
        ) : items.length === 0 ? (
          <EmptyState title="Belum ada tiket" description="Tiket dan pesan kontak masuk akan muncul di sini." />
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {items.map((ticket) => (
              <li key={ticket.id}>
                <button
                  type="button"
                  onClick={() => void openTicket(ticket.id)}
                  className={activeId === ticket.id ? 'block w-full bg-surface-muted px-4 py-3 text-left' : 'block w-full px-4 py-3 text-left hover:bg-surface-muted/50'}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-text-muted">{ticket.id}</span>
                    <Badge variant={ticket.status === 'closed' ? 'neutral' : ticket.status === 'open' ? 'info' : 'success'}>
                      {TICKET_STATUS_LABELS[ticket.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-text-primary">{ticket.subject}</p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {ticket.customerEmail} · {TICKET_PRIORITY_LABELS[ticket.priority]}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </section>

      <section aria-label="Detail tiket" className="min-w-0">
        {!detail ? (
          <EmptyState title="Pilih tiket untuk melihat percakapan" description="Klik tiket di daftar sebelah kiri." />
        ) : (
          <div className="space-y-4">
            <header className="rounded-lg border border-border bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-xs text-text-muted">{detail.ticket.id}</p>
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={detail.ticket.priority}
                    onChange={(e) => void updateTicket(detail.ticket.id, { priority: e.target.value as TicketPriority })}
                    options={(['low', 'medium', 'high', 'critical'] as TicketPriority[]).map((p) => ({
                      value: p,
                      label: TICKET_PRIORITY_LABELS[p],
                    }))}
                    aria-label="Prioritas tiket"
                    className="h-8 w-auto py-0 text-xs"
                  />
                  <Select
                    value={detail.ticket.status}
                    onChange={(e) => void updateTicket(detail.ticket.id, { status: e.target.value as TicketStatus })}
                    options={(['open', 'pending', 'closed'] as TicketStatus[]).map((s) => ({
                      value: s,
                      label: TICKET_STATUS_LABELS[s],
                    }))}
                    aria-label="Status tiket"
                    className="h-8 w-auto py-0 text-xs"
                  />
                </div>
              </div>
              <h2 className="mt-2 text-base font-semibold text-text-primary">{detail.ticket.subject}</h2>
              <p className="mt-1 text-xs text-text-muted">
                {detail.ticket.customerEmail} · Dibuat {formatDateTime(detail.ticket.createdAt)}
              </p>
            </header>

            <ol className="space-y-3" aria-label="Percakapan">
              {detail.messages.map((message) => (
                <li
                  key={message.id}
                  className={message.isStaff ? 'ml-8 rounded-lg border border-border bg-surface p-4' : 'mr-8 rounded-lg bg-surface-muted p-4'}
                >
                  <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                    <span className="font-medium text-text-secondary">{message.isStaff ? 'Staf' : 'Pelanggan'}</span>
                    <span>·</span>
                    <span>{message.authorEmail}</span>
                    <span>·</span>
                    <span>{formatDateTime(message.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">{message.message}</p>
                </li>
              ))}
            </ol>

            {detail.ticket.status === 'closed' ? (
              <p className="rounded-lg border border-border bg-surface-muted p-4 text-sm text-text-secondary">
                Tiket ditutup. Ubah status menjadi Terbuka untuk membalas.
              </p>
            ) : (
              <div className="rounded-lg border border-border bg-surface p-4">
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Tulis balasan…"
                  rows={4}
                  aria-label="Balasan staf"
                />
                <div className="mt-3">
                  <Button onClick={() => void sendReply()} loading={sending} disabled={!reply.trim()}>
                    Kirim Balasan
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

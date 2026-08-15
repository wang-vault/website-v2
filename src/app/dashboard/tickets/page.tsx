import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { TicketForm } from '@/components/dashboard/ticket-form';
import { EmptyState } from '@/components/ui/state';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS } from '@/types';
import type { TicketRecord } from '@/types';

const STATUS_VARIANT: Record<TicketRecord['status'], 'success' | 'info' | 'neutral'> = {
  open: 'info',
  pending: 'success',
  closed: 'neutral',
};

export default async function DashboardTicketsPage() {
  const sessionContext = await getSession();
  if (!sessionContext) return null;
  const db = await getDb();
  const tickets = await db.tickets.listByUser(sessionContext.session.sub);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Tiket</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Tiket dukungan Anda dan statusnya. Target respons: Kritis 15 menit · Tinggi 1 jam · Normal 4 jam ·
          Rendah 12 jam.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section aria-labelledby="daftar-tiket">
          <h2 id="daftar-tiket" className="mb-3 text-base font-semibold text-text-primary">
            Daftar Tiket
          </h2>
          {tickets.length === 0 ? (
            <EmptyState
              title="Belum ada tiket"
              description="Buat tiket untuk bertanya atau melaporkan masalah. Tim kami akan membalas secepatnya."
            />
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
              {tickets.map((ticket) => (
                <li key={ticket.id}>
                  <Link href={`/dashboard/tickets/${ticket.id}`} className="block px-5 py-4 hover:bg-surface-muted/50">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-mono text-xs text-text-muted">{ticket.id}</p>
                      <div className="flex gap-2">
                        <Badge variant="neutral">{TICKET_PRIORITY_LABELS[ticket.priority]}</Badge>
                        <Badge variant={STATUS_VARIANT[ticket.status]}>{TICKET_STATUS_LABELS[ticket.status]}</Badge>
                      </div>
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-text-primary">{ticket.subject}</p>
                    <p className="mt-0.5 text-xs text-text-muted">{formatDate(ticket.createdAt)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="buat-tiket" className="rounded-lg border border-border bg-surface p-5 lg:self-start">
          <h2 id="buat-tiket" className="text-base font-semibold text-text-primary">
            Buat Tiket Baru
          </h2>
          <p className="mb-4 mt-1 text-sm text-text-secondary">
            Sertakan Order ID jika tiket terkait pesanan tertentu.
          </p>
          <TicketForm />
        </section>
      </div>
    </div>
  );
}

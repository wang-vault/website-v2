import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { TicketReplyForm } from '@/components/dashboard/ticket-reply-form';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';
import { TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS } from '@/types';

export default async function DashboardTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessionContext = await getSession();
  if (!sessionContext) return null;
  const db = await getDb();

  const ticket = await db.tickets.findById(id);
  if (!ticket || ticket.userId !== sessionContext.session.sub) notFound();
  const messages = await db.tickets.messages(id);

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/tickets"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Kembali ke daftar tiket
      </Link>

      <header className="rounded-lg border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-xs text-text-muted">{ticket.id}</p>
          <div className="flex gap-2">
            <Badge variant="neutral">{TICKET_PRIORITY_LABELS[ticket.priority]}</Badge>
            <Badge variant={ticket.status === 'closed' ? 'neutral' : 'info'}>{TICKET_STATUS_LABELS[ticket.status]}</Badge>
          </div>
        </div>
        <h1 className="mt-2 text-lg font-semibold text-text-primary">{ticket.subject}</h1>
        <p className="mt-1 text-xs text-text-muted">Dibuat {formatDateTime(ticket.createdAt)}</p>
      </header>

      <ol className="space-y-3" aria-label="Riwayat percakapan">
        {messages.map((message) => (
          <li
            key={message.id}
            className={message.isStaff ? 'ml-8 rounded-lg border border-border bg-surface p-4' : 'mr-8 rounded-lg bg-surface-muted p-4'}
          >
            <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-text-muted">
              <span className="font-medium text-text-secondary">{message.isStaff ? 'Tim WangStore' : 'Anda'}</span>
              <span>·</span>
              <span>{formatDateTime(message.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">{message.message}</p>
          </li>
        ))}
      </ol>

      {ticket.status === 'closed' ? (
        <p className="rounded-lg border border-border bg-surface-muted p-4 text-sm text-text-secondary">
          Tiket ini sudah ditutup. Hubungi kami melalui{' '}
          <Link href="/contact" className="font-medium text-text-primary underline underline-offset-4">
            halaman Kontak
          </Link>{' '}
          jika Anda membutuhkan bantuan lanjutan.
        </p>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-5">
          <h2 className="mb-3 text-sm font-semibold text-text-primary">Balas</h2>
          <TicketReplyForm ticketId={ticket.id} />
        </div>
      )}
    </div>
  );
}

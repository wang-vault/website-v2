import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { MarkAllReadButton } from '@/components/dashboard/mark-read-button';
import { EmptyState } from '@/components/ui/state';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default async function DashboardNotificationsPage() {
  const sessionContext = await getSession();
  if (!sessionContext) return null;
  const db = await getDb();
  const notifications = await db.notifications.listByUser(sessionContext.session.sub, 50);
  const unread = notifications.some((n) => !n.read);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Notifikasi</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Pemberitahuan tentang pesanan, tiket, dan aktivitas akun Anda.
          </p>
        </div>
        <MarkAllReadButton disabled={!unread} />
      </header>

      {notifications.length === 0 ? (
        <EmptyState
          title="Belum ada notifikasi"
          description="Notifikasi akan muncul di sini saat ada pembaruan pada pesanan atau tiket Anda."
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={cn('px-5 py-4', !notification.read && 'bg-surface-muted/60')}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">{notification.title}</p>
                  <p className="mt-0.5 text-sm text-text-secondary">{notification.message}</p>
                  <p className="mt-1 text-xs text-text-muted">{formatDateTime(notification.createdAt)}</p>
                </div>
                {!notification.read ? (
                  <span aria-label="Belum dibaca" className="mt-1 h-2 w-2 shrink-0 rounded-full bg-info" />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

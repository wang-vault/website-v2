import type { Metadata } from 'next';
import { CircleCheck, CircleX, TriangleAlert, Wrench, History } from 'lucide-react';
import { getDb } from '@/lib/db';
import { formatDateTime, timeAgo } from '@/lib/utils';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/state';
import { StatusAutoRefresh } from '@/components/status-refresh';
import { INCIDENT_STATUS_LABELS, MAINTENANCE_STATUS_LABELS } from '@/types';
import type { IncidentStatus } from '@/types';

export const metadata: Metadata = {
  title: 'Status Layanan',
  description: 'Status platform, layanan, pemeliharaan, dan riwayat insiden WangStore.',
};

const PLATFORM_STATUS: Record<string, { label: string; variant: BadgeVariant; icon: typeof CircleCheck }> = {
  operational: { label: 'Operasional', variant: 'success', icon: CircleCheck },
  degraded: { label: 'Gangguan Sebagian', variant: 'warning', icon: TriangleAlert },
  outage: { label: 'Gangguan Total', variant: 'error', icon: CircleX },
  maintenance: { label: 'Dalam Pemeliharaan', variant: 'info', icon: Wrench },
};

const INCIDENT_VARIANT: Record<IncidentStatus, BadgeVariant> = {
  investigating: 'error',
  identified: 'warning',
  monitoring: 'info',
  resolved: 'success',
};

export default async function StatusPage() {
  const db = await getDb();
  const [settings, incidents, maintenance, activeMaintenance] = await Promise.all([
    db.settings.get(),
    db.incidents.list(),
    db.maintenance.list(),
    db.maintenance.listActive(),
  ]);

  const platform =
    PLATFORM_STATUS[settings.platformStatus] ?? { label: 'Operasional', variant: 'success' as const, icon: CircleCheck };
  const PlatformIcon = platform.icon;
  const openIncidents = incidents.filter((incident) => incident.status !== 'resolved');
  const history = incidents.filter((incident) => incident.status === 'resolved').slice(0, 10);
  const upcoming = maintenance.filter((m) => m.status === 'scheduled');

  return (
    <div className="container-page py-10">
      <StatusAutoRefresh />
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">Status</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-text-primary">Status Layanan</h1>
          <p className="mt-3 text-sm leading-relaxed text-text-secondary">
            Kondisi platform WangStore dikelola langsung oleh tim kami. Halaman ini diperbarui otomatis
            maksimal setiap 60 detik. WangStore tidak menampilkan data monitoring palsu — jika data tidak
            tersedia, kami menyatakannya.
          </p>
        </header>

        {/* Status platform */}
        <section aria-labelledby="status-platform" className="rounded-lg border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <PlatformIcon className="h-5 w-5 text-text-primary" aria-hidden="true" />
            <h2 id="status-platform" className="text-base font-semibold text-text-primary">
              Platform WangStore
            </h2>
            <Badge variant={platform.variant} className="ml-auto">
              {platform.label}
            </Badge>
          </div>

          <ul className="mt-4 divide-y divide-border">
            {settings.services.map((service) => {
              const status =
                PLATFORM_STATUS[service.status] ?? { label: 'Operasional', variant: 'success' as const, icon: CircleCheck };
              const Icon = status.icon;
              return (
                <li key={service.name} className="flex items-center gap-3 py-3">
                  <Icon className="h-4 w-4 text-text-secondary" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary">{service.name}</p>
                    {service.description ? (
                      <p className="text-xs text-text-muted">{service.description}</p>
                    ) : null}
                  </div>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Uptime */}
        <section aria-labelledby="uptime" className="mt-6 rounded-lg border border-border bg-surface p-5">
          <h2 id="uptime" className="text-base font-semibold text-text-primary">
            Uptime
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            Target uptime platform WangStore adalah <strong>99,9%</strong> per bulan. Data uptime terukur akan
            ditampilkan di sini setelah sistem monitoring uptime terhubung — saat ini data tersebut belum
            tersedia, sehingga kami tidak menampilkan angka yang tidak dapat diverifikasi.
          </p>
        </section>

        {/* Maintenance aktif */}
        {activeMaintenance.length > 0 ? (
          <section aria-labelledby="maintenance" className="mt-6">
            <h2 id="maintenance" className="mb-3 text-base font-semibold text-text-primary">
              Pemeliharaan Sedang Berlangsung
            </h2>
            <div className="space-y-3">
              {activeMaintenance.map((window) => (
                <div key={window.id} className="rounded-lg border border-info/30 bg-info/5 p-5">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-info" aria-hidden="true" />
                    <h3 className="text-sm font-semibold text-text-primary">{window.title}</h3>
                  </div>
                  <p className="mt-2 text-sm text-text-secondary">{window.description}</p>
                  <p className="mt-2 text-xs text-text-muted">
                    {formatDateTime(window.startsAt)} — {formatDateTime(window.endsAt)}
                    {window.affectedServices.length > 0 ? ` · Berdampak: ${window.affectedServices.join(', ')}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Insiden aktif */}
        <section aria-labelledby="insiden" className="mt-6">
          <h2 id="insiden" className="mb-3 text-base font-semibold text-text-primary">
            Insiden Aktif
          </h2>
          {openIncidents.length === 0 ? (
            <EmptyState
              title="Tidak ada insiden aktif"
              description="Semua sistem berjalan normal. Insiden yang terjadi akan ditampilkan di sini beserta timeline-nya."
            />
          ) : (
            <div className="space-y-3">
              {openIncidents.map((incident) => (
                <div key={incident.id} className="rounded-lg border border-border bg-surface p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-text-primary">{incident.title}</h3>
                    <Badge variant={INCIDENT_VARIANT[incident.status]}>
                      {INCIDENT_STATUS_LABELS[incident.status]}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-text-secondary">{incident.description}</p>
                  <p className="mt-2 text-xs text-text-muted">
                    Dimulai {formatDateTime(incident.startedAt)}
                    {incident.affectedServices.length > 0
                      ? ` · Berdampak: ${incident.affectedServices.join(', ')}`
                      : ''}
                  </p>
                  {incident.updates.length > 0 ? (
                    <ol className="mt-4 space-y-2 border-t border-border pt-4">
                      {incident.updates.map((update) => (
                        <li key={update.id} className="flex gap-3 text-sm">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-text-muted" aria-hidden="true" />
                          <div>
                            <p className="text-text-secondary">{update.message}</p>
                            <p className="text-xs text-text-muted">{formatDateTime(update.createdAt)}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Pemeliharaan terjadwal */}
        {upcoming.length > 0 ? (
          <section aria-labelledby="pemeliharaan-jadwal" className="mt-6">
            <h2 id="pemeliharaan-jadwal" className="mb-3 text-base font-semibold text-text-primary">
              Pemeliharaan Terjadwal
            </h2>
            <div className="space-y-3">
              {upcoming.map((window) => (
                <div key={window.id} className="rounded-lg border border-border bg-surface p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-text-primary">{window.title}</h3>
                    <Badge variant="info">{MAINTENANCE_STATUS_LABELS[window.status]}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-text-secondary">{window.description}</p>
                  <p className="mt-2 text-xs text-text-muted">
                    {formatDateTime(window.startsAt)} — {formatDateTime(window.endsAt)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Riwayat insiden */}
        <section aria-labelledby="riwayat" className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <History className="h-4 w-4 text-text-muted" aria-hidden="true" />
            <h2 id="riwayat" className="text-base font-semibold text-text-primary">
              Riwayat Insiden
            </h2>
          </div>
          {history.length === 0 ? (
            <EmptyState
              title="Belum ada riwayat insiden"
              description="Riwayat insiden yang telah diselesaikan akan muncul di sini."
            />
          ) : (
            <div className="space-y-2">
              {history.map((incident) => (
                <div key={incident.id} className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-text-primary">{incident.title}</h3>
                    <span className="text-xs text-text-muted">{timeAgo(incident.startedAt)}</span>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">
                    Berlangsung {formatDateTime(incident.startedAt)} — {formatDateTime(incident.resolvedAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

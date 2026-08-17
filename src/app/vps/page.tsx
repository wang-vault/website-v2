import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { resolveCatalogStatus } from '@/lib/catalog';
import { VpsCatalog, type VpsSession } from '@/components/vps/vps-catalog';
import { TurnstileWidget } from '@/components/turnstile-widget';

export const metadata: Metadata = {
  title: 'VPS',
  description:
    'Paket VPS WangStore: vCPU, RAM, penyimpanan NVMe, dan kuota transfer dengan harga final per bulan. Pesan langsung dan kelola dari dashboard.',
  openGraph: {
    title: 'VPS — WangStore',
    description: 'Paket VPS dengan spesifikasi dan harga final. Pesan langsung dari WangStore.',
  },
};

export default async function VpsPage() {
  const [db, sessionContext] = await Promise.all([getDb(), getSession()]);
  const [packages, settings, profile] = await Promise.all([
    db.vpsPackages.list(),
    db.settings.get(),
    sessionContext ? db.profiles.get(sessionContext.session.sub) : Promise.resolve(null),
  ]);

  const status = resolveCatalogStatus(settings).vps;
  const session: VpsSession | null = sessionContext
    ? {
        email: sessionContext.session.email,
        fullName: profile?.fullName ?? '',
        whatsapp: profile?.whatsapp ?? '',
      }
    : null;

  return (
    <div className="container-page py-10">
      <div className="mb-8 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">VPS</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
          Paket VPS WangStore
        </h1>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-text-secondary">
          Virtual Private Server dengan spesifikasi dan harga final per bulan — untuk aplikasi web, bot,
          database, panel, dan kebutuhan developer lainnya. Pesanan diproses melalui alur yang sama dengan
          layanan lain: order tercatat di dashboard Anda dan dikonfirmasi lewat WhatsApp.
        </p>
      </div>

      <TurnstileWidget siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''} />
      <VpsCatalog
        packages={packages.filter((pkg) => pkg.active)}
        status={status}
        session={session}
        turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null}
      />
    </div>
  );
}

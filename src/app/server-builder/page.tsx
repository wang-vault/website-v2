import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { ServerBuilder, type BuilderSession } from '@/components/builder/server-builder';
import { TurnstileWidget } from '@/components/turnstile-widget';
import type { LowPricingConstants } from '@/lib/pricing';

export const metadata: Metadata = {
  title: 'Server Builder',
  description:
    'Bangun server Anda sendiri: pilih tier, atur CPU, RAM, dan penyimpanan, lihat harga dan estimasi performa secara real-time.',
  openGraph: {
    title: 'Server Builder — WangStore',
    description: 'Bangun server Anda sendiri dengan harga real-time.',
  },
};

export default async function ServerBuilderPage() {
  const [db, sessionContext] = await Promise.all([getDb(), getSession()]);
  const [packages, pricingRules, settings, profile, user] = await Promise.all([
    db.packages.list(),
    db.pricing.get(),
    db.settings.get(),
    sessionContext ? db.profiles.get(sessionContext.session.sub) : Promise.resolve(null),
    sessionContext ? db.users.findById(sessionContext.session.sub) : Promise.resolve(null),
  ]);

  const pricing: LowPricingConstants = {
    base: pricingRules.base,
    perCore: pricingRules.perCore,
    perGbRam: pricingRules.perGbRam,
    perGbStorage: pricingRules.perGbStorage,
    roundTo: pricingRules.roundTo,
    minPrice: pricingRules.minPrice,
  };

  const session: BuilderSession | null = sessionContext
    ? {
        loggedIn: true,
        email: sessionContext.session.email,
        fullName: profile?.fullName ?? '',
        whatsapp: profile?.whatsapp ?? '',
      }
    : null;

  const activePackages = packages.filter((p) => p.active);

  return (
    <div className="container-page py-10">
      <div className="mb-8 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">Server Builder</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
          Bangun server Anda sendiri
        </h1>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-text-secondary">
          Pilih tier, tentukan CPU, RAM, dan penyimpanan — lihat harga dan estimasi performa secara real-time.
          Harga final dihitung ulang oleh server saat order dibuat.
        </p>
      </div>

      <TurnstileWidget siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''} />
      <ServerBuilder
        session={session}
        packages={activePackages}
        pricing={pricing}
        whatsappNumber={settings.whatsappNumber}
        turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null}
      />
    </div>
  );
}

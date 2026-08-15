import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Calculator,
  CheckCircle2,
  Clock,
  FileCheck2,
  Headphones,
  Package,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
} from 'lucide-react';
import { getDb } from '@/lib/db';
import { formatRupiahPerMonth, truncate } from '@/lib/utils';
import { ButtonLink } from '@/components/ui/button-link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SectionHeading } from '@/components/ui/misc';
import { Markdown } from '@/components/markdown';

export const metadata: Metadata = {
  title: 'WangStore — Build Your Own Server',
  description:
    'Platform untuk menjual dan mengelola layanan hosting: Minecraft Hosting, VPS, Dedicated Server, dan Panel Hosting. Bangun server Anda sendiri dengan Server Builder.',
};

const HOW_IT_WORKS = [
  {
    icon: SlidersHorizontal,
    title: 'Pilih & konfigurasi',
    description:
      'Tentukan tier (Low custom atau High paket tetap), lalu atur CPU, RAM, dan penyimpanan melalui Server Builder.',
  },
  {
    icon: Calculator,
    title: 'Lihat harga real-time',
    description:
      'Harga dan estimasi performa diperbarui langsung sesuai konfigurasi. Rumus harga terbuka dan dapat dihitung sendiri.',
  },
  {
    icon: FileCheck2,
    title: 'Buat order',
    description:
      'Isi data pemesanan, setujui kebijakan, dan buat order. Sistem menghitung ulang harga dan menyimpan order Anda.',
  },
];

const ADVANTAGES = [
  {
    icon: Wallet,
    title: 'Harga transparan',
    description: 'Formula harga Low terbuka, harga paket High final. Tidak ada biaya tersembunyi.',
  },
  {
    icon: ShieldCheck,
    title: 'Keamanan berlapis',
    description: 'Validasi server-side, rate limiting, CSRF, audit log, dan RBAC di setiap lapisan.',
  },
  {
    icon: Headphones,
    title: 'Dukungan nyata',
    description: 'Tiket dengan target respons jelas, plus kanal WhatsApp dan Discord resmi.',
  },
  {
    icon: BadgeCheck,
    title: 'Klaim jujur',
    description: 'Tanpa uptime palsu, hardware fiktif, atau janji berlebihan. Apa yang tampil dapat dipertanggungjawabkan.',
  },
  {
    icon: Clock,
    title: 'Pesanan terlacak',
    description: 'Order ID, status, dan riwayat tersedia di halaman konfirmasi dan dashboard pelanggan.',
  },
  {
    icon: Server,
    title: 'Platform, bukan infra',
    description: 'WangStore mengelola penjualan dan akun; infrastruktur hosting pelanggan berada di luar aplikasi.',
  },
];

const ORDER_FLOW = [
  'Landing Page',
  'Server Builder',
  'Pilih Tier',
  'CPU / RAM / Penyimpanan',
  'Harga Real-time',
  'Isi Informasi',
  'Persetujuan Kebijakan',
  'Buat Order',
  'WhatsApp',
  'Order Tersimpan',
  'Customer Dashboard',
];

export default async function HomePage() {
  const db = await getDb();
  const [products, packages, faq, homePage, settings] = await Promise.all([
    db.products.list({ publicOnly: true }),
    db.packages.list(),
    db.faq.list({ activeOnly: true }),
    db.cmsPages.get('home'),
    db.settings.get(),
  ]);

  const activePackages = packages.filter((p) => p.active).sort((a, b) => a.sortOrder - b.sortOrder);
  const topFaq = faq.slice(0, 5);

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings.siteName,
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    slogan: settings.tagline,
    description: settings.siteDescription,
    sameAs: [settings.discordInviteUrl].filter(Boolean),
    contactPoint: settings.contactEmail
      ? {
          '@type': 'ContactPoint',
          email: settings.contactEmail,
          contactType: 'customer support',
          availableLanguage: ['Indonesian'],
        }
      : undefined,
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />

      {/* Hero */}
      <section className="border-b border-border bg-surface">
        <div className="container-page py-16 sm:py-24">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-text-secondary">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success" />
              Platform penjualan & pengelolaan layanan hosting
            </p>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
              {settings.tagline}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg">
              WangStore menyederhanakan cara Anda membeli layanan hosting: pilih tier, atur CPU, RAM, dan
              penyimpanan, lalu pesan — dengan harga transparan dan pesanan yang tercatat rapi.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/server-builder" variant="primary" size="lg">
                Buat Server
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="#paket" variant="outline" size="lg">
                Lihat Paket
              </ButtonLink>
            </div>
            <p className="mt-6 text-xs leading-relaxed text-text-muted">
              Minecraft Hosting tersedia. VPS, Dedicated Server, dan Panel Hosting sedang dipersiapkan —{' '}
              <Link href="/status" className="underline underline-offset-2 hover:text-text-primary">
                lihat status layanan
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Layanan */}
      <section className="container-page py-16" aria-labelledby="layanan">
        <SectionHeading
          eyebrow="Layanan"
          title="Layanan hosting"
          description="Katalog layanan WangStore. Tier yang berstatus Ongoing belum dapat dipesan."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <Package className="h-5 w-5 text-text-muted" aria-hidden="true" />
                  {product.tier === 'medium' ? (
                    <Badge variant="warning">Ongoing</Badge>
                  ) : (
                    <Badge variant="success">Tersedia</Badge>
                  )}
                </div>
                <h3 className="mt-3 text-base font-semibold text-text-primary">{product.name}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary">
                  {product.description}
                </p>
                <div className="mt-4">
                  {product.tier === 'medium' ? (
                    <span className="text-xs text-text-muted">Belum tersedia untuk pemesanan</span>
                  ) : (
                    <Link
                      href="/server-builder"
                      className="inline-flex items-center gap-1 text-sm font-medium text-text-primary underline-offset-4 hover:underline"
                    >
                      Konfigurasi <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          <Card className="flex flex-col border-dashed">
            <CardContent className="flex flex-1 flex-col">
              <div className="flex items-start justify-between gap-3">
                <Package className="h-5 w-5 text-text-muted" aria-hidden="true" />
                <Badge variant="neutral">Menyusul</Badge>
              </div>
              <h3 className="mt-3 text-base font-semibold text-text-primary">Layanan lainnya</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary">
                Kami akan menambah layanan hosting lain secara bertahap. Pantau pengumuman dan halaman status
                untuk ketersediaan terbaru.
              </p>
              <div className="mt-4">
                <Link
                  href="/status"
                  className="inline-flex items-center gap-1 text-sm font-medium text-text-primary underline-offset-4 hover:underline"
                >
                  Status layanan <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Cara kerja */}
      <section className="border-y border-border bg-surface py-16" aria-labelledby="cara-kerja">
        <div className="container-page">
          <SectionHeading
            eyebrow="Cara Kerja"
            title="Tiga langkah menuju server Anda"
            description="Tidak perlu paham infrastruktur — cukup tentukan konfigurasi yang Anda butuhkan."
          />
          <ol className="grid gap-4 md:grid-cols-3">
            {HOW_IT_WORKS.map((step, index) => (
              <li key={step.title} className="rounded-lg border border-border bg-background p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent font-mono text-sm font-semibold text-accent-contrast">
                    {index + 1}
                  </span>
                  <step.icon className="h-5 w-5 text-text-muted" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-text-primary">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Keunggulan */}
      <section className="container-page py-16" aria-labelledby="keunggulan">
        <SectionHeading eyebrow="Keunggulan" title="Dibangun dengan prinsip kejelasan" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ADVANTAGES.map((advantage) => (
            <div key={advantage.title} className="rounded-lg border border-border bg-surface p-5">
              <advantage.icon className="h-5 w-5 text-text-muted" aria-hidden="true" />
              <h3 className="mt-3 text-base font-semibold text-text-primary">{advantage.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{advantage.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Paket High */}
      <section id="paket" className="border-y border-border bg-surface py-16" aria-labelledby="paket-heading">
        <div className="container-page">
          <SectionHeading
            eyebrow="Paket"
            title="Paket Minecraft Hosting High"
            description="Tier High dengan prosesor AMD Ryzen 9 9950X — spesifikasi tetap dan harga final. Tier Low tersedia dengan konfigurasi custom di Server Builder."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activePackages.map((pkg) => (
              <div
                key={pkg.id}
                className={pkg.popular ? 'rounded-lg border-2 border-accent bg-background p-5' : 'rounded-lg border border-border bg-background p-5'}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-text-primary">{pkg.label}</h3>
                  {pkg.popular ? <Badge variant="accent">Populer</Badge> : null}
                </div>
                <ul className="mt-4 space-y-2 text-sm text-text-secondary">
                  <li className="flex justify-between">
                    <span>CPU</span>
                    <span className="font-mono text-text-primary">{pkg.cpu} vCore</span>
                  </li>
                  <li className="flex justify-between">
                    <span>RAM</span>
                    <span className="font-mono text-text-primary">{pkg.ramGb} GB</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Penyimpanan</span>
                    <span className="font-mono text-text-primary">{pkg.storageGb} GB</span>
                  </li>
                </ul>
                <p className="mt-4 border-t border-border pt-4 font-mono text-xl font-bold text-text-primary">
                  {formatRupiahPerMonth(pkg.price)}
                </p>
                <ButtonLink href="/server-builder" variant={pkg.popular ? 'primary' : 'outline'} className="mt-4 w-full">
                  Pilih Paket
                </ButtonLink>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-text-secondary">
            Butuh spesifikasi custom?{' '}
            <Link href="/server-builder" className="font-medium text-text-primary underline underline-offset-4">
              Gunakan Server Builder tier Low
            </Link>{' '}
            — mulai Rp45.000/bulan.
          </p>
        </div>
      </section>

      {/* Server Builder promo */}
      <section className="container-page py-16" aria-labelledby="builder-promo">
        <div className="rounded-xl border border-border bg-accent p-8 text-accent-contrast sm:p-10">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-xl">
              <h2 id="builder-promo" className="text-2xl font-bold tracking-tight sm:text-3xl">
                Server Builder — harga real-time, tanpa tebak-tebakan
              </h2>
              <p className="mt-3 text-sm leading-relaxed opacity-80">
                Atur CPU, RAM, dan penyimpanan. Lihat harga, rincian biaya, dan estimasi performa langsung
                berubah sesuai pilihan Anda — semua dihitung dengan mesin harga yang sama di sisi server.
              </p>
            </div>
            <ButtonLink
              href="/server-builder"
              variant="secondary"
              size="lg"
              className="shrink-0 bg-accent-contrast text-accent hover:bg-accent-contrast/90"
            >
              Buka Server Builder
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* Proses pemesanan */}
      <section className="border-y border-border bg-surface py-16" aria-labelledby="proses-pemesanan">
        <div className="container-page">
          <SectionHeading eyebrow="Alur" title="Proses pemesanan" />
          <ol className="flex flex-wrap items-center gap-2">
            {ORDER_FLOW.map((stepName, index) => (
              <li key={stepName} className="flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-text-primary">
                  <span className="font-mono text-text-muted">{index + 1}</span>
                  {stepName}
                </span>
                {index < ORDER_FLOW.length - 1 ? (
                  <ArrowRight className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CMS section */}
      {homePage ? (
        <section className="container-page py-16" aria-labelledby="tentang-wangstore">
          <div className="mx-auto max-w-2xl">
            <Markdown content={homePage.content} />
          </div>
        </section>
      ) : null}

      {/* FAQ */}
      <section className="border-t border-border bg-surface py-16" aria-labelledby="faq-home">
        <div className="container-page">
          <SectionHeading eyebrow="FAQ" title="Pertanyaan umum" />
          <div className="grid gap-3 md:grid-cols-2">
            {topFaq.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-background p-5">
                <h3 className="flex items-start gap-2 text-sm font-semibold text-text-primary">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
                  {item.question}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{truncate(item.answer, 220)}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-text-secondary">
            <Link href="/faq" className="font-medium text-text-primary underline underline-offset-4">
              Lihat semua pertanyaan
            </Link>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
          Siap membangun server Anda?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-text-secondary">
          Konsultasikan kebutuhan Anda terlebih dahulu jika ragu — pembelian bersifat final sesuai kebijakan
          WangStore.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/server-builder" variant="primary" size="lg">
            Buat Server
          </ButtonLink>
          <ButtonLink href="/contact" variant="outline" size="lg">
            Konsultasi Dulu
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, MessageCircle, Ticket } from 'lucide-react';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { PageShell } from '@/components/layout/page-shell';
import { Markdown } from '@/components/markdown';
import { ContactForm } from '@/components/contact-form';
import { TurnstileWidget } from '@/components/turnstile-widget';
import { ButtonLink } from '@/components/ui/button-link';

export const metadata: Metadata = {
  title: 'Kontak',
  description: 'Hubungi tim WangStore melalui WhatsApp, Discord, email, atau formulir kontak.',
};

export default async function ContactPage() {
  const [db, sessionContext] = await Promise.all([getDb(), getSession()]);
  const [settings, page] = await Promise.all([db.settings.get(), db.cmsPages.get('contact')]);

  const channels: { key: string; label: string; value: string; href: string; icon: typeof Mail }[] = [];
  if (settings.whatsappNumber) {
    channels.push({
      key: 'whatsapp',
      label: 'WhatsApp',
      value: `+${settings.whatsappNumber}`,
      href: `https://wa.me/${settings.whatsappNumber}`,
      icon: MessageCircle,
    });
  }
  if (settings.discordInviteUrl) {
    channels.push({
      key: 'discord',
      label: 'Discord',
      value: 'Server komunitas resmi',
      href: settings.discordInviteUrl,
      icon: MessageCircle,
    });
  }
  if (settings.contactEmail) {
    channels.push({
      key: 'email',
      label: 'Email',
      value: settings.contactEmail,
      href: `mailto:${settings.contactEmail}`,
      icon: Mail,
    });
  }

  const contactJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Kontak WangStore',
    url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/contact`,
  };

  return (
    <div className="container-page py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd) }}
      />
      <PageShell
        eyebrow="Kontak"
        title="Hubungi Kami"
        description="Konsultasi pra-pembelian, pertanyaan teknis, atau dukungan — pilih kanal yang paling nyaman untuk Anda."
        breadcrumb={[{ label: 'Beranda', href: '/' }, { label: 'Kontak' }]}
      >
        <div className="grid gap-8 md:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4">
            {channels.length > 0 ? (
              channels.map((channel) => (
                <a
                  key={channel.key}
                  href={channel.href}
                  target={channel.href.startsWith('http') ? '_blank' : undefined}
                  rel={channel.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-text-muted"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-muted text-text-primary">
                    <channel.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-text-primary">{channel.label}</span>
                    <span className="block text-xs text-text-secondary">{channel.value}</span>
                  </span>
                </a>
              ))
            ) : (
              <p className="rounded-lg border border-border bg-surface p-4 text-sm text-text-secondary">
                Kanal kontak eksternal (WhatsApp/Discord/email) belum dikonfigurasi. Gunakan formulir kontak
                atau tiket dukungan di bawah ini.
              </p>
            )}

            <div className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-muted text-text-primary">
                  <Ticket className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Tiket dukungan</p>
                  <p className="text-xs text-text-secondary">Untuk pelanggan dengan akun terdaftar.</p>
                </div>
              </div>
              <div className="mt-3">
                {sessionContext ? (
                  <ButtonLink href="/dashboard/tickets" variant="outline" size="sm" className="w-full">
                    Buka Dashboard Tiket
                  </ButtonLink>
                ) : (
                  <p className="text-xs text-text-muted">
                    <Link href="/login" className="underline underline-offset-2 hover:text-text-primary">
                      Masuk
                    </Link>{' '}
                    atau{' '}
                    <Link href="/register" className="underline underline-offset-2 hover:text-text-primary">
                      daftar
                    </Link>{' '}
                    untuk membuat tiket.
                  </p>
                )}
              </div>
            </div>

            {page ? (
              <div className="rounded-lg border border-border bg-surface p-5">
                <Markdown content={page.content} />
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-border bg-surface p-5">
            <h2 className="text-base font-semibold text-text-primary">Formulir Kontak</h2>
            <p className="mb-4 mt-1 text-sm text-text-secondary">
              Pesan akan diteruskan ke tim kami dan dibalas melalui email.
            </p>
            <TurnstileWidget siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''} />
            <ContactForm turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null} />
          </div>
        </div>
      </PageShell>
    </div>
  );
}

import Link from 'next/link';
import { Logo } from '@/components/logo';

export interface FooterContact {
  whatsappNumber: string;
  discordInviteUrl: string;
  contactEmail: string;
}

const LEGAL_LINKS = [
  { href: '/terms', label: 'Syarat & Ketentuan' },
  { href: '/privacy', label: 'Kebijakan Privasi' },
  { href: '/refund', label: 'Kebijakan Refund' },
  { href: '/sla', label: 'SLA' },
  { href: '/acceptable-use', label: 'Kebijakan Penggunaan' },
  { href: '/cookie-policy', label: 'Kebijakan Cookie' },
];

const PRODUCT_LINKS = [
  { href: '/server-builder', label: 'Server Builder' },
  { href: '/features', label: 'Fitur' },
  { href: '/infrastructure', label: 'Infrastruktur' },
  { href: '/status', label: 'Status Layanan' },
];

const COMPANY_LINKS = [
  { href: '/about', label: 'Tentang' },
  { href: '/why-wangstore', label: 'Mengapa WangStore' },
  { href: '/testimonials', label: 'Testimoni' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Kontak' },
];

const RESOURCE_LINKS = [
  { href: '/blog', label: 'Blog' },
  { href: '/knowledge-base', label: 'Knowledge Base' },
  { href: '/dashboard', label: 'Dashboard Pelanggan' },
];

export function Footer({ contact }: { contact: FooterContact }) {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-text-secondary">
            WangStore adalah platform untuk menjual dan mengelola layanan hosting — Minecraft Hosting, VPS,
            Dedicated Server, dan Panel Hosting. Build Your Own Server.
          </p>
          <p className="mt-4 text-xs leading-relaxed text-text-muted">
            Infrastruktur hosting pelanggan berada di luar aplikasi WangStore. Perlindungan DDoS bergantung pada
            kapasitas dan kemampuan provider jaringan.
          </p>
        </div>
        <nav aria-label="Layanan">
          <h3 className="text-sm font-semibold text-text-primary">Layanan</h3>
          <ul className="mt-3 space-y-2">
            {PRODUCT_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-text-secondary hover:text-text-primary">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Perusahaan">
          <h3 className="text-sm font-semibold text-text-primary">Perusahaan</h3>
          <ul className="mt-3 space-y-2">
            {COMPANY_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-text-secondary hover:text-text-primary">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Sumber daya">
          <h3 className="text-sm font-semibold text-text-primary">Sumber Daya</h3>
          <ul className="mt-3 space-y-2">
            {RESOURCE_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-text-secondary hover:text-text-primary">
                  {link.label}
                </Link>
              </li>
            ))}
            {contact.discordInviteUrl ? (
              <li>
                <a
                  href={contact.discordInviteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-text-secondary hover:text-text-primary"
                >
                  Discord
                </a>
              </li>
            ) : null}
            {contact.whatsappNumber ? (
              <li>
                <a
                  href={`https://wa.me/${contact.whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-text-secondary hover:text-text-primary"
                >
                  WhatsApp
                </a>
              </li>
            ) : null}
          </ul>
        </nav>
      </div>
      <div className="border-t border-border">
        <div className="container-page flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-text-muted">
            © {new Date().getFullYear()} WangStore. Seluruh hak cipta dilindungi.
          </p>
          <nav aria-label="Ketentuan hukum" className="flex flex-wrap gap-x-4 gap-y-1">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-xs text-text-muted hover:text-text-primary">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}

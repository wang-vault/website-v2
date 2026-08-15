import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { ProfileForm, type ProfileFormValues } from '@/components/dashboard/profile-form';
import { ChangePasswordForm } from '@/components/dashboard/change-password-form';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { ROLE_LABELS } from '@/types';

export default async function DashboardProfilePage() {
  const sessionContext = await getSession();
  if (!sessionContext) return null;
  const db = await getDb();
  const [profile, user] = await Promise.all([
    db.profiles.get(sessionContext.session.sub),
    db.users.findById(sessionContext.session.sub),
  ]);

  const initial: ProfileFormValues = {
    fullName: profile?.fullName ?? '',
    whatsapp: profile?.whatsapp ?? '',
    discord: profile?.discord ?? '',
    bio: profile?.bio ?? '',
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Profil</h1>
        <p className="mt-1 text-sm text-text-secondary">Kelola data profil dan keamanan akun Anda.</p>
      </header>

      <section aria-labelledby="info-akun" className="rounded-lg border border-border bg-surface p-5">
        <h2 id="info-akun" className="text-base font-semibold text-text-primary">
          Informasi Akun
        </h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">Email</dt>
            <dd className="text-text-primary">{user?.email ?? sessionContext.session.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">Peran</dt>
            <dd>
              <Badge variant="neutral">{user ? ROLE_LABELS[user.role] : 'Pelanggan'}</Badge>
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">Email terverifikasi</dt>
            <dd className="text-text-primary">{user?.emailVerified ? 'Ya' : 'Belum'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">Terdaftar sejak</dt>
            <dd className="text-text-primary">{user ? formatDate(user.createdAt) : '—'}</dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="profil-edit" className="rounded-lg border border-border bg-surface p-5">
          <h2 id="profil-edit" className="mb-4 text-base font-semibold text-text-primary">
            Data Profil
          </h2>
          <ProfileForm initial={initial} />
        </section>
        <section aria-labelledby="ubah-sandi" className="rounded-lg border border-border bg-surface p-5">
          <h2 id="ubah-sandi" className="mb-4 text-base font-semibold text-text-primary">
            Ubah Kata Sandi
          </h2>
          <ChangePasswordForm />
        </section>
      </div>
    </div>
  );
}

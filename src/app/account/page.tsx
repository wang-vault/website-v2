import { redirect } from 'next/navigation';

/** /account dialihkan ke customer portal (/dashboard). */
export default function AccountPage() {
  redirect('/dashboard');
}

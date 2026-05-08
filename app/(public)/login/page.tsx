import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getCurrentLang } from '@/lib/i18n';
import { LoginForm } from '@/components/LoginForm';

export const dynamic = 'force-dynamic';

/**
 * Login page — public entry point.
 *
 * Server-side responsibilities:
 *  1. D-21 (belt to proxy.ts): already-authenticated user on /login → redirect('/').
 *     proxy.ts catches most cases; this catches internal navigations where the
 *     cookie is present but the proxy didn't intercept.
 *  2. Reads lang cookie and passes it down to the LoginForm client island.
 *
 * searchParams is typed as Promise<...> per PITFALLS §1.1 (Next.js 16).
 * We don't read searchParams server-side — LoginForm reads them via useSearchParams()
 * in the client for the ?invited=1 / ?reset=1 / ?logged_out=1 toast flows.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Consume searchParams per PITFALLS §1.1 even though we don't use it here
  void searchParams;

  // D-21: already-authenticated visitor on /login → redirect to /
  // (belt to proxy.ts which already handles this in the happy path)
  const session = await auth().api.getSession({ headers: await headers() });
  if (session) redirect('/');

  const lang = await getCurrentLang();
  return <LoginForm lang={lang} />;
}

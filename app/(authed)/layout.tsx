import { requireUser } from '@/lib/auth/require';
import { getCurrentLang, getCurrentTheme } from '@/lib/i18n';
import { Shell } from '@/components/ui/Shell';

// PITFALLS §1.6 — every cookie/session-reading layout opts out of static rendering.
export const dynamic = 'force-dynamic';

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defence in depth: requireUser() is the primary auth gate. It redirects
  // unauthenticated visitors to /login before any content is rendered.
  // The middleware (proxy.ts) handles the coarse gate; this is the per-layout
  // secondary check (ARCHITECTURE.md §2.2 "auth & role enforcement layers").
  const { session, role } = await requireUser();
  const lang = await getCurrentLang();
  const theme = await getCurrentTheme();

  // Better Auth session.user additionalFields shape (Plan 06-03):
  // id, email, name, displayName, language, theme, role, sessionVersion, ...
  // Use displayName when present, fall back to name, then email.
  const u = session.user as {
    email: string;
    displayName?: string | null;
    name?: string | null;
  };
  const displayName = u.displayName ?? u.name ?? u.email;

  return (
    <Shell
      isAdmin={role === 'admin'}
      lang={lang}
      theme={theme}
      displayName={displayName}
      email={u.email}
      activeNav="home"
    >
      {children}
    </Shell>
  );
}

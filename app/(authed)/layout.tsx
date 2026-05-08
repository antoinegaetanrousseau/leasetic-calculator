import { requireUser } from '@/lib/auth/require';
import { getCurrentLang, getCurrentTheme, t } from '@/lib/i18n';
import { Topbar } from '@/components/Topbar';

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
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'var(--shell-sidebar-w) 1fr',
        gridTemplateRows: 'var(--topbar-h) 1fr var(--footer-h)',
        minHeight: '100vh',
      }}
    >
      {/* Sidebar (rows 1-3, col 1) */}
      <aside
        style={{
          gridRow: '1 / 4',
          gridColumn: '1',
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          padding: '1.5rem 1rem',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        <div
          style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '22px' }}
        >
          {t('sidebar.brand', lang)}
        </div>
      </aside>

      {/* Topbar (row 1, col 2) */}
      <Topbar
        displayName={displayName}
        email={u.email}
        lang={lang}
        theme={theme}
        isAdmin={role === 'admin'}
      />

      {/* Main content (row 2, col 2) */}
      <main
        style={{
          gridRow: '2',
          gridColumn: '2',
          background: 'var(--paper)',
          padding: '1.5rem 1.5rem 2rem',
          maxWidth: '1100px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        {children}
      </main>

      {/* Footer (row 3, col 2) */}
      <footer
        style={{
          gridRow: '3',
          gridColumn: '2',
          background: 'var(--paper)',
          borderTop: '1px solid var(--border)',
          height: 'var(--footer-h)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10.5px',
          color: 'var(--muted)',
        }}
      >
        {t('shell.footer.copyright', lang)}
      </footer>
    </div>
  );
}

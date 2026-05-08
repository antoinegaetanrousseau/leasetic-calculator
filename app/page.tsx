import { getCurrentLang, getCurrentTheme, t } from '@/lib/i18n';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LocaleToggle } from '@/components/LocaleToggle';

// Force dynamic so cookies are re-read on every request (PITFALLS §1.6).
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const lang = await getCurrentLang();
  const themeCookie = await getCurrentTheme();
  const themeForToggle = themeCookie; // 'light' | 'dark' | 'system' as stored

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
        <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '16.5px' }}>
          {t('sidebar.brand', lang)}
        </div>
      </aside>

      {/* Topbar (row 1, col 2) */}
      <header
        style={{
          gridRow: '1',
          gridColumn: '2',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          height: 'var(--topbar-h)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 1.5rem',
          gap: '0.75rem',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <LocaleToggle current={lang} />
        <ThemeToggle current={themeForToggle} />
      </header>

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
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.5rem' }}>
          {t('welcomeHeading', lang)}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '14.5px' }}>
          {t('welcomeSubtext', lang)}
        </p>
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

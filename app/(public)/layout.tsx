import { ThemeToggle } from '@/components/ThemeToggle';
import { LocaleToggle } from '@/components/LocaleToggle';
import { getCurrentLang, getCurrentTheme, t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/**
 * Minimal public-route layout. NO Topbar, NO sidebar, NO requireUser.
 * Used for /login, /invite/<token>, /reset/<token> (SHELL-03).
 *
 * Per 06-UI-SPEC.md §"Login Page Layout" + §"Invite / Reset Page Layout":
 * centered card + top-right LocaleToggle + ThemeToggle + Leasétic logo above
 * card + footer with copyright + Mentions légales link.
 *
 * The Phase 5 root layout (app/layout.tsx) provides <html>, <body>, the no-flash
 * theme script, the font CSS variable, and the Sonner <Toaster>. This layout
 * adds only the public-page chrome — no duplication.
 *
 * SHELL-14: mobile-graceful — 100% width minus 32px horizontal padding ensures
 * the card never causes horizontal scroll on viewports < 420px.
 */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const lang = await getCurrentLang();
  // getCurrentTheme resolves to 'light' | 'dark' | 'system'; ThemeToggle needs 'light' | 'dark' | 'system'
  const theme = await getCurrentTheme();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'var(--paper)',
        padding: '24px 16px',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {/* Top-right toggle cluster — position: absolute per UI-SPEC §Login Page Layout */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          right: 24,
          display: 'flex',
          gap: 12,
          zIndex: 10,
        }}
      >
        <LocaleToggle current={lang} />
        <ThemeToggle current={theme} />
      </div>

      {/* Leasétic logo — displayed above the card, weight 700, 22px, color --navy */}
      <div
        style={{
          fontWeight: 700,
          color: 'var(--navy)',
          fontSize: 22,
          marginBottom: 16,
          userSelect: 'none',
        }}
      >
        {/* Brand name — from dictionary (sidebar.brand = 'Leasétic', same in FR + EN) */}
        {t('sidebar.brand', lang)}
      </div>

      {/* Page content: login form / set-password form / expired-token card */}
      {children}

      {/* Footer — 10.5px, --muted, centered */}
      <footer
        style={{
          marginTop: 32,
          fontSize: '10.5px',
          color: 'var(--muted)',
          textAlign: 'center',
          lineHeight: 1.5,
        }}
      >
        {t('shell.footer.copyright', lang)}
        {' · '}
        <a
          href="https://leasetic.fr/mentions-legales"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--muted)', textDecoration: 'underline' }}
        >
          {t('shell.footer.privacy', lang)}
        </a>
      </footer>
    </div>
  );
}

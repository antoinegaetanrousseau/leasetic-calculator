import { ThemeToggle } from '@/components/ThemeToggle';
import { LocaleToggle } from '@/components/LocaleToggle';
import { getCurrentLang, getCurrentTheme, t } from '@/lib/i18n';
import { BrandLogo } from '@/components/ui/BrandLogo';

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

      {/* Phase 15 — Leasétic SVG logo lockup (PUB-01, PUB-02). The CSS class
          on the JSX below is matched by a rule in globals.css that drives
          responsive sizing via clamp(140px, 50vw, 200px); the Phase 11
          brand-logo CSS picker (lines 543-545) hides whichever variant does
          not match html[data-theme]. Non-interactive brand anchor — NOT
          wrapped in <Link>, per UI-SPEC §6.1 AC-15-BL-06. */}
      <BrandLogo className="public-page-logo" alt={t('sidebar.brand', lang)} />

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

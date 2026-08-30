import { ThemeToggle } from '@/components/ThemeToggle';
import { LocaleToggle } from '@/components/LocaleToggle';
import { getCurrentLang, getCurrentTheme, t } from '@/lib/i18n';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { AuthGridBackground } from '@/components/ui/AuthGridBackground';

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
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-[var(--paper)] px-4 py-6">
      {/* Animated grid backdrop, from the ReUI auth-1 block. Decorative and
          aria-hidden; it keeps its cells clear of [data-auth-surface], which the
          form card carries. */}
      <AuthGridBackground cellSize={40} />

      {/* Top-right toggle cluster — UI-SPEC §Login Page Layout. z-10 keeps it
          above the backdrop. */}
      <div className="absolute top-6 right-6 z-10 flex gap-3">
        <LocaleToggle current={lang} />
        <ThemeToggle current={theme} />
      </div>

      {/* Phase 15 — Leasétic SVG logo lockup (PUB-01, PUB-02). The CSS class
          on the JSX below is matched by a rule in globals.css that drives
          responsive sizing via clamp(140px, 50vw, 200px); the Phase 11
          brand-logo CSS picker (lines 543-545) hides whichever variant does
          not match html[data-theme]. Non-interactive brand anchor — NOT
          wrapped in <Link>, per UI-SPEC §6.1 AC-15-BL-06. */}
      {/* Everything from here sits above the backdrop. */}
      <div className="relative z-10 flex w-full flex-col items-center">
        <BrandLogo className="public-page-logo" alt={t('sidebar.brand', lang)} />

        {/* Page content: login form / set-password form / expired-token card */}
        {children}

        <footer className="mt-8 text-center text-[10.5px] leading-normal text-muted-foreground">
          {t('shell.footer.copyright', lang)}
          {' · '}
          <a
            href="https://leasetic.fr/mentions-legales"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground underline"
          >
            {t('shell.footer.privacy', lang)}
          </a>
        </footer>
      </div>
    </div>
  );
}

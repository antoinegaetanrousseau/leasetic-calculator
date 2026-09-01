import { getCurrentLang, getCurrentTheme, t } from '@/lib/i18n';
import { LocaleToggle } from '@/components/LocaleToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotFoundCard } from '@/components/ui/NotFoundCard';

/**
 * 404 page (SHELL-13 / D-31) — the CHROMELESS boundary.
 *
 * Server Component: getCurrentLang() reads the lt_lang cookie server-side so
 * t() can render the correct localised string. No 'use client' needed.
 *
 * Scope: this file serves only the contexts where there is NO Shell around the
 * 404 — an unmatched route, an unauthenticated visitor, and notFound() raised
 * from a layout that gates the whole tree (e.g. the admin segment mismatch and
 * requireAdmin() role check in app/(admin)/[adminSegment]/layout.tsx — a layout
 * that throws cannot render its own children boundary, so those correctly land
 * here with no shell, preserving D-18 URL secrecy).
 *
 * Because there is no Shell in those cases, this page supplies its own
 * full-viewport centring, wordmark and locale/theme toggles.
 *
 * notFound() raised from a PAGE inside a shell-rendering layout is handled by the
 * nested boundaries instead — app/(authed)/not-found.tsx and
 * app/(admin)/[adminSegment]/not-found.tsx — which render NotFoundCard alone.
 * Rendering this file there would duplicate the toggles the Shell already shows
 * in its settings popover.
 *
 * force-dynamic: reading cookies via getCurrentLang() requires opting out of
 * static rendering (PITFALLS §1.6 — forgetting this causes stale SSR renders).
 */
export const dynamic = 'force-dynamic';

export default async function NotFoundPage() {
  const lang = await getCurrentLang();
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
      }}
    >
      {/* Top-right toggles — absolute positioned per UI-SPEC §404 Page.
          Present ONLY here: there is no Shell in this context to provide them. */}
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

      {/* Leasétic wordmark above the card */}
      <div
        style={{
          fontWeight: 700,
          color: 'var(--navy)',
          fontSize: 22,
          marginBottom: 16,
        }}
      >
        {t('sidebar.brand', lang)}
      </div>

      <NotFoundCard lang={lang} />
    </div>
  );
}

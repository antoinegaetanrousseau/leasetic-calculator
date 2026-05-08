import Link from 'next/link';
import { getCurrentLang, getCurrentTheme, t } from '@/lib/i18n';
import { LocaleToggle } from '@/components/LocaleToggle';
import { ThemeToggle } from '@/components/ThemeToggle';

/**
 * 404 page (SHELL-13 / D-31).
 *
 * Server Component: getCurrentLang() reads the lt_lang cookie server-side so
 * t() can render the correct localised string. No 'use client' needed.
 *
 * Used by Next.js for:
 *  (a) Any unmatched route — Next.js falls back to this file automatically.
 *  (b) Every notFound() call site — e.g. Plan 06-07's admin segment mismatch
 *      (D-18: 404 not 403, preserves URL secrecy) and requireAdmin() role check.
 *
 * D-31 / T-06-08-04: this page does NOT read params or pathname — renders only
 * static localised copy. The home link is hardcoded to '/' which middleware will
 * redirect to /login for unauthenticated users (either way the user lands somewhere
 * meaningful).
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
      {/* Top-right toggles — absolute positioned per UI-SPEC §404 Page */}
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

      {/* 404 card */}
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          padding: 28,
          background: 'var(--surface)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-card)',
          textAlign: 'center',
        }}
      >
        {/* 404 display number — 48px weight 700 --navy per UI-SPEC §Typography */}
        <span
          style={{
            display: 'block',
            fontSize: 48,
            fontWeight: 700,
            color: 'var(--navy)',
            lineHeight: 1.1,
            marginBottom: 16,
          }}
          aria-hidden="true"
        >
          {t('error.404.display', lang)}
        </span>

        <h1
          style={{
            fontSize: '16.5px',
            fontWeight: 600,
            color: 'var(--ink)',
            margin: '0 0 8px',
          }}
        >
          {t('error.404.title', lang)}
        </h1>

        <p
          style={{
            fontSize: '14.5px',
            color: 'var(--muted)',
            margin: '0 0 24px',
          }}
        >
          {t('error.404.body', lang)}
        </p>

        {/* Home button — .btn-green, links to / (middleware handles auth redirect) */}
        <Link
          href="/"
          className="btn-green"
          style={{
            display: 'inline-block',
            borderRadius: 9999,
            padding: '0.6rem 1.5rem',
            fontWeight: 600,
            fontSize: 14,
            color: '#ffffff',
            background: 'var(--gd)',
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          {t('error.404.button.home', lang)}
        </Link>
      </div>
    </div>
  );
}

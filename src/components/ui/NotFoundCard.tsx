import Link from 'next/link';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n/dictionaries';

/**
 * The 404 card itself (SHELL-13 / D-31 copy), with no page chrome of its own.
 *
 * Extracted from app/not-found.tsx so the same card can be rendered in two very
 * different contexts without duplicating the copy:
 *
 *  (a) app/not-found.tsx — the chromeless standalone page. There is no Shell
 *      (unmatched route, or an unauthenticated visitor), so that file supplies
 *      the full-viewport centring, the wordmark and its own locale/theme toggles.
 *
 *  (b) app/(authed)/not-found.tsx and app/(admin)/[adminSegment]/not-found.tsx —
 *      rendered INSIDE the Shell, which already provides the sidebar and the
 *      locale/theme controls in its settings popover. Those boundaries render
 *      this card alone; adding chrome there duplicates the toggles.
 *
 * D-31 / T-06-08-04: reads no params and no pathname — static localised copy only.
 */
export function NotFoundCard({ lang }: { lang: Lang }) {
  return (
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
  );
}

'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { LocaleToggle } from '@/components/LocaleToggle';
import { ThemeToggle } from '@/components/ThemeToggle';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** Read the lt_lang cookie client-side. Returns 'fr' or 'en'; defaults to 'fr'. */
function readLangCookie(): 'fr' | 'en' {
  if (typeof document === 'undefined') return 'fr';
  const m = document.cookie.match(/(?:^|;\s*)lt_lang=([^;]+)/);
  return m && m[1] === 'en' ? 'en' : 'fr';
}

/** Read the lt_theme cookie client-side. Returns 'light' | 'dark' | 'system'; defaults to 'system'. */
function readThemeCookie(): 'light' | 'dark' | 'system' {
  if (typeof document === 'undefined') return 'system';
  const m = document.cookie.match(/(?:^|;\s*)lt_theme=([^;]+)/);
  if (m && (m[1] === 'light' || m[1] === 'dark' || m[1] === 'system')) {
    return m[1] as 'light' | 'dark' | 'system';
  }
  return 'system';
}

/**
 * Bilingual string table for the error boundary.
 *
 * Client Components cannot call server-only getCurrentLang() (cookies() is a
 * server API). We read the lt_lang cookie via document.cookie on mount instead.
 * Until that resolves we render FR strings (the project's primary language).
 *
 * D-30: these are the ONLY strings the user ever sees. NO stack trace, NO
 * error.message, NO error.digest is rendered to the DOM.
 */
const STR = {
  fr: {
    title: "Une erreur s'est produite.",
    body: 'Si le problème persiste, contactez Leasétic.',
    retry: 'Réessayer',
  },
  en: {
    title: 'Something went wrong.',
    body: 'If the problem persists, contact Leasétic.',
    retry: 'Try again',
  },
} as const;

/**
 * Generic error boundary (SHELL-12 / D-30).
 *
 * Per Next.js App Router convention: must be a Client Component. The `error`
 * prop carries the runtime exception; the `reset` prop re-renders the segment.
 *
 * D-30: NO stack trace, NO error.message, NO error.digest displayed to the
 * user. Server logs the actual error via console.error (Vercel runtime captures
 * it) for operator forensics; the user sees only the generic bilingual copy.
 *
 * ESLint exemption: app/error.tsx is in the no-restricted-syntax ignores list
 * (eslint.config.mjs) because this file cannot use server-side t() and must
 * hardcode bilingual strings in the STR constant (not in JSX — the JSXText
 * selector wouldn't match a plain TS object anyway, but the explicit ignore
 * documents the design intent per 06-CONTEXT.md D-30).
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  // Lazy initialisers: read cookies once on first render (client-side).
  // Using lazy-init avoids a separate useEffect setState call, which the
  // react-hooks/set-state-in-effect rule correctly flags as a cascading-render risk.
  const [lang] = useState<'fr' | 'en'>(readLangCookie);
  const [theme] = useState<'light' | 'dark' | 'system'>(readThemeCookie);

  useEffect(() => {
    // Server-side forensics (Vercel runtime log): the full error is recorded for
    // the operator but never rendered to the user (D-30 / T-06-08-01).
    // console.error is intentional here — this is the operator log call required
    // by SHELL-12. A no-console ESLint rule may be added in v1.2; when it is,
    // add an eslint-disable-next-line comment here.
    console.error('[error.tsx]', error);
  }, [error]);

  const s = STR[lang];

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
      {/* Top-right toggles — absolute positioned per UI-SPEC §Error Boundary Page */}
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
        {'Leasétic'}
      </div>

      {/* Error card */}
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
        <AlertTriangle
          size={38}
          strokeWidth={1.3}
          style={{ color: 'var(--gold)', opacity: 0.6, marginBottom: 16 }}
          aria-hidden="true"
        />
        <h1
          style={{
            fontSize: '16.5px',
            fontWeight: 600,
            color: 'var(--ink)',
            marginBottom: 8,
            margin: '0 0 8px',
          }}
        >
          {s.title}
        </h1>
        <p
          style={{
            fontSize: '14.5px',
            color: 'var(--muted)',
            marginBottom: 24,
            margin: '0 0 24px',
          }}
        >
          {s.body}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="btn-green"
          style={{
            width: '100%',
            borderRadius: 9999,
            padding: '0.6rem 1.5rem',
            fontWeight: 600,
            fontSize: 14,
            color: '#ffffff',
            background: 'var(--gd)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {s.retry}
        </button>
      </div>
    </div>
  );
}

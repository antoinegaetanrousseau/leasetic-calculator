import Link from 'next/link';
import { Plus, FileText } from 'lucide-react';
import { requireUser } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';

// PITFALLS §1.6: cookie-reading layout opts out of static rendering.
export const dynamic = 'force-dynamic';

/**
 * Authenticated home page (PROP-01 — Phase 7).
 *
 * Replaces Phase 6's minimal placeholder body. Phase 8 will populate the
 * recent-proposals card with real DB rows. The shell (sidebar + topbar +
 * footer) is owned by app/(authed)/layout.tsx and stays unchanged.
 *
 * Defence in depth: requireUser() runs again here even though the parent
 * layout already gated the route — same pattern as Plan 06-07's admin tree
 * (see require.ts comment block on PITFALLS §7.3 ordering).
 */
export default async function HomePage() {
  const { session } = await requireUser();
  const lang = await getCurrentLang();

  // Same fallback chain Phase 6 layout uses for the topbar's UserMenu.
  const u = session.user as {
    email: string;
    displayName?: string | null;
    name?: string | null;
  };
  const displayName = u.displayName ?? u.name ?? u.email;

  // dashboard.greeting = "Bonjour, {0} 👋" / "Hello, {0} 👋" — manual interpolation
  // because Phase 6's t() helper does not auto-interpolate. The greeting goes
  // through JSXText so React's child-escape covers any HTML chars in displayName.
  const greeting = t('dashboard.greeting', lang).replace('{0}', displayName);

  return (
    <div>
      {/* Greeting section — UI-SPEC §3.1.2 (no card chrome; sits on --paper) */}
      <section style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--ink)',
            marginBottom: 8,
          }}
        >
          {greeting}
        </h1>
        <p
          style={{
            fontSize: '14.5px',
            fontWeight: 400,
            color: 'var(--muted)',
            marginBottom: 24,
          }}
        >
          {t('dashboard.subtext', lang)}
        </p>

        {/* Primary CTA — UI-SPEC §3.1.2 */}
        <Link
          href="/proposals/new"
          className="btn-green"
          aria-label={t('dashboard.cta.new.proposal', lang)}
          style={{
            width: 'max-content',
            padding: '0.75rem 1.5rem',
            textDecoration: 'none',
          }}
        >
          <Plus size={17} strokeWidth={1.6} aria-hidden="true" />
          <span>{t('dashboard.cta.new.proposal', lang)}</span>
        </Link>
      </section>

      {/* Recent-proposals card — Phase 7 ships the SHELL ONLY (PROP-01). */}
      {/* Phase 8 will populate with real rows + search + pagination. */}
      <section className="card">
        <div className="ctitle">
          {/* No dot for this section title — purely informational header. */}
          <span>{t('dashboard.recent.title', lang)}</span>
        </div>
        {/* Separator — UI-SPEC §3.1.3 */}
        <div
          style={{
            height: 1,
            background: 'var(--border)',
            margin: '12px 0 16px',
          }}
        />

        {/* Empty-state body — UI-SPEC §3.1.3 */}
        <div
          style={{
            minHeight: 240,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <FileText
            size={38}
            strokeWidth={1.3}
            color="var(--muted)"
            style={{ opacity: 0.4 }}
            aria-hidden="true"
          />
          <h2
            style={{
              fontSize: '16.5px',
              fontWeight: 600,
              color: 'var(--ink)',
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            {t('dashboard.empty.title', lang)}
          </h2>
          <p
            style={{
              fontSize: '14.5px',
              fontWeight: 400,
              color: 'var(--muted)',
              maxWidth: 480,
            }}
          >
            {t('dashboard.empty.body', lang)}
          </p>
        </div>
      </section>
    </div>
  );
}

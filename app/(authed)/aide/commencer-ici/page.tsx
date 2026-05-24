import type { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentLang, t } from '@/lib/i18n';

// PITFALLS §1.6 — cookie-reading layout opts out of static rendering.
// The (authed) layout already calls requireUser(); both partner + admin
// roles can read this page per D-28.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Commencer ici — Leasétic Matrice' };

/**
 * Aide article "Commencer ici" — Phase 18 Plan 06 Task 4 (HELP-01, D-24/26).
 *
 * Hardcoded TSX prose walking through wizard step 1 → 2 → 3, sourcing all copy
 * from the `aide.commencer-ici.*` i18n keys shipped by Plan 18-01.
 *
 * **Text-only variant (2026-05-24):** the 3 wizard screenshots originally
 * planned for embedding (per UI-SPEC §Aide article line 600-605) are DEFERRED
 * to HELP-02 — see `.planning/phases/18-admin-surfaces/deferred-items.md` item
 * #4. The `seed-partner-launch.ts` script does not set `users.companyName`,
 * which makes `partnerCo` empty in the session-derived hydration on wizard
 * step 1, which in turn makes `proposalInputSchema.safeParse` fail on step 2.
 * Both Antoine and Delphine hit this gate when attempting to capture demo
 * screenshots. Rather than debug the wizard or seed (separate task chips), we
 * ship the article with styled `<figure class="aide-figure-placeholder">`
 * slots whose muted dashed border + centered grey text reads as intentional
 * rather than broken.
 *
 * The placeholder copy is interpolated from the single i18n key
 * `aide.commencer-ici.figure.placeholder` with `{0}` = step number, so HELP-02
 * only needs to (a) capture the PNGs, (b) swap each <figure> for a Next.js
 * <Image>. No copy churn.
 *
 * ADMIN-09 D-12 envelope: no commission values referenced in this page or its
 * i18n keys (verified via `grep -ni "commission" src/lib/i18n/dictionaries.ts |
 * grep "aide.commencer-ici"` returning 0 hits).
 */

const FIGURE_PLACEHOLDER_STYLE = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px dashed var(--border)',
  borderRadius: 8,
  padding: 32,
  minHeight: 120,
  marginTop: 16,
  marginBottom: 16,
  background: 'transparent',
  color: 'var(--muted)',
  textAlign: 'center',
  fontSize: 13,
  fontWeight: 500,
  fontStyle: 'italic',
} as const;

const FIGURE_TEXT_STYLE = {
  margin: 0,
} as const;

const H2_STYLE = {
  fontSize: 20,
  fontWeight: 600,
  lineHeight: 1.3,
  color: 'var(--ink)',
  marginTop: 32,
  marginBottom: 16,
} as const;

const BODY_STYLE = {
  fontSize: 14.5,
  fontWeight: 400,
  lineHeight: 1.6,
  color: 'var(--ink)',
  marginTop: 0,
  marginBottom: 16,
} as const;

export default async function CommencerIciPage() {
  const lang = await getCurrentLang();

  // Single i18n key reused 3× with step-number interpolation. Matches the
  // codebase-wide `.replace('{0}', value)` convention (see app/(authed)/page.tsx,
  // app/(admin)/[adminSegment]/partners/timeAgo.ts, etc.).
  const placeholderTemplate = t('aide.commencer-ici.figure.placeholder', lang);
  const renderPlaceholder = (stepNumber: 1 | 2 | 3) => (
    <figure
      className="aide-figure-placeholder"
      style={FIGURE_PLACEHOLDER_STYLE}
    >
      <span style={FIGURE_TEXT_STYLE}>
        {placeholderTemplate.replace('{0}', String(stepNumber))}
      </span>
    </figure>
  );

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>
      <Link
        href="/aide"
        style={{
          fontSize: 12.5,
          fontWeight: 500,
          color: 'var(--muted)',
          textDecoration: 'none',
          display: 'inline-block',
          marginBottom: 16,
        }}
      >
        {t('aide.commencer-ici.breadcrumb', lang)}
      </Link>

      <article className="card" style={{ padding: '48px 56px' }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            lineHeight: 1.25,
            color: 'var(--ink)',
            margin: 0,
          }}
        >
          {t('aide.commencer-ici.title', lang)}
        </h1>

        <p
          style={{
            fontSize: 14.5,
            fontWeight: 400,
            lineHeight: 1.6,
            color: 'var(--ink)',
            marginTop: 16,
            marginBottom: 0,
          }}
        >
          {t('aide.commencer-ici.lead', lang)}
        </p>

        {/* Section: Aperçu du tunnel — no screenshot (overview-only section). */}
        <h2 style={H2_STYLE}>
          {t('aide.commencer-ici.section.overview.title', lang)}
        </h2>
        <p style={BODY_STYLE}>
          {t('aide.commencer-ici.section.overview.body', lang)}
        </p>

        {/* Section: Étape 1 — Paramètres */}
        <h2 style={H2_STYLE}>
          {t('aide.commencer-ici.section.step1.title', lang)}
        </h2>
        <p style={BODY_STYLE}>
          {t('aide.commencer-ici.section.step1.body', lang)}
        </p>
        {renderPlaceholder(1)}

        {/* Section: Étape 2 — Calcul */}
        <h2 style={H2_STYLE}>
          {t('aide.commencer-ici.section.step2.title', lang)}
        </h2>
        <p style={BODY_STYLE}>
          {t('aide.commencer-ici.section.step2.body', lang)}
        </p>
        {renderPlaceholder(2)}

        {/* Section: Étape 3 — Vérifier */}
        <h2 style={H2_STYLE}>
          {t('aide.commencer-ici.section.step3.title', lang)}
        </h2>
        <p style={BODY_STYLE}>
          {t('aide.commencer-ici.section.step3.body', lang)}
        </p>
        {renderPlaceholder(3)}

        {/* Section: Et après ? */}
        <h2 style={H2_STYLE}>
          {t('aide.commencer-ici.section.next.title', lang)}
        </h2>
        <p style={BODY_STYLE}>
          {t('aide.commencer-ici.section.next.body', lang)}
        </p>

        <div style={{ marginTop: 24 }}>
          <Link href="/proposals/new/parametres" className="btn-green">
            {t('aide.commencer-ici.cta.create', lang)}
          </Link>
        </div>
      </article>
    </main>
  );
}

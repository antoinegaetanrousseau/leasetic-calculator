import type { Metadata } from 'next';
import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { BookOpenIcon, FileTextIcon, MailIcon } from '@/components/ui/icons';
import { getCurrentLang, t } from '@/lib/i18n';
import { PageHero } from '@/components/ui/PageHero';

// PITFALLS §1.6 — cookie-reading layout opts out of static rendering.
// The (authed) layout already calls requireUser() per ARCHITECTURE.md §2.2;
// both partner + admin roles can read this page per D-28.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: "Centre d'aide — Leasétic Matrice" };

/**
 * Aide landing — Phase 18 Plan 06 Task 2 (HELP-01, D-25).
 *
 * 3-card placeholder grid:
 *   1. Commencer ici          → Link to /aide/commencer-ici (starter article)
 *   2. Créer une proposition  → DISABLED (Bientôt disponible badge, opacity 0.7)
 *   3. Contact                → mailto SUPPORT_EMAIL
 *
 * SUPPORT_EMAIL = antoine.rousseau@leasetic.com (user decision 2026-05-24).
 * Matches the @leasetic.com launch-domain decision in STATE.md 2026-05-08.
 * The address is intentionally public per D-25 + threat register T-18-06-05
 * (accepted: harvesting risk vs. discoverability tradeoff).
 *
 * Auth: the (authed) layout owns requireUser(); no per-route gate needed.
 * Both partner + admin can read per D-28; gating happens at session layer,
 * not at the route.
 */
const SUPPORT_EMAIL = 'antoine.rousseau@leasetic.com';

export default async function AidePage() {
  const lang = await getCurrentLang();

  // Reused card chrome — same .card class as the rest of the app (globals.css).
  const cardPadding = 24;
  const titleStyle = {
    fontSize: '14.5px',
    fontWeight: 600,
    color: 'var(--ink)',
    margin: 0,
    marginTop: 16,
  } as const;
  const bodyStyle = {
    fontSize: 13,
    fontWeight: 400,
    color: 'var(--muted)',
    lineHeight: 1.5,
    margin: 0,
    marginTop: 8,
  } as const;
  const ctaLinkStyle = {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--teal)',
    textDecoration: 'none',
    display: 'inline-block',
    marginTop: 16,
  } as const;
  const badgeStyle = {
    display: 'inline-flex',
    padding: '4px 10px',
    borderRadius: 9999,
    background: 'rgba(110, 113, 145, 0.10)',
    color: 'var(--muted)',
    fontSize: 11.8,
    fontWeight: 600,
    marginTop: 16,
  } as const;

  return (
    <main style={{ maxWidth: 1040, margin: '0 auto', padding: '0 24px' }}>
      <PageHero
        title={t('aide.landing.title', lang)}
        subtitle={t('aide.landing.subtitle', lang)}
      />

      {/* 3-card grid per UI-SPEC §Aide landing line 536 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24,
          marginTop: 32,
        }}
      >
        {/* Card 1 — Commencer ici (active, links to starter article) */}
        <div className="card" style={{ padding: cardPadding }}>
          <HugeiconsIcon icon={BookOpenIcon} size={24} style={{ color: 'var(--gd-text)' }} strokeWidth={1.6} />
          <h3 style={titleStyle}>{t('aide.landing.card.commencerIci.title', lang)}</h3>
          <p style={bodyStyle}>{t('aide.landing.card.commencerIci.body', lang)}</p>
          <Link href="/aide/commencer-ici" style={ctaLinkStyle}>
            {t('aide.landing.card.commencerIci.cta', lang)}
          </Link>
        </div>

        {/* Card 2 — Créer une proposition (DISABLED, Bientôt disponible) */}
        <div className="card" style={{ padding: cardPadding, opacity: 0.7 }}>
          <HugeiconsIcon icon={FileTextIcon} size={24} style={{ color: 'var(--muted)' }} strokeWidth={1.6} />
          <h3 style={titleStyle}>{t('aide.landing.card.creerProposition.title', lang)}</h3>
          <p style={bodyStyle}>{t('aide.landing.card.creerProposition.body', lang)}</p>
          <span style={badgeStyle}>
            {t('aide.landing.card.creerProposition.badge', lang)}
          </span>
        </div>

        {/* Card 3 — Contact (mailto SUPPORT_EMAIL) */}
        <div className="card" style={{ padding: cardPadding }}>
          <HugeiconsIcon icon={MailIcon} size={24} style={{ color: 'var(--gd-text)' }} strokeWidth={1.6} />
          <h3 style={titleStyle}>{t('aide.landing.card.contact.title', lang)}</h3>
          <p style={bodyStyle}>{t('aide.landing.card.contact.body', lang)}</p>
          <a href={`mailto:${SUPPORT_EMAIL}`} style={ctaLinkStyle}>
            {SUPPORT_EMAIL}
          </a>
        </div>
      </div>
    </main>
  );
}

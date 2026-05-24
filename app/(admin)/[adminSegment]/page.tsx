import type { Metadata } from 'next';
import Link from 'next/link';
import { Sliders, Users, History, Plus } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { AdminNavCard } from '@/components/ui/AdminNavCard';
import { PageHero } from '@/components/ui/PageHero';
import { MetricTile } from '@/components/ui/MetricTile';
import { RecentActivityRow } from './_components/RecentActivityRow';
import {
  getActivePartnerCount,
  getTotalPartnerAccountCount,
} from '@/lib/db/queries/partner-aggregates';
import { getMonthlyProposalCountAll } from '@/lib/db/queries/proposal-aggregates';
import { getRecentAdminActivity } from '@/lib/db/queries/admin-activity';
import { listCoefficientHistory } from '@/lib/db/queries/coefficient-history';
import { formatDate } from '@/lib/i18n/format';

// PITFALLS §1.6 — opts out of static rendering (reads session cookie via requireAdmin).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Administration — Leasétic Matrice',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ adminSegment: string }>;
}

/**
 * Admin Home — Phase 18 Plan 02 rewrite per Figma `41:46` + UI-SPEC §Admin Home
 * (D-01..D-07, D-29).
 *
 * Replaces the Phase 14 layout (PageHero + 3 AdminNavCards only) with the
 * v1.3 contract:
 *   1. PageHero — eyebrow ADMIN + title + subtitle + `Nouvelle proposition`
 *      CTA in the actions slot.
 *   2. 3-up stat-tile grid (D-01/D-02/D-03), ALL with valueColor=var(--teal)
 *      per D-04 (user-confirmed deviation from Figma gold for `Dernière
 *      modif. coeffs`; --gold reserved for warnings only).
 *   3. 3-up AdminNavCard grid — Coefficients / Partenaires / Historique.
 *      Historique RETAINED here even though removed from sidebar D-27.
 *   4. Recent activity card — header + top 5 RecentActivityRow rows (or
 *      empty state) + `Voir tout →` link to /<seg>/history.
 *
 * SSR ordering: requireAdmin → Promise.all of 5 parallel queries → render.
 *
 * Per AUTH-15: requireAdmin() is called independently of the layout (D-18
 * defense in depth — hidden URL is NOT security; the role check is).
 *
 * ADMIN-09 invariant: stat tiles project only counts + a relative-day
 * integer. AdminNavCard titles are chrome labels ("Coefficients &
 * commission" is the card title, not a commission VALUE — T-14-03-02 +
 * T-18-02-01 mitigations). Recent activity sentences reference modified
 * coefficients generically; no commission values cross the page surface.
 */
export default async function AdminHomePage({ params }: PageProps) {
  const { adminSegment } = await params; // PITFALL §1.1
  await requireAdmin(); // AUTH-15 independent check
  const lang = await getCurrentLang();

  // Parallel fetch — all 5 reads are independent.
  const [activeCount, totalCount, monthlyCount, recentActivity, coeffHistory] = await Promise.all([
    getActivePartnerCount(),
    getTotalPartnerAccountCount(),
    getMonthlyProposalCountAll(),
    getRecentAdminActivity({ limit: 5 }),
    listCoefficientHistory({ limit: 1 }),
  ]);

  // ── D-02 month label: Europe/Paris current month ─────────────────────────
  // Explicit timeZone preserves correctness across DST + machines on UTC/
  // non-Paris clocks (mirrors D-28 explicit-locale discipline for fr-FR).
  const monthLabel = new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  }).format(new Date());

  // ── D-03 latest coefficient_history row ──────────────────────────────────
  const latestCoeff = coeffHistory.rows[0] ?? null;
  let derniereModifValue = '—';
  let derniereModifSublabel = '';
  if (latestCoeff) {
    const ageMs = Date.now() - latestCoeff.changedAt.getTime();
    const ageDays = Math.max(0, Math.floor(ageMs / (24 * 60 * 60 * 1000)));
    derniereModifValue = t('admin.home.stats.derniereModifCoeffs.value', lang).replace(
      '{0}',
      String(ageDays),
    );
    const formattedDate = formatDate(latestCoeff.changedAt, lang);
    const authorName = latestCoeff.createdByDisplay ?? 'Admin';
    derniereModifSublabel = t('admin.home.stats.derniereModifCoeffs.sublabel', lang)
      .replace('{0}', formattedDate)
      .replace('{1}', authorName);
  }

  return (
    <div>
      {/* ── 1. PageHero — eyebrow + title + subtitle + Nouvelle proposition CTA ── */}
      <PageHero
        eyebrow={t('admin.home.eyebrow', lang)}
        title={t('admin.home.title', lang)}
        subtitle={t('admin.home.subtitle', lang)}
        actions={
          <Link
            href="/proposals/new/parametres"
            className="btn-green"
            aria-label={t('dashboard.cta.new', lang)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
            }}
          >
            <Plus size={17} strokeWidth={1.6} aria-hidden="true" />
            <span>{t('dashboard.cta.new', lang)}</span>
          </Link>
        }
      />

      {/* ── 2. Stat-tile 3-up grid (D-01/D-02/D-03, all teal per D-04) ─────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24,
          marginBottom: 32,
        }}
      >
        <MetricTile
          variant="month"
          valueColor="var(--teal)"
          label={t('admin.home.stats.partenairesActifs', lang)}
          value={String(activeCount)}
          sublabel={t('admin.home.stats.partenairesActifs.sublabel', lang).replace(
            '{0}',
            String(totalCount),
          )}
        />
        <MetricTile
          variant="month"
          valueColor="var(--teal)"
          label={t('admin.home.stats.propositionsCeMois', lang)}
          value={String(monthlyCount)}
          sublabel={monthLabel}
        />
        <MetricTile
          variant="month"
          valueColor="var(--teal)"
          label={t('admin.home.stats.derniereModifCoeffs', lang)}
          value={derniereModifValue}
          sublabel={derniereModifSublabel}
        />
      </div>

      {/* ── 3. AdminNavCard 3-up grid (Coefficients / Partenaires / Historique) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24,
          marginBottom: 32,
        }}
      >
        <AdminNavCard
          variant="coefficients"
          title={t('admin.nav.coefficients.title', lang)}
          description={t('admin.nav.coefficients.description', lang)}
          href={`/${adminSegment}/coefficients`}
          icon={Sliders}
          openLabel={t('admin.nav.open', lang)}
        />
        <AdminNavCard
          variant="partners"
          title={t('admin.nav.partners.title', lang)}
          description={t('admin.nav.partners.description', lang)}
          href={`/${adminSegment}/partners`}
          icon={Users}
          openLabel={t('admin.nav.open', lang)}
        />
        <AdminNavCard
          variant="history"
          title={t('admin.nav.history.title', lang)}
          description={t('admin.nav.history.description', lang)}
          href={`/${adminSegment}/history`}
          icon={History}
          openLabel={t('admin.nav.open', lang)}
        />
      </div>

      {/* ── 4. Recent activity card ────────────────────────────────────────── */}
      <section className="card" data-testid="recent-activity-card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <div className="ctitle">
            <span className="dot"></span>
            {t('admin.home.activity.title', lang)}
          </div>
          <Link
            href={`/${adminSegment}/history`}
            style={{
              fontSize: '12.5px',
              fontWeight: 500,
              color: 'var(--teal)',
              textDecoration: 'none',
            }}
          >
            {t('admin.home.activity.viewAll', lang)}
          </Link>
        </div>

        {recentActivity.length === 0 ? (
          <p
            style={{
              color: 'var(--muted)',
              fontSize: '14.5px',
              margin: 0,
            }}
          >
            {t('admin.home.activity.empty', lang)}
          </p>
        ) : (
          <>
            <div>
              {recentActivity.map((row) => (
                <RecentActivityRow key={row.id} row={row} lang={lang} />
              ))}
            </div>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <Link
                href={`/${adminSegment}/history`}
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--teal)',
                  textDecoration: 'none',
                }}
              >
                {t('admin.home.activity.viewAll', lang)}
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

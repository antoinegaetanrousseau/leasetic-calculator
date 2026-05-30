import type { Metadata } from 'next';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { type DictKey } from '@/lib/i18n/dictionaries';
import { PageHero } from '@/components/ui/PageHero';
import { MetricTile } from '@/components/ui/MetricTile';
import { StatusChip } from '@/components/ui/StatusChip';
import {
  countThisMonth,
  countTotal,
  countDrafts,
} from '@/lib/db/queries/proposal-aggregates';
import { buildListResponse } from '@/lib/api/proposals/list';
import { DeleteJustToast } from '@/components/proposals/DeleteJustToast';
import { formatCurrency } from '@/lib/i18n/format';

// PITFALLS §1.6: cookie-reading layout opts out of static rendering.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Accueil — Leasétic Matrice' };


/**
 * Partner Home — Phase 17 Plan 03 rewrite (PHOME-01/02/03, D-05..D-09, D-19).
 *
 * Replaces the v1.1 inline hero + full proposals list + recently-deleted
 * toggle + search bar with:
 *   1. <PageHero> — greeting + subtitle + Nouvelle proposition CTA (D-19)
 *   2. 3 <MetricTile> grid — Ce mois-ci / Total / Brouillons (PHOME-02)
 *   3. "Propositions récentes" preview card — up to 5 abbreviated rows +
 *      Voir toutes → link to /proposals (PHOME-03, D-08)
 *
 * The full list moves to /proposals (Plan 17-04). The recently-deleted
 * toggle is RETIRED here (replaced by the Archivées filter pill on
 * /proposals); its component file stays on disk per <deferred> in
 * 17-CONTEXT.
 *
 * Defense in depth: requireUser() runs again here even though the parent
 * layout already gated the route. Aggregate helpers + buildListResponse
 * receive `session.user.id` derived from the validated session (NOT from
 * searchParams) — T-17-03-01 / T-17-03-02 IDOR mitigations.
 *
 * SSR ordering: requireUser → Promise.all([3 aggregates, recent list]) →
 * render. The Promise.all batching is a parallelization win over four
 * sequential awaits; each query is independent and userId-scoped.
 *
 * D-18 ADMIN-09 invariant preserved: aggregates project only count integers;
 * buildListResponse({ userId, limit: 5 }) returns ProposalRowDto which
 * strips paramsSnapshot (commission_pct bearing). The abbreviated row
 * render below uses only StatusChip + clientCo + lcRef + amountHT (no
 * commission surface).
 */
export default async function HomePage() {
  const { session } = await requireUser();
  const lang = await getCurrentLang();

  const u = session.user as {
    id: string;
    email: string;
    displayName?: string | null;
    name?: string | null;
  };
  const displayName = u.displayName ?? u.name ?? u.email;
  const userId = u.id;

  const [countThisMonthVal, countTotalVal, countDraftsVal, recentList] = await Promise.all([
    countThisMonth(userId),
    countTotal(userId),
    countDrafts(userId),
    buildListResponse({ userId, limit: 5 }),
  ]);

  const recentRows = recentList.rows.slice(0, 5);

  return (
    <div>
      {/* D-8-09 carry-forward: fires delete-success toast when ?deleted_just=1
          is in URL, then strips it. Reads searchParams via useSearchParams
          inside the client component — independent of this server pass. */}
      <DeleteJustToast lang={lang} />

      {/* PageHero — greeting + subtitle + Nouvelle proposition CTA (D-19) */}
      <PageHero
        title={t('dashboard.greeting', lang).replace('{0}', displayName)}
        subtitle={t('dashboard.home.subtitle', lang)}
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

      {/* MetricTile 3-up grid (UI-SPEC §Partner Home Layout step 2; D-05) */}
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
          label={t('dashboard.metricTile.thisMonth', lang)}
          value={String(countThisMonthVal)}
        />
        <MetricTile
          variant="total"
          label={t('dashboard.metricTile.total', lang)}
          value={String(countTotalVal)}
        />
        <MetricTile
          variant="drafts"
          label={t('dashboard.metricTile.drafts', lang)}
          value={String(countDraftsVal)}
        />
      </div>

      {/* Propositions récentes card (PHOME-03, D-08, D-09) */}
      <section className="card" style={{ marginTop: 0 }}>
        <div className="ctitle" style={{ marginBottom: 16 }}>
          <span>{t('dashboard.recent.title', lang)}</span>
        </div>

        {recentRows.length === 0 ? (
          <p
            style={{
              color: 'var(--muted)',
              fontSize: '14.5px',
              margin: 0,
            }}
          >
            {t('dashboard.recent.empty', lang)}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {recentRows.map((row) => {
              const chipKey = `chip.${row.displayStatus}` as DictKey;
              return (
                <Link
                  key={row.id}
                  href={`/proposals/${row.id}`}
                  className="list-row"
                  aria-label={`${row.clientCo} ${row.lcRef}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto max-content',
                    alignItems: 'center',
                    gap: 16,
                    padding: '10px 12px',
                    borderRadius: 8,
                    textDecoration: 'none',
                  }}
                >
                  <span
                    style={{
                      fontSize: '14.5px',
                      fontWeight: 600,
                      color: 'var(--ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.clientCo}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--ink)',
                      fontFamily:
                        'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
                    }}
                  >
                    {row.lcRef}
                  </span>
                  <span
                    style={{
                      fontSize: '14.5px',
                      fontWeight: 600,
                      color: 'var(--ink)',
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatCurrency(Number(row.amountHT), lang)}
                  </span>
                  <span style={{ justifySelf: 'start', display: 'inline-flex' }}>
                    <StatusChip
                      variant={row.displayStatus}
                      label={t(chipKey, lang)}
                    />
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Voir toutes → link (D-08: routes to /proposals with no params) */}
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Link
            href="/proposals"
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--teal)',
              textDecoration: 'none',
            }}
          >
            {t('dashboard.recent.viewAll', lang)}
          </Link>
        </div>
      </section>
    </div>
  );
}

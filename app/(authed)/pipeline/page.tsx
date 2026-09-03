import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { BuildingIcon } from '@/components/ui/icons';
import { MetricTile } from '@/components/ui/MetricTile';
import { PageHero } from '@/components/ui/PageHero';
import { requireRelationshipHolder } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { getConversionRateForOwner, listPipelineBoard } from '@/lib/db/queries';
import { formatConversionRate } from '@/lib/pipeline/format';
import { PipelineBoard } from './PipelineBoard';
import { PipelineMobileList } from './PipelineMobileList';

// PITFALLS §1.6 — cookie/session-reading route opts out of static rendering.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pipeline — Leasétic Matrice',
};

/**
 * `/pipeline` — Phase 33 Plan 09 (PIPE-01, PIPE-02, PIPE-03, PIPE-04). The
 * board a partner/sales user opens to see their own book grouped by stage.
 *
 * Order of operations is the security boundary, not a style preference —
 * mirrors `/clients/[id]`'s numbered doc comment, adapted for a route with
 * no `[id]` segment and therefore no `notFound()` branch: a partner with
 * zero relationships is a valid, renderable empty state (never a 404).
 *
 *   1. The relationship-holder auth gate runs FIRST, before any data access
 *      (PITFALLS §7.3). It 404s an admin caller; a `sales` user reaches this
 *      exact surface unchanged (ROLE-02, no role branch, no admin escape
 *      hatch anywhere in this file).
 *   2. getCurrentLang() — no data access, safe after the guard.
 *   3. The board query and the conversion-rate query both take the caller's
 *      own session id as their ONLY source of owner scoping. No
 *      searchParams are read on this route at all, so there is no channel
 *      for a forged owner id to reach either query (T-33-09-02).
 *
 * D-12 (own-book only): the conversion-rate tile's numerator and
 * denominator both come from the caller's own scoped read alone — no
 * cross-partner aggregate, ranking or team total anywhere on this surface.
 * D-04's Decoupling Contract: nothing on this page writes the relationship's
 * board-position column as a side effect of a proposal outcome — that
 * column is written only by the board's own move handlers, never here.
 */
export default async function PipelinePage() {
  const { session } = await requireRelationshipHolder(); // FIRST — auth before any data access
  const lang = await getCurrentLang();

  const [board, rate] = await Promise.all([
    listPipelineBoard({ ownerId: session.user.id }),
    getConversionRateForOwner(session.user.id),
  ]);

  const totalCards = Object.values(board).reduce((sum, rows) => sum + rows.length, 0);
  const { value, sublabel } = formatConversionRate(rate, lang);

  return (
    <div>
      <PageHero title={t('pipeline.page.title', lang)} subtitle={t('pipeline.page.subtitle', lang)} />

      {totalCards === 0 ? (
        <Empty className="px-5 py-12">
          <EmptyMedia variant="icon">
            <BuildingIcon size={20} aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>{t('pipeline.empty.title', lang)}</EmptyTitle>
          <EmptyDescription>{t('pipeline.empty.body', lang)}</EmptyDescription>
          <EmptyContent>
            <Button variant="outline" render={<Link href="/clients" />}>
              {t('pipeline.empty.cta', lang)}
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <MetricTile
            label={t('pipeline.metric.conversionRate.label', lang)}
            value={value}
            sublabel={sublabel}
            variant="total"
          />

          <div className="mt-5">
            <div className="hidden md:block">
              <PipelineBoard initial={board} lang={lang} />
            </div>
            <div className="block md:hidden">
              <PipelineMobileList initial={board} lang={lang} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

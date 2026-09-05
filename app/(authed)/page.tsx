import type { Metadata } from 'next';
import { PlusIcon } from '@/components/ui/icons';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { PageHero } from '@/components/ui/PageHero';
import { MetricTile } from '@/components/ui/MetricTile';
import { ProposalListFrame } from '@/components/proposals/ProposalListFrame';
import { ProposalRowBody } from '@/components/proposals/ProposalRow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  countThisMonth,
  countTotal,
  countDrafts,
} from '@/lib/db/queries/proposal-aggregates';
import {
  listRelationshipsNeedingFollowUp,
  listWeeklyMovementsForOwner,
  listProgressWeekKeysForOwner,
  getBadgeCountsForOwner,
} from '@/lib/db/queries';
import { buildListResponse } from '@/lib/api/proposals/list';
import { DeleteJustToast } from '@/components/proposals/DeleteJustToast';
import { RelanceCard } from './_components/RelanceCard';
import { MomentumCard } from './_components/MomentumCard';
import { currentWeekWindow, formatTrackedSinceFragment } from '@/lib/momentum/window';
import { summarizeStreaks, deriveBadgeProgress } from '@/lib/momentum/badges';

/**
 * Read the current timestamp. Extracted to a module-level async helper so the
 * clock is not read inside a React component render function
 * (react-hooks/purity) — the same shape `app/(authed)/proposals/[id]/page.tsx`
 * already uses. Server-only, called once per request.
 */
async function getNowMs(): Promise<number> {
  return Date.now();
}

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Accueil — Leasétic Matrice' };

export default async function HomePage() {
  const { session, role } = await requireUser();
  const lang = await getCurrentLang();

  const u = session.user as {
    id: string;
    email: string;
    displayName?: string | null;
    name?: string | null;
  };
  const displayName = u.displayName ?? u.name ?? u.email;
  const userId = u.id;
  // D-15: this surface is hidden entirely for admins, before any momentum
  // query runs. This differs from the "à relancer" call below, whose admin
  // behaviour correctly falls out of owning nothing: an admin's genuinely
  // empty momentum result would be indistinguishable from a real partner's
  // zero-history zero state (D-13's ladder-unlit invitation copy), which is
  // itself a GAME-04-adjacent tell. So the role is checked BEFORE the
  // queries fire, not after, by never evaluating them for an admin.
  const isAdmin = role === 'admin';

  // Read the clock ONCE, here on the server, BEFORE the queries: the
  // momentum week window is now a query argument (D-10), and every derived
  // value — the streak, the movements list, the credibility line — must
  // flow from this single read so they cannot disagree. The follow-up
  // labels below also derive from this same instant, same reason
  // `ProposalRow` takes `nowMs` rather than reading the clock during render.
  const nowMs = await getNowMs();
  const week = currentWeekWindow(nowMs);

  const [countThisMonthVal, countTotalVal, countDraftsVal, recentList, relanceRows, momentumData] =
    await Promise.all([
      countThisMonth(userId),
      countTotal(userId),
      countDrafts(userId),
      buildListResponse({ userId, limit: 5 }),
      // D-20: the "à relancer" list belongs on the home page, and it joins the
      // page's existing single round of queries rather than adding a second.
      // `userId` is the session's, and it is compiled into the statement's own
      // WHERE (CRM-02) — the limit is applied in SQL there too, so nothing here
      // re-sorts or re-slices the result.
      //
      // No role branch guards this call: the page uses requireUser(), and an
      // admin simply owns no relationships and receives an empty list. Branching
      // on the role would create a second surface to secure for no gain.
      listRelationshipsNeedingFollowUp(userId, 5),
      // D-15: the ternary means an admin's request never even RESOLVES these
      // three calls — not merely discards their result. Nesting keeps the
      // page at one round of queries (the discipline this comment block
      // states) while keeping the outer tuple typing intact.
      isAdmin ? null : Promise.all([
        listWeeklyMovementsForOwner(userId, week, 5),
        listProgressWeekKeysForOwner(userId),
        getBadgeCountsForOwner(userId),
      ]),
    ]);

  const recentRows = recentList.rows.slice(0, 5);

  // Fold the momentum query results (35-02) through the pure streak/badge
  // logic (35-01) into MomentumCard's props — only when the ternary above
  // actually produced data, i.e. never for an admin.
  const momentum = (() => {
    if (!momentumData) return null;
    const [movements, weekKeys, counts] = momentumData;
    const streaks = summarizeStreaks(weekKeys, nowMs);
    return {
      streakWeeks: streaks.currentWeeks,
      movements,
      // The consistency axis reads streaks.longestWeeks (via
      // deriveBadgeProgress), never currentWeeks — a broken current streak
      // must not erase a milestone already reached (D-07, UI-SPEC A-5).
      badgeProgress: deriveBadgeProgress(counts, streaks),
      trackedSinceLabel: formatTrackedSinceFragment(lang),
    };
  })();

  return (
    <div>
      <DeleteJustToast lang={lang} />

      <PageHero
        title={t('dashboard.greeting', lang).replace('{0}', displayName)}
        subtitle={t('dashboard.home.subtitle', lang)}
        actions={
          <Button 
            variant="default"
            render={<Link href="/proposals/new/parametres" aria-label={t('dashboard.cta.new', lang)} />}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            {t('dashboard.cta.new', lang)}
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

      <RelanceCard rows={relanceRows} lang={lang} nowMs={nowMs} />

      {!isAdmin && momentum && <MomentumCard
        lang={lang}
        streakWeeks={momentum.streakWeeks}
        movements={momentum.movements}
        badgeProgress={momentum.badgeProgress}
        trackedSinceLabel={momentum.trackedSinceLabel}
      />}

      {recentRows.length === 0 ? (
        <Card className="mt-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              {t('dashboard.recent.title', lang)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-[14.5px] m-0">
              {t('dashboard.recent.empty', lang)}
            </p>
            <div className="mt-6 text-right">
              <Link
                href="/proposals"
                className="text-sm font-medium text-primary hover:underline transition-colors"
              >
                {t('dashboard.recent.viewAll', lang)}
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ProposalListFrame
          className="mt-0"
          title={t('dashboard.recent.title', lang)}
          action={
            <Link
              href="/proposals"
              className="text-sm font-medium text-primary no-underline hover:underline"
            >
              {t('dashboard.recent.viewAll', lang)}
            </Link>
          }
        >
          {recentRows.map((row) => (
            <Link
              key={row.id}
              href={`/proposals/${row.id}`}
              className="flex min-w-0 items-center gap-3 rounded-lg border-b border-border px-2.5 py-2.5 text-inherit no-underline transition-colors last:border-b-0 hover:bg-[var(--hover-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ProposalRowBody row={row} lang={lang} />
            </Link>
          ))}
        </ProposalListFrame>
      )}
    </div>
  );
}

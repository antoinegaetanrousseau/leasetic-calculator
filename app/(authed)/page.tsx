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
import { buildListResponse } from '@/lib/api/proposals/list';
import { DeleteJustToast } from '@/components/proposals/DeleteJustToast';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Accueil — Leasétic Matrice' };

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

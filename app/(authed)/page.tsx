import type { Metadata } from 'next';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { type DictKey } from '@/lib/i18n/dictionaries';
import { PageHero } from '@/components/ui/PageHero';
import { MetricTile } from '@/components/ui/MetricTile';
import { StatusChip } from '@/components/ui/StatusChip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  countThisMonth,
  countTotal,
  countDrafts,
} from '@/lib/db/queries/proposal-aggregates';
import { buildListResponse } from '@/lib/api/proposals/list';
import { DeleteJustToast } from '@/components/proposals/DeleteJustToast';
import { formatCurrency } from '@/lib/i18n/format';

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
            <Plus className="mr-2 h-4 w-4" />
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

      <Card className="mt-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            {t('dashboard.recent.title', lang)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentRows.length === 0 ? (
            <p className="text-muted-foreground text-[14.5px] m-0">
              {t('dashboard.recent.empty', lang)}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {recentRows.map((row) => {
                const chipKey = `chip.${row.displayStatus}` as DictKey;
                return (
                  <Link
                    key={row.id}
                    href={`/proposals/${row.id}`}
                    className="group flex items-center justify-between p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/30 transition-all no-underline"
                  >
                    <div className="grid grid-cols-[1fr_80px_100px] items-center gap-4 flex-1">
                      <span className="text-[14.5px] font-semibold text-foreground truncate">
                        {row.clientCo}
                      </span>
                      <span className="text-[13px] font-medium text-foreground font-mono">
                        {row.lcRef}
                      </span>
                      <span className="text-[14.5px] font-semibold text-foreground text-right tabular-nums">
                        {formatCurrency(Number(row.amountHT), lang)}
                      </span>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <StatusChip variant={row.displayStatus} label={t(chipKey, lang)} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

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
    </div>
  );
}

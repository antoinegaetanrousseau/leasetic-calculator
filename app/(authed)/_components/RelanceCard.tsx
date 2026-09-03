import Link from 'next/link';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { formatDate } from '@/lib/i18n/format';
import { ProposalListFrame } from '@/components/proposals/ProposalListFrame';
import { cn } from '@/lib/utils';
import type { FollowUpRow } from '@/lib/db/queries';

/**
 * Phase 34 Plan 09 — the "à relancer" card (ACTV-04/05, CRM-02, D-20).
 *
 * D-20 put this list on the HOME page rather than on `/clients/[id]`: a partner
 * does not open a client to find out which clients to open. The pipeline board
 * stays a stage view.
 *
 * SERVER COMPONENT — this file carries no client directive. It renders links
 * and text, nothing interactive, so there is no reason to ship it to the
 * browser. (The directive is spelled out nowhere here on purpose: the plan's
 * acceptance grep counts occurrences of the literal.)
 *
 * CRM-02: this component renders ONLY the rows it is handed. It issues no
 * query, computes no count, ranking or total, and has no notion of any partner
 * other than the caller. The owner predicate lives in
 * `listRelationshipsNeedingFollowUp`'s WHERE clause (plan 34-05) and the row
 * limit is applied in SQL there too — nothing here re-sorts or re-slices, so
 * the bucket ordering the query established survives to the screen.
 *
 * ABSENT, NOT EMPTY. The sibling recent-proposals card renders an empty-state
 * twin because a partner with zero proposals still needs to know the surface
 * exists. An empty follow-up list is the opposite: it is good news, and a
 * permanent "Rien à relancer" panel is furniture reporting the absence of a
 * problem. Returning `null` also makes the admin case fall out for free — an
 * admin owns no relationships, gets an empty list, and sees no card — which is
 * why `app/(authed)/page.tsx` needs no role branch and stays one surface to
 * secure instead of two. `dashboard.relance.empty` is deliberately left unused
 * (reserved for a future standalone "Relances" page).
 */

const DAY_MS = 86_400_000;

/**
 * Local midnight for an instant. "Overdue" and "days since" are CALENDAR
 * questions — an action due at 09:00 today is not late at 17:00 — so both
 * comparisons are made between day boundaries, never between raw instants.
 */
function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Whole days between two day boundaries. Rounded, not floored: a DST shift makes a "day" 23h or 25h long. */
function daysBetween(fromMs: number, toMs: number): number {
  return Math.round((startOfDay(toMs) - startOfDay(fromMs)) / DAY_MS);
}

export interface RelanceCardProps {
  /** Already owner-scoped, already ordered, already limited — in SQL (34-05). */
  rows: FollowUpRow[];
  lang: Lang;
  /**
   * Unix-ms "now", read from the clock ONCE on the server by the page and
   * passed down. The row labels are derived from it, and deriving them during
   * render would make them depend on whichever clock does the rendering. Same
   * reason `ProposalRow` takes `nowMs` rather than reading the clock itself
   * during render.
   */
  nowMs: number;
}

/**
 * The status line for one row. Three branches, one per dictionary key:
 *   bucket 0 + a past due date → `dashboard.relance.overdue`
 *   bucket 0 otherwise         → `dashboard.relance.due` ({0} = the date)
 *   bucket 1                   → `dashboard.relance.stale` ({0} = day count)
 *
 * Interpolation happens HERE, at the call site, via `.replace('{0}', …)` —
 * the dictionary never holds a template literal (the house convention, see
 * `app/(authed)/page.tsx`'s greeting).
 */
function statusLabel(row: FollowUpRow, lang: Lang, nowMs: number): string {
  if (row.bucket === 0 && row.nextActionAt) {
    if (startOfDay(row.nextActionAt.getTime()) < startOfDay(nowMs)) {
      return t('dashboard.relance.overdue', lang);
    }
    return t('dashboard.relance.due', lang).replace(
      '{0}',
      formatDate(row.nextActionAt, lang, { year: 'numeric', month: 'short', day: 'numeric' }),
    );
  }
  return t('dashboard.relance.stale', lang).replace(
    '{0}',
    String(daysBetween(row.updatedAt.getTime(), nowMs)),
  );
}

export function RelanceCard({ rows, lang, nowMs }: RelanceCardProps) {
  if (rows.length === 0) return null;

  return (
    <ProposalListFrame
      className="mt-0 mb-6"
      title={t('dashboard.relance.title', lang)}
      action={
        <Link
          href="/clients"
          className="text-sm font-medium text-foreground no-underline hover:underline"
        >
          {t('dashboard.relance.viewAll', lang)}
        </Link>
      }
    >
      {rows.map((row) => {
        // UIC-03 accent reserve: an overdue follow-up is INFORMATION, not an
        // error, so it is weighted with type, never with a destructive or
        // accent fill. The whole card stays inside the muted text tier.
        const overdue =
          row.bucket === 0 &&
          row.nextActionAt !== null &&
          startOfDay(row.nextActionAt.getTime()) < startOfDay(nowMs);

        return (
          <Link
            key={row.relationshipId}
            href={`/clients/${row.relationshipId}`}
            data-testid="relance-row"
            className="flex min-w-0 items-center gap-3 rounded-lg border-b border-border px-2.5 py-2.5 text-inherit no-underline transition-colors last:border-b-0 hover:bg-[var(--hover-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium text-foreground">
              {row.companyName}
            </span>
            <span
              className={cn(
                'shrink-0 text-[13px] text-muted-foreground tabular-nums',
                overdue && 'font-semibold',
              )}
            >
              {statusLabel(row, lang, nowMs)}
            </span>
          </Link>
        );
      })}
    </ProposalListFrame>
  );
}

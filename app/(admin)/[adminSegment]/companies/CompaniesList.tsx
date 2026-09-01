/**
 * Phase 30 Plan 08 Task 1 — CompaniesList (CRM-01, CRM-03, 30-UI-SPEC.md §4).
 *
 * Server component — pure rendering, mirroring `PartnersList`'s exact chrome:
 * shadcn `Table` + `tableHeadClass`/`tableCellClass` from
 * `@/components/ui/table-chrome`, `.card overflow-hidden p-0` wrapper, a
 * cursor "Charger plus" footer. Deliberately stays on the plain table
 * primitive rather than the sortable-grid machinery adopted elsewhere — this
 * admin list is a peer of `PartnersList`, not of the CRM-02-constrained
 * client book (Assumption A-8).
 *
 * The RELATIONS column (neutral `Badge variant="secondary"`) is the visual
 * tell that this is an aggregate/oversight view a partner's own `/clients`
 * list never shows (T-30-08-02 boundary is enforced at the query layer —
 * this component only renders counts, never contact rows).
 *
 * ADMIN-09: SOCIÉTÉ / SIREN / RELATIONS / DERNIÈRE ACTIVITÉ carry zero
 * commission signal.
 */
import Link from 'next/link';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { formatDate } from '@/lib/i18n/format';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { tableHeadClass, tableCellClass } from '@/components/ui/table-chrome';
import { cn } from '@/lib/utils';
import type { AdminCompanyRow } from '@/lib/db/queries';

export interface CompaniesListProps {
  rows: AdminCompanyRow[];
  /** base64url-encoded cursor for the next page; null when no more pages. */
  nextCursor: string | null;
  lang: Lang;
  /** Active admin URL segment — used to build row/pagination hrefs. */
  adminSegment: string;
  /** Echoed back to the empty-state search-vs-zero branch. */
  currentQ?: string;
}

/** Format DERNIÈRE ACTIVITÉ — e.g. "12 avr. 2026" (FR) / "12 Apr 2026" (EN). */
function formatRowDate(date: Date, lang: Lang): string {
  return formatDate(date, lang, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function CompaniesList({
  rows,
  nextCursor,
  lang,
  adminSegment,
  currentQ,
}: CompaniesListProps) {
  const hasActiveFilter = Boolean(currentQ && currentQ.length > 0);

  if (rows.length === 0) {
    if (hasActiveFilter) {
      return (
        <section className="card px-6 py-10 text-center">
          <p className="m-0 text-[14.5px] text-[var(--muted)]">
            {t('admin.companies.list.empty.search', lang)}
          </p>
        </section>
      );
    }
    return (
      <section className="card px-6 py-12 text-center">
        <p className="m-0 text-[14.5px] text-[var(--muted)]">
          {t('admin.companies.list.empty.zero', lang)}
        </p>
      </section>
    );
  }

  return (
    <section className="card overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col" className={tableHeadClass}>
              {t('admin.companies.col.company', lang)}
            </TableHead>
            <TableHead scope="col" className={tableHeadClass}>
              {t('admin.companies.col.siren', lang)}
            </TableHead>
            <TableHead scope="col" className={cn(tableHeadClass, 'w-[110px] text-center')}>
              {t('admin.companies.col.relations', lang)}
            </TableHead>
            <TableHead scope="col" className={cn(tableHeadClass, 'w-[160px]')}>
              {t('admin.companies.col.lastActivity', lang)}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            // `relative` anchors the stretched-link technique below — the
            // whole row is clickable via the SOCIÉTÉ cell's Link, whose
            // `after:absolute after:inset-0` pseudo-element expands to cover
            // this TableRow (its nearest positioned ancestor).
            <TableRow key={row.companyId} className="relative">
              {/* Col 1 — SOCIÉTÉ (stretched-link: whole row navigates) */}
              <TableCell className={tableCellClass}>
                <Link
                  href={`/${adminSegment}/companies/${row.companyId}`}
                  className="text-[14.5px] font-semibold text-ink no-underline after:absolute after:inset-0"
                >
                  {row.name}
                </Link>
              </TableCell>
              {/* Col 2 — SIREN (em-dash fallback, never blank) */}
              <TableCell className={tableCellClass}>{row.siren ?? '—'}</TableCell>
              {/* Col 3 — RELATIONS (literal count, never an em dash — 0 is real information) */}
              <TableCell className={cn(tableCellClass, 'text-center')}>
                <Badge
                  variant="secondary"
                  className="rounded-full border-transparent bg-border text-[11.5px] font-semibold tracking-[0.02em] text-ink shadow-none"
                >
                  {row.relationsCount}
                </Badge>
              </TableCell>
              {/* Col 4 — DERNIÈRE ACTIVITÉ (em-dash fallback) */}
              <TableCell className={tableCellClass}>
                {row.lastActivityAt ? formatRowDate(row.lastActivityAt, lang) : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Cursor pagination — same shape as PartnersList's footer. */}
      {nextCursor && (
        <div className="px-5 py-4 text-center">
          <Link
            href={`/${adminSegment}/companies?cursor=${encodeURIComponent(nextCursor)}${currentQ ? `&q=${encodeURIComponent(currentQ)}` : ''}`}
            className="btn-out inline-flex items-center gap-2 text-[13px] no-underline"
          >
            {t('proposal.list.load.more', lang)}
          </Link>
        </div>
      )}
    </section>
  );
}

'use client';

/**
 * Coefficient history table.
 *
 * Phase 5 of the ReUI/Maia migration: the hand-rolled <table> with 15 inline
 * style objects is now the shadcn Table primitives, sharing the admin table
 * chrome in @/components/ui/table-chrome with PartnersList and
 * LcReferencesList. This table previously carried its own metrics (11.8px
 * headers on 0.06em tracking, 12px/14px padding); adopting the shared chrome
 * moves it onto the same 11.2px / 0.04em / px-5 rhythm as the other two.
 *
 * Note the explicit `whitespace-normal` on the changes and note cells: the
 * primitive's TableCell defaults to `whitespace-nowrap`, which is right for
 * the short cells in PartnersList and wrong for free text.
 */

import { SectionTitle } from '@/components/ui/SectionTitle';
import { useState, useTransition } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { PlusIcon } from '@/components/ui/icons';
import { toast } from 'sonner';
import { t, type Lang, type DictKey } from '@/lib/i18n/dictionaries';
import { formatDate } from '@/lib/i18n/format';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription } from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
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
import type { GlobalParamsCursor, GlobalParamsHistoryRow } from '@/lib/db/queries/global-params';
import { HistoryDiff, computeDiffPairs } from './HistoryDiff';
import { loadMoreHistory } from './history-load-more.action';

export interface HistoryTableProps {
  lang: Lang;
  initialRows: GlobalParamsHistoryRow[];
  initialHasMore: boolean;
  initialNextCursor: GlobalParamsCursor | null;
}

// UI-SPEC §3.1.3.2: cap visible diff items at 4 + "+ N autres"
const COLLAPSE_AFTER = 4;

const HISTORY_COLUMNS = ['date', 'admin', 'changes', 'note'] as const;

export function HistoryTable({
  lang,
  initialRows,
  initialHasMore,
  initialNextCursor,
}: HistoryTableProps) {
  const [rows, setRows] = useState<GlobalParamsHistoryRow[]>(initialRows);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [cursor, setCursor] = useState<GlobalParamsCursor | null>(
    initialNextCursor,
  );
  const [isPending, startTransition] = useTransition();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const onLoadMore = () => {
    if (!cursor || isPending) return;
    startTransition(async () => {
      try {
        const result = await loadMoreHistory(cursor);
        setRows((prev) => [...prev, ...result.rows]);
        setHasMore(result.hasMore);
        setCursor(result.nextCursor);
      } catch {
        toast.error(t('admin.coefficients.history.load.error', lang));
      }
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className="card mt-6">
      <SectionTitle>{t('admin.coefficients.history.title', lang)}</SectionTitle>

      {rows.length === 0 ? (
        <Empty className="p-8">
          <EmptyDescription>
            {t('admin.coefficients.history.empty', lang)}
          </EmptyDescription>
        </Empty>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {HISTORY_COLUMNS.map((col) => (
                  <TableHead key={col} scope="col" className={tableHeadClass}>
                    {t(`admin.coefficients.history.col.${col}` as DictKey, lang)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => {
                // sorted desc → previous in time = next in array
                const prevRow = rows[idx + 1] ?? null;
                const pairs = computeDiffPairs(prevRow, row);
                const isExpanded = expandedRows.has(row.id);
                return (
                  <TableRow key={row.id} className="align-top">
                    <TableCell className={cn(tableCellClass, 'text-ink')}>
                      {formatDate(new Date(row.effectiveFrom), lang, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell className={cn(tableCellClass, 'text-ink')}>
                      {/* WR-05: render displayName ?? email from the LEFT JOIN in listGlobalParamsHistory. */}
                      {row.createdByDisplay ?? '—'}
                    </TableCell>
                    <TableCell className={cn(tableCellClass, 'whitespace-normal')}>
                      <HistoryDiff
                        pairs={pairs}
                        collapseAfter={isExpanded ? null : COLLAPSE_AFTER}
                        moreLabelTemplate={t('admin.coefficients.history.more', lang)}
                      />
                      {pairs.length > COLLAPSE_AFTER && (
                        <Button
                          type="button"
                          variant="link"
                          onClick={() => toggleExpand(row.id)}
                          aria-expanded={isExpanded}
                          className="mt-1 h-auto p-0 text-[11.5px] text-teal underline"
                        >
                          {isExpanded
                            ? t('admin.coefficients.history.col.changes', lang)
                            : t('admin.coefficients.history.more', lang).replace(
                                '{0}',
                                String(pairs.length - COLLAPSE_AFTER),
                              )}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className={cn(tableCellClass, 'whitespace-normal italic')}>
                      {row.note ?? '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {hasMore && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                className="btn-out inline-flex items-center gap-2"
                onClick={onLoadMore}
                disabled={isPending}
              >
                {isPending ? <Spinner className="size-[17px]" /> : <HugeiconsIcon icon={PlusIcon} size={17} />}
                {t('admin.coefficients.history.load_more', lang)}
              </button>
            </div>
          )}
          {!hasMore && rows.length > 20 && (
            <div className="mt-4 text-center text-[12px] text-[var(--muted)]">
              {t('admin.coefficients.history.end', lang)}
            </div>
          )}
        </>
      )}
    </section>
  );
}

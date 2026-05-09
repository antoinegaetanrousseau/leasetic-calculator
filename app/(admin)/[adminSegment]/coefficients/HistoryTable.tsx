'use client';

import { useState, useTransition } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { t, type Lang, type DictKey } from '@/lib/i18n/dictionaries';
import { formatDate } from '@/lib/i18n/format';
import type { GlobalParamsRow } from '@/db/schema';
import type { GlobalParamsCursor } from '@/lib/db/queries/global-params';
import { HistoryDiff, computeDiffPairs } from './HistoryDiff';
import { loadMoreHistory } from './history-load-more.action';

export interface HistoryTableProps {
  lang: Lang;
  initialRows: GlobalParamsRow[];
  initialHasMore: boolean;
  initialNextCursor: GlobalParamsCursor | null;
}

// UI-SPEC §3.1.3.2: cap visible diff items at 4 + "+ N autres"
const COLLAPSE_AFTER = 4;

export function HistoryTable({
  lang,
  initialRows,
  initialHasMore,
  initialNextCursor,
}: HistoryTableProps) {
  const [rows, setRows] = useState<GlobalParamsRow[]>(initialRows);
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
    <section className="card" style={{ marginTop: 24 }}>
      <div className="ctitle">
        <span className="dot" style={{ background: 'var(--gd)' }} aria-hidden="true" />
        <span>{t('admin.coefficients.history.title', lang)}</span>
      </div>

      {rows.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '32px 16px',
            color: 'var(--muted)',
            fontSize: 14,
          }}
        >
          {t('admin.coefficients.history.empty', lang)}
        </div>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
            <thead>
              <tr>
                {(['date', 'admin', 'changes', 'note'] as const).map((col) => (
                  <th
                    key={col}
                    scope="col"
                    style={{
                      fontSize: 11.8,
                      fontWeight: 700,
                      color: 'var(--muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      padding: '12px 14px',
                      borderBottom: '2px solid var(--border)',
                      textAlign: 'left',
                    }}
                  >
                    {t(`admin.coefficients.history.col.${col}` as DictKey, lang)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                // sorted desc → previous in time = next in array
                const prevRow = rows[idx + 1] ?? null;
                const pairs = computeDiffPairs(prevRow, row);
                const isExpanded = expandedRows.has(row.id);
                return (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      verticalAlign: 'top',
                    }}
                  >
                    <td style={{ padding: '14px 12px', fontSize: 13, color: 'var(--ink)' }}>
                      {formatDate(new Date(row.effectiveFrom), lang, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td style={{ padding: '14px 12px', fontSize: 13, color: 'var(--ink)' }}>
                      {/* D-09-02: display admin displayName. For now render the raw createdBy id with
                          a '—' fallback — full displayName JOIN is a Plan 03 follow-up
                          (row.createdBy stores user.id; UI-SPEC §3.1.3.2 requests displayName ?? email). */}
                      {row.createdBy ?? '—'}
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <HistoryDiff
                        pairs={pairs}
                        collapseAfter={isExpanded ? null : COLLAPSE_AFTER}
                        moreLabelTemplate={t('admin.coefficients.history.more', lang)}
                      />
                      {pairs.length > COLLAPSE_AFTER && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(row.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--teal)',
                            fontSize: 11.5,
                            padding: 0,
                            marginTop: 4,
                            textDecoration: 'underline',
                          }}
                        >
                          {isExpanded
                            ? t('admin.coefficients.history.col.changes', lang)
                            : t('admin.coefficients.history.more', lang).replace(
                                '{0}',
                                String(pairs.length - COLLAPSE_AFTER),
                              )}
                        </button>
                      )}
                    </td>
                    <td
                      style={{
                        padding: '14px 12px',
                        fontSize: 13,
                        color: 'var(--muted)',
                        fontStyle: 'italic',
                      }}
                    >
                      {row.note ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {hasMore && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
              <button
                type="button"
                className="btn-out"
                onClick={onLoadMore}
                disabled={isPending}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                {isPending ? (
                  <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Plus size={17} />
                )}
                {t('admin.coefficients.history.load_more', lang)}
              </button>
            </div>
          )}
          {!hasMore && rows.length > 20 && (
            <div
              style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--muted)' }}
            >
              {t('admin.coefficients.history.end', lang)}
            </div>
          )}
        </>
      )}
    </section>
  );
}

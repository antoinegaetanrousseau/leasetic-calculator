'use client';

/**
 * Plan 14-05 Task 1 — /history list component (single-active expand per D-25).
 *
 * Per UI-SPEC §5.3:
 *   - Owns the single-active `expandedRowId` state — opening row B closes
 *     row A automatically (D-25). This contrasts with the sidebar's
 *     multi-expand model (D-20 / Plan 14-04) which lifts state to each row.
 *   - Escape key (anywhere on the page) closes the currently expanded row.
 *   - Pagination footer renders conditionally:
 *       - `Page suivante →` link when hasMore && nextCursorEncoded
 *       - `← Page précédente` link when currentCursor !== null
 *         (routed to bare `/<seg>/history` — page 1; no explicit
 *         previous-cursor encoding for v1.2, per PLAN.md §`<action>` (ii))
 *   - Empty state: when rows.length === 0, render the centered empty-state
 *     card. Previous-page link still shows if currentCursor !== null
 *     (user has navigated past the last page).
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import type { CoefficientHistoryListRow } from '@/lib/db/queries/coefficient-history';
import { CoefficientHistoryRow } from './CoefficientHistoryRow';

export interface CoefficientHistoryListProps {
  rows: CoefficientHistoryListRow[];
  hasMore: boolean;
  nextCursorEncoded: string | null;
  currentCursor: string | null;
  adminSegment: string;
  lang: Lang;
}

export function CoefficientHistoryList({
  rows,
  hasMore,
  nextCursorEncoded,
  currentCursor,
  adminSegment,
  lang,
}: CoefficientHistoryListProps) {
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Escape-key listener — closes whichever row is currently expanded.
  // Per UI-SPEC §5.3 + §5.3.5; pattern copied from
  // CoefficientDiffPanel.tsx lines 143-153 (minus the focus trap).
  useEffect(() => {
    if (expandedRowId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setExpandedRowId(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [expandedRowId]);

  const previousHref = `/${adminSegment}/history`;
  const nextHref =
    hasMore && nextCursorEncoded
      ? `/${adminSegment}/history?cursor=${nextCursorEncoded}`
      : null;

  // Empty state: rows is []. The previous-page link still appears when the
  // user has navigated past the last page (currentCursor !== null).
  if (rows.length === 0) {
    return (
      <div>
        <div
          className="card"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 28,
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontStyle: 'italic',
              fontSize: 14.5,
              fontWeight: 400,
              lineHeight: 1.55,
              color: 'var(--muted)',
              margin: 0,
            }}
          >
            {t('history.empty', lang)}
          </p>
        </div>
        {currentCursor !== null && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 24,
            }}
          >
            <Link
              href={previousHref}
              style={{
                color: 'var(--teal)',
                fontSize: 14.5,
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              {t('history.pagination.previous', lang)}
            </Link>
            <span />
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {rows.map((row) => (
          <CoefficientHistoryRow
            key={row.id}
            row={row}
            isExpanded={row.id === expandedRowId}
            onToggle={() =>
              setExpandedRowId((prev) => (prev === row.id ? null : row.id))
            }
            lang={lang}
          />
        ))}
      </div>

      {(currentCursor !== null || nextHref) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 24,
          }}
        >
          {/* Left: previous-page link (only when not on page 1) */}
          {currentCursor !== null ? (
            <Link
              href={previousHref}
              style={{
                color: 'var(--teal)',
                fontSize: 14.5,
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              {t('history.pagination.previous', lang)}
            </Link>
          ) : (
            <span />
          )}
          {/* Right: next-page link (only when hasMore + cursor encoded) */}
          {nextHref ? (
            <Link
              href={nextHref}
              style={{
                color: 'var(--teal)',
                fontSize: 14.5,
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              {t('history.pagination.next', lang)}
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}

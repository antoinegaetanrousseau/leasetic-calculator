/**
 * Plan 18-05 Task 2 — Sidebar row (D-21 chrome refresh + D-22 click-to-diff
 * removal).
 *
 * Phase 14 baseline shipped each row as a role="button" with an expandable
 * <CoefficientDiffPanel> mount. Plan 18-05 D-22 moves the diff modal to the
 * /history full page only — sidebar rows are now READ-ONLY:
 *   - No onClick handler.
 *   - No role="button" / tabIndex.
 *   - No cursor:pointer.
 *   - No CoefficientDiffPanel import or mount.
 *
 * Row layout (D-21, UI-SPEC §Coefficients lines 511-518):
 *   - padding 12px 16px + borderBottom 1px solid var(--border)
 *   - Top line: relative time (13px/600/--ink) + admin name (13px/400/--muted)
 *   - Middle line: change summary (12.5px/400/--muted/lineHeight 1.4)
 *   - Optional note line (italic, when present)
 *
 * Identity preserved (per Plan 18-05 in-place refresh contract): same file
 * path, same exported symbol, same prop shape. The 'use client' directive
 * is no longer strictly required (no state, no handlers) but is kept off to
 * let the parent server component compose without crossing the boundary.
 */

import { formatDate } from '@/lib/i18n/format';
import { type Lang } from '@/lib/i18n/dictionaries';
import type { CoefficientHistoryListRow } from '@/lib/db/queries/coefficient-history';

export interface CoefficientHistorySidebarRowProps {
  row: CoefficientHistoryListRow;
  lang: Lang;
  /** Optional note line rendered italic below the summary. */
  note?: string;
}

export function CoefficientHistorySidebarRow({
  row,
  lang,
  note,
}: CoefficientHistorySidebarRowProps) {
  return (
    <div
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        cursor: 'default',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      {/* Top line: time + admin name */}
      <div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--ink)',
          }}
        >
          {formatDate(row.changedAt, lang)}
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 400,
            color: 'var(--muted)',
            marginLeft: 8,
          }}
        >
          {row.createdByDisplay ?? '—'}
        </span>
      </div>

      {/* Middle line: change summary */}
      <div
        style={{
          fontSize: 12.5,
          fontWeight: 400,
          color: 'var(--muted)',
          lineHeight: 1.4,
        }}
      >
        {row.summary}
      </div>

      {/* Optional note line */}
      {note && (
        <div
          style={{
            fontSize: 12.5,
            fontStyle: 'italic',
            color: 'var(--muted)',
            marginTop: 4,
          }}
        >
          {note}
        </div>
      )}
    </div>
  );
}

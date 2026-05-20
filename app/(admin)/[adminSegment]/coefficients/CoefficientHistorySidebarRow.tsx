'use client';

/**
 * Plan 14-04 Task 2 — Sidebar row (per-row client component).
 *
 * Per UI-SPEC §5.2 + D-20 (multi-expand allowed):
 *   - Each row owns its own expanded state via useState — multiple rows
 *     can be expanded simultaneously.
 *   - Collapsed view: italic summary + meta line (date · changed_by).
 *   - Expanded view: renders CoefficientDiffPanel in 'condensed' mode
 *     below the meta line.
 *   - Keyboard: Enter/Space toggles expand; Escape collapses.
 *
 * The diff panel is imported via relative path from the sibling /history
 * directory because Plan 14-05 colocates the shared component there.
 */

import { useState } from 'react';
import { formatDate } from '@/lib/i18n/format';
import { type Lang } from '@/lib/i18n/dictionaries';
import type { CoefficientHistoryListRow } from '@/lib/db/queries/coefficient-history';
import { CoefficientDiffPanel } from '../history/CoefficientDiffPanel';

export interface CoefficientHistorySidebarRowProps {
  row: CoefficientHistoryListRow;
  lang: Lang;
}

export function CoefficientHistorySidebarRow({
  row,
  lang,
}: CoefficientHistorySidebarRowProps) {
  const [expanded, setExpanded] = useState(false);
  const toggle = () => setExpanded((v) => !v);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      aria-controls={`history-diff-${row.id}`}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        } else if (e.key === 'Escape') {
          setExpanded(false);
        }
      }}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 20,
        cursor: 'pointer',
      }}
    >
      <div
        id={`history-summary-${row.id}`}
        style={{
          fontStyle: 'italic',
          fontSize: 14.5,
          fontWeight: 400,
          lineHeight: 1.55,
          color: 'var(--ink)',
        }}
      >
        {row.summary}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 12.5,
          fontWeight: 500,
          color: 'var(--muted)',
        }}
      >
        <span>{formatDate(row.changedAt, lang)}</span>
        <span> · </span>
        <span>{row.createdByDisplay ?? '—'}</span>
      </div>

      {expanded && (
        <div
          id={`history-diff-${row.id}`}
          role="region"
          aria-labelledby={`history-summary-${row.id}`}
          style={{ marginTop: 16 }}
          // Stop propagation so clicks/keys inside the panel do not toggle
          // the parent row's expanded state.
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <CoefficientDiffPanel mode="condensed" row={row} lang={lang} />
        </div>
      )}
    </div>
  );
}

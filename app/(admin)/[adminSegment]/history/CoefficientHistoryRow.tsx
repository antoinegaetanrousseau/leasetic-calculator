'use client';

/**
 * Plan 14-05 Task 1 — /history row component (per-row card).
 *
 * Per UI-SPEC §5.3.3 + §5.3.4 (full-mode standalone /history list):
 *   - The row card itself is NOT clickable; only the explicit `Voir le détail →`
 *     trigger button toggles expansion (keeps row text selectable for copying).
 *   - Single-active expansion state is owned by the parent <CoefficientHistoryList>
 *     per D-25 — this component receives `isExpanded` + `onToggle` props and is
 *     stateless wrt expansion.
 *   - On collapse (transition isExpanded true → false), focus returns to the
 *     trigger button (§5.3.5 keyboard contract).
 *   - When expanded: <CoefficientDiffPanel mode="full"> mounts below the row
 *     meta in a `<div role="region">` container; the panel's own Escape-key
 *     handler + `Fermer ×` button both fire `onClose === onToggle`.
 *
 * ADMIN-09 note (D-30 admin-only exception): collapsed-row HTML renders the
 * italic `row.summary` text which MAY mention commission transitions (per the
 * Phase 12 generateDiffSummary contract). This is admin-only surface gated by
 * `requireAdmin()` upstream — see threat_model T-14-05-03 in 14-05-PLAN.md.
 */

import { useEffect, useRef } from 'react';
import { formatDate } from '@/lib/i18n/format';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import type { CoefficientHistoryListRow } from '@/lib/db/queries/coefficient-history';
import { CoefficientDiffPanel } from './CoefficientDiffPanel';

export interface CoefficientHistoryRowProps {
  row: CoefficientHistoryListRow;
  isExpanded: boolean;
  onToggle: () => void;
  lang: Lang;
}

export function CoefficientHistoryRow({
  row,
  isExpanded,
  onToggle,
  lang,
}: CoefficientHistoryRowProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const prevExpandedRef = useRef(isExpanded);

  // Focus management: on collapse (true → false transition), return focus to
  // the trigger button — UI-SPEC §5.3.5 contract.
  useEffect(() => {
    if (prevExpandedRef.current && !isExpanded) {
      // Use requestAnimationFrame to ensure the diff panel has fully unmounted
      // before refocusing — avoids race with React's commit phase.
      requestAnimationFrame(() => {
        triggerRef.current?.focus();
      });
    }
    prevExpandedRef.current = isExpanded;
  }, [isExpanded]);

  const summaryId = `history-row-${row.id}-summary`;
  const diffRegionId = `history-diff-${row.id}`;

  return (
    <article
      aria-labelledby={summaryId}
      className="card"
      style={{
        background: 'var(--surface)',
        border: '1px solid',
        borderColor: isExpanded ? 'var(--teal)' : 'var(--border)',
        borderRadius: 16,
        padding: 28,
      }}
    >
      {/* Top line — italic summary */}
      <p
        id={summaryId}
        style={{
          fontStyle: 'italic',
          fontSize: 14.5,
          fontWeight: 400,
          lineHeight: 1.55,
          color: 'var(--ink)',
          margin: 0,
        }}
      >
        {row.summary}
      </p>

      {/* Bottom line — meta (left) + trigger (right) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 8,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            color: 'var(--muted)',
            fontSize: 12.5,
            fontWeight: 500,
          }}
        >
          <span>{formatDate(row.changedAt, lang)}</span>
          <span> · </span>
          <span>{row.createdByDisplay ?? '—'}</span>
        </div>
        <button
          ref={triggerRef}
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-controls={diffRegionId}
          style={{
            color: 'var(--teal)',
            fontSize: 14.5,
            fontWeight: 500,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {isExpanded
            ? t('history.row.hideDetail', lang)
            : t('history.row.viewDetail', lang)}
        </button>
      </div>

      {/* Expanded: diff panel region (mode='full') */}
      {isExpanded && (
        <div
          id={diffRegionId}
          role="region"
          aria-labelledby={summaryId}
          style={{ marginTop: 24 }}
        >
          <CoefficientDiffPanel
            mode="full"
            row={row}
            lang={lang}
            onClose={onToggle}
          />
        </div>
      )}
    </article>
  );
}

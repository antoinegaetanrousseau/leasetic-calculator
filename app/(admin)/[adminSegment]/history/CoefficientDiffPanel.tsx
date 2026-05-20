'use client';

/**
 * Plan 14-04 Task 1 — Shared CoefficientDiffPanel.
 *
 * Per UI-SPEC §5.4: drives the "Avant | Après" diff render for both
 *   - sidebar inline expansion on `/coefficients` (mode='condensed', single column)
 *   - row expansion on the standalone `/history` route (mode='full', 2-column grid)
 *
 * Lives under `history/` (not `coefficients/`) because Plan 14-05 imports it
 * from the /history route; colocating with the standalone page is the cleaner
 * home. The sidebar imports it via `../history/CoefficientDiffPanel`.
 *
 * Threat model (Plan 14-04 §threat_model T-14-04-02 + D-30): this panel
 * renders commission_pct values from before_json/after_json. ALLOWED because
 * both consumers live under `/[adminSegment]/` which is requireAdmin()-gated
 * upstream. D-30 logs this as the explicit admin-only exception to the D-29
 * strict no-commission-visibility rule.
 */

import { useEffect } from 'react';
import { formatCurrency, formatDate } from '@/lib/i18n/format';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import type { CoefficientHistoryListRow } from '@/lib/db/queries/coefficient-history';
import type { GlobalParamsSnapshot } from '@/lib/admin/coefficient-diff';

export interface CoefficientDiffPanelProps {
  /** The history row this panel is rendering. */
  row: CoefficientHistoryListRow;
  /** Layout mode. */
  mode: 'condensed' | 'full';
  /** Language for date formatting + i18n labels. */
  lang: Lang;
  /** Close callback — only consumed in 'full' mode (sidebar inline doesn't have a separate close button). */
  onClose?: () => void;
}

interface FlatPair {
  path: string;
  before: string | null;
  after: string;
  isChanged: boolean;
}

const TRANCHES = ['t1', 't2', 't3', 't4'] as const;
const DURATIONS = ['36', '48', '60'] as const;

/**
 * Flatten before/after snapshots into 15 rows in canonical render order per
 * UI-SPEC §5.4: commission_pct, max_amount, validity_days, then 12 coefficient
 * cells in (tranche, duration) order.
 *
 * When `before === null` (seed-row case), every row is "changed" (all-new state)
 * and the `before` slot stays null for em-dash rendering at the call site.
 */
function flattenPairs(
  before: GlobalParamsSnapshot | null,
  after: GlobalParamsSnapshot,
  lang: Lang,
): FlatPair[] {
  const pairs: FlatPair[] = [];

  // commission_pct: formatted as `${value}%`
  pairs.push({
    path: 'commission_pct',
    before: before ? `${before.commissionPct}%` : null,
    after: `${after.commissionPct}%`,
    isChanged:
      before === null ||
      String(before.commissionPct) !== String(after.commissionPct),
  });

  // max_amount: formatted via formatCurrency
  pairs.push({
    path: 'max_amount',
    before: before ? formatCurrency(Number(before.maxAmount), lang) : null,
    after: formatCurrency(Number(after.maxAmount), lang),
    isChanged:
      before === null || String(before.maxAmount) !== String(after.maxAmount),
  });

  // validity_days: `${value} jours` (FR) / `${value} days` (EN)
  const unit = lang === 'fr' ? 'jours' : 'days';
  pairs.push({
    path: 'validity_days',
    before: before ? `${before.validityDays} ${unit}` : null,
    after: `${after.validityDays} ${unit}`,
    isChanged: before === null || before.validityDays !== after.validityDays,
  });

  // 12 coefficient cells in (tranche, duration) order
  for (const tk of TRANCHES) {
    for (const dk of DURATIONS) {
      const b = before ? String(before.coefficients[tk][dk]) : null;
      const a = String(after.coefficients[tk][dk]);
      pairs.push({
        path: `coefficients.${tk}.${dk}`,
        before: b,
        after: a,
        isChanged: before === null || b !== a,
      });
    }
  }

  return pairs;
}

const GOLD_PILL_STYLE = {
  background: 'rgba(224, 133, 48, 0.10)',
  borderRadius: 6,
  padding: '2px 6px',
  fontWeight: 600,
} as const;

const ROW_LABEL_STYLE = {
  fontSize: 11.2,
  fontWeight: 500,
  lineHeight: 1.4,
  color: 'var(--muted)',
} as const;

const ROW_VALUE_BASE_STYLE = {
  fontSize: 14.5,
  fontWeight: 400,
  lineHeight: 1.55,
  color: 'var(--ink)',
} as const;

export function CoefficientDiffPanel({
  row,
  mode,
  lang,
  onClose,
}: CoefficientDiffPanelProps) {
  const pairs = flattenPairs(
    row.beforeJson as GlobalParamsSnapshot | null,
    row.afterJson as unknown as GlobalParamsSnapshot,
    lang,
  );

  // Escape-key keydown handler — full mode only, only when onClose is provided.
  // Pattern copied from CreatePartnerModal.tsx lines 49-78 minus the focus trap.
  useEffect(() => {
    if (mode !== 'full' || !onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mode, onClose]);

  const ariaLabel = t('history.diff.panel.aria.label', lang)
    .replace('{0}', formatDate(row.changedAt, lang))
    .replace('{1}', row.createdByDisplay ?? '');

  const beforeHeader =
    row.beforeJson === null
      ? t('history.diff.before.none', lang)
      : t('history.diff.before', lang);
  const afterHeader = t('history.diff.after', lang);

  if (mode === 'full') {
    return (
      <div
        role="region"
        aria-label={ariaLabel}
        style={{
          borderTop: '1px solid var(--border)',
          paddingTop: 24,
          marginTop: 16,
        }}
      >
        {/* Column headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 24,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 11.8,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
            }}
          >
            {beforeHeader}
          </div>
          <div
            style={{
              fontSize: 11.8,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
            }}
          >
            {afterHeader}
          </div>
        </div>

        {/* Diff rows (one row of the 2-col grid per flattened path) */}
        {pairs.map((p) => (
          <div
            key={p.path}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 24,
              marginBottom: 12,
            }}
          >
            {/* AVANT cell */}
            <div className="diff-row" data-changed={p.isChanged}>
              <div className="diff-row__label" style={ROW_LABEL_STYLE}>
                {p.path}
              </div>
              <div style={{ marginTop: 4 }}>
                {p.before === null ? (
                  <span
                    style={{ ...ROW_VALUE_BASE_STYLE, color: 'var(--muted)' }}
                  >
                    —
                  </span>
                ) : (
                  <span style={ROW_VALUE_BASE_STYLE}>{p.before}</span>
                )}
              </div>
            </div>
            {/* APRÈS cell */}
            <div
              className="diff-row"
              data-changed={p.isChanged}
              style={p.isChanged ? GOLD_PILL_STYLE : undefined}
            >
              <div className="diff-row__label" style={ROW_LABEL_STYLE}>
                {p.path}
              </div>
              <div style={{ marginTop: 4 }}>
                <span style={ROW_VALUE_BASE_STYLE}>{p.after}</span>
              </div>
            </div>
          </div>
        ))}

        {/* Summary line (italic, full-width below the 2-col grid) */}
        <p
          style={{
            ...ROW_VALUE_BASE_STYLE,
            fontStyle: 'italic',
            marginTop: 20,
            marginBottom: 0,
          }}
        >
          {row.summary}
        </p>

        {/* Close button row (right-aligned) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: 16,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={t('history.diff.close.aria', lang)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              fontSize: 14.5,
              fontWeight: 500,
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 6,
            }}
          >
            {t('history.diff.close', lang)}
          </button>
        </div>
      </div>
    );
  }

  // mode === 'condensed' — single-column, no close button (sidebar parent
  // owns the expand state and toggles it via the row card click).
  return (
    <div
      role="region"
      aria-label={ariaLabel}
      style={{
        borderTop: '1px solid var(--border)',
        paddingTop: 16,
        marginTop: 0,
      }}
    >
      {pairs.map((p) => (
        <div
          key={p.path}
          className="diff-row-condensed"
          data-changed={p.isChanged}
          style={{ marginBottom: 12 }}
        >
          <div className="diff-row__label" style={ROW_LABEL_STYLE}>
            {p.path}
          </div>
          <div style={{ marginTop: 4 }}>
            <span style={{ ...ROW_VALUE_BASE_STYLE, color: 'var(--muted)' }}>
              {p.before ?? '—'}
            </span>
            <span
              className="diff-row__arrow"
              style={{ color: 'var(--muted)', margin: '0 6px' }}
            >
              {'→'}
            </span>
            <span
              style={
                p.isChanged
                  ? { ...ROW_VALUE_BASE_STYLE, ...GOLD_PILL_STYLE }
                  : ROW_VALUE_BASE_STYLE
              }
            >
              {p.after}
            </span>
          </div>
        </div>
      ))}

      <p
        style={{
          ...ROW_VALUE_BASE_STYLE,
          fontStyle: 'italic',
          marginTop: 20,
          marginBottom: 0,
        }}
      >
        {row.summary}
      </p>
    </div>
  );
}

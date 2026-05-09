import type { GlobalParamsRow } from '@/db/schema';

export interface DiffPair {
  field: string; // e.g. 'commissionPct', 'coefficients.t1.36'
  before: string;
  after: string;
}

export function computeDiffPairs(
  before: Pick<
    GlobalParamsRow,
    'commissionPct' | 'maxAmount' | 'validityDays' | 'coefficients' | 'note'
  > | null,
  after: Pick<
    GlobalParamsRow,
    'commissionPct' | 'maxAmount' | 'validityDays' | 'coefficients' | 'note'
  >,
): DiffPair[] {
  if (!before) return [];
  const out: DiffPair[] = [];
  if (String(before.commissionPct) !== String(after.commissionPct)) {
    out.push({
      field: 'commissionPct',
      before: String(before.commissionPct),
      after: String(after.commissionPct),
    });
  }
  if (String(before.maxAmount) !== String(after.maxAmount)) {
    out.push({
      field: 'maxAmount',
      before: String(before.maxAmount),
      after: String(after.maxAmount),
    });
  }
  if (before.validityDays !== after.validityDays) {
    out.push({
      field: 'validityDays',
      before: String(before.validityDays),
      after: String(after.validityDays),
    });
  }
  if ((before.note ?? '') !== (after.note ?? '')) {
    out.push({
      field: 'note',
      before: before.note ?? '—',
      after: after.note ?? '—',
    });
  }
  for (const tk of ['t1', 't2', 't3', 't4'] as const) {
    for (const dk of ['36', '48', '60'] as const) {
      const b = String(before.coefficients?.[tk]?.[dk] ?? '');
      const a = String(after.coefficients?.[tk]?.[dk] ?? '');
      if (b !== a) {
        out.push({ field: `coefficients.${tk}.${dk}`, before: b, after: a });
      }
    }
  }
  return out;
}

export interface HistoryDiffProps {
  pairs: DiffPair[];
  /**
   * When set, collapses long diffs to first N items + a "+ N more" label.
   * Pass null to disable collapsing (show all).
   */
  collapseAfter?: number | null;
  /** Localized "+ {0} more" template for the collapsed-link label. */
  moreLabelTemplate?: string;
}

/**
 * UI-SPEC §3.1.3.2 / §10.2 — renders each pair as a .history-diff-item with
 * <code>field</code>: <span class="old-val">old</span> → <span class="new-val">new</span>.
 *
 * The component is server-renderable when collapseAfter is null. With collapsing
 * enabled, callers must wrap it in a 'use client' parent that owns the expand toggle.
 */
export function HistoryDiff({
  pairs,
  collapseAfter = null,
  moreLabelTemplate,
}: HistoryDiffProps) {
  if (pairs.length === 0) return null;

  // No interactive collapsing here — keep it pure-presentational. Truncation is handled
  // by the caller (HistoryTable owns the per-row expand/collapse useState; SaveConfirmModal
  // shows everything).
  const visible =
    collapseAfter !== null && pairs.length > collapseAfter
      ? pairs.slice(0, collapseAfter)
      : pairs;
  const hidden = pairs.length - visible.length;

  return (
    <>
      {visible.map((p) => (
        <div key={p.field} className="history-diff-item">
          <code>{p.field}</code>:{' '}
          <span className="old-val">{p.before}</span>
          {' → '}
          <span className="new-val">{p.after}</span>
        </div>
      ))}
      {hidden > 0 && moreLabelTemplate && (
        <div style={{ fontSize: 11.5, color: 'var(--teal)', marginTop: 4 }}>
          {moreLabelTemplate.replace('{0}', String(hidden))}
        </div>
      )}
    </>
  );
}

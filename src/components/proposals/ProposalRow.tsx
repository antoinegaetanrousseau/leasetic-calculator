import Link from 'next/link';
import { t, type Lang, type DictKey } from '@/lib/i18n/dictionaries';
import { formatCurrency, formatDate } from '@/lib/i18n/format';
import { StatusChip } from '@/components/ui/StatusChip';
import type { ProposalRowDto } from '@/lib/api/proposals/list';

export interface ProposalRowProps {
  row: ProposalRowDto;
  lang: Lang;
  /**
   * Unix-ms timestamp for "now" — passed from the server component (react-hooks/purity).
   * Phase 14: no longer consumed by the chip render (StatusChip is purely derived
   * server-side via deriveDisplayStatus). Kept on the prop type for backward
   * compatibility with callers that still pass it.
   */
  nowMs?: number;
  /** When true, render the deleted-row variant (opacity 0.7 + StatusChip 'deleted' + Restore slot). */
  deleted?: boolean;
  /** Optional Restore button slot — Plan 08-12 fills this in for the deleted view. */
  restoreSlot?: React.ReactNode;
}

/**
 * Phase 14 D-27 — chip rendering switched from the ad-hoc
 * <ValidityChip> / <DeletedChip> composition to a single <StatusChip>
 * driven by the server-derived `row.displayStatus` (one of
 * 'draft' | 'active' | 'expired' | 'deleted').
 *
 * Trade-off documented in 14-06-SUMMARY: the validity-countdown tooltip
 * previously surfaced by ValidityChip ("Valable jusqu'au DD/MM/YYYY") is
 * NOT preserved by StatusChip. UI-SPEC §5.8 does not mandate tooltip
 * parity for v1.2; ValidityChip.tsx remains on disk as Phase 8 code if a
 * future iteration wants to restore the tooltip.
 *
 * ADMIN-09: row.displayStatus is a bounded 4-string union. row.paramsSnapshot
 * (which contains commission_pct) is NEVER projected onto ProposalRowDto —
 * defense in depth.
 */
export function ProposalRow({
  row,
  lang,
  deleted = false,
  restoreSlot = null,
}: ProposalRowProps) {
  const className = deleted ? 'list-row is-deleted' : 'list-row';
  const ariaLabel = `${t('proposal.detail.title', lang).replace('{0}', row.lcRef)} ${row.clientCo}`;
  const chipLabelKey = `chip.${row.displayStatus}` as DictKey;

  return (
    <Link href={`/proposals/${row.id}`} className={className} aria-label={ariaLabel}>
      <span
        style={{
          fontSize: '14.5px',
          fontWeight: 600,
          color: 'var(--ink)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {row.clientCo}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--ink)',
          fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
        }}
      >
        {row.lcRef}
      </span>
      <span
        style={{
          fontSize: '14.5px',
          fontWeight: 600,
          color: 'var(--ink)',
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatCurrency(Number(row.amountHT), lang)}
      </span>
      <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted)' }}>
        {formatDate(new Date(row.createdAt), lang)}
      </span>
      <StatusChip variant={row.displayStatus} label={t(chipLabelKey, lang)} />
      {deleted && restoreSlot}
    </Link>
  );
}

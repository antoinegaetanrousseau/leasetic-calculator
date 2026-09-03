'use client';

import { cva } from 'class-variance-authority';
import { useRouter } from 'next/navigation';
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
  /**
   * When true, dim the row (opacity 0.7). Callers should derive this per row
   * from `row.displayStatus === 'deleted'`, not from a per-view flag — the
   * archived view mixes expired and soft-deleted rows.
   *
   * Phase 14 narrowed this prop: the StatusChip is driven by
   * `row.displayStatus` and RowActionsClient derives the Restore slot the same
   * way, so opacity is all that is left here.
   */
  deleted?: boolean;
  /** When true, render a clickable div (not a Link) with draftActionsSlot on the right. */
  draftMode?: boolean;
  /** Icon action buttons rendered in the rightmost column for draft rows. */
  draftActionsSlot?: React.ReactNode;
  /** Icon action buttons rendered on the right for finalized (active/expired/deleted) rows (D-06). */
  actionsSlot?: React.ReactNode;
  /**
   * Phase 33: on `/clients/[id]` every row belongs to the page's own company,
   * so the client-name column is redundant. `hideClient` drops it and lets the
   * date column absorb the slack instead of a fixed-track grid overflowing the
   * card at laptop width.
   */
  hideClient?: boolean;
}

/**
 * Phase 4: ported off the v10 `.list-row` / `.is-deleted` / `.is-draft` rules.
 *
 * This stays a clickable grid row rather than becoming a shadcn Table row: the
 * rows are navigational (role="button", they route on click), not tabular data
 * under column headers, so a <table> would be the wrong semantics.
 *
 * The three v10 variants declared the same grid template and differed only in
 * opacity, so `is-draft` collapses into the base and only `deleted` survives as
 * a variant. The focus ring moves from the old teal to `ring-ring`, which is
 * the design system's green-700 — DS rule 1 makes green the only interactive
 * signal, and --ring was pointed at it in Phase 1.
 */
const rowClass = cva(
  [
    'grid min-w-0 items-center gap-4',
    'cursor-pointer rounded-lg border-b border-border p-4 text-inherit no-underline',
    'transition-colors last:border-b-0 hover:bg-[var(--hover-overlay)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  ].join(' '),
  {
    variants: {
      deleted: { true: 'opacity-70', false: '' },
      layout: {
        full: 'grid-cols-[minmax(0,1fr)_100px_130px_100px_max-content_auto]',
        compact: 'grid-cols-[110px_130px_minmax(0,1fr)_max-content_auto]',
      },
    },
    defaultVariants: { deleted: false, layout: 'full' },
  },
);

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
  draftMode = false,
  draftActionsSlot = null,
  actionsSlot = null,
  hideClient = false,
}: ProposalRowProps) {
  const router = useRouter();
  const className = rowClass({ deleted, layout: hideClient ? 'compact' : 'full' });
  const ariaLabel = row.clientCo
    ? `${row.clientCo}${row.lcRef ? ` ${row.lcRef}` : ''}`
    : t('proposal.detail.title', lang).replace('{0}', row.lcRef);
  const chipLabelKey = `chip.${row.displayStatus}` as DictKey;

  const columns = (
    <>
      {!hideClient && (
        <span className="truncate text-[14.5px] font-semibold text-ink">{row.clientCo}</span>
      )}
      <span className="truncate font-mono text-[13px] font-medium text-ink">{row.lcRef}</span>
      <span className="text-right text-[14.5px] font-semibold text-ink tabular-nums">
        {formatCurrency(Number(row.amountHT), lang)}
      </span>
      <span className="text-[13px] font-normal text-[var(--muted)]">
        {formatDate(new Date(row.createdAt), lang)}
      </span>
      <StatusChip variant={row.displayStatus} label={t(chipLabelKey, lang)} />
    </>
  );

  if (draftMode) {
    return (
      <div
        className={className}
        data-slot="proposal-row"
        data-draft="true"
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        onClick={() => router.push(`/proposals/new/parametres?draft_id=${row.id}`)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') router.push(`/proposals/new/parametres?draft_id=${row.id}`);
        }}
      >
        {columns}
        {draftActionsSlot}
      </div>
    );
  }

  return (
    <div
      className={className}
      data-slot="proposal-row"
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={() => router.push(`/proposals/${row.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') router.push(`/proposals/${row.id}`);
      }}
    >
      {columns}
      {actionsSlot}
    </div>
  );
}

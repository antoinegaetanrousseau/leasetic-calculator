'use client';

import { cva } from 'class-variance-authority';
import { useRouter } from 'next/navigation';
import { t, type Lang, type DictKey } from '@/lib/i18n/dictionaries';
import { formatCurrency, formatDate } from '@/lib/i18n/format';
import { cn } from '@/lib/utils';
import { Item, ItemMedia } from '@/components/ui/item';
import { FileTextIcon } from '@/components/ui/icons';
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
   * so the company name is redundant — the reference becomes the row title.
   */
  hideClient?: boolean;
}

/**
 * Row anatomy adopted from ReUI's `list-2` block (`FundRow`) at the Phase 33
 * acceptance checkpoint, replacing the v10-era fixed-track grid that overflowed
 * at laptop width: a 36px icon tile, a title over a muted secondary line, and
 * a right-aligned label/value pair. The tile is tinted with the same feedback
 * token `StatusChip` uses for the row's status — one signal, two places.
 *
 * The row stays a clickable `role="button"` rather than a `<table>` row: rows
 * are navigational, not tabular data under column headers.
 */
const rowClass = cva(
  [
    'flex min-w-0 items-center gap-3 rounded-lg px-2.5 py-2.5 text-inherit no-underline',
    'cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-[var(--hover-overlay)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  ].join(' '),
  {
    variants: { deleted: { true: 'opacity-70', false: '' } },
    defaultVariants: { deleted: false },
  },
);

const TILE_TINT: Record<ProposalRowDto['displayStatus'], string> = {
  active: 'bg-success/15 text-success-foreground',
  draft: 'bg-warning/15 text-warning-foreground',
  expired: 'bg-muted text-muted-foreground',
  deleted: 'bg-destructive/15 text-destructive',
};

function ProposalTile({ status }: { status: ProposalRowDto['displayStatus'] }) {
  return (
    <Item
      className={cn(
        'flex size-9 shrink-0 items-center justify-center border-2 border-background p-0 shadow-[0_1px_3px_0_rgba(0,0,0,0.14)]',
        TILE_TINT[status],
      )}
      aria-hidden="true"
    >
      <ItemMedia variant="icon" className="size-auto">
        <FileTextIcon size={16} />
      </ItemMedia>
    </Item>
  );
}

export interface ProposalRowBodyProps {
  row: ProposalRowDto;
  lang: Lang;
  hideClient?: boolean;
  /** Rendered after the status chip (row actions). */
  trailing?: React.ReactNode;
}

/**
 * The row's content, shared by `ProposalRow` (clickable div) and the home
 * page's recent list (a `Link` per row).
 *
 * ADMIN-09: row.displayStatus is a bounded 4-string union. row.paramsSnapshot
 * (which contains commission_pct) is NEVER projected onto ProposalRowDto —
 * defense in depth.
 */
export function ProposalRowBody({ row, lang, hideClient = false, trailing = null }: ProposalRowBodyProps) {
  const chipLabelKey = `chip.${row.displayStatus}` as DictKey;
  const date = formatDate(new Date(row.createdAt), lang);

  return (
    <>
      <ProposalTile status={row.displayStatus} />

      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-[15px] leading-tight font-medium text-foreground">
          {hideClient ? row.lcRef : row.clientCo}
        </p>
        <p className="m-0 mt-0.5 truncate text-xs text-muted-foreground">
          {hideClient ? (
            date
          ) : (
            <>
              <span className="font-mono">{row.lcRef}</span>
              <span aria-hidden="true"> · </span>
              {date}
            </>
          )}
        </p>
      </div>

      <div className="shrink-0 space-y-0.5 text-right">
        <p className="m-0 text-xs leading-none text-muted-foreground">
          {t('proposal.row.amountLabel', lang)}
        </p>
        <p className="m-0 text-sm leading-tight font-medium text-foreground tabular-nums">
          {formatCurrency(Number(row.amountHT), lang)}
        </p>
      </div>

      <StatusChip variant={row.displayStatus} label={t(chipLabelKey, lang)} className="shrink-0" />
      {trailing}
    </>
  );
}

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
  const className = rowClass({ deleted });
  const ariaLabel = row.clientCo
    ? `${row.clientCo}${row.lcRef ? ` ${row.lcRef}` : ''}`
    : t('proposal.detail.title', lang).replace('{0}', row.lcRef);
  const href = draftMode ? `/proposals/new/parametres?draft_id=${row.id}` : `/proposals/${row.id}`;

  return (
    <div
      className={className}
      data-slot="proposal-row"
      data-draft={draftMode ? 'true' : undefined}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') router.push(href);
      }}
    >
      <ProposalRowBody
        row={row}
        lang={lang}
        hideClient={hideClient}
        trailing={draftMode ? draftActionsSlot : actionsSlot}
      />
    </div>
  );
}

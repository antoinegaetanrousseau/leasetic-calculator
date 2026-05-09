import Link from 'next/link';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { formatCurrency, formatDate } from '@/lib/i18n/format';
import { ValidityChip } from './ValidityChip';
import { DeletedChip } from './DeletedChip';
import type { ProposalRowDto } from '@/lib/api/proposals/list';

export interface ProposalRowProps {
  row: ProposalRowDto;
  lang: Lang;
  /** Unix-ms timestamp for "now" — passed from the server component (react-hooks/purity). */
  nowMs: number;
  /** When true, render the deleted-row variant (opacity 0.7 + DeletedChip + Restore slot). */
  deleted?: boolean;
  /** Optional Restore button slot — Plan 08-12 fills this in for the deleted view. */
  restoreSlot?: React.ReactNode;
}

export function ProposalRow({
  row,
  lang,
  nowMs,
  deleted = false,
  restoreSlot = null,
}: ProposalRowProps) {
  const className = deleted ? 'list-row is-deleted' : 'list-row';
  const ariaLabel = `${t('proposal.detail.title', lang).replace('{0}', row.lcRef)} ${row.clientCo}`;

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
      {deleted ? (
        <DeletedChip deletedAt={new Date(row.deletedAt!)} lang={lang} />
      ) : (
        <ValidityChip
          createdAt={new Date(row.createdAt)}
          validityDays={row.validityDays}
          lang={lang}
          nowMs={nowMs}
        />
      )}
      {deleted && restoreSlot}
    </Link>
  );
}

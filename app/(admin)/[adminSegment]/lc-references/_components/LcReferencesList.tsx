/**
 * Phase 19 Plan 02 Task 2 — LcReferencesList server component.
 *
 * Cross-partner LC reference table. Mirrors PartnersList chrome verbatim
 * (TH_BASE_STYLE / TD_BASE_STYLE copied from Phase 18 Plan 03).
 *
 * D-13: Rows are read-only — no <Link>, no onClick, no cursor:pointer.
 * ADMIN-09: zero commission projection. LcReferenceRow has no commission field;
 *   paramsSnapshot is consumed by deriveDisplayStatus upstream and never reaches
 *   this component.
 *
 * 6 columns: Référence / Partenaire / Client / Montant HT / Statut / Créée le
 */
import Link from 'next/link';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { formatDate, formatCurrency } from '@/lib/i18n/format';
import { StatusChip } from '@/components/ui/StatusChip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  tableHeadClass,
  tableCellClass,
  tableCellNumericClass,
} from '@/components/ui/table-chrome';
import { cn } from '@/lib/utils';
import type { LcReferenceRow } from '@/lib/db/queries/lc-references';

export interface LcReferencesListProps {
  rows: LcReferenceRow[];
  /** base64url-encoded cursor for the next page; null when no more pages. */
  nextCursor: string | null;
  lang: Lang;
  adminSegment: string;
  /** Active search query — used to determine empty-state variant. */
  currentQ?: string;
}

// Phase 4: the TH_BASE_STYLE / TD_BASE_STYLE inline objects that used to live
// here (copied verbatim from PartnersList) are now the shared classes in
// @/components/ui/table-chrome, applied through the shadcn Table primitives.

/** Map DisplayStatus → StatusChip variant. All 4 LC variants are supported. */
function chipVariant(
  status: LcReferenceRow['displayStatus'],
): 'active' | 'draft' | 'expired' | 'deleted' {
  return status; // DisplayStatus == StatusChip variant for LC surface
}

function chipLabel(status: LcReferenceRow['displayStatus'], lang: Lang): string {
  return t(`chip.${status}` as Parameters<typeof t>[0], lang);
}

function formatRowDate(date: Date, lang: Lang): string {
  return formatDate(date, lang, { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function LcReferencesList({
  rows,
  nextCursor,
  lang,
  adminSegment,
  currentQ,
}: LcReferencesListProps) {
  const hasActiveSearch = Boolean(currentQ && currentQ.length > 0);

  // ── Empty states ──────────────────────────────────────────────────────────────
  if (rows.length === 0) {
    if (hasActiveSearch) {
      // Search-empty: "Aucune référence ne correspond à votre recherche." + clear link
      return (
        <section className="card px-6 py-10 text-center">
          <p className="m-0 text-[14.5px] text-[var(--muted)]">
            {t('admin.lcReferences.empty.search', lang)}
          </p>
          <p className="mt-4">
            <Link
              href={`/${adminSegment}/lc-references`}
              className="text-[12.5px] font-medium text-teal no-underline"
            >
              {t('admin.lcReferences.empty.search.clear', lang)}
            </Link>
          </p>
        </section>
      );
    }

    // First-run: "Aucune référence LC pour le moment."
    return (
      <section className="card px-6 py-12 text-center">
        <p className="m-0 text-[14.5px] text-[var(--muted)]">
          {t('admin.lcReferences.empty.firstRun', lang)}
        </p>
        <p className="mt-3 mb-0 text-[13px] leading-[1.55] text-[var(--muted)]">
          {t('admin.lcReferences.empty.firstRun.body', lang)}
        </p>
      </section>
    );
  }

  // ── Table ──────────────────────────────────────────────────────────────────────
  return (
    <section className="card overflow-hidden p-0">
      {/* D-13: rows are read-only — no row link, no onClick, no cursor:pointer.
          TableBody clears the last row's border, which is what the old
          per-row `lastBorder` bookkeeping was doing by hand. */}
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col" className={tableHeadClass}>
              {t('admin.lcReferences.col.reference', lang)}
            </TableHead>
            <TableHead scope="col" className={tableHeadClass}>
              {t('admin.lcReferences.col.partner', lang)}
            </TableHead>
            <TableHead scope="col" className={tableHeadClass}>
              {t('admin.lcReferences.col.client', lang)}
            </TableHead>
            <TableHead scope="col" className={cn(tableHeadClass, 'w-[140px] text-right')}>
              {t('admin.lcReferences.col.amountHt', lang)}
            </TableHead>
            <TableHead scope="col" className={cn(tableHeadClass, 'w-[110px] text-center')}>
              {t('admin.lcReferences.col.status', lang)}
            </TableHead>
            <TableHead scope="col" className={cn(tableHeadClass, 'w-[140px]')}>
              {t('admin.lcReferences.col.createdAt', lang)}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className={tableCellClass}>
                <span className="font-mono text-[13px] font-medium text-ink">{row.lcRef}</span>
              </TableCell>
              <TableCell className={tableCellClass}>{row.partnerName}</TableCell>
              <TableCell className={tableCellClass}>{row.clientName || '—'}</TableCell>
              <TableCell className={tableCellNumericClass}>
                {formatCurrency(row.amountHt, lang)}
              </TableCell>
              <TableCell className={cn(tableCellClass, 'text-center')}>
                <StatusChip
                  variant={chipVariant(row.displayStatus)}
                  label={chipLabel(row.displayStatus, lang)}
                />
              </TableCell>
              <TableCell className={tableCellClass}>
                {formatRowDate(row.createdAt, lang)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Cursor pagination — deliberately preserved. The list is paged by an
          opaque cursor server-side, which stays correct while rows are being
          created underneath it; a page-index grid would not. */}
      {nextCursor && (
        <div className="px-5 py-4 text-center">
          <Link
            href={`/${adminSegment}/lc-references?cursor=${encodeURIComponent(nextCursor)}${currentQ ? `&q=${encodeURIComponent(currentQ)}` : ''}`}
            className="btn-out inline-flex items-center gap-2 text-[13px] no-underline"
          >
            {t('proposal.list.load.more', lang)}
          </Link>
        </div>
      )}
    </section>
  );
}

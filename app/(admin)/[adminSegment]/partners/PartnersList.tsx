/**
 * Phase 18 Plan 03 Task 1 — PartnersList (D-14 rename, Figma 42:46, D-08, D-13).
 *
 * REPLACES the Phase 14 partner-list component. Full D-14 scrub: file rename
 * + symbol rename + Figma-spec table chrome + 6-column layout per UI-SPEC
 * §Partners list. The prior file lived at the same directory under the prior
 * naming convention; this file is its successor.
 *
 * Server component — pure rendering. Search + filter + cursor state all live
 * in URL searchParams (read on the parent page.tsx) and pass through props.
 * The per-row overflow menu (D-10) is rendered in cell 6; Task 2 of this plan
 * creates the dedicated PartnerRowActions client component and threads the
 * proper props through. Until then a placeholder slot keeps the 6-cell row
 * shape intact.
 *
 * ADMIN-09: zero commission projection. The PartnerRow shape (id/email/name/
 * status/createdAt/lastActivityAt) has no commission field; downstream cells
 * project only those values. 9-gate grep contract trivially honored.
 */
import Link from 'next/link';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { formatDate } from '@/lib/i18n/format';
import { StatusChip } from '@/components/ui/StatusChip';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { tableHeadClass, tableCellClass } from '@/components/ui/table-chrome';
import { cn } from '@/lib/utils';
import type { PartnerRow, PartnerStatus } from '@/lib/db/queries/partners';
import { PartnerRowActions } from './_components/PartnerRowActions';

export interface PartnersListProps {
  rows: PartnerRow[];
  /** base64url-encoded cursor for the next page; null when no more pages. */
  nextCursor: string | null;
  lang: Lang;
  /** Active admin URL segment — used to build action hrefs and CTA links. */
  adminSegment: string;
  /** Echoed back to the empty-state filter-clear link logic. */
  currentStatus?: PartnerStatus;
  /** Echoed back to the empty-state filter-clear link logic. */
  currentQ?: string;
}

// Phase 4: TH_BASE_STYLE / TD_BASE_STYLE moved to the shared classes in
// @/components/ui/table-chrome, applied through the shadcn Table primitives.
// LcReferencesList was carrying a verbatim copy of both.

/** Map PartnerStatus → StatusChip variant. `inactive` maps to the destructive tint. */
function chipVariant(status: PartnerStatus): 'active' | 'invited' | 'disabled' {
  if (status === 'active') return 'active';
  if (status === 'invited') return 'invited';
  return 'disabled';
}

function chipLabel(status: PartnerStatus, lang: Lang): string {
  if (status === 'active') return t('chip.active', lang);
  if (status === 'invited') return t('chip.invited', lang);
  return t('chip.disabled', lang);
}

/** Format DATE CRÉATION + DERNIÈRE ACTIVITÉ — e.g. "12 avr. 2026" (FR) / "12 Apr 2026" (EN). */
function formatRowDate(date: Date, lang: Lang): string {
  return formatDate(date, lang, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function PartnersList({
  rows,
  nextCursor,
  lang,
  adminSegment,
  currentStatus,
  currentQ,
}: PartnersListProps) {
  // D-13 empty states. Filter-empty when ANY filter is currently active.
  const hasActiveFilter = Boolean(currentStatus) || Boolean(currentQ && currentQ.length > 0);

  if (rows.length === 0) {
    if (hasActiveFilter) {
      // D-13 — filter-empty: "Aucun partenaire ne correspond aux filtres." + "Effacer les filtres →"
      return (
        <section className="card px-6 py-10 text-center">
          <p className="m-0 text-[14.5px] text-[var(--muted)]">
            {t('admin.partners.empty.filter', lang)}
          </p>
          <p className="mt-4">
            <Link
              href={`/${adminSegment}/partners`}
              className="text-[12.5px] font-medium text-teal no-underline"
            >
              {t('admin.partners.empty.clearFilters', lang)}
            </Link>
          </p>
        </section>
      );
    }
    // D-13 — zero-partners: "Aucun partenaire pour le moment." + Inviter CTA
    return (
      <section className="card px-6 py-12 text-center">
        <p className="mt-0 mb-5 text-[14.5px] text-[var(--muted)]">
          {t('admin.partners.empty.zero', lang)}
        </p>
        <Link
          href={`/${adminSegment}/partners/new`}
          className="btn-green inline-flex items-center gap-2 no-underline"
        >
          {t('admin.partners.invite.cta', lang)}
        </Link>
      </section>
    );
  }

  return (
    <section className="card overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col" className={tableHeadClass}>
              {t('admin.partners.col.partner', lang)}
            </TableHead>
            <TableHead scope="col" className={tableHeadClass}>
              {t('admin.partners.col.email', lang)}
            </TableHead>
            <TableHead scope="col" className={cn(tableHeadClass, 'w-[140px]')}>
              {t('admin.partners.col.created', lang)}
            </TableHead>
            <TableHead scope="col" className={cn(tableHeadClass, 'w-[160px]')}>
              {t('admin.partners.col.lastActivity', lang)}
            </TableHead>
            <TableHead scope="col" className={cn(tableHeadClass, 'w-[110px] text-center')}>
              {t('admin.partners.col.status', lang)}
            </TableHead>
            {/* D-07: at-a-glance partner type badge column. ADMIN-09: type enum, not a rate. */}
            <TableHead scope="col" className={cn(tableHeadClass, 'w-[120px] text-center')}>
              {t('admin.partners.col.partnerType', lang)}
            </TableHead>
            <TableHead scope="col" className={cn(tableHeadClass, 'w-[48px] text-center')}>
              {/* Visual ⋯ glyph — accessible name carried by per-row PartnerRowActions trigger. */}
              <span aria-hidden="true">⋯</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              {/* Col 1 — PARTENAIRE (name + muted email stacked) */}
              <TableCell className={tableCellClass}>
                <div className="flex flex-col">
                  <strong className="text-[14.5px] font-semibold text-ink">{row.name}</strong>
                  <span className="mt-0.5 text-[13px] font-normal text-[var(--muted)]">
                    {row.email}
                  </span>
                </div>
              </TableCell>
              {/* Col 2 — EMAIL (single-line per UI-SPEC keep-both decision) */}
              <TableCell className={tableCellClass}>{row.email}</TableCell>
              {/* Col 3 — DATE CRÉATION */}
              <TableCell className={tableCellClass}>
                {formatRowDate(row.createdAt, lang)}
              </TableCell>
              {/* Col 4 — DERNIÈRE ACTIVITÉ (D-08 em-dash fallback) */}
              <TableCell className={tableCellClass}>
                {row.lastActivityAt ? formatRowDate(row.lastActivityAt, lang) : '—'}
              </TableCell>
              {/* Col 5 — STATUT */}
              <TableCell className={cn(tableCellClass, 'text-center')}>
                <StatusChip
                  variant={chipVariant(row.status)}
                  label={chipLabel(row.status, lang)}
                />
              </TableCell>
              {/* Col 5b — TYPE (D-07). Phase 4: this was the last consumer of the
                  orphan `chip chip-type` class, whose .chip-type half was never
                  declared in any stylesheet. Now a real Badge, like StatusChip
                  beside it. ADMIN-09: enum, not a rate. */}
              <TableCell className={cn(tableCellClass, 'text-center')}>
                <Badge
                  variant="secondary"
                  data-partner-type={row.partnerType}
                  className="rounded-full border-transparent bg-border text-[11.5px] font-semibold tracking-[0.02em] text-ink shadow-none"
                >
                  {row.partnerType}
                </Badge>
              </TableCell>
              {/* Col 6 — ⋯ overflow menu (D-10) */}
              <TableCell className={cn(tableCellClass, 'w-[48px] text-center')}>
                <PartnerRowActions
                  partnerId={row.id}
                  status={row.status}
                  adminSegment={adminSegment}
                  lang={lang}
                  partnerEmail={row.email}
                  partnerDisplayName={row.name}
                  partnerType={row.partnerType}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Cursor pagination preserved — see LcReferencesList for why. */}
      {nextCursor && (
        <div className="px-5 py-4 text-center">
          <Link
            href={`/${adminSegment}/partners?cursor=${encodeURIComponent(nextCursor)}${currentStatus ? `&status=${currentStatus}` : ''}${currentQ ? `&q=${encodeURIComponent(currentQ)}` : ''}`}
            className="btn-out inline-flex items-center gap-2 text-[13px] no-underline"
          >
            {t('proposal.list.load.more', lang)}
          </Link>
        </div>
      )}
    </section>
  );
}

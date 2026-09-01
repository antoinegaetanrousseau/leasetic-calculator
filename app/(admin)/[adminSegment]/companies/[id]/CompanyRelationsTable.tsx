/**
 * Phase 30 Plan 08 Task 2 — CompanyRelationsTable (CRM-03, 30-UI-SPEC.md §4).
 *
 * The company detail page's focal point (CRM-03's entire reason to exist):
 * every relationship on this company, together with the holder's identity
 * and access classification. Plain shadcn `Table` +
 * `tableHeadClass`/`tableCellClass`, matching `CompaniesList`.
 *
 * CRM-04 boundary, load-bearing: this table renders contact COUNTS only.
 * It never fetches, receives, or renders a contact name, role, phone, or
 * email — the admin sees that a relationship HAS contacts and drills into
 * the relationship detail (Task 3) to see them.
 *
 * ADMIN-09: none of TITULAIRE / TYPE / CRÉÉE LE / PROPOSITIONS / CONTACTS
 * carry commission signal. TYPE is `isInternal` (role === 'sales'), an
 * access classification enum, not a rate.
 */
import Link from 'next/link';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { formatDate } from '@/lib/i18n/format';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription } from '@/components/ui/empty';
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
import type { AdminRelationshipRow } from '@/lib/db/queries';

export interface CompanyRelationsTableProps {
  relationships: AdminRelationshipRow[];
  lang: Lang;
  adminSegment: string;
  companyId: string;
}

/** Format CRÉÉE LE — e.g. "12 avr. 2026" (FR) / "12 Apr 2026" (EN). */
function formatRowDate(date: Date, lang: Lang): string {
  return formatDate(date, lang, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function CompanyRelationsTable({
  relationships,
  lang,
  adminSegment,
  companyId,
}: CompanyRelationsTableProps) {
  if (relationships.length === 0) {
    return (
      <Empty className="px-5 py-10">
        <EmptyDescription className="text-[14.5px]">
          {t('admin.companies.empty.zero.title', lang)}
        </EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col" className={tableHeadClass}>
              {t('admin.companies.relation.col.owner', lang)}
            </TableHead>
            <TableHead scope="col" className={cn(tableHeadClass, 'w-[120px] text-center')}>
              {t('admin.companies.relation.col.type', lang)}
            </TableHead>
            <TableHead scope="col" className={cn(tableHeadClass, 'w-[140px]')}>
              {t('admin.companies.relation.col.created', lang)}
            </TableHead>
            <TableHead scope="col" className={cn(tableHeadClass, 'w-[110px] text-center')}>
              {t('admin.companies.relation.col.proposals', lang)}
            </TableHead>
            <TableHead scope="col" className={cn(tableHeadClass, 'w-[110px] text-center')}>
              {t('admin.companies.relation.col.contacts', lang)}
            </TableHead>
            <TableHead scope="col" className={cn(tableHeadClass, 'w-[80px]')} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {relationships.map((r) => (
            <TableRow key={r.relationshipId}>
              {/* Col 1 — TITULAIRE (owner display name) */}
              <TableCell className={tableCellClass}>
                <span className="text-[14.5px] font-semibold text-ink">
                  {r.ownerDisplayName}
                </span>
              </TableCell>
              {/* Col 2 — TYPE (neutral badge, an access classification, not a rate) */}
              <TableCell className={cn(tableCellClass, 'text-center')}>
                <Badge
                  variant="secondary"
                  className="rounded-full border-transparent bg-border text-[11.5px] font-semibold tracking-[0.02em] text-ink shadow-none"
                >
                  {r.isInternal
                    ? t('admin.companies.relation.type.sales', lang)
                    : t('admin.companies.relation.type.partner', lang)}
                </Badge>
              </TableCell>
              {/* Col 3 — CRÉÉE LE */}
              <TableCell className={tableCellClass}>{formatRowDate(r.createdAt, lang)}</TableCell>
              {/* Col 4 — PROPOSITIONS (literal count, 0 renders as "0") */}
              <TableCell className={cn(tableCellClass, 'text-center')}>
                {r.proposalsCount}
              </TableCell>
              {/* Col 5 — CONTACTS (count only — never a contact row, CRM-04) */}
              <TableCell className={cn(tableCellClass, 'text-center')}>
                {r.contactsCount}
              </TableCell>
              {/* Col 6 — Voir → admin-only relationship detail */}
              <TableCell className={cn(tableCellClass, 'text-right')}>
                <Link
                  href={`/${adminSegment}/companies/${companyId}/relations/${r.relationshipId}`}
                  className="text-[13px] font-medium text-primary no-underline"
                >
                  {t('admin.companies.relation.col.view', lang)}
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Phase 33 Plan 05 — the relationship card shared by the desktop kanban
 * board and the mobile stage-accordion list (plan 33-07 wires both).
 *
 * Server-safe presentational component: no `'use client'`, no hooks. It is
 * rendered inside a client board, but takes only serialisable props, so it
 * stays a plain function component importable from either bundle.
 *
 * T-33-05-01: the company-name link targets `/clients/{relationshipId}` —
 * a RELATIONSHIP id, never a company id. `/clients/[id]` treats `[id]` as a
 * relationship id and 404s identically for a non-owned or non-existent one
 * (T-30-07-01) — using `companyId` here would be the exact IDOR shape this
 * phase's threat model calls out.
 */
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import type { PipelineCardRow } from '@/lib/db/queries/pipeline';

export interface PipelineCardProps {
  row: PipelineCardRow;
  lang: Lang;
}

export function PipelineCard({ row, lang }: PipelineCardProps) {
  const counts = t('pipeline.card.counts', lang)
    .replace('{contacts}', String(row.contactsCount))
    .replace('{proposals}', String(row.proposalsCount));

  return (
    <Card size="sm">
      <div className="flex flex-col gap-2">
        <Link
          href={`/clients/${row.relationshipId}`}
          className="font-semibold text-[14.5px] text-foreground no-underline hover:text-primary"
        >
          {row.companyName}
        </Link>
        <span className="text-[13px] text-muted-foreground">{row.siren ?? '—'}</span>
        <span className="text-[13px] text-muted-foreground">{counts}</span>
      </div>
    </Card>
  );
}

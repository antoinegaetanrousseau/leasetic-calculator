/**
 * Phase 33 Plan 05 — the relationship card shared by the desktop kanban
 * board and the mobile stage-accordion list (plan 33-07 wires both).
 *
 * Anatomy follows ReUI's `kanban-board-1` block (`TaskCard`), adopted at the
 * 33-09 acceptance checkpoint: a meta row on top, a two-line title with the
 * hover arrow affordance, and a footer pinned to the bottom (`mt-auto`) so
 * every card in a lane has the same minimum height. Demo-only fields the
 * block carries (avatars, due dates, completion rings) are not invented —
 * the footer shows the two real counts this row actually has.
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRightIcon, FileTextIcon, UsersIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import type { PipelineCardRow } from '@/lib/db/queries/pipeline';

export interface PipelineCardProps {
  row: PipelineCardRow;
  lang: Lang;
  /** Rendered inside `KanbanOverlay` while dragging — lifted shadow only. */
  isOverlay?: boolean;
}

export function PipelineCard({ row, lang, isOverlay }: PipelineCardProps) {
  const contacts = t('pipeline.card.contacts', lang).replace('{n}', String(row.contactsCount));
  const proposals = t('pipeline.card.proposals', lang).replace('{n}', String(row.proposalsCount));

  return (
    <Card
      size="sm"
      className={cn(
        'bg-card p-0 shadow-xs transition-[box-shadow,--tw-ring-color] hover:shadow-sm hover:ring-foreground/20',
        isOverlay && 'shadow-lg',
      )}
    >
      <CardContent className="flex min-h-[8.75rem] flex-col p-3">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">
              {t('pipeline.card.sirenLabel', lang)}
            </span>
            <Badge variant="outline" className="tabular-nums">
              {row.siren ?? '—'}
            </Badge>
          </div>
        </div>

        <h3 className="mt-3 min-h-10 text-sm leading-5 font-medium">
          <Link
            href={`/clients/${row.relationshipId}`}
            className="group/card-title inline-flex max-w-full min-w-0 items-start gap-1 text-foreground no-underline"
          >
            <span className="line-clamp-2 py-0.25 transition-colors group-hover/card-title:text-primary">
              {row.companyName}
            </span>
            <ArrowRightIcon
              size={12}
              aria-hidden="true"
              className="mt-1 size-3 shrink-0 -translate-x-1 opacity-0 transition-all group-hover/card-title:translate-x-0 group-hover/card-title:opacity-100"
            />
          </Link>
        </h3>

        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <UsersIcon size={14} aria-hidden="true" className="shrink-0" />
            <span className="truncate">{contacts}</span>
          </span>
          <Badge variant="outline" className="gap-1.5 bg-background font-normal">
            <FileTextIcon size={12} aria-hidden="true" className="text-muted-foreground" />
            <span className="tabular-nums">{proposals}</span>
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

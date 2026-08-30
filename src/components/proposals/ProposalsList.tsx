'use client';

/**
 * Phase 5 of the ReUI/Maia migration.
 *
 * The three empty-state branches that used to live here were unreachable:
 * app/(authed)/proposals/page.tsx short-circuits on `initial.rows.length === 0`
 * and renders its own empty state, so this component only ever mounts with at
 * least one row — and `rows` only ever appends. They carried 5 of this file's
 * 6 inline styles between them. The live empty state on that page is the one
 * now built from the shadcn Empty primitive.
 */

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Lang } from '@/lib/i18n/dictionaries';
import type { ListResponse, ProposalRowDto } from '@/lib/api/proposals/list';
import { ProposalRow } from './ProposalRow';
import { LoadMoreButton } from './LoadMoreButton';
import { DraftActionsClient } from './DraftActionsClient';
import { RowActionsClient } from './RowActionsClient';

export interface ProposalsListProps {
  lang: Lang;
  initial: ListResponse;
}

export function ProposalsList({ lang, initial }: ProposalsListProps) {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const deleted = searchParams.get('deleted') === '1';
  const draftMode = searchParams.get('drafts') === '1';

  // React re-mounts this component (via key={remountKey} in page.tsx) whenever
  // q or deleted changes — so useState initial values are fresh on each navigation.
  const [rows, setRows] = useState<ProposalRowDto[]>(initial.rows);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [cursor, setCursor] = useState(initial.nextCursor);

  const onAppend = (response: ListResponse) => {
    setRows((prev) => [...prev, ...response.rows]);
    setHasMore(response.hasMore);
    setCursor(response.nextCursor);
  };

  return (
    <div>
      {rows.map((row) => (
        <ProposalRow
          key={row.id}
          row={row}
          lang={lang}
          deleted={deleted}
          draftMode={draftMode}
          actionsSlot={
            !draftMode ? <RowActionsClient proposalId={row.id} lang={lang} displayStatus={row.displayStatus} /> : null
          }
          draftActionsSlot={
            draftMode ? <DraftActionsClient proposalId={row.id} lang={lang} /> : null
          }
        />
      ))}
      {hasMore && (
        <LoadMoreButton
          lang={lang}
          q={q}
          deleted={deleted}
          drafts={draftMode}
          cursor={cursor}
          onAppend={onAppend}
        />
      )}
    </div>
  );
}

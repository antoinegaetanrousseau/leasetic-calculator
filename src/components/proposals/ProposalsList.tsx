'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileText, SearchX, Trash2 } from 'lucide-react';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import type { ListResponse, ProposalRowDto } from '@/lib/api/proposals/list';
import { ProposalRow } from './ProposalRow';
import { LoadMoreButton } from './LoadMoreButton';
import { RestoreButtonClient } from './RestoreButtonClient';

export interface ProposalsListProps {
  lang: Lang;
  initial: ListResponse;
  /**
   * Unix-ms timestamp for "now" — computed server-side so ValidityChip stays
   * a pure render function (react-hooks/purity pattern from Plan 08-10).
   */
  nowMs: number;
}

export function ProposalsList({ lang, initial, nowMs }: ProposalsListProps) {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const deleted = searchParams.get('deleted') === '1';

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

  if (rows.length === 0) {
    // Empty states per UI-SPEC §3.1.6
    if (q.length > 0) {
      return (
        <EmptyBlock
          icon={
            <SearchX
              size={38}
              strokeWidth={1.3}
              color="var(--muted)"
              style={{ opacity: 0.4 }}
            />
          }
          title={t('proposal.search.empty.title', lang)}
          body={t('proposal.search.empty.body', lang)}
        />
      );
    }
    if (deleted) {
      return (
        <EmptyBlock
          icon={
            <Trash2
              size={38}
              strokeWidth={1.3}
              color="var(--muted)"
              style={{ opacity: 0.4 }}
            />
          }
          title={t('proposal.deleted.empty.title', lang)}
          body={t('proposal.deleted.empty.body', lang)}
        />
      );
    }
    // New-partner empty-state (Phase 7 PROP-04 — preserved):
    // q="" + deleted=false + rows=[] means truly no proposals for this account.
    return (
      <EmptyBlock
        icon={
          <FileText
            size={38}
            strokeWidth={1.3}
            color="var(--muted)"
            style={{ opacity: 0.4 }}
          />
        }
        title={t('dashboard.empty.title', lang)}
        body={t('dashboard.empty.body', lang)}
      />
    );
  }

  return (
    <div>
      {rows.map((row) => (
        <ProposalRow
          key={row.id}
          row={row}
          lang={lang}
          nowMs={nowMs}
          deleted={deleted}
          restoreSlot={
            deleted ? <RestoreButtonClient proposalId={row.id} lang={lang} /> : null
          }
        />
      ))}
      {hasMore && (
        <LoadMoreButton
          lang={lang}
          q={q}
          deleted={deleted}
          cursor={cursor}
          onAppend={onAppend}
        />
      )}
    </div>
  );
}

function EmptyBlock({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 16px',
        textAlign: 'center',
        gap: 12,
      }}
    >
      {icon}
      <h2 style={{ fontSize: 16.5, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
        {title}
      </h2>
      <p style={{ fontSize: 14.5, color: 'var(--muted)', maxWidth: 480, margin: 0 }}>
        {body}
      </p>
    </div>
  );
}

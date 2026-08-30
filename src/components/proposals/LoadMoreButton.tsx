'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { LoaderIcon, PlusIcon } from '@/components/ui/icons';
import { toast } from 'sonner';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import type { ListResponse } from '@/lib/api/proposals/list';

export interface LoadMoreButtonProps {
  lang: Lang;
  q: string;
  /**
   * Archivées filter (Phase 17 D-13). MUST match the flag the initial server
   * render used, or the appended page comes from a different result set — this
   * was previously the legacy `deleted` flag, which the page never set, so
   * paginating the archived view appended active rows.
   */
  archived: boolean;
  drafts: boolean;
  cursor: string | null;
  onAppend: (response: ListResponse) => void;
}

export function LoadMoreButton({
  lang,
  q,
  archived,
  drafts,
  cursor,
  onAppend,
}: LoadMoreButtonProps) {
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('cursor', cursor);
      if (q) params.set('q', q);
      if (archived) params.set('archived', '1');
      if (drafts) params.set('drafts', '1');
      const res = await fetch(`/api/proposals?${params.toString()}`);
      if (res.ok) {
        const json = (await res.json()) as ListResponse;
        onAppend(json);
      } else {
        toast.error(t('proposal.list.load.more.error', lang));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
      <button
        type="button"
        className="btn-out"
        onClick={onClick}
        disabled={loading}
        aria-label={t('proposal.list.load.more', lang)}
        style={{ opacity: loading ? 0.6 : 1 }}
      >
        {loading ? (
          <HugeiconsIcon icon={LoaderIcon} size={17} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" />
        ) : (
          <HugeiconsIcon icon={PlusIcon} size={17} aria-hidden="true" />
        )}
        {loading
          ? t('proposal.list.load.more.loading', lang)
          : t('proposal.list.load.more', lang)}
      </button>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import type { ListResponse } from '@/lib/api/proposals/list';

export interface LoadMoreButtonProps {
  lang: Lang;
  q: string;
  deleted: boolean;
  cursor: string | null;
  onAppend: (response: ListResponse) => void;
}

export function LoadMoreButton({
  lang,
  q,
  deleted,
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
      if (deleted) params.set('deleted', '1');
      const res = await fetch(`/api/proposals?${params.toString()}`);
      if (res.ok) {
        const json = (await res.json()) as ListResponse;
        onAppend(json);
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
          <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" />
        ) : (
          <Plus size={17} aria-hidden="true" />
        )}
        {loading
          ? t('proposal.list.load.more.loading', lang)
          : t('proposal.list.load.more', lang)}
      </button>
    </div>
  );
}

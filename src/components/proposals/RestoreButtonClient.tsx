'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { t, type Lang } from '@/lib/i18n/dictionaries';

export interface RestoreButtonClientProps {
  proposalId: string;
  lang: Lang;
}

export function RestoreButtonClient({ proposalId, lang }: RestoreButtonClientProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/restore`, { method: 'POST' });
      if (!res.ok) {
        toast.error(t('proposal.toast.restore.error', lang));
        return;
      }
      toast.success(t('proposal.toast.restore.success', lang));
      router.push(`/proposals/${proposalId}`);
      router.refresh();    // server-component re-fetch so the page state shows non-deleted
    } catch {
      toast.error(t('proposal.toast.restore.error', lang));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className="btn-green"
      onClick={onClick}
      disabled={busy}
      style={{
        width: '100%', justifyContent: 'center',
        opacity: busy ? 0.6 : 1,
      }}
      aria-label={t('proposal.detail.action.restore', lang)}
    >
      <Undo2 size={17} />
      {t('proposal.detail.action.restore', lang)}
    </button>
  );
}

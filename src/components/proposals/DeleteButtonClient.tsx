'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { t, type Lang } from '@/lib/i18n/dictionaries';

export interface DeleteButtonClientProps {
  proposalId: string;
  lang: Lang;
}

export function DeleteButtonClient({ proposalId, lang }: DeleteButtonClientProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (busy) return;
    if (typeof window === 'undefined') return;
    if (!window.confirm(t('proposal.confirm.delete', lang))) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/delete`, { method: 'POST' });
      if (!res.ok) {
        toast.error(t('proposal.toast.delete.error', lang));
        return;
      }
      toast.success(t('proposal.toast.delete.success', lang), {
        action: {
          label: t('proposal.toast.delete.action.view.deleted', lang),
          onClick: () => router.push('/?deleted=1'),
        },
        duration: 6000,
      });
      router.push('/?deleted_just=1');
    } catch {
      toast.error(t('proposal.toast.delete.error', lang));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className="btn-out"
      onClick={onClick}
      disabled={busy}
      style={{
        width: '100%', justifyContent: 'center',
        opacity: busy ? 0.6 : 1,
      }}
      aria-label={t('proposal.detail.action.delete', lang)}
    >
      <Trash2 size={17} />
      {t('proposal.detail.action.delete', lang)}
    </button>
  );
}

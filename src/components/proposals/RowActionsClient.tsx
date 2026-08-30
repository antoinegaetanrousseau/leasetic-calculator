'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArchiveIcon, UndoIcon } from '@/components/ui/icons';
import { toast } from 'sonner';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { type DisplayStatus } from '@/lib/db/queries';

export interface RowActionsClientProps {
  proposalId: string;
  lang: Lang;
  displayStatus: DisplayStatus;
}

const ICON_BTN: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 30,
  height: 30,
  borderRadius: 6,
  border: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--muted)',
  cursor: 'pointer',
  transition: 'background 120ms, color 120ms, border-color 120ms',
  padding: 0,
  flexShrink: 0,
};

export function RowActionsClient({ proposalId, lang, displayStatus }: RowActionsClientProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (displayStatus === 'draft') {
    return null;
  }

  if (displayStatus === 'deleted') {
    const handleRestore = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (busy) return;
      setBusy(true);
      try {
        const res = await fetch(`/api/proposals/${proposalId}/restore`, { method: 'POST' });
        if (!res.ok) {
          toast.error(t('proposal.toast.restore.error', lang));
          return;
        }
        toast.success(t('proposal.toast.restore.success', lang));
        router.refresh();
      } catch {
        toast.error(t('proposal.toast.restore.error', lang));
      } finally {
        setBusy(false);
      }
    };

    return (
      <div
        style={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'flex-end' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          style={{ ...ICON_BTN, opacity: busy ? 0.5 : 1 }}
          onClick={handleRestore}
          aria-label={t('proposal.detail.action.restore', lang)}
          title={t('proposal.detail.action.restore', lang)}
          disabled={busy}
        >
          <UndoIcon size={14} />
        </button>
      </div>
    );
  }

  // displayStatus === 'active' | 'expired'
  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/delete`, { method: 'POST' });
      if (!res.ok) {
        toast.error(t('proposal.row.toast.archive.error', lang));
        return;
      }
      toast.success(t('proposal.row.toast.archive.success', lang), {
        action: {
          label: t('proposal.row.toast.archive.action.viewArchived', lang),
          onClick: () => router.push('/proposals?archived=1'),
        },
        duration: 6000,
      });
      router.refresh();
    } catch {
      toast.error(t('proposal.row.toast.archive.error', lang));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'flex-end' }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        style={{ ...ICON_BTN, opacity: busy ? 0.5 : 1 }}
        onClick={handleArchive}
        aria-label={t('proposal.row.action.archive', lang)}
        title={t('proposal.row.action.archive', lang)}
        disabled={busy}
      >
        <ArchiveIcon size={14} />
      </button>
    </div>
  );
}

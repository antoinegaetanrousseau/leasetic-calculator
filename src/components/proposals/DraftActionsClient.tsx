'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArchiveIcon, PencilIcon, TrashIcon } from '@/components/ui/icons';
import { toast } from 'sonner';
import { t, type Lang } from '@/lib/i18n/dictionaries';

export interface DraftActionsClientProps {
  proposalId: string;
  lang: Lang;
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

const ICON_BTN_DANGER: React.CSSProperties = {
  ...ICON_BTN,
  color: 'var(--red, #dc2626)',
  borderColor: 'transparent',
};

export function DraftActionsClient({ proposalId, lang }: DraftActionsClientProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<'archive' | 'delete' | null>(null);

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setBusy('archive');
    try {
      const res = await fetch(`/api/proposals/${proposalId}/draft-archive`, { method: 'POST' });
      if (!res.ok) {
        toast.error(t('proposal.draft.toast.archive.error', lang));
        return;
      }
      toast.success(t('proposal.draft.toast.archive.success', lang));
      router.refresh();
    } catch {
      toast.error(t('proposal.draft.toast.archive.error', lang));
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    if (!window.confirm(t('proposal.draft.confirm.delete', lang))) return;
    setBusy('delete');
    try {
      const res = await fetch(`/api/proposals/${proposalId}/draft-delete`, { method: 'POST' });
      if (!res.ok) {
        toast.error(t('proposal.draft.toast.delete.error', lang));
        return;
      }
      toast.success(t('proposal.draft.toast.delete.success', lang));
      router.refresh();
    } catch {
      toast.error(t('proposal.draft.toast.delete.error', lang));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      style={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'flex-end' }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        style={ICON_BTN}
        onClick={(e) => { e.stopPropagation(); router.push(`/proposals/new/parametres?draft_id=${proposalId}`); }}
        aria-label={t('proposal.draft.action.edit', lang)}
        title={t('proposal.draft.action.edit', lang)}
        disabled={busy !== null}
      >
        <HugeiconsIcon icon={PencilIcon} size={14} />
      </button>
      <button
        type="button"
        style={{ ...ICON_BTN, opacity: busy === 'archive' ? 0.5 : 1 }}
        onClick={handleArchive}
        aria-label={t('proposal.draft.action.archive', lang)}
        title={t('proposal.draft.action.archive', lang)}
        disabled={busy !== null}
      >
        <HugeiconsIcon icon={ArchiveIcon} size={14} />
      </button>
      <button
        type="button"
        style={{ ...ICON_BTN_DANGER, opacity: busy === 'delete' ? 0.5 : 1 }}
        onClick={handleDelete}
        aria-label={t('proposal.draft.action.delete', lang)}
        title={t('proposal.draft.action.delete', lang)}
        disabled={busy !== null}
      >
        <HugeiconsIcon icon={TrashIcon} size={14} />
      </button>
    </div>
  );
}

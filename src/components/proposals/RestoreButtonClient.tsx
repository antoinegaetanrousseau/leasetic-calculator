'use client';
// Plan 08-10 stub. Plan 08-12 implements the server action call + sonner toast.
import { Undo2 } from 'lucide-react';
import { t, type Lang } from '@/lib/i18n/dictionaries';

export interface RestoreButtonClientProps {
  proposalId: string;
  lang: Lang;
}

/**
 * Restore button stub — shown when proposal.deletedAt IS NOT NULL.
 * Plan 08-12 replaces the body with the real server action wiring.
 */
export function RestoreButtonClient({ proposalId, lang }: RestoreButtonClientProps) {
  // TODO 08-12: wire onClick to server action (restoreProposal + sonner toast)
  void proposalId;
  return (
    <button
      type="button"
      className="btn-out"
      style={{ width: '100%', justifyContent: 'center' }}
    >
      <Undo2 size={17} />
      {t('proposal.detail.action.restore', lang)}
    </button>
  );
}

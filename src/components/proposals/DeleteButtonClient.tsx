'use client';
// Plan 08-10 stub. Plan 08-12 implements the server action call + sonner toast.
import { Trash2 } from 'lucide-react';
import { t, type Lang } from '@/lib/i18n/dictionaries';

export interface DeleteButtonClientProps {
  proposalId: string;
  lang: Lang;
}

/**
 * Delete button stub — PROP-21 entry point.
 * Plan 08-12 replaces the body with the real server action wiring.
 * The outer page (08-10) already passes the correct props so 08-12
 * only needs to ship the implementation here.
 */
export function DeleteButtonClient({ proposalId, lang }: DeleteButtonClientProps) {
  // TODO 08-12: wire onClick to server action (softDelete + sonner toast)
  void proposalId;
  return (
    <button
      type="button"
      className="btn-out"
      style={{ width: '100%', justifyContent: 'center' }}
    >
      <Trash2 size={17} />
      {t('proposal.detail.action.delete', lang)}
    </button>
  );
}

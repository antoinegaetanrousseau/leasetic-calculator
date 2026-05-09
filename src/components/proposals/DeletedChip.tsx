import { Trash2 } from 'lucide-react';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { formatDate } from '@/lib/i18n/format';

export interface DeletedChipProps {
  deletedAt: Date;
  lang: Lang;
}

/**
 * Soft-deleted chip — shown when proposal.deletedAt IS NOT NULL.
 * Renders "Supprimée le DD/MM/YYYY" with a trash icon.
 */
export function DeletedChip({ deletedAt, lang }: DeletedChipProps) {
  const label = t('proposal.chip.deleted', lang).replace('{0}', formatDate(deletedAt, lang));
  return (
    <span className="chip chip-deleted">
      <Trash2 size={12} aria-hidden="true" />
      {label}
    </span>
  );
}

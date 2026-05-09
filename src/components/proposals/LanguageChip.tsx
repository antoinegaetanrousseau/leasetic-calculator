import { t, type Lang } from '@/lib/i18n/dictionaries';

export interface LanguageChipProps {
  /** D-8-19: the proposal's SNAPSHOT language, NOT the session lang. */
  proposalLanguage: 'fr' | 'en';
  /** Lang for the tooltip text only. */
  lang: Lang;
}

/**
 * FR/EN language chip — shows the snapshot language the PDF was generated in.
 * D-8-19: always reads proposal.language, NOT the session's current locale.
 */
export function LanguageChip({ proposalLanguage, lang }: LanguageChipProps) {
  return (
    <span
      className="chip chip-language"
      title={t('proposal.chip.language.tooltip', proposalLanguage)}
      aria-label={t('proposal.chip.language.tooltip', lang)}
    >
      {proposalLanguage.toUpperCase()}
    </span>
  );
}

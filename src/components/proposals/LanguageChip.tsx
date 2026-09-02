import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
 *
 * Phase 2: migrated off the v10 `.chip .chip-language` rules onto the ReUI
 * Badge, matching StatusChip. The teal tint is preserved exactly —
 * `.chip-language` was `rgba(45,122,140,0.10)` on `var(--teal)`, which is what
 * `bg-teal/10 text-teal` resolves to. Teal is a LABEL colour here, never an
 * interactive one (DS rule 1: green is the only click-me signal).
 */
export function LanguageChip({ proposalLanguage, lang }: LanguageChipProps) {
  return (
    <Badge
      variant="secondary"
      data-language={proposalLanguage}
      className={cn(
        'rounded-full border-transparent font-semibold shadow-none',
        'bg-teal/10 text-teal',
      )}
      title={t('proposal.chip.language.tooltip', proposalLanguage)}
      aria-label={t('proposal.chip.language.tooltip', lang)}
    >
      {proposalLanguage.toUpperCase()}
    </Badge>
  );
}

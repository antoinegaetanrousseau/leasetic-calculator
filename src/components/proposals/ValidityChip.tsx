import { CircleDot, Clock } from 'lucide-react';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { formatDate } from '@/lib/i18n/format';

export interface ValidityChipProps {
  createdAt: Date;
  validityDays: 15 | 30 | 60;
  lang: Lang;
  /**
   * Unix ms timestamp for "now". Caller passes Date.now() so the impure
   * call stays in the Server Component (where purity rules don't apply to
   * plain async functions) and this chip stays a pure render function.
   * D-8-18: variant derived at render time — no denormalized column.
   */
  nowMs: number;
}

/**
 * Active vs Expired derivation (D-8-18): renders at render time from
 * (createdAt, validityDays, nowMs). No denormalized column.
 *
 * PROP-26: shows the validity status chip + expiration date in tooltip.
 */
export function ValidityChip({ createdAt, validityDays, lang, nowMs }: ValidityChipProps) {
  const expiresAt = new Date(createdAt.getTime() + validityDays * 86_400_000);
  const isActive = nowMs < expiresAt.getTime();
  const className = isActive ? 'chip chip-active' : 'chip chip-expired';
  const label = isActive ? t('proposal.chip.active', lang) : t('proposal.chip.expired', lang);
  const tooltipKey = isActive ? 'proposal.chip.tooltip.expires' : 'proposal.chip.tooltip.expired';
  const tooltip = t(tooltipKey, lang).replace('{0}', formatDate(expiresAt, lang));

  return (
    <span className={className} title={tooltip}>
      {isActive ? (
        <CircleDot size={12} fill="currentColor" aria-hidden="true" />
      ) : (
        <Clock size={12} aria-hidden="true" />
      )}
      {label}
    </span>
  );
}

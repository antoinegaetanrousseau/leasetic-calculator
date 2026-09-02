'use client';

import { segmentedGroup, segmentedButton } from './segmented';

export interface YesNoToggleProps {
  ariaLabel: string;
  /** t('common.yes', lang) — already in the v10 dictionary. */
  yesLabel: string;
  /** t('common.no', lang) */
  noLabel: string;
  value: boolean | undefined;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

/**
 * v10 .yn-btn port — UI-SPEC §3.2.5 + §13 a11y.
 *
 * Returns boolean (true = Yes/Oui, false = No/Non). Internal mapping to
 * v10's 'oui' / 'non' string format is the consumer's job (Phase 8 PDF
 * may need that legacy format; Phase 7 stores boolean per CONTEXT D-3).
 *
 * Phase 2: the `.yn-group` / `.yn-btn` v10 classes were retired in favour of
 * the shared segmented chrome in ./segmented, which DurationSegmented also
 * uses. Appearance and a11y are unchanged.
 */
export function YesNoToggle({
  ariaLabel,
  yesLabel,
  noLabel,
  value,
  onChange,
  disabled = false,
}: YesNoToggleProps) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={segmentedGroup()}>
      <button
        type="button"
        role="radio"
        aria-checked={value === true}
        disabled={disabled}
        className={segmentedButton({ active: value === true })}
        onClick={() => !disabled && onChange(true)}
      >
        {yesLabel}
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === false}
        disabled={disabled}
        className={segmentedButton({ active: value === false })}
        onClick={() => !disabled && onChange(false)}
      >
        {noLabel}
      </button>
    </div>
  );
}

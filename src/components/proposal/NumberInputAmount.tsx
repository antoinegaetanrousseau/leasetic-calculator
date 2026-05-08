'use client';

import { type ChangeEvent, type FocusEvent, useId } from 'react';
import { BarChart3 } from 'lucide-react';
import { tKey, tLabel } from '@/lib/calc';
import { t, type Lang } from '@/lib/i18n/dictionaries';

export interface NumberInputAmountProps {
  /** Form-state value: digit-only string (e.g., "75000"). */
  value: string;
  /** Receives digit-only string (no separators, no non-digits). */
  onChange: (next: string) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  invalid?: boolean;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
  inputId?: string;
  placeholder?: string;
  lang: Lang;
  disabled?: boolean;
}

/**
 * Amount field — port of v10 lines 2175-2189.
 *
 * Wire: type=text + inputMode=numeric (D-7-09 — type=number is INCOMPATIBLE
 * with the U+202F narrow-no-break-space thousand-separator formatter).
 *
 * Display: digit-only stripped, then re-formatted with a narrow no-break
 * space (U+202F) every 3 digits right-anchored (v10 line 2181 regex).
 * Storage in form-state is digit-only.
 *
 * Tranche badge: auto-shown below input when amount > 25000 && tKey(amount)
 * !== null (D-7-10).
 */
export function NumberInputAmount({
  value,
  onChange,
  onBlur,
  invalid = false,
  ariaDescribedBy,
  ariaInvalid,
  inputId,
  placeholder,
  lang,
  disabled = false,
}: NumberInputAmountProps) {
  const generatedId = useId();
  const finalId = inputId ?? generatedId;

  // Display value = digit-only stripped + U+202F separators (v10 line 2181).
  // The literal here is U+202F NARROW NO-BREAK SPACE (the v10 separator).
  const display =
    value.length > 0 ? value.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '';

  const onInput = (e: ChangeEvent<HTMLInputElement>) => {
    // Strip every non-digit, including any U+202F separators the user pasted.
    const raw = e.target.value.replace(/\D/g, '');
    onChange(raw);
  };

  const num = value === '' ? NaN : Number.parseInt(value, 10);
  const showBadge = !Number.isNaN(num) && num > 25000 && tKey(num) !== null;
  const trancheKey = showBadge ? tKey(num) : null;

  return (
    <>
      <div className={'ieu' + (invalid ? ' invalid' : '')}>
        <input
          id={finalId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={15}
          aria-invalid={ariaInvalid || invalid || undefined}
          aria-describedby={ariaDescribedBy}
          placeholder={placeholder}
          disabled={disabled}
          value={display}
          onChange={onInput}
          onBlur={onBlur}
        />
        <span className="suffix">{t('common.ht', lang)}</span>
      </div>
      {showBadge && trancheKey ? (
        <div className="tbadge" aria-live="polite">
          <BarChart3 size={14} strokeWidth={1.6} aria-hidden="true" />
          <span>
            {t('form.tranche.label', lang).replace(
              '{0}',
              t(tLabel(trancheKey), lang)
            )}
          </span>
        </div>
      ) : null}
    </>
  );
}

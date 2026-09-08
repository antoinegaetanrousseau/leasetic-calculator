'use client';

import { Input } from '@/components/ui/input';
import { type ChangeEvent, type FocusEvent, useId } from 'react';

/**
 * Phase 42 Plan 08 (FIELD-01 / D-01..D-04) — display-formatting mirror of
 * `SirenInput.tsx`, grouped 3-3-3-5 over 14 digits instead of SIREN's 3-3-3
 * over 9. Digits-only storage is the responsibility of `requiredSiretSchema`'s
 * `.transform()` in `src/lib/calc/schema.ts` (Plan 42-03) — this component
 * does not strip or normalize beyond its own display formatting, and does not
 * import from `@/lib/crm/siren`.
 *
 * D-03: no spinner, badge, or status affordance renders here. This component
 * has no knowledge of the registry — the silent prefill/fallback wiring lives
 * one level up, in `ParametresFormCard.tsx`.
 */
export interface SiretInputProps {
  value: string;
  onChange: (next: string) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  invalid?: boolean;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  inputId?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Format raw input to "XXX XXX XXX XXXXX" (3-3-3-5 grouping over 14 digits).
 * Strip non-digits, slice to 14, and insert a space before indices 3, 6 and 9.
 */
export function formatSiret(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 14);
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (i === 3 || i === 6 || i === 9)) out += ' ';
    out += digits[i];
  }
  return out;
}

export function SiretInput({
  value,
  onChange,
  onBlur,
  invalid = false,
  ariaInvalid,
  ariaDescribedBy,
  inputId,
  placeholder,
  disabled = false,
}: SiretInputProps) {
  const id = useId();
  const finalId = inputId ?? id;

  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(formatSiret(e.target.value));
  };

  return (
    <Input
      id={finalId}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      aria-invalid={ariaInvalid || invalid || undefined}
      aria-describedby={ariaDescribedBy}
      placeholder={placeholder}
      disabled={disabled}
      value={value}
      onChange={handle}
      onBlur={onBlur}
      maxLength={17} /* 14 digits + 3 spaces */
    />
  );
}

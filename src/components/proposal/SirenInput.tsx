'use client';

import { type ChangeEvent, type FocusEvent, useId } from 'react';

export interface SirenInputProps {
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
 * Format raw input to "XXX XXX XXX" (v10 lines 2103-2111).
 * Strip non-digits, slice to 9 digits, group every 3 with a regular space.
 */
export function formatSiren(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 9);
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && i % 3 === 0) out += ' ';
    out += digits[i];
  }
  return out;
}

export function SirenInput({
  value,
  onChange,
  onBlur,
  invalid = false,
  ariaInvalid,
  ariaDescribedBy,
  inputId,
  placeholder,
  disabled = false,
}: SirenInputProps) {
  const id = useId();
  const finalId = inputId ?? id;

  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(formatSiren(e.target.value));
  };

  return (
    <input
      id={finalId}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      aria-invalid={ariaInvalid || invalid || undefined}
      aria-describedby={ariaDescribedBy}
      className={invalid ? 'invalid' : ''}
      placeholder={placeholder}
      disabled={disabled}
      value={value}
      onChange={handle}
      onBlur={onBlur}
      maxLength={11} /* 9 digits + 2 spaces — matches v10 input maxlength */
    />
  );
}

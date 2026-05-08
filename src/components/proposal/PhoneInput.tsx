'use client';

import { type ChangeEvent, type FocusEvent, useId } from 'react';

export interface PhoneInputProps {
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
 * Format raw input to "XX XX XX XX XX" (v10 lines 2092-2100).
 * Strip non-digits, slice to 10 digits, group every 2 with a regular space.
 */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && i % 2 === 0) out += ' ';
    out += digits[i];
  }
  return out;
}

export function PhoneInput({
  value,
  onChange,
  onBlur,
  invalid = false,
  ariaInvalid,
  ariaDescribedBy,
  inputId,
  placeholder,
  disabled = false,
}: PhoneInputProps) {
  const id = useId();
  const finalId = inputId ?? id;

  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(formatPhone(e.target.value));
  };

  return (
    <input
      id={finalId}
      type="tel"
      inputMode="numeric"
      autoComplete="tel-national"
      aria-invalid={ariaInvalid || invalid || undefined}
      aria-describedby={ariaDescribedBy}
      className={invalid ? 'invalid' : ''}
      placeholder={placeholder}
      disabled={disabled}
      value={value}
      onChange={handle}
      onBlur={onBlur}
      maxLength={14} /* 10 digits + 4 spaces */
    />
  );
}

'use client';

import { useId, useRef, type KeyboardEvent } from 'react';

export interface SegmentedOption<V extends number = number> {
  value: V;
  /** Localized — caller passes the already-translated string. */
  label: string;
}

export interface DurationSegmentedProps<V extends number = number> {
  /** Stable id for the radiogroup wrapper (a11y). */
  id?: string;
  /** Localized aria-label for the radiogroup (e.g. t('form.project.duration', lang)). */
  ariaLabel: string;
  /** The 3 (or N) options to render. Phase 7 uses 3 for both duration and validity. */
  options: ReadonlyArray<SegmentedOption<V>>;
  /** Currently selected value (controlled). Pass null/undefined for "no selection". */
  value: V | null | undefined;
  /** Change handler. Called with the option's `value`. */
  onChange: (next: V) => void;
  /** Whether the wrapper should render in invalid state (red ring). */
  invalid?: boolean;
  /** Whether interaction is disabled. */
  disabled?: boolean;
}

/**
 * Shared 3-button segmented control (D-7-16): used both for project duration
 * (36/48/60 mo) by Plan 07-04 and for proposal validity (15/30/60 days) by
 * Plan 07-05.
 *
 * Visual contract: .dg / .db / .db.on (added to globals.css by Plan 07-03,
 * itself ported from v10 lines 200-260 + UI-SPEC §3.2.5).
 *
 * Accessibility (UI-SPEC §13): role=radiogroup on wrapper, role=radio +
 * aria-checked on each button. Arrow keys cycle within the group; Tab moves
 * to the next focusable element.
 */
export function DurationSegmented<V extends number = number>({
  id,
  ariaLabel,
  options,
  value,
  onChange,
  invalid = false,
  disabled = false,
}: DurationSegmentedProps<V>) {
  const groupId = useId();
  const finalId = id ?? groupId;
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (disabled) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (idx + 1) % options.length;
      buttonsRef.current[next]?.focus();
      onChange(options[next]!.value);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (idx - 1 + options.length) % options.length;
      buttonsRef.current[prev]?.focus();
      onChange(options[prev]!.value);
    }
  };

  return (
    <div
      id={finalId}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      className={'dg' + (invalid ? ' invalid' : '')}
    >
      {options.map((opt, idx) => {
        const isOn = value === opt.value;
        return (
          <button
            key={String(opt.value)}
            ref={(el) => {
              buttonsRef.current[idx] = el;
            }}
            type="button"
            role="radio"
            aria-checked={isOn}
            aria-label={opt.label}
            tabIndex={isOn || (value == null && idx === 0) ? 0 : -1}
            disabled={disabled}
            className={'db' + (isOn ? ' on' : '')}
            onClick={() => !disabled && onChange(opt.value)}
            onKeyDown={(e) => onKey(e, idx)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

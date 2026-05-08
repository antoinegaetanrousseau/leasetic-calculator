'use client';

import { useEffect, useState } from 'react';

/**
 * Debounce a value by a fixed delay. UI-SPEC §5.2 + D-7-02 → 300ms default.
 *
 * Plan 07-05 uses this on the [amountHT, durationMonths, validityDays] tuple
 * watched from RHF: the live-preview only re-computes when typing pauses for
 * 300ms, avoiding layout-jank during fast typing while still feeling "live".
 *
 * Generic over T so the same hook serves single-value (string, number) and
 * tuple/object cases (the live-preview's [amount, duration, validity] tuple).
 */
export function useDebouncedValue<T>(value: T, delayMs: number = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}

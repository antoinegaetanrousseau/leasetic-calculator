'use client';

import { setLang } from '@/lib/i18n/actions';
import { startTransition } from 'react';
import { cn } from '@/lib/utils';
import type { Lang } from '@/lib/i18n/dictionaries';

/**
 * FR/EN segmented control.
 *
 * Phase 2: inline styles replaced with utilities bound to the token spine
 * (bg-background / border-border / bg-primary come from the ReUI token layer in
 * globals.css). Appearance is unchanged.
 *
 * Deliberately NOT converted to shadcn ToggleGroup: this is a mutually
 * exclusive choice, so role="radiogroup" + aria-checked is the correct
 * contract. ToggleGroup would express it as aria-pressed toggle buttons,
 * which is a weaker description of the same UI.
 */
export function LocaleToggle({ current, fullWidth = false }: { current: Lang; fullWidth?: boolean }) {
  const options: Lang[] = ['fr', 'en'];
  return (
    <div
      className={cn(
        'items-center rounded-full border border-border bg-background p-1',
        fullWidth ? 'flex w-full' : 'inline-flex',
      )}
      role="radiogroup"
      aria-label="Language"
    >
      {options.map((value) => {
        const active = current === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => startTransition(() => { void setLang(value); })}
            className={cn(
              'rounded-full px-3 py-1.5 text-[11.5px] font-semibold tracking-[0.04em] uppercase transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              fullWidth && 'flex-1 text-center',
            )}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}

'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { setTheme } from '@/lib/theme/actions';
import { startTransition } from 'react';
import { cn } from '@/lib/utils';

type ThemeOption = 'light' | 'system' | 'dark';

/**
 * Light / system / dark segmented control.
 *
 * Phase 2: inline styles replaced with utilities bound to the token spine.
 * Appearance is unchanged. See LocaleToggle for why this keeps
 * role="radiogroup" rather than moving to shadcn ToggleGroup.
 */
export function ThemeToggle({ current, fullWidth = false }: { current: ThemeOption; fullWidth?: boolean }) {
  const options: { value: ThemeOption; icon: React.ComponentType<{ size: number; strokeWidth: number }>; label: string }[] = [
    { value: 'light',  icon: Sun,     label: 'Light' },
    { value: 'system', icon: Monitor, label: 'System' },
    { value: 'dark',   icon: Moon,    label: 'Dark' },
  ];

  return (
    <div
      className={cn(
        'items-center rounded-full border border-border bg-paper p-1',
        fullWidth ? 'flex w-full' : 'inline-flex',
      )}
      role="radiogroup"
      aria-label="Theme"
    >
      {options.map(({ value, icon: Icon, label }) => {
        const active = current === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            onClick={() => startTransition(() => { void setTheme(value); })}
            className={cn(
              'rounded-full px-3 py-1.5 transition-colors',
              active ? 'bg-gd text-white' : 'text-[var(--muted)] hover:text-ink',
              fullWidth && 'inline-flex flex-1 justify-center',
            )}
          >
            <Icon size={17} strokeWidth={1.6} />
          </button>
        );
      })}
    </div>
  );
}

'use client';

import { SunIcon, MonitorIcon, MoonIcon } from '@/components/ui/icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
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
  const options: { value: ThemeOption; icon: IconSvgElement; label: string }[] = [
    { value: 'light',  icon: SunIcon,     label: 'Light' },
    { value: 'system', icon: MonitorIcon, label: 'System' },
    { value: 'dark',   icon: MoonIcon,    label: 'Dark' },
  ];

  return (
    <div
      className={cn(
        'items-center rounded-full border border-border bg-background p-1',
        fullWidth ? 'flex w-full' : 'inline-flex',
      )}
      role="radiogroup"
      aria-label="Theme"
    >
      {options.map(({ value, icon, label }) => {
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
              active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              fullWidth && 'inline-flex flex-1 justify-center',
            )}
          >
            <HugeiconsIcon icon={icon} size={17} strokeWidth={1.6} />
          </button>
        );
      })}
    </div>
  );
}

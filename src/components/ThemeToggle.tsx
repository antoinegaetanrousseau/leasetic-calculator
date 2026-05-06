'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { setTheme } from '@/lib/theme/actions';
import { startTransition } from 'react';

type ThemeOption = 'light' | 'system' | 'dark';

export function ThemeToggle({ current }: { current: ThemeOption }) {
  const options: { value: ThemeOption; icon: React.ComponentType<{ size: number; strokeWidth: number }>; label: string }[] = [
    { value: 'light',  icon: Sun,     label: 'Light' },
    { value: 'system', icon: Monitor, label: 'System' },
    { value: 'dark',   icon: Moon,    label: 'Dark' },
  ];

  return (
    <div
      className="inline-flex items-center rounded-full border p-1"
      style={{ background: 'var(--paper)', borderColor: 'var(--border)' }}
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
            className="rounded-full px-3 py-1.5 transition-colors"
            style={{
              background: active ? 'var(--gd)' : 'transparent',
              color: active ? '#ffffff' : 'var(--muted)',
            }}
          >
            <Icon size={17} strokeWidth={1.6} />
          </button>
        );
      })}
    </div>
  );
}

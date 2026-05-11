'use client';

import { setLang } from '@/lib/i18n/actions';
import { startTransition } from 'react';
import type { Lang } from '@/lib/i18n/dictionaries';

export function LocaleToggle({ current, fullWidth = false }: { current: Lang; fullWidth?: boolean }) {
  const options: Lang[] = ['fr', 'en'];
  return (
    <div
      className={
        fullWidth
          ? "flex items-center rounded-full border p-1"
          : "inline-flex items-center rounded-full border p-1"
      }
      style={{
        background: 'var(--paper)',
        borderColor: 'var(--border)',
        ...(fullWidth ? { width: '100%' } : {}),
      }}
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
            className="rounded-full px-3 py-1.5 uppercase"
            style={{
              background: active ? 'var(--gd)' : 'transparent',
              color: active ? '#ffffff' : 'var(--muted)',
              fontSize: '11.5px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              ...(fullWidth ? { flex: 1, textAlign: 'center' as const } : {}),
            }}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}

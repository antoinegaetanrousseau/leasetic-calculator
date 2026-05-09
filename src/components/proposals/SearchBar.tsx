'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { useDebouncedValue } from '@/components/proposal/useDebouncedValue';

export interface SearchBarProps {
  lang: Lang;
}

export function SearchBar({ lang }: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';
  const [value, setValue] = useState<string>(initialQ);
  const debounced = useDebouncedValue(value, 300);

  useEffect(() => {
    const next = new URLSearchParams(Array.from(searchParams.entries()));
    if (debounced.length > 0) {
      next.set('q', debounced);
    } else {
      next.delete('q');
    }
    // Strip cursor when q changes — fresh page from the top
    next.delete('cursor');
    router.replace(`?${next.toString()}`, { scroll: false });
    // Intentionally only re-run when debounced changes — searchParams is stable per render anchor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className="search-bar" role="search">
      <Search size={17} color="var(--muted)" aria-hidden="true" />
      <input
        type="search"
        inputMode="search"
        autoComplete="off"
        spellCheck={false}
        placeholder={t('proposal.search.placeholder', lang)}
        aria-label={t('proposal.search.aria', lang)}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {value && (
        <button
          type="button"
          aria-label={t('proposal.search.clear', lang)}
          onClick={() => setValue('')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            padding: 4,
            borderRadius: 9999,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--muted)',
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

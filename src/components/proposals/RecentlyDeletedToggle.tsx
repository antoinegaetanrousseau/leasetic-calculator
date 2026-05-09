'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { t, type Lang } from '@/lib/i18n/dictionaries';

export interface RecentlyDeletedToggleProps {
  lang: Lang;
}

export function RecentlyDeletedToggle({ lang }: RecentlyDeletedToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDeleted = searchParams.get('deleted') === '1';

  const setDeleted = (next: boolean) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (next) {
      params.set('deleted', '1');
    } else {
      params.delete('deleted');
    }
    params.delete('cursor'); // reset pagination on toggle change
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex',
        border: '1px solid var(--border)',
        borderRadius: 9999,
        padding: 2,
        background: 'var(--paper)',
        gap: 0,
      }}
    >
      <button
        type="button"
        role="tab"
        aria-selected={!isDeleted}
        className={`toggle-pill${!isDeleted ? ' on' : ''}`}
        onClick={() => setDeleted(false)}
      >
        {t('proposal.list.toggle.active', lang)}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={isDeleted}
        className={`toggle-pill${isDeleted ? ' on' : ''}`}
        onClick={() => setDeleted(true)}
      >
        {t('proposal.list.toggle.deleted', lang)}
      </button>
    </div>
  );
}

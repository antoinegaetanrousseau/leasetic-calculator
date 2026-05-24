'use client';

import Link from 'next/link';
import { t, type Lang } from '@/lib/i18n/dictionaries';

/**
 * FilterPillRow — Phase 17 PROPS-02 / D-11 client component.
 *
 * Two pills (Actives / Archivées) rendered as Next.js <Link> elements for
 * full SSR re-render + shareable URLs. Intentionally diverges from
 * RecentlyDeletedToggle's imperative router.replace pattern per D-11.
 *
 * The `archived` boolean is server-derived from `searchParams.archived === '1'`
 * on the parent `/proposals` server page and passed as a prop — this
 * component does NOT read useSearchParams. Stable SSR-rendered active state.
 *
 * Styling derives from existing tokens only (no new CSS):
 *   - Active pill chrome matches `.chip-active` (rgba(18,150,87,0.10) bg +
 *     `--gd-text` color, 600 weight) — UI-SPEC §/proposals Active pill spec.
 *   - Inactive pill chrome matches `.toggle-pill` (transparent bg + `--muted`
 *     color, 500 weight) — UI-SPEC §/proposals Inactive pill spec.
 *   - Wrapper is the segmented pill-row container (UI-SPEC §FilterPillRow):
 *     1px var(--border), 9999px radius, 2px padding, var(--paper) bg.
 *
 * CONTRAST-02 Row 11 (dark-mode active state ~3.9:1) — per PLAN.md Task 1
 * action step 8: adopt Option 1 (accept-with-deviation; matches existing
 * .chip-active baseline). No new tokens introduced; palette stability
 * invariant preserved (ROADMAP §v1.3 §3). Plan 17-08 records the
 * measurement in the contrast audit append.
 */
export interface FilterPillRowProps {
  archived: boolean;
  lang: Lang;
}

const SHARED_PILL_STYLE = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 14px',
  borderRadius: 9999,
  fontSize: 13,
  textDecoration: 'none',
  transition: 'background 150ms, color 150ms',
} as const;

const ACTIVE_PILL_STYLE = {
  ...SHARED_PILL_STYLE,
  background: 'rgba(18, 150, 87, 0.10)',
  color: 'var(--gd-text)',
  fontWeight: 600,
} as const;

const INACTIVE_PILL_STYLE = {
  ...SHARED_PILL_STYLE,
  background: 'transparent',
  color: 'var(--muted)',
  fontWeight: 500,
} as const;

export function FilterPillRow({ archived, lang }: FilterPillRowProps) {
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
      <Link
        href="/proposals"
        data-testid="filter-pill-actives"
        role="tab"
        aria-selected={!archived}
        style={archived ? INACTIVE_PILL_STYLE : ACTIVE_PILL_STYLE}
      >
        {t('proposals.filter.actives', lang)}
      </Link>
      <Link
        href="/proposals?archived=1"
        data-testid="filter-pill-archived"
        role="tab"
        aria-selected={archived}
        style={archived ? ACTIVE_PILL_STYLE : INACTIVE_PILL_STYLE}
      >
        {t('proposals.filter.archived', lang)}
      </Link>
    </div>
  );
}

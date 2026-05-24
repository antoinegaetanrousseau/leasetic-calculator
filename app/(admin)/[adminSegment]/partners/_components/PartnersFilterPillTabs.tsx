/**
 * Phase 18 Plan 03 Task 2 — PartnersFilterPillTabs (D-09).
 *
 * 4-tab variant (user-confirmed deviation from the Figma 3-tab default).
 * Server component — pills are <Link> navigations; no client state. Active
 * pill is derived from the `currentStatus` prop passed in from page.tsx
 * (which read it from `searchParams.status`).
 *
 * Tab keys: 'all' | 'active' | 'invited' | 'inactive'.
 *
 * UI-SPEC §Partners list lines 294-326:
 *   - Tous       href=/<seg>/partners            (no status param)
 *   - Actifs     href=/<seg>/partners?status=active
 *   - Invités    href=/<seg>/partners?status=invited
 *   - Désactivés href=/<seg>/partners?status=inactive
 *   - q is preserved across tab navigations when present.
 *   - Active pill: rgba(18,150,87,0.10) bg + var(--gd-text) text + 600 weight.
 *   - Inactive pill: transparent bg + var(--muted) text + 500 weight.
 *   - Shared chrome: 6px 14px padding, 9999px radius, 13px, no underline.
 *   - data-testid="partner-filter-pill-{key}" on each pill.
 */
import Link from 'next/link';
import { t, type Lang, type DictKey } from '@/lib/i18n/dictionaries';
import type { PartnerStatus } from '@/lib/db/queries/partners';

export interface PartnersFilterPillTabsProps {
  currentStatus?: PartnerStatus;
  currentQ?: string;
  adminSegment: string;
  lang: Lang;
}

const SHARED_PILL_STYLE = {
  display: 'inline-flex' as const,
  alignItems: 'center' as const,
  padding: '6px 14px',
  borderRadius: 9999,
  fontSize: 13,
  textDecoration: 'none' as const,
  transition: 'background 150ms, color 150ms',
};

const ACTIVE_PILL_STYLE = {
  ...SHARED_PILL_STYLE,
  background: 'rgba(18, 150, 87, 0.10)',
  color: 'var(--gd-text)',
  fontWeight: 600,
};

const INACTIVE_PILL_STYLE = {
  ...SHARED_PILL_STYLE,
  background: 'transparent',
  color: 'var(--muted)',
  fontWeight: 500,
};

type TabKey = 'all' | 'active' | 'invited' | 'inactive';

interface TabDef {
  key: TabKey;
  labelKey: DictKey;
}

const TABS: readonly TabDef[] = [
  { key: 'all', labelKey: 'admin.partners.filter.all' },
  { key: 'active', labelKey: 'admin.partners.filter.active' },
  { key: 'invited', labelKey: 'admin.partners.filter.invited' },
  { key: 'inactive', labelKey: 'admin.partners.filter.inactive' },
];

/** Build href per tab — `all` drops the status param; other tabs append ?status=KEY. q always preserved. */
function buildHref(key: TabKey, adminSegment: string, currentQ?: string): string {
  const base = `/${adminSegment}/partners`;
  const params = new URLSearchParams();
  if (key !== 'all') params.set('status', key);
  if (currentQ && currentQ.length > 0) params.set('q', currentQ);
  const qs = params.toString();
  return qs.length > 0 ? `${base}?${qs}` : base;
}

export function PartnersFilterPillTabs({
  currentStatus,
  currentQ,
  adminSegment,
  lang,
}: PartnersFilterPillTabsProps) {
  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      }}
    >
      {TABS.map((tab) => {
        const isActive =
          tab.key === 'all' ? !currentStatus : currentStatus === tab.key;
        return (
          <Link
            key={tab.key}
            href={buildHref(tab.key, adminSegment, currentQ)}
            data-testid={`partner-filter-pill-${tab.key}`}
            role="tab"
            aria-selected={isActive}
            style={isActive ? ACTIVE_PILL_STYLE : INACTIVE_PILL_STYLE}
          >
            {t(tab.labelKey, lang)}
          </Link>
        );
      })}
    </div>
  );
}

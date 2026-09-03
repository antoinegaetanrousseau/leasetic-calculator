/**
 * Phase 34 Plan 12 Task 1 — the client page's four-tab rail (FICHE-05, D-17).
 *
 * A server component. The pills are `<Link>` navigations and there is no
 * client state anywhere in this file, which is the whole point of D-17: the
 * active tab lives in a search param, so a refresh keeps position, a tab is
 * shareable as a URL, and the page can fetch each tab's data on the server
 * instead of shipping all four tabs' data to the browser and hiding three.
 *
 * The architecture is copied from `PartnersFilterPillTabs` (Phase 18), the
 * repo's only other search-param tab surface — including its rule that the
 * DEFAULT key drops the param entirely, so `/clients/x` and
 * `/clients/x?tab=informations` are the same URL rather than two.
 *
 * The STYLING is deliberately not copied from it: that component predates
 * UI-CONVENTIONS and paints its active pill with an inline literal colour.
 * The pills below follow UIC-03 (no accent fill for a navigation state —
 * `bg-muted` carries "active") and UIC-04 (`rounded-4xl`, the control tier,
 * rather than a hard-coded 9999px).
 *
 * The visual reference is the horizontal `w-max` rail from the vendored ReUI
 * users block, not its vertical variant: four short labels above a 720px
 * column read better as a row than as a 176px sidebar that would halve the
 * reading width of every panel below it. Nothing is imported from the
 * vendored tree — it is ESLint-excluded and re-imported wholesale on any
 * registry refresh, so house code copies the shape instead.
 */
import Link from 'next/link';

import { t, type DictKey, type Lang } from '@/lib/i18n/dictionaries';
import { cn } from '@/lib/utils';

/** The four tabs, in render order. */
export const CLIENT_TABS = ['informations', 'contacts', 'proposals', 'activity'] as const;

export type ClientTab = (typeof CLIENT_TABS)[number];

/** The tab a bare `/clients/[id]` lands on — and the one whose param is dropped. */
export const DEFAULT_CLIENT_TAB: ClientTab = 'informations';

/** The enum allowlist. Mirrors the admin partners page's `VALID_STATUSES`. */
export const VALID_TABS: ReadonlySet<ClientTab> = new Set(CLIENT_TABS);

/**
 * Validate a request-supplied `?tab=` value (T-34-12-03).
 *
 * Anything unrecognised — a typo, a stale bookmark, a probe — resolves to the
 * default. It never throws and never 404s: an unknown tab is not an error
 * condition, and making it one would hand a caller a second, distinguishable
 * response on a page whose whole 404 contract is that responses are
 * indistinguishable. The returned value only ever selects a branch; it is
 * never concatenated into a query, a path or a URL.
 */
export function validateTab(raw: string | undefined): ClientTab {
  if (raw !== undefined && (VALID_TABS as ReadonlySet<string>).has(raw)) {
    return raw as ClientTab;
  }
  return DEFAULT_CLIENT_TAB;
}

const TAB_DICT_KEY: Record<ClientTab, DictKey> = {
  informations: 'clients.detail.tab.informations',
  contacts: 'clients.detail.tab.contacts',
  proposals: 'clients.detail.tab.proposals',
  activity: 'clients.detail.tab.activity',
};

/** The default tab drops the param; the other three append `?tab={key}`. */
export function buildTabHref(relationshipId: string, tab: ClientTab): string {
  const base = `/clients/${relationshipId}`;
  if (tab === DEFAULT_CLIENT_TAB) {
    return base;
  }
  const params = new URLSearchParams();
  params.set('tab', tab);
  return `${base}?${params.toString()}`;
}

export interface ClientTabsProps {
  relationshipId: string;
  currentTab: ClientTab;
  lang: Lang;
}

export function ClientTabs({ relationshipId, currentTab, lang }: ClientTabsProps) {
  return (
    <nav className="-mx-1 mb-4 overflow-x-auto px-1 pb-1">
      <div className="flex w-max min-w-max items-center gap-1">
        {CLIENT_TABS.map((tab) => {
          const active = tab === currentTab;

          return (
            <Link
              key={tab}
              href={buildTabHref(relationshipId, tab)}
              data-testid={`client-tab-${tab}`}
              // The active state is read off the prop the page derived from
              // the URL — never from a hook, so the server and the browser
              // cannot disagree about which tab is open.
              aria-current={active ? 'page' : undefined}
              className={cn(
                'inline-flex items-center rounded-4xl px-3 py-1.5 text-[13px] no-underline transition-colors',
                active
                  ? 'bg-muted font-semibold text-foreground'
                  : 'bg-transparent font-medium text-muted-foreground hover:bg-muted/60',
              )}
            >
              {t(TAB_DICT_KEY[tab], lang)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

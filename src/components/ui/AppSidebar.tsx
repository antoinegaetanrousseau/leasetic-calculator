'use client';

/**
 * AppSidebar — the Leasetic application sidebar, built on the shadcn/ReUI
 * Sidebar primitives (Phase 3 of the ReUI/Maia migration).
 *
 * Replaces the hand-built RetractableSidebar. Everything that was a product
 * decision is preserved; everything that was hand-rolled chrome is now the
 * primitive's job:
 *
 *   - Collapse is now the primitive's own `collapsible="icon"` mode, persisted
 *     by SidebarProvider to the `sidebar_state` cookie. The previous
 *     implementation kept it in localStorage and mutated
 *     `--shell-sidebar-current-w` on documentElement from an effect, which
 *     forced a documented one-frame layout shift for collapsed users on every
 *     load (see the old UI-SPEC §6.3 hydration note). Shell reads the cookie
 *     server-side and seeds `defaultOpen`, so that shift is gone.
 *
 *   - Nav sets, hrefs, i18n labels, the C-03 admin gate, the D-02
 *     auto-reconcile and the WR-02 "no resolved admin home" fallback are
 *     carried over unchanged. Those encode real product rules, not styling.
 */

import { HomeIcon, PlusIcon, ProposalIcon, HelpIcon, UsersIcon, SlidersIcon, BuildingIcon, AlertTriangleIcon, BarChartIcon } from '@/components/ui/icons';
import { useSyncExternalStore, type ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { t, type DictKey, type Lang } from '@/lib/i18n/dictionaries';
import { getRouteMeta, type ActiveNav } from '@/lib/route-meta';
import { BrandLogo } from './BrandLogo';
import { NavUser } from './NavUser';
import { subscribeView, getViewSnapshot, getServerViewSnapshot, type ViewMode } from '@/lib/view-store';

// Re-exported for back-compat with existing imports. Canonical home is
// @/lib/route-meta.
export type { ActiveNav };

export interface AppSidebarProps {
  /**
   * Optional override for highlighting. When omitted, the active nav is
   * derived from the current pathname via getRouteMeta.
   */
  activeNav?: ActiveNav;
  /** When true, render the 6 admin nav items; when false, the 4 partner ones. */
  isAdmin: boolean;
  lang: Lang;
  theme: 'light' | 'dark' | 'system';
  /** Shown in the sidebar footer identity card. */
  displayName: string;
  email: string;
  /**
   * Admin-only: hrefs computed server-side from `params.adminSegment` and
   * forwarded by Shell (UI-SPEC §11.6).
   */
  adminHrefs?: {
    home: string;
    coefficients: string;
    partners: string;
    companies: string;
    reconciliation: string;
    history: string;
  };
  /**
   * Admin-only: passed to getRouteMeta so admin paths resolve to admin
   * active-nav keys.
   */
  adminSegment?: string;
  /**
   * Admin-only redirect target for the agent→admin switch on non-admin routes.
   */
  adminHomeHref?: string;
}

type NavItem = { key: ActiveNav; icon: ComponentType<{ size?: number; className?: string }>; labelKey: DictKey; href: string };

/**
 * Phase 18 D-27, widened by Phase 30 Plan 02 — Partner sidebar: 5 items in order
 * [Accueil, Nouvelle proposition, Propositions, Clients, Aide].
 *
 * Every non-admin role reaches this same array, so ROLE-02 is satisfied by
 * construction rather than by a role-specific branch: a `sales` user gets the
 * identical nav a `partner` does, Clients included.
 *
 * `isAdmin` is NOT a role branch here — it exists because this array is also what
 * an ADMIN sees while in Agent view (Phase 24 Plan 02's view toggle). Plan 30-02
 * added Clients on the assumption that only non-admins ever render this array,
 * which the dual-view toggle had already made untrue. /clients is gated by
 * requireRelationshipHolder(), which notFound()s on role === 'admin' regardless of
 * view, so leaving Clients in would hand every admin a link that always 404s.
 *
 * The gate is deliberately not relaxed instead: an admin holds no client
 * relationships, so /clients would be empty for them by construction. Their
 * equivalent surface is Sociétés (admin-companies) in Admin view.
 *
 * Phase 33 Plan 05: `pipeline` shares `clients`' conditional, for the same
 * reason — `/pipeline` is also `requireRelationshipHolder()`-gated, so it
 * would 404 for an admin in Agent view exactly as `/clients` does.
 */
function partnerNavItems(isAdmin: boolean): NavItem[] {
  return [
    { key: 'home', icon: HomeIcon, labelKey: 'sidebar.nav.home', href: '/' },
    { key: 'proposals-new', icon: PlusIcon, labelKey: 'sidebar.nav.proposalsNew', href: '/proposals/new/parametres' },
    { key: 'proposals', icon: ProposalIcon, labelKey: 'sidebar.nav.proposals', href: '/proposals' },
    ...(isAdmin
      ? []
      : [
          { key: 'clients' as const, icon: BuildingIcon, labelKey: 'sidebar.nav.clients' as DictKey, href: '/clients' },
          { key: 'pipeline' as const, icon: BarChartIcon, labelKey: 'sidebar.nav.pipeline' as DictKey, href: '/pipeline' },
        ]),
    { key: 'help', icon: HelpIcon, labelKey: 'sidebar.nav.help', href: '/aide' },
  ];
}

/**
 * Phase 18 D-27, widened by Phase 30 Plan 02 — Admin sidebar: exactly 7 items
 * in order [Accueil, Nouvelle proposition, Propositions, Partenaires,
 * Sociétés, Coefficients, Aide]. Historique is deliberately NOT in the sidebar.
 */
function adminNavItems(hrefs: NonNullable<AppSidebarProps['adminHrefs']>): NavItem[] {
  return [
    { key: 'admin-home', icon: HomeIcon, labelKey: 'sidebar.nav.home', href: hrefs.home },
    { key: 'proposals-new', icon: PlusIcon, labelKey: 'sidebar.nav.proposalsNew', href: '/proposals/new/parametres' },
    { key: 'proposals', icon: ProposalIcon, labelKey: 'sidebar.nav.proposals', href: '/proposals' },
    { key: 'admin-partners', icon: UsersIcon, labelKey: 'sidebar.nav.adminPartners', href: hrefs.partners },
    { key: 'admin-companies', icon: BuildingIcon, labelKey: 'sidebar.nav.adminCompanies', href: hrefs.companies },
    { key: 'admin-reconciliation', icon: AlertTriangleIcon, labelKey: 'sidebar.nav.adminReconciliation', href: hrefs.reconciliation },
    { key: 'admin-coefficients', icon: SlidersIcon, labelKey: 'sidebar.nav.adminCoefficients', href: hrefs.coefficients },
    { key: 'help', icon: HelpIcon, labelKey: 'sidebar.nav.help', href: '/aide' },
  ];
}

export function AppSidebar({
  activeNav,
  isAdmin,
  lang,
  theme,
  displayName,
  email,
  adminHrefs,
  adminSegment,
  adminHomeHref,
}: AppSidebarProps) {
  const pathname = usePathname();
  const resolvedActiveNav: ActiveNav =
    activeNav ?? getRouteMeta(pathname ?? '/', adminSegment).activeNav;

  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  // View store (Plan 24-02). D-02: presence of adminSegment means we are
  // physically on an (admin) route, which forces Admin view regardless of the
  // stored flag.
  const storedView = useSyncExternalStore(subscribeView, getViewSnapshot, getServerViewSnapshot);
  const effectiveView: ViewMode = adminSegment ? 'admin' : storedView;

  // WR-02: without a resolved admin home there is nowhere for "switch to Admin"
  // to route, so the toggle is hidden rather than rendered as a no-op.
  const adminHomeResolved: string | null = adminHrefs?.home ?? adminHomeHref ?? null;

  // VIEW-04 / C-04: the nav set keys off BOTH the server-derived role and the
  // effective view, so a forged sessionStorage flag cannot hand a non-admin the
  // admin nav. WR-01: this is a UI affordance, not the authorization boundary —
  // that lives in the (admin) route group's server-side role guard.
  const navItems: NavItem[] =
    isAdmin && effectiveView === 'admin' && adminHrefs
      ? adminNavItems(adminHrefs)
      : partnerNavItems(isAdmin);

  return (
    <Sidebar collapsible="icon" aria-label={t('sidebar.brand', lang)}>
      <SidebarHeader className="p-3">
        {/* Phase 31.1 (D-07/D-08): the collapse control moved to the header
            (Topbar.tsx's SidebarTrigger, landed by Plan 31.1-03) — this is
            the only reason the chevron that used to live here is gone. With
            no second control to stack above, the collapsed branch is just
            the mark; `justify-center` centres that single fixed-width child
            within the header's own content box (D-09 Correction 2) rather
            than leaving it pinned to the box's left edge. */}
        <div className={cn('flex items-center gap-2', collapsed && 'justify-center')}>
          {collapsed ? (
            // 32x32 badge at 9px radius holding an 18x18 glyph, centred on
            // the same axis as the collapsed nav icons (D-09). The fill below
            // is the neutral sidebar-accent token, deliberately not the
            // sidebar's primary-accent token: logo-mark.svg's ellipses are
            // all #01CC72, and that primary token resolves to the same
            // accent green, so filling the badge with it would render the
            // mark invisible (a green mark on a green square).
            <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-sidebar-accent">
              {/* eslint-disable-next-line @next/next/no-img-element -- mark-only static asset, no theme switch needed */}
              <img src="/logo-mark.svg" alt="" width={18} height={18} />
            </span>
          ) : (
            <>
              <BrandLogo width={120} alt={t('sidebar.brand', lang)} />
              <div className="flex-1" />
            </>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-[0.55px]">
            {t('sidebar.eyebrow.navigation', lang)}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {/* id retained: it is the stable hook the sidebar suite queries. */}
            <SidebarMenu id="leasetic-sidebar-nav">
              {navItems.map((item) => {
                const isActive = item.key === resolvedActiveNav;
                const label = t(item.labelKey, lang);
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={label}
                      // D-09: centres the fixed 32px collapsed button within
                      // its SidebarGroup's wider content box, landing on the
                      // same 34px axis as the header badge above (expanded
                      // rendering is untouched — scoped to collapsible=icon).
                      className="group-data-[collapsible=icon]:mx-auto"
                      render={<Link href={item.href} />}
                    >
                      <item.icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Block structure: the footer is the user identity card, and the view /
          language / theme controls live inside its dropdown rather than loose
          in the sidebar. C-03 and WR-02 still gate the view switch, they are
          just enforced one level down now. */}
      <SidebarFooter className="p-3">
        <NavUser
          displayName={displayName}
          email={email}
          lang={lang}
          theme={theme}
          isAdmin={isAdmin}
          adminHomeHref={adminHomeResolved}
        />
      </SidebarFooter>

      {/* The primitive's own rail: click or drag the sidebar edge to toggle. */}
      {/* The rail is a redundant mouse-only convenience (drag/click the edge);
          it is tabIndex={-1} and duplicates the labelled header button above.
          Hiding it from the accessibility tree avoids exposing two buttons with
          the same accessible name, which is what a screen reader would
          otherwise announce. */}
      <SidebarRail aria-hidden="true" />
    </Sidebar>
  );
}

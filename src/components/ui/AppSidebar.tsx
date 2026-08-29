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

import { useSyncExternalStore, type ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Plus,
  ScrollText,
  HelpCircle,
  Sliders,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
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
import { LocaleToggle } from '../LocaleToggle';
import { ThemeToggle } from '../ThemeToggle';
import { BrandLogo } from './BrandLogo';
import { ViewToggle } from '../ViewToggle';
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
  /**
   * Admin-only: hrefs computed server-side from `params.adminSegment` and
   * forwarded by Shell (UI-SPEC §11.6).
   */
  adminHrefs?: {
    home: string;
    coefficients: string;
    partners: string;
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

type LucideIcon = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
type NavItem = { key: ActiveNav; icon: LucideIcon; labelKey: DictKey; href: string };

/**
 * Phase 18 D-27 — Partner sidebar: exactly 4 items in order
 *   [Accueil, Nouvelle proposition, Propositions, Aide]
 */
function partnerNavItems(): NavItem[] {
  return [
    { key: 'home', icon: Home, labelKey: 'sidebar.nav.home', href: '/' },
    { key: 'proposals-new', icon: Plus, labelKey: 'sidebar.nav.proposalsNew', href: '/proposals/new/parametres' },
    { key: 'proposals', icon: ScrollText, labelKey: 'sidebar.nav.proposals', href: '/proposals' },
    { key: 'help', icon: HelpCircle, labelKey: 'sidebar.nav.help', href: '/aide' },
  ];
}

/**
 * Phase 18 D-27 — Admin sidebar: exactly 6 items in order
 *   [Accueil, Nouvelle proposition, Propositions, Partenaires, Coefficients, Aide]
 * Historique is deliberately NOT in the sidebar.
 */
function adminNavItems(hrefs: NonNullable<AppSidebarProps['adminHrefs']>): NavItem[] {
  return [
    { key: 'admin-home', icon: Home, labelKey: 'sidebar.nav.home', href: hrefs.home },
    { key: 'proposals-new', icon: Plus, labelKey: 'sidebar.nav.proposalsNew', href: '/proposals/new/parametres' },
    { key: 'proposals', icon: ScrollText, labelKey: 'sidebar.nav.proposals', href: '/proposals' },
    { key: 'admin-partners', icon: Users, labelKey: 'sidebar.nav.adminPartners', href: hrefs.partners },
    { key: 'admin-coefficients', icon: Sliders, labelKey: 'sidebar.nav.adminCoefficients', href: hrefs.coefficients },
    { key: 'help', icon: HelpCircle, labelKey: 'sidebar.nav.help', href: '/aide' },
  ];
}

export function AppSidebar({
  activeNav,
  isAdmin,
  lang,
  theme,
  adminHrefs,
  adminSegment,
  adminHomeHref,
}: AppSidebarProps) {
  const pathname = usePathname();
  const resolvedActiveNav: ActiveNav =
    activeNav ?? getRouteMeta(pathname ?? '/', adminSegment).activeNav;

  const { state, toggleSidebar } = useSidebar();
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
      : partnerNavItems();

  return (
    <Sidebar collapsible="icon" aria-label={t('sidebar.brand', lang)}>
      <SidebarHeader className="p-3">
        <div className={cn('flex items-center gap-2', collapsed && 'flex-col')}>
          {collapsed ? (
            // eslint-disable-next-line @next/next/no-img-element -- mark-only static asset, no theme switch needed
            <img src="/logo-mark.svg" alt="" width={28} height={28} />
          ) : (
            <>
              <BrandLogo width={190} height={32} alt={t('sidebar.brand', lang)} />
              <div className="flex-1" />
            </>
          )}
          {/* An explicit, focusable, translated collapse control.
              SidebarRail alone is not sufficient: it carries tabIndex={-1} and
              a hardcoded English "Toggle Sidebar" label, so adopting only the
              rail would cost keyboard users the ability to collapse the
              sidebar and would drop the FR/EN label in a bilingual product. */}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-expanded={!collapsed}
            aria-controls="leasetic-sidebar-nav"
            aria-label={collapsed ? t('sidebar.expand', lang) : t('sidebar.collapse', lang)}
            className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:text-ink"
          >
            {collapsed ? (
              <ChevronRight size={16} strokeWidth={1.6} />
            ) : (
              <ChevronLeft size={16} strokeWidth={1.6} />
            )}
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('sidebar.eyebrow.navigation', lang)}</SidebarGroupLabel>
          <SidebarGroupContent>
            {/* id retained: it is the stable hook the sidebar suite queries. */}
            <SidebarMenu id="leasetic-sidebar-nav">
              {navItems.map((item) => {
                const isActive = item.key === resolvedActiveNav;
                const label = t(item.labelKey, lang);
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={label}
                      render={<Link href={item.href} />}
                    >
                      <Icon strokeWidth={1.6} />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-2 p-3">
        {/* ViewToggle is admin-only (C-03) and additionally requires a resolved
            admin home (WR-02). */}
        {isAdmin && adminHomeResolved && (
          <ViewToggle
            lang={lang}
            adminHrefs={{ home: adminHomeResolved }}
            collapsed={collapsed}
            fullWidth={!collapsed}
          />
        )}
        {!collapsed && (
          <>
            <LocaleToggle current={lang} fullWidth />
            <ThemeToggle current={theme} fullWidth />
          </>
        )}
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

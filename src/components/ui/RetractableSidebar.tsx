'use client';

/**
 * RetractableSidebar — 260px ↔ 72px collapsible sidebar (COMP-02, UI-SPEC §6.3).
 *
 * Client component: manages `collapsed` state with useState; hydrates from
 * `localStorage['leasetic.sidebar.collapsed']` on mount; mutates
 * `document.documentElement.style['--shell-sidebar-current-w']` on toggle
 * (UI-SPEC §6.7 Option B / §11.5).
 *
 * The only `'use client'` boundary in `src/components/ui/`. The only consumer
 * of `BrandLogo` + the 13 sidebar.* i18n keys (Plan 11-01).
 *
 * Phase 11 ships with the documented one-frame layout shift for collapsed
 * users (UI-SPEC §6.3 hydration rule — acceptable per v1.1 "no-flash for
 * theme only" stance). Phase 13 may upgrade to cookie-driven SSR collapse.
 *
 * adminHrefs: since this is a client component it cannot read
 * `process.env.ADMIN_URL_SEGMENT` directly. The (admin) layout's Shell
 * wrapper forwards resolved hrefs via prop (UI-SPEC §11.6).
 */

import { useSyncExternalStore, startTransition, useCallback, useEffect, type CSSProperties, type ComponentType } from 'react';
import Link from 'next/link';
import {
  Home,
  Plus,
  ScrollText,
  HelpCircle,
  LayoutDashboard,
  Sliders,
  Users,
  History,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { t, type DictKey, type Lang } from '@/lib/i18n/dictionaries';
import { setTheme } from '@/lib/theme/actions';
import { setLang } from '@/lib/i18n/actions';
import { LocaleToggle } from '../LocaleToggle';
import { ThemeToggle } from '../ThemeToggle';
import { BrandLogo } from './BrandLogo';

export type ActiveNav =
  | 'home'
  | 'proposals-new'
  | 'history'
  | 'help'
  | 'admin-home'
  | 'admin-coefficients'
  | 'admin-partners'
  | 'admin-history';

export interface RetractableSidebarProps {
  /** Active route key for highlighting the active nav item. */
  activeNav: ActiveNav;
  /** When true, render the 4 admin nav items; when false, the 4 partner nav items. */
  isAdmin: boolean;
  /** Current language for i18n labels + LocaleToggle current value. */
  lang: Lang;
  /** Current theme preference for ThemeToggle current value. */
  theme: 'light' | 'dark' | 'system';
  /**
   * Admin-only: hrefs computed server-side from `params.adminSegment` and
   * forwarded by Shell (UI-SPEC §11.6). Required when isAdmin=true; ignored
   * when isAdmin=false.
   */
  adminHrefs?: {
    home: string;
    coefficients: string;
    partners: string;
    history: string;
  };
}

const STORAGE_KEY = 'leasetic.sidebar.collapsed';
const TOGGLE_EVENT = 'leasetic-sidebar-toggled';
const W_EXPANDED = '260px';
const W_COLLAPSED = '72px';

/**
 * Read collapsed state from localStorage (client only).
 * Returns false during SSR + initial client render (matches getServerSnapshot below).
 */
function getCollapsedSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(STORAGE_KEY) === 'collapsed';
}

/**
 * Server-rendered snapshot: always false (no localStorage on server).
 * Matches UI-SPEC §6.3 hydration rule — initial render is expanded; one-frame
 * shift for collapsed users is documented + accepted.
 */
function getServerCollapsedSnapshot(): boolean {
  return false;
}

/**
 * Subscribe to localStorage changes:
 * - `storage` event fires on cross-tab writes
 * - custom `leasetic-sidebar-toggled` event fires on same-tab writes via toggleCollapsed()
 */
function subscribeCollapsed(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  window.addEventListener(TOGGLE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(TOGGLE_EVENT, callback);
  };
}

type LucideIcon = ComponentType<{ size: number; strokeWidth: number; color?: string }>;
type NavItem = { key: ActiveNav; icon: LucideIcon; labelKey: DictKey; href: string };

function partnerNavItems(): NavItem[] {
  return [
    { key: 'home', icon: Home, labelKey: 'sidebar.nav.home', href: '/' },
    { key: 'proposals-new', icon: Plus, labelKey: 'sidebar.nav.proposalsNew', href: '/proposals/new' },
    { key: 'history', icon: ScrollText, labelKey: 'sidebar.nav.history', href: '/' },
    { key: 'help', icon: HelpCircle, labelKey: 'sidebar.nav.help', href: '/help' },
  ];
}

function adminNavItems(hrefs: NonNullable<RetractableSidebarProps['adminHrefs']>): NavItem[] {
  return [
    { key: 'admin-home', icon: LayoutDashboard, labelKey: 'sidebar.nav.adminHome', href: hrefs.home },
    { key: 'admin-coefficients', icon: Sliders, labelKey: 'sidebar.nav.adminCoefficients', href: hrefs.coefficients },
    { key: 'admin-partners', icon: Users, labelKey: 'sidebar.nav.adminPartners', href: hrefs.partners },
    { key: 'admin-history', icon: History, labelKey: 'sidebar.nav.adminHistory', href: hrefs.history },
  ];
}

export function RetractableSidebar({
  activeNav,
  isAdmin,
  lang,
  theme,
  adminHrefs,
}: RetractableSidebarProps) {
  // Read collapsed state from localStorage via useSyncExternalStore — the canonical
  // React 19 pattern for binding component render to an external store (avoids
  // react-hooks/set-state-in-effect; cleanly handles SSR via getServerSnapshot).
  // UI-SPEC §6.3: server renders expanded (false); client may flip to collapsed
  // post-hydration if localStorage holds 'collapsed' — documented one-frame shift.
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    getCollapsedSnapshot,
    getServerCollapsedSnapshot,
  );

  // Side-effect: keep <html> --shell-sidebar-current-w in sync with `collapsed`.
  // Lives in useEffect because the documentElement write is a real DOM mutation;
  // the eslint rule (react-hooks/set-state-in-effect) only flags setState calls
  // inside effects, not setProperty. Idempotent w.r.t. eventual value.
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--shell-sidebar-current-w',
      collapsed ? W_COLLAPSED : W_EXPANDED,
    );
  }, [collapsed]);

  const toggle = useCallback(() => {
    const current = window.localStorage.getItem(STORAGE_KEY) === 'collapsed';
    const next = !current;
    window.localStorage.setItem(STORAGE_KEY, next ? 'collapsed' : 'expanded');
    // Notify useSyncExternalStore subscribers (same tab — `storage` event only
    // fires cross-tab; we need a custom event for own-tab reactivity).
    // The useEffect bound to [collapsed] then writes the documentElement CSS var.
    window.dispatchEvent(new Event(TOGGLE_EVENT));
  }, []);

  const navItems: NavItem[] = isAdmin
    ? adminNavItems(
        adminHrefs ?? { home: '/', coefficients: '/', partners: '/', history: '/' },
      )
    : partnerNavItems();

  const cycleLang = () =>
    startTransition(() => {
      void setLang(lang === 'fr' ? 'en' : 'fr');
    });

  const cycleTheme = () => {
    const nextTheme: 'light' | 'dark' | 'system' =
      theme === 'light' ? 'system' : theme === 'system' ? 'dark' : 'light';
    startTransition(() => {
      void setTheme(nextTheme);
    });
  };

  const asideStyle: CSSProperties = {
    gridRow: '1 / 4',
    gridColumn: '1',
    width: collapsed ? W_COLLAPSED : W_EXPANDED,
    background: 'var(--surface)',
    borderRight: '1px solid var(--border)',
    padding: collapsed ? '24px 18px' : '24px 16px',
    position: 'sticky',
    top: 0,
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    transition: 'width 150ms ease-in-out, padding 150ms ease-in-out',
  };

  return (
    <aside style={asideStyle} aria-label={t('sidebar.brand', lang)}>
      {/* Brand row */}
      <div
        style={{
          display: 'flex',
          flexDirection: collapsed ? 'column' : 'row',
          alignItems: 'center',
          gap: 8,
          marginBottom: 4,
        }}
      >
        {collapsed ? (
          // eslint-disable-next-line @next/next/no-img-element -- intentional raw <img>: mark-only static asset, no theme switch needed
          <img src="/logo-mark.svg" alt="" width={36} height={36} />
        ) : (
          <>
            <BrandLogo width={190} height={32} alt={t('sidebar.brand', lang)} />
            <div style={{ flex: 1 }} />
          </>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-controls="leasetic-sidebar-nav"
          aria-label={collapsed ? t('sidebar.expand', lang) : t('sidebar.collapse', lang)}
          style={{
            width: 24,
            height: 24,
            background: 'transparent',
            border: 'none',
            color: 'var(--muted)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          {collapsed ? (
            <ChevronRight size={16} strokeWidth={1.6} />
          ) : (
            <ChevronLeft size={16} strokeWidth={1.6} />
          )}
        </button>
      </div>

      {/* Eyebrow (expanded only) */}
      {!collapsed && (
        <div
          style={{
            fontSize: '11.8px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            marginTop: 24,
            marginBottom: 8,
          }}
        >
          {t('sidebar.eyebrow.navigation', lang)}
        </div>
      )}

      {/* Nav items */}
      <ul id="leasetic-sidebar-nav" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {navItems.map((item) => {
          const isActive = item.key === activeNav;
          const itemStyle: CSSProperties = {
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: collapsed ? 0 : 8,
            padding: collapsed ? 0 : '10px 12px',
            width: collapsed ? 36 : '100%',
            height: collapsed ? 36 : undefined,
            borderRadius: 10,
            marginBottom: 4,
            textDecoration: 'none',
            background: isActive ? 'rgba(18, 150, 87, 0.10)' : 'transparent',
            color: isActive ? 'var(--ink)' : 'var(--muted)',
            fontWeight: isActive ? 600 : 500,
            fontSize: '14.5px',
          };
          const Icon = item.icon;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                style={itemStyle}
                aria-label={collapsed ? t(item.labelKey, lang) : undefined}
              >
                <Icon size={18} strokeWidth={1.6} color={isActive ? 'var(--gd)' : 'var(--muted)'} />
                {!collapsed && <span>{t(item.labelKey, lang)}</span>}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Flex spacer pushes bottom controls down */}
      <div style={{ flex: 1 }} />

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0 12px 0' }} />

      {/* Bottom: lang + theme toggles */}
      {collapsed ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            onClick={cycleLang}
            aria-label={t('sidebar.lang.cycle', lang)}
            style={{
              width: 36,
              height: 28,
              borderRadius: 9999,
              background: 'var(--paper)',
              border: '1px solid var(--border)',
              color: 'var(--ink)',
              fontSize: '11.5px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            {lang}
          </button>
          <button
            type="button"
            onClick={cycleTheme}
            aria-label={t('sidebar.theme.cycle', lang)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 9999,
              background: 'var(--paper)',
              border: '1px solid var(--border)',
              color: 'var(--ink)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            {theme === 'light' && <Sun size={17} strokeWidth={1.6} />}
            {theme === 'system' && <Monitor size={17} strokeWidth={1.6} />}
            {theme === 'dark' && <Moon size={17} strokeWidth={1.6} />}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <LocaleToggle current={lang} fullWidth />
          <ThemeToggle current={theme} fullWidth />
        </div>
      )}
    </aside>
  );
}

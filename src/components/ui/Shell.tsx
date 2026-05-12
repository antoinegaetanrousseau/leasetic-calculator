/**
 * Shell — composes RetractableSidebar + Topbar + main + footer in a 2-col / 3-row
 * CSS grid (UI-SPEC §6.7, COMP-02 integration).
 *
 * Server component: no `'use client'`. The only client island it renders is
 * `<RetractableSidebar>` (Plan 11-04), which owns its own collapse state and
 * mutates `--shell-sidebar-current-w` on the documentElement at runtime.
 *
 * Three integration moves from the v1.1 inline layout body:
 *   1. `<aside>` block → `<RetractableSidebar adminHrefs ... />`
 *   2. grid-template-columns: var(--shell-sidebar-w) → var(--shell-sidebar-current-w)
 *   3. `<Topbar>` invocation no longer passes `theme` (dropped from TopbarProps in Plan 11-05 Task 2)
 *
 * adminHrefs construction: required because RetractableSidebar is a client component
 * and cannot read process.env.ADMIN_URL_SEGMENT directly. The (admin) layout
 * resolves `params.adminSegment` server-side and forwards it via prop; Shell
 * builds the 4 admin nav hrefs and passes them through (UI-SPEC §11.6).
 */
import { Topbar } from '@/components/Topbar';
import { RetractableSidebar, type ActiveNav } from '@/components/ui/RetractableSidebar';
import { t, type Lang } from '@/lib/i18n';

export interface ShellProps {
  isAdmin: boolean;
  lang: Lang;
  theme: 'light' | 'dark' | 'system';
  displayName: string;
  email: string;
  pageTitle?: string;
  activeNav: ActiveNav;
  /** Required when isAdmin=true; used to build admin nav hrefs (UI-SPEC §11.6). */
  adminSegment?: string;
  children: React.ReactNode;
}

export function Shell({
  isAdmin,
  lang,
  theme,
  displayName,
  email,
  pageTitle,
  activeNav,
  adminSegment,
  children,
}: ShellProps) {
  // Build admin hrefs from adminSegment (UI-SPEC §11.6). Shell reads adminSegment
  // server-side; RetractableSidebar (client component) cannot read process.env
  // directly, so Shell forwards a resolved map.
  const adminHrefs =
    isAdmin && adminSegment
      ? {
          home: `/${adminSegment}`,
          coefficients: `/${adminSegment}/coefficients`,
          // Phase 11 anticipated a Phase 14 rename to /partners but the route still
          // lives at /accounts (Phase 9). Point at the existing route until Phase 14
          // ships the dedicated /partners + /partners/new surfaces (ROUTE-02).
          partners: `/${adminSegment}/accounts`,
          // History route does not exist yet — Phase 14 will surface coefficient
          // history INSIDE /coefficients (sidebar). Point here until then.
          history: `/${adminSegment}/coefficients`,
        }
      : undefined;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'var(--shell-sidebar-current-w) 1fr',
        gridTemplateRows: 'var(--topbar-h) 1fr var(--footer-h)',
        minHeight: '100vh',
      }}
    >
      {/* Sidebar (rows 1-3, col 1) — client island; owns collapse state + width var */}
      <RetractableSidebar
        activeNav={activeNav}
        isAdmin={isAdmin}
        lang={lang}
        theme={theme}
        adminHrefs={adminHrefs}
      />

      {/* Topbar (row 1, col 2) — refactored in Plan 11-05 Task 2; no `theme` prop */}
      <Topbar
        displayName={displayName}
        email={email}
        lang={lang}
        isAdmin={isAdmin}
        pageTitle={pageTitle}
      />

      {/* Main content (row 2, col 2) */}
      <main
        style={{
          gridRow: '2',
          gridColumn: '2',
          background: 'var(--paper)',
          padding: '1.5rem 1.5rem 2rem',
          maxWidth: '1100px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        {children}
      </main>

      {/* Footer (row 3, col 2) */}
      <footer
        style={{
          gridRow: '3',
          gridColumn: '2',
          background: 'var(--paper)',
          borderTop: '1px solid var(--border)',
          height: 'var(--footer-h)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10.5px',
          color: 'var(--muted)',
        }}
      >
        {t('shell.footer.copyright', lang)}
      </footer>
    </div>
  );
}

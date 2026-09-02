import type { DictKey } from '@/lib/i18n';

/**
 * Sidebar active-nav key — must match one of the items rendered by
 * RetractableSidebar (Phase 18 D-27 contract). The `history` / `admin-history`
 * variants are retained for routes that still exist even though the sidebar no
 * longer surfaces them as top-level entries.
 */
export type ActiveNav =
  | 'home'
  | 'proposals-new'
  | 'proposals'
  | 'clients'
  | 'history'
  | 'help'
  | 'admin-home'
  | 'admin-coefficients'
  | 'admin-partners'
  | 'admin-companies'
  | 'admin-reconciliation'
  | 'admin-history';

export interface RouteMeta {
  /** i18n key for the Topbar title on this route. */
  titleKey: DictKey;
  /** Sidebar nav item that should be highlighted on this route. */
  activeNav: ActiveNav;
}

/**
 * Derive the Topbar title key + sidebar active-nav key from the current pathname.
 *
 * Admin tree is detected by prefix match on `adminSegment` (resolved server-side
 * in the (admin) layout from ADMIN_URL_SEGMENT). Anything else is partner-side;
 * `/` is the canonical partner home. Unmatched paths fall back to the home key —
 * safe because only authed/admin routes reach Shell.
 */
export function getRouteMeta(pathname: string, adminSegment?: string): RouteMeta {
  if (adminSegment) {
    const adminPrefix = `/${adminSegment}`;
    if (pathname === adminPrefix || pathname.startsWith(`${adminPrefix}/`)) {
      const tail = pathname.slice(adminPrefix.length);
      if (tail.startsWith('/coefficients')) {
        return { titleKey: 'sidebar.nav.adminCoefficients', activeNav: 'admin-coefficients' };
      }
      if (tail.startsWith('/partners')) {
        return { titleKey: 'sidebar.nav.adminPartners', activeNav: 'admin-partners' };
      }
      // Load-bearing ordering (D-16 / 31-UI-SPEC.md §4): the '/companies/review'
      // tail match MUST be checked BEFORE the plain '/companies' match below, or
      // the nested review route resolves to the admin-companies nav state.
      if (tail.startsWith('/companies/review')) {
        return { titleKey: 'sidebar.nav.adminReconciliation', activeNav: 'admin-reconciliation' };
      }
      if (tail.startsWith('/companies')) {
        return { titleKey: 'sidebar.nav.adminCompanies', activeNav: 'admin-companies' };
      }
      if (tail.startsWith('/history')) {
        return { titleKey: 'sidebar.nav.adminHistory', activeNav: 'admin-history' };
      }
      // Admin home — D-27 reuses sidebar.nav.home ("Accueil") for the topbar label.
      return { titleKey: 'sidebar.nav.home', activeNav: 'admin-home' };
    }
  }

  if (pathname.startsWith('/proposals/new')) {
    return { titleKey: 'header.proposals.new', activeNav: 'proposals-new' };
  }
  if (pathname.startsWith('/proposals')) {
    return { titleKey: 'sidebar.nav.proposals', activeNav: 'proposals' };
  }
  if (pathname.startsWith('/clients')) {
    return { titleKey: 'sidebar.nav.clients', activeNav: 'clients' };
  }
  if (pathname.startsWith('/aide')) {
    return { titleKey: 'sidebar.nav.help', activeNav: 'help' };
  }
  return { titleKey: 'header.home', activeNav: 'home' };
}

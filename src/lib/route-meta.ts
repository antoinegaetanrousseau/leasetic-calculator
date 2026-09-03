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
  | 'pipeline'
  | 'history'
  | 'help'
  | 'admin-home'
  | 'admin-coefficients'
  | 'admin-partners'
  | 'admin-companies'
  | 'admin-reconciliation'
  | 'admin-history';

/**
 * One link (or terminal, non-link) segment of the shell header breadcrumb
 * trail (Phase 31.1 Plan 02, D-06). `labelKey` is a dictionary key — the
 * trail is dictionary-keyed by design, never an entity name (see
 * 31.1-02-PLAN.md objective: `getRouteMeta` is a pure pathname function with
 * no data access, and plumbing a live record name into a header that renders
 * on every page would be an unscoped information-disclosure surface).
 *
 * `href` is omitted on the last element of every trail — the shell renders
 * that segment as non-link `BreadcrumbPage` text (ROADMAP criterion 3).
 */
export interface BreadcrumbSegment {
  labelKey: DictKey;
  href?: string;
}

export interface RouteMeta {
  /** i18n key for the Topbar title on this route. */
  titleKey: DictKey;
  /** Sidebar nav item that should be highlighted on this route. */
  activeNav: ActiveNav;
  /**
   * Ordered breadcrumb trail for the shell header (D-06). Always 1–2
   * segments; the last segment never carries an `href`. Derived from the
   * same route-matching chain as `titleKey`/`activeNav` below — there is no
   * second, parallel route table.
   */
  breadcrumb: BreadcrumbSegment[];
}

/**
 * Derive the Topbar title key + sidebar active-nav key + header breadcrumb
 * trail from the current pathname.
 *
 * Admin tree is detected by prefix match on `adminSegment` (resolved server-side
 * in the (admin) layout from ADMIN_URL_SEGMENT). Anything else is partner-side;
 * `/` is the canonical partner home. Unmatched paths fall back to the home key —
 * safe because only authed/admin routes reach Shell.
 *
 * The breadcrumb trail (Phase 31.1 Plan 02, D-06) is derived inline, inside
 * this same `if (tail.startsWith(...))` chain, rather than via a second
 * lookup table or a second exported function — a parallel route table could
 * drift out of sync with the title/nav resolution above it. Every trail is
 * dictionary-keyed (no entity names — see `BreadcrumbSegment` doc comment)
 * and is capped at 2 segments per `31.1-UI-SPEC.md`.
 */
export function getRouteMeta(pathname: string, adminSegment?: string): RouteMeta {
  if (adminSegment) {
    const adminPrefix = `/${adminSegment}`;
    if (pathname === adminPrefix || pathname.startsWith(`${adminPrefix}/`)) {
      const tail = pathname.slice(adminPrefix.length);
      if (tail.startsWith('/coefficients')) {
        return {
          titleKey: 'sidebar.nav.adminCoefficients',
          activeNav: 'admin-coefficients',
          breadcrumb: [{ labelKey: 'sidebar.nav.adminCoefficients' }],
        };
      }
      // '/partners/new' must be checked before the plain '/partners' match
      // below (same load-bearing-ordering discipline as the
      // '/companies/review' case further down) — only the breadcrumb trail
      // differs from the plain '/partners' branch; titleKey/activeNav stay
      // at the existing admin-partners values.
      if (tail.startsWith('/partners/new')) {
        return {
          titleKey: 'sidebar.nav.adminPartners',
          activeNav: 'admin-partners',
          breadcrumb: [
            { labelKey: 'sidebar.nav.adminPartners', href: `${adminPrefix}/partners` },
            { labelKey: 'admin.partners.breadcrumb.new' },
          ],
        };
      }
      if (tail.startsWith('/partners')) {
        return {
          titleKey: 'sidebar.nav.adminPartners',
          activeNav: 'admin-partners',
          breadcrumb: [{ labelKey: 'sidebar.nav.adminPartners' }],
        };
      }
      // Load-bearing ordering (D-16 / 31-UI-SPEC.md §4): the '/companies/review'
      // tail match MUST be checked BEFORE the plain '/companies' match below, or
      // the nested review route resolves to the admin-companies nav state.
      // Phase 31.1 Plan 02 (D-06): the '/companies/{id}' detail match below
      // shares this same ordering constraint and must also be checked before
      // the plain '/companies' match — both more-specific branches sit above
      // their shared parent in this chain.
      if (tail.startsWith('/companies/review')) {
        return {
          titleKey: 'sidebar.nav.adminReconciliation',
          activeNav: 'admin-reconciliation',
          breadcrumb: [
            { labelKey: 'sidebar.nav.adminCompanies', href: `${adminPrefix}/companies` },
            { labelKey: 'sidebar.nav.adminReconciliation' },
          ],
        };
      }
      // '/companies/{nonempty remainder}' (and not 'review', excluded above)
      // is a company detail route. A bare trailing slash ('/companies/')
      // must not create a phantom detail segment — the regex requires at
      // least one character after the slash.
      const companyDetailMatch = /^\/companies\/(.+)$/.exec(tail);
      if (companyDetailMatch) {
        return {
          titleKey: 'sidebar.nav.adminCompanies',
          activeNav: 'admin-companies',
          breadcrumb: [
            { labelKey: 'sidebar.nav.adminCompanies', href: `${adminPrefix}/companies` },
            { labelKey: 'shell.breadcrumb.companyDetail' },
          ],
        };
      }
      if (tail.startsWith('/companies')) {
        return {
          titleKey: 'sidebar.nav.adminCompanies',
          activeNav: 'admin-companies',
          breadcrumb: [{ labelKey: 'sidebar.nav.adminCompanies' }],
        };
      }
      if (tail.startsWith('/history')) {
        return {
          titleKey: 'sidebar.nav.adminHistory',
          activeNav: 'admin-history',
          breadcrumb: [{ labelKey: 'sidebar.nav.adminHistory' }],
        };
      }
      // Admin home — D-27 reuses sidebar.nav.home ("Accueil") for the topbar label.
      return {
        titleKey: 'sidebar.nav.home',
        activeNav: 'admin-home',
        breadcrumb: [{ labelKey: 'sidebar.nav.home' }],
      };
    }
  }

  if (pathname.startsWith('/proposals/new')) {
    return {
      titleKey: 'header.proposals.new',
      activeNav: 'proposals-new',
      breadcrumb: [
        { labelKey: 'sidebar.nav.proposals', href: '/proposals' },
        { labelKey: 'header.proposals.new' },
      ],
    };
  }
  if (pathname.startsWith('/proposals')) {
    // '/proposals/{nonempty remainder}' is a detail route; a bare trailing
    // slash ('/proposals/') must not create a phantom detail segment.
    const tail = pathname.slice('/proposals'.length);
    const hasDetail = tail !== '' && tail !== '/';
    return {
      titleKey: 'sidebar.nav.proposals',
      activeNav: 'proposals',
      breadcrumb: hasDetail
        ? [
            { labelKey: 'sidebar.nav.proposals', href: '/proposals' },
            { labelKey: 'shell.breadcrumb.proposalDetail' },
          ]
        : [{ labelKey: 'sidebar.nav.proposals' }],
    };
  }
  if (pathname.startsWith('/clients')) {
    // Same trailing-slash discipline as '/proposals' above.
    const tail = pathname.slice('/clients'.length);
    const hasDetail = tail !== '' && tail !== '/';
    return {
      titleKey: 'sidebar.nav.clients',
      activeNav: 'clients',
      breadcrumb: hasDetail
        ? [
            { labelKey: 'sidebar.nav.clients', href: '/clients' },
            { labelKey: 'shell.breadcrumb.clientDetail' },
          ]
        : [{ labelKey: 'sidebar.nav.clients' }],
    };
  }
  if (pathname.startsWith('/pipeline')) {
    // No `hasDetail` fork here, unlike `/clients` above — `/pipeline` has no
    // child detail route (33-UI-SPEC.md §0: a single non-link crumb).
    return {
      titleKey: 'sidebar.nav.pipeline',
      activeNav: 'pipeline',
      breadcrumb: [{ labelKey: 'sidebar.nav.pipeline' }],
    };
  }
  if (pathname.startsWith('/aide')) {
    return {
      titleKey: 'sidebar.nav.help',
      activeNav: 'help',
      breadcrumb: [{ labelKey: 'sidebar.nav.help' }],
    };
  }
  return {
    titleKey: 'header.home',
    activeNav: 'home',
    breadcrumb: [{ labelKey: 'header.home' }],
  };
}

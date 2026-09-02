import { describe, expect, it } from 'vitest';
import { getRouteMeta } from './route-meta';

describe('getRouteMeta — partner tree (no adminSegment)', () => {
  it('returns home for /', () => {
    expect(getRouteMeta('/')).toEqual({
      titleKey: 'header.home',
      activeNav: 'home',
      breadcrumb: [{ labelKey: 'header.home' }],
    });
  });

  it('returns proposals for /proposals (list)', () => {
    expect(getRouteMeta('/proposals')).toEqual({
      titleKey: 'sidebar.nav.proposals',
      activeNav: 'proposals',
      breadcrumb: [{ labelKey: 'sidebar.nav.proposals' }],
    });
  });

  it('returns proposals for /proposals/[id] (detail) — D-06 breadcrumb links back to the list', () => {
    expect(getRouteMeta('/proposals/abc-123')).toEqual({
      titleKey: 'sidebar.nav.proposals',
      activeNav: 'proposals',
      breadcrumb: [
        { labelKey: 'sidebar.nav.proposals', href: '/proposals' },
        { labelKey: 'shell.breadcrumb.proposalDetail' },
      ],
    });
  });

  it('returns a real-looking UUID detail breadcrumb for /proposals/[uuid] (D-06)', () => {
    expect(getRouteMeta('/proposals/3f9a1c2e-4b5d-4e6f-8a9b-0c1d2e3f4a5b')).toEqual({
      titleKey: 'sidebar.nav.proposals',
      activeNav: 'proposals',
      breadcrumb: [
        { labelKey: 'sidebar.nav.proposals', href: '/proposals' },
        { labelKey: 'shell.breadcrumb.proposalDetail' },
      ],
    });
  });

  it('returns proposals.new for /proposals/new and every wizard sub-step, with a 2-segment breadcrumb (D-06)', () => {
    const wizardSteps = [
      '/proposals/new',
      '/proposals/new/parametres',
      '/proposals/new/calcul',
      '/proposals/new/verification',
    ];
    for (const p of wizardSteps) {
      expect(getRouteMeta(p)).toEqual({
        titleKey: 'header.proposals.new',
        activeNav: 'proposals-new',
        breadcrumb: [
          { labelKey: 'sidebar.nav.proposals', href: '/proposals' },
          { labelKey: 'header.proposals.new' },
        ],
      });
    }
  });

  it('returns help for /aide and /aide/commencer-ici', () => {
    expect(getRouteMeta('/aide')).toEqual({
      titleKey: 'sidebar.nav.help',
      activeNav: 'help',
      breadcrumb: [{ labelKey: 'sidebar.nav.help' }],
    });
    expect(getRouteMeta('/aide/commencer-ici')).toEqual({
      titleKey: 'sidebar.nav.help',
      activeNav: 'help',
      breadcrumb: [{ labelKey: 'sidebar.nav.help' }],
    });
  });

  it('falls back to home for unmatched partner paths', () => {
    expect(getRouteMeta('/something-unknown')).toEqual({
      titleKey: 'header.home',
      activeNav: 'home',
      breadcrumb: [{ labelKey: 'header.home' }],
    });
  });

  it('returns clients for /clients (list) and /clients/[id] (detail) — Plan 30-02, D-06 breadcrumb', () => {
    expect(getRouteMeta('/clients')).toEqual({
      titleKey: 'sidebar.nav.clients',
      activeNav: 'clients',
      breadcrumb: [{ labelKey: 'sidebar.nav.clients' }],
    });
    expect(getRouteMeta('/clients/abc-123')).toEqual({
      titleKey: 'sidebar.nav.clients',
      activeNav: 'clients',
      breadcrumb: [
        { labelKey: 'sidebar.nav.clients', href: '/clients' },
        { labelKey: 'shell.breadcrumb.clientDetail' },
      ],
    });
  });

  it('returns a real-looking UUID detail breadcrumb for /clients/[uuid] (D-06)', () => {
    expect(getRouteMeta('/clients/7c8d9e0f-1a2b-4c3d-9e8f-6a5b4c3d2e1f')).toEqual({
      titleKey: 'sidebar.nav.clients',
      activeNav: 'clients',
      breadcrumb: [
        { labelKey: 'sidebar.nav.clients', href: '/clients' },
        { labelKey: 'shell.breadcrumb.clientDetail' },
      ],
    });
  });

  it('trailing slash on /clients/ does not create a phantom detail segment (D-06)', () => {
    expect(getRouteMeta('/clients/')).toEqual({
      titleKey: 'sidebar.nav.clients',
      activeNav: 'clients',
      breadcrumb: [{ labelKey: 'sidebar.nav.clients' }],
    });
  });
});

describe('getRouteMeta — admin tree (with adminSegment)', () => {
  const seg = 'secret-admin-9f3a';

  it('returns admin-home for /<seg>', () => {
    expect(getRouteMeta(`/${seg}`, seg)).toEqual({
      titleKey: 'sidebar.nav.home',
      activeNav: 'admin-home',
      breadcrumb: [{ labelKey: 'sidebar.nav.home' }],
    });
  });

  it('returns admin-coefficients for /<seg>/coefficients', () => {
    expect(getRouteMeta(`/${seg}/coefficients`, seg)).toEqual({
      titleKey: 'sidebar.nav.adminCoefficients',
      activeNav: 'admin-coefficients',
      breadcrumb: [{ labelKey: 'sidebar.nav.adminCoefficients' }],
    });
  });

  it('returns admin-partners for /<seg>/partners and /<seg>/partners/new, with different breadcrumb depth (D-06)', () => {
    expect(getRouteMeta(`/${seg}/partners`, seg)).toEqual({
      titleKey: 'sidebar.nav.adminPartners',
      activeNav: 'admin-partners',
      breadcrumb: [{ labelKey: 'sidebar.nav.adminPartners' }],
    });
    expect(getRouteMeta(`/${seg}/partners/new`, seg)).toEqual({
      titleKey: 'sidebar.nav.adminPartners',
      activeNav: 'admin-partners',
      breadcrumb: [
        { labelKey: 'sidebar.nav.adminPartners', href: `/${seg}/partners` },
        { labelKey: 'admin.partners.breadcrumb.new' },
      ],
    });
  });

  it('returns admin-history for /<seg>/history', () => {
    expect(getRouteMeta(`/${seg}/history`, seg)).toEqual({
      titleKey: 'sidebar.nav.adminHistory',
      activeNav: 'admin-history',
      breadcrumb: [{ labelKey: 'sidebar.nav.adminHistory' }],
    });
  });

  it('returns admin-companies for /<seg>/companies (Plan 30-02)', () => {
    expect(getRouteMeta(`/${seg}/companies`, seg)).toEqual({
      titleKey: 'sidebar.nav.adminCompanies',
      activeNav: 'admin-companies',
      breadcrumb: [{ labelKey: 'sidebar.nav.adminCompanies' }],
    });
  });

  it('returns admin-companies detail breadcrumb for /<seg>/companies/[uuid] (D-06)', () => {
    expect(getRouteMeta(`/${seg}/companies/9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d`, seg)).toEqual({
      titleKey: 'sidebar.nav.adminCompanies',
      activeNav: 'admin-companies',
      breadcrumb: [
        { labelKey: 'sidebar.nav.adminCompanies', href: `/${seg}/companies` },
        { labelKey: 'shell.breadcrumb.companyDetail' },
      ],
    });
  });

  it('returns admin-reconciliation for /<seg>/companies/review (Plan 31-06, D-16) — ordered before /companies and the detail match', () => {
    expect(getRouteMeta(`/${seg}/companies/review`, seg)).toEqual({
      titleKey: 'sidebar.nav.adminReconciliation',
      activeNav: 'admin-reconciliation',
      breadcrumb: [
        { labelKey: 'sidebar.nav.adminCompanies', href: `/${seg}/companies` },
        { labelKey: 'sidebar.nav.adminReconciliation' },
      ],
    });
  });

  it('regression: /<seg>/companies still resolves to admin-companies, not admin-reconciliation', () => {
    expect(getRouteMeta(`/${seg}/companies`, seg)).toEqual({
      titleKey: 'sidebar.nav.adminCompanies',
      activeNav: 'admin-companies',
      breadcrumb: [{ labelKey: 'sidebar.nav.adminCompanies' }],
    });
  });

  it('does NOT misclassify a partner path that happens to share a prefix without the / separator', () => {
    // adminSegment='admin' must not match '/administrators' (no slash boundary).
    expect(getRouteMeta('/administrators', 'admin')).toEqual({
      titleKey: 'header.home',
      activeNav: 'home',
      breadcrumb: [{ labelKey: 'header.home' }],
    });
  });

  it('still routes partner paths correctly when adminSegment is provided', () => {
    expect(getRouteMeta('/proposals/new/calcul', seg)).toEqual({
      titleKey: 'header.proposals.new',
      activeNav: 'proposals-new',
      breadcrumb: [
        { labelKey: 'sidebar.nav.proposals', href: '/proposals' },
        { labelKey: 'header.proposals.new' },
      ],
    });
  });
});

describe('getRouteMeta — breadcrumb trail invariants (D-06, ROADMAP criterion 3)', () => {
  const seg = 'secret-admin-9f3a';

  // 16 distinct pathnames spanning both the partner tree and the admin tree,
  // including every branch of the route-matching chain, so a future route
  // added without a trail (or with a malformed one) fails generically rather
  // than only when someone remembers to add a route-specific test.
  const representativePathnames: Array<[pathname: string, adminSegment?: string]> = [
    ['/'],
    ['/proposals'],
    ['/proposals/abc-123'],
    ['/proposals/new'],
    ['/proposals/new/parametres'],
    ['/clients'],
    ['/clients/abc-123'],
    ['/clients/'],
    ['/aide'],
    ['/aide/commencer-ici'],
    ['/something-unknown'],
    [`/${seg}`, seg],
    [`/${seg}/coefficients`, seg],
    [`/${seg}/partners`, seg],
    [`/${seg}/partners/new`, seg],
    [`/${seg}/companies`, seg],
    [`/${seg}/companies/9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d`, seg],
    [`/${seg}/companies/review`, seg],
    [`/${seg}/history`, seg],
  ];

  it('every trail has length 1 or 2', () => {
    for (const [pathname, adminSegment] of representativePathnames) {
      const { breadcrumb } = getRouteMeta(pathname, adminSegment);
      expect(
        breadcrumb.length,
        `${pathname} (adminSegment=${adminSegment ?? 'none'}) trail length`,
      ).toBeGreaterThanOrEqual(1);
      expect(
        breadcrumb.length,
        `${pathname} (adminSegment=${adminSegment ?? 'none'}) trail length`,
      ).toBeLessThanOrEqual(2);
    }
  });

  it('the last segment of every trail has href === undefined (current page is never a link)', () => {
    for (const [pathname, adminSegment] of representativePathnames) {
      const { breadcrumb } = getRouteMeta(pathname, adminSegment);
      const last = breadcrumb[breadcrumb.length - 1];
      expect(
        last.href,
        `${pathname} (adminSegment=${adminSegment ?? 'none'}) last-segment href`,
      ).toBeUndefined();
    }
  });

  it('every non-last segment has a non-empty href that starts with "/" (no open-redirect surface)', () => {
    for (const [pathname, adminSegment] of representativePathnames) {
      const { breadcrumb } = getRouteMeta(pathname, adminSegment);
      for (let i = 0; i < breadcrumb.length - 1; i++) {
        const segment = breadcrumb[i];
        expect(
          segment.href,
          `${pathname} (adminSegment=${adminSegment ?? 'none'}) segment[${i}] href`,
        ).toBeTruthy();
        expect(
          segment.href!.startsWith('/'),
          `${pathname} (adminSegment=${adminSegment ?? 'none'}) segment[${i}] href starts with /`,
        ).toBe(true);
      }
    }
  });
});

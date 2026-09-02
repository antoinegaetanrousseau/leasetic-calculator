/**
 * Phase 30 Plan 08 Task 1 — companies page.tsx tests.
 *
 * The page is a server component that fans out:
 *   - requireAdmin()  (auth gate, FIRST — AUTH-15 defense in depth)
 *   - listCompaniesForAdmin({q, cursor, limit: 20})
 *
 * and renders:
 *   - PageHero (title + subtitle, no eyebrow, no actions)
 *   - SearchBar
 *   - CompaniesList (with rows + cursor + q echo props)
 *
 * Coverage:
 *   1. requireAdmin() is called before listCompaniesForAdmin (T-30-08-01).
 *   2. PageHero renders with admin.companies.page.title.
 *   3. SearchBar renders.
 *   4. searchParams.q is passed through to listCompaniesForAdmin.
 *   5. CompaniesList receives rows/nextCursor from listCompaniesForAdmin.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const { requireAdminMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(async () => ({ session: { user: { id: 'admin-1' } } })),
}));

vi.mock('@/lib/auth/require', () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock('@/lib/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/i18n')>();
  return {
    ...actual,
    getCurrentLang: vi.fn(async () => 'fr'),
  };
});

const { listCompaniesForAdminMock } = vi.hoisted(() => ({
  listCompaniesForAdminMock: vi.fn(async () => ({
    rows: [
      {
        companyId: 'c-1',
        name: 'Acme SARL',
        siren: '123456789',
        relationsCount: 2,
        lastActivityAt: new Date('2026-05-15T10:00:00Z'),
        createdAt: new Date('2026-04-01T12:00:00Z'),
      },
    ],
    nextCursor: null,
  })),
}));

vi.mock('@/lib/db/queries', () => ({
  listCompaniesForAdmin: listCompaniesForAdminMock,
}));

import CompaniesPage from './page';

beforeEach(() => {
  requireAdminMock.mockClear();
  listCompaniesForAdminMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('companies/page.tsx — Task 1', () => {
  it('Test 1: requireAdmin() is called before listCompaniesForAdmin (T-30-08-01)', async () => {
    await CompaniesPage({
      params: Promise.resolve({ adminSegment: 'admin-secret' }),
      searchParams: Promise.resolve({}),
    });
    expect(requireAdminMock).toHaveBeenCalled();
    expect(listCompaniesForAdminMock).toHaveBeenCalled();
    const requireOrder = requireAdminMock.mock.invocationCallOrder[0];
    const listOrder = listCompaniesForAdminMock.mock.invocationCallOrder[0];
    expect(requireOrder).toBeLessThan(listOrder);
  });

  it('Test 2: renders PageHero with admin.companies.page.title', async () => {
    const tree = await CompaniesPage({
      params: Promise.resolve({ adminSegment: 'admin-secret' }),
      searchParams: Promise.resolve({}),
    });
    const html = renderToString(tree);
    expect(html).toContain('Sociétés');
    expect(html).toContain('Acme SARL');
  });

  it('Test 3: renders SearchBar (search input element present)', async () => {
    const tree = await CompaniesPage({
      params: Promise.resolve({ adminSegment: 'admin-secret' }),
      searchParams: Promise.resolve({}),
    });
    const html = renderToString(tree);
    expect(html).toMatch(/type="search"/);
  });

  it('Test 4: passes trimmed q through to listCompaniesForAdmin', async () => {
    await CompaniesPage({
      params: Promise.resolve({ adminSegment: 'admin-secret' }),
      searchParams: Promise.resolve({ q: '  acme  ' }),
    });
    expect(listCompaniesForAdminMock).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'acme', limit: 20 }),
    );
  });

  it('Test 5: row links to /{adminSegment}/companies/{companyId}', async () => {
    const tree = await CompaniesPage({
      params: Promise.resolve({ adminSegment: 'admin-secret' }),
      searchParams: Promise.resolve({}),
    });
    const html = renderToString(tree);
    expect(html).toContain('href="/admin-secret/companies/c-1"');
  });
});

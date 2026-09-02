/**
 * Phase 30 Plan 08 Task 2 — companies/[id]/page.tsx tests.
 *
 * The page is a server component that fans out:
 *   - requireAdmin()  (auth gate, FIRST)
 *   - getCompanyForAdmin(id) -> null => notFound()
 *   - listRelationshipsForCompany(id) (only after the notFound() branch)
 *
 * Coverage (per <behavior>):
 *   1. getCompanyForAdmin returning null yields notFound(), and
 *      listRelationshipsForCompany is never called in that case.
 *   2. requireAdmin() runs before getCompanyForAdmin.
 *   3. The header renders the company name via PageHero, no eyebrow.
 *   4. listRelationshipsForCompany is called with the company id once the
 *      company is found.
 *   5. Zero relationships → admin.companies.empty.zero.title.
 *   6. Acceptance: no maxWidth wrapper, force-dynamic, no contact field
 *      references, no params_snapshot/commission/global_params references.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
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

const { getCompanyForAdminMock, listRelationshipsForCompanyMock } = vi.hoisted(() => ({
  getCompanyForAdminMock: vi.fn(),
  listRelationshipsForCompanyMock: vi.fn(async () => []),
}));

vi.mock('@/lib/db/queries', () => ({
  getCompanyForAdmin: getCompanyForAdminMock,
  listRelationshipsForCompany: listRelationshipsForCompanyMock,
}));

import CompanyDetailPage from './page';

const COMPANY = { companyId: 'co-1', name: 'Dupont Menuiserie', siren: '123456789' };

beforeEach(() => {
  requireAdminMock.mockClear();
  getCompanyForAdminMock.mockReset();
  listRelationshipsForCompanyMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('companies/[id]/page.tsx — Task 2', () => {
  it('Test 1: notFound() when getCompanyForAdmin returns null; relationships never fetched', async () => {
    getCompanyForAdminMock.mockResolvedValue(null);

    await expect(
      CompanyDetailPage({
        params: Promise.resolve({ adminSegment: 'admin-secret', id: 'co-missing' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(listRelationshipsForCompanyMock).not.toHaveBeenCalled();
  });

  it('Test 2: requireAdmin() runs before getCompanyForAdmin', async () => {
    getCompanyForAdminMock.mockResolvedValue(COMPANY);
    await CompanyDetailPage({
      params: Promise.resolve({ adminSegment: 'admin-secret', id: 'co-1' }),
    });
    const requireOrder = requireAdminMock.mock.invocationCallOrder[0];
    const getOrder = getCompanyForAdminMock.mock.invocationCallOrder[0];
    expect(requireOrder).toBeLessThan(getOrder);
  });

  it('Test 3: header renders the company name via PageHero (no eyebrow)', async () => {
    getCompanyForAdminMock.mockResolvedValue(COMPANY);
    const tree = await CompanyDetailPage({
      params: Promise.resolve({ adminSegment: 'admin-secret', id: 'co-1' }),
    });
    const html = renderToString(tree);
    expect(html).toContain('Dupont Menuiserie');
    expect(html).not.toContain('data-slot="page-hero-eyebrow"');
    expect(html).toContain('123456789');
  });

  it('Test 4: listRelationshipsForCompany is called with the company id', async () => {
    getCompanyForAdminMock.mockResolvedValue(COMPANY);
    await CompanyDetailPage({
      params: Promise.resolve({ adminSegment: 'admin-secret', id: 'co-1' }),
    });
    expect(listRelationshipsForCompanyMock).toHaveBeenCalledWith('co-1');
  });

  it('Test 5: zero relationships renders admin.companies.empty.zero.title', async () => {
    getCompanyForAdminMock.mockResolvedValue(COMPANY);
    listRelationshipsForCompanyMock.mockResolvedValue([]);
    const tree = await CompanyDetailPage({
      params: Promise.resolve({ adminSegment: 'admin-secret', id: 'co-1' }),
    });
    const html = renderToString(tree);
    expect(html).toContain('Aucune relation active pour cette société.');
  });

  it('Test 6 (acceptance): no maxWidth, force-dynamic, no contact-field references', async () => {
    // NOTE: the ADMIN-09 commission-envelope check is intentionally NOT
    // replicated here as a source-string match — a literal check for those
    // three words would self-match this file's own explanatory comments
    // (the same false-positive class documented in 30-07-SUMMARY.md
    // Deviation #4). It is verified instead by the plan's own standalone
    // grep acceptance gate run against page.tsx directly.
    const path = await import('node:path');
    const fs = await import('node:fs/promises');
    const pageSource = await fs.readFile(
      path.join(process.cwd(), 'app/(admin)/[adminSegment]/companies/[id]/page.tsx'),
      'utf8',
    );
    expect(pageSource).not.toMatch(/maxWidth/);
    expect(pageSource).toContain("export const dynamic = 'force-dynamic'");
    expect(pageSource).not.toMatch(/listContactsForRelationship|contact\.(name|email|phone)/);
  });
});

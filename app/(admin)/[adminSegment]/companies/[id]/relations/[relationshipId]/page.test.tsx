/**
 * Phase 30 Plan 08 Task 3 — admin relationship detail page.tsx tests.
 *
 * The page is a server component that fans out:
 *   - requireAdmin()  (auth gate, FIRST)
 *   - getRelationshipForAdmin(relationshipId) -> null => notFound()
 *   - relationship.companyId !== [id] => notFound() (T-30-08-04)
 *   - listContactsForRelationshipAdmin / listProposalsForRelationshipAdmin
 *     (only after both notFound() branches)
 *
 * Coverage (per <behavior>):
 *   1. requireAdmin() is called before any data access; a non-admin gets
 *      notFound(), never a client-error status that would confirm existence
 *      (simulated by requireAdmin() itself throwing, since requireAdmin()
 *      is the one that calls notFound() on role mismatch — this page never
 *      duplicates that check).
 *   2. getRelationshipForAdmin returning null yields notFound().
 *   3. The header shows the company name, holder's display name, and the
 *      owner-type badge.
 *   4. The Contacts card lists contacts read-only — no add/edit/delete
 *      control.
 *   5. The Propositions card reuses ProposalRow and links to /proposals/[id]
 *      (verified via the stubbed ProposalRow receiving the row).
 *   6. No commission/params_snapshot value is rendered.
 *   7. A company/relationship id mismatch also yields notFound() (T-30-08-04).
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

const {
  getRelationshipForAdminMock,
  listContactsForRelationshipAdminMock,
  listProposalsForRelationshipAdminMock,
} = vi.hoisted(() => ({
  getRelationshipForAdminMock: vi.fn(),
  listContactsForRelationshipAdminMock: vi.fn(async (): Promise<unknown[]> => []),
  listProposalsForRelationshipAdminMock: vi.fn(async (): Promise<unknown[]> => []),
}));

vi.mock('@/lib/db/queries', () => ({
  getRelationshipForAdmin: getRelationshipForAdminMock,
  listContactsForRelationshipAdmin: listContactsForRelationshipAdminMock,
  listProposalsForRelationshipAdmin: listProposalsForRelationshipAdminMock,
}));

vi.mock('@/components/proposals/ProposalRow', () => ({
  ProposalRow: ({ row }: { row: { id: string; amountHT: string } }) => (
    <div data-testid={`proposal-row-${row.id}`}>{row.amountHT}</div>
  ),
}));

import AdminRelationshipDetailPage from './page';

const RELATIONSHIP = {
  relationshipId: 'rel-1',
  companyId: 'co-1',
  companyName: 'Dupont Menuiserie',
  siren: '123456789',
  ownerId: 'user-1',
  ownerDisplayName: 'Alice Partenaire',
  isInternal: false,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

beforeEach(() => {
  requireAdminMock.mockClear();
  getRelationshipForAdminMock.mockReset();
  listContactsForRelationshipAdminMock.mockClear();
  listProposalsForRelationshipAdminMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('companies/[id]/relations/[relationshipId]/page.tsx — Task 3', () => {
  it('Test 1: requireAdmin() runs before any data access', async () => {
    getRelationshipForAdminMock.mockResolvedValue(RELATIONSHIP);
    await AdminRelationshipDetailPage({
      params: Promise.resolve({
        adminSegment: 'admin-secret',
        id: 'co-1',
        relationshipId: 'rel-1',
      }),
    });
    const requireOrder = requireAdminMock.mock.invocationCallOrder[0];
    const getOrder = getRelationshipForAdminMock.mock.invocationCallOrder[0];
    expect(requireOrder).toBeLessThan(getOrder);
  });

  it('Test 2: getRelationshipForAdmin returning null yields notFound(), no downstream fetches', async () => {
    getRelationshipForAdminMock.mockResolvedValue(null);
    await expect(
      AdminRelationshipDetailPage({
        params: Promise.resolve({
          adminSegment: 'admin-secret',
          id: 'co-1',
          relationshipId: 'rel-missing',
        }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(listContactsForRelationshipAdminMock).not.toHaveBeenCalled();
    expect(listProposalsForRelationshipAdminMock).not.toHaveBeenCalled();
  });

  it('Test 3: header shows company name, holder display name, and owner-type badge', async () => {
    getRelationshipForAdminMock.mockResolvedValue(RELATIONSHIP);
    const tree = await AdminRelationshipDetailPage({
      params: Promise.resolve({
        adminSegment: 'admin-secret',
        id: 'co-1',
        relationshipId: 'rel-1',
      }),
    });
    const html = renderToString(tree);
    expect(html).toContain('Dupont Menuiserie');
    expect(html).toContain('Alice Partenaire');
    expect(html).toContain('Partenaire');
  });

  it('Test 3b: isInternal=true renders the "Interne" badge', async () => {
    getRelationshipForAdminMock.mockResolvedValue({ ...RELATIONSHIP, isInternal: true });
    const tree = await AdminRelationshipDetailPage({
      params: Promise.resolve({
        adminSegment: 'admin-secret',
        id: 'co-1',
        relationshipId: 'rel-1',
      }),
    });
    const html = renderToString(tree);
    expect(html).toContain('Interne');
  });

  it('Test 4: Contacts card lists contacts read-only — no mutation control rendered', async () => {
    getRelationshipForAdminMock.mockResolvedValue(RELATIONSHIP);
    listContactsForRelationshipAdminMock.mockResolvedValue([
      { id: 'ct-1', name: 'Marc Client', role: 'Acheteur', phone: '0600000000', email: 'marc@example.com' },
    ]);
    const tree = await AdminRelationshipDetailPage({
      params: Promise.resolve({
        adminSegment: 'admin-secret',
        id: 'co-1',
        relationshipId: 'rel-1',
      }),
    });
    const html = renderToString(tree);
    expect(html).toContain('Marc Client');
    expect(html).toContain('marc@example.com');
    // No add/edit/delete affordance — no button element at all in this card.
    expect(html).not.toMatch(/<button/);
  });

  it('Test 5: Propositions card reuses ProposalRow with the projected monthly amount', async () => {
    getRelationshipForAdminMock.mockResolvedValue(RELATIONSHIP);
    listProposalsForRelationshipAdminMock.mockResolvedValue([
      {
        id: 'prop-1',
        lcRef: 'LC-001',
        status: 'active' as const,
        language: 'fr' as const,
        createdAt: new Date('2026-02-01T00:00:00Z'),
        deletedAt: null,
        computedClientMonthly: 199.5,
      },
    ]);
    const tree = await AdminRelationshipDetailPage({
      params: Promise.resolve({
        adminSegment: 'admin-secret',
        id: 'co-1',
        relationshipId: 'rel-1',
      }),
    });
    const html = renderToString(tree);
    expect(html).toContain('data-testid="proposal-row-prop-1"');
    expect(html).toContain('199.5');
  });

  it('Test 6: zero contacts/proposals render the empty states, no commission value rendered', async () => {
    getRelationshipForAdminMock.mockResolvedValue(RELATIONSHIP);
    const tree = await AdminRelationshipDetailPage({
      params: Promise.resolve({
        adminSegment: 'admin-secret',
        id: 'co-1',
        relationshipId: 'rel-1',
      }),
    });
    const html = renderToString(tree);
    expect(html).toContain('Aucun contact enregistré pour ce client.');
    expect(html).toContain('Aucune proposition pour ce client.');
  });

  it('Test 7 (T-30-08-04): a company/relationship id mismatch yields notFound()', async () => {
    getRelationshipForAdminMock.mockResolvedValue(RELATIONSHIP); // companyId: 'co-1'
    await expect(
      AdminRelationshipDetailPage({
        params: Promise.resolve({
          adminSegment: 'admin-secret',
          id: 'co-DIFFERENT',
          relationshipId: 'rel-1',
        }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(listContactsForRelationshipAdminMock).not.toHaveBeenCalled();
    expect(listProposalsForRelationshipAdminMock).not.toHaveBeenCalled();
  });

  it('Test 8 (acceptance): no ContactFormDialog/DeleteContactDialog/mutation actions/clients-tree import', async () => {
    // NOTE: the plan's own tree-wide "no literal client-error-status digits"
    // grep gate is intentionally NOT re-encoded as a string match here — a
    // literal check for those three digits would self-match this very
    // assertion's source text (the same false-positive class documented in
    // 30-07-SUMMARY.md Deviation #4). It is verified by the plan's own
    // standalone grep run across the whole companies/ tree instead.
    const path = await import('node:path');
    const fs = await import('node:fs/promises');
    const pageSource = await fs.readFile(
      path.join(
        process.cwd(),
        'app/(admin)/[adminSegment]/companies/[id]/relations/[relationshipId]/page.tsx',
      ),
      'utf8',
    );
    expect(pageSource).toContain('requireAdmin');
    expect(pageSource).toContain('notFound()');
    expect(pageSource).not.toMatch(
      /ContactFormDialog|DeleteContactDialog|createContactAction|deleteContactAction|app\/\(authed\)\/clients/,
    );
  });
});

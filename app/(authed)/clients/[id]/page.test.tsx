/**
 * Phase 30 Plan 07 Task 1 — /clients/[id] page.tsx tests.
 *
 * The page is a server component that fans out:
 *   - requireRelationshipHolder()  (auth gate, FIRST)
 *   - getClientRelationshipForOwner(id, session.user.id) -> null => notFound()
 *   - listContactsForRelationship / listProposalsForRelationship (only
 *     after the notFound() branch)
 *
 * Coverage (per <acceptance_criteria>):
 *   1. notFound() is called when getClientRelationshipForOwner returns
 *      null, and contacts/proposals are NEVER fetched in that case.
 *   2. A non-owned id and a nonexistent id produce byte-identical outcomes
 *      (both collapse to the same null -> notFound() branch).
 *   3. getClientRelationshipForOwner receives session.user.id as its
 *      second argument.
 *   4. A null siren renders no SIREN element in the header; a present
 *      siren renders inline.
 *   5. contacts/proposals are fetched with session.user.id once the
 *      relationship is found.
 *   6. Source-level acceptance checks: no maxWidth wrapper, force-dynamic,
 *      clientRelationshipId= in the href, notFound() precedes the contacts
 *      read in source order.
 *
 * ContactList and ProposalRow are stubbed — their own behavior is covered
 * by their dedicated test files.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

const { requireRelationshipHolderMock } = vi.hoisted(() => ({
  requireRelationshipHolderMock: vi.fn(async () => ({
    session: { user: { id: 'owner-1' } },
    role: 'partner' as const,
  })),
}));

vi.mock('@/lib/auth/require', () => ({
  requireRelationshipHolder: requireRelationshipHolderMock,
}));

vi.mock('@/lib/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/i18n')>();
  return {
    ...actual,
    getCurrentLang: vi.fn(async () => 'fr'),
  };
});

const {
  getClientRelationshipForOwnerMock,
  listContactsForRelationshipMock,
  listProposalsForRelationshipMock,
} = vi.hoisted(() => ({
  getClientRelationshipForOwnerMock: vi.fn(),
  listContactsForRelationshipMock: vi.fn(async () => []),
  listProposalsForRelationshipMock: vi.fn(async () => []),
}));

vi.mock('@/lib/db/queries', () => ({
  getClientRelationshipForOwner: getClientRelationshipForOwnerMock,
  listContactsForRelationship: listContactsForRelationshipMock,
  listProposalsForRelationship: listProposalsForRelationshipMock,
}));

vi.mock('./ContactList', () => ({
  ContactList: () => <div data-testid="contact-list-stub" />,
}));

vi.mock('@/components/proposals/ProposalRow', () => ({
  ProposalRow: ({ row }: { row: { id: string } }) => (
    <div data-testid={`proposal-row-${row.id}`} />
  ),
}));

import ClientDetailPage from './page';

const RELATIONSHIP = {
  relationshipId: 'rel-1',
  companyId: 'co-1',
  companyName: 'Dupont Menuiserie',
  siren: '123456789',
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

beforeEach(() => {
  requireRelationshipHolderMock.mockClear();
  getClientRelationshipForOwnerMock.mockReset();
  listContactsForRelationshipMock.mockClear();
  listProposalsForRelationshipMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('clients/[id]/page.tsx — Task 1 server route', () => {
  it('Test 1: notFound() is called when getClientRelationshipForOwner returns null, and contacts/proposals are never fetched', async () => {
    getClientRelationshipForOwnerMock.mockResolvedValue(null);

    await expect(
      ClientDetailPage({ params: Promise.resolve({ id: 'rel-not-mine' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(listContactsForRelationshipMock).not.toHaveBeenCalled();
    expect(listProposalsForRelationshipMock).not.toHaveBeenCalled();
  });

  it('Test 2: a non-owned id and a nonexistent id produce byte-identical outcomes (both a plain notFound())', async () => {
    getClientRelationshipForOwnerMock.mockResolvedValueOnce(null); // "not owned"
    await expect(
      ClientDetailPage({ params: Promise.resolve({ id: 'rel-not-mine' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    getClientRelationshipForOwnerMock.mockResolvedValueOnce(null); // "nonexistent"
    await expect(
      ClientDetailPage({ params: Promise.resolve({ id: 'rel-does-not-exist' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('Test 3: getClientRelationshipForOwner receives session.user.id as its second argument', async () => {
    getClientRelationshipForOwnerMock.mockResolvedValue(RELATIONSHIP);
    await ClientDetailPage({ params: Promise.resolve({ id: 'rel-1' }) });
    expect(getClientRelationshipForOwnerMock).toHaveBeenCalledWith('rel-1', 'owner-1');
  });

  it('Test 4: a null siren renders no SIREN element in the header', async () => {
    getClientRelationshipForOwnerMock.mockResolvedValue({ ...RELATIONSHIP, siren: null });
    const tree = await ClientDetailPage({ params: Promise.resolve({ id: 'rel-1' }) });
    const html = renderToString(tree);
    expect(html).toContain('Dupont Menuiserie');
    expect(html).not.toContain('123456789');
  });

  it('Test 4b: a present siren renders inline beside the title', async () => {
    getClientRelationshipForOwnerMock.mockResolvedValue(RELATIONSHIP);
    const tree = await ClientDetailPage({ params: Promise.resolve({ id: 'rel-1' }) });
    const html = renderToString(tree);
    expect(html).toContain('123456789');
  });

  it('Test 5: contacts/proposals are fetched with session.user.id once the relationship is found', async () => {
    getClientRelationshipForOwnerMock.mockResolvedValue(RELATIONSHIP);
    await ClientDetailPage({ params: Promise.resolve({ id: 'rel-1' }) });
    expect(listContactsForRelationshipMock).toHaveBeenCalledWith('rel-1', 'owner-1');
    expect(listProposalsForRelationshipMock).toHaveBeenCalledWith('rel-1', 'owner-1');
  });

  it('Test 6 (acceptance): no maxWidth wrapper, force-dynamic, clientRelationshipId= present, notFound() precedes the contacts read', async () => {
    const path = await import('node:path');
    const fs = await import('node:fs/promises');
    const pageSource = await fs.readFile(
      path.join(process.cwd(), 'app/(authed)/clients/[id]/page.tsx'),
      'utf8',
    );
    expect(pageSource).not.toMatch(/maxWidth/);
    expect(pageSource).toContain("export const dynamic = 'force-dynamic'");
    expect(pageSource).toMatch(/clientRelationshipId=/);
    const notFoundIdx = pageSource.indexOf('notFound()');
    const contactsIdx = pageSource.indexOf('listContactsForRelationship(');
    expect(notFoundIdx).toBeGreaterThan(0);
    expect(contactsIdx).toBeGreaterThan(notFoundIdx);
  });
});

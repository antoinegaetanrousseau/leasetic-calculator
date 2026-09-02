/**
 * Phase 30 Plan 06 Task 1 — /clients page.tsx tests.
 *
 * The page is a server component that fans out:
 *   - requireRelationshipHolder()  (auth gate, FIRST)
 *   - listClientBook({ ownerId: session.user.id, q, sort, dir, cursor, limit: 20 })
 *
 * Coverage (per <acceptance_criteria>):
 *   1. requireRelationshipHolder is called before listClientBook.
 *   2. listClientBook receives ownerId === session.user.id (never a param).
 *   3. An attacker-supplied ?ownerId=/?user_id= search param never reaches
 *      the query call payload.
 *   4. An invalid ?sort= value falls back to undefined (server default),
 *      never reaching the query call as the raw string.
 *   5. Renders PageHero (title + CreateClientDialog "Nouveau client" CTA)
 *      and SearchBar.
 *
 * Mocks the auth + query layer (no DB), then renderToString the result —
 * same strategy as app/(admin)/[adminSegment]/partners/page.test.tsx.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
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

const { listClientBookMock } = vi.hoisted(() => ({
  listClientBookMock: vi.fn(async () => ({
    rows: [
      {
        relationshipId: 'rel-1',
        companyId: 'co-1',
        companyName: 'Dupont Menuiserie',
        siren: '123456789',
        proposalsCount: 2,
        lastActivityAt: new Date('2026-05-15T10:00:00Z'),
        createdAt: new Date('2026-04-01T12:00:00Z'),
      },
    ],
    nextCursor: null,
  })),
}));

vi.mock('@/lib/db/queries', () => ({
  listClientBook: listClientBookMock,
}));

// Import AFTER all mocks are in place.
import ClientsPage from './page';

// Order-of-calls proof for Test 1.
const callOrder: string[] = [];
requireRelationshipHolderMock.mockImplementation(async () => {
  callOrder.push('requireRelationshipHolder');
  return { session: { user: { id: 'owner-1' } }, role: 'partner' as const };
});
listClientBookMock.mockImplementation(async () => {
  callOrder.push('listClientBook');
  return {
    rows: [
      {
        relationshipId: 'rel-1',
        companyId: 'co-1',
        companyName: 'Dupont Menuiserie',
        siren: '123456789',
        proposalsCount: 2,
        lastActivityAt: new Date('2026-05-15T10:00:00Z'),
        createdAt: new Date('2026-04-01T12:00:00Z'),
      },
    ],
    nextCursor: null,
  };
});

beforeEach(() => {
  callOrder.length = 0;
  requireRelationshipHolderMock.mockClear();
  listClientBookMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('clients/page.tsx — Task 1 server route', () => {
  it('Test 1: calls requireRelationshipHolder() before listClientBook()', async () => {
    await ClientsPage({ searchParams: Promise.resolve({}) });
    expect(callOrder).toEqual(['requireRelationshipHolder', 'listClientBook']);
  });

  it('Test 2: listClientBook receives ownerId === session.user.id, never a search param', async () => {
    await ClientsPage({
      searchParams: Promise.resolve({ q: 'dupont', sort: 'company', dir: 'asc', cursor: 'abc' }),
    });
    expect(listClientBookMock).toHaveBeenCalledTimes(1);
    expect(listClientBookMock).toHaveBeenCalledWith({
      ownerId: 'owner-1',
      q: 'dupont',
      sort: 'company',
      dir: 'asc',
      cursor: 'abc',
      limit: 20,
    });
  });

  it('Test 3: an injected ?ownerId=/?user_id= search param is ignored entirely', async () => {
    await ClientsPage({
      // @ts-expect-error — deliberately probing extra/forged keys the type doesn't declare.
      searchParams: Promise.resolve({ ownerId: 'attacker-2', user_id: 'attacker-3', owner_id: 'attacker-4' }),
    });
    expect(listClientBookMock).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: 'owner-1' }),
    );
    const [call] = listClientBookMock.mock.calls[0] as unknown as [{ ownerId: string }];
    expect(call.ownerId).toBe('owner-1');
    expect(call.ownerId).not.toBe('attacker-2');
    expect(call.ownerId).not.toBe('attacker-3');
    expect(call.ownerId).not.toBe('attacker-4');
  });

  it('Test 4: an invalid ?sort= value falls back to undefined, never reaching the query as the raw value', async () => {
    await ClientsPage({ searchParams: Promise.resolve({ sort: 'pwned', dir: 'sideways' }) });
    expect(listClientBookMock).toHaveBeenCalledWith(
      expect.objectContaining({ sort: undefined, dir: undefined }),
    );
  });

  it('Test 5: renders PageHero title + "Nouveau client" CTA + SearchBar', async () => {
    const tree = await ClientsPage({ searchParams: Promise.resolve({}) });
    const html = renderToString(tree);
    expect(html).toContain('Clients');
    expect(html).toContain('Nouveau client');
    expect(html).toMatch(/type="search"/);
  });

  it('Test 6 (acceptance): page.tsx renders inside Shell without a maxWidth wrapper', async () => {
    // Static-analysis-style acceptance check duplicated here so a future edit
    // that reintroduces the PartnersPage-style wrapper fails a test, not just
    // a grep in CI.
    const path = await import('node:path');
    const fs = await import('node:fs/promises');
    const pageSource = await fs.readFile(
      path.join(process.cwd(), 'app/(authed)/clients/page.tsx'),
      'utf8',
    );
    expect(pageSource).not.toMatch(/maxWidth/);
    expect(pageSource).toContain("export const dynamic = 'force-dynamic'");
  });
});

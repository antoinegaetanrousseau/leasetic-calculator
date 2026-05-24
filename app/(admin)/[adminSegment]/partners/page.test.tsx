/**
 * Phase 18 Plan 03 Task 3 — partners page.tsx integration tests.
 *
 * The page is a server component that fans out:
 *   - requireAdmin()  (auth gate)
 *   - listPartnersWithLastActivity({status, q, cursor, limit:20})
 *
 * and renders:
 *   - PageHero (title + subtitle + Inviter CTA)
 *   - SearchBar
 *   - PartnersFilterPillTabs (with currentStatus derived from searchParams.status)
 *   - PartnersList (with rows + cursor + filter echo props)
 *
 * Coverage:
 *   1: PageHero renders with admin.partners.page.title + Inviter CTA.
 *   2: SearchBar renders.
 *   3: PartnersFilterPillTabs renders with currentStatus from searchParams.
 *   4: PartnersList receives rows from listPartnersWithLastActivity({…}).
 *   5: searchParams.status='invited' → Invités pill active + filter passed through.
 *
 * Mocks the auth + query layer (no DB), then renderToString the result.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/auth/require', () => ({
  requireAdmin: vi.fn(async () => ({ session: { user: { id: 'admin-1' } } })),
}));

vi.mock('@/lib/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/i18n')>();
  return {
    ...actual,
    getCurrentLang: vi.fn(async () => 'fr'),
  };
});

const { listPartnersMock } = vi.hoisted(() => ({
  listPartnersMock: vi.fn(async () => ({
    rows: [
      {
        id: 'p-1',
        email: 'alice@example.com',
        name: 'Alice Example',
        status: 'active' as const,
        createdAt: new Date('2026-04-01T12:00:00Z'),
        lastActivityAt: new Date('2026-05-15T10:00:00Z'),
      },
    ],
    nextCursor: null,
  })),
}));

vi.mock('@/lib/db/queries/partners', () => ({
  listPartnersWithLastActivity: listPartnersMock,
}));

import PartnersPage from './page';

beforeEach(() => {
  listPartnersMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('partners/page.tsx — Task 3 layout', () => {
  it('Test 1: renders PageHero with admin.partners.page.title + Inviter CTA → /<seg>/partners/new', async () => {
    const tree = await PartnersPage({
      params: Promise.resolve({ adminSegment: 'admin-secret' }),
      searchParams: Promise.resolve({}),
    });
    const html = renderToString(tree);
    expect(html).toContain('Partenaires'); // title key resolves
    expect(html).toContain('Inviter un partenaire');
    expect(html).toContain('href="/admin-secret/partners/new"');
  });

  it('Test 2: renders SearchBar (search input element present)', async () => {
    const tree = await PartnersPage({
      params: Promise.resolve({ adminSegment: 'admin-secret' }),
      searchParams: Promise.resolve({}),
    });
    const html = renderToString(tree);
    // SearchBar uses input[type=search].
    expect(html).toMatch(/type="search"/);
  });

  it('Test 3: renders PartnersFilterPillTabs (4 pill data-testids present)', async () => {
    const tree = await PartnersPage({
      params: Promise.resolve({ adminSegment: 'admin-secret' }),
      searchParams: Promise.resolve({}),
    });
    const html = renderToString(tree);
    for (const key of ['all', 'active', 'invited', 'inactive']) {
      expect(html).toContain(`data-testid="partner-filter-pill-${key}"`);
    }
  });

  it('Test 4: calls listPartnersWithLastActivity with the validated args', async () => {
    await PartnersPage({
      params: Promise.resolve({ adminSegment: 'admin-secret' }),
      searchParams: Promise.resolve({ status: 'invited', q: 'marie', cursor: 'abc' }),
    });
    expect(listPartnersMock).toHaveBeenCalledTimes(1);
    expect(listPartnersMock).toHaveBeenCalledWith({
      status: 'invited',
      q: 'marie',
      cursor: 'abc',
      limit: 20,
    });
  });

  it('Test 5: searchParams.status=invited → Invités pill active', async () => {
    const tree = await PartnersPage({
      params: Promise.resolve({ adminSegment: 'admin-secret' }),
      searchParams: Promise.resolve({ status: 'invited' }),
    });
    const html = renderToString(tree);
    // Active pill renders aria-selected="true" — find the invited pill row.
    const invitedMatch = html.match(
      /<a[^>]*data-testid="partner-filter-pill-invited"[^>]*aria-selected="true"/,
    );
    expect(invitedMatch).not.toBeNull();
  });

  it('Test 4 (cont.): invalid status drops to undefined (T-18-03-01 enum validation)', async () => {
    await PartnersPage({
      params: Promise.resolve({ adminSegment: 'admin-secret' }),
      searchParams: Promise.resolve({ status: 'pwned' }),
    });
    expect(listPartnersMock).toHaveBeenCalledWith({
      status: undefined,
      q: undefined,
      cursor: undefined,
      limit: 20,
    });
  });
});

/**
 * Phase 19 Plan 02 Task 2 — TDD RED: LC References admin page tests.
 *
 * Tests:
 *   Test 12: requireAdmin() is called first (AUTH-15)
 *   Test 13: searchParams are passed to listLcReferences (q + cursor plumbing)
 *   Test 14: export const dynamic === 'force-dynamic'
 */
import { describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const {
  requireAdminMock,
  getCurrentLangMock,
  listLcReferencesMock,
  pageHeroMock,
  lcReferencesListMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getCurrentLangMock: vi.fn(),
  listLcReferencesMock: vi.fn(),
  pageHeroMock: vi.fn(),
  lcReferencesListMock: vi.fn(),
}));

vi.mock('@/lib/auth/require', () => ({ requireAdmin: requireAdminMock }));
vi.mock('@/lib/i18n', async () => {
  const real = await vi.importActual<typeof import('@/lib/i18n/dictionaries')>(
    '@/lib/i18n/dictionaries',
  );
  return {
    t: real.t,
    dictionaries: real.dictionaries,
    getCurrentLang: getCurrentLangMock,
  };
});

vi.mock('@/lib/db/queries/lc-references', () => ({
  listLcReferences: listLcReferencesMock,
}));

vi.mock('@/components/ui/PageHero', () => ({
  PageHero: (props: { title: string; subtitle?: string }) => {
    pageHeroMock(props);
    return (
      <div data-testid="page-hero" data-title={props.title} data-subtitle={props.subtitle ?? ''} />
    );
  },
}));

vi.mock('./_components/LcReferencesList', () => ({
  LcReferencesList: (props: {
    rows: unknown[];
    nextCursor: string | null;
    lang: string;
    adminSegment: string;
    currentQ?: string;
  }) => {
    lcReferencesListMock(props);
    return (
      <div
        data-testid="lc-references-list"
        data-row-count={props.rows.length}
        data-next-cursor={props.nextCursor ?? ''}
        data-lang={props.lang}
        data-admin-segment={props.adminSegment}
        data-current-q={props.currentQ ?? ''}
      />
    );
  },
}));

// Import after mocks
import LcReferencesPage, { dynamic } from './page';

const SEG = 'control-panel';

async function renderPage(
  searchParams: Record<string, string> = {},
) {
  const element = await LcReferencesPage({
    params: Promise.resolve({ adminSegment: SEG }),
    searchParams: Promise.resolve(searchParams),
  });
  return render(element);
}

beforeEach(() => {
  requireAdminMock.mockReset();
  getCurrentLangMock.mockReset();
  listLcReferencesMock.mockReset();
  pageHeroMock.mockReset();
  lcReferencesListMock.mockReset();

  requireAdminMock.mockResolvedValue({ session: {} });
  getCurrentLangMock.mockResolvedValue('fr');
  listLcReferencesMock.mockResolvedValue({ rows: [], hasMore: false, nextCursor: null });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('LC References admin page', () => {
  it('Test 12: requireAdmin() is called first (AUTH-15 defense in depth)', async () => {
    await renderPage();
    expect(requireAdminMock).toHaveBeenCalledTimes(1);
    // requireAdmin must be called before listLcReferences
    const requireAdminCallOrder = requireAdminMock.mock.invocationCallOrder[0];
    const listCallOrder = listLcReferencesMock.mock.invocationCallOrder[0];
    expect(requireAdminCallOrder).toBeLessThan(listCallOrder);
  });

  it('Test 13: searchParams q + cursor are plumbed to listLcReferences', async () => {
    await renderPage({ q: 'acme', cursor: 'dGVzdA' });
    expect(listLcReferencesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        q: 'acme',
        cursorEncoded: 'dGVzdA',
      }),
    );
  });

  it('Test 13b: LcReferencesList receives rows + nextCursor + lang + adminSegment', async () => {
    const fakeRows = [
      {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        lcRef: 'LC-2026-001',
        partnerName: 'Acme',
        clientName: 'Client',
        amountHt: 1000,
        displayStatus: 'active' as const,
        createdAt: new Date(),
      },
    ];
    listLcReferencesMock.mockResolvedValue({
      rows: fakeRows,
      hasMore: false,
      nextCursor: null,
    });
    const { container } = await renderPage();
    const list = container.querySelector('[data-testid="lc-references-list"]');
    expect(list).not.toBeNull();
    expect(list?.getAttribute('data-row-count')).toBe('1');
    expect(list?.getAttribute('data-admin-segment')).toBe(SEG);
    expect(list?.getAttribute('data-lang')).toBe('fr');
  });

  it('Test 14: module exports dynamic === "force-dynamic"', () => {
    expect(dynamic).toBe('force-dynamic');
  });
});

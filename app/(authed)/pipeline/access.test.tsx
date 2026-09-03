/**
 * Phase 33 Plan 09 Task 2 — access boundary for `/pipeline` (D-10 / CRM-02 /
 * ROLE-02).
 *
 * Mirrors `app/(admin)/[adminSegment]/companies/review/access.test.tsx`, the
 * strongest access-boundary shape in this repo, INVERTED: that test guards a
 * `requireAdmin()` route and refuses non-admins; `/pipeline` is gated by
 * `requireRelationshipHolder()` and must refuse `admin` while admitting
 * `partner` and `sales` unchanged (no role branch anywhere in the page).
 *
 * Two properties this file proves that isolated unit coverage of
 * `requireRelationshipHolder()` cannot see on its own:
 *
 *   1. COMPOSITION — an admin refused by the gate must never reach the board
 *      data. `listPipelineBoard` and `getConversionRateForOwner` are
 *      asserted NEVER CALLED on the admin path (T-33-09-01); a
 *      fetch-then-hide implementation would pass every other assertion here
 *      and fail only this one.
 *   2. HALT SEMANTICS — `notFound` is mocked to really throw (carrying the
 *      404 fallback digest), not a no-op `vi.fn()`, so a refactor that calls
 *      `notFound()` down a path which then keeps executing would be caught,
 *      not just recorded as "was it called".
 *
 * `PipelineBoard`/`PipelineMobileList` are stubbed — their own drag/picker
 * behavior is covered by their dedicated test suites (33-07). This file is
 * scoped to the route's auth gate and its data-access boundary only.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { notFoundMock, roleRef } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new (class extends Error {
      digest = 'NEXT_HTTP_ERROR_FALLBACK;404';
    })('NEXT_NOT_FOUND');
  }),
  roleRef: { current: 'admin' as string },
}));

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

/**
 * Stands in for the real `requireRelationshipHolder()` control flow:
 * `if (role === 'admin') notFound();` — and because `notFound` throws here,
 * the refusal genuinely halts, matching production behavior.
 */
const { requireRelationshipHolderMock } = vi.hoisted(() => ({
  requireRelationshipHolderMock: vi.fn(),
}));

vi.mock('@/lib/auth/require', () => ({
  requireRelationshipHolder: requireRelationshipHolderMock,
}));

vi.mock('@/lib/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/i18n')>();
  return { ...actual, getCurrentLang: vi.fn(async () => 'fr') };
});

const { listPipelineBoardMock, getConversionRateForOwnerMock } = vi.hoisted(() => ({
  listPipelineBoardMock: vi.fn(async () => ({
    prospect: [
      {
        relationshipId: 'rel-1',
        companyId: 'co-1',
        companyName: 'Dupont Menuiserie',
        siren: '123456789',
        stage: 'prospect',
        contactsCount: 1,
        proposalsCount: 2,
      },
    ],
    qualifie: [],
    proposition_envoyee: [],
    negociation: [],
    perdu: [],
    signe: [],
    debloque: [],
  })),
  getConversionRateForOwnerMock: vi.fn(async () => ({ won: 1, total: 3, pct: 33 })),
}));

vi.mock('@/lib/db/queries', () => ({
  listPipelineBoard: listPipelineBoardMock,
  getConversionRateForOwner: getConversionRateForOwnerMock,
}));

vi.mock('./PipelineBoard', () => ({
  PipelineBoard: () => <div data-testid="pipeline-board-stub" />,
}));

vi.mock('./PipelineMobileList', () => ({
  PipelineMobileList: () => <div data-testid="pipeline-mobile-list-stub" />,
}));

import PipelinePage from './page';

const callPage = () => PipelinePage();

const SESSION_BY_ROLE: Record<string, { id: string }> = {
  admin: { id: 'admin-1' },
  partner: { id: 'partner-1' },
  sales: { id: 'sales-1' },
};

beforeEach(() => {
  notFoundMock.mockClear();
  listPipelineBoardMock.mockClear();
  getConversionRateForOwnerMock.mockClear();
  requireRelationshipHolderMock.mockReset();
  // Re-establish the real requireRelationshipHolder control flow for each test.
  requireRelationshipHolderMock.mockImplementation(async () => {
    const { notFound } = await import('next/navigation');
    if (roleRef.current === 'admin') {
      notFound();
    }
    return {
      session: { user: SESSION_BY_ROLE[roleRef.current] },
      role: roleRef.current,
    };
  });
});

afterEach(() => {
  roleRef.current = 'admin';
});

describe('pipeline access boundary (D-10 / CRM-02 / ROLE-02)', () => {
  it('refuses role "admin" — 404, and never reaches the board data', async () => {
    roleRef.current = 'admin';

    await expect(callPage()).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    });

    expect(notFoundMock).toHaveBeenCalled();
    // THE security assertion — a fetch-then-hide implementation would pass
    // every other assertion in this file and fail only this one.
    expect(listPipelineBoardMock).not.toHaveBeenCalled();
    expect(getConversionRateForOwnerMock).not.toHaveBeenCalled();
  });

  it('the admin refusal HALTS — notFound throwing must abort, not merely be recorded', async () => {
    roleRef.current = 'admin';
    let threw = false;
    try {
      await callPage();
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    expect(listPipelineBoardMock).not.toHaveBeenCalled();
  });

  it('is not a 403 — refusal carries the 404 fallback, so the route cannot be probed for existence', async () => {
    roleRef.current = 'admin';
    const err = await callPage().catch((e: unknown) => e);
    expect(err).toMatchObject({ digest: 'NEXT_HTTP_ERROR_FALLBACK;404' });
    expect(String((err as Error).message)).not.toMatch(/403|forbidden/i);
  });

  it('admits role "partner" — the board query runs, scoped to the caller\'s own session id, no second "all owners" argument', async () => {
    roleRef.current = 'partner';

    await expect(callPage()).resolves.toBeTruthy();

    expect(notFoundMock).not.toHaveBeenCalled();
    expect(listPipelineBoardMock).toHaveBeenCalledTimes(1);
    expect(listPipelineBoardMock).toHaveBeenCalledWith({ ownerId: 'partner-1' });
    expect(getConversionRateForOwnerMock).toHaveBeenCalledTimes(1);
    expect(getConversionRateForOwnerMock).toHaveBeenCalledWith('partner-1');
  });

  it('admits role "sales" — identical surface, own session id, no role branch anywhere in the page (ROLE-02)', async () => {
    roleRef.current = 'sales';

    await expect(callPage()).resolves.toBeTruthy();

    expect(notFoundMock).not.toHaveBeenCalled();
    expect(listPipelineBoardMock).toHaveBeenCalledTimes(1);
    expect(listPipelineBoardMock).toHaveBeenCalledWith({ ownerId: 'sales-1' });
    expect(getConversionRateForOwnerMock).toHaveBeenCalledTimes(1);
    expect(getConversionRateForOwnerMock).toHaveBeenCalledWith('sales-1');
  });

  it('the board query argument equals the session id exactly — never a searchParam/header-supplied value', async () => {
    roleRef.current = 'partner';
    await callPage();

    const [args] = listPipelineBoardMock.mock.calls[0] as [{ ownerId: string }];
    expect(args.ownerId).toBe(SESSION_BY_ROLE.partner.id);
    expect(args.ownerId).not.toBe('admin-1');
    expect(args.ownerId).not.toBe('sales-1');
  });
});

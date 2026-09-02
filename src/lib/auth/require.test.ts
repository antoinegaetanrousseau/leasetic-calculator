/**
 * Plan 30-03 Task 1 — require.ts tests (RED → GREEN).
 *
 * Covers the three-role Role union ('partner' | 'admin' | 'sales'), the
 * fail-closed allowlist resolution in requireUser(), requireAdmin()'s refusal
 * of 'sales' (same as 'partner'), and the new requireRelationshipHolder()
 * gate that admits 'partner' and 'sales' but refuses 'admin'.
 *
 * Mocking pattern: server-only stubbed to a no-op module; next/headers and
 * next/navigation mocked so redirect()/notFound() are observed rather than
 * thrown; @/lib/db follows the stub-builder pattern established in
 * src/lib/db/queries/partners.test.ts, adapted for `db().query.users.findFirst`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { headersMock, redirectMock, notFoundMock, getSessionMock, findFirstMock } = vi.hoisted(
  () => ({
    headersMock: vi.fn(),
    redirectMock: vi.fn(),
    notFoundMock: vi.fn(),
    getSessionMock: vi.fn(),
    findFirstMock: vi.fn(),
  }),
);

vi.mock('next/headers', () => ({
  headers: headersMock,
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
  notFound: notFoundMock,
}));

vi.mock('./index', () => ({
  auth: () => ({
    api: {
      getSession: getSessionMock,
    },
  }),
}));

vi.mock('@/lib/db', async () => {
  const real = await vi.importActual<typeof import('@/db/schema')>('@/db/schema');
  return {
    db: () => ({
      query: {
        users: {
          findFirst: findFirstMock,
        },
      },
    }),
    schema: real,
    DbError: class extends Error {},
    DbAuthError: class extends Error {},
    __resetDbForTests: () => {
      /* noop */
    },
  };
});

import { requireAdmin, requireRelationshipHolder, requireUser } from './require';

const SESSION = { user: { id: 'user-1', email: 'a@example.com' } };

beforeEach(() => {
  headersMock.mockReset().mockResolvedValue(new Headers());
  redirectMock.mockReset();
  notFoundMock.mockReset();
  getSessionMock.mockReset();
  findFirstMock.mockReset();

  getSessionMock.mockResolvedValue(SESSION);
  findFirstMock.mockResolvedValue({
    sessionVersion: 1,
    deletedAt: null,
    role: 'partner',
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('requireUser() — three-role resolution (ROLE-01/02)', () => {
  it('returns role "sales" when the DB row holds "sales"', async () => {
    findFirstMock.mockResolvedValue({ sessionVersion: 1, deletedAt: null, role: 'sales' });
    const { role } = await requireUser();
    expect(role).toBe('sales');
  });

  it('fails closed to "partner" on an unrecognised DB role value', async () => {
    findFirstMock.mockResolvedValue({
      sessionVersion: 1,
      deletedAt: null,
      role: 'some-future-role',
    });
    const { role } = await requireUser();
    expect(role).toBe('partner');
  });

  it('still redirects to /login when there is no session', async () => {
    getSessionMock.mockResolvedValue(null);
    // The mocked redirect() does not interrupt control flow the way the real
    // next/navigation redirect() does (which throws internally) — swallow the
    // resulting downstream error from continuing past a null session and
    // assert only that the redirect call itself happened.
    await requireUser().catch(() => {
      /* expected — mocked redirect() does not halt execution */
    });
    expect(redirectMock).toHaveBeenCalledWith('/login');
  });

  it('still redirects to the sign-out route when deletedAt is set', async () => {
    findFirstMock.mockResolvedValue({ sessionVersion: 1, deletedAt: new Date(), role: 'partner' });
    await requireUser();
    expect(redirectMock).toHaveBeenCalledWith('/api/auth/sign-out?redirect=/login');
  });

  it('still redirects to the sign-out route when the DB user row is missing', async () => {
    findFirstMock.mockResolvedValue(undefined);
    // As above — the mocked redirect() doesn't halt execution, so swallow the
    // downstream error from continuing past an undefined user row.
    await requireUser().catch(() => {
      /* expected — mocked redirect() does not halt execution */
    });
    expect(redirectMock).toHaveBeenCalledWith('/api/auth/sign-out?redirect=/login');
  });

  it('returns { session, role: "partner" } for an active partner (pre-existing coverage)', async () => {
    findFirstMock.mockResolvedValue({ sessionVersion: 1, deletedAt: null, role: 'partner' });
    const r = await requireUser();
    expect(r.role).toBe('partner');
    expect(r.session).toEqual(SESSION);
  });

  it('returns { session, role: "admin" } for an active admin (pre-existing coverage)', async () => {
    findFirstMock.mockResolvedValue({ sessionVersion: 1, deletedAt: null, role: 'admin' });
    const r = await requireUser();
    expect(r.role).toBe('admin');
  });
});

describe('requireAdmin() — refuses "sales" exactly as it refuses "partner"', () => {
  it('calls notFound() for a "sales" role', async () => {
    findFirstMock.mockResolvedValue({ sessionVersion: 1, deletedAt: null, role: 'sales' });
    await requireAdmin();
    expect(notFoundMock).toHaveBeenCalled();
  });

  it('does not call notFound() for an "admin" role', async () => {
    findFirstMock.mockResolvedValue({ sessionVersion: 1, deletedAt: null, role: 'admin' });
    await requireAdmin();
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it('returns session for an admin role (pre-existing coverage)', async () => {
    findFirstMock.mockResolvedValue({ sessionVersion: 1, deletedAt: null, role: 'admin' });
    const r = await requireAdmin();
    expect(r.session.user.id).toBe(SESSION.user.id);
  });

  it('calls notFound() for a "partner" role (pre-existing coverage)', async () => {
    findFirstMock.mockResolvedValue({ sessionVersion: 1, deletedAt: null, role: 'partner' });
    await requireAdmin();
    expect(notFoundMock).toHaveBeenCalled();
  });

  it('calls notFound() defensively for an unknown role string (pre-existing coverage — fails closed to partner, still refused)', async () => {
    findFirstMock.mockResolvedValue({ sessionVersion: 1, deletedAt: null, role: 'guest' });
    await requireAdmin();
    expect(notFoundMock).toHaveBeenCalled();
  });
});

describe('requireRelationshipHolder() — /clients tree gate', () => {
  it('returns { session, role } for "partner"', async () => {
    findFirstMock.mockResolvedValue({ sessionVersion: 1, deletedAt: null, role: 'partner' });
    const result = await requireRelationshipHolder();
    expect(result.role).toBe('partner');
    expect(result.session).toEqual(SESSION);
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it('returns { session, role } for "sales"', async () => {
    findFirstMock.mockResolvedValue({ sessionVersion: 1, deletedAt: null, role: 'sales' });
    const result = await requireRelationshipHolder();
    expect(result.role).toBe('sales');
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it('calls notFound() for "admin"', async () => {
    findFirstMock.mockResolvedValue({ sessionVersion: 1, deletedAt: null, role: 'admin' });
    await requireRelationshipHolder();
    expect(notFoundMock).toHaveBeenCalled();
  });
});

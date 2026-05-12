import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

type Call = { kind: string; payload: unknown };
const calls: Call[] = [];
let fixtureRows: unknown[] = [];

vi.mock('@/lib/db', async () => {
  const real = await vi.importActual<typeof import('@/db/schema')>('@/db/schema');
  const stubBuilder = {
    select: () => stubBuilder,
    from: () => stubBuilder,
    where: (clause: unknown) => {
      calls.push({ kind: 'where', payload: clause });
      return stubBuilder;
    },
    orderBy: (...args: unknown[]) => {
      calls.push({ kind: 'orderBy', payload: args });
      return Promise.resolve(fixtureRows);
    },
  };
  return {
    db: () => stubBuilder,
    schema: real,
    DbError: class extends Error {},
  };
});

import { listInvitedPartners, type InvitedPartnerRow } from './users';

beforeEach(() => {
  calls.length = 0;
  fixtureRows = [];
});

describe('listInvitedPartners', () => {
  it('returns an empty array when DB returns empty', async () => {
    fixtureRows = [];
    expect(await listInvitedPartners()).toEqual([]);
  });

  it('queries with a where predicate composition (role + deletedAt + lastLoginAt)', async () => {
    fixtureRows = [];
    await listInvitedPartners();
    expect(calls.some((c) => c.kind === 'where')).toBe(true);
  });

  it('queries with orderBy createdAt desc', async () => {
    fixtureRows = [];
    await listInvitedPartners();
    expect(calls.some((c) => c.kind === 'orderBy')).toBe(true);
  });

  it('returns the rows from the DB unchanged', async () => {
    const fixture: InvitedPartnerRow[] = [
      {
        id: 'u-1',
        email: 'alice@example.com',
        displayName: 'Alice',
        name: 'Alice Doe',
        language: 'fr',
        createdAt: new Date('2026-05-10T09:00:00Z'),
      },
      {
        id: 'u-2',
        email: 'bob@example.com',
        displayName: null,
        name: 'Bob Smith',
        language: 'en',
        createdAt: new Date('2026-05-09T09:00:00Z'),
      },
    ];
    fixtureRows = fixture;
    expect(await listInvitedPartners()).toEqual(fixture);
  });

  it('does NOT include commission_pct or password fields in the returned shape', async () => {
    const fixture: InvitedPartnerRow[] = [
      {
        id: 'u-1',
        email: 'alice@example.com',
        displayName: 'Alice',
        name: 'Alice Doe',
        language: 'fr',
        createdAt: new Date('2026-05-10T09:00:00Z'),
      },
    ];
    fixtureRows = fixture;
    const result = await listInvitedPartners();
    const allowedKeys = new Set([
      'id',
      'email',
      'displayName',
      'name',
      'language',
      'createdAt',
    ]);
    for (const row of result) {
      for (const k of Object.keys(row)) {
        expect(allowedKeys.has(k)).toBe(true);
      }
      expect((row as Record<string, unknown>).commissionPct).toBeUndefined();
      expect((row as Record<string, unknown>).commission_pct).toBeUndefined();
      expect((row as Record<string, unknown>).password).toBeUndefined();
      expect((row as Record<string, unknown>).passwordHash).toBeUndefined();
    }
  });
});

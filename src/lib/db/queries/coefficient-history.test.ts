import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

type Call = { kind: string; payload: unknown };
const calls: Call[] = [];
let fixtureRows: unknown[] = [];
let returningRow: unknown = null;

vi.mock('@/lib/db', async () => {
  const real = await vi.importActual<typeof import('@/db/schema')>('@/db/schema');
  const stubBuilder = {
    select: () => stubBuilder,
    from: () => stubBuilder,
    leftJoin: (...args: unknown[]) => {
      calls.push({ kind: 'leftJoin', payload: args });
      return stubBuilder;
    },
    where: (clause: unknown) => {
      calls.push({ kind: 'where', payload: clause });
      return stubBuilder;
    },
    orderBy: (...args: unknown[]) => {
      calls.push({ kind: 'orderBy', payload: args });
      return stubBuilder;
    },
    limit: (n: number) => {
      calls.push({ kind: 'limit', payload: n });
      return Promise.resolve(fixtureRows);
    },
    insert: () => stubBuilder,
    values: (args: unknown) => {
      calls.push({ kind: 'insert.values', payload: args });
      return stubBuilder;
    },
    returning: () => Promise.resolve(returningRow ? [returningRow] : []),
  };
  return {
    db: () => stubBuilder,
    schema: real,
    DbError: class extends Error {},
  };
});

import {
  createCoefficientHistoryEntry,
  listCoefficientHistory,
  encodeCoefficientHistoryCursor,
  decodeCoefficientHistoryCursor,
  type CoefficientHistoryCursor,
} from './coefficient-history';
import type { GlobalParamsSnapshot } from '@/lib/admin/coefficient-diff';

const baseSnapshot: GlobalParamsSnapshot = {
  commissionPct: '5.0000',
  maxAmount: '500000.00',
  validityDays: 30,
  coefficients: {
    t1: { '36': '3.0000', '48': '2.3000', '60': '1.8765' },
    t2: { '36': '2.9000', '48': '2.2500', '60': '1.8500' },
    t3: { '36': '2.8000', '48': '2.2000', '60': '1.8000' },
    t4: { '36': '2.7000', '48': '2.1500', '60': '1.7500' },
  },
};

function lastInsertPayload(): Record<string, unknown> | null {
  const c = calls.find((x) => x.kind === 'insert.values');
  return c ? (c.payload as Record<string, unknown>) : null;
}

beforeEach(() => {
  calls.length = 0;
  fixtureRows = [];
  returningRow = {
    id: 'mock-id',
    changedAt: new Date('2026-05-12T10:00:00Z'),
    changedByUserId: 'u-1',
    beforeJson: null,
    afterJson: baseSnapshot,
    summary: 'mock',
  };
});

describe('createCoefficientHistoryEntry — summary fallback (D-16)', () => {
  it('uses provided summary verbatim when non-empty', async () => {
    await createCoefficientHistoryEntry({
      before: baseSnapshot,
      after: { ...baseSnapshot, commissionPct: '5.5000' },
      userId: 'u-1',
      summary: 'Manual admin label',
    });
    const payload = lastInsertPayload();
    expect(payload?.summary).toBe('Manual admin label');
  });

  it('uses generateDiffSummary fallback when summary is undefined', async () => {
    await createCoefficientHistoryEntry({
      before: baseSnapshot,
      after: { ...baseSnapshot, commissionPct: '5.5000' },
      userId: 'u-1',
    });
    const payload = lastInsertPayload();
    expect(payload?.summary).toBe('Commission: 5.0000% → 5.5000%');
  });

  it('uses generateDiffSummary fallback when summary is empty string', async () => {
    await createCoefficientHistoryEntry({
      before: baseSnapshot,
      after: { ...baseSnapshot, commissionPct: '5.5000' },
      userId: 'u-1',
      summary: '',
    });
    expect(lastInsertPayload()?.summary).toBe('Commission: 5.0000% → 5.5000%');
  });

  it('uses generateDiffSummary fallback when summary is whitespace-only', async () => {
    await createCoefficientHistoryEntry({
      before: baseSnapshot,
      after: { ...baseSnapshot, commissionPct: '5.5000' },
      userId: 'u-1',
      summary: '   ',
    });
    expect(lastInsertPayload()?.summary).toBe('Commission: 5.0000% → 5.5000%');
  });

  it('passes "Configuration initiale" when before is null', async () => {
    await createCoefficientHistoryEntry({
      before: null,
      after: baseSnapshot,
      userId: null,
    });
    expect(lastInsertPayload()?.summary).toBe('Configuration initiale');
  });

  it('persists before/after as jsonb in beforeJson/afterJson', async () => {
    await createCoefficientHistoryEntry({
      before: baseSnapshot,
      after: { ...baseSnapshot, commissionPct: '5.5000' },
      userId: 'u-1',
    });
    const payload = lastInsertPayload();
    expect(payload?.beforeJson).toEqual(baseSnapshot);
    expect((payload?.afterJson as GlobalParamsSnapshot).commissionPct).toBe('5.5000');
  });

  it('records the userId in changedByUserId', async () => {
    await createCoefficientHistoryEntry({
      before: baseSnapshot,
      after: { ...baseSnapshot, commissionPct: '5.5000' },
      userId: 'u-abc',
    });
    expect(lastInsertPayload()?.changedByUserId).toBe('u-abc');
  });

  it('accepts userId=null for system-initiated entries (backfill seed row)', async () => {
    await createCoefficientHistoryEntry({
      before: null,
      after: baseSnapshot,
      userId: null,
    });
    expect(lastInsertPayload()?.changedByUserId).toBeNull();
  });
});

describe('listCoefficientHistory — cursor pagination', () => {
  it('queries with limit = (caller limit) + 1 to compute hasMore (default 20 → 21)', async () => {
    await listCoefficientHistory();
    const limitCall = calls.find((c) => c.kind === 'limit');
    expect(limitCall?.payload).toBe(21);
  });

  it('respects an explicit caller-supplied limit (5 → 6 fetch)', async () => {
    await listCoefficientHistory({ limit: 5 });
    const limitCall = calls.find((c) => c.kind === 'limit');
    expect(limitCall?.payload).toBe(6);
  });

  it('calls orderBy (descending)', async () => {
    await listCoefficientHistory();
    expect(calls.some((c) => c.kind === 'orderBy')).toBe(true);
  });

  it('calls leftJoin to surface createdByDisplay from users table', async () => {
    await listCoefficientHistory();
    expect(calls.some((c) => c.kind === 'leftJoin')).toBe(true);
  });

  it('applies cursor predicate when cursor provided', async () => {
    await listCoefficientHistory({
      cursor: {
        changedAt: '2026-05-12T10:00:00.000Z',
        id: '11111111-2222-3333-4444-555555555555',
      },
    });
    expect(calls.some((c) => c.kind === 'where')).toBe(true);
  });

  it('returns { rows: [], hasMore: false, nextCursor: null } when db returns empty', async () => {
    fixtureRows = [];
    const result = await listCoefficientHistory();
    expect(result).toEqual({ rows: [], hasMore: false, nextCursor: null });
  });
});

describe('encode/decodeCoefficientHistoryCursor', () => {
  it('round-trips a cursor', () => {
    const cursor: CoefficientHistoryCursor = {
      changedAt: '2026-05-12T10:00:00.000Z',
      id: '11111111-2222-3333-4444-555555555555',
    };
    const encoded = encodeCoefficientHistoryCursor(cursor);
    expect(decodeCoefficientHistoryCursor(encoded)).toEqual(cursor);
  });

  it('returns null for malformed encoded input', () => {
    expect(decodeCoefficientHistoryCursor('garbage-not-base64')).toBeNull();
  });

  it('returns null for partial cursor (missing id)', () => {
    const partial = Buffer.from(
      JSON.stringify({ changedAt: '2026-05-12T10:00:00.000Z' }),
      'utf8',
    ).toString('base64url');
    expect(decodeCoefficientHistoryCursor(partial)).toBeNull();
  });

  it('returns null when changedAt fails ISO-date regex', () => {
    const bad = Buffer.from(
      JSON.stringify({
        changedAt: 'not-a-date',
        id: '11111111-2222-3333-4444-555555555555',
      }),
      'utf8',
    ).toString('base64url');
    expect(decodeCoefficientHistoryCursor(bad)).toBeNull();
  });

  it('returns null when id fails UUID regex', () => {
    const bad = Buffer.from(
      JSON.stringify({
        changedAt: '2026-05-12T10:00:00.000Z',
        id: 'not-a-uuid',
      }),
      'utf8',
    ).toString('base64url');
    expect(decodeCoefficientHistoryCursor(bad)).toBeNull();
  });
});

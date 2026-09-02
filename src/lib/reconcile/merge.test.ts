/**
 * Phase 31 Plan 03 — merge.ts tests (D-12, IMPORT-05).
 *
 * Mocking pattern mirrors src/lib/crm/actions.test.ts's queue-based stub
 * builder (`resultQueue`, shifted in the exact statement order the code
 * under test issues), extended with a `then()` fallback on the select
 * builder (client-relationships.test.ts's awaitable-at-any-chain-point
 * pattern) since this module's SELECTs terminate at different methods
 * (`.limit()` for the pre-claim read, `.where()` for the relationship and
 * count reads).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

interface MockCall {
  kind: string;
  payload?: unknown;
}

const { mockState } = vi.hoisted(() => ({
  mockState: {
    resultQueue: [] as unknown[],
    calls: [] as MockCall[],
  },
}));

function nextResult(): unknown {
  if (mockState.resultQueue.length === 0) {
    throw new Error('mock db: resultQueue exhausted — test queued too few results');
  }
  return mockState.resultQueue.shift();
}

const { transactionMock } = vi.hoisted(() => ({ transactionMock: vi.fn() }));

vi.mock('@/lib/db', async () => {
  const real = await vi.importActual<typeof import('@/db/schema')>('@/db/schema');

  function makeSelectBuilder(): Record<string, unknown> {
    const builder: Record<string, unknown> = {};
    Object.assign(builder, {
      from: (table: unknown) => {
        mockState.calls.push({ kind: 'from', payload: table });
        return builder;
      },
      where: (clause: unknown) => {
        mockState.calls.push({ kind: 'where', payload: clause });
        return builder;
      },
      limit: (n: unknown) => {
        mockState.calls.push({ kind: 'limit', payload: n });
        return Promise.resolve(nextResult());
      },
      then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
        Promise.resolve(nextResult()).then(resolve, reject),
    });
    return builder;
  }

  function makeUpdateBuilder(table: unknown): Record<string, unknown> {
    mockState.calls.push({ kind: 'update', payload: table });
    const builder: Record<string, unknown> = {};
    Object.assign(builder, {
      set: (v: unknown) => {
        mockState.calls.push({ kind: 'set', payload: v });
        return builder;
      },
      where: (clause: unknown) => {
        mockState.calls.push({ kind: 'where', payload: clause });
        return builder;
      },
      returning: () => {
        mockState.calls.push({ kind: 'returning' });
        return Promise.resolve(nextResult());
      },
      then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
        Promise.resolve(nextResult()).then(resolve, reject),
    });
    return builder;
  }

  function makeDeleteBuilder(table: unknown): Record<string, unknown> {
    mockState.calls.push({ kind: 'delete', payload: table });
    const builder: Record<string, unknown> = {};
    Object.assign(builder, {
      where: (clause: unknown) => {
        mockState.calls.push({ kind: 'where', payload: clause });
        return builder;
      },
      then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
        Promise.resolve(nextResult()).then(resolve, reject),
    });
    return builder;
  }

  const dbInstance = {
    select: (cols: unknown) => {
      mockState.calls.push({ kind: 'select', payload: cols });
      return makeSelectBuilder();
    },
    update: (table: unknown) => makeUpdateBuilder(table),
    delete: (table: unknown) => makeDeleteBuilder(table),
    transaction: transactionMock,
  };

  return {
    db: () => dbInstance,
    schema: real,
    DbError: class extends Error {},
    DbAuthError: class extends Error {},
    __resetDbForTests: () => { /* noop */ },
  };
});

const { writeAuditLogMock } = vi.hoisted(() => ({ writeAuditLogMock: vi.fn() }));
vi.mock('@/lib/db/queries', () => ({
  writeAuditLog: writeAuditLogMock,
}));

import { mergeCompanyPair, recordKeepSeparate } from './merge';

const PAIR_ID = 'pair-1';
const SURVIVOR_ID = 'company-survivor';
const LOSER_ID = 'company-loser';
const ACTOR_ID = 'admin-1';

function pendingPairRow(overrides: Partial<{
  verdict: string | null;
  survivorCompanyId: string | null;
  companyAId: string | null;
  companyBId: string | null;
}> = {}) {
  return {
    verdict: null,
    survivorCompanyId: null,
    companyAId: SURVIVOR_ID,
    companyBId: LOSER_ID,
    ...overrides,
  };
}

/** Queues the full happy-path result sequence for one complete, non-compound merge. */
function queueHappyPathMerge() {
  mockState.resultQueue = [
    [pendingPairRow()], // pre-claim SELECT
    [{ id: PAIR_ID }], // claim UPDATE .returning()
    [], // survivorRels
    [], // loserRels
    undefined, // step 3 relationship repoint (.where() terminal)
    undefined, // step 4a pair-decision repoint (company_a_id)
    undefined, // step 4b pair-decision repoint (company_b_id)
    [{ count: 0 }], // step 5 confirmation count
    undefined, // step 6 delete companies
  ];
}

beforeEach(() => {
  mockState.resultQueue = [];
  mockState.calls = [];
  transactionMock.mockReset();
  writeAuditLogMock.mockReset();
  writeAuditLogMock.mockResolvedValue({ id: 'audit-1' });
});

afterEach(() => vi.clearAllMocks());

describe('mergeCompanyPair — happy path', () => {
  it('repoints relationships/contacts/proposals and deletes the loser company', async () => {
    queueHappyPathMerge();
    const result = await mergeCompanyPair({ pairId: PAIR_ID, survivorCompanyId: SURVIVOR_ID, actorId: ACTOR_ID });
    expect(result).toEqual({
      ok: true,
      survivorCompanyId: SURVIVOR_ID,
      deletedCompanyId: LOSER_ID,
      mergedRelationshipIds: [],
    });
    const deleteCalls = mockState.calls.filter((c) => c.kind === 'delete');
    expect(deleteCalls.length).toBeGreaterThan(0);
  });

  it('writes a company.merge audit row with ids only', async () => {
    queueHappyPathMerge();
    await mergeCompanyPair({ pairId: PAIR_ID, survivorCompanyId: SURVIVOR_ID, actorId: ACTOR_ID });
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'company.merge',
        targetType: 'company',
        targetId: SURVIVOR_ID,
        payload: { pairId: PAIR_ID, deletedCompanyId: LOSER_ID },
      }),
    );
  });

  it('never calls db().transaction', async () => {
    queueHappyPathMerge();
    await mergeCompanyPair({ pairId: PAIR_ID, survivorCompanyId: SURVIVOR_ID, actorId: ACTOR_ID });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('records every repoint statement before the companies delete statement', async () => {
    queueHappyPathMerge();
    await mergeCompanyPair({ pairId: PAIR_ID, survivorCompanyId: SURVIVOR_ID, actorId: ACTOR_ID });
    const updateIndexes = mockState.calls
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.kind === 'update')
      .map(({ i }) => i);
    const deleteIndexes = mockState.calls
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.kind === 'delete')
      .map(({ i }) => i);
    expect(updateIndexes.length).toBeGreaterThan(0);
    expect(deleteIndexes.length).toBeGreaterThan(0);
    const lastUpdateIndex = Math.max(...updateIndexes);
    const lastDeleteIndex = Math.max(...deleteIndexes);
    expect(lastDeleteIndex).toBeGreaterThan(lastUpdateIndex);
  });
});

describe('mergeCompanyPair — the proposals repoint set-object touches only clientRelationshipId', () => {
  it('the recorded proposals update payload has exactly the keys [clientRelationshipId]', async () => {
    mockState.resultQueue = [
      [pendingPairRow()], // pre-claim SELECT
      [{ id: PAIR_ID }], // claim UPDATE .returning()
      [{ id: 'rel-survivor', ownerId: 'owner-1' }], // survivorRels
      [{ id: 'rel-loser', ownerId: 'owner-1' }], // loserRels — SAME owner, compound case
      undefined, // contacts repoint
      undefined, // proposals repoint
      undefined, // delete loser relationship
      undefined, // step 3 relationship repoint
      undefined, // step 4a
      undefined, // step 4b
      [{ count: 0 }], // step 5 confirm
      undefined, // step 6 delete companies
    ];
    await mergeCompanyPair({ pairId: PAIR_ID, survivorCompanyId: SURVIVOR_ID, actorId: ACTOR_ID });

    const updateCalls = mockState.calls;
    const setCalls = updateCalls.filter((c) => c.kind === 'set');
    // The proposals update is the SECOND `set` call in the compound branch
    // (contacts first, then proposals) — assert by exact key shape instead
    // of positional index, so the test stays robust to comment/order noise.
    const proposalsSetCall = setCalls.find((c) => {
      const keys = Object.keys(c.payload as Record<string, unknown>);
      return keys.length === 1 && keys[0] === 'clientRelationshipId';
    });
    expect(proposalsSetCall).toBeDefined();
    expect(Object.keys(proposalsSetCall!.payload as Record<string, unknown>)).toEqual(['clientRelationshipId']);
  });
});

describe('mergeCompanyPair — compound case (one owner holds both sides)', () => {
  it('moves contacts/proposals onto the survivor relationship and deletes the loser relationship', async () => {
    mockState.resultQueue = [
      [pendingPairRow()],
      [{ id: PAIR_ID }],
      [{ id: 'rel-survivor', ownerId: 'owner-1' }],
      [{ id: 'rel-loser', ownerId: 'owner-1' }],
      undefined, // contacts repoint
      undefined, // proposals repoint
      undefined, // delete loser relationship
      undefined, // step 3
      undefined, // step 4a
      undefined, // step 4b
      [{ count: 0 }],
      undefined,
    ];
    const result = await mergeCompanyPair({ pairId: PAIR_ID, survivorCompanyId: SURVIVOR_ID, actorId: ACTOR_ID });
    expect(result).toMatchObject({ ok: true, mergedRelationshipIds: ['rel-loser'] });
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'client_relationship.merge',
        targetType: 'client_relationship',
        targetId: 'rel-survivor',
        payload: { deletedRelationshipId: 'rel-loser', ownerId: 'owner-1' },
      }),
    );
  });

  it('does not collide relationships for owners who hold only one side', async () => {
    mockState.resultQueue = [
      [pendingPairRow()],
      [{ id: PAIR_ID }],
      [{ id: 'rel-survivor', ownerId: 'owner-A' }], // survivorRels
      [{ id: 'rel-loser', ownerId: 'owner-B' }], // loserRels — DIFFERENT owner, no collision
      undefined, // step 3
      undefined, // step 4a
      undefined, // step 4b
      [{ count: 0 }],
      undefined,
    ];
    const result = await mergeCompanyPair({ pairId: PAIR_ID, survivorCompanyId: SURVIVOR_ID, actorId: ACTOR_ID });
    expect(result).toMatchObject({ ok: true, mergedRelationshipIds: [] });
  });
});

describe('mergeCompanyPair — TOCTOU / concurrent-admin race (T-31-03-05)', () => {
  it('returns already_resolved and performs no further writes when the claim affects zero rows', async () => {
    mockState.resultQueue = [
      [pendingPairRow()], // pre-claim SELECT sees it pending
      [], // claim UPDATE .returning() — another admin won the race
    ];
    const result = await mergeCompanyPair({ pairId: PAIR_ID, survivorCompanyId: SURVIVOR_ID, actorId: ACTOR_ID });
    expect(result).toEqual({ ok: false, reason: 'already_resolved' });
    const deleteCalls = mockState.calls.filter((c) => c.kind === 'delete');
    expect(deleteCalls.length).toBe(0);
  });

  it('a second identical call after a completed merge returns already_resolved and issues no destructive statement', async () => {
    // First call: full happy-path completion.
    queueHappyPathMerge();
    const first = await mergeCompanyPair({ pairId: PAIR_ID, survivorCompanyId: SURVIVOR_ID, actorId: ACTOR_ID });
    expect(first.ok).toBe(true);

    // Second call: the pair now shows verdict='merged', survivor matches,
    // but the loser side is NULL (the ON DELETE SET NULL FK fired when the
    // first call's step 6 deleted the loser company) — the resultQueue has
    // exactly ONE more entry, so if the code attempted anything beyond the
    // pre-claim SELECT, the mock would throw "resultQueue exhausted".
    mockState.calls = [];
    mockState.resultQueue = [
      [pendingPairRow({ verdict: 'merged', survivorCompanyId: SURVIVOR_ID, companyAId: SURVIVOR_ID, companyBId: null })],
    ];
    const second = await mergeCompanyPair({ pairId: PAIR_ID, survivorCompanyId: SURVIVOR_ID, actorId: ACTOR_ID });
    expect(second).toEqual({ ok: false, reason: 'already_resolved' });
    expect(mockState.calls.some((c) => c.kind === 'update' || c.kind === 'delete')).toBe(false);
  });

  it('resumes a mid-crash retry of its OWN prior claim (verdict already merged, loser still live)', async () => {
    mockState.resultQueue = [
      // Pre-claim SELECT: THIS exact merge already claimed the pair on a
      // prior (crashed) run — verdict/survivor already match, and the
      // loser side is still a live company id (crash happened before step 6).
      [pendingPairRow({ verdict: 'merged', survivorCompanyId: SURVIVOR_ID })],
      // NOTE: no claim UPDATE result queued — resuming must skip re-claiming.
      [], // survivorRels
      [], // loserRels
      undefined, // step 3
      undefined, // step 4a
      undefined, // step 4b
      [{ count: 0 }], // step 5
      undefined, // step 6 delete
    ];
    const result = await mergeCompanyPair({ pairId: PAIR_ID, survivorCompanyId: SURVIVOR_ID, actorId: ACTOR_ID });
    expect(result).toMatchObject({ ok: true, survivorCompanyId: SURVIVOR_ID, deletedCompanyId: LOSER_ID });
  });
});

describe('mergeCompanyPair — survivor_not_in_pair (T-31-03-04)', () => {
  it('returns survivor_not_in_pair without claiming when survivorCompanyId is neither side of the pair', async () => {
    mockState.resultQueue = [[pendingPairRow({ companyAId: 'company-x', companyBId: 'company-y' })]];
    const result = await mergeCompanyPair({ pairId: PAIR_ID, survivorCompanyId: 'company-z', actorId: ACTOR_ID });
    expect(result).toEqual({ ok: false, reason: 'survivor_not_in_pair' });
    expect(mockState.calls.some((c) => c.kind === 'update')).toBe(false);
  });
});

describe('mergeCompanyPair — incomplete_repoint (step 5 confirmation)', () => {
  it('does not delete the loser company when the confirmation count is non-zero', async () => {
    mockState.resultQueue = [
      [pendingPairRow()],
      [{ id: PAIR_ID }],
      [], // survivorRels
      [], // loserRels
      undefined, // step 3
      undefined, // step 4a
      undefined, // step 4b
      [{ count: 2 }], // step 5 — still 2 relationships pointing at the loser
    ];
    const result = await mergeCompanyPair({ pairId: PAIR_ID, survivorCompanyId: SURVIVOR_ID, actorId: ACTOR_ID });
    expect(result).toEqual({ ok: false, reason: 'incomplete_repoint' });
    const deleteCalls = mockState.calls.filter((c) => c.kind === 'delete');
    expect(deleteCalls.length).toBe(0);
  });
});

describe('recordKeepSeparate', () => {
  it('claims with verdict=kept_separate and writes no other row', async () => {
    mockState.resultQueue = [[{ id: PAIR_ID }]];
    const result = await recordKeepSeparate({ pairId: PAIR_ID, actorId: ACTOR_ID });
    expect(result).toEqual({ ok: true });
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'company_pair.keep_separate',
        targetType: 'company_pair',
        targetId: PAIR_ID,
      }),
    );
    const updateCalls = mockState.calls.filter((c) => c.kind === 'update');
    expect(updateCalls.length).toBe(1);
  });

  it('returns already_resolved on zero rows affected', async () => {
    mockState.resultQueue = [[]];
    const result = await recordKeepSeparate({ pairId: PAIR_ID, actorId: ACTOR_ID });
    expect(result).toEqual({ ok: false, reason: 'already_resolved' });
    expect(writeAuditLogMock).not.toHaveBeenCalled();
  });
});

describe('source guards', () => {
  it('never issues a .transaction( call anywhere in the module source', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');
    const filePath = join(dirname(fileURLToPath(import.meta.url)), 'merge.ts');
    const source = readFileSync(filePath, 'utf8');
    expect(source).not.toMatch(/\.transaction\(/);
  });

  it('compiles the verdict-IS-NULL precondition into the claim write (isNull(schema.companyPairDecisions.verdict))', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');
    const filePath = join(dirname(fileURLToPath(import.meta.url)), 'merge.ts');
    const source = readFileSync(filePath, 'utf8');
    expect(source).toMatch(/isNull\(schema\.companyPairDecisions\.verdict\)/);
  });

  it('writes at least 3 writeAuditLog call sites', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');
    const filePath = join(dirname(fileURLToPath(import.meta.url)), 'merge.ts');
    const source = readFileSync(filePath, 'utf8');
    const count = (source.match(/writeAuditLog/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(3);
  });
});

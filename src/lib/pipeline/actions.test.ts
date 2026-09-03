/**
 * Phase 33 Plan 04 — src/lib/pipeline/actions.ts tests.
 *
 * Mocking harness reused verbatim from src/lib/crm/actions.test.ts: `@/lib/db`
 * is mocked with a chainable stub-builder (queue-based results, calls
 * recorded in order) that re-exports the REAL `@/db/schema` via
 * `vi.importActual`, so `and`/`eq`/`inArray`/`isNull`/`isNotNull` in
 * actions.ts operate on real Column objects. Extended here with
 * `innerJoin`/`leftJoin` on the select builder, needed by
 * `markProposalWonAction`'s joined branch-selector read and subqueries.
 *
 * Phase 34 Plan 08 (ACTV-02, D-21) extends the harness with a mock of the
 * `@/lib/db/queries` barrel, so `insertRelationshipEventForOwner` is a spy that
 * ALSO records itself into `mockState.calls` — the timeline events must be
 * provably written AFTER the row write they narrate, and call order is the only
 * way to assert that on a driver with no transactions.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

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

vi.mock('@/lib/db', async () => {
  const real = await vi.importActual<typeof import('@/db/schema')>('@/db/schema');

  function makeSelectBuilder(): Record<string, unknown> {
    const builder: Record<string, unknown> = { _whereClause: undefined as unknown };
    Object.assign(builder, {
      from: (table: unknown) => {
        mockState.calls.push({ kind: 'from', payload: table });
        return builder;
      },
      innerJoin: (table: unknown, cond: unknown) => {
        mockState.calls.push({ kind: 'innerJoin', payload: { table, cond } });
        return builder;
      },
      leftJoin: (table: unknown, cond: unknown) => {
        mockState.calls.push({ kind: 'leftJoin', payload: { table, cond } });
        return builder;
      },
      where: (clause: unknown) => {
        mockState.calls.push({ kind: 'where', payload: clause });
        builder._whereClause = clause;
        return builder;
      },
      limit: (n: unknown) => {
        mockState.calls.push({ kind: 'limit', payload: n });
        return Promise.resolve(nextResult());
      },
      // SQLWrapper duck-type — lets this builder be embedded as a genuine
      // subquery by the real inArray().
      getSQL: () => builder._whereClause,
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
    });
    return builder;
  }

  const dbInstance = {
    select: (cols: unknown) => {
      mockState.calls.push({ kind: 'select', payload: cols });
      return makeSelectBuilder();
    },
    update: (table: unknown) => makeUpdateBuilder(table),
  };

  return {
    db: () => dbInstance,
    schema: real,
    DbError: class extends Error {},
    DbAuthError: class extends Error {},
    __resetDbForTests: () => { /* noop */ },
  };
});

const { requireRelationshipHolderMock, writeAuditLogMock } = vi.hoisted(() => ({
  requireRelationshipHolderMock: vi.fn(),
  writeAuditLogMock: vi.fn(),
}));
vi.mock('@/lib/auth/require', () => ({
  requireRelationshipHolder: requireRelationshipHolderMock,
}));
vi.mock('@/lib/db/queries/audit-log', () => ({
  writeAuditLog: writeAuditLogMock,
}));

const { insertRelationshipEventMock } = vi.hoisted(() => ({
  insertRelationshipEventMock: vi.fn(),
}));
vi.mock('@/lib/db/queries', () => ({
  insertRelationshipEventForOwner: insertRelationshipEventMock,
}));

import {
  advanceRelationshipStageAction,
  markProposalLostAction,
  markProposalWonAction,
} from './actions';

const CALLER_SESSION = { user: { id: 'user-1', email: 'partner@example.com' } };
const RELATIONSHIP_ID = '11111111-1111-4111-8111-111111111111';
const PROPOSAL_ID = '22222222-2222-4222-8222-222222222222';

/** Walks a Drizzle condition tree looking for a column named `columnName`.
 * Copied verbatim from src/lib/crm/actions.test.ts. Deliberately skips the
 * `.table` back-reference (a Column's `.table` enumerates every sibling
 * column on that table — without this exclusion the walk would "find" any
 * column on ANY predicate touching that table, defeating the whole point of
 * this check). */
function sqlReferencesColumn(node: unknown, columnName: string, seen = new Set<unknown>()): boolean {
  if (node === null || typeof node !== 'object') return false;
  if (seen.has(node)) return false;
  seen.add(node);
  const obj = node as Record<string, unknown>;
  if (obj.name === columnName && 'table' in obj) return true;
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'table') continue;
    if (Array.isArray(value)) {
      if (value.some((v) => sqlReferencesColumn(v, columnName, seen))) return true;
    } else if (value && typeof value === 'object') {
      if (sqlReferencesColumn(value, columnName, seen)) return true;
    }
  }
  return false;
}

beforeEach(() => {
  mockState.resultQueue = [];
  mockState.calls = [];
  requireRelationshipHolderMock.mockReset();
  requireRelationshipHolderMock.mockResolvedValue({ session: CALLER_SESSION, role: 'partner' });
  writeAuditLogMock.mockReset();
  writeAuditLogMock.mockResolvedValue({ id: 'audit-1' });
  insertRelationshipEventMock.mockReset();
  // Records itself into the same ordered call log as the db builder, so a test
  // can prove the event lands AFTER the UPDATE it narrates.
  insertRelationshipEventMock.mockImplementation(async (args: unknown) => {
    mockState.calls.push({ kind: 'event', payload: args });
    return { id: 'event-1' };
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe('advanceRelationshipStageAction', () => {
  it('calls requireRelationshipHolder before touching db()', async () => {
    class NextNotFoundError extends Error {}
    requireRelationshipHolderMock.mockRejectedValueOnce(new NextNotFoundError('NEXT_NOT_FOUND'));

    await expect(
      advanceRelationshipStageAction({ relationshipId: RELATIONSHIP_ID, toStage: 'prospect' }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockState.calls).toHaveLength(0);
  });

  it("rejects toStage 'signe' with the bounded error and performs ZERO database calls (PIPE-02)", async () => {
    await expect(
      advanceRelationshipStageAction({ relationshipId: RELATIONSHIP_ID, toStage: 'signe' }),
    ).rejects.toThrow('pipeline.toast.error');
    expect(mockState.calls).toHaveLength(0);
  });

  it("rejects toStage 'debloque' with the bounded error and performs ZERO database calls (PIPE-02)", async () => {
    await expect(
      advanceRelationshipStageAction({ relationshipId: RELATIONSHIP_ID, toStage: 'debloque' }),
    ).rejects.toThrow('pipeline.toast.error');
    expect(mockState.calls).toHaveLength(0);
  });

  // D-21 / T-34-08-02 — the fromStage pre-read must NOT have become the gate.
  // The predicate walk deliberately starts AFTER the `update` call so it reads
  // the UPDATE's own WHERE, not the pre-read's.
  it('composes the UPDATE with both client_relationships.id and owner_id predicates', async () => {
    mockState.resultQueue = [
      [{ stage: 'prospect' }], // D-21 fromStage pre-read (payload data, not the gate)
      [{ id: RELATIONSHIP_ID, stage: 'qualifie' }], // the UPDATE
    ];

    await advanceRelationshipStageAction({ relationshipId: RELATIONSHIP_ID, toStage: 'qualifie' });

    const updateIdx = mockState.calls.findIndex((c) => c.kind === 'update');
    expect(updateIdx).toBeGreaterThanOrEqual(0);
    const whereCall = mockState.calls.slice(updateIdx).find((c) => c.kind === 'where');
    expect(whereCall).toBeDefined();
    expect(sqlReferencesColumn(whereCall!.payload, 'id')).toBe(true);
    expect(sqlReferencesColumn(whereCall!.payload, 'owner_id')).toBe(true);
  });

  // T-34-08-02 — the pre-read returning a row does NOT let the action proceed
  // on a relationship the caller does not own. Only the UPDATE decides.
  it('throws the bounded error and writes no audit row on a zero-row returning()', async () => {
    mockState.resultQueue = [
      [{ stage: 'prospect' }], // pre-read succeeded...
      [], // ...but the UPDATE ... WHERE matched zero rows
    ];

    await expect(
      advanceRelationshipStageAction({ relationshipId: RELATIONSHIP_ID, toStage: 'qualifie' }),
    ).rejects.toThrow('pipeline.toast.error');
    expect(writeAuditLogMock).not.toHaveBeenCalled();
    expect(insertRelationshipEventMock).not.toHaveBeenCalled();
  });

  it("writes exactly one audit row with action 'relationship.stage_change' on success", async () => {
    mockState.resultQueue = [
      [{ stage: 'prospect' }],
      [{ id: RELATIONSHIP_ID, stage: 'qualifie' }],
    ];

    await advanceRelationshipStageAction({ relationshipId: RELATIONSHIP_ID, toStage: 'qualifie' });

    expect(writeAuditLogMock).toHaveBeenCalledTimes(1);
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'relationship.stage_change',
        targetType: 'client_relationship',
        targetId: RELATIONSHIP_ID,
      }),
    );
  });

  // ── D-21 / 33-REVIEW WR-16 ────────────────────────────────────────────────
  // audit-log.ts has documented "the from/to stage strings" since Phase 33
  // while the code wrote `toStage` alone. The key set is asserted EXACTLY so
  // neither half can be dropped again silently.
  it('writes an audit payload whose key set is exactly { fromStage, toStage }, with the pre-read stage as fromStage (D-21)', async () => {
    mockState.resultQueue = [
      [{ stage: 'prospect' }], // the relationship's stage before the move
      [{ id: RELATIONSHIP_ID, stage: 'qualifie' }],
    ];

    await advanceRelationshipStageAction({ relationshipId: RELATIONSHIP_ID, toStage: 'qualifie' });

    const payload = writeAuditLogMock.mock.calls[0][0].payload as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(['fromStage', 'toStage']);
    expect(payload.fromStage).toBe('prospect');
    expect(payload.toStage).toBe('qualifie');
  });

  // ── ACTV-02 / D-15 ────────────────────────────────────────────────────────
  it('appends a stage_changed event attributed to the session user, with payload keys exactly { fromStage, toStage }', async () => {
    mockState.resultQueue = [
      [{ stage: 'prospect' }],
      [{ id: RELATIONSHIP_ID, stage: 'qualifie' }],
    ];

    await advanceRelationshipStageAction({ relationshipId: RELATIONSHIP_ID, toStage: 'qualifie' });

    expect(insertRelationshipEventMock).toHaveBeenCalledTimes(1);
    const args = insertRelationshipEventMock.mock.calls[0][0] as Record<string, unknown>;
    expect(args.kind).toBe('stage_changed');
    expect(args.relationshipId).toBe(RELATIONSHIP_ID);
    expect(args.ownerId).toBe(CALLER_SESSION.user.id);
    // T-34-08-01: never null — a null actor would be indistinguishable from a
    // genuinely system-initiated event, and ACTV-02 requires attribution.
    expect(args.actorId).toBe(CALLER_SESSION.user.id);
    expect(Object.keys(args.payload as object).sort()).toEqual(['fromStage', 'toStage']);
    expect((args.payload as Record<string, unknown>).fromStage).toBe('prospect');
  });

  it('writes the stage_changed event AFTER the stage UPDATE, never before (no transactions — 34-PATTERNS trap 1)', async () => {
    mockState.resultQueue = [
      [{ stage: 'prospect' }],
      [{ id: RELATIONSHIP_ID, stage: 'qualifie' }],
    ];

    await advanceRelationshipStageAction({ relationshipId: RELATIONSHIP_ID, toStage: 'qualifie' });

    const updateIdx = mockState.calls.findIndex((c) => c.kind === 'update');
    const returningIdx = mockState.calls.findIndex((c) => c.kind === 'returning');
    const eventIdx = mockState.calls.findIndex((c) => c.kind === 'event');
    expect(updateIdx).toBeGreaterThanOrEqual(0);
    expect(eventIdx).toBeGreaterThan(returningIdx);
  });

  // <decision_record> section two — a failed event write must not fail the
  // thing that happened. The stage HAS moved by this point.
  it('still RESOLVES when the event write returns null (the stage already moved)', async () => {
    insertRelationshipEventMock.mockResolvedValueOnce(null);
    mockState.resultQueue = [
      [{ stage: 'prospect' }],
      [{ id: RELATIONSHIP_ID, stage: 'qualifie' }],
    ];

    await expect(
      advanceRelationshipStageAction({ relationshipId: RELATIONSHIP_ID, toStage: 'qualifie' }),
    ).resolves.toBeUndefined();
  });

  it('still RESOLVES when the event write throws (T-34-08-04)', async () => {
    insertRelationshipEventMock.mockRejectedValueOnce(new Error('driver exploded'));
    mockState.resultQueue = [
      [{ stage: 'prospect' }],
      [{ id: RELATIONSHIP_ID, stage: 'qualifie' }],
    ];

    await expect(
      advanceRelationshipStageAction({ relationshipId: RELATIONSHIP_ID, toStage: 'qualifie' }),
    ).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});

describe('markProposalLostAction', () => {
  it('composes the UPDATE with both proposals.id and user_id predicates', async () => {
    mockState.resultQueue = [[{ id: PROPOSAL_ID }]];

    await markProposalLostAction({ proposalId: PROPOSAL_ID, date: '2026-09-03' });

    const whereCall = mockState.calls.find((c) => c.kind === 'where');
    expect(whereCall).toBeDefined();
    expect(sqlReferencesColumn(whereCall!.payload, 'id')).toBe(true);
    expect(sqlReferencesColumn(whereCall!.payload, 'user_id')).toBe(true);
  });

  // 33-REVIEW CR-04 — an outcome belongs to a proposal that was actually sent.
  // Neither outcome UPDATE used to constrain the lifecycle status, so a DRAFT
  // could be marked won or lost; the badge then contradicted the conversion
  // rate, which counts finalized rows only, with no undo path.
  it('constrains the UPDATE to status = active, so a draft can never carry an outcome', async () => {
    mockState.resultQueue = [[{ id: PROPOSAL_ID }]];

    await markProposalLostAction({ proposalId: PROPOSAL_ID, date: '2026-09-03' });

    const whereCall = mockState.calls.find((c) => c.kind === 'where');
    expect(sqlReferencesColumn(whereCall!.payload, 'status')).toBe(true);
  });

  it('never sets a stage field — the set() payload keys are exactly outcome/outcomeDate/outcomeReason (D-04)', async () => {
    mockState.resultQueue = [[{ id: PROPOSAL_ID }]];

    await markProposalLostAction({ proposalId: PROPOSAL_ID, date: '2026-09-03', reason: 'Budget' });

    const setCall = mockState.calls.find((c) => c.kind === 'set');
    expect(setCall).toBeDefined();
    expect(Object.keys(setCall!.payload as object).sort()).toEqual(
      ['outcome', 'outcomeDate', 'outcomeReason'].sort(),
    );
  });

  it('throws the bounded key on a zero-row returning()', async () => {
    mockState.resultQueue = [[]];

    await expect(
      markProposalLostAction({ proposalId: PROPOSAL_ID, date: '2026-09-03' }),
    ).rejects.toThrow('pipeline.toast.error');
    expect(writeAuditLogMock).not.toHaveBeenCalled();
    expect(insertRelationshipEventMock).not.toHaveBeenCalled();
  });

  // ── ACTV-02 / D-15 ────────────────────────────────────────────────────────
  // T-34-08-05: the key set is asserted EXACTLY. `reason` is partner free text
  // that does not belong in a payload beside ids, and no amount, commission or
  // rate value may ever enter one (D-26 / ADMIN-09).
  it('appends an outcome_set event attributed to the session user, with payload keys exactly { proposalId, outcome, outcomeDate }', async () => {
    mockState.resultQueue = [[{ id: PROPOSAL_ID, clientRelationshipId: RELATIONSHIP_ID }]];

    await markProposalLostAction({ proposalId: PROPOSAL_ID, date: '2026-09-03', reason: 'Budget' });

    expect(insertRelationshipEventMock).toHaveBeenCalledTimes(1);
    const args = insertRelationshipEventMock.mock.calls[0][0] as Record<string, unknown>;
    expect(args.kind).toBe('outcome_set');
    expect(args.relationshipId).toBe(RELATIONSHIP_ID);
    expect(args.ownerId).toBe(CALLER_SESSION.user.id);
    expect(args.actorId).toBe(CALLER_SESSION.user.id);
    const payload = args.payload as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(['outcome', 'outcomeDate', 'proposalId']);
    expect(payload.outcome).toBe('lost');
    expect(payload.proposalId).toBe(PROPOSAL_ID);
  });

  it('writes no event for a proposal that carries no client_relationship_id (nothing to narrate onto)', async () => {
    mockState.resultQueue = [[{ id: PROPOSAL_ID, clientRelationshipId: null }]];

    await expect(
      markProposalLostAction({ proposalId: PROPOSAL_ID, date: '2026-09-03' }),
    ).resolves.toBeUndefined();
    expect(insertRelationshipEventMock).not.toHaveBeenCalled();
  });

  it('still RESOLVES when the outcome event write returns null (the outcome already recorded)', async () => {
    insertRelationshipEventMock.mockResolvedValueOnce(null);
    mockState.resultQueue = [[{ id: PROPOSAL_ID, clientRelationshipId: RELATIONSHIP_ID }]];

    await expect(
      markProposalLostAction({ proposalId: PROPOSAL_ID, date: '2026-09-03' }),
    ).resolves.toBeUndefined();
  });
});

describe('markProposalWonAction', () => {
  // 33-REVIEW CR-01: the gate is RETURNED, never thrown. Next.js replaces a
  // Server Function's thrown error message with a generic string plus a
  // digest in production builds, so a thrown sentinel could not survive the
  // boundary and D-08's inline field never appeared for a real partner. A
  // returned value does survive — this test pins that contract.
  it('RETURNS { ok: false, reason: siren_required } and performs no UPDATE when the company has no siren and none was supplied', async () => {
    mockState.resultQueue = [[{ siren: null }]]; // the gate branch-selector read

    await expect(
      markProposalWonAction({ proposalId: PROPOSAL_ID, date: '2026-09-03' }),
    ).resolves.toEqual({ ok: false, reason: 'siren_required' });
    expect(mockState.calls.filter((c) => c.kind === 'update')).toHaveLength(0);
  });

  it('THROWS the bounded error — never the siren_required result — when the proposal is not owned by the caller', async () => {
    mockState.resultQueue = [[]]; // the gate select matches zero rows — not found / not owned

    await expect(
      markProposalWonAction({ proposalId: PROPOSAL_ID, date: '2026-09-03' }),
    ).rejects.toThrow('pipeline.toast.error');
    expect(mockState.calls.filter((c) => c.kind === 'update')).toHaveLength(0);
  });

  it('constrains the won UPDATE to status = active as well (33-REVIEW CR-04)', async () => {
    mockState.resultQueue = [
      [{ siren: '123456789' }], // gate branch-selector read
      [{ id: PROPOSAL_ID }], // the won write
    ];

    await markProposalWonAction({ proposalId: PROPOSAL_ID, date: '2026-09-03' });

    const updateWhere = mockState.calls.filter((c) => c.kind === 'where').at(-1);
    expect(sqlReferencesColumn(updateWhere!.payload, 'status')).toBe(true);
  });

  it('when a siren is supplied, the companies UPDATE carries both siren IS NULL and the owner-scoped relationship subquery', async () => {
    mockState.resultQueue = [
      [{ id: 'company-1', siren: '123456789' }], // companies UPDATE (inline SIREN save)
      [{ siren: '123456789' }], // gate branch-selector read
      [{ id: PROPOSAL_ID }], // proposals UPDATE (the won write)
    ];

    await markProposalWonAction({ proposalId: PROPOSAL_ID, date: '2026-09-03', siren: '123456789' });

    const firstUpdateIdx = mockState.calls.findIndex((c) => c.kind === 'update');
    const companiesWhere = mockState.calls
      .slice(firstUpdateIdx + 1)
      .find((c) => c.kind === 'where');
    expect(companiesWhere).toBeDefined();
    expect(sqlReferencesColumn(companiesWhere!.payload, 'siren')).toBe(true);
    expect(sqlReferencesColumn(companiesWhere!.payload, 'owner_id')).toBe(true);
  });

  it("the proposals UPDATE's set() payload contains no stage key (D-04 Decoupling Contract)", async () => {
    mockState.resultQueue = [
      [{ siren: '123456789' }], // gate branch-selector read (no siren supplied, so no save step)
      [{ id: PROPOSAL_ID }], // proposals UPDATE
    ];

    await markProposalWonAction({ proposalId: PROPOSAL_ID, date: '2026-09-03' });

    const setCalls = mockState.calls.filter((c) => c.kind === 'set');
    const proposalsSetCall = setCalls[setCalls.length - 1];
    expect(proposalsSetCall).toBeDefined();
    expect('stage' in (proposalsSetCall.payload as object)).toBe(false);
    expect(Object.keys(proposalsSetCall.payload as object).sort()).toEqual(
      ['outcome', 'outcomeDate', 'outcomeReason'].sort(),
    );
  });

  it('an unexpected thrown error from the driver surfaces as the bounded error and is logged, never re-thrown raw', async () => {
    // Empty queue — the gate select's .limit() call triggers the mock's
    // "resultQueue exhausted" throw, standing in for an unexpected driver
    // failure (e.g. connection error).
    mockState.resultQueue = [];

    await expect(
      markProposalWonAction({ proposalId: PROPOSAL_ID, date: '2026-09-03' }),
    ).rejects.toThrow('pipeline.toast.error');
    expect(console.error).toHaveBeenCalled();
  });

  it('a zero-row proposals UPDATE (SIREN removed concurrently) throws the bounded error', async () => {
    mockState.resultQueue = [
      [{ siren: '123456789' }], // gate branch-selector read
      [], // proposals UPDATE matched zero rows
    ];

    await expect(
      markProposalWonAction({ proposalId: PROPOSAL_ID, date: '2026-09-03' }),
    ).rejects.toThrow('pipeline.toast.error');
    expect(writeAuditLogMock).not.toHaveBeenCalled();
    expect(insertRelationshipEventMock).not.toHaveBeenCalled();
  });

  // ── ACTV-02 / D-15 ────────────────────────────────────────────────────────
  it('appends an outcome_set event attributed to the session user, with payload keys exactly { proposalId, outcome, outcomeDate }', async () => {
    mockState.resultQueue = [
      [{ siren: '123456789' }],
      [{ id: PROPOSAL_ID, clientRelationshipId: RELATIONSHIP_ID }],
    ];

    await expect(
      markProposalWonAction({ proposalId: PROPOSAL_ID, date: '2026-09-03' }),
    ).resolves.toEqual({ ok: true });

    expect(insertRelationshipEventMock).toHaveBeenCalledTimes(1);
    const args = insertRelationshipEventMock.mock.calls[0][0] as Record<string, unknown>;
    expect(args.kind).toBe('outcome_set');
    expect(args.relationshipId).toBe(RELATIONSHIP_ID);
    expect(args.ownerId).toBe(CALLER_SESSION.user.id);
    expect(args.actorId).toBe(CALLER_SESSION.user.id);
    const payload = args.payload as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(['outcome', 'outcomeDate', 'proposalId']);
    expect(payload.outcome).toBe('won');
  });

  it('writes the outcome_set event AFTER the outcome UPDATE', async () => {
    mockState.resultQueue = [
      [{ siren: '123456789' }],
      [{ id: PROPOSAL_ID, clientRelationshipId: RELATIONSHIP_ID }],
    ];

    await markProposalWonAction({ proposalId: PROPOSAL_ID, date: '2026-09-03' });

    const returningIdx = mockState.calls.findIndex((c) => c.kind === 'returning');
    const eventIdx = mockState.calls.findIndex((c) => c.kind === 'event');
    expect(returningIdx).toBeGreaterThanOrEqual(0);
    expect(eventIdx).toBeGreaterThan(returningIdx);
  });

  // 33-REVIEW CR-01 stays intact AND a refused win narrates nothing.
  it('returns the siren_required result before any event write — a refused win narrates nothing', async () => {
    mockState.resultQueue = [[{ siren: null }]];

    await expect(
      markProposalWonAction({ proposalId: PROPOSAL_ID, date: '2026-09-03' }),
    ).resolves.toEqual({ ok: false, reason: 'siren_required' });
    expect(insertRelationshipEventMock).not.toHaveBeenCalled();
  });

  it('writes no event for a won proposal that carries no client_relationship_id', async () => {
    mockState.resultQueue = [
      [{ siren: '123456789' }],
      [{ id: PROPOSAL_ID, clientRelationshipId: null }],
    ];

    await expect(
      markProposalWonAction({ proposalId: PROPOSAL_ID, date: '2026-09-03' }),
    ).resolves.toEqual({ ok: true });
    expect(insertRelationshipEventMock).not.toHaveBeenCalled();
  });

  it('still returns { ok: true } when the outcome event write returns null', async () => {
    insertRelationshipEventMock.mockResolvedValueOnce(null);
    mockState.resultQueue = [
      [{ siren: '123456789' }],
      [{ id: PROPOSAL_ID, clientRelationshipId: RELATIONSHIP_ID }],
    ];

    await expect(
      markProposalWonAction({ proposalId: PROPOSAL_ID, date: '2026-09-03' }),
    ).resolves.toEqual({ ok: true });
  });

  it('still returns { ok: true } when the outcome event write throws (T-34-08-04)', async () => {
    insertRelationshipEventMock.mockRejectedValueOnce(new Error('driver exploded'));
    mockState.resultQueue = [
      [{ siren: '123456789' }],
      [{ id: PROPOSAL_ID, clientRelationshipId: RELATIONSHIP_ID }],
    ];

    await expect(
      markProposalWonAction({ proposalId: PROPOSAL_ID, date: '2026-09-03' }),
    ).resolves.toEqual({ ok: true });
    expect(console.error).toHaveBeenCalled();
  });
});

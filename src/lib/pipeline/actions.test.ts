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

import {
  advanceRelationshipStageAction,
  markProposalLostAction,
  markProposalWonAction,
} from './actions';
// Plan 33-06 Rule 3 auto-fix: SIREN_REQUIRED moved to a plain module (a
// 'use server' file may export only async functions) — see
// src/lib/pipeline/constants.ts for the full reasoning.
import { SIREN_REQUIRED } from './constants';

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

  it('composes the UPDATE with both client_relationships.id and owner_id predicates', async () => {
    mockState.resultQueue = [[{ id: RELATIONSHIP_ID, stage: 'qualifie' }]];

    await advanceRelationshipStageAction({ relationshipId: RELATIONSHIP_ID, toStage: 'qualifie' });

    const whereCall = mockState.calls.find((c) => c.kind === 'where');
    expect(whereCall).toBeDefined();
    expect(sqlReferencesColumn(whereCall!.payload, 'id')).toBe(true);
    expect(sqlReferencesColumn(whereCall!.payload, 'owner_id')).toBe(true);
  });

  it('throws the bounded error and writes no audit row on a zero-row returning()', async () => {
    mockState.resultQueue = [[]]; // UPDATE ... WHERE matched zero rows

    await expect(
      advanceRelationshipStageAction({ relationshipId: RELATIONSHIP_ID, toStage: 'qualifie' }),
    ).rejects.toThrow('pipeline.toast.error');
    expect(writeAuditLogMock).not.toHaveBeenCalled();
  });

  it("writes exactly one audit row with action 'relationship.stage_change' on success", async () => {
    mockState.resultQueue = [[{ id: RELATIONSHIP_ID, stage: 'qualifie' }]];

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
  });
});

describe('markProposalWonAction', () => {
  it('throws exactly SIREN_REQUIRED and performs no UPDATE when the company has no siren and none was supplied', async () => {
    mockState.resultQueue = [[{ siren: null }]]; // the gate branch-selector read

    await expect(
      markProposalWonAction({ proposalId: PROPOSAL_ID, date: '2026-09-03' }),
    ).rejects.toThrow(SIREN_REQUIRED);
    expect(mockState.calls.filter((c) => c.kind === 'update')).toHaveLength(0);
  });

  it('throws the bounded error, NOT SIREN_REQUIRED, when the proposal is not owned by the caller', async () => {
    mockState.resultQueue = [[]]; // the gate select matches zero rows — not found / not owned

    await expect(
      markProposalWonAction({ proposalId: PROPOSAL_ID, date: '2026-09-03' }),
    ).rejects.toThrow('pipeline.toast.error');
    expect(mockState.calls.filter((c) => c.kind === 'update')).toHaveLength(0);
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
  });
});

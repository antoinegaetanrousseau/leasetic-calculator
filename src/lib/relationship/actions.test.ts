/**
 * Phase 34 Plan 06 — `src/lib/relationship/actions.ts` tests (FICHE-04,
 * ACTV-03, ACTV-04).
 *
 * Mocking harness reused from `src/lib/pipeline/actions.test.ts`, which in turn
 * took it verbatim from `src/lib/crm/actions.test.ts`: `@/lib/db` is mocked
 * with a chainable stub-builder (queue-based results, calls recorded in order)
 * that re-exports the REAL `@/db/schema` via `vi.importActual`, so `and`/`eq`
 * in the actions build real Column trees this file can walk. Extended here with
 * two things:
 *   - the auth guard's own call is RECORDED into the same ordered list as the
 *     database calls, so "the guard ran FIRST" is proved positionally rather
 *     than by the weaker "the guard was called at some point";
 *   - `insertRelationshipEventForOwner` is a spy that records into the same
 *     list, so `setNextActionAction`'s row-before-event ordering is an
 *     assertion about a real sequence rather than about two independent spies.
 *
 * A queued result that is an `Error` is THROWN rather than returned — that is
 * how the "an unexpected failure still collapses to the bounded key" cases
 * simulate a database that is simply down.
 *
 * The three actions get three separate describe blocks and no parameterised
 * loop: when this suite fails in six months the failure message has to name
 * which action lost its owner scoping.
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
    eventQueue: [] as unknown[],
    calls: [] as MockCall[],
  },
}));

function nextResult(): unknown {
  if (mockState.resultQueue.length === 0) {
    throw new Error('mock db: resultQueue exhausted — test queued too few results');
  }
  const next = mockState.resultQueue.shift();
  if (next instanceof Error) throw next;
  return next;
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
      where: (clause: unknown) => {
        mockState.calls.push({ kind: 'where', payload: clause });
        builder._whereClause = clause;
        return builder;
      },
      limit: (n: unknown) => {
        mockState.calls.push({ kind: 'limit', payload: n });
        return Promise.resolve(nextResult());
      },
      getSQL: () => builder._whereClause,
    });
    return builder;
  }

  // Present so that "nothing was inserted before the auth call" and "no action
  // reached for a raw INSERT instead of the owner-scoped helper" are both
  // observable, not merely absent from this harness.
  function makeInsertBuilder(table: unknown): Record<string, unknown> {
    mockState.calls.push({ kind: 'insert', payload: table });
    const builder: Record<string, unknown> = {};
    Object.assign(builder, {
      values: (v: unknown) => {
        mockState.calls.push({ kind: 'values', payload: v });
        return builder;
      },
      select: (sub: unknown) => {
        mockState.calls.push({ kind: 'insert-select', payload: sub });
        return builder;
      },
      returning: () => {
        mockState.calls.push({ kind: 'returning' });
        return Promise.resolve(nextResult());
      },
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
    insert: (table: unknown) => makeInsertBuilder(table),
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

const { requireRelationshipHolderMock, writeAuditLogMock, insertEventMock } = vi.hoisted(() => ({
  requireRelationshipHolderMock: vi.fn(),
  writeAuditLogMock: vi.fn(),
  insertEventMock: vi.fn(),
}));
vi.mock('@/lib/auth/require', () => ({
  requireRelationshipHolder: requireRelationshipHolderMock,
}));
vi.mock('@/lib/db/queries/audit-log', () => ({
  writeAuditLog: writeAuditLogMock,
}));
// The barrel, never the sibling file — that is how the actions import it.
vi.mock('@/lib/db/queries', () => ({
  insertRelationshipEventForOwner: insertEventMock,
  writeAuditLog: writeAuditLogMock,
}));

import {
  addRelationshipNoteAction,
  setNextActionAction,
  updateRelationDetailsAction,
} from './actions';

const CALLER_SESSION = { user: { id: 'user-1', email: 'partner@example.com' } };
const RELATIONSHIP_ID = '11111111-1111-4111-8111-111111111111';
// The bounded key is asserted as a LITERAL in every case below, never via a
// constant re-imported from the implementation: a shared constant would let
// the key be renamed on both sides at once and the suite would still pass,
// while the dictionary entry the client toasts silently went missing.

/** Walks a Drizzle condition tree looking for a column named `columnName`.
 * Copied verbatim from src/lib/pipeline/actions.test.ts. Deliberately skips the
 * `.table` back-reference (a Column's `.table` enumerates every sibling column
 * on that table — without this exclusion the walk would "find" any column on
 * ANY predicate touching that table, defeating the whole point of this
 * check). */
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

/** Walks the same tree looking for a BOUND VALUE. Referencing `owner_id` only
 * proves the column is in the predicate; this proves what it was compared to,
 * which is the half that would silently break if an action ever took an owner
 * id from its caller instead of from the session (T-34-06-01). */
function sqlBindsValue(node: unknown, value: string, seen = new Set<unknown>()): boolean {
  if (node === null || typeof node !== 'object') return false;
  if (seen.has(node)) return false;
  seen.add(node);
  for (const [key, v] of Object.entries(node as Record<string, unknown>)) {
    if (key === 'table') continue;
    if (v === value) return true;
    if (Array.isArray(v)) {
      if (v.some((x) => x === value || sqlBindsValue(x, value, seen))) return true;
    } else if (v && typeof v === 'object') {
      if (sqlBindsValue(v, value, seen)) return true;
    }
  }
  return false;
}

/** Resolves to the message of a rejection, failing loudly if there wasn't one.
 * Used instead of `rejects.toThrow(...)` where the test must prove the message
 * is EXACTLY the bounded key — `toThrow` matches a substring, which would pass
 * on a message that leaked a database error around the key. */
async function rejectionMessage(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
  throw new Error('expected the action to reject, but it resolved');
}

beforeEach(() => {
  mockState.resultQueue = [];
  mockState.eventQueue = [];
  mockState.calls = [];

  requireRelationshipHolderMock.mockReset();
  requireRelationshipHolderMock.mockImplementation(async () => {
    // Recorded into the SAME ordered list as the db calls — this is what makes
    // "first await" a positional assertion (PITFALLS §7.3, D-25).
    mockState.calls.push({ kind: 'auth' });
    return { session: CALLER_SESSION, role: 'partner' };
  });

  writeAuditLogMock.mockReset();
  writeAuditLogMock.mockResolvedValue({ id: 'audit-1' });

  insertEventMock.mockReset();
  insertEventMock.mockImplementation(async (args: unknown) => {
    mockState.calls.push({ kind: 'insert-event', payload: args });
    if (mockState.eventQueue.length === 0) return { id: 'event-1' };
    const next = mockState.eventQueue.shift();
    if (next instanceof Error) throw next;
    return next;
  });

  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

/* ─────────────────────────────────────────────────────────────────────────── */

describe('updateRelationDetailsAction (FICHE-04)', () => {
  it('A — calls requireRelationshipHolder before any database call', async () => {
    mockState.resultQueue = [[{ id: RELATIONSHIP_ID }]];

    await updateRelationDetailsAction({ relationshipId: RELATIONSHIP_ID, leadSource: 'salon' });

    expect(mockState.calls[0]?.kind).toBe('auth');
    expect(mockState.calls.filter((c) => c.kind === 'auth')).toHaveLength(1);
  });

  it('A2 — a rejecting guard leaves zero database calls behind', async () => {
    class NextNotFoundError extends Error {}
    requireRelationshipHolderMock.mockImplementationOnce(async () => {
      throw new NextNotFoundError('NEXT_NOT_FOUND');
    });

    await expect(
      updateRelationDetailsAction({ relationshipId: RELATIONSHIP_ID, leadSource: 'salon' }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockState.calls).toHaveLength(0);
    expect(insertEventMock).not.toHaveBeenCalled();
  });

  it("B — the UPDATE's WHERE carries owner_id bound to the session's own user id", async () => {
    mockState.resultQueue = [[{ id: RELATIONSHIP_ID }]];

    await updateRelationDetailsAction({ relationshipId: RELATIONSHIP_ID, leadSource: 'salon' });

    const whereCall = mockState.calls.find((c) => c.kind === 'where');
    expect(whereCall).toBeDefined();
    expect(sqlReferencesColumn(whereCall!.payload, 'id')).toBe(true);
    expect(sqlReferencesColumn(whereCall!.payload, 'owner_id')).toBe(true);
    expect(sqlBindsValue(whereCall!.payload, CALLER_SESSION.user.id)).toBe(true);
  });

  it('C — a zero-row UPDATE rejects with exactly the bounded key', async () => {
    mockState.resultQueue = [[]];

    expect(
      await rejectionMessage(
        updateRelationDetailsAction({ relationshipId: RELATIONSHIP_ID, leadSource: 'salon' }),
      ),
    ).toBe('relationship.toast.error');
  });

  it('D — an unexpected database failure collapses to the same key, message and all', async () => {
    mockState.resultQueue = [new Error('connection refused: 10.0.0.4:5432')];

    const message = await rejectionMessage(
      updateRelationDetailsAction({ relationshipId: RELATIONSHIP_ID, leadSource: 'salon' }),
    );
    expect(message).toBe('relationship.toast.error');
    expect(message).not.toContain('connection refused');
  });

  it('E — writes no audit row (D-03: private tier has no second reader)', async () => {
    mockState.resultQueue = [[{ id: RELATIONSHIP_ID }]];

    await updateRelationDetailsAction({
      relationshipId: RELATIONSHIP_ID,
      leadSource: 'salon',
      description: 'Rencontré sur le stand.',
    });

    expect(writeAuditLogMock).not.toHaveBeenCalled();
  });

  it('J — the .set() payload is exactly leadSource, description and updatedAt (D-02)', async () => {
    mockState.resultQueue = [[{ id: RELATIONSHIP_ID }]];

    await updateRelationDetailsAction({
      relationshipId: RELATIONSHIP_ID,
      leadSource: 'salon',
      description: 'Rencontré sur le stand.',
    });

    const setCall = mockState.calls.find((c) => c.kind === 'set');
    expect(setCall).toBeDefined();
    // Exact key set, not `objectContaining`: a registry column reaching this
    // object from a caller is the whole threat (T-34-06-03), and it would slip
    // straight through a containment assertion.
    expect(Object.keys(setCall!.payload as object).sort()).toEqual([
      'description',
      'leadSource',
      'updatedAt',
    ]);
  });

  it('J2 — a cleared lead source and description reach the columns as null, not undefined', async () => {
    mockState.resultQueue = [[{ id: RELATIONSHIP_ID }]];

    await updateRelationDetailsAction({
      relationshipId: RELATIONSHIP_ID,
      leadSource: '',
      description: '  ',
    });

    const setCall = mockState.calls.find((c) => c.kind === 'set');
    expect((setCall!.payload as { leadSource: unknown }).leadSource).toBeNull();
    expect((setCall!.payload as { description: unknown }).description).toBeNull();
  });

  it('writes no timeline event — an edit is a correction, not an occurrence (D-14)', async () => {
    mockState.resultQueue = [[{ id: RELATIONSHIP_ID }]];

    await updateRelationDetailsAction({ relationshipId: RELATIONSHIP_ID, leadSource: 'salon' });

    expect(insertEventMock).not.toHaveBeenCalled();
  });
});

/* ─────────────────────────────────────────────────────────────────────────── */

describe('addRelationshipNoteAction (ACTV-03)', () => {
  it('A — calls requireRelationshipHolder before any database call', async () => {
    mockState.resultQueue = [[{ id: RELATIONSHIP_ID }]]; // the updated_at bump

    await addRelationshipNoteAction({ relationshipId: RELATIONSHIP_ID, body: 'Appel de suivi' });

    expect(mockState.calls[0]?.kind).toBe('auth');
  });

  it('A2 — a rejecting guard leaves zero database calls and no event behind', async () => {
    class NextNotFoundError extends Error {}
    requireRelationshipHolderMock.mockImplementationOnce(async () => {
      throw new NextNotFoundError('NEXT_NOT_FOUND');
    });

    await expect(
      addRelationshipNoteAction({ relationshipId: RELATIONSHIP_ID, body: 'Appel de suivi' }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockState.calls).toHaveLength(0);
    expect(insertEventMock).not.toHaveBeenCalled();
  });

  it('B — the staleness bump re-proves ownership in its own WHERE', async () => {
    mockState.resultQueue = [[{ id: RELATIONSHIP_ID }]];

    await addRelationshipNoteAction({ relationshipId: RELATIONSHIP_ID, body: 'Appel de suivi' });

    // The event insert proves ownership inside its own INSERT … SELECT (that
    // is 34-05's helper, tested there); this UPDATE must not lean on it.
    const whereCall = mockState.calls.find((c) => c.kind === 'where');
    expect(whereCall).toBeDefined();
    expect(sqlReferencesColumn(whereCall!.payload, 'owner_id')).toBe(true);
    expect(sqlBindsValue(whereCall!.payload, CALLER_SESSION.user.id)).toBe(true);
  });

  it('C — an event insert that affected zero rows rejects with exactly the bounded key', async () => {
    mockState.eventQueue = [null]; // the helper's "nothing was inserted" signal

    expect(
      await rejectionMessage(
        addRelationshipNoteAction({ relationshipId: RELATIONSHIP_ID, body: 'Appel de suivi' }),
      ),
    ).toBe('relationship.toast.error');
  });

  it('D — an unexpected failure collapses to the same key, message and all', async () => {
    mockState.eventQueue = [new Error('connection refused: 10.0.0.4:5432')];

    const message = await rejectionMessage(
      addRelationshipNoteAction({ relationshipId: RELATIONSHIP_ID, body: 'Appel de suivi' }),
    );
    expect(message).toBe('relationship.toast.error');
    expect(message).not.toContain('connection refused');
  });

  it('E — writes no audit row (D-03)', async () => {
    mockState.resultQueue = [[{ id: RELATIONSHIP_ID }]];

    await addRelationshipNoteAction({ relationshipId: RELATIONSHIP_ID, body: 'Appel de suivi' });

    expect(writeAuditLogMock).not.toHaveBeenCalled();
  });

  it("F — writes a 'note' event attributed to the session user, never null (D-14, ACTV-02)", async () => {
    mockState.resultQueue = [[{ id: RELATIONSHIP_ID }]];

    await addRelationshipNoteAction({
      relationshipId: RELATIONSHIP_ID,
      body: '  Appel de suivi  ',
      occurredAt: '2026-09-01',
    });

    expect(insertEventMock).toHaveBeenCalledTimes(1);
    const args = insertEventMock.mock.calls[0]![0] as Record<string, unknown>;
    expect(args.kind).toBe('note');
    expect(args.actorId).toBe(CALLER_SESSION.user.id);
    expect(args.actorId).not.toBeNull();
    expect(args.ownerId).toBe(CALLER_SESSION.user.id);
    expect(args.body).toBe('Appel de suivi');
    expect(args.occurredAt).toBeInstanceOf(Date);
  });

  it('writes the EVENT before the staleness bump — the event is the fact', async () => {
    mockState.resultQueue = [[{ id: RELATIONSHIP_ID }]];

    await addRelationshipNoteAction({ relationshipId: RELATIONSHIP_ID, body: 'Appel de suivi' });

    const eventAt = mockState.calls.findIndex((c) => c.kind === 'insert-event');
    const updateAt = mockState.calls.findIndex((c) => c.kind === 'update');
    expect(eventAt).toBeGreaterThan(-1);
    expect(updateAt).toBeGreaterThan(eventAt);
  });
});

/* ─────────────────────────────────────────────────────────────────────────── */

describe('setNextActionAction (ACTV-04)', () => {
  it('A — calls requireRelationshipHolder before any database call', async () => {
    mockState.resultQueue = [[{ id: RELATIONSHIP_ID }]];

    await setNextActionAction({ relationshipId: RELATIONSHIP_ID, nextActionAt: '2026-10-01' });

    expect(mockState.calls[0]?.kind).toBe('auth');
  });

  it('A2 — a rejecting guard leaves zero database calls and no event behind', async () => {
    class NextNotFoundError extends Error {}
    requireRelationshipHolderMock.mockImplementationOnce(async () => {
      throw new NextNotFoundError('NEXT_NOT_FOUND');
    });

    await expect(
      setNextActionAction({ relationshipId: RELATIONSHIP_ID, nextActionAt: '2026-10-01' }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockState.calls).toHaveLength(0);
    expect(insertEventMock).not.toHaveBeenCalled();
  });

  it("B — the UPDATE's WHERE carries owner_id bound to the session's own user id", async () => {
    mockState.resultQueue = [[{ id: RELATIONSHIP_ID }]];

    await setNextActionAction({ relationshipId: RELATIONSHIP_ID, nextActionAt: '2026-10-01' });

    const whereCall = mockState.calls.find((c) => c.kind === 'where');
    expect(whereCall).toBeDefined();
    expect(sqlReferencesColumn(whereCall!.payload, 'id')).toBe(true);
    expect(sqlReferencesColumn(whereCall!.payload, 'owner_id')).toBe(true);
    expect(sqlBindsValue(whereCall!.payload, CALLER_SESSION.user.id)).toBe(true);
  });

  it('C — a zero-row UPDATE rejects with exactly the bounded key and writes no event', async () => {
    mockState.resultQueue = [[]];

    expect(
      await rejectionMessage(
        setNextActionAction({ relationshipId: RELATIONSHIP_ID, nextActionAt: '2026-10-01' }),
      ),
    ).toBe('relationship.toast.error');
    expect(insertEventMock).not.toHaveBeenCalled();
  });

  it('D — an unexpected database failure collapses to the same key, message and all', async () => {
    mockState.resultQueue = [new Error('connection refused: 10.0.0.4:5432')];

    const message = await rejectionMessage(
      setNextActionAction({ relationshipId: RELATIONSHIP_ID, nextActionAt: '2026-10-01' }),
    );
    expect(message).toBe('relationship.toast.error');
    expect(message).not.toContain('connection refused');
  });

  it('E — writes no audit row (D-03)', async () => {
    mockState.resultQueue = [[{ id: RELATIONSHIP_ID }]];

    await setNextActionAction({
      relationshipId: RELATIONSHIP_ID,
      nextActionAt: '2026-10-01',
      nextActionNote: 'Relancer sur le devis',
    });

    expect(writeAuditLogMock).not.toHaveBeenCalled();
  });

  it('G — writes the ROW before the EVENT (the fact survives a crash between them)', async () => {
    mockState.resultQueue = [[{ id: RELATIONSHIP_ID }]];

    await setNextActionAction({ relationshipId: RELATIONSHIP_ID, nextActionAt: '2026-10-01' });

    const updateAt = mockState.calls.findIndex((c) => c.kind === 'update');
    const eventAt = mockState.calls.findIndex((c) => c.kind === 'insert-event');
    expect(updateAt).toBeGreaterThan(-1);
    expect(eventAt).toBeGreaterThan(updateAt);
  });

  it('H — clearing writes the row and NO event, and nulls the note with the date', async () => {
    mockState.resultQueue = [[{ id: RELATIONSHIP_ID }]];

    await setNextActionAction({
      relationshipId: RELATIONSHIP_ID,
      nextActionAt: null,
      nextActionNote: 'Relancer sur le devis',
    });

    // 'set' is the kind, so there is no event to write for its withdrawal.
    expect(insertEventMock).not.toHaveBeenCalled();
    const setCall = mockState.calls.find((c) => c.kind === 'set');
    expect((setCall!.payload as { nextActionAt: unknown }).nextActionAt).toBeNull();
    // The note dies with the date it described.
    expect((setCall!.payload as { nextActionNote: unknown }).nextActionNote).toBeNull();
  });

  it("I — the event payload's key set is exactly { nextActionAt } (D-26 / ADMIN-09)", async () => {
    mockState.resultQueue = [[{ id: RELATIONSHIP_ID }]];

    await setNextActionAction({
      relationshipId: RELATIONSHIP_ID,
      nextActionAt: '2026-10-01',
      nextActionNote: 'Relancer sur le devis',
    });

    const args = insertEventMock.mock.calls[0]![0] as Record<string, unknown>;
    expect(args.kind).toBe('next_action_set');
    expect(args.actorId).toBe(CALLER_SESSION.user.id);
    // Exact key set: a future addition of commission or rate data to this
    // jsonb column has to fail here rather than ship quietly.
    expect(Object.keys(args.payload as object)).toEqual(['nextActionAt']);
    expect((args.payload as { nextActionAt: string }).nextActionAt).toContain('2026-10-01');
  });

  it('an event insert affecting zero rows still surfaces the bounded key', async () => {
    mockState.resultQueue = [[{ id: RELATIONSHIP_ID }]];
    mockState.eventQueue = [null];

    expect(
      await rejectionMessage(
        setNextActionAction({ relationshipId: RELATIONSHIP_ID, nextActionAt: '2026-10-01' }),
      ),
    ).toBe('relationship.toast.error');
  });
});

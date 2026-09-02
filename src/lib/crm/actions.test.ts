/**
 * Phase 30 Plan 05 — src/lib/crm/actions.ts tests.
 *
 * Mocking pattern mirrors src/lib/admin/actions.test.ts (requireX + @/lib/db +
 * writeAuditLog mocked) and src/lib/db/queries/partners.test.ts (a chainable
 * stub-builder recording each call so `where`/`values` payloads can be
 * introspected). `drizzle-orm` itself is NOT mocked — `@/lib/db`'s mock
 * re-exports the REAL `@/db/schema` (via `vi.importActual`), so `and`/`eq`/
 * `inArray` in actions.ts operate on real Column objects, exactly like
 * `client-relationships.test.ts` (30-04) does.
 *
 * The stub builder is queue-based: each terminal call (`.limit()` /
 * `.returning()`) shifts the next result off `mockState.resultQueue`, in the
 * exact order the action under test issues its statements. This lets a
 * single test simulate a multi-step sequence (e.g. "select by siren, miss;
 * insert company; insert relationship") without needing per-table stubs.
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

vi.mock('@/lib/db', async () => {
  const real = await vi.importActual<typeof import('@/db/schema')>('@/db/schema');

  /**
   * A fresh builder per `.select()`/`.insert()`/`.update()`/`.delete()` call
   * (NOT a shared singleton) — this is load-bearing for the
   * "carries the owner_id predicate" tests below: a `.select().from().where()`
   * chain used as a subquery argument to the REAL `inArray()` must expose
   * `getSQL()` (drizzle's own `isSQLWrapper()` duck-type check) so `inArray`
   * embeds it as-is rather than coercing it to a bound parameter, AND must
   * expose the captured where-clause as a plain enumerable property
   * (`_whereClause`) so a structural walk of the OUTER where-clause's SQL
   * tree can actually reach the subquery's real `eq(ownerId, ...)` condition
   * (built with the REAL, unmocked `eq`/`and` from drizzle-orm).
   */
  function makeSelectBuilder(): Record<string, unknown> {
    const builder: Record<string, unknown> = { _whereClause: undefined as unknown };
    Object.assign(builder, {
      from: (table: unknown) => {
        mockState.calls.push({ kind: 'from', payload: table });
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
      // SQLWrapper duck-type (see drizzle-orm/sql/sql.js `isSQLWrapper`) — lets
      // this builder be embedded as a genuine subquery by the real inArray().
      getSQL: () => builder._whereClause,
    });
    return builder;
  }

  function makeInsertBuilder(table: unknown): Record<string, unknown> {
    mockState.calls.push({ kind: 'insert', payload: table });
    const builder: Record<string, unknown> = {};
    Object.assign(builder, {
      values: (v: unknown) => {
        mockState.calls.push({ kind: 'values', payload: v });
        return builder;
      },
      onConflictDoNothing: (cfg: unknown) => {
        mockState.calls.push({ kind: 'onConflictDoNothing', payload: cfg });
        return builder;
      },
      // `INSERT ... SELECT` — the ownership-proving form used by
      // createContactAction. Recorded as its own kind so a test can assert that
      // the ownership predicate rides INSIDE the insert rather than arriving as a
      // separate check-then-act SELECT (T-30-05-05).
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

  function makeDeleteBuilder(table: unknown): Record<string, unknown> {
    mockState.calls.push({ kind: 'delete', payload: table });
    const builder: Record<string, unknown> = {};
    Object.assign(builder, {
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
    delete: (table: unknown) => makeDeleteBuilder(table),
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
  createClientRelationshipAction,
  createContactAction,
  deleteContactAction,
  updateContactAction,
} from './actions';

const CALLER_SESSION = { user: { id: 'user-1', email: 'partner@example.com' } };

/** Walks a Drizzle condition tree looking for a column named `columnName`.
 * Deliberately skips the `.table` back-reference (a Column's `.table`
 * enumerates every sibling column on that table — without this exclusion,
 * the walk would "find" `owner_id` on ANY predicate touching
 * `client_relationships`, defeating the whole point of this check — see
 * 30-04-SUMMARY.md Issues Encountered #1). */
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
});

afterEach(() => vi.clearAllMocks());

describe('createClientRelationshipAction', () => {
  it('creates a company and a relationship when no company holds the SIREN', async () => {
    const companyRow = { id: 'company-1', name: 'X', siren: '123456789' };
    const relationshipRow = { id: 'rel-1', companyId: 'company-1', ownerId: 'user-1' };
    mockState.resultQueue = [[], [companyRow], [relationshipRow]];

    const result = await createClientRelationshipAction({ name: 'X', siren: '123456789' });

    expect(result).toEqual({ relationshipId: 'rel-1' });
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'client_relationship.create',
        targetType: 'client_relationship',
        targetId: 'rel-1',
      }),
    );
  });

  it('attaches to an existing company on SIREN match and returns the caller\'s own new relationship, with no signal of pre-existence', async () => {
    const existingCompanyRow = { id: 'company-shared', name: 'Shared Co', siren: '999999999' };
    const relationshipRow = { id: 'rel-2', companyId: 'company-shared', ownerId: 'user-1' };
    mockState.resultQueue = [[existingCompanyRow], [relationshipRow]];

    const result = await createClientRelationshipAction({ name: 'Shared Co', siren: '999999999' });

    // Same shape as the "brand new company" case — no extra field, no flag.
    expect(Object.keys(result)).toEqual(['relationshipId']);
    expect(result.relationshipId).toBe('rel-2');
  });

  it('is idempotent — the same caller submitting the same SIREN twice gets the same relationship id both times', async () => {
    const companyRow = { id: 'company-3', name: 'X', siren: '111111111' };
    const relationshipRow = { id: 'rel-3', companyId: 'company-3', ownerId: 'user-1' };

    mockState.resultQueue = [[], [companyRow], [relationshipRow]];
    const first = await createClientRelationshipAction({ name: 'X', siren: '111111111' });

    // Second call: company already exists, relationship insert conflicts (caller already holds it).
    mockState.resultQueue = [[companyRow], [], [relationshipRow]];
    const second = await createClientRelationshipAction({ name: 'X', siren: '111111111' });

    expect(first.relationshipId).toBe('rel-3');
    expect(second.relationshipId).toBe('rel-3');
  });

  it('with no SIREN always creates a new company row — no SIREN select is attempted', async () => {
    const companyRow = { id: 'company-4', name: 'No Siren Co' };
    const relationshipRow = { id: 'rel-4', companyId: 'company-4', ownerId: 'user-1' };
    mockState.resultQueue = [[companyRow], [relationshipRow]];

    const result = await createClientRelationshipAction({ name: 'No Siren Co' });

    expect(result.relationshipId).toBe('rel-4');
    // The very first DB call must be the company INSERT, not a SIREN SELECT.
    expect(mockState.calls[0]).toMatchObject({ kind: 'insert' });
  });

  it('refuses admins — the notFound() thrown by requireRelationshipHolder propagates unwrapped', async () => {
    class NextNotFoundError extends Error {}
    requireRelationshipHolderMock.mockRejectedValueOnce(new NextNotFoundError('NEXT_NOT_FOUND'));

    await expect(createClientRelationshipAction({ name: 'X' })).rejects.toThrow('NEXT_NOT_FOUND');
    // Never wrapped into the bounded error — the gate itself, not a DB failure, is what fired.
  });

  it('never trusts a caller-supplied ownerId — the relationship is always bound to session.user.id', async () => {
    const companyRow = { id: 'company-5', name: 'Attack Co' };
    const relationshipRow = { id: 'rel-5', companyId: 'company-5', ownerId: 'user-1' };
    mockState.resultQueue = [[companyRow], [relationshipRow]];

    await createClientRelationshipAction({ name: 'Attack Co', ownerId: 'attacker-id' });

    const valuesCalls = mockState.calls.filter(
      (c): c is MockCall & { payload: { ownerId?: string } } =>
        c.kind === 'values' && typeof c.payload === 'object' && c.payload !== null && 'ownerId' in (c.payload as object),
    );
    expect(valuesCalls).toHaveLength(1);
    expect(valuesCalls[0].payload.ownerId).toBe('user-1');
  });

  it('writes an audit payload carrying only companyId — no commission field, no pre-existence signal', async () => {
    const companyRow = { id: 'company-6', name: 'X' };
    const relationshipRow = { id: 'rel-6', companyId: 'company-6', ownerId: 'user-1' };
    mockState.resultQueue = [[companyRow], [relationshipRow]];

    await createClientRelationshipAction({ name: 'X' });

    const auditCall = writeAuditLogMock.mock.calls[0][0];
    expect(auditCall.payload).toEqual({ companyId: 'company-6' });
  });
});

describe('createContactAction', () => {
  it('inserts a contact only when the caller owns the relationship', async () => {
    const contactRow = { id: 'contact-1', name: 'Jean', role: null, phone: null, email: null };
    // ONE result: the INSERT ... SELECT returns the inserted row. There is no
    // separate ownership lookup to queue a result for.
    mockState.resultQueue = [[contactRow]];

    const result = await createContactAction('rel-1', { name: 'Jean' });

    expect(result).toEqual({ id: 'contact-1' });
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'contact.create', targetType: 'contact', targetId: 'contact-1' }),
    );
  });

  it('proves ownership INSIDE the insert — no separate check-then-act read (T-30-05-05)', async () => {
    const contactRow = { id: 'contact-1', name: 'Jean', role: null, phone: null, email: null };
    mockState.resultQueue = [[contactRow]];

    await createContactAction('rel-1', { name: 'Jean' });

    // The write is an INSERT ... SELECT, so the ownership predicate cannot be
    // separated from the write by any window.
    expect(mockState.calls.some((c) => c.kind === 'insert-select')).toBe(true);
    // And the value-literal form must NOT be used — that is the shape that
    // required a preceding standalone ownership SELECT.
    expect(mockState.calls.some((c) => c.kind === 'values')).toBe(false);

    // Regression guard for the original defect: this action previously issued a
    // standalone `SELECT ... FROM client_relationships` and only then INSERTed,
    // leaving a real TOCTOU window. Nothing may run before the insert.
    const insertIdx = mockState.calls.findIndex((c) => c.kind === 'insert');
    expect(insertIdx).toBe(0);
  });

  it('throws the bounded error and inserts no row for a relationship owned by someone else', async () => {
    // The INSERT ... SELECT runs, its SELECT matches no owned relationship, so
    // zero rows come back. Zero rows is the ONLY failure signal — deliberately
    // identical for "not owned" and "does not exist".
    mockState.resultQueue = [[]];

    await expect(createContactAction('rel-other', { name: 'Jean' })).rejects.toThrow('clients.toast.error');
    expect(writeAuditLogMock).not.toHaveBeenCalled();
  });

  it('refuses admins before any DB access', async () => {
    class NextNotFoundError extends Error {}
    requireRelationshipHolderMock.mockRejectedValueOnce(new NextNotFoundError('NEXT_NOT_FOUND'));

    await expect(createContactAction('rel-1', { name: 'Jean' })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockState.calls).toHaveLength(0);
  });
});

describe('updateContactAction', () => {
  it('updates a contact when its relationship is owned by the caller', async () => {
    mockState.resultQueue = [[{ id: 'contact-1' }]];

    await expect(updateContactAction('contact-1', { name: 'Jean' })).resolves.toBeUndefined();
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'contact.update', targetType: 'contact', targetId: 'contact-1' }),
    );
  });

  it('throws the bounded error when the contact\'s relationship is not owned by the caller', async () => {
    mockState.resultQueue = [[]]; // UPDATE ... WHERE matched zero rows

    await expect(updateContactAction('contact-1', { name: 'Jean' })).rejects.toThrow('clients.toast.error');
    expect(writeAuditLogMock).not.toHaveBeenCalled();
  });

  it('carries the owner_id predicate inside its own WHERE clause — no separate check-then-act read', async () => {
    mockState.resultQueue = [[{ id: 'contact-1' }]];

    await updateContactAction('contact-1', { name: 'Jean' });

    const whereCalls = mockState.calls.filter((c) => c.kind === 'where');
    const lastWhere = whereCalls[whereCalls.length - 1];
    expect(sqlReferencesColumn(lastWhere.payload, 'owner_id')).toBe(true);

    // Exactly one terminal (.returning()) call — the ownership subquery is
    // embedded in SQL, never independently executed as a prior read.
    expect(mockState.calls.filter((c) => c.kind === 'returning' || c.kind === 'limit')).toHaveLength(1);
  });
});

describe('deleteContactAction', () => {
  it('deletes a contact when its relationship is owned by the caller', async () => {
    mockState.resultQueue = [[{ id: 'contact-1' }]];

    await expect(deleteContactAction('contact-1')).resolves.toBeUndefined();
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'contact.delete', targetType: 'contact', targetId: 'contact-1' }),
    );
  });

  it('throws the bounded error when the contact\'s relationship is not owned by the caller', async () => {
    mockState.resultQueue = [[]];

    await expect(deleteContactAction('contact-1')).rejects.toThrow('clients.toast.error');
    expect(writeAuditLogMock).not.toHaveBeenCalled();
  });

  it('carries the owner_id predicate inside its own WHERE clause', async () => {
    mockState.resultQueue = [[{ id: 'contact-1' }]];

    await deleteContactAction('contact-1');

    const whereCalls = mockState.calls.filter((c) => c.kind === 'where');
    const lastWhere = whereCalls[whereCalls.length - 1];
    expect(sqlReferencesColumn(lastWhere.payload, 'owner_id')).toBe(true);
  });
});

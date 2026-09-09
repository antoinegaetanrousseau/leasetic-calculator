/**
 * Phase 44 Plan 01 — listBackfillCandidates + listBackfilledProposalIds tests
 * (MIG-05, D-03, D-06).
 *
 * A NEW file, deliberately not appended to proposals.test.ts: that file's
 * 555-line shared stub resolves `orderBy` by returning the builder itself
 * rather than a promise, which would break `await dbi....orderBy(...)`
 * call sites added here. This file owns its own recording `stubBuilder`
 * (copied from pipeline.test.ts's shape — awaitable at any chain point via
 * a `then` method) and its own copy of the `sqlReferencesColumn` recursive
 * SQL walker (an established per-file copy convention in this directory).
 *
 * These are STRUCTURAL assertions over the built Drizzle SQL objects — they
 * prove the right predicate/join/projection shape is present in the query
 * the code constructs, not that Postgres actually filters on it at runtime.
 * A live filtering proof needs the integration DB and is out of scope here.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

interface MockState {
  selectResult: unknown[];
}

const { mockState } = vi.hoisted(() => ({
  mockState: {
    selectResult: [] as unknown[],
  } as MockState,
}));

const calls: Array<{ kind: string; payload: unknown }> = [];

vi.mock('@/lib/db', async () => {
  const real = await vi.importActual<typeof import('@/db/schema')>('@/db/schema');

  const stubBuilder: Record<string, unknown> = {};
  Object.assign(stubBuilder, {
    select: (cols: unknown) => {
      calls.push({ kind: 'select', payload: cols });
      return stubBuilder;
    },
    selectDistinct: (cols: unknown) => {
      calls.push({ kind: 'selectDistinct', payload: cols });
      return stubBuilder;
    },
    from: (table: unknown) => {
      calls.push({ kind: 'from', payload: table });
      return stubBuilder;
    },
    leftJoin: (table: unknown, on: unknown) => {
      calls.push({ kind: 'leftJoin', payload: { table, on } });
      return stubBuilder;
    },
    where: (clause: unknown) => {
      calls.push({ kind: 'where', payload: clause });
      return stubBuilder;
    },
    orderBy: (...cols: unknown[]) => {
      calls.push({ kind: 'orderBy', payload: cols });
      return stubBuilder;
    },
    // Makes the builder awaitable at any chain point (mirrors real Drizzle
    // query builders, which are PromiseLike even before a terminal call).
    then: (
      resolve: (value: unknown) => void,
      reject?: (reason: unknown) => void,
    ) => Promise.resolve(mockState.selectResult).then(resolve, reject),
  });

  return {
    db: () => stubBuilder,
    schema: real,
    DbError: class extends Error {},
    DbAuthError: class extends Error {},
    __resetDbForTests: () => { /* noop */ },
  };
});

import { listBackfillCandidates, listBackfilledProposalIds } from './proposals';
import { schema } from '@/lib/db';

/** Recursive object-graph walk — copied per-file convention in this directory. */
function sqlReferencesColumn(node: unknown, columnName: string, seen = new Set<unknown>()): boolean {
  if (node == null || typeof node !== 'object') return false;
  if (seen.has(node)) return false;
  seen.add(node);
  const obj = node as Record<string, unknown>;
  if (obj.name === columnName) return true;
  for (const key of Object.keys(obj)) {
    if (key === 'table') continue;
    let val: unknown;
    try {
      val = obj[key];
    } catch {
      continue;
    }
    if (val && typeof val === 'object' && sqlReferencesColumn(val, columnName, seen)) {
      return true;
    }
  }
  return false;
}

/**
 * Confirms a specific column reference (by object identity, e.g.
 * `schema.auditLog.id`) sits alongside an ` is null` SQL text fragment in
 * the same queryChunks array — i.e. the built SQL actually says
 * `"<that column>" is null`, not merely that both appear somewhere in the
 * tree.
 */
function sqlHasIsNullOnColumnRef(node: unknown, columnRef: unknown, seen = new Set<unknown>()): boolean {
  if (node == null || typeof node !== 'object') return false;
  if (seen.has(node)) return false;
  seen.add(node);
  const obj = node as Record<string, unknown>;
  const chunks = obj.queryChunks;
  if (Array.isArray(chunks)) {
    const hasColumn = chunks.includes(columnRef);
    const hasIsNullText = chunks.some((c) => {
      if (c && typeof c === 'object' && Array.isArray((c as Record<string, unknown>).value)) {
        return ((c as Record<string, unknown>).value as unknown[]).some(
          (v) => typeof v === 'string' && v.trim() === 'is null',
        );
      }
      return false;
    });
    if (hasColumn && hasIsNullText) return true;
  }
  for (const key of Object.keys(obj)) {
    if (key === 'table') continue;
    let val: unknown;
    try {
      val = obj[key];
    } catch {
      continue;
    }
    if (val && typeof val === 'object' && sqlHasIsNullOnColumnRef(val, columnRef, seen)) {
      return true;
    }
  }
  return false;
}

beforeEach(() => {
  calls.length = 0;
  mockState.selectResult = [];
});

describe('listBackfillCandidates — row scope (D-03)', () => {
  it('selects an explicit projection including partnerCompanyTelephone', async () => {
    await listBackfillCandidates();
    const selectCall = calls.find((c) => c.kind === 'select');
    expect(selectCall).toBeDefined();
    const projection = selectCall!.payload as Record<string, unknown>;
    expect(Object.keys(projection)).toContain('partnerCompanyTelephone');
    expect(Object.keys(projection)).toEqual(
      expect.arrayContaining([
        'id', 'userId', 'lcRef', 'language', 'status', 'createdAt', 'inputs', 'computed', 'pdfBlobKey',
      ]),
    );
  });

  it('issues exactly two leftJoins — one to users (user_id) and one to audit_log (action)', async () => {
    await listBackfillCandidates();
    const leftJoinCalls = calls.filter((c) => c.kind === 'leftJoin');
    expect(leftJoinCalls.length).toBe(2);
    const onClauses = leftJoinCalls.map((c) => (c.payload as { on: unknown }).on);
    expect(onClauses.some((on) => sqlReferencesColumn(on, 'user_id'))).toBe(true);
    expect(onClauses.some((on) => sqlReferencesColumn(on, 'action'))).toBe(true);
  });

  it('the WHERE payload references status', async () => {
    await listBackfillCandidates();
    const whereCall = calls.find((c) => c.kind === 'where');
    expect(whereCall).toBeDefined();
    expect(sqlReferencesColumn(whereCall!.payload, 'status')).toBe(true);
  });

  it('the WHERE payload does NOT reference deleted_at — no 30-day window filter (D-03)', async () => {
    await listBackfillCandidates();
    const whereCall = calls.find((c) => c.kind === 'where');
    expect(whereCall).toBeDefined();
    expect(sqlReferencesColumn(whereCall!.payload, 'deleted_at')).toBe(false);
  });

  it('the WHERE payload carries isNull(audit_log.id) — the anti-join (D-06)', async () => {
    await listBackfillCandidates();
    const whereCall = calls.find((c) => c.kind === 'where');
    expect(whereCall).toBeDefined();
    expect(sqlHasIsNullOnColumnRef(whereCall!.payload, schema.auditLog.id)).toBe(true);
  });

  it('returns the rows the query resolves to', async () => {
    mockState.selectResult = [
      { id: 'p1', userId: 'u1', lcRef: 'LC-1', language: 'fr', status: 'active', createdAt: new Date('2026-01-01'), inputs: {}, computed: null, pdfBlobKey: 'proposals/u1/p1.pdf', partnerCompanyTelephone: '+33...' },
    ];
    const rows = await listBackfillCandidates();
    expect(rows).toEqual(mockState.selectResult);
  });
});

describe('listBackfilledProposalIds — idempotence marker set (D-06, D-09)', () => {
  it('issues a selectDistinct', async () => {
    await listBackfilledProposalIds();
    expect(calls.find((c) => c.kind === 'selectDistinct')).toBeDefined();
  });

  it('the WHERE payload references action and target_type, not deleted_at', async () => {
    await listBackfilledProposalIds();
    const whereCall = calls.find((c) => c.kind === 'where');
    expect(whereCall).toBeDefined();
    expect(sqlReferencesColumn(whereCall!.payload, 'action')).toBe(true);
    expect(sqlReferencesColumn(whereCall!.payload, 'target_type')).toBe(true);
    expect(sqlReferencesColumn(whereCall!.payload, 'deleted_at')).toBe(false);
  });

  it('maps rows to a string[] of target ids', async () => {
    mockState.selectResult = [{ targetId: 'p1' }, { targetId: 'p2' }];
    const ids = await listBackfilledProposalIds();
    expect(ids).toEqual(['p1', 'p2']);
  });
});

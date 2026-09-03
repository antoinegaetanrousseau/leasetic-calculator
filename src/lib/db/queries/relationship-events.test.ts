/**
 * Phase 34 Plan 05 — relationship-events.ts tests (ACTV-01/02/05, CRM-02,
 * D-14/D-15, T-34-05-01..05).
 *
 * Mock-db harness copied from pipeline.test.ts / client-relationships.test.ts:
 * the schema is the REAL module via `vi.importActual`, so `and`/`eq`/`sql`
 * build genuine Drizzle Column trees. Extended in two ways for this module:
 *
 *   - a RESULT QUEUE (`mockState.results`) rather than a single result, so a
 *     terminal `.returning()` and a terminal `await` can each shift their own
 *     row set;
 *   - `insert` / `returning` / `getSQL`, because `insertRelationshipEventForOwner`
 *     is an `INSERT … SELECT` and the source select is embedded as a genuine
 *     subquery argument.
 *
 * The central assertion technique is stronger than a tree walk: every recorded
 * predicate is rendered to REAL SQL text + bind params with Drizzle's own
 * `PgDialect`. A predicate that is merely "passed to the function" but not
 * compiled into the statement cannot survive that, which is exactly the
 * CRM-02 claim these tests exist to prove.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';

vi.mock('server-only', () => ({}));

interface MockState {
  /** FIFO queue — one entry per terminal statement the code under test runs. */
  results: unknown[][];
}

const { mockState } = vi.hoisted(() => ({
  mockState: {
    results: [] as unknown[][],
  } as MockState,
}));

const calls: Array<{ kind: string; payload: unknown }> = [];

vi.mock('@/lib/db', async () => {
  const real = await vi.importActual<typeof import('@/db/schema')>('@/db/schema');

  const stubBuilder: Record<string, unknown> = {};
  const nextResult = (): unknown[] =>
    mockState.results.length > 0 ? (mockState.results.shift() as unknown[]) : [];

  Object.assign(stubBuilder, {
    select: (arg: unknown) => {
      calls.push({ kind: 'select', payload: arg });
      return stubBuilder;
    },
    insert: (table: unknown) => {
      calls.push({ kind: 'insert', payload: table });
      return stubBuilder;
    },
    from: (table: unknown) => {
      calls.push({ kind: 'from', payload: table });
      return stubBuilder;
    },
    innerJoin: (table: unknown, on: unknown) => {
      calls.push({ kind: 'innerJoin', payload: { table, on } });
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
    limit: (n: number) => {
      calls.push({ kind: 'limit', payload: n });
      return stubBuilder;
    },
    returning: (cols: unknown) => {
      calls.push({ kind: 'returning', payload: cols });
      return Promise.resolve(nextResult());
    },
    // Duck-types a real Drizzle select builder so the builder object can be
    // handed to `.select(...)` as a genuine subquery argument.
    getSQL: () => ({}),
    // Makes the builder awaitable at any chain point (mirrors real Drizzle
    // query builders, which are PromiseLike even before a terminal call).
    then: (
      resolve: (value: unknown) => void,
      reject?: (reason: unknown) => void,
    ) => Promise.resolve(nextResult()).then(resolve, reject),
  });

  return {
    db: () => stubBuilder,
    schema: real,
    DbError: class extends Error {},
    DbAuthError: class extends Error {},
    __resetDbForTests: () => { /* noop */ },
  };
});

import {
  listRelationshipEvents,
  insertRelationshipEventForOwner,
  listRelationshipsNeedingFollowUp,
} from './relationship-events';

/**
 * Render a recorded Drizzle predicate/projection to the SQL text and bind
 * params PostgreSQL would actually receive. Accepts an `SQL`, an
 * `SQL.Aliased` or a `Column` — all three expose `getSQL()`.
 */
function renderSql(node: unknown): { sql: string; params: unknown[] } {
  const candidate = node as { getSQL?: () => SQL };
  const target = typeof candidate.getSQL === 'function' ? candidate.getSQL() : (node as SQL);
  const query = new PgDialect().sqlToQuery(target);
  return { sql: query.sql, params: query.params as unknown[] };
}

function moduleSource(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, 'relationship-events.ts'), 'utf8');
}

beforeEach(() => {
  calls.length = 0;
  mockState.results = [];
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── listRelationshipEvents (ACTV-01, T-34-05-01) ────────────────────────────

describe('listRelationshipEvents — CRM-02 owner scoping inside the statement', () => {
  it('issues ONE statement whose WHERE carries both client_relationship_id and owner_id', async () => {
    await listRelationshipEvents('rel-1', 'owner-A');

    expect(calls.filter((c) => c.kind === 'select')).toHaveLength(1);

    const whereCalls = calls.filter((c) => c.kind === 'where');
    expect(whereCalls).toHaveLength(1);

    const rendered = renderSql(whereCalls[0].payload);
    expect(rendered.sql).toContain('"relationship_events"."client_relationship_id"');
    expect(rendered.sql).toContain('"client_relationships"."owner_id"');
    // The owner id is COMPILED IN as a bind param — not merely accepted as an
    // argument and dropped on the floor.
    expect(rendered.params).toContain('owner-A');
    expect(rendered.params).toContain('rel-1');
  });

  it('orders by occurred_at DESC so the composite index is used', async () => {
    await listRelationshipEvents('rel-1', 'owner-A');
    const orderBy = calls.find((c) => c.kind === 'orderBy');
    expect(orderBy).toBeDefined();
    const rendered = (orderBy!.payload as unknown[]).map((c) => renderSql(c).sql).join(', ');
    expect(rendered).toContain('"relationship_events"."occurred_at" desc');
  });

  it('a non-owner probing the id gets [] and no throw — identical to a relationship with zero events', async () => {
    mockState.results = [[]];
    await expect(listRelationshipEvents('rel-someone-elses', 'owner-B')).resolves.toEqual([]);
  });
});

// ── insertRelationshipEventForOwner (ACTV-02, T-34-05-02) ───────────────────

describe('insertRelationshipEventForOwner — ownership proved inside the INSERT', () => {
  it('the source select carries BOTH the relationship id and the owner id', async () => {
    mockState.results = [[{ id: 'ev-1' }]];
    await insertRelationshipEventForOwner({
      relationshipId: 'rel-1',
      ownerId: 'owner-A',
      kind: 'note',
      actorId: 'user-1',
      body: 'Rappelé le client',
    });

    const whereCalls = calls.filter((c) => c.kind === 'where');
    expect(whereCalls).toHaveLength(1);
    const rendered = renderSql(whereCalls[0].payload);
    expect(rendered.sql).toContain('"client_relationships"."id"');
    expect(rendered.sql).toContain('"client_relationships"."owner_id"');
    expect(rendered.params).toEqual(expect.arrayContaining(['rel-1', 'owner-A']));
  });

  it('the FIRST recorded statement is the insert — there is no standalone ownership SELECT (no TOCTOU window)', async () => {
    mockState.results = [[{ id: 'ev-1' }]];
    await insertRelationshipEventForOwner({
      relationshipId: 'rel-1',
      ownerId: 'owner-A',
      kind: 'stage_changed',
      actorId: 'user-1',
      payload: { fromStage: 'prospect', toStage: 'qualifie' },
    });
    expect(calls[0]?.kind).toBe('insert');
    // Exactly one INSERT … SELECT: the projection select plus the subquery
    // hand-off, and nothing before the insert.
    expect(calls.filter((c) => c.kind === 'insert')).toHaveLength(1);
  });

  it('returns null (does not throw) when the insert returns zero rows — the caller decides if that is an error', async () => {
    mockState.results = [[]];
    await expect(
      insertRelationshipEventForOwner({
        relationshipId: 'rel-not-owned',
        ownerId: 'owner-B',
        kind: 'note',
        actorId: 'user-2',
        body: 'probe',
      }),
    ).resolves.toBeNull();
  });

  it('accepts actorId: null and inserts it — D-14, null means the system did it', async () => {
    mockState.results = [[{ id: 'ev-2' }]];
    const result = await insertRelationshipEventForOwner({
      relationshipId: 'rel-1',
      ownerId: 'owner-A',
      kind: 'registry_synced',
      actorId: null,
    });
    expect(result).toEqual({ id: 'ev-2' });

    const projection = calls.find((c) => c.kind === 'select')!.payload as Record<string, unknown>;
    expect(Object.keys(projection)).toContain('actorId');
    expect(renderSql(projection.actorId).params).toContain(null);
  });

  it('rejects a kind outside RELATIONSHIP_EVENT_KINDS at COMPILE time, not at runtime', async () => {
    mockState.results = [[{ id: 'ev-3' }]];
    await insertRelationshipEventForOwner({
      relationshipId: 'rel-1',
      ownerId: 'owner-A',
      // @ts-expect-error — 'invented_kind' is not a RelationshipEventKind. The TS
      // union and the DB CHECK enumerate identical values; there is deliberately
      // no runtime guard here, so this line is the whole test.
      kind: 'invented_kind',
      actorId: null,
    });
  });
});

// ── listRelationshipsNeedingFollowUp (ACTV-05, T-34-05-04) ──────────────────

describe('listRelationshipsNeedingFollowUp — the "à relancer" rule', () => {
  it('compiles ownerId into the WHERE beside next_action_at, updated_at and the three excluded stages', async () => {
    await listRelationshipsNeedingFollowUp('owner-A', 5);

    const whereCalls = calls.filter((c) => c.kind === 'where');
    expect(whereCalls).toHaveLength(1);
    const rendered = renderSql(whereCalls[0].payload);

    expect(rendered.sql).toContain('"client_relationships"."owner_id"');
    expect(rendered.sql).toContain('next_action_at');
    expect(rendered.sql).toContain('updated_at');
    expect(rendered.params).toContain('owner-A');
    expect(rendered.params).toEqual(expect.arrayContaining(['perdu', 'signe', 'debloque']));
  });

  it('a FUTURE next_action_at is neither due nor stale — due needs <= now(), stale needs next_action_at IS NULL', async () => {
    await listRelationshipsNeedingFollowUp('owner-A', 5);
    const rendered = renderSql(calls.find((c) => c.kind === 'where')!.payload);
    expect(rendered.sql).toContain('"next_action_at" <= now()');
    expect(rendered.sql).toContain('"next_action_at" IS NULL');
    expect(rendered.sql).toContain("interval '30 days'");
  });

  it('orders due rows first (bucket ASC) then by coalesce(next_action_at, updated_at) ASC', async () => {
    await listRelationshipsNeedingFollowUp('owner-A', 5);
    const orderBy = calls.find((c) => c.kind === 'orderBy');
    expect(orderBy).toBeDefined();
    const rendered = (orderBy!.payload as unknown[]).map((c) => renderSql(c).sql).join(' | ');
    expect(rendered).toMatch(/CASE WHEN .* THEN 0 ELSE 1 END ASC/);
    expect(rendered).toContain('COALESCE');
  });

  it('applies the LIMIT in SQL, not via a JavaScript slice', async () => {
    await listRelationshipsNeedingFollowUp('owner-A', 3);
    expect(calls.find((c) => c.kind === 'limit')?.payload).toBe(3);
    expect(moduleSource()).not.toMatch(/\.slice\(/);
  });

  it("preserves the driver's order and does not re-sort in TypeScript", async () => {
    mockState.results = [[
      { relationshipId: 'rel-3', companyName: 'Zeta', siren: null, stage: 'prospect', nextActionAt: new Date('2026-09-01T00:00:00Z'), nextActionNote: null, updatedAt: new Date('2026-08-01T00:00:00Z'), bucket: 0 },
      { relationshipId: 'rel-1', companyName: 'Acme', siren: '123456789', stage: 'qualifie', nextActionAt: null, nextActionNote: null, updatedAt: new Date('2026-01-01T00:00:00Z'), bucket: 1 },
      { relationshipId: 'rel-2', companyName: 'Beta', siren: null, stage: 'negociation', nextActionAt: null, nextActionNote: 'relancer', updatedAt: new Date('2026-02-01T00:00:00Z'), bucket: 1 },
    ]];
    const rows = await listRelationshipsNeedingFollowUp('owner-A', 10);
    expect(rows.map((r) => r.relationshipId)).toEqual(['rel-3', 'rel-1', 'rel-2']);
    expect(moduleSource()).not.toMatch(/\.sort\(/);
  });

  it('an admin — who owns no relationships — receives an empty array, never a throw (T-34-05-04)', async () => {
    mockState.results = [[]];
    await expect(listRelationshipsNeedingFollowUp('admin-user', 5)).resolves.toEqual([]);
  });

  it('coerces the computed bucket to a number', async () => {
    mockState.results = [[
      { relationshipId: 'rel-1', companyName: 'Acme', siren: null, stage: 'prospect', nextActionAt: null, nextActionNote: null, updatedAt: new Date('2026-01-01T00:00:00Z'), bucket: '1' },
    ]];
    const rows = await listRelationshipsNeedingFollowUp('owner-A', 10);
    expect(rows[0].bucket).toBe(1);
  });
});

// ── Source guards (T-34-05-03) ──────────────────────────────────────────────

describe('no bypass path of any kind (T-34-05-03)', () => {
  it('the module never references an owner-bypass flag or an admin branch', () => {
    expect(moduleSource()).not.toMatch(/includeAllOwners|skipOwnerCheck|isAdmin|role/);
  });

  it('reproduces the CRM-02 CONTRACT paragraph rather than omitting it', () => {
    const src = moduleSource();
    expect(src).toContain('CRM-02 CONTRACT');
    expect(src).toContain('REQUIRED, non-optional, non-defaulted parameter');
    expect(src).toContain('There is NO admin path in this module');
  });

  it('records D-15 — system events are written by the actions that cause them, never by a trigger', () => {
    expect(moduleSource()).toContain('D-15');
  });
});

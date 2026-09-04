/**
 * Phase 35 Plan 02 — momentum.ts tests (GAME-01..04, CRM-02, D-01, D-11).
 *
 * Mocking pattern mirrors pipeline.test.ts / relationship-events.test.ts:
 * the schema is the REAL module via `vi.importActual`, so `and`/`eq`/`sql`
 * build genuine Drizzle Column/SQL trees, rendered to real SQL text + bind
 * params via `PgDialect` where an assertion needs to distinguish an
 * operator (e.g. `<` vs `<=`) rather than merely "a predicate exists".
 *
 * WHAT THIS FILE CAN PROVE: the WHERE clause of each statement is COMPOSED
 * with the owner predicate, and the result mapping / `Number(...)`
 * coercion is correct.
 *
 * WHAT THIS FILE CANNOT PROVE: that the join actually FILTERS at runtime —
 * the driver here is entirely mocked, so a dropped or mis-keyed join would
 * pass every assertion below. That claim belongs to
 * `src/lib/db/queries/momentum.isolation.integration.test.ts` (plan 35-04),
 * against real Postgres. Two production defects this repo shipped came
 * from exactly that gap; do not read more into this file than it proves.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';

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
    from: (table: unknown) => {
      calls.push({ kind: 'from', payload: table });
      return stubBuilder;
    },
    innerJoin: (table: unknown, on: unknown) => {
      calls.push({ kind: 'innerJoin', payload: { table, on } });
      return stubBuilder;
    },
    where: (clause: unknown) => {
      calls.push({ kind: 'where', payload: clause });
      return stubBuilder;
    },
    groupBy: (...cols: unknown[]) => {
      calls.push({ kind: 'groupBy', payload: cols });
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

import {
  listWeeklyMovementsForOwner,
  listProgressWeekKeysForOwner,
  getBadgeCountsForOwner,
} from './momentum';

/**
 * Render a recorded Drizzle predicate/projection to the SQL text and bind
 * params PostgreSQL would actually receive.
 */
function renderSql(node: unknown): { sql: string; params: unknown[] } {
  const candidate = node as { getSQL?: () => SQL };
  const target = typeof candidate.getSQL === 'function' ? candidate.getSQL() : (node as SQL);
  const query = new PgDialect().sqlToQuery(target);
  return { sql: query.sql, params: query.params as unknown[] };
}

function moduleSource(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, 'momentum.ts'), 'utf8');
}

/**
 * Strips `//` line comments and lines beginning with `*` (JSDoc prose), so
 * a source guard measures code, not the header comment that describes the
 * guard (UI-CONVENTIONS.md § "Plan-authoring note: grep-based acceptance
 * criteria measure prose too").
 */
function codeOnly(src: string): string {
  return src
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .filter((line) => !/^\s*\*/.test(line))
    .join('\n');
}

const WINDOW_A = {
  start: new Date('2026-09-07T00:00:00.000Z'),
  end: new Date('2026-09-14T00:00:00.000Z'),
};

beforeEach(() => {
  calls.length = 0;
  mockState.selectResult = [];
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── 1. listWeeklyMovementsForOwner — join composition + owner predicate ────

describe('listWeeklyMovementsForOwner — CRM-02 owner scoping', () => {
  it('composes an innerJoin to clientRelationships AND to companies, with the owner predicate in the WHERE', async () => {
    await listWeeklyMovementsForOwner('owner-A', WINDOW_A, 5);

    const innerJoins = calls.filter((c) => c.kind === 'innerJoin');
    expect(innerJoins).toHaveLength(2);

    const whereCalls = calls.filter((c) => c.kind === 'where');
    expect(whereCalls).toHaveLength(1);
    const rendered = renderSql(whereCalls[0].payload);
    expect(rendered.sql).toContain('"client_relationships"."owner_id"');
    expect(rendered.params).toContain('owner-A');
  });
});

// ── 2. total coercion regression ────────────────────────────────────────────

describe('listWeeklyMovementsForOwner — total coercion', () => {
  it("maps a fabricated 5-row result with total '17' (string) into { rows: length 5, total: 17 }", async () => {
    mockState.selectResult = Array.from({ length: 5 }, (_, i) => ({
      eventId: `ev-${i}`,
      relationshipId: `rel-${i}`,
      companyName: `Company ${i}`,
      kind: 'stage_changed',
      toStage: 'negociation',
      occurredAt: new Date('2026-09-08T10:00:00.000Z'),
      total: '17',
    }));

    const result = await listWeeklyMovementsForOwner('owner-A', WINDOW_A, 5);
    expect(result.rows).toHaveLength(5);
    expect(result.total).toBe(17);
    expect(typeof result.total).toBe('number');
  });

  it('returns { rows: [], total: 0 } for an empty result set', async () => {
    mockState.selectResult = [];
    const result = await listWeeklyMovementsForOwner('owner-A', WINDOW_A, 5);
    expect(result).toEqual({ rows: [], total: 0 });
  });
});

// ── 3. window.end exclusivity ────────────────────────────────────────────────

describe('listWeeklyMovementsForOwner — window.end is exclusive', () => {
  it('the recorded predicate uses lt (<), never lte (<=), on occurred_at', async () => {
    await listWeeklyMovementsForOwner('owner-A', WINDOW_A, 5);
    const whereCalls = calls.filter((c) => c.kind === 'where');
    const rendered = renderSql(whereCalls[0].payload);
    expect(rendered.sql).toMatch(/"relationship_events"\."occurred_at" < /);
    expect(rendered.sql).not.toMatch(/"relationship_events"\."occurred_at" <= /);
  });
});

// ── 4. listProgressWeekKeysForOwner — passthrough, no re-sort/re-filter ─────

describe('listProgressWeekKeysForOwner', () => {
  it('returns the YYYY-MM-DD strings from the fabricated result unchanged and in the order received', async () => {
    mockState.selectResult = [
      { weekKey: '2026-08-24' },
      { weekKey: '2026-09-07' },
      { weekKey: '2026-08-31' },
    ];
    const result = await listProgressWeekKeysForOwner('owner-A');
    expect(result).toEqual(['2026-08-24', '2026-09-07', '2026-08-31']);
  });

  it('composes the owner predicate in the WHERE', async () => {
    await listProgressWeekKeysForOwner('owner-A');
    const whereCalls = calls.filter((c) => c.kind === 'where');
    expect(whereCalls).toHaveLength(1);
    const rendered = renderSql(whereCalls[0].payload);
    expect(rendered.sql).toContain('"client_relationships"."owner_id"');
    expect(rendered.params).toContain('owner-A');
  });
});

// ── 5. getBadgeCountsForOwner — coercion ────────────────────────────────────

describe('getBadgeCountsForOwner', () => {
  it("coerces { distinctClients: '4', wins: '0' } to { distinctClients: 4, wins: 0 }", async () => {
    mockState.selectResult = [{ distinctClients: '4', wins: '0' }];
    const result = await getBadgeCountsForOwner('owner-A');
    expect(result).toEqual({ distinctClients: 4, wins: 0 });
  });

  it('returns { distinctClients: 0, wins: 0 } for an empty result set — not undefined, not NaN', async () => {
    mockState.selectResult = [];
    const result = await getBadgeCountsForOwner('owner-A');
    expect(result).toEqual({ distinctClients: 0, wins: 0 });
    expect(Number.isNaN(result.distinctClients)).toBe(false);
    expect(Number.isNaN(result.wins)).toBe(false);
  });
});

// ── 6. Source guards (comment-stripped) ─────────────────────────────────────

describe('momentum.ts — source guards (D-03, D-15, D-10, CRM-02)', () => {
  it('no requireAdmin, allOwners or isAdmin identifier', () => {
    const src = codeOnly(moduleSource());
    expect(src).not.toMatch(/requireAdmin|allOwners|isAdmin/);
  });

  it('no .insert(, .update( or .delete( — D-03 has no write path', () => {
    const src = codeOnly(moduleSource());
    expect(src).not.toMatch(/\.(insert|update|delete)\(/);
  });

  it('exactly three occurrences of the clientRelationships.ownerId equality — one per exported function', () => {
    const src = codeOnly(moduleSource());
    const matches = src.match(/eq\(schema\.clientRelationships\.ownerId, ownerId\)/g) ?? [];
    expect(matches).toHaveLength(3);
  });

  it("no 'Europe/Paris' literal — the timezone arrives via the imported constant (D-10)", () => {
    const src = codeOnly(moduleSource());
    expect(src).not.toContain("'Europe/Paris'");
  });
});

// ── 7. D-11 composition guard (source-level canary only) ───────────────────

describe('D-11 — the progress predicate excludes perdu', () => {
  it("the progress fragment text contains a 'perdu' exclusion (source-level canary only — the behavioural proof that a negociation → perdu move does not extend a streak belongs to the 35-04 integration test)", () => {
    const src = codeOnly(moduleSource());
    expect(src).toContain("<> 'perdu'");
  });
});

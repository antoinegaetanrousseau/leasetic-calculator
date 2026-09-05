import 'server-only';
import { and, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { PIPELINE_STAGES, type PipelineStage } from '@/lib/pipeline/stages';
import { MOMENTUM_TIME_ZONE } from '@/lib/momentum/window';
import type {
  MomentumBadgeCounts,
  MomentumMoveKind,
  MomentumRow,
  WeeklyMovements,
} from '@/lib/momentum/types';

/**
 * Phase 35 — the owner-scoped momentum/streak/badge read layer
 * (GAME-01..05, CRM-02).
 *
 * CRM-02 CONTRACT: every exported function in this module takes an
 * `ownerId` that is a REQUIRED, non-optional, non-defaulted parameter,
 * compiled directly into the WHERE clause of the SQL statement the
 * function issues. No function accepts an "all owners" flag or a
 * pre-checked boolean.
 *
 * D-03/D-07: everything here is DERIVED from `relationship_events` at
 * READ TIME. No write path exists in this module. No badge, streak, or
 * momentum row is ever persisted — recomputed from the event log on every
 * call.
 *
 * NO ADMIN PATH — an admin is never expected to call this module at all
 * (D-15); the page checks role BEFORE calling anything here, unlike the
 * follow-up list's "an admin owns nothing and gets an empty array"
 * fallback, because an admin's genuinely-empty result here would be
 * indistinguishable from a real partner's zero-history zero state.
 */

// ── Movement / progress predicates ──────────────────────────────────────────

/**
 * The SHOWN set (D-09, D-11): every event kind that appears in the week's
 * movement list. Notes, next-action dates, outcome events and registry
 * syncs are not movements (D-01; UI-SPEC § "What counts, and what is shown
 * but doesn't count") — they never reach this array.
 */
const MOVEMENT_KINDS: readonly MomentumMoveKind[] = ['stage_changed', 'proposal_finalized'];

/**
 * `PIPELINE_STAGES` compiled into a bound Postgres `text[]` literal via
 * `sql.join` over per-element bound parameters — never a hand-typed stage
 * list — so the TypeScript union stays the single source of truth for
 * stage ordering.
 */
const STAGE_ORDER_ARRAY = sql`ARRAY[${sql.join(
  PIPELINE_STAGES.map((stage) => sql`${stage}`),
  sql`, `,
)}]::text[]`;

const TO_STAGE_EXPR = sql`(${schema.relationshipEvents.payload}->>'toStage')`;
const FROM_STAGE_EXPR = sql`(${schema.relationshipEvents.payload}->>'fromStage')`;

/**
 * The COUNTS set (D-01, D-11). True when either:
 *   - `kind = 'proposal_finalized'` (a finalized proposal always counts), or
 *   - `kind = 'stage_changed'` AND the move did not land on `perdu` AND
 *     either there was no prior stage (a relationship's first-ever stage
 *     write — there is no "backward" without an origin) OR the new stage's
 *     position in `PIPELINE_STAGES` is strictly greater than the old one's.
 *
 * The `<> 'perdu'` conjunct is load-bearing — see this plan's
 * `<decision_record>`. `perdu` sits at a HIGHER ordinal than `negociation`
 * in `PIPELINE_STAGES`, so without this explicit exclusion a naive
 * "higher index wins" comparison would classify `negociation → perdu` as
 * progress, handing a partner the exact gaming route D-11 closes.
 */
const IS_PROGRESS_EVENT = sql`(
  ${schema.relationshipEvents.kind} = 'proposal_finalized'
  OR (
    ${schema.relationshipEvents.kind} = 'stage_changed'
    AND ${TO_STAGE_EXPR} <> 'perdu'
    AND (
      ${FROM_STAGE_EXPR} IS NULL
      OR array_position(${STAGE_ORDER_ARRAY}, ${TO_STAGE_EXPR}) > array_position(${STAGE_ORDER_ARRAY}, ${FROM_STAGE_EXPR})
    )
  )
)`;

// ── 1. This week's movements (GAME-01, D-09, D-11) ──────────────────────────

/**
 * The caller's own movements inside `window`, newest first, capped at
 * `limit` — plus the true count of the whole window via a window function
 * evaluated before `LIMIT`, so one statement yields both the capped rows
 * and the total the "+ N autres" line needs.
 *
 * `window.end` is EXCLUSIVE (`lt`, never `lte`) so the Sunday-to-Monday
 * boundary cannot double-count a row into two weeks.
 *
 * A backwards move or a move to `perdu` is returned here exactly like any
 * other row, with no marker field distinguishing it — D-11 forbids penalty
 * framing, and a flag in the payload would invite the caller to style it
 * differently.
 */
export async function listWeeklyMovementsForOwner(
  ownerId: string,
  window: { start: Date; end: Date },
  limit: number,
): Promise<WeeklyMovements> {
  const dbi = db();

  const rows = await dbi
    .select({
      eventId: schema.relationshipEvents.id,
      relationshipId: schema.relationshipEvents.clientRelationshipId,
      companyName: schema.companies.name,
      kind: schema.relationshipEvents.kind,
      // Null for a finalized proposal — there is no `toStage` on that kind.
      toStage: sql<string | null>`${schema.relationshipEvents.payload}->>'toStage'`,
      occurredAt: schema.relationshipEvents.occurredAt,
      total: sql<number>`COUNT(*) OVER ()`,
    })
    .from(schema.relationshipEvents)
    .innerJoin(
      schema.clientRelationships,
      eq(schema.clientRelationships.id, schema.relationshipEvents.clientRelationshipId),
    )
    .innerJoin(
      schema.companies,
      eq(schema.companies.id, schema.clientRelationships.companyId),
    )
    // CRM-02: ownerId is ALWAYS the first predicate, always present, never optional.
    .where(and(
      eq(schema.clientRelationships.ownerId, ownerId),
      inArray(schema.relationshipEvents.kind, [...MOVEMENT_KINDS]),
      gte(schema.relationshipEvents.occurredAt, window.start),
      lt(schema.relationshipEvents.occurredAt, window.end),
    ))
    .orderBy(desc(schema.relationshipEvents.occurredAt))
    .limit(limit);

  const total = rows.length > 0 ? Number(rows[0]?.total ?? 0) : 0;

  const mapped: MomentumRow[] = rows.map((r) => ({
    eventId: r.eventId,
    relationshipId: r.relationshipId,
    companyName: r.companyName,
    kind: r.kind as MomentumMoveKind,
    toStage: (r.toStage as PipelineStage | null) ?? null,
    occurredAt: r.occurredAt,
  }));

  return { rows: mapped, total };
}

// ── 2. Progress week keys, for the streak fold (GAME-02, D-07) ─────────────

/**
 * Every Europe/Paris Mon-based week key (`YYYY-MM-DD`, Monday's date) in
 * which the caller made at least one progress event, across the caller's
 * full history — no date range filter, because the streak fold needs the
 * full history to compute the longest streak ever (D-07).
 *
 * `<tz>` is the imported `MOMENTUM_TIME_ZONE`, bound as a parameter rather
 * than typed as a literal — keeping D-10's "one window definition" true
 * across the SQL/TypeScript boundary. Postgres's `date_trunc('week', …)`
 * is Monday-based, which is why the keys returned here are directly
 * comparable to `weekKeyFromMs` / `shiftWeekKey` output.
 *
 * GROUP BY is ordinal (`sql\`1\``), not the repeated `weekKeyExpr`
 * fragment (35-04 integration-suite finding, caught only against real
 * Postgres — the mocked-driver unit tests below cannot see this class of
 * defect at all, same lesson as
 * `relationship-events.insert.integration.test.ts`'s header comment).
 * Reusing the same JS `sql` object in both `.select()` and `.groupBy()`
 * still emits TWO separate bind parameters for `MOMENTUM_TIME_ZONE` (one
 * per template evaluation) — Postgres's GROUP BY functional-dependency
 * check compares parsed parameter *nodes*, not runtime values, so it saw
 * two syntactically different expressions and rejected `occurred_at` as
 * ungrouped even though both parameters always carry the same value.
 * `GROUP BY 1` grouping by the SELECT list's ordinal position sidesteps
 * the mismatch entirely.
 *
 * The fold in `@/lib/momentum/badges` owns ordering and dedup — this
 * function returns whatever the database returns, unmodified.
 */
export async function listProgressWeekKeysForOwner(ownerId: string): Promise<string[]> {
  const dbi = db();

  const weekKeyExpr = sql<string>`to_char(date_trunc('week', ${schema.relationshipEvents.occurredAt} AT TIME ZONE ${MOMENTUM_TIME_ZONE}), 'YYYY-MM-DD')`;

  const rows = await dbi
    .select({ weekKey: weekKeyExpr })
    .from(schema.relationshipEvents)
    .innerJoin(
      schema.clientRelationships,
      eq(schema.clientRelationships.id, schema.relationshipEvents.clientRelationshipId),
    )
    // CRM-02: ownerId is ALWAYS the first predicate, always present, never optional.
    .where(and(
      eq(schema.clientRelationships.ownerId, ownerId),
      IS_PROGRESS_EVENT,
    ))
    .groupBy(sql`1`);

  return rows.map((r) => r.weekKey);
}

// ── 3. Badge axis counts (GAME-03, D-05, D-06) ──────────────────────────────

/**
 * The two raw counts the "clients" and "wins" badge axes are measured
 * against — a single scan, both aggregates computed inside a statement
 * already restricted to the caller's own book, so neither can leak a
 * denominator, average, rank or peer total (D-12/GAME-04).
 *
 * `distinctClients`: relationships with at least one progress event.
 * `wins`: distinct finalized proposals marked `won` via an `outcome_set`
 * event.
 */
export async function getBadgeCountsForOwner(ownerId: string): Promise<MomentumBadgeCounts> {
  const dbi = db();

  const rows = await dbi
    .select({
      distinctClients: sql<number>`COUNT(DISTINCT ${schema.relationshipEvents.clientRelationshipId}) FILTER (WHERE ${IS_PROGRESS_EVENT})`,
      wins: sql<number>`COUNT(DISTINCT ${schema.relationshipEvents.payload}->>'proposalId') FILTER (WHERE ${schema.relationshipEvents.kind} = 'outcome_set' AND ${schema.relationshipEvents.payload}->>'outcome' = 'won')`,
    })
    .from(schema.relationshipEvents)
    .innerJoin(
      schema.clientRelationships,
      eq(schema.clientRelationships.id, schema.relationshipEvents.clientRelationshipId),
    )
    // CRM-02: ownerId is the ONLY predicate — a partner's own book, nothing else.
    .where(eq(schema.clientRelationships.ownerId, ownerId));

  return {
    distinctClients: Number(rows[0]?.distinctClients ?? 0),
    wins: Number(rows[0]?.wins ?? 0),
  };
}

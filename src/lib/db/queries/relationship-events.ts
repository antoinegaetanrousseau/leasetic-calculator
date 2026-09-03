import 'server-only';
import { and, desc, eq, notInArray, or, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type { RelationshipEventKind } from '@/lib/relationship/kinds';

/**
 * Phase 34 Plan 05 — the owner-scoped relationship activity layer
 * (ACTV-01..05, FICHE-04, CRM-02).
 *
 * CRM-02 CONTRACT: every exported function in this module takes an `ownerId`
 * that is a REQUIRED, non-optional, non-defaulted parameter, and that value
 * is compiled directly into the WHERE clause of the SQL statement the
 * function issues. No function here accepts an "include every owner" flag, a
 * pre-checked boolean, or any other bypass.
 *
 * There is NO admin path in this module — the timeline and the follow-up list
 * are private-tier data (D-01), so there is no cross-partner read to expose in
 * the first place, and an admin calling `listRelationshipsNeedingFollowUp`
 * simply owns no relationships and receives an empty array (T-30-04-09
 * precedent preserved).
 *
 * D-15 — SYSTEM EVENTS ARE WRITTEN BY THE ACTIONS THAT CAUSE THEM, NEVER BY A
 * DATABASE TRIGGER. A trigger cannot see the session, so an event it wrote
 * would carry no actor, and ACTV-02 requires attribution. That is why
 * `insertRelationshipEventForOwner` takes an EXPLICIT `actorId` and why that
 * argument is `string | null` with no default: `null` means "the system did
 * it", never "unknown". Nothing in this module may ever default it.
 *
 * NO TRANSACTIONS (34-PATTERNS trap 1). The production driver is
 * `drizzle-orm/neon-http`, whose `.transaction()` throws at runtime. Every
 * caller therefore writes the domain row and then the event as TWO SEPARATE
 * statements, and the ROW WRITE ALWAYS GOES FIRST. The accepted failure mode
 * is a missing timeline entry (a crash between the two loses the record of
 * the fact, not the fact) or a harmless orphan event — never a corrupted
 * relationship.
 *
 * ADMIN-09 / D-26: `relationship_events.payload` is jsonb, but it is written
 * exclusively by this app's own actions with ids and caller-submitted values.
 * No commission, rate or envelope data may ever be put in it.
 */

// ── Timeline read (ACTV-01, T-34-05-01) ─────────────────────────────────────

export interface RelationshipEventListRow {
  id: string;
  kind: RelationshipEventKind;
  actorId: string | null;
  /** `displayName ?? name ?? email`, resolved in SQL. NULL when actorId is NULL. */
  actorDisplayName: string | null;
  occurredAt: Date;
  body: string | null;
  payload: Record<string, unknown> | null;
}

/**
 * ACTV-01 — a relationship's full timeline, newest first.
 *
 * `relationship_events` is joined back to `client_relationships` purely to
 * carry the owner predicate in the SAME statement as the event lookup — this
 * function does not accept a pre-checked "caller already verified ownership"
 * boolean, and it never fetches events first and filters in TypeScript
 * afterward. A non-owner probing another partner's relationship id gets an
 * empty array, identical to a relationship with zero events (T-34-05-01, the
 * same indistinguishability `listContactsForRelationship` gives for contacts).
 *
 * Ordered by `occurred_at DESC` — not `created_at` — so the composite index
 * `relationship_events_relationship_id_occurred_at_idx` is used and a
 * backdated note lands where its author put it.
 */
export async function listRelationshipEvents(
  relationshipId: string,
  ownerId: string,
): Promise<RelationshipEventListRow[]> {
  const dbi = db();
  const rows = await dbi
    .select({
      id: schema.relationshipEvents.id,
      kind: schema.relationshipEvents.kind,
      actorId: schema.relationshipEvents.actorId,
      // Same fallback chain the rest of the codebase uses for a user label
      // (companies.ts, coefficient-history.ts): displayName, then name, then
      // email. `users.name` is NOT NULL DEFAULT '' so the empty string has to
      // be nulled out or it would win over a real email.
      actorDisplayName: sql<string | null>`COALESCE(NULLIF(BTRIM(${schema.users.displayName}), ''), NULLIF(BTRIM(${schema.users.name}), ''), ${schema.users.email})`,
      occurredAt: schema.relationshipEvents.occurredAt,
      body: schema.relationshipEvents.body,
      payload: schema.relationshipEvents.payload,
    })
    .from(schema.relationshipEvents)
    .innerJoin(
      schema.clientRelationships,
      eq(schema.clientRelationships.id, schema.relationshipEvents.clientRelationshipId),
    )
    // LEFT, not INNER: `actor_id` is NULL for system events (D-14), and an
    // inner join would silently drop every one of them from the timeline.
    .leftJoin(schema.users, eq(schema.users.id, schema.relationshipEvents.actorId))
    .where(and(
      eq(schema.relationshipEvents.clientRelationshipId, relationshipId),
      eq(schema.clientRelationships.ownerId, ownerId),
    ))
    .orderBy(desc(schema.relationshipEvents.occurredAt));

  return rows.map((r) => ({
    id: r.id,
    kind: r.kind as RelationshipEventKind,
    actorId: r.actorId,
    actorDisplayName: r.actorDisplayName,
    occurredAt: r.occurredAt,
    body: r.body,
    payload: r.payload,
  }));
}

// ── Event write (ACTV-02, T-34-05-02) ───────────────────────────────────────

export interface InsertRelationshipEventArgs {
  relationshipId: string;
  ownerId: string;
  kind: RelationshipEventKind;
  /** D-14: NULL means the system did it. Never defaulted — see the header. */
  actorId: string | null;
  body?: string | null;
  payload?: Record<string, unknown> | null;
  /** Defaults to `now()` in SQL. A note may legitimately be backdated. */
  occurredAt?: Date;
}

/**
 * ACTV-02 — append one event to a relationship the caller owns.
 *
 * Ownership is proved INSIDE the INSERT via `INSERT ... SELECT`: the source
 * row is the caller's own relationship, so a relationship the caller does not
 * own selects zero rows and inserts nothing. Zero rows returned is the only
 * failure signal (T-34-05-02, exactly as `createContactAction` does it).
 *
 * Do NOT reintroduce a standalone ownership SELECT followed by a separate
 * INSERT. That is what the contacts path used to do, and it left a real
 * TOCTOU window between the two statements — the pattern 30-05-PLAN.md
 * forbids ("the read and the write must be one statement"). It was invisible
 * in testing because the mock simply queued two results.
 *
 * Returns `null` rather than throwing when nothing was inserted: this is a
 * query helper, and only the calling ACTION knows whether a missing event is
 * a bounded error (a note the partner typed) or an acceptable loss (a system
 * event trailing a write that already succeeded).
 *
 * Every literal is bound as a parameter and CAST explicitly. In an
 * `INSERT ... SELECT` the projection gives PostgreSQL no type context for a
 * bare `$n`, so it would infer `text` and reject the timestamptz and jsonb
 * columns; the contacts analog gets away without casts only because every one
 * of its columns is already text.
 */
export async function insertRelationshipEventForOwner(
  args: InsertRelationshipEventArgs,
): Promise<{ id: string } | null> {
  const dbi = db();

  const inserted = await dbi
    .insert(schema.relationshipEvents)
    .select(
      dbi
        .select({
          clientRelationshipId: schema.clientRelationships.id,
          kind: sql<string>`${args.kind}::text`.as('kind'),
          actorId: sql<string | null>`${args.actorId}::text`.as('actor_id'),
          occurredAt: sql<Date>`COALESCE(${args.occurredAt ?? null}::timestamptz, now())`.as('occurred_at'),
          body: sql<string | null>`${args.body ?? null}::text`.as('body'),
          payload: sql<Record<string, unknown> | null>`${args.payload ? JSON.stringify(args.payload) : null}::jsonb`.as('payload'),
        })
        .from(schema.clientRelationships)
        .where(and(
          eq(schema.clientRelationships.id, args.relationshipId),
          eq(schema.clientRelationships.ownerId, args.ownerId),
        )),
    )
    // No projection argument: on an INSERT … SELECT builder Drizzle's
    // `.returning()` takes none, so the id is narrowed here instead — the
    // returned shape stays `{ id } | null` and no row column leaks out.
    .returning();

  const row = inserted[0];
  return row ? { id: row.id } : null;
}

// ── "À relancer" list (ACTV-05, T-34-05-04) ─────────────────────────────────

export interface FollowUpRow {
  relationshipId: string;
  companyName: string;
  siren: string | null;
  stage: string;
  nextActionAt: Date | null;
  nextActionNote: string | null;
  updatedAt: Date;
  /** 0 = due (next action passed), 1 = stale (untouched for 30 days). */
  bucket: number;
}

/**
 * The stages that never need chasing: a lost relationship and a closed one
 * are both finished. Fixed here, in the query, so 34-11's home card and
 * 34-12's walkthrough read the rule rather than re-deriving it.
 */
const FOLLOW_UP_EXCLUDED_STAGES = ['perdu', 'signe', 'debloque'] as const;

/** Untouched for this long, with no next action planned, counts as stale. */
const STALE_AFTER = "interval '30 days'";

/**
 * ACTV-05 — the caller's own relationships needing a follow-up, as ONE
 * statement.
 *
 * CANDIDATE SET: the caller's relationships whose stage is not one of
 * `perdu` / `signe` / `debloque`, AND that are either
 *   - DUE:   `next_action_at IS NOT NULL AND next_action_at <= now()`, or
 *   - STALE: `next_action_at IS NULL AND updated_at < now() - 30 days`.
 *
 * A relationship with a FUTURE `next_action_at` is neither — it is ON
 * SCHEDULE and must not appear. That is the single most likely misreading of
 * "driven by next-action date", so both halves of the disjunction are
 * spelled out rather than collapsed into a COALESCE.
 *
 * ORDER: due rows first, oldest first; then stale rows, oldest first.
 * Expressed as a computed `bucket` (0 = due, 1 = stale) ordered
 * `bucket ASC, COALESCE(next_action_at, updated_at) ASC`, so the ordering is
 * total and stable in SQL and the caller never merges two result sets — and
 * never re-sorts in TypeScript.
 *
 * WHY `updated_at` IS THE STALENESS CLOCK, not the newest event.
 * `client_relationships.updated_at` is already written by
 * `advanceRelationshipStageAction` and by every Phase 34 private-tier action.
 * Deriving staleness from `MAX(relationship_events.occurred_at)` would add a
 * join and a group-by to a home-page query, and would report a freshly
 * created relationship as stale — which is correct, and is already covered,
 * because `updated_at` equals `created_at` on a fresh row. The simpler clock
 * gives the same answer. The absence of an events join here is deliberate.
 *
 * ADMINS (T-34-05-04): the home page uses `requireUser()`, not
 * `requireRelationshipHolder()`, so this may be called with an admin's user
 * id. `ownerId` is a required parameter compiled into the WHERE, so an admin
 * — who owns no relationships — receives an empty array. It must NOT throw,
 * and it must NEVER grow an "all owners" flag or a per-caller branch.
 */
export async function listRelationshipsNeedingFollowUp(
  ownerId: string,
  limit: number,
): Promise<FollowUpRow[]> {
  const dbi = db();

  const isDue = sql`(${schema.clientRelationships.nextActionAt} IS NOT NULL AND ${schema.clientRelationships.nextActionAt} <= now())`;
  const isStale = sql`(${schema.clientRelationships.nextActionAt} IS NULL AND ${schema.clientRelationships.updatedAt} < now() - ${sql.raw(STALE_AFTER)})`;
  const bucket = sql<number>`CASE WHEN ${isDue} THEN 0 ELSE 1 END`;
  const dueThenStaleKey = sql`COALESCE(${schema.clientRelationships.nextActionAt}, ${schema.clientRelationships.updatedAt})`;

  const rows = await dbi
    .select({
      relationshipId: schema.clientRelationships.id,
      companyName: schema.companies.name,
      siren: schema.companies.siren,
      stage: schema.clientRelationships.stage,
      nextActionAt: schema.clientRelationships.nextActionAt,
      nextActionNote: schema.clientRelationships.nextActionNote,
      updatedAt: schema.clientRelationships.updatedAt,
      bucket: bucket.as('bucket'),
    })
    .from(schema.clientRelationships)
    .innerJoin(schema.companies, eq(schema.companies.id, schema.clientRelationships.companyId))
    // CRM-02: ownerId is ALWAYS the first predicate, always present, never optional.
    .where(and(
      eq(schema.clientRelationships.ownerId, ownerId),
      notInArray(schema.clientRelationships.stage, [...FOLLOW_UP_EXCLUDED_STAGES]),
      or(isDue, isStale),
    ))
    .orderBy(sql`${bucket} ASC`, sql`${dueThenStaleKey} ASC`)
    .limit(limit);

  return rows.map((r) => ({
    relationshipId: r.relationshipId,
    companyName: r.companyName,
    siren: r.siren,
    stage: r.stage,
    nextActionAt: r.nextActionAt,
    nextActionNote: r.nextActionNote,
    updatedAt: r.updatedAt,
    bucket: Number(r.bucket),
  }));
}

// @vitest-environment node
/**
 * INTEGRATION TEST — real Postgres required.
 *
 * WHAT THIS PROVES THAT `momentum.test.ts` CANNOT. Every unit test in this
 * repo mocks the Postgres driver, so a mocked test can prove a WHERE clause
 * was COMPOSED — that `eq(schema.clientRelationships.ownerId, ownerId)`
 * appears in the call — and can never prove the resulting JOIN actually
 * FILTERS at runtime. Two real production defects shipped this exact week
 * through precisely that gap (see
 * `relationship-events.insert.integration.test.ts`'s header): both Drizzle
 * query builders type-checked, passed 2200+ mocked tests, and mis-behaved on
 * every real call. Phase 35's `momentum.ts` adds a new owner-scoped
 * aggregate over a week window whose entire purpose is not to leak across
 * partners — the strongest candidate in this repo for this treatment.
 *
 * This suite proves, against a real database:
 *   - Owner isolation for all three exported functions, including through a
 *     company two partners both hold (the sharpest leak shape: a join keyed
 *     on the company rather than the relationship returns both books).
 *   - The week window is half-open (`lt`, never `lte`, at the exclusive end).
 *   - D-11: a move to Perdu is shown in the week's movements but produces no
 *     progress week key (closes the "cycle deals to Perdu to fake a streak"
 *     gaming route).
 *   - D-01: a note and a next-action-date event appear in neither result set.
 *   - Admin/nonexistent-id indistinguishability at the query layer (D-15
 *     defensive cover, even though the page-level gate means this call
 *     should never happen in production).
 *
 * "The test passes" is not the deliverable here — see this plan's Task 3 for
 * the three required mutation verifications (owner predicate, Perdu
 * exclusion, window exclusivity), each of which must make a NAMED test in
 * this file fail.
 *
 * Setup:
 *   1. Apply migrations through the latest Phase 34/35 migration to a
 *      dev/preview Postgres (e.g. the Neon `development` branch — see
 *      `docs/operations/neon-branch-routing.md`).
 *   2. Export BOTH `DATABASE_URL` and `DATABASE_URL_TEST` to that SAME DB
 *      URL — the query module under test reads `DATABASE_URL` through
 *      `@/lib/db`'s lazy singleton, while the raw seeding/cleanup client in
 *      this file reads `DATABASE_URL_TEST` directly. They MUST point at the
 *      same database or the assertions below are meaningless.
 *   3. Run:
 *        DATABASE_URL=$DEV_DB_URL DATABASE_URL_TEST=$DEV_DB_URL npx vitest run \
 *          src/lib/db/queries/momentum.isolation.integration.test.ts
 *
 * If `DATABASE_URL_TEST` is unset, the entire describe block SKIPS — CI
 * stays green without the env var, and this suite is never wired into
 * `npm test`, CI, or any package script.
 *
 * NEVER POINT THIS AT PRODUCTION. This suite INSERTs and DELETEs rows in
 * `users`, `companies`, `client_relationships` and `relationship_events`.
 * The production pooled endpoint is `ep-icy-boat-alx5o1tz-pooler...` (see
 * `docs/operations/neon-branch-routing.md`) — if `DATABASE_URL_TEST`
 * resolves to that host, do not run this file.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { currentWeekWindow, shiftWeekKey } from '@/lib/momentum/window';

// The real query module under test `import 'server-only'`, which throws
// outside a Next.js server render — mock it as a no-op, same pattern every
// integration suite in this directory uses.
vi.mock('server-only', () => ({}));

const {
  listWeeklyMovementsForOwner,
  listProgressWeekKeysForOwner,
  getBadgeCountsForOwner,
} = await import('./momentum');
const { __resetDbForTests } = await import('@/lib/db');

const DATABASE_URL_TEST = process.env.DATABASE_URL_TEST;
const shouldRun = !!DATABASE_URL_TEST;

if (!shouldRun) {
  console.log(
    '[integration] DATABASE_URL_TEST not set — skipping momentum owner-isolation test. '
    + 'Set it (and DATABASE_URL, to the same value) to your dev/preview DB to run.',
  );
}

describe.skipIf(!shouldRun)(
  'momentum — owner isolation, week-window and progress-vocabulary correctness (real Postgres)',
  () => {
    let sql: ReturnType<typeof postgres>;

    const runId = randomUUID();
    const userAId = `mom-iso-a-${runId}`;
    const userBId = `mom-iso-b-${runId}`;
    const userAdminId = `mom-iso-admin-${runId}`;

    let companyAOnlyId: string;
    let companyBOnlyId: string;
    let companySharedId: string;
    let companyPerduOnlyId: string;
    let companyVocabOnlyId: string;

    let relAOnlyId: string;
    let relBOnlyId: string;
    let relASharedId: string;
    let relBSharedId: string;
    let relAPerduOnlyId: string;
    let relAVocabOnlyId: string;

    const eventIds: string[] = [];
    let eventAOnlyForwardId: string; // A's win.start forward move — a private value probed against B's results.

    const companyAOnlyName = `A-Only Momentum Co ${runId}`;
    const companyBOnlyName = `B-Only Momentum Co ${runId}`;
    const companySharedName = `Shared Momentum Co ${runId}`;
    const companyPerduOnlyName = `Perdu-Only Momentum Co ${runId}`;
    const companyVocabOnlyName = `Vocab-Only Momentum Co ${runId}`;

    const A_PRIVATE_NOTE_BODY = `A private momentum note ${runId}`;
    const WON_PROPOSAL_ID = randomUUID();
    const FINALIZED_PROPOSAL_ID = randomUUID();

    // ── The one window definition every assertion below is built against ──
    const NOW_MS = Date.parse('2026-09-09T10:00:00Z');
    const win = currentWeekWindow(NOW_MS);
    // Nested `currentWeekWindow` calls (never raw millisecond subtraction —
    // DST-unsafe) walk backwards one calendar week at a time.
    const prevWin = currentWeekWindow(win.start.getTime() - 1);
    const prev2Win = currentWeekWindow(prevWin.start.getTime() - 1);
    const prev3Win = currentWeekWindow(prev2Win.start.getTime() - 1);

    const T_BEFORE_START = new Date(win.start.getTime() - 1);
    const T_START = win.start;
    const T_PLUS_1H = new Date(win.start.getTime() + 1 * 3_600_000);
    const T_PLUS_1H30 = new Date(win.start.getTime() + 1.5 * 3_600_000);
    const T_PLUS_1H45 = new Date(win.start.getTime() + 1.75 * 3_600_000);
    const T_PLUS_2H = new Date(win.start.getTime() + 2 * 3_600_000);
    const T_PLUS_2H15 = new Date(win.start.getTime() + 2.25 * 3_600_000);
    const T_PLUS_3H = new Date(win.start.getTime() + 3 * 3_600_000);
    const T_END_MINUS_1 = new Date(win.end.getTime() - 1);
    const T_END = win.end;
    const T_PREV_WEEK_MID = new Date(prevWin.start.getTime() + 12 * 3_600_000);
    const T_VOCAB_ONLY_WEEK_MID = new Date(prev2Win.start.getTime() + 12 * 3_600_000);
    const T_PERDU_ONLY_WEEK_MID = new Date(prev3Win.start.getTime() + 12 * 3_600_000);

    async function insertEvent(opts: {
      relationshipId: string;
      kind: string;
      actorId: string;
      occurredAt: Date;
      body?: string | null;
      payload?: Record<string, string> | null;
    }): Promise<string> {
      // Use `sql.json(...)`, not a pre-`JSON.stringify`'d string cast to
      // `::jsonb` — the `postgres` driver JSON-encodes an object bind
      // parameter exactly once when told it's JSON. Pre-stringifying and
      // casting the resulting TEXT to `::jsonb` double-encodes it (the
      // driver still JSON-encodes the already-JSON string), storing a jsonb
      // STRING SCALAR rather than an object — `payload->>'toStage'` then
      // silently returns NULL forever. Found and fixed while writing this
      // suite; verify with a raw `SELECT payload` if this ever regresses.
      const rows = await sql<Array<{ id: string }>>`
        INSERT INTO relationship_events (client_relationship_id, kind, actor_id, occurred_at, body, payload)
        VALUES (
          ${opts.relationshipId}, ${opts.kind}, ${opts.actorId}, ${opts.occurredAt},
          ${opts.body ?? null}, ${sql.json(opts.payload ?? null)}
        )
        RETURNING id
      `;
      const id = rows[0]!.id;
      eventIds.push(id);
      return id;
    }

    beforeAll(async () => {
      sql = postgres(DATABASE_URL_TEST!, {
        max: 1,
        prepare: false,
        onnotice: () => {},
      });

      // __resetDbForTests ensures the app's memoized `db()` singleton (read
      // by the query functions under test) re-reads DATABASE_URL fresh.
      __resetDbForTests();

      // Sanity on the fixture arithmetic itself — a DST-unsafe subtraction
      // here would silently misplace every event seeded below.
      expect(prevWin.key).toBe(shiftWeekKey(win.key, -1));
      expect(prev3Win.key).toBe(shiftWeekKey(win.key, -3));

      await sql`
        INSERT INTO users (id, email, role, partner_type)
        VALUES
          (${userAId}, ${`${userAId}@example.test`}, 'partner', 'Partenaire'),
          (${userBId}, ${`${userBId}@example.test`}, 'partner', 'Partenaire'),
          (${userAdminId}, ${`${userAdminId}@example.test`}, 'admin', 'Partenaire')
      `;

      const [aOnly] = await sql<Array<{ id: string }>>`
        INSERT INTO companies (name) VALUES (${companyAOnlyName}) RETURNING id
      `;
      companyAOnlyId = aOnly!.id;

      const [bOnly] = await sql<Array<{ id: string }>>`
        INSERT INTO companies (name) VALUES (${companyBOnlyName}) RETURNING id
      `;
      companyBOnlyId = bOnly!.id;

      const [shared] = await sql<Array<{ id: string }>>`
        INSERT INTO companies (name) VALUES (${companySharedName}) RETURNING id
      `;
      companySharedId = shared!.id;

      const [perduOnly] = await sql<Array<{ id: string }>>`
        INSERT INTO companies (name) VALUES (${companyPerduOnlyName}) RETURNING id
      `;
      companyPerduOnlyId = perduOnly!.id;

      const [vocabOnly] = await sql<Array<{ id: string }>>`
        INSERT INTO companies (name) VALUES (${companyVocabOnlyName}) RETURNING id
      `;
      companyVocabOnlyId = vocabOnly!.id;

      const [relAOnly] = await sql<Array<{ id: string }>>`
        INSERT INTO client_relationships (company_id, owner_id) VALUES (${companyAOnlyId}, ${userAId}) RETURNING id
      `;
      relAOnlyId = relAOnly!.id;

      const [relBOnly] = await sql<Array<{ id: string }>>`
        INSERT INTO client_relationships (company_id, owner_id) VALUES (${companyBOnlyId}, ${userBId}) RETURNING id
      `;
      relBOnlyId = relBOnly!.id;

      const [relAShared] = await sql<Array<{ id: string }>>`
        INSERT INTO client_relationships (company_id, owner_id) VALUES (${companySharedId}, ${userAId}) RETURNING id
      `;
      relASharedId = relAShared!.id;

      const [relBShared] = await sql<Array<{ id: string }>>`
        INSERT INTO client_relationships (company_id, owner_id) VALUES (${companySharedId}, ${userBId}) RETURNING id
      `;
      relBSharedId = relBShared!.id;

      const [relAPerduOnly] = await sql<Array<{ id: string }>>`
        INSERT INTO client_relationships (company_id, owner_id) VALUES (${companyPerduOnlyId}, ${userAId}) RETURNING id
      `;
      relAPerduOnlyId = relAPerduOnly!.id;

      const [relAVocabOnly] = await sql<Array<{ id: string }>>`
        INSERT INTO client_relationships (company_id, owner_id) VALUES (${companyVocabOnlyId}, ${userAId}) RETURNING id
      `;
      relAVocabOnlyId = relAVocabOnly!.id;

      // ── Events ──────────────────────────────────────────────────────────

      // win.start — a forward move on A's A-only relationship. Inside the
      // window; also this plan's probed "A private value" #3 below.
      eventAOnlyForwardId = await insertEvent({
        relationshipId: relAOnlyId,
        kind: 'stage_changed',
        actorId: userAId,
        occurredAt: T_START,
        payload: { fromStage: 'qualifie', toStage: 'negociation' },
      });

      // win.start - 1ms — a forward move on A, one millisecond BEFORE the
      // window. Excluded by the boundary, not by kind.
      await insertEvent({
        relationshipId: relAOnlyId,
        kind: 'stage_changed',
        actorId: userAId,
        occurredAt: T_BEFORE_START,
        payload: { fromStage: 'prospect', toStage: 'qualifie' },
      });

      // win.end - 1ms — a proposal_finalized on A's SHARED relationship, the
      // last instant inside the window.
      await insertEvent({
        relationshipId: relASharedId,
        kind: 'proposal_finalized',
        actorId: userAId,
        occurredAt: T_END_MINUS_1,
        payload: { proposalId: FINALIZED_PROPOSAL_ID, lcRef: `LC-MOM-A-${runId}` },
      });

      // win.end exactly — a forward move on A. Belongs to NEXT week; the
      // `lt` vs `lte` discriminator.
      await insertEvent({
        relationshipId: relAOnlyId,
        kind: 'stage_changed',
        actorId: userAId,
        occurredAt: T_END,
        payload: { fromStage: 'prospect', toStage: 'qualifie' },
      });

      // win.start + 1h — negociation -> perdu on A's SHARED relationship.
      // Shown (it's a real movement) but must not count as progress (D-11).
      await insertEvent({
        relationshipId: relASharedId,
        kind: 'stage_changed',
        actorId: userAId,
        occurredAt: T_PLUS_1H,
        payload: { fromStage: 'negociation', toStage: 'perdu' },
      });

      // win.start + 2h — a note (D-01 vocabulary: never shown, never counts).
      await insertEvent({
        relationshipId: relAOnlyId,
        kind: 'note',
        actorId: userAId,
        occurredAt: T_PLUS_2H,
        body: A_PRIVATE_NOTE_BODY,
      });

      // win.start + 2h15 — a next_action_set (D-01 vocabulary: same as above).
      await insertEvent({
        relationshipId: relAOnlyId,
        kind: 'next_action_set',
        actorId: userAId,
        occurredAt: T_PLUS_2H15,
        payload: { note: 'Relance planifiée' },
      });

      // win.start + 3h — outcome_set won, on A's A-only relationship.
      await insertEvent({
        relationshipId: relAOnlyId,
        kind: 'outcome_set',
        actorId: userAId,
        occurredAt: T_PLUS_3H,
        payload: { proposalId: WON_PROPOSAL_ID, outcome: 'won', outcomeDate: T_PLUS_3H.toISOString() },
      });

      // B's own book — a forward move on B-only and on B's shared
      // relationship, both inside the SAME window. Neither company name nor
      // relationship id here may ever surface in A's results.
      await insertEvent({
        relationshipId: relBOnlyId,
        kind: 'stage_changed',
        actorId: userBId,
        occurredAt: T_PLUS_1H30,
        payload: { fromStage: 'prospect', toStage: 'qualifie' },
      });
      await insertEvent({
        relationshipId: relBSharedId,
        kind: 'stage_changed',
        actorId: userBId,
        occurredAt: T_PLUS_1H45,
        payload: { fromStage: 'qualifie', toStage: 'negociation' },
      });

      // Previous week, Monday + 12h — a forward move on A's A-only
      // relationship, so A has two consecutive progress weeks.
      await insertEvent({
        relationshipId: relAOnlyId,
        kind: 'stage_changed',
        actorId: userAId,
        occurredAt: T_PREV_WEEK_MID,
        payload: { fromStage: 'prospect', toStage: 'qualifie' },
      });

      // Two weeks back, Monday + 12h — A's ONLY events on this dedicated
      // relationship are a note + a next_action_set. D-01 decisive proof:
      // this week must never surface as a progress week key.
      await insertEvent({
        relationshipId: relAVocabOnlyId,
        kind: 'note',
        actorId: userAId,
        occurredAt: T_VOCAB_ONLY_WEEK_MID,
        body: 'vocab-only note',
      });
      await insertEvent({
        relationshipId: relAVocabOnlyId,
        kind: 'next_action_set',
        actorId: userAId,
        occurredAt: T_VOCAB_ONLY_WEEK_MID,
        payload: { note: 'Relance planifiée' },
      });

      // Three weeks back, Monday + 12h — A's ONLY event on this dedicated
      // relationship is a negociation -> perdu move. D-11 decisive proof:
      // this week must never surface as a progress week key either.
      await insertEvent({
        relationshipId: relAPerduOnlyId,
        kind: 'stage_changed',
        actorId: userAId,
        occurredAt: T_PERDU_ONLY_WEEK_MID,
        payload: { fromStage: 'negociation', toStage: 'perdu' },
      });
    });

    afterAll(async () => {
      if (!sql) return;
      // FK-safe order: relationship_events -> client_relationships -> companies -> users.
      if (eventIds.length) await sql`DELETE FROM relationship_events WHERE id = ANY(${eventIds})`;
      await sql`
        DELETE FROM client_relationships
        WHERE id = ANY(${[
          relAOnlyId, relBOnlyId, relASharedId, relBSharedId, relAPerduOnlyId, relAVocabOnlyId,
        ].filter(Boolean)})
      `;
      await sql`
        DELETE FROM companies
        WHERE id = ANY(${[
          companyAOnlyId, companyBOnlyId, companySharedId, companyPerduOnlyId, companyVocabOnlyId,
        ].filter(Boolean)})
      `;
      await sql`DELETE FROM users WHERE id = ANY(${[userAId, userBId, userAdminId]})`;
      await sql.end({ timeout: 5 });
    });

    // ── 1. Owner isolation, positive + negative (the headline claim) ───────

    it('assertion 1 (THE HEADLINE CLAIM): B\'s movements never carry a trace of A\'s book', async () => {
      const aResult = await listWeeklyMovementsForOwner(userAId, win, 5);
      expect(aResult.rows.length).toBeGreaterThan(0);
      expect(aResult.rows.every((r) => [relAOnlyId, relASharedId].includes(r.relationshipId))).toBe(true);

      const bResult = await listWeeklyMovementsForOwner(userBId, win, 5);
      const bSerialized = JSON.stringify(bResult);

      // At least three of A's private values, checked against the SERIALIZED
      // payload — not just enumerated fields — so a leak through an unnamed
      // field is still caught.
      expect(bSerialized).not.toContain(companyAOnlyName);
      expect(bSerialized).not.toContain(relASharedId);
      expect(bSerialized).not.toContain(eventAOnlyForwardId);
    });

    // ── 2. The shared company does not bridge owners ───────────────────────

    it('assertion 2: the shared company does not bridge owners', async () => {
      const aResult = await listWeeklyMovementsForOwner(userAId, win, 10);
      const bResult = await listWeeklyMovementsForOwner(userBId, win, 10);

      const aSharedRow = aResult.rows.find((r) => r.companyName === companySharedName);
      const bSharedRow = bResult.rows.find((r) => r.companyName === companySharedName);

      expect(aSharedRow?.relationshipId).toBe(relASharedId);
      expect(bSharedRow?.relationshipId).toBe(relBSharedId);

      expect(JSON.stringify(aResult)).not.toContain(relBSharedId);
      expect(JSON.stringify(bResult)).not.toContain(relASharedId);
    });

    // ── 3. Week boundary is half-open ───────────────────────────────────────

    it('assertion 3: the week boundary is half-open — win.start included, win.end excluded', async () => {
      const aResult = await listWeeklyMovementsForOwner(userAId, win, 10);
      const occurredTimes = aResult.rows.map((r) => r.occurredAt.getTime());

      expect(occurredTimes).toContain(T_START.getTime());
      expect(occurredTimes).toContain(T_END_MINUS_1.getTime());
      expect(occurredTimes).not.toContain(T_BEFORE_START.getTime());
      expect(occurredTimes).not.toContain(T_END.getTime());
    });

    // ── 4. total reports the full window, rows is capped ────────────────────

    it('assertion 4: total reports the full window while rows is capped at limit', async () => {
      const capped = await listWeeklyMovementsForOwner(userAId, win, 2);
      expect(capped.rows).toHaveLength(2);
      // A's in-window movement rows: win.start forward move, win.end-1ms
      // finalize, win.start+1h perdu move = 3. win.end itself is excluded
      // (assertion 3); the note/next_action_set/outcome_set rows are not
      // MOVEMENT_KINDS at all.
      expect(capped.total).toBe(3);

      const uncapped = await listWeeklyMovementsForOwner(userAId, win, 10);
      expect(uncapped.rows).toHaveLength(3);
      expect(uncapped.total).toBe(3);
    });

    // ── 5. D-11 behavioural proof ────────────────────────────────────────────

    it('assertion 5 (D-11): the Perdu move IS shown, but a Perdu-only week produces no progress week key', async () => {
      const aResult = await listWeeklyMovementsForOwner(userAId, win, 10);
      const perduRow = aResult.rows.find((r) => r.toStage === 'perdu');
      expect(perduRow).toBeDefined();
      expect(perduRow?.relationshipId).toBe(relASharedId);

      const weekKeys = await listProgressWeekKeysForOwner(userAId);
      expect(weekKeys).toContain(win.key);
      expect(weekKeys).toContain(prevWin.key);
      // The dedicated Perdu-only relationship's week must be decisively
      // absent — its only event is a move to Perdu.
      expect(weekKeys).not.toContain(prev3Win.key);
    });

    // ── 6. D-01 vocabulary proof ─────────────────────────────────────────────

    it('assertion 6 (D-01): a note and a next_action_set event appear in neither result set', async () => {
      const aResult = await listWeeklyMovementsForOwner(userAId, win, 10);
      expect(aResult.rows.every((r) => r.kind === 'stage_changed' || r.kind === 'proposal_finalized')).toBe(true);
      expect(JSON.stringify(aResult)).not.toContain(A_PRIVATE_NOTE_BODY);

      const weekKeys = await listProgressWeekKeysForOwner(userAId);
      // The dedicated note+next_action_set-only relationship's week must be
      // decisively absent — it earns no progress week key on its own.
      expect(weekKeys).not.toContain(prev2Win.key);
    });

    // ── 7. Badge counts are owner-scoped ────────────────────────────────────

    it('assertion 7: badge counts are owner-scoped', async () => {
      const aBadges = await getBadgeCountsForOwner(userAId);
      // A's progress relationships: A-only (forward moves) + shared
      // (finalized proposal) = 2. The Perdu-only and vocab-only
      // relationships contribute nothing.
      expect(aBadges.distinctClients).toBe(2);
      expect(aBadges.wins).toBe(1);

      const bBadges = await getBadgeCountsForOwner(userBId);
      // B's own forward moves on B-only and B's shared relationship = 2.
      // B has no outcome_set event at all.
      expect(bBadges.distinctClients).toBe(2);
      expect(bBadges.wins).toBe(0);
      // A leaked aggregate (owner predicate dropped) would report every
      // relationship with a progress event in the whole table — strictly
      // more than B's own legitimate count.
      expect(bBadges.distinctClients).toBeLessThan(aBadges.distinctClients + bBadges.distinctClients);
    });

    // ── 8. Indistinguishability (defensive D-15 cover) ──────────────────────

    it('assertion 8: an admin id and a nonexistent id are indistinguishable at the query layer', async () => {
      const strangerId = randomUUID();

      const adminMovements = await listWeeklyMovementsForOwner(userAdminId, win, 5);
      const strangerMovements = await listWeeklyMovementsForOwner(strangerId, win, 5);
      expect(adminMovements).toStrictEqual(strangerMovements);
      expect(adminMovements).toStrictEqual({ rows: [], total: 0 });

      const adminWeekKeys = await listProgressWeekKeysForOwner(userAdminId);
      const strangerWeekKeys = await listProgressWeekKeysForOwner(strangerId);
      expect(adminWeekKeys).toStrictEqual(strangerWeekKeys);
      expect(adminWeekKeys).toStrictEqual([]);

      const adminBadges = await getBadgeCountsForOwner(userAdminId);
      const strangerBadges = await getBadgeCountsForOwner(strangerId);
      expect(adminBadges).toStrictEqual(strangerBadges);
      expect(adminBadges).toStrictEqual({ distinctClients: 0, wins: 0 });
    });

    // ── 9. No write side effects ─────────────────────────────────────────────

    it('assertion 9 (D-03): the read layer wrote nothing — the seeded event count is unchanged', async () => {
      const allRelationshipIds = [
        relAOnlyId, relBOnlyId, relASharedId, relBSharedId, relAPerduOnlyId, relAVocabOnlyId,
      ];
      const rows = await sql<Array<{ n: number }>>`
        SELECT count(*)::int AS n FROM relationship_events
        WHERE client_relationship_id = ANY(${allRelationshipIds})
      `;
      expect(rows[0]?.n).toBe(eventIds.length);
    });
  },
);

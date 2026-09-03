// @vitest-environment node
/**
 * INTEGRATION TEST — real Postgres required.
 *
 * This is the requirement-level proof for CRM-02 (owner isolation) and
 * CRM-03 (admin breadth) — source-level unit assertions in
 * client-relationships.test.ts / companies.test.ts prove the WHERE clause is
 * COMPOSED correctly, but only a real database round-trip can prove the JOIN
 * is not silently wrong.
 *
 * Setup (beforeAll):
 *   - Two partner users (A, B), unique timestamped emails.
 *   - One company ("shared") with a `client_relationships` row for BOTH A
 *     and B — proves CRM-03's admin breadth (an admin sees every holder of a
 *     shared company).
 *   - One SECOND company ("A-only") with a `client_relationships` row for A
 *     ONLY — this is the relationship B repeatedly probes and must never see
 *     any trace of. One contact and one finalized ('active') proposal are
 *     attached to A's A-only relationship, so the isolation probes exercise
 *     real joined data, not empty tables.
 *
 * Cleanup (afterAll) in FK-safe order: contacts → proposals →
 * client_relationships → companies → users.
 *
 * Setup:
 *   1. Apply `drizzle/0007_phase30_crm_registry.sql` to a dev/preview
 *      Postgres (e.g. Neon development branch).
 *   2. Export BOTH `DATABASE_URL` and `DATABASE_URL_TEST` to that DB URL —
 *      the query functions under test read `DATABASE_URL` via `@/lib/db`'s
 *      lazy singleton; the raw seeding/cleanup client in this file reads
 *      `DATABASE_URL_TEST` directly. They MUST point at the same database.
 *   3. Run:
 *        DATABASE_URL=$DEV_DB_URL DATABASE_URL_TEST=$DEV_DB_URL npx vitest run \
 *          src/lib/db/queries/client-relationships.isolation.integration.test.ts
 *
 * If `DATABASE_URL_TEST` is unset, the entire describe block SKIPS — CI
 * stays green even without the env var.
 *
 * Production caveat: do NOT point DATABASE_URL_TEST at production. The
 * skip-by-default pattern protects against accidental prod runs. This test
 * inserts and deletes rows in `users` / `companies` / `client_relationships`
 * / `contacts` / `proposals` — never run it anywhere the data matters.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { PIPELINE_STAGES } from '@/lib/pipeline/stages';

// The real query modules under test `import 'server-only'`, which throws
// outside a Next.js server render — mock it as a no-op, same pattern used by
// every unit test in this directory (this is the first integration test to
// import the app's own `server-only`-guarded query functions rather than
// talking to Postgres exclusively through the raw `postgres` client).
vi.mock('server-only', () => ({}));

const {
  getClientRelationshipForOwner,
  listClientBook,
  listContactsForRelationship,
} = await import('./client-relationships');
const { listRelationshipsForCompany } = await import('./companies');
const { listPipelineBoard, getConversionRateForOwner } = await import('./pipeline');
const { __resetDbForTests } = await import('@/lib/db');

const DATABASE_URL_TEST = process.env.DATABASE_URL_TEST;
const shouldRun = !!DATABASE_URL_TEST;

if (!shouldRun) {
  console.log(
    '[integration] DATABASE_URL_TEST not set — skipping CRM-02/CRM-03 isolation test. '
    + 'Set it (and DATABASE_URL, to the same value) to your dev/preview DB to run.',
  );
}

describe.skipIf(!shouldRun)(
  'client-relationships / companies — cross-tenant isolation (real Postgres)',
  () => {
    let sql: ReturnType<typeof postgres>;

    const runId = Date.now();
    const userAId = `crm-iso-test-a-${runId}`;
    const userBId = `crm-iso-test-b-${runId}`;
    let companySharedId: string;
    let companyAOnlyId: string;
    let relASharedId: string;
    let relBSharedId: string;
    let relAOnlyId: string;
    let contactId: string;
    let proposalId: string;

    const companyAOnlyName = `A-Only Isolation Co ${runId}`;

    beforeAll(async () => {
      sql = postgres(DATABASE_URL_TEST!, {
        max: 1,
        prepare: false,
        onnotice: () => {},
      });

      // __resetDbForTests ensures the app's memoized `db()` singleton (read
      // by the query functions under test) re-reads DATABASE_URL fresh —
      // relevant if a prior test run in the same process already memoized a
      // connection.
      __resetDbForTests();

      await sql`
        INSERT INTO users (id, email, role, partner_type)
        VALUES
          (${userAId}, ${`${userAId}@example.test`}, 'partner', 'Partenaire'),
          (${userBId}, ${`${userBId}@example.test`}, 'partner', 'Partenaire')
      `;

      const shared = await sql<Array<{ id: string }>>`
        INSERT INTO companies (name) VALUES (${`Shared Isolation Co ${runId}`}) RETURNING id
      `;
      companySharedId = shared[0]!.id;

      const aOnly = await sql<Array<{ id: string }>>`
        INSERT INTO companies (name) VALUES (${companyAOnlyName}) RETURNING id
      `;
      companyAOnlyId = aOnly[0]!.id;

      const relAShared = await sql<Array<{ id: string }>>`
        INSERT INTO client_relationships (company_id, owner_id)
        VALUES (${companySharedId}, ${userAId}) RETURNING id
      `;
      relASharedId = relAShared[0]!.id;

      const relBShared = await sql<Array<{ id: string }>>`
        INSERT INTO client_relationships (company_id, owner_id)
        VALUES (${companySharedId}, ${userBId}) RETURNING id
      `;
      relBSharedId = relBShared[0]!.id;

      const relAOnly = await sql<Array<{ id: string }>>`
        INSERT INTO client_relationships (company_id, owner_id)
        VALUES (${companyAOnlyId}, ${userAId}) RETURNING id
      `;
      relAOnlyId = relAOnly[0]!.id;

      const contact = await sql<Array<{ id: string }>>`
        INSERT INTO contacts (client_relationship_id, name, role, phone, email)
        VALUES (${relAOnlyId}, 'Isolation Test Contact', 'Achats', '0600000000', 'contact@a-only.test')
        RETURNING id
      `;
      contactId = contact[0]!.id;

      const paramsSnapshot = JSON.stringify({
        commissionPct: '5.0000',
        maxAmount: '100000.00',
        validityDays: 30,
        coefficients: {
          t1: { 36: '0.0300', 48: '0.0250', 60: '0.0200' },
          t2: { 36: '0.0300', 48: '0.0250', 60: '0.0200' },
          t3: { 36: '0.0300', 48: '0.0250', 60: '0.0200' },
          t4: { 36: '0.0300', 48: '0.0250', 60: '0.0200' },
        },
        partnerType: 'Partenaire',
        commissionApplied: true,
      });
      const computed = JSON.stringify({ loyerHT: 543.21 });

      const proposal = await sql<Array<{ id: string }>>`
        INSERT INTO proposals (
          user_id, status, language, lc_ref, idempotency_key,
          inputs, params_snapshot, computed, client_relationship_id
        ) VALUES (
          ${userAId}, 'active', 'fr', ${`LC-ISO-${runId}`}, ${randomUUID()},
          '{}'::jsonb, ${paramsSnapshot}::jsonb, ${computed}::jsonb, ${relAOnlyId}
        ) RETURNING id
      `;
      proposalId = proposal[0]!.id;
    });

    afterAll(async () => {
      if (!sql) return;
      // FK-safe order: contacts -> proposals -> client_relationships -> companies -> users.
      if (contactId) await sql`DELETE FROM contacts WHERE id = ${contactId}`;
      if (proposalId) await sql`DELETE FROM proposals WHERE id = ${proposalId}`;
      await sql`DELETE FROM client_relationships WHERE id = ANY(${[relASharedId, relBSharedId, relAOnlyId].filter(Boolean)})`;
      await sql`DELETE FROM companies WHERE id = ANY(${[companySharedId, companyAOnlyId].filter(Boolean)})`;
      await sql`DELETE FROM users WHERE id = ANY(${[userAId, userBId]})`;
      await sql.end({ timeout: 5 });
    });

    it('sanity: partner A can fetch their own A-only relationship', async () => {
      const result = await getClientRelationshipForOwner(relAOnlyId, userAId);
      expect(result?.relationshipId).toBe(relAOnlyId);
      expect(result?.companyName).toBe(companyAOnlyName);
    });

    it('sanity: partner A sees the seeded contact on their own A-only relationship', async () => {
      const result = await listContactsForRelationship(relAOnlyId, userAId);
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('Isolation Test Contact');
    });

    it('CRM-02 / T-30-04-02: partner B probing partner A\'s relationship id gets null', async () => {
      const result = await getClientRelationshipForOwner(relAOnlyId, userBId);
      expect(result).toBeNull();
    });

    it('CRM-02 / D-18: a nonexistent id and a not-owned id are indistinguishable (both null)', async () => {
      const notOwned = await getClientRelationshipForOwner(relAOnlyId, userBId);
      const nonexistent = await getClientRelationshipForOwner(randomUUID(), userBId);
      expect(notOwned).toBeNull();
      expect(nonexistent).toBeNull();
      expect(notOwned).toStrictEqual(nonexistent);
    });

    it('CRM-02: partner B\'s client book never contains partner A\'s A-only company, even when searching its exact name', async () => {
      const result = await listClientBook({ ownerId: userBId, q: companyAOnlyName });
      expect(result.rows).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
    });

    it('CRM-02: partner B\'s client book (unscoped) contains only B\'s own relationship, not A\'s', async () => {
      const result = await listClientBook({ ownerId: userBId });
      const relationshipIds = result.rows.map((r) => r.relationshipId);
      expect(relationshipIds).toContain(relBSharedId);
      expect(relationshipIds).not.toContain(relASharedId);
      expect(relationshipIds).not.toContain(relAOnlyId);
      // No aggregate leaks A's proposal/contact into B's row for the shared company.
      const sharedRow = result.rows.find((r) => r.relationshipId === relBSharedId);
      expect(sharedRow?.proposalsCount).toBe(0);
    });

    it('CRM-04: partner B probing partner A\'s relationship id for contacts gets an empty array', async () => {
      const result = await listContactsForRelationship(relAOnlyId, userBId);
      expect(result).toEqual([]);
    });

    it('CRM-03: listRelationshipsForCompany on the shared company returns BOTH partners\' relationships', async () => {
      const result = await listRelationshipsForCompany(companySharedId);
      const ownerIds = result.map((r) => r.ownerId).sort();
      expect(ownerIds).toEqual([userAId, userBId].sort());
      expect(result.every((r) => r.relationshipId === relASharedId || r.relationshipId === relBSharedId)).toBe(true);
    });
  },
);

/**
 * Phase 33 (33-08) — DB-level gate proofs plus the conversion-rate and board
 * proofs, added per 33-CONTEXT.md's "extend it rather than writing a
 * parallel one" instruction. Same file, same DATABASE_URL_TEST gate, same
 * skip-by-default guard, same `server-only` mock and `__resetDbForTests()`
 * call — but its OWN describe, its OWN runId-scoped fixtures, its OWN
 * FK-safe afterAll. It does NOT share the Phase 30 block's beforeAll: that
 * seed is asserted against by roughly a dozen existing tests above, and
 * extending it with stages/outcomes/SIREN/five more proposals would put
 * every one of those assertions at risk for no benefit (33-08-PLAN.md
 * <decision_record>).
 *
 * This block deliberately never imports `src/lib/pipeline/actions.ts` — the
 * `'use server'` directive and the auth gate fail outside a Next request
 * scope. The application half of the SIREN gate is unit-tested (mocked db())
 * in plan 33-04; this block proves the database half with no application
 * code in the path at all (D-07's belt-and-braces design).
 */
describe.skipIf(!shouldRun)(
  'pipeline — database-layer invariants (real Postgres, Phase 33)',
  () => {
    let sql: ReturnType<typeof postgres>;

    const runId = Date.now();
    const userAId = `pipe-iso-a-${runId}`;
    const userBId = `pipe-iso-b-${runId}`;
    const userCId = `pipe-iso-c-${runId}`;
    // 9-digit SIREN derived from runId so concurrent runs never collide on
    // the companies.siren unique index.
    const sirenSeed = String(runId).padStart(9, '0').slice(-9);

    let companyNoSirenId: string;
    let companyWithSirenId: string;
    let relANoSirenId: string;
    let relAWithSirenId: string;
    let relBNoSirenId: string;
    let relBWithSirenId: string;
    let relDefaultStageId: string;
    let proposalANoSirenId: string;
    let proposalAWithSirenId: string;
    let proposalLostId: string;
    let proposalDraftId: string;
    let proposalDeletedActiveId: string;
    let proposalNullRelId: string;
    let proposalBWonId: string;
    let contactAWithSiren1Id: string;
    let contactAWithSiren2Id: string;

    // Same params_snapshot/computed shape the Phase 30 seed above uses.
    const paramsSnapshot = JSON.stringify({
      commissionPct: '5.0000',
      maxAmount: '100000.00',
      validityDays: 30,
      coefficients: {
        t1: { 36: '0.0300', 48: '0.0250', 60: '0.0200' },
        t2: { 36: '0.0300', 48: '0.0250', 60: '0.0200' },
        t3: { 36: '0.0300', 48: '0.0250', 60: '0.0200' },
        t4: { 36: '0.0300', 48: '0.0250', 60: '0.0200' },
      },
      partnerType: 'Partenaire',
      commissionApplied: true,
    });
    const computed = JSON.stringify({ loyerHT: 543.21 });

    beforeAll(async () => {
      sql = postgres(DATABASE_URL_TEST!, {
        max: 1,
        prepare: false,
        onnotice: () => {},
      });

      __resetDbForTests();

      await sql`
        INSERT INTO users (id, email, role, partner_type)
        VALUES
          (${userAId}, ${`${userAId}@example.test`}, 'partner', 'Partenaire'),
          (${userBId}, ${`${userBId}@example.test`}, 'partner', 'Partenaire'),
          (${userCId}, ${`${userCId}@example.test`}, 'partner', 'Partenaire')
      `;

      const companyNoSiren = await sql<Array<{ id: string }>>`
        INSERT INTO companies (name) VALUES (${`Pipeline No-SIREN Co ${runId}`}) RETURNING id
      `;
      companyNoSirenId = companyNoSiren[0]!.id;

      const companyWithSiren = await sql<Array<{ id: string }>>`
        INSERT INTO companies (name, siren) VALUES (${`Pipeline SIREN Co ${runId}`}, ${sirenSeed}) RETURNING id
      `;
      companyWithSirenId = companyWithSiren[0]!.id;

      const relANoSiren = await sql<Array<{ id: string }>>`
        INSERT INTO client_relationships (company_id, owner_id) VALUES (${companyNoSirenId}, ${userAId}) RETURNING id
      `;
      relANoSirenId = relANoSiren[0]!.id;

      const relAWithSiren = await sql<Array<{ id: string }>>`
        INSERT INTO client_relationships (company_id, owner_id) VALUES (${companyWithSirenId}, ${userAId}) RETURNING id
      `;
      relAWithSirenId = relAWithSiren[0]!.id;

      const relBNoSiren = await sql<Array<{ id: string }>>`
        INSERT INTO client_relationships (company_id, owner_id) VALUES (${companyNoSirenId}, ${userBId}) RETURNING id
      `;
      relBNoSirenId = relBNoSiren[0]!.id;

      // B also gets a relationship on the SIREN'd company — needed so B's
      // conversion-rate fixture (below) can carry a real outcome='won' row
      // without tripping the SIREN gate.
      const relBWithSiren = await sql<Array<{ id: string }>>`
        INSERT INTO client_relationships (company_id, owner_id) VALUES (${companyWithSirenId}, ${userBId}) RETURNING id
      `;
      relBWithSirenId = relBWithSiren[0]!.id;

      const proposalANoSiren = await sql<Array<{ id: string }>>`
        INSERT INTO proposals (
          user_id, status, language, lc_ref, idempotency_key,
          inputs, params_snapshot, computed, client_relationship_id
        ) VALUES (
          ${userAId}, 'active', 'fr', ${`LC-PIPE-ISO-${runId}-A1`}, ${randomUUID()},
          '{}'::jsonb, ${paramsSnapshot}::jsonb, ${computed}::jsonb, ${relANoSirenId}
        ) RETURNING id
      `;
      proposalANoSirenId = proposalANoSiren[0]!.id;

      const proposalAWithSiren = await sql<Array<{ id: string }>>`
        INSERT INTO proposals (
          user_id, status, language, lc_ref, idempotency_key,
          inputs, params_snapshot, computed, client_relationship_id
        ) VALUES (
          ${userAId}, 'active', 'fr', ${`LC-PIPE-ISO-${runId}-A2`}, ${randomUUID()},
          '{}'::jsonb, ${paramsSnapshot}::jsonb, ${computed}::jsonb, ${relAWithSirenId}
        ) RETURNING id
      `;
      proposalAWithSirenId = proposalAWithSiren[0]!.id;

      // ── Task 2's mixed dataset: one row of every excluded category, plus
      // a second proposal on relAWithSiren so its card's proposalsCount can
      // prove DISTINCT (2), not a contacts×proposals cartesian product. ──

      const proposalLost = await sql<Array<{ id: string }>>`
        INSERT INTO proposals (
          user_id, status, language, lc_ref, idempotency_key,
          inputs, params_snapshot, computed, client_relationship_id,
          outcome, outcome_date
        ) VALUES (
          ${userAId}, 'active', 'fr', ${`LC-PIPE-ISO-${runId}-A3`}, ${randomUUID()},
          '{}'::jsonb, ${paramsSnapshot}::jsonb, ${computed}::jsonb, ${relAWithSirenId},
          'lost', now()
        ) RETURNING id
      `;
      proposalLostId = proposalLost[0]!.id;

      const proposalDraft = await sql<Array<{ id: string }>>`
        INSERT INTO proposals (
          user_id, status, language,
          inputs, params_snapshot, computed, client_relationship_id
        ) VALUES (
          ${userAId}, 'draft', 'fr',
          '{}'::jsonb, ${paramsSnapshot}::jsonb, ${computed}::jsonb, ${relANoSirenId}
        ) RETURNING id
      `;
      proposalDraftId = proposalDraft[0]!.id;

      const proposalDeletedActive = await sql<Array<{ id: string }>>`
        INSERT INTO proposals (
          user_id, status, language, lc_ref, idempotency_key,
          inputs, params_snapshot, computed, client_relationship_id, deleted_at
        ) VALUES (
          ${userAId}, 'active', 'fr', ${`LC-PIPE-ISO-${runId}-A4`}, ${randomUUID()},
          '{}'::jsonb, ${paramsSnapshot}::jsonb, ${computed}::jsonb, ${relANoSirenId}, now()
        ) RETURNING id
      `;
      proposalDeletedActiveId = proposalDeletedActive[0]!.id;

      const proposalNullRel = await sql<Array<{ id: string }>>`
        INSERT INTO proposals (
          user_id, status, language, lc_ref, idempotency_key,
          inputs, params_snapshot, computed, client_relationship_id
        ) VALUES (
          ${userAId}, 'active', 'fr', ${`LC-PIPE-ISO-${runId}-A5`}, ${randomUUID()},
          '{}'::jsonb, ${paramsSnapshot}::jsonb, ${computed}::jsonb, NULL
        ) RETURNING id
      `;
      proposalNullRelId = proposalNullRel[0]!.id;

      // Partner B's own won proposal — proves D-12: B's numbers must never
      // move A's numerator/denominator.
      const proposalBWon = await sql<Array<{ id: string }>>`
        INSERT INTO proposals (
          user_id, status, language, lc_ref, idempotency_key,
          inputs, params_snapshot, computed, client_relationship_id,
          outcome, outcome_date
        ) VALUES (
          ${userBId}, 'active', 'fr', ${`LC-PIPE-ISO-${runId}-B1`}, ${randomUUID()},
          '{}'::jsonb, ${paramsSnapshot}::jsonb, ${computed}::jsonb, ${relBWithSirenId},
          'won', now()
        ) RETURNING id
      `;
      proposalBWonId = proposalBWon[0]!.id;

      const contacts = await sql<Array<{ id: string }>>`
        INSERT INTO contacts (client_relationship_id, name, role, phone, email)
        VALUES
          (${relAWithSirenId}, 'Pipeline Contact One', 'Achats', '0600000001', ${`contact1-${runId}@a-siren.test`}),
          (${relAWithSirenId}, 'Pipeline Contact Two', 'Direction', '0600000002', ${`contact2-${runId}@a-siren.test`})
        RETURNING id
      `;
      contactAWithSiren1Id = contacts[0]!.id;
      contactAWithSiren2Id = contacts[1]!.id;
    });

    afterAll(async () => {
      if (!sql) return;
      // FK-safe order: contacts -> proposals -> client_relationships -> companies -> users.
      const contactIds = [contactAWithSiren1Id, contactAWithSiren2Id].filter(Boolean);
      if (contactIds.length > 0) {
        await sql`DELETE FROM contacts WHERE id = ANY(${contactIds})`;
      }
      const proposalIds = [
        proposalANoSirenId,
        proposalAWithSirenId,
        proposalLostId,
        proposalDraftId,
        proposalDeletedActiveId,
        proposalNullRelId,
        proposalBWonId,
      ].filter(Boolean);
      if (proposalIds.length > 0) {
        await sql`DELETE FROM proposals WHERE id = ANY(${proposalIds})`;
      }
      const relIds = [
        relANoSirenId,
        relAWithSirenId,
        relBNoSirenId,
        relBWithSirenId,
        relDefaultStageId,
      ].filter(Boolean);
      if (relIds.length > 0) {
        await sql`DELETE FROM client_relationships WHERE id = ANY(${relIds})`;
      }
      const companyIds = [companyNoSirenId, companyWithSirenId].filter(Boolean);
      if (companyIds.length > 0) {
        await sql`DELETE FROM companies WHERE id = ANY(${companyIds})`;
      }
      await sql`DELETE FROM users WHERE id = ANY(${[userAId, userBId, userCId]})`;
      await sql.end({ timeout: 5 });
    });

    // ── Task 1: the SIREN gate (PIPE-05 / D-07) ─────────────────────────────

    it('PIPE-05: UPDATE outcome=won on a proposal whose company has no SIREN REJECTS', async () => {
      await expect(
        sql`UPDATE proposals SET outcome = 'won', outcome_date = now() WHERE id = ${proposalANoSirenId}`,
      ).rejects.toThrow(/PIPE-05/);
    });

    it('PIPE-05: the same UPDATE against a proposal whose company HAS a SIREN succeeds — the gate is a gate, not a wall', async () => {
      await sql`UPDATE proposals SET outcome = 'won', outcome_date = now() WHERE id = ${proposalAWithSirenId}`;
      const row = await sql<Array<{ outcome: string; outcome_date: Date }>>`
        SELECT outcome, outcome_date FROM proposals WHERE id = ${proposalAWithSirenId}
      `;
      expect(row[0]?.outcome).toBe('won');
      expect(row[0]?.outcome_date).not.toBeNull();
    });

    it('D-08: outcome=lost never requires a SIREN — quoting/advancing is never blocked', async () => {
      await sql`UPDATE proposals SET outcome = 'lost', outcome_date = now() WHERE id = ${proposalANoSirenId}`;
      const row = await sql<Array<{ outcome: string }>>`
        SELECT outcome FROM proposals WHERE id = ${proposalANoSirenId}
      `;
      expect(row[0]?.outcome).toBe('lost');
    });

    it('PIPE-05: INSERT with outcome=won on a no-SIREN relationship REJECTS (the _ins trigger)', async () => {
      const idem = randomUUID();
      await expect(
        sql`
          INSERT INTO proposals (
            user_id, status, language, idempotency_key,
            inputs, params_snapshot, computed, client_relationship_id,
            outcome, outcome_date
          ) VALUES (
            ${userAId}, 'active', 'fr', ${idem},
            '{}'::jsonb, ${paramsSnapshot}::jsonb, ${computed}::jsonb, ${relANoSirenId},
            'won', now()
          )
        `,
      ).rejects.toThrow(/PIPE-05/);
      const leaked = await sql<Array<{ id: string }>>`SELECT id FROM proposals WHERE idempotency_key = ${idem}`;
      if (leaked.length > 0) {
        await sql`DELETE FROM proposals WHERE id = ${leaked[0]!.id}`;
      }
      expect(leaked).toHaveLength(0);
    });

    it('PIPE-05: INSERT with outcome=won and client_relationship_id=NULL REJECTS (fail-closed)', async () => {
      const idem = randomUUID();
      await expect(
        sql`
          INSERT INTO proposals (
            user_id, status, language, idempotency_key,
            inputs, params_snapshot, computed, client_relationship_id,
            outcome, outcome_date
          ) VALUES (
            ${userAId}, 'active', 'fr', ${idem},
            '{}'::jsonb, ${paramsSnapshot}::jsonb, ${computed}::jsonb, NULL,
            'won', now()
          )
        `,
      ).rejects.toThrow(/PIPE-05/);
      const leaked = await sql<Array<{ id: string }>>`SELECT id FROM proposals WHERE idempotency_key = ${idem}`;
      if (leaked.length > 0) {
        await sql`DELETE FROM proposals WHERE id = ${leaked[0]!.id}`;
      }
      expect(leaked).toHaveLength(0);
    });

    it('PIPE-05: INSERT with outcome=won pointing at a nonexistent relationship REJECTS (missing-row fail-closed branch)', async () => {
      const idem = randomUUID();
      await expect(
        sql`
          INSERT INTO proposals (
            user_id, status, language, idempotency_key,
            inputs, params_snapshot, computed, client_relationship_id,
            outcome, outcome_date
          ) VALUES (
            ${userAId}, 'active', 'fr', ${idem},
            '{}'::jsonb, ${paramsSnapshot}::jsonb, ${computed}::jsonb, ${randomUUID()},
            'won', now()
          )
        `,
      ).rejects.toThrow(/PIPE-05/);
      const leaked = await sql<Array<{ id: string }>>`SELECT id FROM proposals WHERE idempotency_key = ${idem}`;
      if (leaked.length > 0) {
        await sql`DELETE FROM proposals WHERE id = ${leaked[0]!.id}`;
      }
      expect(leaked).toHaveLength(0);
    });

    it('outcome=NULL never fires the trigger — the WHEN clause gates on won only', async () => {
      await sql`UPDATE proposals SET outcome = NULL, outcome_date = NULL WHERE id = ${proposalANoSirenId}`;
      const row = await sql<Array<{ outcome: string | null }>>`
        SELECT outcome FROM proposals WHERE id = ${proposalANoSirenId}
      `;
      expect(row[0]?.outcome).toBeNull();
    });

    // ── Task 1: the three CHECKs (PIPE-01 / PIPE-02 / D-05 / D-06) ─────────

    it('client_relationships_stage_check: an unknown stage REJECTS', async () => {
      await expect(
        sql`UPDATE client_relationships SET stage = 'not_a_stage' WHERE id = ${relANoSirenId}`,
      ).rejects.toThrow(/client_relationships_stage_check/);
    });

    it('client_relationships_stage_check: all seven D-01 stages are accepted — the reserved pair on purpose (D-04)', async () => {
      for (const stage of PIPELINE_STAGES) {
        await sql`UPDATE client_relationships SET stage = ${stage} WHERE id = ${relANoSirenId}`;
        const row = await sql<Array<{ stage: string }>>`SELECT stage FROM client_relationships WHERE id = ${relANoSirenId}`;
        expect(row[0]?.stage).toBe(stage);
      }
      // Reset: relANoSirenId is not a board-bucket fixture itself, but a
      // stray reserved-stage row here would corrupt task 2's "empty
      // signe/debloque lanes for this caller" assertion below.
      await sql`UPDATE client_relationships SET stage = 'prospect' WHERE id = ${relANoSirenId}`;
    });

    it('a freshly inserted relationship defaults to stage=prospect without naming the column', async () => {
      const fresh = await sql<Array<{ id: string }>>`
        INSERT INTO client_relationships (company_id, owner_id) VALUES (${companyNoSirenId}, ${userAId}) RETURNING id
      `;
      relDefaultStageId = fresh[0]!.id;
      const row = await sql<Array<{ stage: string }>>`SELECT stage FROM client_relationships WHERE id = ${relDefaultStageId}`;
      expect(row[0]?.stage).toBe('prospect');
    });

    it('proposals_outcome_check: outcome=unanswered is not storable (D-06 — derived, never stored)', async () => {
      await expect(
        sql`UPDATE proposals SET outcome = 'unanswered', outcome_date = now() WHERE id = ${proposalANoSirenId}`,
      ).rejects.toThrow(/proposals_outcome_check/);
    });

    it('proposals_outcome_completeness_check: outcome set without outcome_date REJECTS', async () => {
      await expect(
        sql`UPDATE proposals SET outcome = 'lost', outcome_date = NULL WHERE id = ${proposalANoSirenId}`,
      ).rejects.toThrow(/proposals_outcome_completeness_check/);
    });

    it('D-05: status can still change on a row carrying an outcome — status and outcome are orthogonal', async () => {
      await sql`UPDATE proposals SET status = 'draft' WHERE id = ${proposalAWithSirenId}`;
      const row = await sql<Array<{ status: string; outcome: string }>>`
        SELECT status, outcome FROM proposals WHERE id = ${proposalAWithSirenId}
      `;
      expect(row[0]?.status).toBe('draft');
      expect(row[0]?.outcome).toBe('won');
      // Restore — task 2's conversion-rate dataset below counts this
      // proposal in the 'active' denominator.
      await sql`UPDATE proposals SET status = 'active' WHERE id = ${proposalAWithSirenId}`;
    });

    // ── Task 2: the conversion-rate formula (PIPE-03, D-12) ─────────────────

    it('getConversionRateForOwner: the locked denominator over a dataset containing one row of every excluded category', async () => {
      const rate = await getConversionRateForOwner(userAId);
      // won: proposalAWithSiren (outcome='won'). total: proposalANoSiren
      // (active, no outcome) + proposalAWithSiren (active, won) +
      // proposalLost (active, lost) — the draft, the soft-deleted-active,
      // and the no-relationship rows are all excluded by the locked
      // denominator (33-03-PLAN.md <decision_record>).
      const expectedWon = 1;
      const expectedTotal = 3;
      expect(rate.won).toBe(expectedWon);
      expect(rate.total).toBe(expectedTotal);
      expect(rate.pct).toBe(Math.round((expectedWon / expectedTotal) * 100));
    });

    it('D-12: partner B\'s won proposal never enters partner A\'s numerator or denominator', async () => {
      const rateA = await getConversionRateForOwner(userAId);
      const rateB = await getConversionRateForOwner(userBId);
      expect(rateA.total).toBe(3);
      expect(rateB).toEqual({ won: 1, total: 1, pct: 100 });
    });

    it('a partner with no relationship-linked active proposals returns pct=null, not 0', async () => {
      const rateC = await getConversionRateForOwner(userCId);
      expect(rateC).toEqual({ won: 0, total: 0, pct: null });
      expect(rateC.pct).toBeNull();
    });

    // ── Task 2: the board (PIPE-04) ─────────────────────────────────────────

    it('listPipelineBoard: returns exactly the seven PIPELINE_STAGES keys, empty reserved lanes for this caller', async () => {
      const board = await listPipelineBoard({ ownerId: userAId });
      expect(Object.keys(board).sort()).toEqual([...PIPELINE_STAGES].sort());
      expect(board.signe).toEqual([]);
      expect(board.debloque).toEqual([]);
    });

    it('listPipelineBoard: every card belongs to the caller only, siren renders null/seeded correctly', async () => {
      const board = await listPipelineBoard({ ownerId: userAId });
      const allCards = Object.values(board).flat();
      expect(allCards.some((c) => c.relationshipId === relBNoSirenId)).toBe(false);
      expect(allCards.some((c) => c.relationshipId === relBWithSirenId)).toBe(false);

      const noSirenCard = allCards.find((c) => c.relationshipId === relANoSirenId);
      const withSirenCard = allCards.find((c) => c.relationshipId === relAWithSirenId);
      expect(noSirenCard?.siren).toBeNull();
      expect(withSirenCard?.siren).toBe(sirenSeed);
    });

    it('listPipelineBoard: contactsCount and proposalsCount are DISTINCT counts, not a cartesian product', async () => {
      const board = await listPipelineBoard({ ownerId: userAId });
      const card = Object.values(board).flat().find((c) => c.relationshipId === relAWithSirenId);
      expect(card?.contactsCount).toBe(2);
      expect(card?.proposalsCount).toBe(2);
    });

    it('listPipelineBoard: reflects a stage change end to end', async () => {
      await sql`UPDATE client_relationships SET stage = 'negociation' WHERE id = ${relAWithSirenId}`;
      const board = await listPipelineBoard({ ownerId: userAId });
      const inNegociation = board.negociation.some((c) => c.relationshipId === relAWithSirenId);
      const inProspect = board.prospect.some((c) => c.relationshipId === relAWithSirenId);
      expect(inNegociation).toBe(true);
      expect(inProspect).toBe(false);
    });
  },
);

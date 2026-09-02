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

// @vitest-environment node
/**
 * INTEGRATION TEST — real Postgres required.
 *
 * WHY THIS EXISTS, AND WHY IT IS NOT OPTIONAL. `deleteClientRelationshipAction`
 * is the only DESTRUCTIVE statement in the CRM, and it carries two predicates
 * that a mocked driver cannot evaluate: `owner_id = <caller>` and a
 * `NOT EXISTS` guard against finalized proposals. A mocked test proves the
 * WHERE was COMPOSED; only Postgres proves it FILTERS.
 *
 * Twice in one week this repo shipped a query that type-checked, passed 2229
 * mocked unit tests, and failed on every real call (the activity timeline and
 * contact creation, both Drizzle `INSERT … SELECT`). Those failed loudly. A
 * DELETE with a wrong WHERE fails QUIETLY, by removing a row it should not
 * have — one partner's client book erased from another partner's click. That
 * asymmetry is why this file exists.
 *
 * Setup:
 *   DATABASE_URL_TEST=$DEV_DB_URL DATABASE_URL=$DEV_DB_URL npx vitest run \
 *     src/lib/crm/delete-client.integration.test.ts
 *
 * The block SKIPS without `DATABASE_URL_TEST`, so CI stays green. Never point
 * it at production: this test deletes rows.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';

vi.mock('server-only', () => ({}));
// `revalidatePath` needs a Next request store, which does not exist under
// vitest. The action's cache invalidation is not what this file tests.
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const TEST_URL = process.env.DATABASE_URL_TEST;
const maybe = TEST_URL ? describe : describe.skip;

maybe('deleteClientRelationshipAction — against real Postgres', () => {
  let sql: ReturnType<typeof postgres>;
  const runId = Date.now();
  const userAId = `del-test-a-${runId}`;
  const userBId = `del-test-b-${runId}`;
  const seededCompanyIds: string[] = [];

  /**
   * Import the action with `requireRelationshipHolder` answering as `actorId`.
   * Modules are reset each time so the auth mock actually takes — a cached
   * module would silently keep the FIRST caller's identity and turn every
   * cross-partner assertion into a test of nothing.
   */
  async function actionAs(actorId: string) {
    vi.resetModules();
    vi.doMock('server-only', () => ({}));
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }));
    vi.doMock('@/lib/auth/require', () => ({
      requireRelationshipHolder: async () => ({
        session: { user: { id: actorId, email: `${actorId}@example.test` } },
        role: 'partner',
      }),
    }));
    const mod = await import('@/lib/crm/actions');
    return mod.deleteClientRelationshipAction;
  }

  /**
   * A fresh company AND relationship per test, so each destroys only its own
   * rows. A shared company will not do: `client_relationships` is
   * UNIQUE(company_id, owner_id) — one partner holds a given company at most
   * once — so a test that correctly REFUSES to delete leaves a row the next
   * seed would collide with.
   */
  async function seedRelationship(ownerId: string): Promise<{ relId: string; coId: string }> {
    const [co] = await sql<Array<{ id: string }>>`
      INSERT INTO companies (name) VALUES (${`ZZ Delete Integration ${runId} ${randomUUID()}`})
      RETURNING id`;
    const [row] = await sql<Array<{ id: string }>>`
      INSERT INTO client_relationships (company_id, owner_id)
      VALUES (${co!.id}, ${ownerId}) RETURNING id`;
    seededCompanyIds.push(co!.id);
    return { relId: row!.id, coId: co!.id };
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_URL;
    sql = postgres(TEST_URL as string, { max: 1, onnotice: () => {} });
    await sql`
      INSERT INTO users (id, email, role, partner_type) VALUES
        (${userAId}, ${`${userAId}@example.test`}, 'partner', 'Partenaire'),
        (${userBId}, ${`${userBId}@example.test`}, 'partner', 'Partenaire')`;
  });

  afterAll(async () => {
    if (!sql) return;
    await sql`DELETE FROM proposals WHERE user_id = ANY(${[userAId, userBId]})`;
    if (seededCompanyIds.length) {
      await sql`DELETE FROM client_relationships WHERE company_id = ANY(${seededCompanyIds})`;
      await sql`DELETE FROM companies WHERE id = ANY(${seededCompanyIds})`;
    }
    await sql`DELETE FROM users WHERE id = ANY(${[userAId, userBId]})`;
    await sql.end({ timeout: 5 });
  });

  beforeEach(() => {
    process.env.DATABASE_URL = TEST_URL;
  });

  const countRelationship = async (id: string) => {
    const r = await sql<Array<{ n: number }>>`
      SELECT count(*)::int AS n FROM client_relationships WHERE id = ${id}`;
    return r[0]!.n;
  };

  it('deletes a clean relationship, and CASCADES its contacts and timeline', async () => {
    const { relId, coId } = await seedRelationship(userAId);
    await sql`
      INSERT INTO contacts (client_relationship_id, name) VALUES (${relId}, 'ZZ cascade contact')`;
    await sql`
      INSERT INTO relationship_events (client_relationship_id, kind, actor_id, body)
      VALUES (${relId}, 'note', ${userAId}, 'ZZ cascade note')`;

    const deleteClient = await actionAs(userAId);
    expect(await deleteClient(relId)).toEqual({ ok: true });

    expect(await countRelationship(relId)).toBe(0);
    const contacts = await sql`SELECT 1 FROM contacts WHERE client_relationship_id = ${relId}`;
    const events = await sql`SELECT 1 FROM relationship_events WHERE client_relationship_id = ${relId}`;
    expect(contacts).toHaveLength(0);
    expect(events).toHaveLength(0);

    // The SHARED company row must survive — another partner may hold it, and
    // it is the registry cache keyed by a UNIQUE siren.
    const company = await sql`SELECT 1 FROM companies WHERE id = ${coId}`;
    expect(company).toHaveLength(1);
  });

  it("REFUSES to delete another partner's relationship, and reports it as not_found", async () => {
    const { relId } = await seedRelationship(userAId);

    const deleteAsB = await actionAs(userBId);
    // Same answer a nonexistent id gets — B cannot use this action to learn
    // that the id exists (D-18).
    expect(await deleteAsB(relId)).toEqual({ ok: false, reason: 'not_found' });
    expect(await countRelationship(relId)).toBe(1);

    expect(await deleteAsB(randomUUID())).toEqual({ ok: false, reason: 'not_found' });
  });

  it('REFUSES when a finalized proposal is attached, and the proposal is untouched', async () => {
    const { relId } = await seedRelationship(userAId);
    const [proposal] = await sql<Array<{ id: string }>>`
      INSERT INTO proposals (
        user_id, status, language, lc_ref, idempotency_key,
        inputs, params_snapshot, computed, client_relationship_id
      ) VALUES (
        ${userAId}, 'active', 'fr', ${`LC-DEL-${runId}`}, ${randomUUID()},
        '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, ${relId}
      ) RETURNING id`;

    const deleteClient = await actionAs(userAId);
    expect(await deleteClient(relId)).toEqual({ ok: false, reason: 'has_proposals', count: 1 });

    expect(await countRelationship(relId)).toBe(1);
    // The foreign key is ON DELETE SET NULL: had the guard not held, the
    // proposal would still exist but would have lost the client it belongs
    // to — a silent loss, which is the whole reason for refusing.
    const kept = await sql<Array<{ client_relationship_id: string | null }>>`
      SELECT client_relationship_id FROM proposals WHERE id = ${proposal!.id}`;
    expect(kept[0]!.client_relationship_id).toBe(relId);
  });

  it('a DRAFT proposal does not block — it is not yet a commercial document', async () => {
    const { relId } = await seedRelationship(userAId);
    await sql`
      INSERT INTO proposals (
        user_id, status, language, idempotency_key,
        inputs, params_snapshot, computed, client_relationship_id
      ) VALUES (
        ${userAId}, 'draft', 'fr', ${randomUUID()},
        '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, ${relId}
      )`;

    const deleteClient = await actionAs(userAId);
    expect(await deleteClient(relId)).toEqual({ ok: true });
    expect(await countRelationship(relId)).toBe(0);
  });

  it('writes an audit row carrying the company id — the only trace once the row is gone', async () => {
    const { relId, coId } = await seedRelationship(userAId);
    const deleteClient = await actionAs(userAId);
    expect(await deleteClient(relId)).toEqual({ ok: true });

    const audit = await sql<Array<{ payload: { companyId?: string } }>>`
      SELECT payload FROM audit_log
      WHERE action = 'client_relationship.delete' AND target_id = ${relId}`;
    expect(audit).toHaveLength(1);
    expect(audit[0]!.payload.companyId).toBe(coId);

    await sql`DELETE FROM audit_log WHERE target_id = ${relId}`;
  });
});

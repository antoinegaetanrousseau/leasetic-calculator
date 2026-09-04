// @vitest-environment node
/**
 * INTEGRATION TEST — real Postgres required.
 *
 * WHY THIS EXISTS. `insertRelationshipEventForOwner` shipped to production
 * throwing on every single call:
 *
 *   Insert select error: selected fields are not the same or are in a
 *   different order compared to the table definition
 *
 * Drizzle validates an INSERT … SELECT projection against the ENTIRE target
 * table definition — every column, in declaration order. The first version
 * omitted `id` and `created_at`, on the reasonable assumption that their
 * database defaults would fill them. Drizzle rejects that.
 *
 * Nothing caught it. `typecheck`, `lint:check` and 2229 unit tests were green,
 * because every unit test in this repo mocks the driver: they assert the SHAPE
 * of the call and never execute Drizzle's validation. The application stayed up
 * because each call site wraps the event write in its own try/catch — a failed
 * narration must never veto a change that already committed — so the only
 * symptom was an activity timeline that was permanently empty, in production,
 * with a green build. It was found by clicking through the acceptance steps on
 * the live site.
 *
 * The lesson generalises: a mocked driver cannot test a query BUILDER's own
 * validation. Any query in this repo built from a shape Drizzle validates at
 * runtime — INSERT … SELECT above all — needs a real database behind it.
 *
 * Setup:
 *   1. Apply migrations through `drizzle/0010_phase34_fiche_client.sql` to a
 *      dev Postgres (the Neon development branch).
 *   2. Export `DATABASE_URL_TEST=<that DB url>`.
 *   3. Run:
 *        DATABASE_URL_TEST=$DEV_DB_URL npx vitest run \
 *          src/lib/db/queries/relationship-events.insert.integration.test.ts
 *
 * If `DATABASE_URL_TEST` is unset the whole block SKIPS, so CI stays green.
 *
 * Production caveat: never point `DATABASE_URL_TEST` at production. This test
 * inserts and deletes rows.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import postgres from 'postgres';

// The query module is `server-only`; the repo's other suites neutralise it the
// same way so the module can be imported under vitest.
vi.mock('server-only', () => ({}));

const TEST_URL = process.env.DATABASE_URL_TEST;
const maybe = TEST_URL ? describe : describe.skip;

maybe('insertRelationshipEventForOwner — against real Postgres', () => {
  let sql: ReturnType<typeof postgres>;
  let ownerId: string;
  let companyId: string;
  let relationshipId: string;

  beforeAll(async () => {
    sql = postgres(TEST_URL as string, { max: 1 });
    const [owner] = await sql`select id from users where role = 'partner' limit 1`;
    ownerId = owner.id as string;
    const [co] = await sql`
      insert into companies (name, siren) values ('ZZ Integration Events', '999000111')
      on conflict (siren) do update set name = excluded.name
      returning id`;
    companyId = co.id as string;
    const [rel] = await sql`
      insert into client_relationships (company_id, owner_id)
      values (${companyId}, ${ownerId})
      on conflict (company_id, owner_id) do update set updated_at = now()
      returning id`;
    relationshipId = rel.id as string;
  });

  afterAll(async () => {
    if (!sql) return;
    await sql`delete from contacts where client_relationship_id = ${relationshipId}`;
    await sql`delete from relationship_events where client_relationship_id = ${relationshipId}`;
    await sql`delete from client_relationships where id = ${relationshipId}`;
    await sql`delete from companies where id = ${companyId}`;
    await sql.end();
  });

  it('writes a row — the projection matches the table definition Drizzle validates against', async () => {
    process.env.DATABASE_URL = TEST_URL;
    const { insertRelationshipEventForOwner } = await import('./relationship-events');

    const result = await insertRelationshipEventForOwner({
      relationshipId,
      ownerId,
      kind: 'stage_changed',
      actorId: ownerId,
      payload: { fromStage: 'prospect', toStage: 'qualifie' },
    });

    expect(result).not.toBeNull();

    const rows = await sql`
      select kind, actor_id, payload, occurred_at, created_at
      from relationship_events where client_relationship_id = ${relationshipId}`;
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe('stage_changed');
    expect(rows[0].actor_id).toBe(ownerId);
    expect(rows[0].payload).toEqual({ fromStage: 'prospect', toStage: 'qualifie' });
    // The two columns the broken version omitted must still be populated.
    expect(rows[0].occurred_at).toBeInstanceOf(Date);
    expect(rows[0].created_at).toBeInstanceOf(Date);
  });

  // The SECOND of the repo's two INSERT … SELECT builders, and the one that had
  // been broken longest: `createContactAction` projected 5 of `contacts`' 11
  // columns, so contact creation threw on every call from the moment Phase 30's
  // TOCTOU fix introduced it. Production held zero contact rows when it was
  // found. Both builders are covered here so the class is closed, not just its
  // two known instances.
  it('createContactAction writes a contact — the other INSERT … SELECT projection also matches its table', async () => {
    process.env.DATABASE_URL = TEST_URL;
    vi.doMock('@/lib/auth/require', () => ({
      requireRelationshipHolder: async () => ({
        session: { user: { id: ownerId, email: 'integration@example.test' } },
        role: 'partner',
      }),
    }));
    const { createContactAction } = await import('@/lib/crm/actions');

    const result = await createContactAction(relationshipId, {
      name: 'ZZ Integration Contact',
      role: 'Gérant',
      phone: '0102030405',
      email: 'zz.integration@example.test',
    });

    expect(result.id).toBeTruthy();

    const rows = await sql`
      select name, role, phone, email, created_at, source
      from contacts where client_relationship_id = ${relationshipId}`;
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('ZZ Integration Contact');
    expect(rows[0].created_at).toBeInstanceOf(Date);
    // The provenance marker must stay NULL: this row was entered by a human,
    // not produced by an import (Phase 31 D-08).
    expect(rows[0].source).toBeNull();

    await sql`delete from contacts where client_relationship_id = ${relationshipId}`;
    vi.doUnmock('@/lib/auth/require');
  });

  it('writes NOTHING when the caller does not own the relationship — the ownership proof is in the INSERT itself', async () => {
    process.env.DATABASE_URL = TEST_URL;
    const { insertRelationshipEventForOwner } = await import('./relationship-events');

    const before = await sql`
      select count(*)::int as n from relationship_events where client_relationship_id = ${relationshipId}`;

    const result = await insertRelationshipEventForOwner({
      relationshipId,
      ownerId: 'not-the-owner',
      kind: 'note',
      actorId: 'not-the-owner',
      body: 'should never be written',
    });

    expect(result).toBeNull();
    const after = await sql`
      select count(*)::int as n from relationship_events where client_relationship_id = ${relationshipId}`;
    expect(after[0].n).toBe(before[0].n);
  });
});

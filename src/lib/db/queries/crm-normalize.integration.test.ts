// @vitest-environment node
/**
 * INTEGRATION TEST — real Postgres required.
 *
 * Verifies CRM-01 empirically against the applied
 * `drizzle/0007_phase30_crm_registry.sql`:
 *   - `leasetic_normalize_company_name()` implements the versioned
 *     normalization rules (lowercase, accent-strip, legal-form removal,
 *     whitespace collapse) purely in SQL.
 *   - `companies.siren` is nullable UNIQUE.
 *   - `client_relationships` enforces one relationship per (company_id, owner_id).
 *
 * Setup:
 *   1. Apply `drizzle/0007_phase30_crm_registry.sql` to a dev/preview Postgres
 *      (e.g. Neon development branch, local docker postgres).
 *   2. Export `DATABASE_URL_TEST=<that DB url>`.
 *   3. Run:
 *        DATABASE_URL_TEST=$DEV_DB_URL npx vitest run \
 *          src/lib/db/queries/crm-normalize.integration.test.ts
 *
 * If `DATABASE_URL_TEST` is unset, the entire describe block SKIPS — CI stays
 * green even without the env var.
 *
 * Production caveat: do NOT point DATABASE_URL_TEST at production. The
 * skip-by-default pattern protects against accidental prod runs. This test
 * inserts and deletes rows in `companies` / `client_relationships` — never
 * run it anywhere the data matters.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL_TEST;
const shouldRun = !!DATABASE_URL;

if (!shouldRun) {
  console.log(
    '[integration] DATABASE_URL_TEST not set — skipping CRM normalization test. '
    + 'Set it to your dev/preview DB to run.',
  );
}

describe.skipIf(!shouldRun)(
  'leasetic_normalize_company_name() and CRM registry uniqueness constraints (real Postgres)',
  () => {
    let sql: ReturnType<typeof postgres>;
    const cleanupCompanyIds: string[] = [];
    let cleanupUserId: string | undefined;

    beforeAll(() => {
      sql = postgres(DATABASE_URL!, {
        max: 1,
        prepare: false,
        onnotice: () => {},
      });
    });

    afterAll(async () => {
      if (sql) {
        // client_relationships cascade-clean via ON DELETE RESTRICT on companies,
        // so relationships must go first, then companies, then the test user.
        await sql`DELETE FROM client_relationships WHERE company_id = ANY(${cleanupCompanyIds})`;
        await sql`DELETE FROM companies WHERE id = ANY(${cleanupCompanyIds})`;
        if (cleanupUserId) {
          await sql`DELETE FROM users WHERE id = ${cleanupUserId}`;
        }
        await sql.end({ timeout: 5 });
      }
    });

    it.each([
      ['Dupont Menuiserie SARL', 'dupont menuiserie'],
      ['Éts Léger S.A.S.', 'ets leger'],
      ['  ACME   SA  ', 'acme'],
      ['Société Générale', 'societe generale'],
    ])('normalizes %j to %j', async (input, expected) => {
      const rows = await sql<Array<{ r: string }>>`SELECT leasetic_normalize_company_name(${input}) AS r`;
      expect(rows[0]?.r).toBe(expected);
    });

    it('rejects a second company with the same siren (nullable UNIQUE)', async () => {
      const siren = `${Date.now()}`.slice(-9).padStart(9, '0');
      const first = await sql<Array<{ id: string }>>`
        INSERT INTO companies (name, siren) VALUES ('Unique Siren Co', ${siren}) RETURNING id
      `;
      cleanupCompanyIds.push(first[0]!.id);

      let caught: unknown = null;
      try {
        await sql`INSERT INTO companies (name, siren) VALUES ('Duplicate Siren Co', ${siren})`;
      } catch (err) {
        caught = err;
      }
      expect(caught).not.toBeNull();
    });

    it('rejects a second client_relationship with the same (company_id, owner_id) pair', async () => {
      const userId = `crm-normalize-test-${Date.now()}`;
      cleanupUserId = userId;
      await sql`
        INSERT INTO users (id, email, role, partner_type)
        VALUES (${userId}, ${`${userId}@example.test`}, 'partner', 'Partenaire')
      `;

      const company = await sql<Array<{ id: string }>>`
        INSERT INTO companies (name) VALUES ('Relationship Uniqueness Co') RETURNING id
      `;
      const companyId = company[0]!.id;
      cleanupCompanyIds.push(companyId);

      await sql`
        INSERT INTO client_relationships (company_id, owner_id) VALUES (${companyId}, ${userId})
      `;

      let caught: unknown = null;
      try {
        await sql`
          INSERT INTO client_relationships (company_id, owner_id) VALUES (${companyId}, ${userId})
        `;
      } catch (err) {
        caught = err;
      }
      expect(caught).not.toBeNull();
    });
  },
);

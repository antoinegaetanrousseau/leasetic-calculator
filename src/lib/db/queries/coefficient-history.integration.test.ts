// @vitest-environment node
/**
 * INTEGRATION TEST — real Postgres required.
 *
 * Verifies CONTEXT.md D-12 empirically: the `coefficient_history_no_modify`
 * trigger raises EXCEPTION with the message
 *   "coefficient_history is append-only — UPDATE and DELETE forbidden"
 * on every UPDATE and every DELETE against the `coefficient_history` table.
 *
 * Setup:
 *   1. Apply `drizzle/0004_phase12_drafts_and_history.sql` to a dev/preview
 *      Postgres (e.g. Neon preview branch, local docker postgres).
 *   2. Export `DATABASE_URL_TEST=<that DB url>`.
 *   3. Run:
 *        DATABASE_URL_TEST=$DEV_DB_URL npx vitest run \
 *          src/lib/db/queries/coefficient-history.integration.test.ts
 *
 * If `DATABASE_URL_TEST` is unset, the entire describe block SKIPS — CI
 * stays green even without the env var.
 *
 * The test leaves one or two rows per run in `coefficient_history` (the
 * trigger blocks any cleanup attempt). Each run uses a unique timestamped
 * summary so duplicates are harmless. To clean up between runs, manually
 * disable the trigger via psql (see scripts/backfill-coefficient-history.ts
 * header comment).
 *
 * Production / commission-pct caveat: the test inserts a non-secret JSON
 * shape; do NOT point DATABASE_URL_TEST at production. The skip-by-default
 * pattern protects against accidental prod runs.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL_TEST;
const shouldRun = !!DATABASE_URL;

if (!shouldRun) {
  // eslint-disable-next-line no-console
  console.log(
    '[integration] DATABASE_URL_TEST not set — skipping coefficient_history trigger test. ' +
      'Set it to your dev/preview DB to run.',
  );
}

describe.skipIf(!shouldRun)(
  'coefficient_history append-only TRIGGER (real Postgres)',
  () => {
    let sql: ReturnType<typeof postgres>;
    let seedId: string | undefined;

    beforeAll(() => {
      sql = postgres(DATABASE_URL!, {
        max: 1,
        prepare: false,
        onnotice: () => {},
      });
    });

    afterAll(async () => {
      if (sql) {
        await sql.end({ timeout: 5 });
      }
    });

    it('INSERT succeeds (baseline)', async () => {
      const summary = `integration-test-${Date.now()}`;
      const after = { commissionPct: '5.0000' };
      const rows = await sql<Array<{ id: string }>>`
        INSERT INTO coefficient_history (after_json, summary)
        VALUES (${JSON.stringify(after)}::jsonb, ${summary})
        RETURNING id
      `;
      expect(rows[0]?.id).toBeDefined();
      seedId = rows[0]!.id;
    });

    it('UPDATE raises "coefficient_history is append-only" exception', async () => {
      expect(seedId).toBeDefined();
      let caught: unknown = null;
      try {
        await sql`UPDATE coefficient_history SET summary = 'x' WHERE id = ${seedId!}::uuid`;
      } catch (err) {
        caught = err;
      }
      expect(caught).not.toBeNull();
      const msg = caught instanceof Error ? caught.message : String(caught);
      expect(msg).toContain('coefficient_history is append-only');
      expect(msg).toContain('UPDATE and DELETE forbidden');
    });

    it('DELETE raises "coefficient_history is append-only" exception', async () => {
      expect(seedId).toBeDefined();
      let caught: unknown = null;
      try {
        await sql`DELETE FROM coefficient_history WHERE id = ${seedId!}::uuid`;
      } catch (err) {
        caught = err;
      }
      expect(caught).not.toBeNull();
      const msg = caught instanceof Error ? caught.message : String(caught);
      expect(msg).toContain('coefficient_history is append-only');
    });

    it('INSERT after a blocked UPDATE still succeeds (trigger does not corrupt connection state)', async () => {
      const summary = `integration-test-recover-${Date.now()}`;
      const after = { commissionPct: '6.0000' };
      const rows = await sql<Array<{ id: string }>>`
        INSERT INTO coefficient_history (after_json, summary)
        VALUES (${JSON.stringify(after)}::jsonb, ${summary})
        RETURNING id
      `;
      expect(rows[0]?.id).toBeDefined();
    });
  },
);

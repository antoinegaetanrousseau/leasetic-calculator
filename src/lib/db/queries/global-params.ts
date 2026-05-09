import 'server-only';
import { desc } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type { GlobalParamsRow, NewGlobalParamsRow } from '@/db/schema';

/**
 * DATA-06: server route reads the most-recent global_params row at proposal
 * creation time and inlines its contents into proposals.params_snapshot.
 *
 * If the seed migration (Plan 08-04) has not yet been applied, this returns
 * null. Plan 08-07 treats null as a 500 error — the seed is a hard
 * dependency for the create-proposal flow.
 */
export async function getLatestGlobalParams(): Promise<GlobalParamsRow | null> {
  const dbi = db();
  const row = await dbi.query.globalParams.findFirst({
    orderBy: [desc(schema.globalParams.effectiveFrom)],
  });
  return row ?? null;
}

/**
 * DATA-05 append-only history. Phase 9 ADMIN-02 calls this; Plan 08-04's seed
 * migration shells out to a SQL INSERT directly (idempotent ON CONFLICT DO
 * NOTHING — see 08-04). This helper exists for Phase 9; Phase 8 uses it only
 * via the seed runner if the planner chose the queries-helper path.
 *
 * Phase 9 wires the audit log entry; Phase 8 leaves that to the caller (the
 * seed migration is system-initiated, no audit needed; admin saves are
 * Phase 9 territory).
 */
export async function insertGlobalParams(args: NewGlobalParamsRow): Promise<GlobalParamsRow> {
  const dbi = db();
  const [row] = await dbi.insert(schema.globalParams).values(args).returning();
  return row;
}

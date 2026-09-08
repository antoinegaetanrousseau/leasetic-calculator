import 'server-only';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type { LeaseticAdvisorRow } from '@/db/schema';

/**
 * PROF-03 / D-07 / D-08 / D-09 — the single Leasetic advisor identity.
 *
 * This module deliberately DIVERGES from `global-params.ts` in two ways a
 * future reader might otherwise "fix" back into consistency:
 *
 * 1. **Fixed-id read, not most-recent-row read.** `getLatestGlobalParams`
 *    orders by `effectiveFrom DESC` and takes the first row because
 *    `global_params` is append-only history (DATA-05/06) — every admin save
 *    INSERTs a new row. `leasetic_advisor` holds exactly ONE row forever;
 *    there is no "most recent" to order for, so `getAdvisor` reads by the
 *    fixed literal id the migration seeds instead.
 * 2. **Plain in-place `UPDATE`, not `INSERT`.** A fixed-id UPDATE is
 *    race-safe with no lock and no uniqueness constraint. An "insert if
 *    absent" branch (the kind `global_params`'s history shape implicitly
 *    tolerates via appends) would let two concurrent admin saves each
 *    create a competing singleton row — exactly the failure mode this
 *    shape avoids by construction. `upsertAdvisor` therefore never calls
 *    `db().insert(...)`.
 *
 * D-09: this row is read LIVE at proposal-render time and must never be
 * copied into `proposals.inputs` or `proposals.params_snapshot`. Nothing in
 * this module — or any caller of it — may write the advisor into either.
 */

/**
 * The single `leasetic_advisor` row's permanently fixed identifier, seeded
 * once by `drizzle/0011_phase42_captured_data.sql`. Every read and write in
 * this module targets exactly this id — the table is NOT append-only.
 */
export const ADVISOR_ROW_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Reads the single Leasetic advisor row. Returns `null` (never `undefined`,
 * never throws) when the seed migration has not yet been applied — mirrors
 * `getLatestGlobalParams`'s null-coalescing contract.
 */
export async function getAdvisor(): Promise<LeaseticAdvisorRow | null> {
  const dbi = db();
  const row = await dbi.query.leaseticAdvisor.findFirst({
    where: eq(schema.leaseticAdvisor.id, ADVISOR_ROW_ID),
  });
  return row ?? null;
}

export interface UpsertAdvisorArgs {
  name: string;
  fonction: string;
  telephone: string;
  email: string;
  /** The admin performing the save — written to `updated_by`. */
  actorId: string;
}

/**
 * Writes the single Leasetic advisor row IN PLACE. Exactly one `UPDATE`
 * targeting the fixed id — no "does a row already exist" branch, no
 * `INSERT`. Returns the updated row.
 */
export async function upsertAdvisor(args: UpsertAdvisorArgs): Promise<LeaseticAdvisorRow> {
  const dbi = db();
  const { actorId, ...fields } = args;
  const [row] = await dbi
    .update(schema.leaseticAdvisor)
    .set({
      ...fields,
      updatedAt: new Date(),
      updatedBy: actorId,
    })
    .where(eq(schema.leaseticAdvisor.id, ADVISOR_ROW_ID))
    .returning();
  return row;
}

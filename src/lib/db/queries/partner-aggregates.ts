import 'server-only';
import { and, count, inArray, isNotNull, isNull } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

/**
 * Phase 18 Plan 01 Task 1 — partner aggregate helpers powering the
 * Admin Home `Partenaires actifs` stat tile and `sur N comptes` sublabel.
 *
 * D-01 (18-CONTEXT decisions block):
 *   - `Partenaires actifs` literal label = users.role='partner' AND status='active'
 *     where status='active' is DERIVED at query time per Phase 12 DB-02 D-10:
 *     `active = role='partner' AND deleted_at IS NULL AND last_login_at IS NOT NULL`.
 *     The Leasétic schema has NO `users.status` column — invited / active /
 *     inactive are derived from existing columns. See src/db/schema.ts +
 *     src/lib/db/queries/users.ts (`listInvitedPartners`) for the established
 *     pattern.
 *   - Sublabel `sur N comptes` = total non-deleted partner accounts (active
 *     + invited; excludes soft-deleted via deleted_at IS NULL).
 *
 * SECURITY (T-18-01-02): admin-only data — consumed ONLY by the Admin Home
 * stat tile rendered inside `(admin)/[adminSegment]/` (requireAdmin() gate).
 * These helpers are NOT exposed via any API route. No commission VALUES are
 * touched — ADMIN-09 envelope trivially honored (no `users.commission_pct`
 * column exists; commission lives on `global_params`).
 *
 * Pattern: mirrors proposal-aggregates.ts (Phase 17 17-03) verbatim —
 * `select({ count: count() }).from(table).where(predicate)` terminating
 * with `await` on a single-row result.
 */

/**
 * D-01 — count of currently-active partner users.
 *
 * `active` is DERIVED (no `users.status` column):
 *   role='partner' AND deleted_at IS NULL AND last_login_at IS NOT NULL
 *
 * Mirrors the Phase 12 DB-02 D-10 derivation (see listInvitedPartners in
 * users.ts — the symmetric `invited` derivation). The `last_login_at IS NOT
 * NULL` predicate excludes invited (never-logged-in) accounts.
 *
 * Note: closure depends on plan 12-07 writing `users.last_login_at` on every
 * successful login (WR-AUDIT-01 / Phase 6 follow-up #3); without that, every
 * partner forever appears as `invited` (never `active`).
 */
export async function getActivePartnerCount(): Promise<number> {
  const dbi = db();
  // ROLE-03 / T-30-03-04: widened from role='partner' so Commercial
  // accounts backfilled to 'sales' (Plan 30-01) still count toward this
  // tile. 'admin' is deliberately excluded.
  const where = and(
    inArray(schema.users.role, ['partner', 'sales']),
    isNull(schema.users.deletedAt),
    isNotNull(schema.users.lastLoginAt),
  );
  const rows = await dbi
    .select({ count: count() })
    .from(schema.users)
    .where(where);
  return rows[0]?.count ?? 0;
}

/**
 * D-01 — count of non-deleted partner accounts (active + invited; excludes
 * soft-deleted). Powers the `sur {N} comptes` sublabel on the Admin Home
 * `Partenaires actifs` stat tile.
 *
 *   role='partner' AND deleted_at IS NULL
 *
 * (No `last_login_at` predicate — counts both active and invited accounts.)
 */
export async function getTotalPartnerAccountCount(): Promise<number> {
  const dbi = db();
  // ROLE-03: widened from role='partner' — see getActivePartnerCount above.
  const where = and(
    inArray(schema.users.role, ['partner', 'sales']),
    isNull(schema.users.deletedAt),
  );
  const rows = await dbi
    .select({ count: count() })
    .from(schema.users)
    .where(where);
  return rows[0]?.count ?? 0;
}

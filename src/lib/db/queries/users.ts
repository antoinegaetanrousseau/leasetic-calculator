import 'server-only';
import { and, desc, eq, gt, inArray, isNull, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

export interface PartnerWithCount {
  id: string;
  email: string;
  displayName: string | null;
  name: string;
  role: string;
  deletedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  language: string;
  proposalsCount: number;
  /** D-09-11(b): true when partner has at least one unused unexpired 'invite' token (controls re-issue button visibility). */
  hasUnredeemedInvite: boolean;
}

/**
 * D-09-10. Returns one row per role='partner' user with proposalsCount = number
 * of non-soft-deleted proposals owned by that user. Default sort: created_at DESC.
 *
 * ADMIN-09: this query MUST NOT select commission_pct (which lives on
 * global_params, not users — defense in depth). No commission field appears anywhere
 * in this query or its return type.
 */
export async function listPartnersWithCounts(): Promise<PartnerWithCount[]> {
  const dbi = db();

  // Aggregate proposals count per user using a correlated subquery for the deletedAt IS NULL filter.
  // This avoids LEFT JOIN + GROUP BY complications when using Drizzle's .select() builder.
  const rows = await dbi
    .select({
      id: schema.users.id,
      email: schema.users.email,
      displayName: schema.users.displayName,
      name: schema.users.name,
      role: schema.users.role,
      deletedAt: schema.users.deletedAt,
      lastLoginAt: schema.users.lastLoginAt,
      createdAt: schema.users.createdAt,
      language: schema.users.language,
      // Correlated subquery: count non-soft-deleted, non-draft proposals per user.
      // NOTE: ${schema.users.id} interpolation emits unqualified `"id"`, which
      // Postgres binds to `proposals.id` (uuid) — not the outer `users.id` (text).
      // Result is `text = uuid` type mismatch (42883). Fix: qualify explicitly.
      //
      // bug_007 (Phase 12): the `deleted_at IS NULL` predicate alone now matches
      // drafts (which have `deleted_at` at default NULL and `status='draft'`),
      // silently inflating the admin "Propositions" column. Adding
      // `proposals.status = 'active'` aligns this query with the parallel fix
      // in proposals.ts:listProposalsByUser / searchProposals (D-08).
      proposalsCount: sql<number>`(
        SELECT COUNT(*)::int
        FROM proposals
        WHERE proposals.user_id = users.id
          AND proposals.status = 'active'
          AND proposals.deleted_at IS NULL
      )`.as('proposals_count'),
    })
    .from(schema.users)
    .where(eq(schema.users.role, 'partner'))
    .orderBy(desc(schema.users.createdAt));

  // Derive hasUnredeemedInvite per user via a follow-up SELECT using inArray.
  // Small partner counts make this acceptable over N+1 for-loop.
  const userIds = rows.map((r) => r.id);
  if (userIds.length === 0) {
    return [];
  }

  // D-09-11(b): predicate — kind='invite' AND usedAt IS NULL AND expiresAt > now()
  // The schema column is `usedAt` (NOT redeemedAt — verified against schema.ts line 115).
  const inviteRows = await dbi
    .select({ userId: schema.passwordResets.userId })
    .from(schema.passwordResets)
    .where(
      and(
        eq(schema.passwordResets.kind, 'invite'),
        isNull(schema.passwordResets.usedAt),
        gt(schema.passwordResets.expiresAt, sql`now()`),
        inArray(schema.passwordResets.userId, userIds),
      ),
    );
  const unredeemedSet = new Set(inviteRows.map((r) => r.userId));

  return rows.map((r) => ({
    ...r,
    hasUnredeemedInvite: unredeemedSet.has(r.id),
  }));
}

// ── Phase 12 — DB-02: derived "invited" partner status ──────────────────────

export interface InvitedPartnerRow {
  id: string;
  email: string;
  displayName: string | null;
  name: string;
  language: string;
  createdAt: Date;
}

/**
 * DB-02 per 12-CONTEXT.md D-10. `invited` = `role='partner' AND deleted_at
 * IS NULL AND last_login_at IS NULL` — fully derived from existing columns;
 * no new schema column on `users`. Closure depends on plan 12-07 writing
 * `users.last_login_at` on every successful login (WR-AUDIT-01 / Phase 6
 * follow-up #3); without that, every partner forever appears as `invited`.
 *
 * ADMIN-09: this query MUST NOT select commission_pct or any password column.
 * The returned shape is bounded above to id / email / displayName / name /
 * language / createdAt — narrower than `PartnerWithCount`.
 *
 * No pagination — admin partner list is bounded (revisit only if it grows
 * past ~200; CONTEXT recommendation).
 */
export async function listInvitedPartners(): Promise<InvitedPartnerRow[]> {
  const dbi = db();
  const rows = await dbi
    .select({
      id: schema.users.id,
      email: schema.users.email,
      displayName: schema.users.displayName,
      name: schema.users.name,
      language: schema.users.language,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .where(
      and(
        eq(schema.users.role, 'partner'),
        isNull(schema.users.deletedAt),
        isNull(schema.users.lastLoginAt),
      ),
    )
    .orderBy(desc(schema.users.createdAt));
  return rows;
}

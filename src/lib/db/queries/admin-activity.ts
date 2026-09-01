import 'server-only';
import { and, desc, eq, gte, inArray, isNotNull, or, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

/**
 * Phase 18 Plan 01 Task 2 — Admin Home `Recent activity` data source.
 *
 * D-05 (18-CONTEXT) — union of SQL queries at request time. No new audit
 * table. Sources merged + sorted DESC by timestamp, sliced to top `limit`
 * (default 5).
 *
 * Sources implemented in Phase 18:
 *   (a) `coefficient_history` rows — admin coefficient edits (Phase 12 DB-03)
 *   (b) `users` partner status changes — derived from `updatedAt` filtered
 *       to recently changed partner accounts (last 30 days). Sentence
 *       interpolates the partner name (the actor is not stored — the schema
 *       has no `updatedBy` column on users; sentence uses target.name as
 *       sentenceArgs[0] and a generic `Admin` actor for display).
 *
 * Source DEFERRED — Phase 18 partial (D-05 documented):
 *   (c) invitations — the Leasétic schema has NO `invitations` table. Partner
 *       invites live in `password_resets` (kind='invite') and have NO
 *       `createdBy` actor reference. Adding invite-with-actor support requires
 *       schema work outside Phase 18's scope. Recent activity ships as a
 *       2-source union (a + b) per D-05 partial; closing-out plan documents
 *       this as a known partial.
 *
 * Per-source LIMIT 10 — T-18-01-06 DoS mitigation (bounded scan). Merge +
 * sort happens in application code on at most 20 rows.
 *
 * SECURITY (T-18-01-03/04): admin-only data — consumed ONLY by Admin Home
 * (requireAdmin gate). NO commission VALUES projected. The
 * `coefficientModified` sentence references "modified coefficients"
 * generically; commission deltas live on `/history` (separate route).
 *
 * D-07 — rows are READ-ONLY. Shape stays bounded to the ActivityRow union;
 * no row-level link or id is rendered into a clickable navigation surface.
 */

export type ActivitySource = 'coefficient_history' | 'partner_status' | 'invitation';

export interface ActivityRow {
  id: string;
  source: ActivitySource;
  actorName: string;
  actorEmail?: string;
  sentenceKey: string;
  sentenceArgs: string[];
  timestamp: Date;
}

interface CoefficientHistoryActivityRow {
  id: string;
  changedAt: Date;
  actorName: string | null;
  actorEmail: string | null;
}

interface PartnerStatusActivityRow {
  id: string;
  updatedAt: Date;
  name: string | null;
  email: string;
  deletedAt: Date | null;
  lastLoginAt: Date | null;
}

const SOURCE_LIMIT = 10;
const DEFAULT_LIMIT = 5;
// Partner status branch is bounded to the last 30 days to avoid scanning
// arbitrarily old rows (T-18-01-06).
const PARTNER_STATUS_WINDOW_DAYS = 30;

/**
 * D-05 — returns the top `limit` merged activity rows from
 * coefficient_history + partner status changes, sorted by timestamp DESC.
 *
 * @param args.limit — number of rows to return (default 5)
 * @returns ActivityRow[] (length <= limit). Empty array if no recent activity.
 */
export async function getRecentAdminActivity(args?: { limit?: number }): Promise<ActivityRow[]> {
  const limit = args?.limit ?? DEFAULT_LIMIT;
  const dbi = db();

  // ── Source (a): coefficient_history ──────────────────────────────────────
  // JOIN users ON changed_by_user_id (LEFT JOIN — actor may be NULL if the
  // admin user was later deleted; schema FK is ON DELETE SET NULL).
  const coeffRowsPromise = dbi
    .select({
      id: schema.coefficientHistory.id,
      changedAt: schema.coefficientHistory.changedAt,
      actorName: schema.users.name,
      actorEmail: schema.users.email,
    })
    .from(schema.coefficientHistory)
    .leftJoin(schema.users, eq(schema.users.id, schema.coefficientHistory.changedByUserId))
    .where(sql`true`)
    .orderBy(desc(schema.coefficientHistory.changedAt))
    .limit(SOURCE_LIMIT) as unknown as Promise<CoefficientHistoryActivityRow[]>;

  // ── Source (b): partner status changes ───────────────────────────────────
  // Read recently-updated partner rows (role='partner') where the update
  // could plausibly reflect a status transition: either deletedAt is now
  // set (deactivation) or lastLoginAt is now set (first login = activation
  // from invited state). Bounded to the last 30 days to limit scan.
  //
  // The schema has no `updatedBy` column — the actor performing the
  // disable/enable is not recorded. We surface the TARGET partner name as
  // sentenceArgs[0] and the generic `Admin` literal as actorName. This is
  // an accepted partial per D-05.
  const windowStart = new Date(Date.now() - PARTNER_STATUS_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const partnerRowsPromise = dbi
    .select({
      id: schema.users.id,
      updatedAt: schema.users.updatedAt,
      name: schema.users.name,
      email: schema.users.email,
      deletedAt: schema.users.deletedAt,
      lastLoginAt: schema.users.lastLoginAt,
    })
    .from(schema.users)
    .where(
      and(
        // ROLE-03 / T-30-03-04: widened from role='partner' so Commercial
        // accounts backfilled to 'sales' (Plan 30-01) still appear in the
        // admin activity feed. 'admin' is deliberately excluded.
        inArray(schema.users.role, ['partner', 'sales']),
        gte(schema.users.updatedAt, windowStart),
        // Only surface rows that look like a status transition occurred —
        // either soft-deleted (inactive) or have logged in (active).
        // Invited (lastLoginAt IS NULL AND deletedAt IS NULL) shows in the
        // invitation source — out of scope for Phase 18 / D-05 partial.
        or(
          isNotNull(schema.users.deletedAt),
          isNotNull(schema.users.lastLoginAt),
        ),
      ),
    )
    .orderBy(desc(schema.users.updatedAt))
    .limit(SOURCE_LIMIT) as unknown as Promise<PartnerStatusActivityRow[]>;

  const [coeffRows, partnerRows] = await Promise.all([coeffRowsPromise, partnerRowsPromise]);

  // ── Project to ActivityRow ───────────────────────────────────────────────
  const activityFromCoeffHistory: ActivityRow[] = coeffRows.map((row) => {
    const actorName = row.actorName || row.actorEmail || 'Admin';
    return {
      id: `ch-${row.id}`,
      source: 'coefficient_history' as const,
      actorName,
      actorEmail: row.actorEmail ?? undefined,
      sentenceKey: 'admin.home.activity.sentence.coefficientModified',
      // T-18-01-04: sentenceArgs hold actor names only — NO commission values.
      sentenceArgs: [actorName],
      timestamp: row.changedAt,
    };
  });

  const activityFromPartnerStatus: ActivityRow[] = partnerRows.map((row) => {
    const targetName = row.name || row.email;
    // Derive the displayed status transition for sentence selection.
    // deletedAt set → deactivated; lastLoginAt set (and not deleted) →
    // activated. (Both could be true if a partner activated then was
    // disabled — prefer the latest transition signal, which is captured by
    // deletedAt presence per Phase 12 DB-02 semantics.)
    const sentenceKey = row.deletedAt
      ? 'admin.home.activity.sentence.partnerDeactivated'
      : 'admin.home.activity.sentence.partnerActivated';
    return {
      id: `ps-${row.id}`,
      source: 'partner_status' as const,
      // D-05 partial — actor not recorded in schema; sentence speaks about
      // the TARGET partner. Display actor falls back to literal `Admin`.
      actorName: 'Admin',
      sentenceKey,
      sentenceArgs: [targetName],
      timestamp: row.updatedAt,
    };
  });

  // ── Merge + sort DESC + slice ────────────────────────────────────────────
  const merged = [...activityFromCoeffHistory, ...activityFromPartnerStatus];
  merged.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return merged.slice(0, limit);
}

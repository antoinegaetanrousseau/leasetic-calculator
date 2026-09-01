import 'server-only';
import { and, desc, eq, ilike, inArray, isNotNull, isNull, ne, or, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

/**
 * Phase 18 Plan 03 Task 1 — partner-list query helper powering the v1.3
 * `/(admin)/[adminSegment]/partners` table.
 *
 * D-08 (18-CONTEXT decisions block):
 *   `Dernière activité` = MAX(proposals.created_at WHERE proposals.user_id =
 *   partner.id AND proposals.status != 'deleted'). Falls back to NULL when the
 *   partner has zero non-deleted proposals; page-layer renders em-dash.
 *
 * D-14 — full rename: the new helper lives in `partners.ts` (was implied
 * `accounts.ts` before the rename). Symbol: `listPartnersWithLastActivity`.
 * Row shape: `PartnerRow`.
 *
 * Status derivation (Phase 12 DB-02 D-10): schema has NO `users.status` column.
 *   - active   = role='partner' AND deletedAt IS NULL AND lastLoginAt IS NOT NULL
 *   - invited  = role='partner' AND deletedAt IS NULL AND lastLoginAt IS NULL
 *   - inactive = role='partner' AND deletedAt IS NOT NULL (soft-deleted)
 *
 * SECURITY:
 *   - T-18-03-01 — status arg is type-narrowed at the function signature
 *     ('active'|'invited'|'inactive'|undefined). Page layer enum-validates
 *     before calling; undefined means "no filter".
 *   - T-18-03-02 — q is bound via Drizzle's ilike() (parameterized); never
 *     string-concatenated into raw SQL.
 *   - T-18-03-04 — `deletedAt IS NULL` is enforced for status='active' and
 *     status='invited' branches; the 'inactive' branch flips the predicate.
 *   - ADMIN-09 — no commission projection (no `users.commission_pct` exists;
 *     commission lives on `global_params`). 9-gate grep contract trivially honored.
 *
 * Phase 30 Plan 03 (ROLE-03 / T-30-03-04): the base role predicate is
 * `role IN ('partner', 'sales')`, NOT `role = 'partner'`. Once the 30-01
 * backfill moves Commercial accounts to `sales`, this listing MUST keep
 * showing them — an admin losing visibility of a previously-visible account
 * is exactly what ROLE-03 forbids. `role` itself is projected below as an
 * access classification (which auth gate the account uses), the same
 * reasoning already applied to `partnerType` — it is NOT a rate or
 * commission field, so the ADMIN-09 envelope is unaffected. `'admin'` is
 * deliberately excluded from the predicate: this listing must never surface
 * admin accounts as partners.
 */

export type PartnerStatus = 'active' | 'invited' | 'inactive';

export interface PartnerRow {
  id: string;
  email: string;
  /** Best-effort display name — falls back to email when both name and displayName are empty. */
  name: string;
  /** Raw underlying values; the derived `status` is what callers consume. */
  status: PartnerStatus;
  createdAt: Date;
  /** D-08 — MAX(proposals.created_at) per partner, excluding deleted rows. Null when zero proposals. */
  lastActivityAt: Date | null;
  /**
   * PTYPE-01 / D-07 — partner type at-a-glance badge on the list.
   * ADMIN-09: business-classification enum — NOT a commission/rate projection.
   * No commission_pct field exists on users; 9-gate grep contract trivially honored.
   */
  partnerType: 'Agent' | 'Commercial' | 'Partenaire';
  /**
   * Phase 30 Plan 03 (ROLE-03) — true when the underlying users.role is
   * 'sales' (an internal Commercial account), false for 'partner'. This is
   * an access classification derived from `role`, NOT a commission/rate
   * value — ADMIN-09 unaffected.
   */
  isInternal: boolean;
}

export interface ListPartnersArgs {
  status?: PartnerStatus;
  q?: string;
  /** base64url-encoded cursor produced by a prior call's `nextCursor`. */
  cursor?: string;
  /** Default 20 — page size. */
  limit?: number;
}

export interface ListPartnersResult {
  rows: PartnerRow[];
  /** base64url-encoded cursor for the next page; null when no more pages. */
  nextCursor: string | null;
}

/** Cursor primitive: (createdAt ISO 8601, id text). */
interface PartnersCursor {
  createdAt: string;
  id: string;
}

function encodeCursor(c: PartnersCursor): string {
  return Buffer.from(JSON.stringify(c), 'utf8').toString('base64url');
}

function decodeCursor(encoded: string): PartnersCursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (typeof parsed?.createdAt === 'string' && typeof parsed?.id === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/** Derive Phase 12 D-10 status from underlying users columns. */
function deriveStatus(deletedAt: Date | null, lastLoginAt: Date | null): PartnerStatus {
  if (deletedAt !== null) return 'inactive';
  if (lastLoginAt === null) return 'invited';
  return 'active';
}

const DEFAULT_LIMIT = 20;

/**
 * D-08 / D-14 — list partners (role='partner') with a MAX(proposals.created_at)
 * aggregate joined per partner. Supports optional status filter, ILIKE search on
 * email + name, and cursor pagination (~20 rows per page per D-12).
 */
export async function listPartnersWithLastActivity(
  args: ListPartnersArgs,
): Promise<ListPartnersResult> {
  const dbi = db();
  const limit = args.limit ?? DEFAULT_LIMIT;
  const fetchCount = limit + 1; // detect overflow → nextCursor

  // Status predicate per Phase 12 D-10 derivation.
  let statusPredicate;
  if (args.status === 'active') {
    statusPredicate = and(
      isNull(schema.users.deletedAt),
      isNotNull(schema.users.lastLoginAt),
    );
  } else if (args.status === 'invited') {
    statusPredicate = and(
      isNull(schema.users.deletedAt),
      isNull(schema.users.lastLoginAt),
    );
  } else if (args.status === 'inactive') {
    statusPredicate = isNotNull(schema.users.deletedAt);
  }
  // undefined → no extra filter; ALL non-deleted partners returned.

  // Search predicate — q matches email OR name (case-insensitive). Drizzle's
  // ilike() bind-params the pattern → no SQL injection risk (T-18-03-02).
  const q = args.q?.trim();
  const searchPredicate = q && q.length > 0
    ? or(
        ilike(schema.users.email, `%${q}%`),
        ilike(schema.users.name, `%${q}%`),
      )
    : undefined;

  // Cursor predicate — (createdAt, id) < (cursor.createdAt, cursor.id). Tuple
  // comparison via raw SQL (Drizzle has no native row-tuple compare); mirrors
  // the Phase 8 listProposalsByUser cursor pattern.
  const decoded = args.cursor ? decodeCursor(args.cursor) : null;
  const cursorPredicate = decoded
    ? sql`(${schema.users.createdAt}, ${schema.users.id}) < (${decoded.createdAt}::timestamptz, ${decoded.id}::text)`
    : undefined;

  const where = and(
    inArray(schema.users.role, ['partner', 'sales']),
    statusPredicate,
    searchPredicate,
    cursorPredicate,
  );

  // D-08 — LEFT JOIN proposals ON (user_id = users.id AND status != 'deleted'),
  // then GROUP BY users.id, SELECT MAX(proposals.created_at) as lastActivityAt.
  // Partners with zero non-deleted proposals: LEFT JOIN preserves the row;
  // MAX() over an empty group returns NULL → lastActivityAt = null.
  const rawRows = await dbi
    .select({
      id: schema.users.id,
      email: schema.users.email,
      displayName: schema.users.displayName,
      name: schema.users.name,
      deletedAt: schema.users.deletedAt,
      lastLoginAt: schema.users.lastLoginAt,
      createdAt: schema.users.createdAt,
      // PTYPE-01 / D-07: project partner_type for at-a-glance badge.
      // ADMIN-09: business-classification enum — NOT a commission/rate field.
      partnerType: schema.users.partnerType,
      // ROLE-03 / T-30-03-04: project role to derive isInternal — an access
      // classification, NOT a rate/commission field (ADMIN-09 unaffected).
      role: schema.users.role,
      lastActivityAt:
        sql<Date | null>`MAX(${schema.proposals.createdAt})`.as('last_activity_at'),
    })
    .from(schema.users)
    .leftJoin(
      schema.proposals,
      and(
        eq(schema.proposals.userId, schema.users.id),
        ne(schema.proposals.status, 'deleted'),
      ),
    )
    .where(where)
    .groupBy(
      schema.users.id,
      schema.users.email,
      schema.users.displayName,
      schema.users.name,
      schema.users.deletedAt,
      schema.users.lastLoginAt,
      schema.users.createdAt,
      schema.users.partnerType,
      schema.users.role,
    )
    .orderBy(desc(schema.users.createdAt), desc(schema.users.id))
    .limit(fetchCount);

  // Overflow → there is a next page; trim to `limit` and compose cursor from
  // the last sliced row (NOT the overflow row — the cursor is a strict-less-than
  // pivot so the next page starts AFTER the last sliced row).
  const hasMore = rawRows.length > limit;
  const sliced = hasMore ? rawRows.slice(0, limit) : rawRows;
  const last = sliced[sliced.length - 1] as (typeof rawRows)[number] | undefined;
  const nextCursor =
    hasMore && last
      ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
      : null;

  const rows: PartnerRow[] = sliced.map((r) => {
    const lastActivityAt = r.lastActivityAt
      ? r.lastActivityAt instanceof Date
        ? r.lastActivityAt
        : new Date(r.lastActivityAt as unknown as string)
      : null;
    const display = (r.displayName ?? r.name ?? '').trim();
    return {
      id: r.id,
      email: r.email,
      name: display.length > 0 ? display : r.email,
      status: deriveStatus(r.deletedAt, r.lastLoginAt),
      createdAt: r.createdAt,
      lastActivityAt,
      // PTYPE-01 / D-07: the DB column has DEFAULT 'Partenaire' NOT NULL so
      // the value is always one of the three enum members.
      partnerType: (r.partnerType ?? 'Partenaire') as 'Agent' | 'Commercial' | 'Partenaire',
      // ROLE-03: internal (Commercial-turned-sales) accounts flagged for the
      // admin listing UI — derived from the same `role` predicate above.
      isInternal: r.role === 'sales',
    };
  });

  return { rows, nextCursor };
}

import 'server-only';
import { and, desc, sql, eq } from 'drizzle-orm';
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

// ── Phase 9 — Admin Surface: history pagination (D-09-04) ────────────────────

export type GlobalParamsCursor = { effectiveFrom: string; id: string };

export interface ListGlobalParamsHistoryArgs {
  cursor?: GlobalParamsCursor | null;
  limit?: number;   // default 20
}

/** WR-05: history rows augmented with the admin's display name (displayName ?? email). */
export interface GlobalParamsHistoryRow extends GlobalParamsRow {
  createdByDisplay: string | null;
}

export interface GlobalParamsHistoryResult {
  rows: GlobalParamsHistoryRow[];
  hasMore: boolean;
  nextCursor: GlobalParamsCursor | null;
}

export function encodeGlobalParamsCursor(c: GlobalParamsCursor): string {
  return Buffer.from(JSON.stringify(c), 'utf8').toString('base64url');
}

export function decodeGlobalParamsCursor(encoded: string): GlobalParamsCursor | null {
  const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (
      typeof parsed?.effectiveFrom === 'string' &&
      typeof parsed?.id === 'string' &&
      ISO_RE.test(parsed.effectiveFrom) &&
      UUID_RE.test(parsed.id)
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

const DEFAULT_HISTORY_LIMIT = 20;

/**
 * D-09-04. Cursor-paginated history of global_params rows, newest-first.
 * Cursor is (effectiveFrom, id) desc — mirrors proposals.ts listProposalsByUser pattern.
 * Caller passes the encoded cursor string from the previous page's nextCursor.
 *
 * T-09-01-08 DoS mitigation: limit defaults to 20 with no way for caller to exceed
 * it without explicitly passing a higher value (caller-trusted; admin-only surface).
 */
export async function listGlobalParamsHistory(
  args: ListGlobalParamsHistoryArgs = {},
): Promise<GlobalParamsHistoryResult> {
  const dbi = db();
  const limit = args.limit ?? DEFAULT_HISTORY_LIMIT;
  const fetchCount = limit + 1;
  const cursor = args.cursor ?? null;

  // Tuple-compare predicate (same shape as proposals.ts listProposalsByUser cursor):
  //   (effective_from, id) < (cursor.effectiveFrom::timestamptz, cursor.id::uuid)
  const cursorPredicate = cursor
    ? sql`(${schema.globalParams.effectiveFrom}, ${schema.globalParams.id}) < (${cursor.effectiveFrom}::timestamptz, ${cursor.id}::uuid)`
    : undefined;

  // WR-05: LEFT JOIN users to surface displayName ?? email in the history table.
  // global_params.created_by is a text FK to users.id (Better Auth nanoid).
  const rawRows = await dbi
    .select({
      // All global_params columns
      id: schema.globalParams.id,
      commissionPct: schema.globalParams.commissionPct,
      maxAmount: schema.globalParams.maxAmount,
      validityDays: schema.globalParams.validityDays,
      coefficients: schema.globalParams.coefficients,
      note: schema.globalParams.note,
      effectiveFrom: schema.globalParams.effectiveFrom,
      createdBy: schema.globalParams.createdBy,
      // Joined admin display name
      createdByDisplay: sql<string | null>`COALESCE(${schema.users.displayName}, ${schema.users.email})`,
    })
    .from(schema.globalParams)
    .leftJoin(schema.users, eq(schema.users.id, schema.globalParams.createdBy))
    .where(cursorPredicate ? and(cursorPredicate) : undefined)
    .orderBy(desc(schema.globalParams.effectiveFrom), desc(schema.globalParams.id))
    .limit(fetchCount);

  const hasMore = rawRows.length > limit;
  const sliced = hasMore ? rawRows.slice(0, limit) : rawRows;
  const last = sliced[sliced.length - 1];
  const nextCursor: GlobalParamsCursor | null =
    hasMore && last
      ? { effectiveFrom: last.effectiveFrom.toISOString(), id: last.id }
      : null;

  return { rows: sliced, hasMore, nextCursor };
}

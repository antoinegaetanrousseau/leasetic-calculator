import 'server-only';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type {
  CoefficientHistoryRow,
  NewCoefficientHistoryRow,
} from '@/db/schema';
import {
  generateDiffSummary,
  type GlobalParamsSnapshot,
} from '@/lib/admin/coefficient-diff';

/**
 * Phase 12 DB-03 — Server-only query helpers for `coefficient_history`.
 *
 * Per CONTEXT.md D-12, D-14, D-16:
 * - Table is append-only at the DB layer via TRIGGER + RAISE EXCEPTION
 *   (drizzle/0004_phase12_drafts_and_history.sql `coefficient_history_no_update`
 *   and `coefficient_history_no_delete`). Both helpers below avoid those paths
 *   by construction. `createCoefficientHistoryEntry` is INSERT-only;
 *   `listCoefficientHistory` is SELECT-only. There is deliberately no UPDATE
 *   or DELETE helper in this module — the trigger would block them; the
 *   absence is the documentation.
 *
 * - `createCoefficientHistoryEntry` auto-falls-back to
 *   `generateDiffSummary(before, after)` when the caller leaves `summary`
 *   undefined / empty / whitespace-only (D-16). Admin-provided text wins
 *   verbatim when present.
 *
 * - `listCoefficientHistory` is cursor-paginated newest-first, mirroring
 *   `listGlobalParamsHistory` exactly so the Phase 14 History sidebar consumer
 *   can adopt it without surprises.
 */

// ── Create ────────────────────────────────────────────────────────────────

export interface CreateCoefficientHistoryArgs {
  before: GlobalParamsSnapshot | null;
  after: GlobalParamsSnapshot;
  userId: string | null;
  /** Optional admin-provided label. Falls back to generateDiffSummary when undefined / empty / whitespace-only (D-16). */
  summary?: string;
}

/**
 * D-16 auto-fallback contract: if `args.summary` is a string with non-empty
 * trim, it is stored verbatim. Otherwise `generateDiffSummary(before, after)`
 * is called and its result is stored.
 *
 * Used by:
 *   - Phase 14 admin Coefficients editor (admin-form path)
 *   - scripts/backfill-coefficient-history.ts (plan 12-06, seed-row + adjacent-pair backfill)
 */
export async function createCoefficientHistoryEntry(
  args: CreateCoefficientHistoryArgs,
): Promise<CoefficientHistoryRow> {
  const dbi = db();
  const resolvedSummary =
    typeof args.summary === 'string' && args.summary.trim().length > 0
      ? args.summary
      : generateDiffSummary(args.before, args.after);

  const insert: NewCoefficientHistoryRow = {
    changedByUserId: args.userId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    beforeJson: args.before as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    afterJson: args.after as any,
    summary: resolvedSummary,
  };

  const [row] = await dbi
    .insert(schema.coefficientHistory)
    .values(insert)
    .returning();
  return row;
}

// ── List ──────────────────────────────────────────────────────────────────

export type CoefficientHistoryCursor = { changedAt: string; id: string };

export interface ListCoefficientHistoryArgs {
  cursor?: CoefficientHistoryCursor | null;
  limit?: number;
}

/** Augmented row with the admin's display name (LEFT JOIN to users — same shape as listGlobalParamsHistory). */
export interface CoefficientHistoryListRow extends CoefficientHistoryRow {
  createdByDisplay: string | null;
}

export interface CoefficientHistoryListResult {
  rows: CoefficientHistoryListRow[];
  hasMore: boolean;
  nextCursor: CoefficientHistoryCursor | null;
}

const DEFAULT_HISTORY_LIMIT = 20;

export function encodeCoefficientHistoryCursor(
  c: CoefficientHistoryCursor,
): string {
  return Buffer.from(JSON.stringify(c), 'utf8').toString('base64url');
}

export function decodeCoefficientHistoryCursor(
  encoded: string,
): CoefficientHistoryCursor | null {
  const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    );
    if (
      typeof parsed?.changedAt === 'string' &&
      typeof parsed?.id === 'string' &&
      ISO_RE.test(parsed.changedAt) &&
      UUID_RE.test(parsed.id)
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Cursor-paginated newest-first read of coefficient_history.
 * Default limit = 20, fetch limit+1 to compute hasMore. Mirrors the
 * listGlobalParamsHistory shape so the Phase 14 sidebar consumer can
 * pick up the same encode/decode/cursor primitives.
 *
 * LEFT JOIN to users surfaces `createdByDisplay = COALESCE(displayName, email)`
 * (NULL for backfilled seed-row where changedByUserId is also NULL).
 */
export async function listCoefficientHistory(
  args: ListCoefficientHistoryArgs = {},
): Promise<CoefficientHistoryListResult> {
  const dbi = db();
  const limit = args.limit ?? DEFAULT_HISTORY_LIMIT;
  const fetchCount = limit + 1;
  const cursor = args.cursor ?? null;

  const cursorPredicate = cursor
    ? sql`(${schema.coefficientHistory.changedAt}, ${schema.coefficientHistory.id}) < (${cursor.changedAt}::timestamptz, ${cursor.id}::uuid)`
    : undefined;

  const rawRows = await dbi
    .select({
      id: schema.coefficientHistory.id,
      changedAt: schema.coefficientHistory.changedAt,
      changedByUserId: schema.coefficientHistory.changedByUserId,
      beforeJson: schema.coefficientHistory.beforeJson,
      afterJson: schema.coefficientHistory.afterJson,
      summary: schema.coefficientHistory.summary,
      createdByDisplay: sql<
        string | null
      >`COALESCE(${schema.users.displayName}, ${schema.users.email})`,
    })
    .from(schema.coefficientHistory)
    .leftJoin(
      schema.users,
      eq(schema.users.id, schema.coefficientHistory.changedByUserId),
    )
    .where(cursorPredicate ? and(cursorPredicate) : undefined)
    .orderBy(
      desc(schema.coefficientHistory.changedAt),
      desc(schema.coefficientHistory.id),
    )
    .limit(fetchCount);

  const hasMore = rawRows.length > limit;
  const sliced = hasMore ? rawRows.slice(0, limit) : rawRows;
  const last = sliced[sliced.length - 1];
  const nextCursor: CoefficientHistoryCursor | null =
    hasMore && last
      ? { changedAt: last.changedAt.toISOString(), id: last.id }
      : null;

  return { rows: sliced, hasMore, nextCursor };
}

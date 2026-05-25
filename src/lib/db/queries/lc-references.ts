import 'server-only';
import { and, isNotNull, or, ilike, desc, sql, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { deriveDisplayStatus, type DisplayStatus } from '@/lib/db/queries/proposals';

/**
 * Phase 19 Plan 02 — Cross-partner LC reference query helpers.
 *
 * (a) T-19-02-01: no userId scoping — admin-only consumer. Upstream
 *     gate is requireAdmin() in the SSR route + layout. This helper
 *     intentionally drops per-partner userId filtering (mirrors
 *     getMonthlyProposalCountAll — the Phase 18 cross-partner aggregate).
 * (b) D-14 — search: `lc_ref ILIKE %q%` OR `users.name ILIKE %q%`
 *     OR `inputs->>'clientName' ILIKE %q%`.
 * (c) D-15 — default sort: created_at DESC, id DESC.
 * (d) D-16 — cursor pagination via (created_at, id) composite key.
 * (e) D-11/D-12 — includes ALL lc_ref IS NOT NULL rows regardless of
 *     status, including soft-deleted (deletedAt IS NOT NULL within
 *     30-day purge window) and drafts.
 * (f) ADMIN-09 invariant: paramsSnapshot bearing commission_pct MUST NOT
 *     appear in LcReferenceRow. The row projection is bounded to the 7-field
 *     shape below; gates 11 + 12 verify at runtime.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LcReferenceRow {
  id: string;
  lcRef: string;
  partnerName: string;
  clientName: string;
  amountHt: number;
  displayStatus: DisplayStatus;
  createdAt: Date;
  // CRITICAL: NO commissionPct, NO paramsSnapshot, NO commission-bearing field.
}

export interface ListLcReferencesParams {
  q?: string;
  cursorEncoded?: string | null;
  limit?: number;
}

interface LcReferenceCursor {
  createdAt: string; // ISO string (mirrors proposals.ts Cursor shape)
  id: string;
}

// ── Cursor encoding ───────────────────────────────────────────────────────────

/**
 * Encode a cursor for the LC reference list pagination.
 * Uses base64url to match the Phase 8 / Phase 17 cursor convention.
 * Shape mirrors encodeCursor from proposals.ts: { createdAt: ISO, id: uuid }.
 */
export function encodeLcRefCursor(cursor: { createdAt: Date; id: string }): string {
  const payload: LcReferenceCursor = {
    createdAt: cursor.createdAt.toISOString(),
    id: cursor.id,
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

/**
 * Decode a cursor string for LC reference pagination.
 * Returns null on any error (graceful fallback — T-19-02-06 malicious cursor mitigation).
 * Shape mirrors decodeCursor from proposals.ts.
 */
export function decodeLcRefCursor(
  encoded: string | null | undefined,
): { createdAt: Date; id: string } | null {
  if (!encoded) return null;
  const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'createdAt' in parsed &&
      'id' in parsed &&
      typeof (parsed as Record<string, unknown>).createdAt === 'string' &&
      typeof (parsed as Record<string, unknown>).id === 'string' &&
      ISO_RE.test((parsed as Record<string, unknown>).createdAt as string) &&
      UUID_RE.test((parsed as Record<string, unknown>).id as string)
    ) {
      const { createdAt, id } = parsed as LcReferenceCursor;
      return { createdAt: new Date(createdAt), id };
    }
    return null;
  } catch {
    return null;
  }
}

// ── Query helper ──────────────────────────────────────────────────────────────

/**
 * Cross-partner LC reference list with cursor pagination, search, and
 * soft-delete visibility window.
 *
 * Returns { rows: LcReferenceRow[], hasMore: boolean, nextCursor: string | null }.
 *
 * T-19-02-01: no userId filter — admin-only; upstream gate is requireAdmin().
 * T-19-02-03: q param is passed through Drizzle ilike() (parameter-bound) or
 *             sql`` template (for jsonb path); never string-concatenated.
 * T-19-02-06: cursor decoded with try/catch; null on any malformed input.
 */
export async function listLcReferences(
  params: ListLcReferencesParams,
): Promise<{ rows: LcReferenceRow[]; hasMore: boolean; nextCursor: string | null }> {
  const dbi = db(); // lazy singleton factory per CONVENTIONS.md §Module Design
  const limit = params.limit ?? 20;
  const cursor = decodeLcRefCursor(params.cursorEncoded ?? null);
  const q = params.q?.trim() ?? '';

  // ── Conditions ─────────────────────────────────────────────────────────────

  // D-11: only issued references (lc_ref IS NOT NULL)
  const lcRefNotNull = isNotNull(schema.proposals.lcRef);

  // D-12: include soft-deleted within 30-day purge window
  // (rows outside 30-day window are eventually hard-deleted by Phase 10 cron)
  const deletedAtVisible = or(
    sql`${schema.proposals.deletedAt} IS NULL`,
    sql`${schema.proposals.deletedAt} >= NOW() - INTERVAL '30 days'`,
  );

  // D-14: ILIKE search on 3 fields (parameter-bound via Drizzle ilike() + sql template)
  const searchPredicate =
    q.length > 0
      ? or(
          ilike(schema.proposals.lcRef, `%${q}%`),
          ilike(schema.users.name, `%${q}%`),
          sql`(${schema.proposals.inputs} ->> 'clientName') ILIKE ${`%${q}%`}`,
        )
      : undefined;

  // D-16: cursor pagination via (created_at, id) composite tuple
  // Drizzle has no native row-tuple compare; use sql`` template (mirrors proposals.ts)
  const cursorPredicate = cursor
    ? sql`(${schema.proposals.createdAt}, ${schema.proposals.id}) < (${cursor.createdAt.toISOString()}::timestamptz, ${cursor.id}::uuid)`
    : undefined;

  const conditions = and(
    lcRefNotNull,
    deletedAtVisible,
    searchPredicate,
    cursorPredicate,
  );

  // ── Query (D-15: ORDER BY created_at DESC, id DESC) ────────────────────────
  const raw = await dbi
    .select({
      id: schema.proposals.id,
      lcRef: schema.proposals.lcRef,
      status: schema.proposals.status,
      deletedAt: schema.proposals.deletedAt,
      pdfGeneratedAt: schema.proposals.pdfGeneratedAt,
      paramsSnapshot: schema.proposals.paramsSnapshot,
      createdAt: schema.proposals.createdAt,
      partnerName: schema.users.name,
      clientNameRaw: sql<string>`(${schema.proposals.inputs} ->> 'clientName')`,
      amountHtRaw: sql<string>`(${schema.proposals.inputs} ->> 'amountHt')`,
    })
    .from(schema.proposals)
    .innerJoin(schema.users, eq(schema.users.id, schema.proposals.userId))
    .where(conditions)
    .orderBy(desc(schema.proposals.createdAt), desc(schema.proposals.id))
    .limit(limit + 1); // +1 for hasMore detection

  // ── Projection — CRITICAL: paramsSnapshot MUST NOT appear in LcReferenceRow ─
  // deriveDisplayStatus reads paramsSnapshot internally but returns only the
  // bounded DisplayStatus union; the full paramsSnapshot never escapes this fn.
  const projected: LcReferenceRow[] = raw.map((row) => ({
    id: row.id,
    lcRef: row.lcRef ?? '', // isNotNull filter guarantees this is non-null
    partnerName: row.partnerName,
    clientName: row.clientNameRaw ?? '',
    amountHt: row.amountHtRaw ? Number(row.amountHtRaw) : 0,
    displayStatus: deriveDisplayStatus({
      status: row.status,
      deletedAt: row.deletedAt,
      pdfGeneratedAt: row.pdfGeneratedAt,
      paramsSnapshot: row.paramsSnapshot,
    } as Parameters<typeof deriveDisplayStatus>[0]),
    createdAt: row.createdAt,
  }));

  // ── hasMore detection + cursor emission ────────────────────────────────────
  const hasMore = projected.length > limit;
  const rows = hasMore ? projected.slice(0, limit) : projected;
  const nextCursor =
    hasMore && rows.length > 0
      ? encodeLcRefCursor({ createdAt: rows[rows.length - 1].createdAt, id: rows[rows.length - 1].id })
      : null;

  return { rows, hasMore, nextCursor };
}

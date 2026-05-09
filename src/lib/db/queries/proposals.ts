import 'server-only';
import { and, desc, eq, gt, ilike, isNotNull, isNull, lt, or, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type { ProposalRow, NewProposalRow } from '@/db/schema';

export type Cursor = { createdAt: string; id: string };

export interface CreateProposalArgs {
  userId: string;
  language: 'fr' | 'en';
  lcRef: string;
  idempotencyKey: string;
  schemaVersion: string;       // '1.0.0'
  inputs: Record<string, unknown>;
  paramsSnapshot: Record<string, unknown>;
  computed: Record<string, unknown>;
  duplicatedFromId?: string | null;
}

export interface FinalizePdfArgs {
  proposalId: string;
  pdfBlobKey: string;
  pdfSha256: string;
  pdfSizeBytes: number;
  pdfGeneratedAt: Date;
}

export interface ListProposalsArgs {
  userId: string;
  cursor?: Cursor | null;
  limit?: number;     // default 20 (returns up to 21 server-side, slices to 20 + sets hasMore)
  deleted?: boolean;  // false (default) → active rows; true → 30-day deleted window
}

export interface SearchProposalsArgs extends ListProposalsArgs {
  q: string;          // raw, untrimmed; helper trims + wraps in %s
}

export interface ListResult {
  rows: ProposalRow[];
  hasMore: boolean;
  nextCursor: Cursor | null;
}

const DEFAULT_LIMIT = 20;
const SOFT_DELETE_WINDOW = sql`now() - interval '30 days'`;

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c), 'utf8').toString('base64url');
}

export function decodeCursor(encoded: string): Cursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (typeof parsed?.createdAt === 'string' && typeof parsed?.id === 'string') return parsed;
    return null;
  } catch {
    return null;
  }
}

/**
 * INSERT a new proposal row. PDF columns left NULL (filled by
 * finalizePdfBlobOnProposal after upload completes — D-B1 step 7).
 *
 * Plan 08-07 calls this AFTER passing proposalInputSchema.parse() and
 * server-side computeLoyer(). Caller is responsible for constructing
 * paramsSnapshot from the latest globalParams row (DATA-06) and computed
 * from CALC-07 server-recompute.
 */
export async function createProposal(args: CreateProposalArgs): Promise<ProposalRow> {
  const dbi = db();
  const insert: NewProposalRow = {
    userId: args.userId,
    language: args.language,
    lcRef: args.lcRef,
    idempotencyKey: args.idempotencyKey,
    schemaVersion: args.schemaVersion,
    inputs: args.inputs,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    paramsSnapshot: args.paramsSnapshot as any,    // jsonb $type cast — caller's responsibility
    computed: args.computed,
    duplicatedFromId: args.duplicatedFromId ?? null,
  };
  const [row] = await dbi.insert(schema.proposals).values(insert).returning();
  return row;
}

/**
 * UPDATE pdf_blob_key + sha256 + size + generated_at by id.
 * Plan 08-07 calls this after blob upload completes.
 */
export async function finalizePdfBlobOnProposal(args: FinalizePdfArgs): Promise<void> {
  const dbi = db();
  await dbi.update(schema.proposals).set({
    pdfBlobKey: args.pdfBlobKey,
    pdfSha256: args.pdfSha256,
    pdfSizeBytes: args.pdfSizeBytes,
    pdfGeneratedAt: args.pdfGeneratedAt,
  }).where(eq(schema.proposals.id, args.proposalId));
}

/**
 * D-B2 idempotency lookup. Returns the existing row if (user_id,
 * idempotency_key) collides. Plan 08-07 returns the existing id to the
 * client when this returns non-null, AVOIDING duplicate INSERT.
 *
 * NOTE: includes soft-deleted rows so a partner who hits Generate twice with
 * the same form session AFTER a render-failure tombstone (D-B1) does not
 * silently double-create. The caller surfaces the existing row's state.
 */
export async function findByIdempotencyKey(
  userId: string,
  idempotencyKey: string,
): Promise<ProposalRow | null> {
  const dbi = db();
  const row = await dbi.query.proposals.findFirst({
    where: and(
      eq(schema.proposals.userId, userId),
      eq(schema.proposals.idempotencyKey, idempotencyKey),
    ),
  });
  return row ?? null;
}

/** Plan 08-08, 08-10, 08-12, 08-13 callers. Ownership check is the route's job. */
export async function getProposalById(id: string): Promise<ProposalRow | null> {
  const dbi = db();
  const row = await dbi.query.proposals.findFirst({
    where: eq(schema.proposals.id, id),
  });
  return row ?? null;
}

/**
 * Cursor-paginated list (D-C1). Returns up to `limit + 1` server-side, sets
 * hasMore from the overflow, slices to `limit` for the response.
 *
 * cursor = (created_at, id). Tuple comparison: `(created_at, id) < (cursor.createdAt, cursor.id)`.
 * Drizzle has no native row-tuple compare, so emit raw SQL via `sql`.
 */
export async function listProposalsByUser(args: ListProposalsArgs): Promise<ListResult> {
  const dbi = db();
  const limit = args.limit ?? DEFAULT_LIMIT;
  const fetchCount = limit + 1;

  // deleted_at predicate
  const deletedPredicate = args.deleted
    ? and(
        isNotNull(schema.proposals.deletedAt),
        gt(schema.proposals.deletedAt, SOFT_DELETE_WINDOW),
      )
    : isNull(schema.proposals.deletedAt);

  // cursor predicate: (created_at, id) < (cursor.createdAt, cursor.id)
  const cursorPredicate = args.cursor
    ? sql`(${schema.proposals.createdAt}, ${schema.proposals.id}) < (${args.cursor.createdAt}::timestamptz, ${args.cursor.id}::uuid)`
    : undefined;

  const where = and(
    eq(schema.proposals.userId, args.userId),
    deletedPredicate,
    cursorPredicate,
  );

  const rows = await dbi.select().from(schema.proposals)
    .where(where)
    .orderBy(desc(schema.proposals.createdAt), desc(schema.proposals.id))
    .limit(fetchCount);

  const hasMore = rows.length > limit;
  const sliced = hasMore ? rows.slice(0, limit) : rows;
  const last = sliced[sliced.length - 1];
  const nextCursor = hasMore && last
    ? { createdAt: last.createdAt.toISOString(), id: last.id }
    : null;

  return { rows: sliced, hasMore, nextCursor };
}

/**
 * D-C2 search. ILIKE on lc_ref OR (inputs->>'clientCo') when q is non-empty.
 * Empty q returns the same rows as listProposalsByUser (no extra filter).
 *
 * Drizzle's ilike() handles parameterization; the `%` wrapping happens here so
 * SQL injection-style content in q can't reshape the LIKE pattern.
 *
 * NOTE: client_co is stored inside the `inputs` jsonb (the form schema). We
 * search against `inputs->>'clientCo'` cast to text. This is acceptable for
 * the v1.1 partner-proposal-count scale (<100s); a Phase 11+ optimization
 * could extract clientCo into a denormalized indexed column.
 */
export async function searchProposals(args: SearchProposalsArgs): Promise<ListResult> {
  const dbi = db();
  const limit = args.limit ?? DEFAULT_LIMIT;
  const fetchCount = limit + 1;

  const q = args.q.trim();
  if (q.length === 0) {
    return listProposalsByUser(args);
  }
  const pattern = `%${q}%`;

  const deletedPredicate = args.deleted
    ? and(
        isNotNull(schema.proposals.deletedAt),
        gt(schema.proposals.deletedAt, SOFT_DELETE_WINDOW),
      )
    : isNull(schema.proposals.deletedAt);

  const cursorPredicate = args.cursor
    ? sql`(${schema.proposals.createdAt}, ${schema.proposals.id}) < (${args.cursor.createdAt}::timestamptz, ${args.cursor.id}::uuid)`
    : undefined;

  const searchPredicate = or(
    sql`(${schema.proposals.inputs} ->> 'clientCo') ILIKE ${pattern}`,
    ilike(schema.proposals.lcRef, pattern),
  );

  const where = and(
    eq(schema.proposals.userId, args.userId),
    deletedPredicate,
    searchPredicate,
    cursorPredicate,
  );

  const rows = await dbi.select().from(schema.proposals)
    .where(where)
    .orderBy(desc(schema.proposals.createdAt), desc(schema.proposals.id))
    .limit(fetchCount);

  const hasMore = rows.length > limit;
  const sliced = hasMore ? rows.slice(0, limit) : rows;
  const last = sliced[sliced.length - 1];
  const nextCursor = hasMore && last
    ? { createdAt: last.createdAt.toISOString(), id: last.id }
    : null;

  return { rows: sliced, hasMore, nextCursor };
}

/**
 * Soft delete (PROP-22 / DATA-10). Ownership embedded in WHERE clause as
 * defence-in-depth alongside the route's requireUser ownership check.
 * Returns the affected count (0 = not found / not owned / already deleted).
 */
export async function softDeleteProposal(
  proposalId: string,
  userId: string,
): Promise<number> {
  const dbi = db();
  const result = await dbi.update(schema.proposals).set({
    deletedAt: new Date(),
  }).where(and(
    eq(schema.proposals.id, proposalId),
    eq(schema.proposals.userId, userId),
    isNull(schema.proposals.deletedAt),
  )).returning();
  return result.length;
}

/**
 * Restore (D-C3). Only succeeds within the 30-day window — outside of it,
 * the row is a candidate for hard purge and restore is forbidden.
 */
export async function restoreProposal(
  proposalId: string,
  userId: string,
): Promise<number> {
  const dbi = db();
  const result = await dbi.update(schema.proposals).set({
    deletedAt: null,
  }).where(and(
    eq(schema.proposals.id, proposalId),
    eq(schema.proposals.userId, userId),
    isNotNull(schema.proposals.deletedAt),
    gt(schema.proposals.deletedAt, SOFT_DELETE_WINDOW),
  )).returning();
  return result.length;
}

/**
 * Hard purge (Plan 08-14 manual CLI). Returns the deleted row so the CLI can
 * pass pdf_blob_key to the storage adapter for blob delete BEFORE the row
 * disappears (so a crash mid-purge leaves the row in place to retry).
 */
export async function hardPurgeProposal(proposalId: string): Promise<ProposalRow | null> {
  const dbi = db();
  const [deleted] = await dbi.delete(schema.proposals)
    .where(and(
      eq(schema.proposals.id, proposalId),
      isNotNull(schema.proposals.deletedAt),
      lt(schema.proposals.deletedAt, SOFT_DELETE_WINDOW),
    ))
    .returning();
  return deleted ?? null;
}

/** Plan 08-14 helper: list candidates to purge (deleted_at < 30d ago). */
export async function listPurgeCandidates(): Promise<ProposalRow[]> {
  const dbi = db();
  return dbi.select().from(schema.proposals)
    .where(and(
      isNotNull(schema.proposals.deletedAt),
      lt(schema.proposals.deletedAt, SOFT_DELETE_WINDOW),
    ))
    .orderBy(schema.proposals.deletedAt);
}

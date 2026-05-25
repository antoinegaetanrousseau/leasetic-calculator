import 'server-only';
import { and, desc, eq, gt, ilike, isNotNull, isNull, lt, or, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type { ProposalRow, NewProposalRow } from '@/db/schema';
import { writeAuditLog } from './audit-log';

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
  /**
   * Phase 17 D-13 — Archivées filter. When true, the helper returns rows
   * matching `(status='active' AND past validity)` OR `(status='deleted' AND
   * deleted_at within 30-day window)`, scoped to userId. The expired
   * derivation defers to `deriveDisplayStatus` app-side (single source of
   * truth — paramsSnapshot.validityDays + pdfGeneratedAt math lives there).
   * Defaults to false. Orthogonal to `deleted` (D-13 retires the v1.1 toggle).
   */
  archived?: boolean;
  /**
   * Brouillons filter. When true, returns rows where status='draft' AND
   * inputs != '{}' (non-phantom) AND deletedAt IS NULL. Mutually exclusive
   * with `archived` — callers should set at most one of the two to true.
   */
  drafts?: boolean;
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
  const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (
      typeof parsed?.createdAt === 'string' &&
      typeof parsed?.id === 'string' &&
      ISO_RE.test(parsed.createdAt) &&
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

  // cursor predicate: (created_at, id) < (cursor.createdAt, cursor.id)
  const cursorPredicate = args.cursor
    ? sql`(${schema.proposals.createdAt}, ${schema.proposals.id}) < (${args.cursor.createdAt}::timestamptz, ${args.cursor.id}::uuid)`
    : undefined;

  // Brouillons branch — non-phantom drafts only (inputs != '{}').
  if (args.drafts) {
    const where = and(
      eq(schema.proposals.userId, args.userId),
      eq(schema.proposals.status, 'draft'),
      isNull(schema.proposals.deletedAt),
      sql`${schema.proposals.inputs} != '{}'::jsonb`,
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

  // Phase 17 D-13 — Archivées branch. Candidate set = (active rows that may be
  // expired) UNION (soft-deleted within 30-day window). Then deriveDisplayStatus
  // narrows to only expired-or-deleted rows app-side (D-12 single source of
  // truth — keeps the paramsSnapshot.validityDays + pdfGeneratedAt math out of
  // SQL). T-17-01-01 IDOR mitigation: userId scope is the FIRST AND predicate
  // and is present in every branch below.
  if (args.archived) {
    const archivedCandidatePredicate = or(
      // Active rows that MAY be expired (deriveDisplayStatus narrows further).
      and(
        eq(schema.proposals.status, 'active'),
        isNull(schema.proposals.deletedAt),
      ),
      // Soft-deleted within the 30-day window.
      and(
        eq(schema.proposals.status, 'deleted'),
        isNotNull(schema.proposals.deletedAt),
        gt(schema.proposals.deletedAt, SOFT_DELETE_WINDOW),
      ),
    );
    const whereArchived = and(
      eq(schema.proposals.userId, args.userId), // CRITICAL: userId always first
      archivedCandidatePredicate,
      cursorPredicate,
    );
    // Fetch with extra headroom: app-side deriveDisplayStatus drop may shrink
    // the result. Cap at fetchCount * 3 to bound the worst case; pagination
    // boundary correctness in degraded edge cases is acceptable for v1.3
    // partner volume (<1000 rows/partner per CONTEXT D-12 + threat T-17-01-06).
    const candidateRows = await dbi.select().from(schema.proposals)
      .where(whereArchived)
      .orderBy(desc(schema.proposals.createdAt), desc(schema.proposals.id))
      .limit(fetchCount * 3);

    // App-side narrow: keep only rows whose deriveDisplayStatus is 'expired'
    // (active-past-validity branch) or 'deleted' (soft-deleted-within-window
    // branch). Drop active-not-yet-expired rows from the candidate set.
    const narrowed = candidateRows.filter((row) => {
      const ds = deriveDisplayStatus(row);
      return ds === 'expired' || ds === 'deleted';
    });

    const hasMore = narrowed.length > limit;
    const sliced = hasMore ? narrowed.slice(0, limit) : narrowed;
    const last = sliced[sliced.length - 1];
    const nextCursor = hasMore && last
      ? { createdAt: last.createdAt.toISOString(), id: last.id }
      : null;
    return { rows: sliced, hasMore, nextCursor };
  }

  // deleted_at predicate (v1.1 toggle path — retiring with Partner Home Phase 17 rewrite).
  const deletedPredicate = args.deleted
    ? and(
        isNotNull(schema.proposals.deletedAt),
        gt(schema.proposals.deletedAt, SOFT_DELETE_WINDOW),
      )
    : isNull(schema.proposals.deletedAt);

  // D-08 / Phase 12: stored status is the source of truth. For the active list
  // (deleted=false), filter out drafts via status='active'. For the deleted-window
  // (deleted=true), the deletedPredicate already isolates tombstoned rows.
  const statusPredicate = args.deleted
    ? undefined
    : eq(schema.proposals.status, 'active');

  const where = and(
    eq(schema.proposals.userId, args.userId),
    deletedPredicate,
    statusPredicate,
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

  const cursorPredicate = args.cursor
    ? sql`(${schema.proposals.createdAt}, ${schema.proposals.id}) < (${args.cursor.createdAt}::timestamptz, ${args.cursor.id}::uuid)`
    : undefined;

  const searchPredicate = or(
    sql`(${schema.proposals.inputs} ->> 'clientCo') ILIKE ${pattern}`,
    ilike(schema.proposals.lcRef, pattern),
  );

  // Brouillons + q branch.
  if (args.drafts) {
    const where = and(
      eq(schema.proposals.userId, args.userId),
      eq(schema.proposals.status, 'draft'),
      isNull(schema.proposals.deletedAt),
      sql`${schema.proposals.inputs} != '{}'::jsonb`,
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

  // Phase 17 D-13 — Archivées + q orthogonal branch. Same candidate-set +
  // app-side deriveDisplayStatus narrow as listProposalsByUser.archived.
  // T-17-01-01 IDOR mitigation: userId is the FIRST AND predicate.
  if (args.archived) {
    const archivedCandidatePredicate = or(
      and(
        eq(schema.proposals.status, 'active'),
        isNull(schema.proposals.deletedAt),
      ),
      and(
        eq(schema.proposals.status, 'deleted'),
        isNotNull(schema.proposals.deletedAt),
        gt(schema.proposals.deletedAt, SOFT_DELETE_WINDOW),
      ),
    );
    const whereArchivedSearch = and(
      eq(schema.proposals.userId, args.userId),
      archivedCandidatePredicate,
      searchPredicate,
      cursorPredicate,
    );
    const candidateRows = await dbi.select().from(schema.proposals)
      .where(whereArchivedSearch)
      .orderBy(desc(schema.proposals.createdAt), desc(schema.proposals.id))
      .limit(fetchCount * 3);
    const narrowed = candidateRows.filter((row) => {
      const ds = deriveDisplayStatus(row);
      return ds === 'expired' || ds === 'deleted';
    });
    const hasMore = narrowed.length > limit;
    const sliced = hasMore ? narrowed.slice(0, limit) : narrowed;
    const last = sliced[sliced.length - 1];
    const nextCursor = hasMore && last
      ? { createdAt: last.createdAt.toISOString(), id: last.id }
      : null;
    return { rows: sliced, hasMore, nextCursor };
  }

  const deletedPredicate = args.deleted
    ? and(
        isNotNull(schema.proposals.deletedAt),
        gt(schema.proposals.deletedAt, SOFT_DELETE_WINDOW),
      )
    : isNull(schema.proposals.deletedAt);

  // D-08 / Phase 12: same status filter as listProposalsByUser — drafts excluded
  // from active search results.
  const statusPredicate = args.deleted
    ? undefined
    : eq(schema.proposals.status, 'active');

  const where = and(
    eq(schema.proposals.userId, args.userId),
    deletedPredicate,
    statusPredicate,
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
 * Returns the affected count (0 = not found / not owned / already deleted / is a draft).
 *
 * D-08 lockstep: writes BOTH `deletedAt: now()` AND `status: 'deleted'` in
 * the same UPDATE. Two columns always move together; downstream code that
 * filters on either predicate sees a consistent state.
 *
 * WHERE filters on `status='active'` to exclude drafts. A draft row has all
 * four of (lc_ref, idempotency_key, params_snapshot, computed) at NULL — if
 * this helper wrote status='deleted' onto such a row, the
 * `proposals_finalized_completeness_check` (D-04) would reject the UPDATE
 * with SQLSTATE 23514. Drafts must be discarded via a different path (e.g.,
 * Phase 13's discardDraft hard-delete or a draft-aware status transition).
 */
export async function softDeleteProposal(
  proposalId: string,
  userId: string,
): Promise<number> {
  const dbi = db();
  const result = await dbi.update(schema.proposals).set({
    deletedAt: new Date(),
    status: 'deleted',
  }).where(and(
    eq(schema.proposals.id, proposalId),
    eq(schema.proposals.userId, userId),
    eq(schema.proposals.status, 'active'),
    isNull(schema.proposals.deletedAt),
  )).returning();
  return result.length;
}

/**
 * Restore (D-C3). Only succeeds within the 30-day window — outside of it,
 * the row is a candidate for hard purge and restore is forbidden.
 *
 * D-08 lockstep: writes BOTH `deletedAt: null` AND `status: 'active'` in
 * the same UPDATE. A restored row always returns to 'active'. WHERE filters
 * on `status='deleted'` for symmetry with softDeleteProposal — drafts are
 * never put into the `deleted` state by softDelete (its WHERE excludes
 * them), so this filter is a no-op for drafts in practice but prevents any
 * future path that might directly write status='deleted' onto a draft from
 * being reachable via restore.
 */
export async function restoreProposal(
  proposalId: string,
  userId: string,
): Promise<number> {
  const dbi = db();
  const result = await dbi.update(schema.proposals).set({
    deletedAt: null,
    status: 'active',
  }).where(and(
    eq(schema.proposals.id, proposalId),
    eq(schema.proposals.userId, userId),
    eq(schema.proposals.status, 'deleted'),
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

// ── Phase 12 — DB-01: Draft CRUD lifecycle ──────────────────────────────────

export interface CreateDraftArgs {
  userId: string;
  language: 'fr' | 'en';
}

// ── Phase 17 D-03 / D-04 — per-user sequential lc_ref allocation ────────────

/** Format constant for the v1.3 LC reference: `LC-2026-NNN` (≥3-digit pad). */
const LC_REF_PREFIX = 'LC-2026-';
const LC_REF_MIN_PAD = 3;
const ALLOCATE_RETRY_MAX = 3;

/**
 * Format an integer suffix as `LC-2026-NNN` matching the v1.3 contract.
 * Suffixes ≥ 1000 keep their natural width (no zero-padding to 4+ digits).
 */
function formatLcRef(n: number): string {
  return `${LC_REF_PREFIX}${String(n).padStart(LC_REF_MIN_PAD, '0')}`;
}

/**
 * Parse the numeric suffix from an `LC-2026-NNN` string. Returns NaN for
 * non-matching strings (e.g. legacy `LC-12345` produced by Phase 8's random
 * generator). Callers treat NaN as "no usable prior" and start at 1.
 */
function parseLcRefSuffix(ref: string | null | undefined): number {
  if (!ref) return NaN;
  if (!ref.startsWith(LC_REF_PREFIX)) return NaN;
  const tail = ref.slice(LC_REF_PREFIX.length);
  if (!/^\d+$/.test(tail)) return NaN;
  return Number(tail);
}

/**
 * Phase 17 D-03 — allocate the next sequential `lc_ref` for a partner.
 *
 * Per 17-PATTERNS.md recommendation (b): SELECT the most-recent matching
 * `LC-2026-NNN` row for this user, parse its suffix, increment, format. If no
 * prior matching row exists, start at `LC-2026-001`.
 *
 * D-04 gap-tolerance: abandoned drafts consume sequence numbers. The partial
 * unique index `proposals_user_id_lc_ref_uq WHERE lc_ref IS NOT NULL` (Phase
 * 12 D-05) is the uniqueness backstop. On unique-violation we re-SELECT and
 * retry up to ALLOCATE_RETRY_MAX times — this handles the rare race between
 * two concurrent createDraft calls for the same user that select the same
 * tail value before either INSERTs.
 *
 * Internal helper (not exported). Used by createDraft below.
 */
async function allocateNextLcRefForUser(userId: string): Promise<string> {
  const dbi = db();
  // Order DESC over `lc_ref` text — `LC-2026-NNN` sorts lexicographically
  // correct for same-width suffixes; the SQL filter `LIKE 'LC-2026-%'`
  // excludes any legacy `LC-NNNNN` (Phase 8 random) rows so they don't shadow
  // the v1.3 sequence. Real per-user volume is small (<1000 rows) so even an
  // imperfect lex sort is bounded; parseLcRefSuffix guards the parse.
  const rows = await dbi
    .select({ lcRef: schema.proposals.lcRef })
    .from(schema.proposals)
    .where(
      and(
        eq(schema.proposals.userId, userId),
        isNotNull(schema.proposals.lcRef),
        sql`${schema.proposals.lcRef} LIKE ${`${LC_REF_PREFIX}%`}`,
      ),
    )
    .orderBy(desc(schema.proposals.lcRef))
    .limit(1);

  const prior = rows[0]?.lcRef ?? null;
  const priorSuffix = parseLcRefSuffix(prior);
  const next = Number.isFinite(priorSuffix) ? priorSuffix + 1 : 1;
  return formatLcRef(next);
}

/**
 * DB-01 draft creation per 12-CONTEXT.md D-01..D-03 + Phase 17 D-03/D-04.
 *
 * INSERTs a fresh row with `status='draft'`, `inputs={}` (empty jsonb), and
 * `lc_ref` pre-allocated via `allocateNextLcRefForUser`. The
 * `proposals_finalized_completeness_check` (D-04) permits NULL
 * `idempotency_key`, `params_snapshot`, `computed` while status='draft'.
 *
 * Phase 17 D-03 inversion: lc_ref is allocated HERE (was in finalizeDraft
 * pre-Phase 17). The PDF preview on wizard step 3 can therefore render the
 * REAL lc_ref instead of the Phase 13 D-15 placeholder literal (WIZ-06).
 *
 * Phase 13 D-16 invariant preserved: NO audit_log entry on draft creation.
 * audit_log fires only at finalize (lifecycle event). lc_ref pre-allocation
 * is a backend implementation detail.
 *
 * Phase 17 D-04 gap-tolerance: abandoned drafts consume sequence numbers.
 * Retry on unique-violation up to ALLOCATE_RETRY_MAX (uniqueness backstop =
 * Phase 12 D-05 partial unique index).
 *
 * Phase 13 wizard route handler calls this on `/proposals/new/parametres`
 * entry when no `?draft_id=` query param is present. Many drafts per partner
 * are allowed (D-02) — no de-duplication, no TTL.
 */
export async function createDraft(args: CreateDraftArgs): Promise<ProposalRow> {
  const dbi = db();
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < ALLOCATE_RETRY_MAX; attempt++) {
    const lcRef = await allocateNextLcRefForUser(args.userId);
    const insert: NewProposalRow = {
      userId: args.userId,
      language: args.language,
      status: 'draft',
      lcRef,
      inputs: {},
      schemaVersion: '1.0.0',
      // idempotencyKey, paramsSnapshot, computed still NULL until finalize.
    };
    try {
      const [row] = await dbi.insert(schema.proposals).values(insert).returning();
      return row;
    } catch (err) {
      // Postgres unique_violation = SQLSTATE 23505. We can't reliably check
      // the SQLSTATE through every driver wrapper without coupling — instead
      // re-SELECT and retry on ANY insert error up to the retry cap. The
      // SELECT in allocateNextLcRefForUser will pick up the just-inserted
      // sibling row on the next attempt.
      lastErr = err;
    }
  }
  throw lastErr ?? new Error('createDraft: lc_ref allocation exhausted retries');
}

export interface UpdateDraftArgs {
  /** Full replace of the inputs jsonb per CONTEXT specifics (stateless server). */
  inputs: Record<string, unknown>;
}

/**
 * DB-01 draft update. UPDATEs ONLY `inputs` on the matching row. The WHERE
 * predicate `id=<arg> AND user_id=<arg> AND status='draft' AND deletedAt IS NULL`
 * prevents cross-user tampering AND blocks accidental writes to active/deleted
 * rows. Returns the updated row or null if no row matched.
 *
 * Full-replace semantics (not partial merge) — Phase 13 wizard sends the
 * complete inputs jsonb per step.
 */
export async function updateDraft(
  proposalId: string,
  userId: string,
  args: UpdateDraftArgs,
): Promise<ProposalRow | null> {
  const dbi = db();
  const result = await dbi
    .update(schema.proposals)
    .set({ inputs: args.inputs })
    .where(
      and(
        eq(schema.proposals.id, proposalId),
        eq(schema.proposals.userId, userId),
        eq(schema.proposals.status, 'draft'),
        isNull(schema.proposals.deletedAt),
      ),
    )
    .returning();
  return result[0] ?? null;
}

export interface FinalizeDraftArgs {
  // Phase 17 D-03: `lcRef` REMOVED from this interface. The draft row already
  // has `lc_ref` allocated at createDraft time. finalizeDraft reads it from
  // the draft row inside the transaction and copies it into the UPDATE +
  // audit payload — callers must NOT pass it.
  idempotencyKey: string;
  paramsSnapshot: Record<string, unknown>;
  computed: Record<string, unknown>;
  pdfBlobKey: string;
  pdfSha256: string;
  pdfSizeBytes: number;
  pdfGeneratedAt: Date;
}

/**
 * DB-01 / D-06 / D-07 + Phase 17 D-03 — sole writer of the `draft → active`
 * transition.
 *
 * In ONE UPDATE: writes `status='active'` + the three previously-NULL columns
 * (idempotencyKey, paramsSnapshot, computed) + the four PDF columns
 * (pdfBlobKey, pdfSha256, pdfSizeBytes, pdfGeneratedAt). The `lc_ref` column
 * is re-written to the SAME value already present on the draft row (Phase 17
 * D-03 pre-allocates at createDraft) — this is a no-op write that makes the
 * audit_log entry deterministically reflect what was on the row, AND a
 * defensive backstop in case the draft row somehow has a NULL lcRef
 * (impossible after Phase 17 D-03, but throws bounded error rather than
 * silently writing NULL into the active row which would violate the Phase 12
 * D-04 completeness CHECK).
 *
 * This single-shot write preserves Phase 8's `params_snapshot` immutability
 * invariant as a draft→active transition rule — after this returns,
 * `paramsSnapshot` is never updated again.
 *
 * On success, writes one `audit_log` entry with `action='proposal.create'`
 * (matches Phase 8 semantics for the new-row audit trail). The payload
 * `lcRef` is sourced from the draft row (Phase 17 D-03), NOT from args.
 * Returns the finalized row or null if no row matched (cross-user attempt,
 * already finalized, or soft-deleted).
 */
export async function finalizeDraft(
  proposalId: string,
  userId: string,
  args: FinalizeDraftArgs,
): Promise<ProposalRow | null> {
  const dbi = db();

  // Phase 17 D-03 — source lcRef from the draft row. getDraftById scopes by
  // (id, userId, status='draft') so a cross-user or wrong-state lookup
  // returns null and we short-circuit to the same null contract as a failed
  // UPDATE below.
  const draft = await getDraftById(proposalId, userId);
  if (!draft) {
    return null;
  }
  // Defensive: post-Phase 17 drafts always have lcRef. A legacy draft
  // (pre-Phase 17 createDraft) would have NULL — bail rather than write a
  // NULL active row that would violate the Phase 12 completeness CHECK.
  if (!draft.lcRef) {
    throw new Error(
      'finalizeDraft: draft row is missing lc_ref — Phase 17 D-03 requires lc_ref allocated at createDraft',
    );
  }
  const lcRef = draft.lcRef;

  const result = await dbi
    .update(schema.proposals)
    .set({
      status: 'active',
      lcRef,
      idempotencyKey: args.idempotencyKey,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      paramsSnapshot: args.paramsSnapshot as any,
      computed: args.computed,
      pdfBlobKey: args.pdfBlobKey,
      pdfSha256: args.pdfSha256,
      pdfSizeBytes: args.pdfSizeBytes,
      pdfGeneratedAt: args.pdfGeneratedAt,
    })
    .where(
      and(
        eq(schema.proposals.id, proposalId),
        eq(schema.proposals.userId, userId),
        eq(schema.proposals.status, 'draft'),
        isNull(schema.proposals.deletedAt),
      ),
    )
    .returning();

  if (result.length === 0) {
    return null;
  }

  await writeAuditLog({
    actorId: userId,
    action: 'proposal.create',
    targetType: 'proposal',
    targetId: proposalId,
    payload: { lcRef },
  });

  return result[0];
}

/**
 * DB-01 — list a partner's drafts (newest first). Caller is the Phase 13
 * wizard "Brouillons" surface or Phase 14 admin per-partner audit.
 *
 * Predicate: `user_id=<arg> AND status='draft' AND deleted_at IS NULL`.
 * Helper signature forces userId — no overload without it (T-12-05-01
 * defense in depth).
 */
export async function listDraftsByUser(userId: string): Promise<ProposalRow[]> {
  const dbi = db();
  return dbi
    .select()
    .from(schema.proposals)
    .where(
      and(
        eq(schema.proposals.userId, userId),
        eq(schema.proposals.status, 'draft'),
        isNull(schema.proposals.deletedAt),
      ),
    )
    .orderBy(desc(schema.proposals.createdAt));
}

/**
 * Hard-deletes draft rows for `userId` where `inputs` is still the empty
 * object `{}` — i.e., rows minted by the wizard page-load but abandoned
 * before the user typed anything. Called before minting a new draft so
 * phantom empty rows don't inflate the BROUILLONS metric.
 *
 * Hard-delete is safe: an empty draft has no meaningful content and has
 * never been seen by the user (they were immediately redirected to the
 * wizard URL with the draft_id; the redirect target is what they see).
 */
export async function deleteEmptyDraftsByUser(userId: string): Promise<void> {
  const dbi = db();
  await dbi.delete(schema.proposals).where(
    and(
      eq(schema.proposals.userId, userId),
      eq(schema.proposals.status, 'draft'),
      isNull(schema.proposals.deletedAt),
      sql`${schema.proposals.inputs} = '{}'::jsonb`,
    ),
  );
}

/**
 * DB-01 — fetch a single draft by id, scoped to the owning userId. Returns
 * null for cross-user access attempts OR if the row is not a draft. Used by
 * Phase 13 wizard route handlers to resume a draft via `?draft_id=`.
 */
export async function getDraftById(
  proposalId: string,
  userId: string,
): Promise<ProposalRow | null> {
  const dbi = db();
  const row = await dbi.query.proposals.findFirst({
    where: and(
      eq(schema.proposals.id, proposalId),
      eq(schema.proposals.userId, userId),
      eq(schema.proposals.status, 'draft'),
    ),
  });
  return row ?? null;
}

// ── Phase 12 — D-07: Display status derivation ──────────────────────────────

export type DisplayStatus = 'draft' | 'active' | 'expired' | 'deleted';

/**
 * D-07 derivation rule. Stored `proposals.status` is one of
 * `('draft','active','deleted')`; `'expired'` is computed at render time from
 * `pdf_generated_at + validityDays`. Phase 11's StatusChip renders all four
 * variants — this helper is the bridge from the stored 3-state to the UI's
 * 4-state.
 *
 * Pure function — no DB. Safe to import from server or client code.
 */
export function deriveDisplayStatus(row: ProposalRow): DisplayStatus {
  if (row.status === 'deleted') return 'deleted';
  if (row.status === 'draft') return 'draft';
  // status === 'active' branch — check for expiry.
  if (row.pdfGeneratedAt == null || row.paramsSnapshot == null) {
    // Defensive: shouldn't occur post-finalize (the completeness CHECK
    // ensures both are non-null when status='active'), but render-safe.
    return 'active';
  }
  const validityDays =
    (row.paramsSnapshot as { validityDays?: number } | null)?.validityDays ??
    30;
  const expiresAt = new Date(
    row.pdfGeneratedAt.getTime() + validityDays * 24 * 60 * 60 * 1000,
  );
  if (new Date() > expiresAt) return 'expired';
  return 'active';
}

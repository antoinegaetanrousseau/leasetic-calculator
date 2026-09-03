import 'server-only';
import { and, asc, desc, eq, ilike, ne, or, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

/**
 * Phase 30 Plan 04 — owner-scoped client-relationship registry queries.
 *
 * CRM-02 CONTRACT: every exported function in this module takes an `ownerId`
 * that is a REQUIRED, non-optional, non-defaulted parameter, and that value
 * is compiled directly into the WHERE (or HAVING) clause of the SQL statement
 * the function issues. No function here accepts an "include every owner"
 * flag, a pre-checked boolean, or any other bypass. There is NO admin path in
 * this module — admins read the registry through the deliberately separate
 * `companies.ts` module instead, so an accidental partner-facing import of an
 * unscoped admin query is visible on the import line, not hidden inside an
 * argument (T-30-04-09).
 *
 * D-18 / T-30-04-02: `getClientRelationshipForOwner` returns `null` for BOTH
 * "this id does not exist" and "this id exists but is owned by someone else".
 * Callers MUST map `null` to `notFound()` (never a 403) so a probe cannot
 * distinguish the two cases.
 *
 * T-30-04-04: no function here computes a total row count or a count over
 * anything outside the caller's own owner scope. `proposalsCount` is an
 * aggregate computed INSIDE the owner-scoped join, never a global figure.
 *
 * ADMIN-09: no function in this module selects `proposals.params_snapshot`
 * or anything from `global_params`. Where a client-facing monthly figure is
 * needed, only the single needed scalar is projected out of the `computed`
 * jsonb column — the raw `computed` object itself is never part of any
 * returned row shape. Phase 33 narrows this the same way for `validityDays`
 * (`projectValidityDays`, below): a proposal-validity duration in days, not
 * a commission or rate value — the raw `params_snapshot` object still never
 * reaches any returned row shape.
 */

// ── Client book (CRM-07) ─────────────────────────────────────────────────────

export interface ClientBookRow {
  relationshipId: string;
  companyId: string;
  companyName: string;
  siren: string | null;
  proposalsCount: number;
  lastActivityAt: Date | null;
  createdAt: Date;
}

export type ClientBookSort = 'company' | 'lastActivity';
export type ClientBookDir = 'asc' | 'desc';

export interface ListClientBookArgs {
  ownerId: string;
  q?: string;
  sort?: ClientBookSort;
  dir?: ClientBookDir;
  /** base64url-encoded cursor produced by a prior call's `nextCursor`. */
  cursor?: string;
  /** Default 20 — page size. */
  limit?: number;
}

export interface ListClientBookResult {
  rows: ClientBookRow[];
  nextCursor: string | null;
}

/**
 * Cursor primitive: `k` is the stringified value of the ACTIVE sort key
 * (ISO 8601 for `lastActivity`, raw company name text for `company`), `id`
 * is the tiebreak. An empty string `k` is the sentinel for "this relationship
 * has zero proposals" (a NULL `lastActivityAt`) — company names are never
 * empty (NOT NULL column), so the sentinel cannot collide with a real name.
 */
interface ClientBookCursor {
  k: string;
  id: string;
}

function encodeCursor(c: ClientBookCursor): string {
  return Buffer.from(JSON.stringify(c), 'utf8').toString('base64url');
}

function decodeCursor(encoded: string): ClientBookCursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (typeof parsed?.k === 'string' && typeof parsed?.id === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

const DEFAULT_LIMIT = 20;

/** Raw MAX(proposals.created_at) aggregate — reused across select/having/orderBy. */
const lastActivityMax = sql<Date | null>`MAX(${schema.proposals.createdAt})`;

/**
 * HAVING predicate for `sort: 'company'` cursor pagination. `companies.name`
 * is NOT NULL, so no null-tail handling is needed — a plain tuple compare
 * against `(name, relationshipId)` suffices.
 */
function companyCursorPredicate(dir: ClientBookDir, decoded: ClientBookCursor) {
  return dir === 'desc'
    ? sql`(${schema.companies.name} < ${decoded.k}) OR (${schema.companies.name} = ${decoded.k} AND ${schema.clientRelationships.id} < ${decoded.id})`
    : sql`(${schema.companies.name} > ${decoded.k}) OR (${schema.companies.name} = ${decoded.k} AND ${schema.clientRelationships.id} > ${decoded.id})`;
}

/**
 * HAVING predicate for `sort: 'lastActivity'` cursor pagination. The column
 * is NULLABLE (zero-proposal relationships) and the ORDER BY places NULLs
 * LAST regardless of direction (see `listClientBook` below), so the cursor
 * predicate has two branches:
 *   - `decoded.k === ''` — the previous page already reached the NULL tail;
 *     remaining rows are exactly the other NULL rows, tie-broken by id.
 *   - otherwise — remaining rows are non-NULL rows strictly past the pivot,
 *     PLUS every NULL row (NULLs always sort after every non-NULL value).
 */
function lastActivityCursorPredicate(dir: ClientBookDir, decoded: ClientBookCursor) {
  if (decoded.k === '') {
    return dir === 'desc'
      ? sql`${lastActivityMax} IS NULL AND ${schema.clientRelationships.id} < ${decoded.id}`
      : sql`${lastActivityMax} IS NULL AND ${schema.clientRelationships.id} > ${decoded.id}`;
  }
  return dir === 'desc'
    ? sql`(${lastActivityMax} < ${decoded.k}::timestamptz) OR (${lastActivityMax} = ${decoded.k}::timestamptz AND ${schema.clientRelationships.id} < ${decoded.id}) OR ${lastActivityMax} IS NULL`
    : sql`(${lastActivityMax} > ${decoded.k}::timestamptz) OR (${lastActivityMax} = ${decoded.k}::timestamptz AND ${schema.clientRelationships.id} > ${decoded.id}) OR ${lastActivityMax} IS NULL`;
}

/**
 * CRM-07 — a partner/sales owner's own client book. `ownerId` is compiled
 * into the WHERE clause on every call, with or without `q`, a cursor, or an
 * explicit sort. Server-side sort + search only — no client-side re-sort of
 * a partial page, per 30-UI-SPEC.md's "Charger plus" interaction contract.
 */
export async function listClientBook(args: ListClientBookArgs): Promise<ListClientBookResult> {
  const dbi = db();
  const limit = args.limit ?? DEFAULT_LIMIT;
  const fetchCount = limit + 1;
  const sort: ClientBookSort = args.sort ?? 'lastActivity';
  const dir: ClientBookDir = args.dir ?? 'desc';

  // Search predicate — q matches company name OR siren (case-insensitive).
  // Drizzle's ilike() bind-params the pattern (T-30-04-06). A NULL siren
  // makes ilike() evaluate to NULL, which or() treats as non-matching — the
  // desired behavior for companies with no siren on file.
  const q = args.q?.trim();
  const searchPredicate = q && q.length > 0
    ? or(
        ilike(schema.companies.name, `%${q}%`),
        ilike(schema.companies.siren, `%${q}%`),
      )
    : undefined;

  // CRM-02: ownerId is ALWAYS the first predicate, always present, never optional.
  const where = and(
    eq(schema.clientRelationships.ownerId, args.ownerId),
    searchPredicate,
  );

  const decoded = args.cursor ? decodeCursor(args.cursor) : null;
  const havingPredicate = decoded
    ? sort === 'company'
      ? companyCursorPredicate(dir, decoded)
      : lastActivityCursorPredicate(dir, decoded)
    : undefined;

  const orderByClauses = sort === 'company'
    ? [
        dir === 'desc' ? desc(schema.companies.name) : asc(schema.companies.name),
        dir === 'desc' ? desc(schema.clientRelationships.id) : asc(schema.clientRelationships.id),
      ]
    : [
        // NULLS LAST is the default for ASC; DESC needs it spelled out or
        // zero-proposal relationships would jump to the top of the page.
        dir === 'desc'
          ? sql`${lastActivityMax} DESC NULLS LAST`
          : asc(lastActivityMax),
        dir === 'desc' ? desc(schema.clientRelationships.id) : asc(schema.clientRelationships.id),
      ];

  const rawRows = await dbi
    .select({
      relationshipId: schema.clientRelationships.id,
      companyId: schema.companies.id,
      companyName: schema.companies.name,
      siren: schema.companies.siren,
      createdAt: schema.clientRelationships.createdAt,
      proposalsCount: sql<number>`COUNT(${schema.proposals.id})`.as('proposals_count'),
      lastActivityAt: lastActivityMax.as('last_activity_at'),
    })
    .from(schema.clientRelationships)
    .innerJoin(schema.companies, eq(schema.companies.id, schema.clientRelationships.companyId))
    .leftJoin(
      schema.proposals,
      and(
        eq(schema.proposals.clientRelationshipId, schema.clientRelationships.id),
        ne(schema.proposals.status, 'deleted'),
      ),
    )
    .where(where)
    .groupBy(
      schema.clientRelationships.id,
      schema.companies.id,
      schema.companies.name,
      schema.companies.siren,
      schema.clientRelationships.createdAt,
    )
    .having(havingPredicate)
    .orderBy(...orderByClauses)
    .limit(fetchCount);

  const hasMore = rawRows.length > limit;
  const sliced = hasMore ? rawRows.slice(0, limit) : rawRows;
  const last = sliced[sliced.length - 1] as (typeof rawRows)[number] | undefined;
  const nextCursor = hasMore && last
    ? encodeCursor({
        k: sort === 'company'
          ? last.companyName
          : last.lastActivityAt
            ? new Date(last.lastActivityAt).toISOString()
            : '',
        id: last.relationshipId,
      })
    : null;

  const rows: ClientBookRow[] = sliced.map((r) => ({
    relationshipId: r.relationshipId,
    companyId: r.companyId,
    companyName: r.companyName,
    siren: r.siren,
    proposalsCount: Number(r.proposalsCount),
    lastActivityAt: r.lastActivityAt ? new Date(r.lastActivityAt) : null,
    createdAt: r.createdAt,
  }));

  return { rows, nextCursor };
}

// ── Client detail (CRM-06, CRM-02, CRM-04) ───────────────────────────────────

export interface ClientRelationshipDetail {
  relationshipId: string;
  companyId: string;
  companyName: string;
  siren: string | null;
  createdAt: Date;
}

/**
 * Fetch a single relationship, scoped to `ownerId` in the SAME statement.
 * Returns `null` for both "no such relationship" and "exists but is owned by
 * someone else" — see the D-18 note in this file's header comment. Callers on
 * the page layer MUST translate a `null` result into `notFound()`, never a
 * 403 — the two failure modes must render identically to a probing caller.
 */
export async function getClientRelationshipForOwner(
  relationshipId: string,
  ownerId: string,
): Promise<ClientRelationshipDetail | null> {
  const dbi = db();
  const rows = await dbi
    .select({
      relationshipId: schema.clientRelationships.id,
      companyId: schema.companies.id,
      companyName: schema.companies.name,
      siren: schema.companies.siren,
      createdAt: schema.clientRelationships.createdAt,
    })
    .from(schema.clientRelationships)
    .innerJoin(schema.companies, eq(schema.companies.id, schema.clientRelationships.companyId))
    .where(and(
      eq(schema.clientRelationships.id, relationshipId),
      eq(schema.clientRelationships.ownerId, ownerId),
    ))
    .limit(1);
  return rows[0] ?? null;
}

export interface ContactListRow {
  id: string;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
}

/**
 * CRM-04 — contacts hang off the relationship, never the shared company.
 * `owner_id = ownerId` is carried in the SAME statement as the contact
 * lookup (via the join to `client_relationships`) — this function does not
 * accept a pre-checked "caller already verified ownership" boolean, and it
 * never fetches contacts first and filters in TypeScript afterward. A
 * non-owner probing another partner's relationship id gets an empty array,
 * identical to a relationship with zero contacts (T-30-04-03).
 */
export async function listContactsForRelationship(
  relationshipId: string,
  ownerId: string,
): Promise<ContactListRow[]> {
  const dbi = db();
  return dbi
    .select({
      id: schema.contacts.id,
      name: schema.contacts.name,
      role: schema.contacts.role,
      phone: schema.contacts.phone,
      email: schema.contacts.email,
    })
    .from(schema.contacts)
    .innerJoin(
      schema.clientRelationships,
      eq(schema.clientRelationships.id, schema.contacts.clientRelationshipId),
    )
    .where(and(
      eq(schema.contacts.clientRelationshipId, relationshipId),
      eq(schema.clientRelationships.ownerId, ownerId),
    ))
    .orderBy(desc(schema.contacts.createdAt));
}

export interface RelationshipProposalRow {
  id: string;
  lcRef: string | null;
  status: 'draft' | 'active';
  language: 'fr' | 'en';
  createdAt: Date;
  deletedAt: Date | null;
  /**
   * ADMIN-09: the single client-facing monthly scalar, projected out of the
   * `computed` jsonb column server-side. The raw `computed` object (and
   * `params_snapshot`, which is never selected at all in this module) never
   * reaches this row shape.
   */
  computedClientMonthly: number | null;
  // Phase 33 (PIPE-03, D-06) — the two scalars `deriveProposalOutcome`
  // (src/lib/db/queries/proposals.ts) needs, plus the three stored outcome
  // columns. `outcome`/`outcomeDate`/`outcomeReason` are selected directly
  // (top-level `proposals` columns, no projection needed); `validityDays` is
  // narrowly projected out of `params_snapshot` — see `projectValidityDays`.
  outcome: 'won' | 'lost' | null;
  outcomeDate: Date | null;
  outcomeReason: string | null;
  pdfGeneratedAt: Date | null;
  validityDays: number | null;
}

function projectComputedClientMonthly(computed: unknown): number | null {
  const loyerHT = (computed as { loyerHT?: unknown } | null)?.loyerHT;
  if (typeof loyerHT === 'number') return loyerHT;
  if (typeof loyerHT === 'string') {
    const parsed = parseFloat(loyerHT);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * ADMIN-09 narrowing (Phase 33): projects ONLY the `validityDays` integer
 * out of the `params_snapshot` jsonb column, mirroring
 * `projectComputedClientMonthly`'s shape exactly. `validityDays` is a
 * proposal-validity duration in days, not a commission or rate value — but
 * the same discipline applies regardless: the raw `params_snapshot` object
 * itself never becomes part of any returned row shape. Returns `null` when
 * absent or non-numeric (drafts, whose `params_snapshot` is NULL).
 */
function projectValidityDays(snapshot: unknown): number | null {
  const validityDays = (snapshot as { validityDays?: unknown } | null)?.validityDays;
  if (typeof validityDays === 'number') return validityDays;
  if (typeof validityDays === 'string') {
    const parsed = parseInt(validityDays, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * CRM-06 — every proposal made for this client, on one page. Filters on BOTH
 * `client_relationship_id` AND `proposals.user_id = ownerId` in the same
 * statement (defense in depth: even if a relationship id were somehow
 * cross-linked, the proposal's own owner must still match), and excludes
 * soft-deleted rows.
 */
export async function listProposalsForRelationship(
  relationshipId: string,
  ownerId: string,
): Promise<RelationshipProposalRow[]> {
  const dbi = db();
  const rawRows = await dbi
    .select({
      id: schema.proposals.id,
      lcRef: schema.proposals.lcRef,
      status: schema.proposals.status,
      language: schema.proposals.language,
      createdAt: schema.proposals.createdAt,
      deletedAt: schema.proposals.deletedAt,
      computed: schema.proposals.computed,
      outcome: schema.proposals.outcome,
      outcomeDate: schema.proposals.outcomeDate,
      outcomeReason: schema.proposals.outcomeReason,
      pdfGeneratedAt: schema.proposals.pdfGeneratedAt,
      // Aliased as `snapshot` (not `paramsSnapshot`) — ADMIN-09 requires the
      // raw jsonb never appear under a key that could be mistaken for a
      // returned row property; `projectValidityDays` narrows it below before
      // it ever leaves this function.
      snapshot: schema.proposals.paramsSnapshot,
    })
    .from(schema.proposals)
    .where(and(
      eq(schema.proposals.clientRelationshipId, relationshipId),
      eq(schema.proposals.userId, ownerId),
      ne(schema.proposals.status, 'deleted'),
    ))
    .orderBy(desc(schema.proposals.createdAt));

  return rawRows.map((r) => ({
    id: r.id,
    lcRef: r.lcRef,
    status: r.status as 'draft' | 'active',
    language: r.language as 'fr' | 'en',
    createdAt: r.createdAt,
    deletedAt: r.deletedAt,
    computedClientMonthly: projectComputedClientMonthly(r.computed),
    outcome: r.outcome as 'won' | 'lost' | null,
    outcomeDate: r.outcomeDate,
    outcomeReason: r.outcomeReason,
    pdfGeneratedAt: r.pdfGeneratedAt,
    validityDays: projectValidityDays(r.snapshot),
  }));
}

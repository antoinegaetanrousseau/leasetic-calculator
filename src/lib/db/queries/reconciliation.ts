import 'server-only';
import { and, asc, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

/**
 * Phase 31 Plan 03 — admin-only reconciliation review-queue reads
 * (IMPORT-04/05, D-11).
 *
 * Every function in this module is ADMIN-ONLY and MUST be called behind
 * `requireAdmin()` — this module performs NO authorization of its own. It is
 * deliberately kept separate from the owner-scoped `client-relationships.ts`
 * (and lives alongside the equally admin-only `companies.ts`), so an
 * accidental import into a partner-facing page is visible on the import line
 * rather than hidden inside an argument. No function here takes an
 * `ownerId` filter — a flagged pair routinely has its two sides held by
 * DIFFERENT partners, and exposing that data to a partner would reveal that
 * someone else is working the other company. That channel-conflict
 * inference is exactly what CRM-02 exists to prevent (D-11,
 * `.planning/phases/30-company-contact-registry/30-SECURITY.md` — leakage
 * is treated as an inference property: counts, wording and status-code
 * divergence all count as channels).
 *
 * ADMIN-09: no function here selects the commission-bearing proposal input
 * snapshot, the computed jsonb blob, or anything from the admin-only
 * commission-coefficient table.
 */

type Dbi = ReturnType<typeof db>;

export type AdminPairReason = 'differing' | 'one_missing' | 'both_missing';

export interface AdminPairOwner {
  ownerId: string;
  ownerDisplayName: string;
  isInternal: boolean;
}

export interface AdminPairSide {
  companyId: string;
  name: string;
  siren: string | null;
  relationsCount: number;
  contactsCount: number;
  proposalsCount: number;
  owners: AdminPairOwner[];
}

export interface AdminPendingPairRow {
  pairId: string;
  reason: AdminPairReason;
  nameNormalized: string;
  sideA: AdminPairSide;
  sideB: AdminPairSide;
  // UI-SPEC Assumption A-4: exactly one shape, computed here, never derived
  // client-side. null when zero or MORE THAN ONE owner holds both sides —
  // the Access & Non-Leakage Contract point 4 forbids inventing a
  // two-owner display, so a >1 case is surfaced only via compoundOwnerCount.
  compoundMergeWarning: { ownerName: string; ownerType: 'partner' | 'sales' } | null;
  compoundOwnerCount: number;
}

export interface ListPendingPairsArgs {
  cursor?: string;
  limit?: number;
}

export interface ListPendingPairsResult {
  rows: AdminPendingPairRow[];
  nextCursor: string | null;
}

interface PendingPairCursor {
  firstFlaggedAt: string;
  id: string;
}

function encodePendingPairCursor(c: PendingPairCursor): string {
  return Buffer.from(JSON.stringify(c), 'utf8').toString('base64url');
}

function decodePendingPairCursor(encoded: string): PendingPairCursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (typeof parsed?.firstFlaggedAt === 'string' && typeof parsed?.id === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

const DEFAULT_LIMIT = 20;

interface RawPendingPairRow {
  id: string;
  reason: string;
  nameNormalized: string;
  companyAId: string | null;
  companyBId: string | null;
  firstFlaggedAt: Date;
}

interface PairSideDetail {
  companies: Map<string, { name: string; siren: string | null }>;
  counts: Map<string, { relationsCount: number; contactsCount: number; proposalsCount: number }>;
  owners: Map<string, AdminPairOwner[]>;
}

/**
 * Loads company name/siren, aggregate counts and relationship-owner rows for
 * a batch of companies in a fixed, bounded number of queries (three) — never
 * one query per pair. Shared by `listPendingPairsForAdmin` (page of pairs)
 * and `getPendingPairForAdmin` (single pair, two company ids).
 */
async function loadPairSideDetail(dbi: Dbi, companyIds: string[]): Promise<PairSideDetail> {
  if (companyIds.length === 0) {
    return { companies: new Map(), counts: new Map(), owners: new Map() };
  }

  const companyRows = await dbi
    .select({
      id: schema.companies.id,
      name: schema.companies.name,
      siren: schema.companies.siren,
    })
    .from(schema.companies)
    .where(inArray(schema.companies.id, companyIds));

  const countRows = await dbi
    .select({
      companyId: schema.clientRelationships.companyId,
      relationsCount: sql<number>`COUNT(DISTINCT ${schema.clientRelationships.id})`.as('relations_count'),
      contactsCount: sql<number>`COUNT(DISTINCT ${schema.contacts.id})`.as('contacts_count'),
      proposalsCount: sql<number>`COUNT(DISTINCT ${schema.proposals.id})`.as('proposals_count'),
    })
    .from(schema.clientRelationships)
    .leftJoin(schema.contacts, eq(schema.contacts.clientRelationshipId, schema.clientRelationships.id))
    .leftJoin(
      schema.proposals,
      and(
        eq(schema.proposals.clientRelationshipId, schema.clientRelationships.id),
        ne(schema.proposals.status, 'deleted'),
      ),
    )
    .where(inArray(schema.clientRelationships.companyId, companyIds))
    .groupBy(schema.clientRelationships.companyId);

  const ownerRows = await dbi
    .select({
      companyId: schema.clientRelationships.companyId,
      ownerId: schema.users.id,
      displayName: schema.users.displayName,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
    })
    .from(schema.clientRelationships)
    .innerJoin(schema.users, eq(schema.users.id, schema.clientRelationships.ownerId))
    .where(inArray(schema.clientRelationships.companyId, companyIds));

  const companies = new Map<string, { name: string; siren: string | null }>();
  for (const c of companyRows) {
    companies.set(c.id, { name: c.name, siren: c.siren });
  }

  const counts = new Map<string, { relationsCount: number; contactsCount: number; proposalsCount: number }>();
  for (const c of countRows) {
    counts.set(c.companyId, {
      relationsCount: Number(c.relationsCount),
      contactsCount: Number(c.contactsCount),
      proposalsCount: Number(c.proposalsCount),
    });
  }

  const owners = new Map<string, AdminPairOwner[]>();
  for (const o of ownerRows) {
    const display = (o.displayName ?? o.name ?? '').trim();
    const entry: AdminPairOwner = {
      ownerId: o.ownerId,
      ownerDisplayName: display.length > 0 ? display : o.email,
      isInternal: o.role === 'sales',
    };
    const existing = owners.get(o.companyId);
    if (existing) {
      existing.push(entry);
    } else {
      owners.set(o.companyId, [entry]);
    }
  }

  return { companies, counts, owners };
}

function buildSide(companyId: string, detail: PairSideDetail): AdminPairSide {
  const company = detail.companies.get(companyId);
  const counts = detail.counts.get(companyId);
  return {
    companyId,
    name: company?.name ?? '',
    siren: company?.siren ?? null,
    relationsCount: counts?.relationsCount ?? 0,
    contactsCount: counts?.contactsCount ?? 0,
    proposalsCount: counts?.proposalsCount ?? 0,
    owners: detail.owners.get(companyId) ?? [],
  };
}

/**
 * D-12's compound-merge case: exactly one owner holding a relationship with
 * BOTH sides. Zero shared owners is the common case (null, count 0). More
 * than one shared owner is out of D-12's defined single-owner scope — the
 * warning stays null and the count is surfaced instead (UI-SPEC Access &
 * Non-Leakage Contract point 4: never invent a two-owner display).
 */
function computeCompound(sideA: AdminPairSide, sideB: AdminPairSide): {
  compoundMergeWarning: AdminPendingPairRow['compoundMergeWarning'];
  compoundOwnerCount: number;
} {
  const bOwnerIds = new Set(sideB.owners.map((o) => o.ownerId));
  const shared = sideA.owners.filter((o) => bOwnerIds.has(o.ownerId));
  if (shared.length === 1) {
    const owner = shared[0];
    return {
      compoundMergeWarning: { ownerName: owner.ownerDisplayName, ownerType: owner.isInternal ? 'sales' : 'partner' },
      compoundOwnerCount: 1,
    };
  }
  return { compoundMergeWarning: null, compoundOwnerCount: shared.length };
}

function buildPendingPairRow(r: RawPendingPairRow, detail: PairSideDetail): AdminPendingPairRow {
  // Callers of this helper have already filtered to companyAId/companyBId
  // both NOT NULL — see the two exported functions below.
  const sideA = buildSide(r.companyAId as string, detail);
  const sideB = buildSide(r.companyBId as string, detail);
  const compound = computeCompound(sideA, sideB);
  return {
    pairId: r.id,
    reason: r.reason as AdminPairReason,
    nameNormalized: r.nameNormalized,
    sideA,
    sideB,
    ...compound,
  };
}

/**
 * A pending pair whose company_a_id/company_b_id went NULL through an
 * earlier merge's `ON DELETE SET NULL` backstop is stale — its live sides no
 * longer both exist — and is excluded rather than offered for a resolution
 * that could never succeed (T-31-03-09).
 */
const PENDING_LIVE_SIDES_PREDICATE = and(
  isNull(schema.companyPairDecisions.verdict),
  sql`${schema.companyPairDecisions.companyAId} IS NOT NULL`,
  sql`${schema.companyPairDecisions.companyBId} IS NOT NULL`,
);

/**
 * FIFO (oldest-flagged-first, UI-SPEC §1) cursor list of pending pairs, with
 * full per-side detail and the D-12 compound-merge warning.
 */
export async function listPendingPairsForAdmin(
  args: ListPendingPairsArgs = {},
): Promise<ListPendingPairsResult> {
  const dbi = db();
  const limit = args.limit ?? DEFAULT_LIMIT;
  const fetchCount = limit + 1;

  const decoded = args.cursor ? decodePendingPairCursor(args.cursor) : null;
  const cursorPredicate = decoded
    ? sql`(${schema.companyPairDecisions.firstFlaggedAt}, ${schema.companyPairDecisions.id}) > (${decoded.firstFlaggedAt}::timestamptz, ${decoded.id}::uuid)`
    : undefined;

  const rawRows = (await dbi
    .select({
      id: schema.companyPairDecisions.id,
      reason: schema.companyPairDecisions.reason,
      nameNormalized: schema.companyPairDecisions.nameNormalized,
      companyAId: schema.companyPairDecisions.companyAId,
      companyBId: schema.companyPairDecisions.companyBId,
      firstFlaggedAt: schema.companyPairDecisions.firstFlaggedAt,
    })
    .from(schema.companyPairDecisions)
    .where(and(PENDING_LIVE_SIDES_PREDICATE, cursorPredicate))
    .orderBy(asc(schema.companyPairDecisions.firstFlaggedAt), asc(schema.companyPairDecisions.id))
    .limit(fetchCount)) as RawPendingPairRow[];

  const hasMore = rawRows.length > limit;
  const sliced = hasMore ? rawRows.slice(0, limit) : rawRows;
  const last = sliced[sliced.length - 1] as RawPendingPairRow | undefined;
  const nextCursor = hasMore && last
    ? encodePendingPairCursor({ firstFlaggedAt: last.firstFlaggedAt.toISOString(), id: last.id })
    : null;

  if (sliced.length === 0) {
    return { rows: [], nextCursor: null };
  }

  const companyIds = Array.from(
    new Set(sliced.flatMap((r) => [r.companyAId as string, r.companyBId as string])),
  );
  const detail = await loadPairSideDetail(dbi, companyIds);

  return { rows: sliced.map((r) => buildPendingPairRow(r, detail)), nextCursor };
}

/** Single-pair form of `listPendingPairsForAdmin`, for the merge/keep-separate dialogs. */
export async function getPendingPairForAdmin(pairId: string): Promise<AdminPendingPairRow | null> {
  const dbi = db();
  const rawRows = (await dbi
    .select({
      id: schema.companyPairDecisions.id,
      reason: schema.companyPairDecisions.reason,
      nameNormalized: schema.companyPairDecisions.nameNormalized,
      companyAId: schema.companyPairDecisions.companyAId,
      companyBId: schema.companyPairDecisions.companyBId,
      firstFlaggedAt: schema.companyPairDecisions.firstFlaggedAt,
    })
    .from(schema.companyPairDecisions)
    .where(and(eq(schema.companyPairDecisions.id, pairId), PENDING_LIVE_SIDES_PREDICATE))
    .limit(1)) as RawPendingPairRow[];

  const r = rawRows[0];
  if (!r) return null;

  const detail = await loadPairSideDetail(dbi, [r.companyAId as string, r.companyBId as string]);
  return buildPendingPairRow(r, detail);
}

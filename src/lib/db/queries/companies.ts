import 'server-only';
import { and, desc, eq, ilike, ne, or, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type { ContactListRow, RelationshipProposalRow } from './client-relationships';

/**
 * Phase 30 Plan 04 — admin-only company & relationship registry queries
 * (CRM-03).
 *
 * Every function in this module is ADMIN-ONLY and MUST be called behind
 * `requireAdmin()` — this module performs NO authorization of its own. It is
 * deliberately kept in its own file, separate from the owner-scoped
 * `client-relationships.ts`, so an accidental import of an unscoped admin
 * query into a partner-facing page is visible on the import line rather than
 * hidden inside an argument (T-30-04-09). No function here takes an
 * `ownerId` filter — every relationship on a company is returned, together
 * with the holder's identity, by design (CRM-03).
 *
 * ADMIN-09: no function here selects `proposals.params_snapshot`, anything
 * from `global_params`, or `proposals.computed` beyond the single
 * client-facing monthly scalar (mirrors the discipline established in
 * `client-relationships.ts` — the raw `computed` jsonb never leaves this
 * module either).
 */

export interface AdminCompanyRow {
  companyId: string;
  name: string;
  siren: string | null;
  relationsCount: number;
  lastActivityAt: Date | null;
  createdAt: Date;
}

export interface ListCompaniesForAdminArgs {
  q?: string;
  cursor?: string;
  limit?: number;
}

export interface ListCompaniesForAdminResult {
  rows: AdminCompanyRow[];
  nextCursor: string | null;
}

interface AdminCompanyCursor {
  createdAt: string;
  id: string;
}

function encodeCursor(c: AdminCompanyCursor): string {
  return Buffer.from(JSON.stringify(c), 'utf8').toString('base64url');
}

function decodeCursor(encoded: string): AdminCompanyCursor | null {
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

const DEFAULT_LIMIT = 20;

/**
 * CRM-03 admin company registry list. Cursor over
 * `(companies.created_at DESC, companies.id DESC)` — matches the
 * `companies_created_at_id_idx` index declared in plan 30-01. Search is
 * parameterized `ilike` on company name and siren (T-30-04-06).
 */
export async function listCompaniesForAdmin(
  args: ListCompaniesForAdminArgs,
): Promise<ListCompaniesForAdminResult> {
  const dbi = db();
  const limit = args.limit ?? DEFAULT_LIMIT;
  const fetchCount = limit + 1;

  const q = args.q?.trim();
  const searchPredicate = q && q.length > 0
    ? or(
        ilike(schema.companies.name, `%${q}%`),
        ilike(schema.companies.siren, `%${q}%`),
      )
    : undefined;

  const decoded = args.cursor ? decodeCursor(args.cursor) : null;
  const cursorPredicate = decoded
    ? sql`(${schema.companies.createdAt}, ${schema.companies.id}) < (${decoded.createdAt}::timestamptz, ${decoded.id}::uuid)`
    : undefined;

  const where = and(searchPredicate, cursorPredicate);

  const rawRows = await dbi
    .select({
      companyId: schema.companies.id,
      name: schema.companies.name,
      siren: schema.companies.siren,
      createdAt: schema.companies.createdAt,
      relationsCount: sql<number>`COUNT(DISTINCT ${schema.clientRelationships.id})`.as('relations_count'),
      lastActivityAt: sql<Date | null>`MAX(${schema.proposals.createdAt})`.as('last_activity_at'),
    })
    .from(schema.companies)
    .leftJoin(
      schema.clientRelationships,
      eq(schema.clientRelationships.companyId, schema.companies.id),
    )
    .leftJoin(
      schema.proposals,
      and(
        eq(schema.proposals.clientRelationshipId, schema.clientRelationships.id),
        ne(schema.proposals.status, 'deleted'),
      ),
    )
    .where(where)
    .groupBy(
      schema.companies.id,
      schema.companies.name,
      schema.companies.siren,
      schema.companies.createdAt,
    )
    .orderBy(desc(schema.companies.createdAt), desc(schema.companies.id))
    .limit(fetchCount);

  const hasMore = rawRows.length > limit;
  const sliced = hasMore ? rawRows.slice(0, limit) : rawRows;
  const last = sliced[sliced.length - 1] as (typeof rawRows)[number] | undefined;
  const nextCursor = hasMore && last
    ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.companyId })
    : null;

  const rows: AdminCompanyRow[] = sliced.map((r) => ({
    companyId: r.companyId,
    name: r.name,
    siren: r.siren,
    relationsCount: Number(r.relationsCount),
    lastActivityAt: r.lastActivityAt ? new Date(r.lastActivityAt) : null,
    createdAt: r.createdAt,
  }));

  return { rows, nextCursor };
}

export interface AdminCompanyDetail {
  companyId: string;
  name: string;
  siren: string | null;
}

export async function getCompanyForAdmin(companyId: string): Promise<AdminCompanyDetail | null> {
  const dbi = db();
  const rows = await dbi
    .select({
      companyId: schema.companies.id,
      name: schema.companies.name,
      siren: schema.companies.siren,
    })
    .from(schema.companies)
    .where(eq(schema.companies.id, companyId))
    .limit(1);
  return rows[0] ?? null;
}

export interface AdminRelationshipRow {
  relationshipId: string;
  ownerId: string;
  ownerDisplayName: string;
  isInternal: boolean;
  createdAt: Date;
  proposalsCount: number;
  contactsCount: number;
}

/**
 * CRM-03 — every relationship on a company, together with the holder's
 * identity and access classification (`isInternal` = `role === 'sales'`, NOT
 * a commission/rate field — ADMIN-09 unaffected, same reasoning already
 * applied to `PartnerRow.isInternal`). A relationship with zero proposals or
 * zero contacts yields the literal number `0`, never `null` — a real count
 * carries information and is never displayed as an em dash.
 */
export async function listRelationshipsForCompany(companyId: string): Promise<AdminRelationshipRow[]> {
  const dbi = db();
  const rawRows = await dbi
    .select({
      relationshipId: schema.clientRelationships.id,
      ownerId: schema.users.id,
      displayName: schema.users.displayName,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
      createdAt: schema.clientRelationships.createdAt,
      proposalsCount: sql<number>`COUNT(DISTINCT ${schema.proposals.id})`.as('proposals_count'),
      contactsCount: sql<number>`COUNT(DISTINCT ${schema.contacts.id})`.as('contacts_count'),
    })
    .from(schema.clientRelationships)
    .innerJoin(schema.users, eq(schema.users.id, schema.clientRelationships.ownerId))
    .leftJoin(
      schema.proposals,
      and(
        eq(schema.proposals.clientRelationshipId, schema.clientRelationships.id),
        ne(schema.proposals.status, 'deleted'),
      ),
    )
    .leftJoin(
      schema.contacts,
      eq(schema.contacts.clientRelationshipId, schema.clientRelationships.id),
    )
    .where(eq(schema.clientRelationships.companyId, companyId))
    .groupBy(
      schema.clientRelationships.id,
      schema.users.id,
      schema.users.displayName,
      schema.users.name,
      schema.users.email,
      schema.users.role,
      schema.clientRelationships.createdAt,
    )
    .orderBy(desc(schema.clientRelationships.createdAt));

  return rawRows.map((r) => {
    const display = (r.displayName ?? r.name ?? '').trim();
    return {
      relationshipId: r.relationshipId,
      ownerId: r.ownerId,
      ownerDisplayName: display.length > 0 ? display : r.email,
      isInternal: r.role === 'sales',
      createdAt: r.createdAt,
      proposalsCount: Number(r.proposalsCount),
      contactsCount: Number(r.contactsCount),
    };
  });
}

export interface AdminRelationshipDetail {
  relationshipId: string;
  companyId: string;
  companyName: string;
  siren: string | null;
  ownerId: string;
  ownerDisplayName: string;
  isInternal: boolean;
  createdAt: Date;
}

/** Admin relationship detail page — no owner filter, by design (CRM-03). */
export async function getRelationshipForAdmin(relationshipId: string): Promise<AdminRelationshipDetail | null> {
  const dbi = db();
  const rows = await dbi
    .select({
      relationshipId: schema.clientRelationships.id,
      companyId: schema.companies.id,
      companyName: schema.companies.name,
      siren: schema.companies.siren,
      ownerId: schema.users.id,
      displayName: schema.users.displayName,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
      createdAt: schema.clientRelationships.createdAt,
    })
    .from(schema.clientRelationships)
    .innerJoin(schema.companies, eq(schema.companies.id, schema.clientRelationships.companyId))
    .innerJoin(schema.users, eq(schema.users.id, schema.clientRelationships.ownerId))
    .where(eq(schema.clientRelationships.id, relationshipId))
    .limit(1);

  const r = rows[0];
  if (!r) return null;
  const display = (r.displayName ?? r.name ?? '').trim();
  return {
    relationshipId: r.relationshipId,
    companyId: r.companyId,
    companyName: r.companyName,
    siren: r.siren,
    ownerId: r.ownerId,
    ownerDisplayName: display.length > 0 ? display : r.email,
    isInternal: r.role === 'sales',
    createdAt: r.createdAt,
  };
}

/** Admin-scoped contacts fetch for the relationship detail page — no owner filter. */
export async function listContactsForRelationshipAdmin(relationshipId: string): Promise<ContactListRow[]> {
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
    .where(eq(schema.contacts.clientRelationshipId, relationshipId))
    .orderBy(desc(schema.contacts.createdAt));
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
 * Admin-scoped proposals fetch for the relationship detail page — no owner
 * filter. ADMIN-09: `params_snapshot` is never selected; `computed` is read
 * server-side only to project the single client-facing monthly scalar.
 */
export async function listProposalsForRelationshipAdmin(relationshipId: string): Promise<RelationshipProposalRow[]> {
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
    })
    .from(schema.proposals)
    .where(and(
      eq(schema.proposals.clientRelationshipId, relationshipId),
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
    // ADMIN-09 (this file's own header comment, preserved): params_snapshot
    // is never selected here, so validityDays cannot be projected from it —
    // deriveProposalOutcome's 30-day fallback applies for admin-viewed rows.
    validityDays: null,
  }));
}

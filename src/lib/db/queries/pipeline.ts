import 'server-only';
import { and, asc, countDistinct, eq, isNotNull, isNull, ne, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { PIPELINE_STAGES, type PipelineStage } from '@/lib/pipeline/stages';

/**
 * Phase 33 Plan 03 — owner-scoped pipeline board + conversion-rate queries.
 *
 * CRM-02 CONTRACT: every exported function in this module takes an `ownerId`
 * that is a REQUIRED, non-optional, non-defaulted parameter, and that value
 * is compiled directly into the WHERE clause of the SQL statement the
 * function issues. No function here accepts an "include every owner" flag,
 * a pre-checked boolean, or any other bypass. There is NO admin path in
 * this module — admins never read pipeline data through this module at all
 * (T-30-04-09 precedent preserved).
 *
 * D-12: no function in this module computes a global, team, or peer
 * aggregate. `getConversionRateForOwner`'s numerator and denominator are
 * BOTH scoped to the caller's own `proposals.user_id` in the same
 * statement — permanently. No leaderboard, ranking, team total, or peer
 * benchmark may ever be added here.
 *
 * ADMIN-09: no function in this module selects the commission-envelope jsonb
 * snapshot column on `proposals`, nor anything from the global parameters
 * table. The board card shows a name, a SIREN and two counts — nothing
 * monetary.
 */

// ── Pipeline board (PIPE-04) ────────────────────────────────────────────────

export interface PipelineCardRow {
  relationshipId: string;
  companyId: string;
  companyName: string;
  siren: string | null;
  stage: PipelineStage;
  contactsCount: number;
  proposalsCount: number;
}

export interface ListPipelineBoardArgs {
  ownerId: string;
}

/**
 * PIPE-04 — a partner's own relationships, grouped by stage. No cursor, no
 * pagination, no search: a partner's book is bounded and the board renders
 * all of it in one call.
 *
 * Correctness trap: joining BOTH `contacts` and `proposals` to the same
 * relationship produces a cartesian product of the two child sets, so a
 * plain `COUNT(contacts.id)` would report `contacts × proposals`. Both
 * counts use `countDistinct` to avoid this.
 *
 * The returned record is seeded with an empty array for every member of
 * `PIPELINE_STAGES` (including the two reserved lanes, 'signe'/'debloque')
 * so the board renders all seven lanes without the caller doing null
 * handling, even when the caller has zero relationships in a given stage.
 */
export async function listPipelineBoard(
  args: ListPipelineBoardArgs,
): Promise<Record<PipelineStage, PipelineCardRow[]>> {
  const dbi = db();

  const rawRows = await dbi
    .select({
      relationshipId: schema.clientRelationships.id,
      companyId: schema.companies.id,
      companyName: schema.companies.name,
      siren: schema.companies.siren,
      stage: schema.clientRelationships.stage,
      contactsCount: countDistinct(schema.contacts.id),
      proposalsCount: countDistinct(schema.proposals.id),
    })
    .from(schema.clientRelationships)
    .innerJoin(schema.companies, eq(schema.companies.id, schema.clientRelationships.companyId))
    .leftJoin(
      schema.contacts,
      eq(schema.contacts.clientRelationshipId, schema.clientRelationships.id),
    )
    .leftJoin(
      schema.proposals,
      and(
        eq(schema.proposals.clientRelationshipId, schema.clientRelationships.id),
        ne(schema.proposals.status, 'deleted'),
        // D-22 (33-REVIEW WR-06) — the CRM-02 defence-in-depth predicate
        // `listProposalsForRelationship` already carries. It belongs in the
        // JOIN condition, never the WHERE: in the WHERE it would degrade this
        // LEFT JOIN to an INNER JOIN and drop every relationship with zero
        // owned proposals off the board.
        eq(schema.proposals.userId, args.ownerId),
      ),
    )
    // CRM-02: ownerId is the ONLY predicate — a partner's own book, nothing else.
    .where(eq(schema.clientRelationships.ownerId, args.ownerId))
    .groupBy(
      schema.clientRelationships.id,
      schema.companies.id,
      schema.companies.name,
      schema.companies.siren,
      schema.clientRelationships.stage,
    )
    .orderBy(asc(schema.companies.name));

  const board = Object.fromEntries(
    PIPELINE_STAGES.map((stage) => [stage, [] as PipelineCardRow[]]),
  ) as Record<PipelineStage, PipelineCardRow[]>;

  for (const r of rawRows) {
    const stage = r.stage as PipelineStage;
    board[stage].push({
      relationshipId: r.relationshipId,
      companyId: r.companyId,
      companyName: r.companyName,
      siren: r.siren,
      stage,
      contactsCount: Number(r.contactsCount),
      proposalsCount: Number(r.proposalsCount),
    });
  }

  return board;
}

// ── Conversion rate (PIPE-03) ───────────────────────────────────────────────

export interface ConversionRate {
  won: number;
  total: number;
  pct: number | null;
}

/**
 * PIPE-03 — the caller's own per-quote conversion rate.
 *
 * Numerator: the caller's proposals with outcome = 'won'.
 * Denominator (locked in 33-03-PLAN.md's <decision_record>): the caller's
 * proposals that are status = 'active', deleted_at IS NULL, AND
 * client_relationship_id IS NOT NULL. Drafts are excluded (not quotes yet);
 * soft-deleted rows are excluded (withdrawn); rows with no relationship link
 * are excluded (no UI path to ever receive an outcome).
 *
 * Both numerator and denominator are scoped to `ownerId`'s own rows in the
 * SAME statement (eq(proposals.userId, ownerId)) — D-12 forbids a global or
 * team denominator permanently.
 *
 * `pct` is null when `total` is 0 — a zero-denominator rate renders as "—",
 * not "0%": a 0% rate is a meaningful claim ("you convert nothing"), an
 * undefined rate is not the same statement. Otherwise `pct` is
 * `Math.round((won / total) * 100)`.
 */
export async function getConversionRateForOwner(ownerId: string): Promise<ConversionRate> {
  const dbi = db();

  const rows = await dbi
    .select({
      won: sql<number>`COUNT(*) FILTER (WHERE ${schema.proposals.outcome} = 'won')`,
      total: sql<number>`COUNT(*)`,
    })
    .from(schema.proposals)
    .where(
      and(
        eq(schema.proposals.userId, ownerId),
        eq(schema.proposals.status, 'active'),
        isNull(schema.proposals.deletedAt),
        isNotNull(schema.proposals.clientRelationshipId),
      ),
    );

  const won = Number(rows[0]?.won ?? 0);
  const total = Number(rows[0]?.total ?? 0);
  const pct = total === 0 ? null : Math.round((won / total) * 100);

  return { won, total, pct };
}

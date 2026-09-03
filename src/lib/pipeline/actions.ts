'use server';

/**
 * Phase 33 Plan 04 — the phase's entire write layer (PIPE-01, PIPE-02,
 * PIPE-03, PIPE-05): one action that advances a relationship's stage, two
 * that record a proposal outcome, and the inline SIREN save D-08's gate
 * dialog depends on.
 *
 * PITFALLS §7.3 ordering — every exported function calls
 * `requireRelationshipHolder()` as the FIRST await, before any DB access.
 * This surface is partner-facing (D-10); the admin-only guard used
 * elsewhere in this codebase appears nowhere in this file.
 *
 * Bounded-error discipline (T-30-05-03), with one documented exception:
 * every failure class in every action THROWS the single key `BOUNDED_ERROR`
 * — EXCEPT `markProposalWonAction`'s SIREN gate, which RETURNS
 * `{ ok: false, reason: 'siren_required' }` so D-08's dialog can reveal an
 * inline SIREN field instead of a dead-end toast. Returned, not thrown:
 * Next.js substitutes a generic message plus a digest for a Server
 * Function's thrown error in production builds, so the sentinel-on-message
 * handshake this module used to rely on worked only in dev (33-REVIEW
 * CR-01). This leaks nothing that matters: the branch is only reachable for
 * a proposal the caller ALREADY owns (the pre-read that selects it is itself
 * owner-scoped), the company's missing SIREN is a fact the caller can
 * already read on `/clients/[id]`, and the result carries no company id, no
 * company name, no other partner's data. `advanceRelationshipStageAction`
 * and `markProposalLostAction` both keep the single bounded key.
 *
 * Non-transactional by design (T-30-05-09 note): the Neon HTTP driver
 * (`drizzle-orm/neon-http`) has no `.transaction()`. Every multi-step
 * sequence in this module is built from individually atomic, idempotent
 * statements — the inline SIREN save and the won-outcome write are two
 * separately-retryable calls, never one multi-statement write.
 *
 * D-04 Decoupling Contract: no function in this module writes the pipeline
 * stage as a consequence of a proposal outcome, and the two outcome actions
 * never import or reference the stage column at all. `advanceRelationshipStageAction`
 * is the ONLY write path for the stage column in this codebase.
 */

import { revalidatePath } from 'next/cache';
import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import { requireRelationshipHolder } from '@/lib/auth/require';
import { db, schema } from '@/lib/db';
import { writeAuditLog } from '@/lib/db/queries/audit-log';
import type { MarkWonResult } from './constants';
import { advanceStageSchema, markLostSchema, markWonSchema } from './schemas';

/** Single bounded error key for every failure class in this module (T-30-05-03), bar one documented exception below. */
const BOUNDED_ERROR = 'pipeline.toast.error';

/* ─────────────────────────────────────────────────────────────────────────── */
/*  advanceRelationshipStageAction (PIPE-01, PIPE-02, D-01..D-04)              */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Advance a relationship the caller owns to one of the five partner-settable
 * stages, in one TOCTOU-safe statement. `advanceStageSchema` rejects the two
 * system-owned stages at parse time, before any DB access — the CHECK
 * constraint on `client_relationships` admits them, but no code path in this
 * module can ever produce them (PIPE-02).
 *
 * The current stage is intentionally NOT read back for the audit payload —
 * that would require an authorization-shaped pre-SELECT this module
 * otherwise never issues. The audit payload records the destination value
 * only; the origin value is recoverable from the previous audit row, which
 * is what Phase 34's timeline will read.
 */
export async function advanceRelationshipStageAction(raw: unknown): Promise<void> {
  const { session } = await requireRelationshipHolder(); // FIRST — PITFALLS §7.3
  try {
    const input = advanceStageSchema.parse(raw);
    const dbi = db();

    // Ownership re-proved inside the UPDATE's own WHERE — never a separate
    // SELECT (T-30-05-05). Zero rows returned is the only failure signal,
    // covering not-found and not-owned identically (T-30-05-04).
    const updated = await dbi
      .update(schema.clientRelationships)
      .set({ stage: input.toStage, updatedAt: new Date() })
      .where(and(
        eq(schema.clientRelationships.id, input.relationshipId),
        eq(schema.clientRelationships.ownerId, session.user.id),
      ))
      .returning();

    if (updated.length === 0) {
      throw new Error(BOUNDED_ERROR);
    }

    await writeAuditLog({
      actorId: session.user.id,
      action: 'relationship.stage_change',
      targetType: 'client_relationship',
      targetId: input.relationshipId,
      payload: { toStage: input.toStage },
    });

    revalidatePath('/pipeline');
  } catch (e) {
    if (e instanceof Error && e.message === BOUNDED_ERROR) {
      throw e; // already the bounded key — don't double-log or re-wrap
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[advanceRelationshipStageAction] failed:', msg);
    throw new Error(BOUNDED_ERROR);
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  markProposalLostAction (PIPE-03, D-05, D-06, D-08)                         */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Record a `lost` outcome on a proposal the caller owns, in one statement.
 * The stored outcome is never the derived third value — only an explicit
 * partner decision is ever persisted here (D-06); the derived value is
 * computed at read time by `deriveProposalOutcome` (plan 33-03), not by
 * this module.
 */
export async function markProposalLostAction(raw: unknown): Promise<void> {
  const { session } = await requireRelationshipHolder(); // FIRST — PITFALLS §7.3
  try {
    const input = markLostSchema.parse(raw);
    const dbi = db();

    const updated = await dbi
      .update(schema.proposals)
      .set({
        outcome: 'lost',
        outcomeDate: input.date,
        outcomeReason: input.reason ?? null,
      })
      .where(and(
        eq(schema.proposals.id, input.proposalId),
        eq(schema.proposals.userId, session.user.id),
        // 33-REVIEW CR-04 — same lifecycle guard as the won path.
        eq(schema.proposals.status, 'active'),
      ))
      .returning();

    if (updated.length === 0) {
      throw new Error(BOUNDED_ERROR);
    }

    await writeAuditLog({
      actorId: session.user.id,
      action: 'proposal.outcome_lost',
      targetType: 'proposal',
      targetId: input.proposalId,
      payload: { outcomeDate: input.date.toISOString() },
    });

    // No single client-detail path is derivable without a read — revalidate
    // the whole /clients subtree (list + every detail page) plus the board.
    revalidatePath('/clients', 'layout');
    revalidatePath('/pipeline');
  } catch (e) {
    if (e instanceof Error && e.message === BOUNDED_ERROR) {
      throw e;
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[markProposalLostAction] failed:', msg);
    throw new Error(BOUNDED_ERROR);
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  markProposalWonAction (PIPE-03, PIPE-05, D-05, D-07, D-08)                 */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Record a `won` outcome on a proposal the caller owns, enforcing D-07's
 * SIREN gate server-side. Order of operations, all owner-scoped:
 *
 * 1. Optional inline SIREN save — fills an absent SIREN on the company
 *    reachable through the caller's own relationship, never overwrites one
 *    (the shared `companies` registry, CRM-01, may already carry a SIREN
 *    another partner entered).
 * 2. The gate branch-selector read — decides which error to raise; it is
 *    NOT the authorization for the write in step 3.
 * 3. The write, with ownership AND the SIREN predicate re-proved inside its
 *    own WHERE — the DB triggers from plan 33-01 are a third, independent
 *    layer behind this.
 */
export async function markProposalWonAction(raw: unknown): Promise<MarkWonResult> {
  const { session } = await requireRelationshipHolder(); // FIRST — PITFALLS §7.3
  try {
    const input = markWonSchema.parse(raw);
    const dbi = db();

    // ── 1. Optional inline SIREN save (D-08) ──────────────────────────────
    if (input.siren) {
      // Owner-scoped subquery: the company reachable through the caller's
      // OWN relationship for THIS proposal. `companies` is not owned by FK
      // the way `client_relationships` is, so the re-proof goes through the
      // join, not a direct column match.
      const reachableCompanyIds = dbi
        .select({ id: schema.clientRelationships.companyId })
        .from(schema.clientRelationships)
        .innerJoin(schema.proposals, eq(schema.proposals.clientRelationshipId, schema.clientRelationships.id))
        .where(and(
          eq(schema.proposals.id, input.proposalId),
          eq(schema.proposals.userId, session.user.id),
          eq(schema.clientRelationships.ownerId, session.user.id),
        ));

      // Zero rows affected is NOT an error — see the module header. A
      // unique-index violation on the SIREN column (another partner already
      // registered it) is caught by the outer catch below and collapses to
      // BOUNDED_ERROR, never surfaced (T-30-05-02).
      const sirenSaved = await dbi
        .update(schema.companies)
        .set({ siren: input.siren })
        .where(and(
          isNull(schema.companies.siren),
          inArray(schema.companies.id, reachableCompanyIds),
        ))
        .returning();

      if (sirenSaved[0]) {
        await writeAuditLog({
          actorId: session.user.id,
          action: 'company.siren_add',
          targetType: 'company',
          targetId: sirenSaved[0].id,
          // Never the SIREN value itself — only ids.
          payload: { proposalId: input.proposalId },
        });
      }
    }

    // ── 2. The gate branch-selector read — decides the error only ────────
    const gateRow = await dbi
      .select({ siren: schema.companies.siren })
      .from(schema.proposals)
      .innerJoin(schema.clientRelationships, eq(schema.clientRelationships.id, schema.proposals.clientRelationshipId))
      .innerJoin(schema.companies, eq(schema.companies.id, schema.clientRelationships.companyId))
      .where(and(
        eq(schema.proposals.id, input.proposalId),
        eq(schema.proposals.userId, session.user.id),
      ))
      .limit(1);

    if (gateRow.length === 0) {
      // Not-found and not-owned collapse identically — the sentinel below
      // must never be reachable across an ownership boundary.
      throw new Error(BOUNDED_ERROR);
    }
    if (gateRow[0].siren === null) {
      // RETURNED, never thrown (33-REVIEW CR-01). Next.js replaces a Server
      // Function's thrown error message with a generic string plus a digest in
      // production builds, so the old `throw new Error(SIREN_REQUIRED)` +
      // `e.message === SIREN_REQUIRED` handshake worked in dev and silently
      // degraded to a generic toast in production — leaving the partner with no
      // way to supply the SIREN, the exact dead end D-08 exists to prevent. A
      // returned value crosses the serialisation boundary intact.
      return { ok: false, reason: 'siren_required' };
    }

    // ── 3. The write, with ownership AND the SIREN predicate re-proved ───
    const ownedRelationshipsWithSiren = dbi
      .select({ id: schema.clientRelationships.id })
      .from(schema.clientRelationships)
      .innerJoin(schema.companies, eq(schema.companies.id, schema.clientRelationships.companyId))
      .where(and(
        eq(schema.clientRelationships.ownerId, session.user.id),
        isNotNull(schema.companies.siren),
      ));

    const updated = await dbi
      .update(schema.proposals)
      .set({
        outcome: 'won',
        outcomeDate: input.date,
        outcomeReason: input.reason ?? null,
      })
      .where(and(
        eq(schema.proposals.id, input.proposalId),
        eq(schema.proposals.userId, session.user.id),
        // 33-REVIEW CR-04: an outcome belongs to a proposal that was actually
        // sent. A draft has no client-facing existence to win or lose, and
        // `getConversionRateForOwner` counts only finalized rows — recording a
        // win on a draft made the badge and the headline metric disagree with
        // no undo path.
        eq(schema.proposals.status, 'active'),
        inArray(schema.proposals.clientRelationshipId, ownedRelationshipsWithSiren),
      ))
      .returning();

    if (updated.length === 0) {
      throw new Error(BOUNDED_ERROR);
    }

    await writeAuditLog({
      actorId: session.user.id,
      action: 'proposal.outcome_won',
      targetType: 'proposal',
      targetId: input.proposalId,
      payload: { outcomeDate: input.date.toISOString() },
    });

    revalidatePath('/clients', 'layout');
    revalidatePath('/pipeline');
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.message === BOUNDED_ERROR) {
      throw e; // already the bounded sentinel — don't double-log or re-wrap
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[markProposalWonAction] failed:', msg);
    throw new Error(BOUNDED_ERROR);
  }
}

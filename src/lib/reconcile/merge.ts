import 'server-only';
import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { writeAuditLog } from '@/lib/db/queries';

/**
 * Phase 31 Plan 03 — the D-12 merge sequence (IMPORT-05).
 *
 * Non-transactional by design: this codebase's Neon production driver is
 * `drizzle-orm/neon-http` (selected by `parseDatabaseUrl()` in
 * `src/lib/db/client.ts` whenever `DATABASE_URL` resolves to a
 * `*.neon.tech`/`*.neon.build` host), whose transaction method throws "No
 * transactions support in neon-http driver" at runtime — the same reason
 * `src/lib/crm/actions.ts` never wraps its multi-statement writes in one
 * either. Every multi-step sequence below is instead built from
 * individually-atomic, idempotent statements, so a crash between steps
 * leaves at worst a harmless, retry-safe intermediate state.
 *
 * This module's own step-ordering invariant: every repoint completes and is
 * confirmed before the loser company is deleted, and every step is a no-op
 * when already applied.
 *
 * Resumability note: step 4 deliberately excludes THIS pair's own
 * `company_pair_decisions` row from its repoint (`ne(id, pairId)`) — every
 * OTHER row referencing the loser is still repointed to the survivor, but
 * this row's own `company_a_id`/`company_b_id` are left alone so a crash
 * between step 4 and step 6 can still recover the loser company id on
 * retry. Once step 6 actually deletes the loser, the `ON DELETE SET NULL`
 * foreign key nulls this row's loser-side column automatically — which is
 * exactly the signal `mergeCompanyPair` uses to recognize "already fully
 * completed" on a subsequent call.
 */

export type MergeResult =
  | { ok: true; survivorCompanyId: string; deletedCompanyId: string; mergedRelationshipIds: string[] }
  | { ok: false; reason: 'already_resolved' | 'survivor_not_in_pair' | 'incomplete_repoint' };

interface PairSnapshot {
  verdict: string | null;
  survivorCompanyId: string | null;
  companyAId: string | null;
  companyBId: string | null;
}

/**
 * Given the pair's current company_a_id/company_b_id and a candidate
 * survivor, returns:
 *  - `undefined` when neither side matches the survivor (bad input, or a
 *    pair already resolved to a DIFFERENT outcome — company_a_id/b_id are
 *    never touched for a different survivor either, by the same
 *    self-exemption rule, so this stays a reliable signal).
 *  - `null` when a side matches but the OTHER side is already NULL — the
 *    loser company is already gone (a prior run of THIS merge completed).
 *  - the live loser company id otherwise (fresh pending pair, or a
 *    resumable mid-crash retry of this exact merge).
 */
function deriveLoserCompanyId(pair: PairSnapshot, survivorCompanyId: string): string | null | undefined {
  if (pair.companyAId === survivorCompanyId) return pair.companyBId;
  if (pair.companyBId === survivorCompanyId) return pair.companyAId;
  return undefined;
}

/**
 * The D-12 merge. Repoints relationships, contacts and proposal links from
 * the loser company to the survivor, resolves the compound
 * (one-owner-holds-both-sides) case, and deletes the loser company only
 * after every repoint is confirmed.
 */
export async function mergeCompanyPair(args: {
  pairId: string;
  survivorCompanyId: string;
  actorId: string;
}): Promise<MergeResult> {
  const { pairId, survivorCompanyId, actorId } = args;
  const dbi = db();

  // Read the pair's current side/verdict state. This is NOT the
  // concurrency-critical precondition (survivorCompanyId is a caller-fixed
  // value, not data another admin's request concurrently mutates) — the
  // ACTUAL race protection is the compiled `isNull(verdict)` claim below,
  // never gated on this SELECT's freshness. This read exists to (a) reject
  // a bad survivor id WITHOUT ever issuing the claim write, and (b)
  // recognize a resumable retry of this exact merge.
  const pairRows = await dbi
    .select({
      verdict: schema.companyPairDecisions.verdict,
      survivorCompanyId: schema.companyPairDecisions.survivorCompanyId,
      companyAId: schema.companyPairDecisions.companyAId,
      companyBId: schema.companyPairDecisions.companyBId,
    })
    .from(schema.companyPairDecisions)
    .where(eq(schema.companyPairDecisions.id, pairId))
    .limit(1);
  const pairRow = pairRows[0] as PairSnapshot | undefined;

  if (!pairRow) {
    return { ok: false, reason: 'already_resolved' };
  }

  const loserCompanyId = deriveLoserCompanyId(pairRow, survivorCompanyId);

  if (loserCompanyId === undefined) {
    return { ok: false, reason: pairRow.verdict === null ? 'survivor_not_in_pair' : 'already_resolved' };
  }
  if (loserCompanyId === null) {
    // A side matches the survivor but the other is already gone — this
    // exact merge already ran to completion on a prior call.
    return { ok: false, reason: 'already_resolved' };
  }

  const isResumingOwnClaim = pairRow.verdict === 'merged' && pairRow.survivorCompanyId === survivorCompanyId;

  if (!isResumingOwnClaim) {
    if (pairRow.verdict !== null) {
      // Resolved already, and NOT by a prior run of this exact merge
      // (kept_separate, or merged with a different survivor).
      return { ok: false, reason: 'already_resolved' };
    }

    // Step 1 — claim the pair. One statement, TOCTOU-safe (commit
    // 1d763b9's discipline): the precondition is compiled into the write,
    // never checked by a preceding SELECT. Zero rows affected is the only
    // failure signal for "another admin won the race".
    const claimed = await dbi
      .update(schema.companyPairDecisions)
      .set({
        verdict: 'merged',
        survivorCompanyId,
        decidedBy: actorId,
        decidedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.companyPairDecisions.id, pairId), isNull(schema.companyPairDecisions.verdict)))
      .returning();

    if (claimed.length === 0) {
      return { ok: false, reason: 'already_resolved' };
    }
  }

  // Step 2 — resolve the compound case. An owner holding a relationship
  // with BOTH companies would collide on
  // client_relationships_company_id_owner_id_uq if step 3 simply repointed
  // the loser relationship, so its contacts/proposal links move onto the
  // survivor relationship and the now-empty loser relationship is deleted
  // instead. Re-derived fresh from the DB every call, so this step is a
  // no-op when re-applied: once an owner's loser relationship is gone, it
  // no longer appears in loserRels below.
  const survivorRels = await dbi
    .select({ id: schema.clientRelationships.id, ownerId: schema.clientRelationships.ownerId })
    .from(schema.clientRelationships)
    .where(eq(schema.clientRelationships.companyId, survivorCompanyId));
  const loserRels = await dbi
    .select({ id: schema.clientRelationships.id, ownerId: schema.clientRelationships.ownerId })
    .from(schema.clientRelationships)
    .where(eq(schema.clientRelationships.companyId, loserCompanyId));

  const survivorRelIdByOwner = new Map(survivorRels.map((r) => [r.ownerId, r.id]));
  const mergedRelationshipIds: string[] = [];

  for (const loserRel of loserRels) {
    const survivorRelId = survivorRelIdByOwner.get(loserRel.ownerId);
    if (!survivorRelId) continue; // no collision for this owner — step 3 repoints it directly

    await dbi
      .update(schema.contacts)
      .set({ clientRelationshipId: survivorRelId, updatedAt: new Date() })
      .where(eq(schema.contacts.clientRelationshipId, loserRel.id));

    // CRM-05 / ARCHITECTURE §2.5 Option A: proposals.inputs is immutable —
    // this .set(...) object touches ONLY clientRelationshipId.
    await dbi
      .update(schema.proposals)
      .set({ clientRelationshipId: survivorRelId })
      .where(eq(schema.proposals.clientRelationshipId, loserRel.id));

    await dbi.delete(schema.clientRelationships).where(eq(schema.clientRelationships.id, loserRel.id));

    mergedRelationshipIds.push(loserRel.id);

    await writeAuditLog({
      actorId,
      action: 'client_relationship.merge',
      targetType: 'client_relationship',
      targetId: survivorRelId,
      payload: { deletedRelationshipId: loserRel.id, ownerId: loserRel.ownerId },
    });
  }

  // Step 3 — repoint the remaining relationships. After step 2, no owner
  // collision remains, so this cannot violate the unique index.
  await dbi
    .update(schema.clientRelationships)
    .set({ companyId: survivorCompanyId, updatedAt: new Date() })
    .where(eq(schema.clientRelationships.companyId, loserCompanyId));

  // Step 4 — repoint OTHER decision-row references so historical rows keep
  // pointing at a live company. `ne(id, pairId)` deliberately excludes THIS
  // pair's own row — see the resumability note in the module header.
  await dbi
    .update(schema.companyPairDecisions)
    .set({ companyAId: survivorCompanyId, updatedAt: new Date() })
    .where(and(eq(schema.companyPairDecisions.companyAId, loserCompanyId), ne(schema.companyPairDecisions.id, pairId)));
  await dbi
    .update(schema.companyPairDecisions)
    .set({ companyBId: survivorCompanyId, updatedAt: new Date() })
    .where(and(eq(schema.companyPairDecisions.companyBId, loserCompanyId), ne(schema.companyPairDecisions.id, pairId)));

  // Step 5 — confirm. If any relationship still references the loser, stop
  // WITHOUT deleting anything. Re-running the merge is then safe and will
  // finish the job.
  const remaining = await dbi
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(schema.clientRelationships)
    .where(eq(schema.clientRelationships.companyId, loserCompanyId));
  const remainingCount = remaining[0]?.count ?? 0;
  if (remainingCount !== 0) {
    console.error(
      `[mergeCompanyPair] incomplete repoint: ${remainingCount} relationship(s) still reference loser company ${loserCompanyId} (pair ${pairId})`,
    );
    return { ok: false, reason: 'incomplete_repoint' };
  }

  // Step 6 — delete the loser. client_relationships.company_id is
  // ON DELETE restrict, so this statement is itself the final proof that
  // step 5's confirmation held.
  await dbi.delete(schema.companies).where(eq(schema.companies.id, loserCompanyId));

  await writeAuditLog({
    actorId,
    action: 'company.merge',
    targetType: 'company',
    targetId: survivorCompanyId,
    payload: { pairId, deletedCompanyId: loserCompanyId },
  });

  return { ok: true, survivorCompanyId, deletedCompanyId: loserCompanyId, mergedRelationshipIds };
}

/**
 * Marks a pair permanently separate — step 1 alone, with
 * `verdict='kept_separate'` and no `survivor_company_id`.
 */
export async function recordKeepSeparate(args: {
  pairId: string;
  actorId: string;
}): Promise<{ ok: boolean; reason?: 'already_resolved' }> {
  const dbi = db();

  const claimed = await dbi
    .update(schema.companyPairDecisions)
    .set({
      verdict: 'kept_separate',
      decidedBy: args.actorId,
      decidedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(schema.companyPairDecisions.id, args.pairId), isNull(schema.companyPairDecisions.verdict)))
    .returning();

  if (claimed.length === 0) {
    return { ok: false, reason: 'already_resolved' };
  }

  await writeAuditLog({
    actorId: args.actorId,
    action: 'company_pair.keep_separate',
    targetType: 'company_pair',
    targetId: args.pairId,
    payload: {},
  });

  return { ok: true };
}

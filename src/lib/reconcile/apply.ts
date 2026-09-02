import { and, eq, isNull, sql } from 'drizzle-orm';
import { schema } from '@/lib/db';
import type { DbHandle, PlannedCompany, PlannedContact, PlannedRelationship, ReconciliationPlan } from './types';

/**
 * Phase 31 Plan 05 — `applyReconciliationPlan`, the idempotent,
 * non-transactional writer that materializes a `ReconciliationPlan`
 * (IMPORT-01, criterion 2 — the write half).
 *
 * This module runs inside a plain `tsx` CLI process (the future
 * `scripts/reconcile-proposals.ts`), never inside a Next.js request handler
 * — it therefore has no reason to carry the client/server boundary import
 * guard other application modules under `src/lib/` use, and deliberately
 * does not. `apply.write-path.test.ts` (Task 3) proves zero files under
 * `app/` import this module at all, so the omission cannot leak this
 * writer onto a request path.
 *
 * Non-transactional by design: the Neon production driver is
 * `drizzle-orm/neon-http`, whose transaction method throws at runtime.
 * Every statement below is individually atomic and idempotent — either
 * `ON CONFLICT DO NOTHING` plus a re-select on the same unique index, or an
 * `UPDATE ... WHERE <precondition>` whose zero-rows-affected is the only
 * failure signal — so a crash between any two statements leaves at worst a
 * harmless already-created row, and a re-run of the same plan is always
 * safe: it creates nothing the second time.
 *
 * CRM-05 / ARCHITECTURE §2.5 Option A: `proposals.inputs` is immutable.
 * The proposal-link write below is the phase's second writer of
 * `client_relationship_id` (the first is the wizard's mint path,
 * `createDraft`) and its `.set(...)` object touches exactly that one
 * column — never `inputs`, the params snapshot, the computed block, or the
 * schema version.
 *
 * D-08: every row this module creates carries `source: 'proposal_extraction'`
 * so a bad import is reversible by provenance alone.
 *
 * OQ-5 (contacts): a matching contact whose `source` is NULL — a
 * partner typed it in by hand — is never touched by this module. The
 * planner (engine.ts) already excludes that case from `plan.contacts`
 * entirely (see the contacts stage comment below); this module never
 * re-derives the classification, it only honours it.
 */

export interface ApplyProgress {
  stage: 'companies' | 'relationships' | 'contacts' | 'proposalLinks' | 'pairs';
  done: number;
  total: number;
}

export interface ApplyResult {
  companiesCreated: number;
  companiesReused: number;
  relationshipsCreated: number;
  relationshipsReused: number;
  contactsCreated: number;
  contactsUpdated: number;
  contactsSkipped: number;
  proposalsLinked: number;
  pairsInserted: number;
  pairsAlreadyPresent: number;
}

interface AuditRowDraft {
  actorId: null;
  action: string;
  targetType: string;
  targetId: string;
  payload: Record<string, unknown>;
}

async function writeAuditBatch(dbi: DbHandle, rows: AuditRowDraft[]): Promise<void> {
  if (rows.length === 0) return;
  // Batched: one INSERT per stage, not one round trip per created entity.
  // The injected `dbi` — not the memoized singleton `writeAuditLog` reads
  // internally — is used deliberately, so a caller (test or CLI script)
  // fully controls how every statement in this module is issued.
  await dbi.insert(schema.auditLog).values(rows);
}

async function applyCompanies(
  dbi: DbHandle,
  companies: PlannedCompany[],
  emit: (p: ApplyProgress) => void,
): Promise<{ idByKey: Map<string, string>; created: number; reused: number }> {
  const idByKey = new Map<string, string>();
  const auditRows: AuditRowDraft[] = [];
  let created = 0;
  let reused = 0;

  emit({ stage: 'companies', done: 0, total: companies.length });
  let done = 0;
  for (const company of companies) {
    if (company.existingCompanyId !== null) {
      idByKey.set(company.key, company.existingCompanyId);
      reused++;
    } else if (company.siren !== undefined) {
      const inserted = await dbi
        .insert(schema.companies)
        .values({ name: company.canonicalName, siren: company.siren, source: 'proposal_extraction' })
        .onConflictDoNothing({ target: schema.companies.siren })
        .returning();
      if (inserted[0]) {
        idByKey.set(company.key, inserted[0].id);
        created++;
        auditRows.push({ actorId: null, action: 'company.extract', targetType: 'company', targetId: inserted[0].id, payload: {} });
      } else {
        // A concurrent creator (or a prior run of this exact plan) won the
        // siren race — re-select rather than treat this as a failure.
        const reselected = await dbi
          .select({ id: schema.companies.id })
          .from(schema.companies)
          .where(eq(schema.companies.siren, company.siren))
          .limit(1);
        if (!reselected[0]) {
          throw new Error(`apply: siren insert/reselect race unresolved for company key ${company.key}`);
        }
        idByKey.set(company.key, reselected[0].id);
        reused++;
      }
    } else {
      // No siren, no existingCompanyId — insert unconditionally. Two
      // siren-less candidates sharing a normalized name are two companies
      // by design (criterion 4); the flagged pair is what resolves them.
      const inserted = await dbi
        .insert(schema.companies)
        .values({ name: company.canonicalName, source: 'proposal_extraction' })
        .returning();
      idByKey.set(company.key, inserted[0]!.id);
      created++;
      auditRows.push({ actorId: null, action: 'company.extract', targetType: 'company', targetId: inserted[0]!.id, payload: {} });
    }
    done++;
    emit({ stage: 'companies', done, total: companies.length });
  }

  await writeAuditBatch(dbi, auditRows);
  return { idByKey, created, reused };
}

async function applyRelationships(
  dbi: DbHandle,
  relationships: PlannedRelationship[],
  companyIdByKey: Map<string, string>,
  emit: (p: ApplyProgress) => void,
): Promise<{ idByKey: Map<string, string>; created: number; reused: number }> {
  const idByKey = new Map<string, string>();
  const auditRows: AuditRowDraft[] = [];
  let created = 0;
  let reused = 0;

  emit({ stage: 'relationships', done: 0, total: relationships.length });
  let done = 0;
  for (const relationship of relationships) {
    const companyId = companyIdByKey.get(relationship.companyKey);
    if (!companyId) {
      throw new Error(`apply: no company resolved for relationship company key ${relationship.companyKey}`);
    }
    const relationshipKey = `${relationship.companyKey}|${relationship.ownerId}`;

    if (relationship.existingRelationshipId !== null) {
      idByKey.set(relationshipKey, relationship.existingRelationshipId);
      reused++;
    } else {
      const inserted = await dbi
        .insert(schema.clientRelationships)
        .values({ companyId, ownerId: relationship.ownerId, source: 'proposal_extraction' })
        .onConflictDoNothing({ target: [schema.clientRelationships.companyId, schema.clientRelationships.ownerId] })
        .returning();
      if (inserted[0]) {
        idByKey.set(relationshipKey, inserted[0].id);
        created++;
        auditRows.push({
          actorId: null,
          action: 'client_relationship.extract',
          targetType: 'client_relationship',
          targetId: inserted[0].id,
          payload: { companyId },
        });
      } else {
        const reselected = await dbi
          .select({ id: schema.clientRelationships.id })
          .from(schema.clientRelationships)
          .where(and(eq(schema.clientRelationships.companyId, companyId), eq(schema.clientRelationships.ownerId, relationship.ownerId)))
          .limit(1);
        if (!reselected[0]) {
          throw new Error(`apply: relationship insert/reselect race unresolved for key ${relationshipKey}`);
        }
        idByKey.set(relationshipKey, reselected[0].id);
        reused++;
      }
    }
    done++;
    emit({ stage: 'relationships', done, total: relationships.length });
  }

  await writeAuditBatch(dbi, auditRows);
  return { idByKey, created, reused };
}

/**
 * D-05/D-06/D-07 + OQ-5: an extracted contact never touches a row it did
 * not create. `existingContactId === null` inserts fresh; a set id means
 * the planner (engine.ts) already matched an existing row whose own
 * `source` is `'proposal_extraction'` — engine.ts excludes the
 * human-entered-row collision case from `plan.contacts` entirely (that
 * case surfaces only as a `contact_conflicts_with_human_row` SkippedRow,
 * counted below without any statement). The `source = 'proposal_extraction'`
 * predicate is still compiled into this UPDATE's WHERE clause so the rule
 * is DB-enforced, not merely caller-enforced.
 */
async function applyContacts(
  dbi: DbHandle,
  contacts: PlannedContact[],
  relationshipIdByKey: Map<string, string>,
  contactsSkipped: number,
  emit: (p: ApplyProgress) => void,
): Promise<{ created: number; updated: number; skipped: number }> {
  const auditRows: AuditRowDraft[] = [];
  let created = 0;
  let updated = 0;

  emit({ stage: 'contacts', done: 0, total: contacts.length });
  let done = 0;
  for (const contact of contacts) {
    const clientRelationshipId = relationshipIdByKey.get(contact.relationshipKey);
    if (!clientRelationshipId) {
      throw new Error(`apply: no relationship resolved for contact relationship key ${contact.relationshipKey}`);
    }

    if (contact.existingContactId === null) {
      const inserted = await dbi
        .insert(schema.contacts)
        .values({
          clientRelationshipId,
          name: contact.name,
          role: contact.role,
          phone: contact.phone,
          email: contact.email,
          source: 'proposal_extraction',
        })
        .returning();
      created++;
      auditRows.push({
        actorId: null,
        action: 'contact.extract',
        targetType: 'contact',
        targetId: inserted[0]!.id,
        // Id-only payload — never name/email/phone (ADMIN-09 discipline
        // extended to PII, T-31-05-08).
        payload: { clientRelationshipId },
      });
    } else {
      // Fill-blanks only — name is never overwritten, and the `source`
      // predicate makes a partner-entered row structurally unreachable
      // even if the planner ever mis-planned an update against one.
      const roleValue: string | null = contact.role;
      const phoneValue: string | null = contact.phone;
      const emailValue: string | null = contact.email;
      const result = await dbi
        .update(schema.contacts)
        .set({
          role: sql`COALESCE(${schema.contacts.role}, ${roleValue})`,
          phone: sql`COALESCE(${schema.contacts.phone}, ${phoneValue})`,
          email: sql`COALESCE(${schema.contacts.email}, ${emailValue})`,
          updatedAt: new Date(),
        })
        .where(and(eq(schema.contacts.id, contact.existingContactId), eq(schema.contacts.source, 'proposal_extraction')))
        .returning();
      if (result.length > 0) updated++;
    }
    done++;
    emit({ stage: 'contacts', done, total: contacts.length });
  }

  await writeAuditBatch(dbi, auditRows);
  return { created, updated, skipped: contactsSkipped };
}

/**
 * OQ-1: a proposal already carrying a `client_relationship_id` is skipped —
 * a partner's Phase 30 wizard-mint choice must never be overwritten by a
 * name-derived guess. The `IS NULL` precondition lives in the UPDATE's own
 * WHERE clause, so that guarantee is DB-enforced and re-running the same
 * plan a second time re-points nothing.
 */
async function applyProposalLinks(
  dbi: DbHandle,
  links: ReconciliationPlan['proposalLinks'],
  relationshipIdByKey: Map<string, string>,
  emit: (p: ApplyProgress) => void,
): Promise<number> {
  let linked = 0;

  emit({ stage: 'proposalLinks', done: 0, total: links.length });
  let done = 0;
  for (const link of links) {
    const clientRelationshipId = relationshipIdByKey.get(link.relationshipKey);
    if (!clientRelationshipId) {
      throw new Error(`apply: no relationship resolved for proposal link key ${link.relationshipKey}`);
    }
    const result = await dbi
      .update(schema.proposals)
      .set({ clientRelationshipId })
      .where(and(eq(schema.proposals.id, link.sourceRowId), isNull(schema.proposals.clientRelationshipId)))
      .returning();
    if (result.length > 0) linked++;
    done++;
    emit({ stage: 'proposalLinks', done, total: links.length });
  }

  return linked;
}

async function applyPairs(
  dbi: DbHandle,
  pairs: ReconciliationPlan['flaggedPairs'],
  companyIdByKey: Map<string, string>,
  emit: (p: ApplyProgress) => void,
): Promise<{ inserted: number; alreadyPresent: number }> {
  const auditRows: AuditRowDraft[] = [];
  let inserted = 0;
  let alreadyPresent = 0;

  emit({ stage: 'pairs', done: 0, total: pairs.length });
  let done = 0;
  for (const pair of pairs) {
    if (pair.alreadyPending) {
      alreadyPresent++;
    } else {
      // sideAKey/sideBKey are already the canonical (LEAST/GREATEST) order
      // produced by canonicalPair() in the planner — inserted verbatim, not
      // recomputed here. No `target` is passed to onConflictDoNothing: the
      // table's only unique constraint is the hand-written expression index
      // company_pair_decisions_pair_uq (LEAST/GREATEST over side_a_key/
      // side_b_key), which Drizzle cannot address as a column target — an
      // untargeted ON CONFLICT DO NOTHING catches any unique violation on
      // this table, and the pending random-uuid primary key never collides.
      const result = await dbi
        .insert(schema.companyPairDecisions)
        .values({
          sideAKey: pair.sideAKey,
          sideBKey: pair.sideBKey,
          nameNormalized: pair.nameNormalized,
          reason: pair.reason,
          companyAId: companyIdByKey.get(pair.sideAKey) ?? null,
          companyBId: companyIdByKey.get(pair.sideBKey) ?? null,
        })
        .onConflictDoNothing()
        .returning();
      if (result[0]) {
        inserted++;
        auditRows.push({
          actorId: null,
          action: 'company_pair.flag',
          targetType: 'company_pair',
          targetId: result[0].id,
          payload: {},
        });
      } else {
        alreadyPresent++;
      }
    }
    done++;
    emit({ stage: 'pairs', done, total: pairs.length });
  }

  await writeAuditBatch(dbi, auditRows);
  return { inserted, alreadyPresent };
}

export async function applyReconciliationPlan(args: {
  dbi: DbHandle;
  plan: ReconciliationPlan;
  onProgress?: (progress: ApplyProgress) => void;
}): Promise<ApplyResult> {
  const { dbi, plan } = args;
  const emit = args.onProgress ?? (() => {});

  // Order is required by the FKs: companies before relationships,
  // relationships before contacts/proposal links, pairs last (a pair row
  // references both companies' ids).
  const companiesResult = await applyCompanies(dbi, plan.companies, emit);
  const relationshipsResult = await applyRelationships(dbi, plan.relationships, companiesResult.idByKey, emit);
  const skippedContacts = plan.skipped.filter((s) => s.reason === 'contact_conflicts_with_human_row').length;
  const contactsResult = await applyContacts(dbi, plan.contacts, relationshipsResult.idByKey, skippedContacts, emit);
  const proposalsLinked = await applyProposalLinks(dbi, plan.proposalLinks, relationshipsResult.idByKey, emit);
  const pairsResult = await applyPairs(dbi, plan.flaggedPairs, companiesResult.idByKey, emit);

  return {
    companiesCreated: companiesResult.created,
    companiesReused: companiesResult.reused,
    relationshipsCreated: relationshipsResult.created,
    relationshipsReused: relationshipsResult.reused,
    contactsCreated: contactsResult.created,
    contactsUpdated: contactsResult.updated,
    contactsSkipped: contactsResult.skipped,
    proposalsLinked,
    pairsInserted: pairsResult.inserted,
    pairsAlreadyPresent: pairsResult.alreadyPresent,
  };
}

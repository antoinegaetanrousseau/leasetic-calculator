'use server';

/**
 * Phase 30 Plan 05 — the write layer for the company & contact registry
 * (CRM-01, CRM-02, CRM-04).
 *
 * PITFALLS §7.3 ordering — every exported function calls
 * requireRelationshipHolder() as the FIRST await, before any DB access.
 *
 * Bounded-error discipline (T-30-05-03): every failure class in every action
 * throws the single key `'clients.toast.error'`. The raw error is logged
 * server-side only (`console.error`) — a caller can never distinguish "SIREN
 * conflict with another partner" from "database down" from any other cause.
 *
 * No action in this module accepts an owner id, a company id, or a
 * "pre-checked" boolean from the caller — `owner_id` is always
 * `session.user.id` from `requireRelationshipHolder()`.
 *
 * Non-transactional by design (T-30-05-09 note): this codebase's Neon
 * production driver is `drizzle-orm/neon-http` (selected by
 * `parseDatabaseUrl()` in `src/lib/db/client.ts` whenever `DATABASE_URL`
 * resolves to a `*.neon.tech`/`*.neon.build` host), whose `.transaction()`
 * throws `"No transactions support in neon-http driver"` at runtime — this
 * is the same reason `finalizeDraft`/`updateDraft` (src/lib/db/queries/
 * proposals.ts) never wrap their multi-statement writes in
 * `db().transaction()` either. Every multi-step sequence below is instead
 * built from individually-atomic, idempotent statements: `ON CONFLICT DO
 * NOTHING` + a re-select on the same unique index, so a crash between steps
 * leaves, at worst, a harmless orphan `companies` row (never a corrupted or
 * partially-visible relationship) and a retry is always safe.
 */

import { and, eq } from 'drizzle-orm';
import { requireRelationshipHolder } from '@/lib/auth/require';
import { db, schema } from '@/lib/db';
import { writeAuditLog } from '@/lib/db/queries/audit-log';
import { createClientSchema } from './schemas';

/** Single bounded error key for every failure class in this module (T-30-05-03). */
const BOUNDED_ERROR = 'clients.toast.error';

/* ─────────────────────────────────────────────────────────────────────────── */
/*  createClientRelationshipAction (CRM-01 + CRM-02)                           */
/* ─────────────────────────────────────────────────────────────────────────── */

export interface CreateClientRelationshipResult {
  relationshipId: string;
}

/**
 * Create (or silently reuse) a company, then bind the caller's own
 * relationship to it. Two partners submitting the same SIREN attach to the
 * SAME company row and each get their OWN relationship — the return shape
 * and the caller-visible outcome ("Client créé.") are identical whether the
 * company row was just created or already existed (T-30-05-02).
 */
export async function createClientRelationshipAction(
  raw: unknown,
): Promise<CreateClientRelationshipResult> {
  const { session } = await requireRelationshipHolder(); // FIRST — PITFALLS §7.3
  try {
    const input = createClientSchema.parse(raw);
    const dbi = db();

    // ── Resolve or create the company row ─────────────────────────────────
    let companyId: string;
    if (input.siren) {
      const bySiren = await dbi
        .select({ id: schema.companies.id })
        .from(schema.companies)
        .where(eq(schema.companies.siren, input.siren))
        .limit(1);
      if (bySiren[0]) {
        companyId = bySiren[0].id;
      } else {
        const inserted = await dbi
          .insert(schema.companies)
          .values({ name: input.name, siren: input.siren })
          .onConflictDoNothing({ target: schema.companies.siren })
          .returning();
        if (inserted[0]) {
          companyId = inserted[0].id;
        } else {
          // A concurrent creator won the race on the same siren — re-select
          // rather than branch the caller-visible outcome on which path ran.
          const reselected = await dbi
            .select({ id: schema.companies.id })
            .from(schema.companies)
            .where(eq(schema.companies.siren, input.siren))
            .limit(1);
          if (!reselected[0]) {
            throw new Error('siren insert/reselect race unresolved');
          }
          companyId = reselected[0].id;
        }
      }
    } else {
      // No SIREN — always create a new company row. No name-based matching
      // across partners (Phase 31 / IMPORT-03-04 scope, not this plan).
      const inserted = await dbi
        .insert(schema.companies)
        .values({ name: input.name })
        .returning();
      companyId = inserted[0].id;
    }

    // ── Bind the caller's own relationship to the company ─────────────────
    // owner_id is ALWAYS session.user.id — this function exposes no owner
    // parameter at all.
    const insertedRelationship = await dbi
      .insert(schema.clientRelationships)
      .values({ companyId, ownerId: session.user.id })
      .onConflictDoNothing({
        target: [schema.clientRelationships.companyId, schema.clientRelationships.ownerId],
      })
      .returning();

    let relationshipId: string;
    if (insertedRelationship[0]) {
      relationshipId = insertedRelationship[0].id;
    } else {
      // The caller already held this client — the unique index makes this
      // call idempotent; return their existing relationship id.
      const existingRelationship = await dbi
        .select({ id: schema.clientRelationships.id })
        .from(schema.clientRelationships)
        .where(and(
          eq(schema.clientRelationships.companyId, companyId),
          eq(schema.clientRelationships.ownerId, session.user.id),
        ))
        .limit(1);
      if (!existingRelationship[0]) {
        throw new Error('relationship insert/reselect race unresolved');
      }
      relationshipId = existingRelationship[0].id;
    }

    await writeAuditLog({
      actorId: session.user.id,
      action: 'client_relationship.create',
      targetType: 'client_relationship',
      targetId: relationshipId,
      // Payload carries only ids the caller's own submission produced —
      // never the company's name/siren beyond what was already submitted,
      // and never a signal about whether the company pre-existed.
      payload: { companyId },
    });

    return { relationshipId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[createClientRelationshipAction] failed:', msg);
    throw new Error(BOUNDED_ERROR);
  }
}

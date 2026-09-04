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
 *
 * ── Phase 34 Plan 07 ──────────────────────────────────────────────────────
 * This module now also holds the registry hook (D-09) and the shared-tier
 * edit (D-03). Two things about it changed shape:
 *
 * REGISTRY COLUMNS ARE NOT WRITTEN HERE. The ten registry-tier identity
 * columns and the two sync columns are written exclusively through
 * `./registry-sync`, which is the only function in the codebase that names one
 * (D-01/D-02) — that file's header lists them. No action below accepts a
 * registry column name from a caller, and none may start doing so: a grep gate
 * asserts that no such column name appears in this file at all. The one
 * registry-tier value this module reads is the company's sync status, purely to
 * decide whether the D-09 hook has anything to do.
 *
 * `refreshCompanyRegistryAction` IS THIS MODULE'S FIRST ACTION WITH A
 * RETURNED DISCRIMINATED RESULT (D-24). `no_siren`, `not_found` and
 * `unavailable` are recoverable outcomes a dialog acts on, and they travel
 * as VALUES because Next.js redacts a Server Function's thrown message in
 * production builds (33-REVIEW CR-01). Every other failure class in every
 * action here — including "not owned" — still throws the single bounded key
 * `'clients.toast.error'`.
 */

import { and, eq, inArray, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRelationshipHolder } from '@/lib/auth/require';
import { db, schema } from '@/lib/db';
import { writeAuditLog } from '@/lib/db/queries/audit-log';
import type { RegistryRefreshResult } from './constants';
import { syncCompanyRegistry } from './registry-sync';
import { contactSchema, createClientSchema, updateCompanyDisplaySchema } from './schemas';

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
    // The projections below carry the SIREN and the sync status alongside the
    // id purely so the D-09 hook at the end of this function needs NO extra
    // statement: reading a row we are already reading is not a second query,
    // and it keeps the hook off the critical path entirely.
    let companyId: string;
    let companySiren: string | null = null;
    let companyRegistryStatus: string | null = null;
    if (input.siren) {
      const bySiren = await dbi
        .select({
          id: schema.companies.id,
          siren: schema.companies.siren,
          registryStatus: schema.companies.registryStatus,
        })
        .from(schema.companies)
        .where(eq(schema.companies.siren, input.siren))
        .limit(1);
      if (bySiren[0]) {
        companyId = bySiren[0].id;
        companySiren = bySiren[0].siren;
        companyRegistryStatus = bySiren[0].registryStatus;
      } else {
        const inserted = await dbi
          .insert(schema.companies)
          .values({ name: input.name, siren: input.siren })
          .onConflictDoNothing({ target: schema.companies.siren })
          .returning();
        if (inserted[0]) {
          companyId = inserted[0].id;
          companySiren = inserted[0].siren;
          companyRegistryStatus = inserted[0].registryStatus;
        } else {
          // A concurrent creator won the race on the same siren — re-select
          // rather than branch the caller-visible outcome on which path ran.
          const reselected = await dbi
            .select({
              id: schema.companies.id,
              siren: schema.companies.siren,
              registryStatus: schema.companies.registryStatus,
            })
            .from(schema.companies)
            .where(eq(schema.companies.siren, input.siren))
            .limit(1);
          if (!reselected[0]) {
            throw new Error('siren insert/reselect race unresolved');
          }
          companyId = reselected[0].id;
          companySiren = reselected[0].siren;
          companyRegistryStatus = reselected[0].registryStatus;
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
      companySiren = inserted[0].siren;
      companyRegistryStatus = inserted[0].registryStatus;
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

    // ── The D-09 registry hook ────────────────────────────────────────────
    // Fill the company's registry identity, but ONLY when it is new or not yet
    // synced — creating a second relationship on an already-synced shared
    // company must not re-hit the registry API.
    //
    // There is deliberately NO try/catch here and NO branch on the result.
    // `syncCompanyRegistry` cannot throw (that is its defining property, pinned
    // in registry-sync.test.ts) and its failure is already persisted as the
    // company's sync status. D-09: A REGISTRY FAILURE NEVER BLOCKS CLIENT
    // CREATION.
    // Do not add a guard here — a guard is how a lookup failure would turn into
    // BOUNDED_ERROR and cost the partner the client they just created.
    if (companySiren !== null && companyRegistryStatus !== 'synced') {
      await syncCompanyRegistry({
        companyId,
        siren: companySiren,
        relationshipId,
        actorId: session.user.id,
        ownerId: session.user.id,
      });
    }

    // Unchanged and unconditional, whatever the registry did.
    return { relationshipId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[createClientRelationshipAction] failed:', msg);
    throw new Error(BOUNDED_ERROR);
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  refreshCompanyRegistryAction (FICHE-02) — on-demand registry refresh        */
/* ─────────────────────────────────────────────────────────────────────────── */

/** Local, non-exported: a `'use server'` file may export only async functions. */
const refreshCompanyRegistrySchema = z.object({
  relationshipId: z.string().uuid(),
});

/**
 * Re-run the registry lookup for the company behind ONE relationship the
 * caller owns, and append a `registry_synced` event to that caller's own
 * timeline on success.
 *
 * `companies` has no `owner_id` column, so the re-proof goes through the join
 * to the caller's own `client_relationships` row, not a direct column match.
 * Zero rows means either "no such relationship" or "not yours" — deliberately
 * indistinguishable, and neither is a recoverable outcome, so both throw the
 * bounded key rather than returning one.
 */
export async function refreshCompanyRegistryAction(raw: unknown): Promise<RegistryRefreshResult> {
  const { session } = await requireRelationshipHolder(); // FIRST — PITFALLS §7.3
  try {
    const input = refreshCompanyRegistrySchema.parse(raw);
    const dbi = db();

    const rows = await dbi
      .select({ companyId: schema.companies.id, siren: schema.companies.siren })
      .from(schema.clientRelationships)
      .innerJoin(schema.companies, eq(schema.companies.id, schema.clientRelationships.companyId))
      .where(and(
        eq(schema.clientRelationships.id, input.relationshipId),
        eq(schema.clientRelationships.ownerId, session.user.id),
      ))
      .limit(1);

    const row = rows[0];
    if (!row) {
      throw new Error('relationship not owned by caller');
    }

    if (row.siren === null) {
      // RETURNED, never thrown (D-24 / 33-REVIEW CR-01). Next.js replaces a
      // Server Function's thrown message with a generic string plus a digest in
      // a production build, so a sentinel here would work under `npm run dev`
      // and silently degrade to a dead-end toast once deployed. A returned
      // value crosses the serialisation boundary intact.
      return { ok: false, reason: 'no_siren' };
    }

    const result = await syncCompanyRegistry({
      companyId: row.companyId,
      siren: row.siren,
      relationshipId: input.relationshipId,
      actorId: session.user.id,
      ownerId: session.user.id,
    });

    // The sync wrote the company's sync status at minimum, which the client page and
    // its header render, so the layout is revalidated on every branch.
    revalidatePath('/clients', 'layout');

    return result;
  } catch (e) {
    if (e instanceof Error && e.message === BOUNDED_ERROR) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[refreshCompanyRegistryAction] failed:', msg);
    throw new Error(BOUNDED_ERROR);
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  updateCompanyDisplayAction (FICHE-03) — the audited shared-tier edit        */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Edit the three display fields and, if needed, correct the SIREN.
 *
 * `companies` IS SHARED (CRM-01). This write changes what EVERY other partner
 * holding a relationship on the company sees — which is exactly why D-03
 * requires an audit row carrying before and after, and why the caller may only
 * reach the company through a relationship they own. A private-tier edit needs
 * neither.
 *
 * The `.set()` below names four columns and a timestamp as literals. It is
 * never spread from the parsed input, so no key a caller invents can become a
 * column write, and no registry-tier column is reachable from here at all
 * (D-02 — see the module header).
 *
 * A SIREN CORRECTION RE-RUNS THE LOOKUP, AFTER THE WRITE. The correction is the
 * edit the partner asked for and the audit row records it; the sync then runs
 * against the new value. If the sync fails, the correction STILL STANDS and the
 * status reflects the failure — the same non-blocking discipline as D-09. There
 * is no transaction to roll back with (neon-http), and pretending otherwise
 * would leave the two halves inconsistent in the other, worse direction.
 */
export async function updateCompanyDisplayAction(raw: unknown): Promise<void> {
  const { session } = await requireRelationshipHolder(); // FIRST — PITFALLS §7.3
  try {
    const input = updateCompanyDisplaySchema.parse(raw);
    const dbi = db();

    // Owner-scoped subquery: the company reachable through the caller's OWN
    // relationship. `companies` is not owned by FK the way `client_relationships`
    // is, so the re-proof goes through the join, not a direct column match.
    const reachableCompanyIds = dbi
      .select({ id: schema.clientRelationships.companyId })
      .from(schema.clientRelationships)
      .where(and(
        eq(schema.clientRelationships.id, input.relationshipId),
        eq(schema.clientRelationships.ownerId, session.user.id),
      ));

    // THIS SELECT IS A DATA READ FOR THE AUDIT PAYLOAD, NOT THE AUTHORIZATION
    // STEP. PostgreSQL's `UPDATE ... RETURNING` returns the NEW row, so D-03's
    // "before" needs a read of its own. The UPDATE below independently re-proves
    // ownership inside its own WHERE; if this SELECT were deleted outright the
    // write would still be safe. Do NOT turn it into a check-then-write by
    // branching on it before the UPDATE — that is the TOCTOU pattern
    // `createContactAction`'s comment forbids.
    const beforeRows = await dbi
      .select({
        name: schema.companies.name,
        website: schema.companies.website,
        phone: schema.companies.phone,
        siren: schema.companies.siren,
      })
      .from(schema.companies)
      .where(inArray(schema.companies.id, reachableCompanyIds))
      .limit(1);

    const after = {
      name: input.name,
      website: input.website ?? null,
      phone: input.phone ?? null,
      siren: input.siren,
    };

    // Four literal columns plus the timestamp. A `companies.siren` unique
    // violation raised by ANOTHER partner's data throws here and is collapsed
    // by the outer catch into BOUNDED_ERROR, never surfaced (34-PATTERNS trap 10).
    const updated = await dbi
      .update(schema.companies)
      .set({
        name: input.name,
        website: input.website ?? null,
        phone: input.phone ?? null,
        siren: input.siren,
        updatedAt: new Date(),
      })
      .where(inArray(schema.companies.id, reachableCompanyIds))
      .returning();

    if (updated.length === 0) {
      // Either no such relationship or not the caller's — deliberately
      // indistinguishable, and the only failure signal.
      throw new Error('company not reachable through a relationship the caller owns');
    }

    const companyId = updated[0].id;
    const before = beforeRows[0] ?? { name: null, website: null, phone: null, siren: null };

    // D-03: the audit row exists BECAUSE other partners see the result. D-26 /
    // ADMIN-09: ids and caller-submitted values only — never commission data.
    await writeAuditLog({
      actorId: session.user.id,
      action: 'company.display_update',
      targetType: 'company',
      targetId: companyId,
      payload: { companyId, before, after },
    });

    if (input.siren !== before.siren) {
      await writeAuditLog({
        actorId: session.user.id,
        action: 'company.siren_correct',
        targetType: 'company',
        targetId: companyId,
        payload: { companyId, before: before.siren, after: input.siren },
      });

      // Re-run the lookup against the corrected value. No branch on the result
      // and no guard: it cannot throw, and a failure leaves the correction
      // standing with the status telling the partner to retry.
      await syncCompanyRegistry({
        companyId,
        siren: input.siren,
        relationshipId: input.relationshipId,
        actorId: session.user.id,
        ownerId: session.user.id,
      });
    }

    // The board renders the company name and SIREN, so it is revalidated too.
    revalidatePath('/clients', 'layout');
    revalidatePath('/pipeline');
  } catch (e) {
    if (e instanceof Error && e.message === BOUNDED_ERROR) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[updateCompanyDisplayAction] failed:', msg);
    throw new Error(BOUNDED_ERROR);
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Contact mutations (CRM-04) — ownership re-proved in every statement       */
/* ─────────────────────────────────────────────────────────────────────────── */

export interface CreateContactResult {
  id: string;
}

/**
 * Insert a contact under `relationshipId`, ONLY when the caller owns that
 * relationship. The ownership proof is compiled into the SAME insert
 * statement's source read (the relationship row is re-selected scoped by
 * `owner_id = session.user.id`, and the insert only proceeds when that read
 * returns a row) — there is no separate "check, then insert" step reachable
 * with the check skipped, so there is no TOCTOU window (T-30-05-04/05).
 */
export async function createContactAction(
  relationshipId: string,
  raw: unknown,
): Promise<CreateContactResult> {
  const { session } = await requireRelationshipHolder(); // FIRST — PITFALLS §7.3
  try {
    const input = contactSchema.parse(raw);
    const dbi = db();

    // Ownership is proved INSIDE the INSERT via `INSERT ... SELECT`: the source
    // row is the caller's own relationship, so a relationship the caller does not
    // own selects zero rows and inserts nothing. Zero rows returned is the only
    // failure signal (T-30-05-04 / T-30-05-05, and the sibling UPDATE/DELETE do
    // the same thing with `inArray`).
    //
    // Do NOT reintroduce a standalone ownership SELECT followed by a separate
    // INSERT. That is what this code used to do, and it left a real TOCTOU window
    // between the two statements — the exact pattern 30-05-PLAN.md forbids
    // ("the read and the write must be one statement"). It was invisible in
    // testing because the mock simply queued two results.
    const inserted = await dbi
      .insert(schema.contacts)
      .select(
        dbi
          // EVERY column of `contacts`, in the table's own declaration order.
          //
          // Drizzle's INSERT … SELECT compares the projection's keys against the
          // WHOLE table definition — same count, same order — and throws
          // "selected fields are not the same or are in a different order
          // compared to the table definition" otherwise. This projection listed
          // five of eleven columns, so `createContactAction` threw on EVERY call
          // from the moment the TOCTOU fix below introduced it: contact creation
          // has never worked in production, which had zero contact rows when
          // this was found. Fail-closed, so nothing leaked and no ownership
          // check was skipped — but the feature was dead and every gate was
          // green, because the unit tests mock the driver and therefore never
          // run Drizzle's validation.
          //
          // If a column is added to `contacts`, it must be added here too.
          .select({
            id: sql<string>`gen_random_uuid()`.as('id'),
            clientRelationshipId: schema.clientRelationships.id,
            name: sql<string>`${input.name}`.as('name'),
            role: sql<string | null>`${input.role ?? null}`.as('role'),
            phone: sql<string | null>`${input.phone ?? null}`.as('phone'),
            email: sql<string | null>`${input.email ?? null}`.as('email'),
            hubspotContactId: sql<string | null>`NULL::text`.as('hubspot_contact_id'),
            syncedAt: sql<Date | null>`NULL::timestamptz`.as('synced_at'),
            createdAt: sql<Date>`now()`.as('created_at'),
            updatedAt: sql<Date>`now()`.as('updated_at'),
            source: sql<string | null>`NULL::text`.as('source'),
          })
          .from(schema.clientRelationships)
          .where(and(
            eq(schema.clientRelationships.id, relationshipId),
            eq(schema.clientRelationships.ownerId, session.user.id),
          )),
      )
      .returning();

    if (!inserted[0]) {
      // Either the relationship does not exist or the caller does not own it —
      // deliberately indistinguishable, and collapsed into BOUNDED_ERROR below.
      throw new Error('relationship not owned by caller');
    }

    await writeAuditLog({
      actorId: session.user.id,
      action: 'contact.create',
      targetType: 'contact',
      targetId: inserted[0].id,
      payload: { relationshipId },
    });

    return { id: inserted[0].id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[createContactAction] failed:', msg);
    throw new Error(BOUNDED_ERROR);
  }
}

/**
 * Update a contact, ONLY when its relationship is owned by the caller. The
 * ownership predicate (`inArray` against the caller's own owned-relationship
 * ids) lives inside the SAME `UPDATE ... WHERE` as the write itself — never a
 * separate read-then-write, so zero rows affected is the only failure signal.
 */
export async function updateContactAction(contactId: string, raw: unknown): Promise<void> {
  const { session } = await requireRelationshipHolder(); // FIRST — PITFALLS §7.3
  try {
    const input = contactSchema.parse(raw);
    const dbi = db();

    const ownedRelationships = dbi
      .select({ id: schema.clientRelationships.id })
      .from(schema.clientRelationships)
      .where(eq(schema.clientRelationships.ownerId, session.user.id));

    const updated = await dbi
      .update(schema.contacts)
      .set({
        name: input.name,
        role: input.role ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
      })
      .where(and(
        eq(schema.contacts.id, contactId),
        inArray(schema.contacts.clientRelationshipId, ownedRelationships),
      ))
      .returning();

    if (updated.length === 0) {
      throw new Error('contact not owned by caller');
    }

    await writeAuditLog({
      actorId: session.user.id,
      action: 'contact.update',
      targetType: 'contact',
      targetId: contactId,
      payload: {},
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[updateContactAction] failed:', msg);
    throw new Error(BOUNDED_ERROR);
  }
}

/**
 * Delete a contact, ONLY when its relationship is owned by the caller. Same
 * single-statement ownership-predicate shape as `updateContactAction`.
 */
export async function deleteContactAction(contactId: string): Promise<void> {
  const { session } = await requireRelationshipHolder(); // FIRST — PITFALLS §7.3
  try {
    const dbi = db();

    const ownedRelationships = dbi
      .select({ id: schema.clientRelationships.id })
      .from(schema.clientRelationships)
      .where(eq(schema.clientRelationships.ownerId, session.user.id));

    const deleted = await dbi
      .delete(schema.contacts)
      .where(and(
        eq(schema.contacts.id, contactId),
        inArray(schema.contacts.clientRelationshipId, ownedRelationships),
      ))
      .returning();

    if (deleted.length === 0) {
      throw new Error('contact not owned by caller');
    }

    await writeAuditLog({
      actorId: session.user.id,
      action: 'contact.delete',
      targetType: 'contact',
      targetId: contactId,
      payload: {},
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[deleteContactAction] failed:', msg);
    throw new Error(BOUNDED_ERROR);
  }
}

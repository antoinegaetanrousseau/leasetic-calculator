'use server';

/**
 * Phase 34 Plan 06 — the private-tier write layer (FICHE-04, ACTV-03,
 * ACTV-04): three actions that record what the OWNING PARTNER knows about a
 * relationship — its lead source, its description, a dated note, and the next
 * thing they intend to do about it.
 *
 * This is D-01's third tier. Every column and every row written here lives on
 * `client_relationships` or `relationship_events`, both owner-scoped, and is
 * structurally unreachable from another partner's session — two partners
 * quoting the same SIREN share the company row and share none of this.
 *
 * PITFALLS §7.3 ordering — every exported function calls
 * `requireRelationshipHolder` as its FIRST await, before any DB access, and
 * ownership is then re-proved INSIDE each statement's own WHERE (or, for the
 * event writes, inside the `INSERT … SELECT` source). There is no standalone
 * "does the caller own this?" SELECT anywhere in this module, deliberately:
 * that shape reopens the TOCTOU window `createContactAction` was rewritten to
 * close, and it is invisible in testing because a mock simply queues two
 * results. This surface is partner-facing; the admin-only guard appears
 * nowhere in this file.
 *
 * Bounded-error discipline (T-30-05-03, T-34-06-02): every failure class in
 * every action THROWS the single key `BOUNDED_ERROR`. Zero rows affected is
 * the only failure signal, so "the relationship does not exist" and "the
 * relationship is not yours" are deliberately indistinguishable. The raw error
 * is `console.error`-logged server-side only. A RECOVERABLE outcome would have
 * to be a RETURNED discriminated result (D-24, 33-REVIEW CR-01) because
 * Next.js substitutes a generic message plus a digest for a thrown Server
 * Function error in production builds — this module has no such outcome today,
 * and `src/lib/relationship/constants.ts` says where one would live. Nothing
 * here throws a sentinel a client could match on `error.message`.
 *
 * Non-transactional by design (34-PATTERNS trap 1): the production driver is
 * `drizzle-orm/neon-http`, whose `transaction` helper throws at runtime. Each
 * action below is a sequence of individually atomic statements, and the
 * accepted crash-between outcome is recorded per action:
 *   - `setNextActionAction` writes the ROW first, then the event. A crash
 *     between them leaves the date set with no timeline entry — the fact
 *     survives, the narration is lost. That is the right way round.
 *   - `addRelationshipNoteAction` inverts it deliberately, because there the
 *     event IS the fact; the losable half is the `updated_at` bump. See its
 *     own comment.
 * Neither retries, and neither compensates.
 *
 * NO AUDIT ROWS IN THIS MODULE (D-03). A shared-tier edit writes an audit row
 * with before and after precisely BECAUSE another partner sees the result. A
 * private-tier edit has no second reader, so there is nobody the row would be
 * evidence for. Plan 34-01 minted three new `AuditAction` members and all
 * three are shared-tier; the audit-log writer is not imported here, and an
 * acceptance criterion counts zero occurrences of its name in this file.
 * Adding private-tier auditing later is a new decision with a new action
 * member, not a quiet addition here.
 *
 * A NOTE TO THE NEXT EDITOR: the prose above deliberately names the auth
 * guard, the audit writer and the transaction API without their call
 * parentheses. This phase's acceptance criteria grep this file for those
 * literals — three guard calls, zero audit writes, zero transactions — so a
 * comment quoting one would defeat the check it describes (the same reason
 * 34-05 reworded a comment that quoted the expression its own guard greps
 * for).
 */

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { requireRelationshipHolder } from '@/lib/auth/require';
import { db, schema } from '@/lib/db';
import { insertRelationshipEventForOwner } from '@/lib/db/queries';
import { RELATIONSHIP_BOUNDED_ERROR } from './constants';
import { addNoteSchema, setNextActionSchema, updateRelationDetailsSchema } from './schemas';

/** Single bounded error key for every failure class in this module (T-30-05-03). */
const BOUNDED_ERROR = RELATIONSHIP_BOUNDED_ERROR;

/* ─────────────────────────────────────────────────────────────────────────── */
/*  updateRelationDetailsAction (FICHE-04)                                     */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Record the caller's own lead source and description for a relationship they
 * own, in one TOCTOU-safe statement.
 *
 * No timeline event: D-14 fixes the event vocabulary at six kinds and
 * `relation_updated` is not one of them. Editing a description is a
 * correction, not an occurrence — and minting a seventh kind would need a
 * CHECK change and therefore a second migration.
 *
 * The `.set()` object enumerates its columns as LITERALS and is never spread
 * from parsed input (D-02, T-34-06-03). That rule matters most for the
 * shared tier — a registry column must be unreachable from a partner form —
 * and it is applied here, where the blast radius is only the caller's own
 * row, precisely so the habit is already in place when plan 34-07 writes the
 * shared-tier version.
 */
export async function updateRelationDetailsAction(raw: unknown): Promise<void> {
  const { session } = await requireRelationshipHolder(); // FIRST — PITFALLS §7.3
  try {
    const input = updateRelationDetailsSchema.parse(raw);
    const dbi = db();

    // Ownership re-proved inside the UPDATE's own WHERE — never a separate
    // SELECT. Zero rows returned is the only failure signal, covering
    // not-found and not-owned identically (T-34-06-01 / T-34-06-02).
    const updated = await dbi
      .update(schema.clientRelationships)
      .set({
        // `?? null` rather than omitting the key: an absent value is the
        // partner CLEARING the field, and the column must reach SQL NULL.
        leadSource: input.leadSource ?? null,
        description: input.description ?? null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(schema.clientRelationships.id, input.relationshipId),
        eq(schema.clientRelationships.ownerId, session.user.id),
      ))
      .returning();

    if (updated.length === 0) {
      throw new Error(BOUNDED_ERROR);
    }

    // No single client-detail path is derivable without a read — revalidate
    // the whole /clients subtree. '/' as well: every private-tier write can
    // change the home page's "à relancer" card, whose staleness clock is the
    // `updated_at` this statement just bumped.
    revalidatePath('/clients', 'layout');
    revalidatePath('/');
  } catch (e) {
    if (e instanceof Error && e.message === BOUNDED_ERROR) {
      throw e; // already the bounded key — don't double-log or re-wrap
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[updateRelationDetailsAction] failed:', msg);
    throw new Error(BOUNDED_ERROR);
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  addRelationshipNoteAction (ACTV-03)                                        */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Append a dated note to a relationship the caller owns. The note IS the
 * event (ACTV-03) — there is no note column to write, so this action writes
 * exactly one row into `relationship_events` and then bumps the staleness
 * clock.
 *
 * ORDERING, and what a crash between the two statements leaves behind: the
 * event goes FIRST because the event is the fact. The `updated_at` bump is
 * the losable half — a crash before it leaves a note that did not reset
 * staleness, so the relationship stays on the home page's "à relancer" list
 * one cycle longer. Harmless, and the inverse of `setNextActionAction`, which
 * writes its row first because there the row is the fact.
 *
 * `actorId` is the session user, never `null`: `null` is reserved for
 * genuinely system-initiated events (D-14), and a note whose author is
 * indistinguishable from the system defeats ACTV-02's attribution
 * (T-34-06-04).
 */
export async function addRelationshipNoteAction(raw: unknown): Promise<void> {
  const { session } = await requireRelationshipHolder(); // FIRST — PITFALLS §7.3
  try {
    const input = addNoteSchema.parse(raw);
    const dbi = db();

    // Ownership is proved INSIDE the INSERT by the helper's `INSERT … SELECT`
    // (its source row is the caller's own relationship). Do NOT add a
    // preceding ownership SELECT — that is the TOCTOU shape this codebase
    // removed from the contacts path.
    const event = await insertRelationshipEventForOwner({
      relationshipId: input.relationshipId,
      ownerId: session.user.id,
      kind: 'note',
      actorId: session.user.id,
      body: input.body,
      occurredAt: input.occurredAt,
    });

    if (!event) {
      // Nothing was inserted: the relationship does not exist, or is not the
      // caller's. Indistinguishable on purpose.
      throw new Error(BOUNDED_ERROR);
    }

    // The staleness clock the "à relancer" list reads. Owner-scoped again —
    // this statement re-proves ownership itself rather than trusting the one
    // above, so it can never be reached with the predicate skipped. Its row
    // count is deliberately NOT checked: the note is already durable, and a
    // zero here (the relationship vanished in between) must not turn a
    // successful note into an error toast.
    await dbi
      .update(schema.clientRelationships)
      .set({ updatedAt: new Date() })
      .where(and(
        eq(schema.clientRelationships.id, input.relationshipId),
        eq(schema.clientRelationships.ownerId, session.user.id),
      ))
      .returning();

    revalidatePath('/clients', 'layout');
    revalidatePath('/');
  } catch (e) {
    if (e instanceof Error && e.message === BOUNDED_ERROR) {
      throw e;
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[addRelationshipNoteAction] failed:', msg);
    throw new Error(BOUNDED_ERROR);
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  setNextActionAction (ACTV-04)                                              */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Set — or clear — the caller's next action on a relationship they own.
 *
 * ORDERING: the ROW goes first, the event second. A crash between them leaves
 * the date set with no timeline entry: the fact survives, the narration is
 * lost. The inverse would lose the date itself, which is what the home page's
 * follow-up list is driven by.
 *
 * CLEARING (`nextActionAt: null`) writes the row and NO event. `next_action_set`
 * is the kind; a cleared date is the absence of an intention, and an event
 * claiming one was set would be false. Clearing also nulls the note, so a
 * stale note cannot outlive the intention it described.
 */
export async function setNextActionAction(raw: unknown): Promise<void> {
  const { session } = await requireRelationshipHolder(); // FIRST — PITFALLS §7.3
  try {
    const input = setNextActionSchema.parse(raw);
    const dbi = db();

    // ── 1. The row (the fact) ─────────────────────────────────────────────
    const updated = await dbi
      .update(schema.clientRelationships)
      .set({
        nextActionAt: input.nextActionAt,
        nextActionNote: input.nextActionAt === null ? null : (input.nextActionNote ?? null),
        updatedAt: new Date(),
      })
      .where(and(
        eq(schema.clientRelationships.id, input.relationshipId),
        eq(schema.clientRelationships.ownerId, session.user.id),
      ))
      .returning();

    if (updated.length === 0) {
      throw new Error(BOUNDED_ERROR);
    }

    // ── 2. The event (the narration), only when a date was actually set ───
    if (input.nextActionAt !== null) {
      const event = await insertRelationshipEventForOwner({
        relationshipId: input.relationshipId,
        ownerId: session.user.id,
        kind: 'next_action_set',
        actorId: session.user.id,
        // The caller-submitted date and nothing else. `payload` is jsonb and
        // reaches admin and analytics surfaces, so no commission, rate or
        // envelope data may ever enter it (D-26 / ADMIN-09, T-34-06-05).
        payload: { nextActionAt: input.nextActionAt.toISOString() },
      });

      if (!event) {
        // The row write above already succeeded, so this is the losable half
        // — but surface it rather than swallow it: the partner would
        // otherwise see a timeline that silently disagrees with the header.
        console.error('[setNextActionAction] event insert affected zero rows');
        throw new Error(BOUNDED_ERROR);
      }
    }

    revalidatePath('/clients', 'layout');
    revalidatePath('/');
  } catch (e) {
    if (e instanceof Error && e.message === BOUNDED_ERROR) {
      throw e;
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[setNextActionAction] failed:', msg);
    throw new Error(BOUNDED_ERROR);
  }
}

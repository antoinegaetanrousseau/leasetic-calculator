import { z } from 'zod';
import { LEAD_SOURCES } from './kinds';

/**
 * Phase 34 Plan 06 — zod input contracts for the private-tier write layer
 * (FICHE-04, ACTV-03, ACTV-04).
 *
 * Reuse discipline: `error.field.required` already exists in the dictionary
 * (src/lib/i18n/dictionaries.ts) and is emitted here by name rather than
 * re-minted, matching `createClientSchema` (src/lib/crm/schemas.ts) and
 * `advanceStageSchema` (src/lib/pipeline/schemas.ts). Plan 34-01 owns
 * `dictionaries.ts`; no key is added from here.
 *
 * No `'use server'`, no `import 'server-only'` — the relation dialog, the note
 * form and the next-action form all reach these schemas through `zodResolver`
 * on the client, not only through `src/lib/relationship/actions.ts`.
 *
 * FREE TEXT IS CAPPED, NOT TRUNCATED. `description`, `body` and
 * `nextActionNote` are partner-authored, so an oversize value is a mistake to
 * report rather than prose to silently halve (T-34-06-07). Registry text — a
 * value nobody in this app typed — is the opposite case and is truncated by
 * its own parser instead.
 */

/**
 * Each optional free-text field below spells out its own
 * `.trim().max(N).optional().transform(...)` chain rather than sharing a
 * helper, exactly as `pipeline/schemas.ts:44-51` does. The cap is the security
 * control here (T-34-06-07), and one cap per field, written at the field, is
 * what makes it readable at a glance and greppable by the phase's acceptance
 * check — a factored helper hides two of the three caps behind a call.
 *
 * The blank-to-`undefined` normalisation is what keeps the column honest: the
 * actions write `input.x ?? null`, so a cleared field lands as SQL NULL and
 * there is never a third "present but empty" state for a reader to interpret.
 */

/**
 * `updateRelationDetailsSchema` — FICHE-04's two descriptive fields.
 *
 * The lead-source enum is built FROM `LEAD_SOURCES` (src/lib/relationship/
 * kinds.ts), never from a hand-retyped tuple. That tuple and
 * `client_relationships_lead_source_check` enumerate identical value sets; a
 * second independently-written copy here would compile, pass its tests, and
 * then fail at INSERT time in production the first time the two lists drifted.
 *
 * `''` is normalised to `undefined` because an unselected `<select>` posts an
 * empty string, and "no source recorded" must reach the column as NULL.
 */
export const updateRelationDetailsSchema = z.object({
  relationshipId: z.string().uuid(),
  leadSource: z
    .enum(LEAD_SOURCES)
    .or(z.literal(''))
    .optional()
    .transform((v) => (v === undefined || v === '' ? undefined : v)),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v === undefined || v.length === 0 ? undefined : v)),
});

export type UpdateRelationDetailsInput = z.infer<typeof updateRelationDetailsSchema>;

/**
 * `addNoteSchema` — ACTV-03. The note IS the event, so `body` is required:
 * an empty note is nothing to record, and it fails with the existing
 * `error.field.required` key.
 *
 * `occurredAt` is optional and coerced, paired with a plain `<input
 * type="date">` on the client exactly as `markWonSchema.date` is. Absent means
 * "now", resolved in SQL by `insertRelationshipEventForOwner` — a backdated
 * note is a legitimate thing for a partner to write, and the timeline orders
 * on `occurred_at`, so it lands where its author put it.
 */
export const addNoteSchema = z.object({
  relationshipId: z.string().uuid(),
  body: z.string().trim().min(1, { message: 'error.field.required' }).max(2000),
  occurredAt: z.coerce.date().optional(),
});

export type AddNoteInput = z.infer<typeof addNoteSchema>;

/**
 * `setNextActionSchema` — ACTV-04.
 *
 * `nextActionAt` is `.nullable()`, NOT `.optional()`, and the distinction is
 * the whole contract: `null` is the explicit CLEAR signal ("I no longer intend
 * to do anything about this"), which the action writes as SQL NULL and which
 * writes no timeline event. An absent key would be indistinguishable from a
 * form that simply did not include the field, and the action would have to
 * guess.
 */
export const setNextActionSchema = z.object({
  relationshipId: z.string().uuid(),
  nextActionAt: z.coerce.date().nullable(),
  nextActionNote: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v === undefined || v.length === 0 ? undefined : v)),
});

export type SetNextActionInput = z.infer<typeof setNextActionSchema>;

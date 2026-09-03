import { z } from 'zod';
import { PARTNER_SETTABLE_STAGES } from '@/lib/pipeline/stages';
import { normalizeSiren } from '@/lib/crm/siren';

/**
 * Phase 33 Plan 04 — zod input contracts for the pipeline write layer
 * (PIPE-01, PIPE-02, PIPE-03, PIPE-05).
 *
 * Reuse discipline: `error.field.siren.invalid` already exists in the
 * dictionary (src/lib/i18n/dictionaries.ts) — `markWonSchema.siren` emits
 * that exact key rather than minting a new one, matching
 * `createClientSchema.siren` (src/lib/crm/schemas.ts) verbatim.
 *
 * No `'use server'`, no `import 'server-only'` — this module is imported by
 * client dialogs through `zodResolver` (MarkWonDialog, MarkLostDialog, the
 * mobile stage-picker), not only by src/lib/pipeline/actions.ts.
 */

/**
 * `advanceStageSchema` — D-04 / PIPE-02: the allowlist below is derived
 * directly from `src/lib/pipeline/stages.ts`'s partner-settable list, NEVER
 * a hand-retyped literal tuple. A second, independently-written copy of the
 * five-value list is exactly how the two system-owned reserved stages would
 * eventually leak into what the application can write — they are absent
 * from this enum on purpose, reserved for the future contract-tool
 * integration. Widening this enum to include either of them is a product
 * decision requiring a migration (D-02), not a code convenience.
 */
export const advanceStageSchema = z.object({
  relationshipId: z.string().uuid(),
  toStage: z.enum(PARTNER_SETTABLE_STAGES),
});

export type AdvanceStageInput = z.infer<typeof advanceStageSchema>;

/**
 * Shared outcome-capture fields for `markWonSchema`/`markLostSchema`.
 *
 * `date` is required — `proposals_outcome_completeness_check` (plan 33-01)
 * makes `outcome_date` mandatory whenever `outcome` is non-null.
 *
 * `reason` follows `optionalTrimmed`'s shape from `crm/schemas.ts`: trimmed,
 * capped at 500 characters (the input-validation the security model requires
 * on a free-text field that reaches the database), and an empty/blank value
 * normalizes to `undefined` rather than an empty string.
 */
const outcomeFieldsSchema = {
  date: z.coerce.date(),
  reason: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v === undefined || v.length === 0 ? undefined : v)),
};

/**
 * `markLostSchema` — no `siren` member at all; the SIREN gate (D-07/D-08)
 * only applies to the `won` outcome.
 */
export const markLostSchema = z.object({
  proposalId: z.string().uuid(),
  ...outcomeFieldsSchema,
});

export type MarkLostInput = z.infer<typeof markLostSchema>;

/**
 * `markWonSchema` — `siren` reuses `createClientSchema`'s exact
 * transform+refine pair verbatim: normalize, fall back to the trimmed
 * original so a malformed value still fails, refine on the 9-digit shape
 * with `error.field.siren.invalid`. `siren` is optional because it is only
 * present on the second, post-gate submit of D-08's inline-SIREN dialog
 * flow — the first submit has no SIREN field visible at all.
 */
export const markWonSchema = z.object({
  proposalId: z.string().uuid(),
  ...outcomeFieldsSchema,
  siren: z
    .string()
    .optional()
    .transform((v) => {
      const trimmed = v?.trim();
      if (!trimmed) return undefined;
      return normalizeSiren(v) ?? trimmed;
    })
    .refine((v) => v === undefined || /^[0-9]{9}$/.test(v), {
      message: 'error.field.siren.invalid',
    }),
});

export type MarkWonInput = z.infer<typeof markWonSchema>;

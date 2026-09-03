import { z } from 'zod';
import { normalizeSiren } from './siren';

/**
 * Phase 30 Plan 05 — validation schemas for the write layer (CRM-01, CRM-04).
 *
 * Reuse discipline: both `error.field.siren.invalid` and
 * `error.field.email.invalid` already exist in the dictionary
 * (src/lib/i18n/dictionaries.ts) — these schemas emit those exact keys
 * rather than minting new strings, matching the pattern already established
 * by `src/lib/calc/schema.ts`'s `optionalSirenSchema`/`optionalEmailSchema`.
 */

/**
 * `createClientSchema` — the create-client dialog (30-UI-SPEC.md §2).
 *
 * `siren` is normalized to digits-only before validation and persistence:
 * the UI formats it as "XXX XXX XXX" via `SirenInput`'s `formatSiren()`, but
 * the digits-only form is what matches `companies_siren_check` and the
 * UNIQUE index from plan 30-01. An empty/whitespace SIREN is normalized to
 * `undefined` (absent), not rejected.
 *
 * Phase 31 Plan 02 (D-03): the digit-strip + 9-digit-shape transform is
 * factored into the shared `normalizeSiren` helper (src/lib/crm/siren.ts) so
 * this form path and the reconciliation engine never drift. The transform
 * below keeps a distinction `normalizeSiren` deliberately collapses: a
 * genuinely-absent value (undefined/blank) must pass silently, but a
 * provided-and-malformed value must still fail the `.refine(...)` below with
 * `error.field.siren.invalid` — so a malformed value that fails
 * `normalizeSiren` falls back to the original trimmed string, which then
 * fails the shape check on purpose.
 */
/**
 * The ONE required-SIREN field, shared by `createClientSchema` and (Phase 34
 * Plan 07) `updateCompanyDisplaySchema`. Extracted rather than written twice:
 * D-23 makes a single normalisation rule load-bearing now that the SIREN is
 * the registry lookup key, and two hand-copied `.transform(...).refine(...)`
 * pairs are exactly how that rule would drift.
 *
 * MEASURED BEHAVIOUR, so nobody has to rediscover it: `normalizeSiren` STRIPS
 * every non-digit and then checks the shape, so "552 100 554" and
 * "1a2b3c4d5e6f7g8h9" both normalise to nine digits and both pass. Only a
 * value that does not yield exactly nine digits fails.
 */
const requiredSirenField = z
  .string({ message: 'error.field.required' })
  .trim()
  .min(1, { message: 'error.field.required' })
  .transform((v) => normalizeSiren(v) ?? v)
  .refine((v) => /^[0-9]{9}$/.test(v), {
    message: 'error.field.siren.invalid',
  });

export const createClientSchema = z.object({
  name: z.string().trim().min(1, { message: 'error.field.required' }),
  // Required since 2026-09-03 (operator decision): a client cannot be
  // created without its SIREN. Formatting spaces are stripped.
  siren: requiredSirenField,
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

/**
 * `contactSchema` — the contact add/edit dialog (30-UI-SPEC.md §3).
 *
 * `role`/`phone`/`email` are optional; an empty string is normalized to
 * `undefined` rather than treated as "provided but blank" (so an
 * empty-string email never trips the email-format refinement).
 */
const optionalTrimmed = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v.length === 0 ? undefined : v));

export const contactSchema = z.object({
  name: z.string().trim().min(1, { message: 'error.field.required' }),
  role: optionalTrimmed,
  phone: optionalTrimmed,
  email: optionalTrimmed.refine(
    (v) => v === undefined || z.string().email().safeParse(v).success,
    { message: 'error.field.email.invalid' },
  ),
});

export type ContactInput = z.infer<typeof contactSchema>;

/**
 * `updateCompanyDisplaySchema` — the shared-tier edit (FICHE-03, D-01 tier two).
 *
 * THE FOUR FIELDS ARE THE WHOLE SCHEMA, and that is the point. `companies` is a
 * SHARED row: a partner editing it changes what every other partner on that
 * company sees. D-01 tier one — the registry identity — is written by the
 * SIRENE lookup and by nothing else, so no registry field appears here and none
 * may be added. A caller submitting `legalName` alongside these keys has it
 * dropped by the parse and, one layer further in, could not reach the write
 * anyway: `updateCompanyDisplayAction`'s `.set()` names its columns as literals.
 *
 * `siren` reuses `requiredSirenField` — the same const `createClientSchema`
 * uses, never a second copy of the rule (D-23).
 */
export const updateCompanyDisplaySchema = z.object({
  relationshipId: z.string().uuid(),
  name: z.string().trim().min(1, { message: 'error.field.required' }).max(200),
  /**
   * Deliberately lenient (a bare host like `dupont-menuiserie.fr` is what a
   * partner actually types) but not a free-text field: it must contain no
   * whitespace and at least one dot, and the length cap does the rest. Emits
   * `error.field.url.invalid`, which is already in the dictionary — no new key.
   */
  website: optionalTrimmed
    .refine((v) => v === undefined || v.length <= 300, { message: 'error.field.url.invalid' })
    .refine((v) => v === undefined || /^[^\s]+\.[^\s]+$/.test(v), {
      message: 'error.field.url.invalid',
    }),
  phone: optionalTrimmed.refine((v) => v === undefined || v.length <= 40, {
    message: 'error.field.required',
  }),
  siren: requiredSirenField,
});

export type UpdateCompanyDisplayInput = z.infer<typeof updateCompanyDisplaySchema>;

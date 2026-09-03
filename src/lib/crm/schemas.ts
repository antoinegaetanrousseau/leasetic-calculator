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
export const createClientSchema = z.object({
  name: z.string().trim().min(1, { message: 'error.field.required' }),
  // Required since 2026-09-03 (operator decision): a client cannot be
  // created without its SIREN. Formatting spaces are stripped.
  siren: z
    .string({ message: 'error.field.required' })
    .trim()
    .min(1, { message: 'error.field.required' })
    .transform((v) => normalizeSiren(v) ?? v)
    .refine((v) => /^[0-9]{9}$/.test(v), {
      message: 'error.field.siren.invalid',
    }),
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

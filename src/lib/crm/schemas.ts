import { z } from 'zod';

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
 */
export const createClientSchema = z.object({
  name: z.string().trim().min(1, { message: 'error.field.required' }),
  siren: z
    .string()
    .optional()
    .transform((v) => (v ? v.replace(/\D/g, '') : undefined))
    .transform((v) => (v === undefined || v.length === 0 ? undefined : v))
    .refine((v) => v === undefined || /^[0-9]{9}$/.test(v), {
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

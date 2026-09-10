import { z } from 'zod';

/**
 * Shared Zod schemas for Phase 9 admin forms.
 * SHELL-11 same-schema discipline: these schemas are used BOTH client-side (RHF resolver)
 * and server-side (in admin action wrappers for input validation).
 */

// Coefficients are numeric strings — RHF register with valueAsNumber: false (CONTEXT implicit decision).
// Admin types '3.0000', NOT '3' or '3.0'. Storage: numeric(10, 8) per schema.ts.
const coeffStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,8})?$/, { message: 'admin.coefficients.error.coeff.format' });

const tranchePerDuration = z.object({
  '36': coeffStringSchema,
  '48': coeffStringSchema,
  '60': coeffStringSchema,
});

/**
 * Coefficient editor form schema (ADMIN-01 / D-09-12).
 * All numeric fields validated with strict regex per T-09-01-02 (mass-assignment prevention).
 */
export const coeffEditorSchema = z.object({
  commissionPct: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, { message: 'admin.coefficients.error.commission.format' }),
  maxAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, { message: 'admin.coefficients.error.max_amount.format' }),
  validityDays: z.coerce
    .number()
    .refine((v): v is 15 | 30 | 60 => ([15, 30, 60] as number[]).includes(v), {
      message: 'admin.coefficients.error.validity.invalid',
    }),
  coefficients: z.object({
    t1: tranchePerDuration,
    t2: tranchePerDuration,
    t3: tranchePerDuration,
    t4: tranchePerDuration,
  }),
  note: z.string().max(500).optional(),
});

export type CoeffEditorValues = z.infer<typeof coeffEditorSchema>;

/**
 * Create-partner modal form schema (D-09-12).
 */
/**
 * Shared permissive telephone shape for both partner phone columns
 * (FIELD-02 `company_telephone` and PROF-01 `telephone`): 6-20 characters
 * drawn from digits, spaces, `+`, `(`, `)` and `-`. Extracted in the Phase 42
 * follow-up that added the admin edit path so the create form and the edit
 * action cannot drift apart — previously the same literal appeared twice.
 */
export const PARTNER_PHONE_REGEX = /^[\d\s+()-]{6,20}$/;

/**
 * FIELD-02 follow-up — admin edit of an EXISTING partner's company telephone.
 *
 * An empty string is a deliberate CLEAR (the action maps it to NULL), not a
 * validation failure: `users.company_telephone` is nullable by design and an
 * admin must be able to remove a wrong number, not only overwrite it. Callers
 * trim before parsing, so no `.trim()` transform is attached here.
 */
export const partnerCompanyTelephoneSchema = z
  .string()
  .regex(PARTNER_PHONE_REGEX, 'error.field.phone.invalid')
  .or(z.literal(''));

export const createPartnerSchema = z.object({
  email: z.string().email({ message: 'admin.accounts.modal.error.email.invalid' }),
  displayName: z.string().min(1, { message: 'admin.accounts.modal.error.name.required' }),
  language: z.enum(['fr', 'en']).default('fr'),
});

export type CreatePartnerValues = z.infer<typeof createPartnerSchema>;

/**
 * Phase 14 — /partners/new route 7-field form schema (UI-SPEC §5.1).
 * Phase 42 Plan 05 (D-13/D-19) — `phone` loosened to optional and a new
 * `telephone` field added; see the field-level comments below.
 *
 * Distinct from `createPartnerSchema` above (D-10 keeps CreatePartnerModal.tsx
 * as shelf code with its legacy 3-field shape). Both schemas coexist; the
 * server-side adminCreateInvitation accepts the union of both shapes via
 * optional fields.
 *
 * Validation rules (UI-SPEC §5.1, amended by Phase 42 Plan 05):
 *   - firstName/lastName: required, 1–100 chars
 *   - email: required, RFC-format
 *   - companyName: required, 1–200 chars
 *   - siret: OPTIONAL — empty string OR exactly 14 digits
 *   - phone: OPTIONAL — the partner **company's** telephone (D-13). Empty
 *     string or 6–20 chars from [0-9 +()-]. Maps to `users.company_telephone`.
 *     Never blocks finalization; the column ships nullable.
 *   - telephone: OPTIONAL — the partner's **own** telephone (D-19). Same
 *     permissive shape as `phone`. Maps to `users.telephone`, the single
 *     field PROF-02's finalization gate reads. Admins populate it proactively
 *     so no partner is interrupted mid-proposal by a gate they have never seen.
 *   - invitationMessage: OPTIONAL, max 1000 chars
 */
export const createPartnerFormSchema = z.object({
  firstName: z.string().min(1, 'error.field.required').max(100),
  lastName: z.string().min(1, 'error.field.required').max(100),
  email: z
    .string()
    .min(1, 'error.field.required')
    .email('error.field.email.invalid'),
  companyName: z.string().min(1, 'error.field.required').max(200),
  siret: z
    .string()
    .regex(/^\d{14}$/, 'error.field.siret.invalid')
    .optional()
    .or(z.literal('')),
  // FIELD-02 / D-13: the partner COMPANY's telephone — maps to
  // users.company_telephone. Nullable by design (every existing partner
  // account has none) and must never block anything, so it is optional here
  // — mirrors the `siret` field's exact `.optional().or(z.literal(''))`
  // shape immediately above. The permissive regex and its error message are
  // unchanged from the previously-required shape (UI-SPEC: validation shape
  // does not change, only optionality).
  phone: z
    .string()
    .regex(PARTNER_PHONE_REGEX, 'error.field.phone.invalid')
    .optional()
    .or(z.literal('')),
  // PROF-01 / D-19: the partner's OWN telephone — maps to users.telephone,
  // the single field PROF-02's finalization gate reads (D-17). Optional here
  // too: admins fill it in proactively (D-19), it is never a hard gate on
  // partner creation.
  telephone: z
    .string()
    .regex(PARTNER_PHONE_REGEX, 'error.field.phone.invalid')
    .optional()
    .or(z.literal('')),
  invitationMessage: z.string().max(1000, 'partners.new.message.tooLong').optional(),
  /**
   * PTYPE-01 / D-03 force-explicit-choice: NO .default() so parse() fails when
   * the field is unset. D-04: plain labels (Agent/Commercial/Partenaire).
   * ADMIN-09: this is a business-classification enum, NOT a commission/rate value.
   */
  // Rule 1 auto-fix: Zod v4 uses `error` not `errorMap` for the custom error param.
  partnerType: z.enum(['Agent', 'Commercial', 'Partenaire'], {
    error: 'error.field.required',
  }),
});

export type CreatePartnerFormValues = z.infer<typeof createPartnerFormSchema>;

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
export const createPartnerSchema = z.object({
  email: z.string().email({ message: 'admin.accounts.modal.error.email.invalid' }),
  displayName: z.string().min(1, { message: 'admin.accounts.modal.error.name.required' }),
  language: z.enum(['fr', 'en']).default('fr'),
});

export type CreatePartnerValues = z.infer<typeof createPartnerSchema>;

/**
 * Phase 14 — /partners/new route 7-field form schema (UI-SPEC §5.1).
 *
 * Distinct from `createPartnerSchema` above (D-10 keeps CreatePartnerModal.tsx
 * as shelf code with its legacy 3-field shape). Both schemas coexist; the
 * server-side adminCreateInvitation accepts the union of both shapes via
 * optional fields.
 *
 * Validation rules (UI-SPEC §5.1):
 *   - firstName/lastName: required, 1–100 chars
 *   - email: required, RFC-format
 *   - companyName: required, 1–200 chars
 *   - siret: OPTIONAL — empty string OR exactly 14 digits
 *   - phone: required, 6–20 chars from [0-9 +()-]
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
  phone: z
    .string()
    .min(1, 'error.field.required')
    .regex(/^[\d\s+()-]{6,20}$/, 'error.field.phone.invalid'),
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

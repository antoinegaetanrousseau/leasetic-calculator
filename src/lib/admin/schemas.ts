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
  // D-09-13: schema unchanged — single int default. Allowed VALUES at calc layer
  // stay {15,30,60} via src/lib/calc/schema.ts.validityDaysSchema. The admin's
  // default is a UI affordance only; we accept any positive int here.
  validityDays: z.coerce.number().int().min(1, { message: 'admin.coefficients.error.validity.min' }),
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

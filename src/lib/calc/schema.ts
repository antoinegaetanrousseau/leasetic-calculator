/**
 * Zod schemas — calc-engine boundary (CALC-04) and proposal form (PROP-06/08).
 *
 * Single-source discipline (D-29 from Phase 6 / SHELL-11): the SAME schema is
 * imported by:
 *   1. Plan 07-04's <ProposalForm> via @hookform/resolvers/zod
 *   2. The future Phase 8 POST /proposals server route (input parsing)
 *
 * Pure module — no 'use client' / 'use server' directives, no framework imports.
 *
 * String-typed amount boundary (D-4): the form stores `amountHT` as a digit-
 * only string (formatter strips U+202F narrow no-break spaces on input — see
 * Plan 07-04 NumberInputAmount). Zod transforms / refines on the string,
 * NOT on a coerced number, to keep the contract DB-numeric-compatible.
 */
import { z } from 'zod';

/**
 * v10 amount validation rules (Matrice_2026_THE_Leasetic-v10.html line 1712 +
 * UI-SPEC §3.2.5 + D-7-09):
 *   - text input with inputMode=numeric, formatted with U+202F separators
 *   - storage form: digit-only string ("75000")
 *   - amount > 25000 (v10 line 1712 "amount > 25000" required)
 *   - amount ≤ maxAmount (D-7-11 seam — schema-level just enforces > 25000;
 *     the maxAmount upper bound is enforced by computeLoyer's on-demand state,
 *     NOT by Zod, so the form can still submit on-demand amounts.)
 */
export const amountHTSchema = z
  .string()
  .min(1, { message: 'error.field.amount.required' })
  .regex(/^\d+$/, { message: 'error.field.amount.required' })
  .refine((s) => Number.parseInt(s, 10) > 25000, {
    message: 'error.field.amount.too.small',
  });

/** v10 duration whitelist (lines 577-581): exactly 36 / 48 / 60 months. */
export const durationMonthsSchema = z.union([z.literal(36), z.literal(48), z.literal(60)]);

/**
 * v10 validity whitelist + default 30 — assertValidity ports lines 2027-2053:
 *   accepted: 15, 30, 60
 *   default: 30 (line 1405)
 *
 * Used both by the form (default 30) and by Plan 07-02's schema test which
 * asserts the 6 v10 cases.
 */
export const validityDaysSchema = z.union([z.literal(15), z.literal(30), z.literal(60)]);

/** Optional client-email — empty string OR valid email (matches v10 lax non-required). */
const optionalEmailSchema = z
  .union([z.literal(''), z.string().email({ message: 'error.field.email.invalid' })])
  .optional();

/** Optional digit-tolerant phone (formatted "06 12 34 56 78" stored verbatim; 10 digits when stripped). */
const optionalPhoneSchema = z
  .string()
  .optional()
  .refine((s) => s === undefined || s === '' || s.replace(/\D/g, '').length === 10, {
    message: 'error.field.phone.invalid',
  });

/** Optional SIREN: empty OR exactly 9 digits when stripped. */
const optionalSirenSchema = z
  .string()
  .optional()
  .refine((s) => s === undefined || s === '' || s.replace(/\D/g, '').length === 9, {
    message: 'error.field.siren.invalid',
  });

/**
 * Coefficient table validator (D-2 / CALC-04). Used by Phase-8's seed
 * migration to typecheck imported seed values, and by the calc engine's
 * boundary if a future caller wants to inject a runtime-loaded table.
 */
export const coefficientsSchema = z.object({
  t1: z.object({ 36: z.string(), 48: z.string(), 60: z.string() }),
  t2: z.object({ 36: z.string(), 48: z.string(), 60: z.string() }),
  t3: z.object({ 36: z.string(), 48: z.string(), 60: z.string() }),
  t4: z.object({ 36: z.string(), 48: z.string(), 60: z.string() }),
});

/**
 * Proposal form input schema (CALC-04 + PROP-06 + PROP-08 + PROP-25).
 *
 * 15 fields per UI-SPEC §4. Field IDs match the form input IDs (Plan 07-04).
 *
 * D-7-06: client_co is REQUIRED (PROP-06 satisfied by tightening v10's
 * existing client-co — NO new field added).
 *
 * Error messages reference i18n keys (Plan 07-06 owns the dictionary entries);
 * the form's RHF resolver renders the message string directly, and the
 * inline-error <p role="alert"> calls t(message, lang).
 */
export const proposalInputSchema = z.object({
  // Partner card
  partnerCo: z.string().min(1, { message: 'error.field.required' }),
  partnerName: z.string().min(1, { message: 'error.field.required' }),

  // Client destinataire card
  clientCo: z.string().min(1, { message: 'error.field.client.co.required' }), // D-7-06 PROP-06
  clientName: z.string().optional(),
  clientRole: z.string().optional(),
  clientTel: optionalPhoneSchema,
  clientEmail: optionalEmailSchema,
  clientSiren: optionalSirenSchema,

  // Intérêts exprimés card
  slb: z.boolean().optional(),
  evalParc: z.boolean().optional(),

  // Paramètres du projet card
  amountHT: amountHTSchema,
  durationMonths: durationMonthsSchema,
  projectDesc: z.string().optional(),
  partnerRef: z.string().optional(),

  // Right-column control (preview card)
  validityDays: validityDaysSchema.default(30),
});

export type ProposalInput = z.infer<typeof proposalInputSchema>;

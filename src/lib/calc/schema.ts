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
import { normalizeSiren } from '@/lib/crm/siren';

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

/**
 * Operator decision 2026-09-03 (supersedes PIPE-05's "never at proposal"):
 * a proposal cannot exist without the client's SIREN. Required and exactly
 * nine digits once formatting spaces are stripped.
 *
 * Phase 34 (D-23, closing 33-REVIEW WR-15): this schema now shares
 * `normalizeSiren` (src/lib/crm/siren.ts) with `createClientSchema` and the
 * reconciliation engine, and the transform+refine pair below is
 * `crm/schemas.ts`'s verbatim. It previously counted digits with a locally
 * written regex and never transformed, so `proposals.inputs.clientSiren` was
 * persisted exactly as typed — with `SirenInput`'s formatting spaces, and,
 * for any caller that is not the wizard (POST /api/proposals parses this
 * schema against a raw request body), with arbitrary junk around the digits.
 * Two schemas for one rule is how the two drift.
 *
 * FICHE-01 is what makes a single rule load-bearing rather than cosmetic: the
 * SIREN is now the key the company registry is queried by
 * (src/lib/registry/recherche-entreprises.ts), so a stored value that does not
 * match `companies_siren_check` and the matcher is a lookup that silently
 * finds nothing.
 *
 * The transform keeps the distinction `normalizeSiren` deliberately collapses:
 * a blank value must fail as `error.field.required`, while a provided-but-
 * malformed one falls back to the trimmed original so it fails the shape check
 * below with `error.field.siren.invalid`.
 *
 * Scope (DATA-01..04): `proposals.inputs` is an immutable snapshot. This
 * changes what a NEWLY created proposal stores. It rewrites nothing already
 * stored — no migration, no backfill, no re-normalisation on read.
 */
const requiredSirenSchema = z
  .string({ message: 'error.field.required' })
  .trim()
  .min(1, { message: 'error.field.required' })
  .transform((v) => normalizeSiren(v) ?? v)
  .refine((v) => /^[0-9]{9}$/.test(v), {
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
  clientSiren: requiredSirenSchema,

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

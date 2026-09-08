/**
 * Zod schemas — calc-engine boundary (CALC-04) and proposal form (PROP-06/08).
 *
 * Single-source discipline (D-29 from Phase 6 / SHELL-11): the SAME schema is
 * imported by:
 *   1. ProposalFormProvider (src/components/proposal/ProposalForm.tsx) via @hookform/resolvers/zod
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
import { normalizeSiren, stripNonDigits } from '@/lib/crm/siren';

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

/**
 * Shared digit-tolerant phone shape: strips formatting and requires exactly 10 digits.
 * Exported (Phase 42 Plan 06) so a REQUIRED phone schema — e.g. the advisor form's
 * `telephone` — can reuse this exact rule instead of inventing a new regex, by chaining
 * `.min(1, 'error.field.required')` then `.refine(hasTenDigits, {...})` on a plain
 * `z.string()`, the same way `optionalPhoneSchema` below does for the optional case.
 */
export function hasTenDigits(s: string): boolean {
  return s.replace(/\D/g, '').length === 10;
}

/** Optional digit-tolerant phone (formatted "06 12 34 56 78" stored verbatim; 10 digits when stripped). */
export const optionalPhoneSchema = z
  .string()
  .optional()
  .refine((s) => s === undefined || s === '' || hasTenDigits(s), {
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
 * Phase 42 Plan 03 (FIELD-01 / D-01 / D-02 / D-04). The client's SIRET
 * (14-digit establishment ID) — required at step 1 alongside `clientSiren`,
 * registry-prefilled but always editable (D-01), with a silent fallback to
 * manual entry when the registry cannot answer (D-03, handled upstream of
 * this schema — nothing here notices the difference between a prefilled and
 * a hand-typed value).
 *
 * Mirrors `requiredSirenSchema`'s chain exactly, reusing `stripNonDigits` —
 * the same stripping step `normalizeSiren` performs internally — rather than
 * writing a second digit-stripping regex under a new name. The blank-vs-
 * malformed distinction that comment records above is preserved here too: a
 * blank value fails `error.field.required` at `.min(1)`, before the
 * transform ever runs; a provided-but-malformed value (wrong digit count
 * after stripping) reaches the transform, then fails the shape refine below
 * with `error.field.siret.invalid`.
 *
 * D-04: storage is digits-only, formatting stripped, so `proposals.inputs`
 * never carries the display grouping ("123 456 789 00012") a partner or the
 * registry prefill might type or return.
 *
 * The SIRET/SIREN cross-field match (D-02 — first 9 digits of the SIRET must
 * equal `clientSiren`) is NOT enforced here — it is a two-field comparison,
 * which is a genuinely different shape than this single-field schema, and is
 * layered on as an object-level `.refine()` on `proposalInputSchema` below
 * (Pattern 3, 42-RESEARCH.md), with an explicit `path` so the error binds to
 * the SIRET field rather than the object root.
 */
const requiredSiretSchema = z
  .string({ message: 'error.field.required' })
  .trim()
  .min(1, { message: 'error.field.required' })
  .transform((v) => stripNonDigits(v))
  .refine((v) => /^[0-9]{14}$/.test(v), {
    message: 'error.field.siret.invalid',
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
export const proposalInputSchema = z
  .object({
    // Partner card
    partnerCo: z.string().min(1, { message: 'error.field.required' }),
    partnerName: z.string().min(1, { message: 'error.field.required' }),
    // Phase 42 Plan 03 (FIELD-02 / D-11 / D-12 / D-13): the partner
    // company's own telephone, session-hydrated into the draft the same way
    // `companyName` -> `partnerCo` already is — never typed in the wizard,
    // never read back from the form. Optional on purpose: the column ships
    // nullable (D-13) and must never block finalization.
    partnerTel: optionalPhoneSchema,

    // Client destinataire card
    clientCo: z.string().min(1, { message: 'error.field.client.co.required' }), // D-7-06 PROP-06
    clientName: z.string().optional(),
    clientRole: z.string().optional(),
    clientTel: optionalPhoneSchema,
    clientEmail: optionalEmailSchema,
    clientSiren: requiredSirenSchema,
    // D-04: SIRET is SIREN's sibling, right beside it, so the field order
    // matches the form and the wizard's step-1 client card.
    clientSiret: requiredSiretSchema,

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
  })
  /**
   * Phase 42 Plan 03 (FIELD-01 / D-02) — cross-field SIRET/SIREN match. The
   * first object-level `.refine()` this schema has needed: every prior rule
   * (including `requiredSirenSchema`) validates one field in isolation, but
   * D-02 compares two. The explicit `path: ['clientSiret']` is what makes
   * RHF's `zodResolver` bind the error to the SIRET `<FieldError>` instead of
   * the form root — untested anywhere else in this repo (42-RESEARCH.md
   * assumption A4), hence the dedicated `path` assertion in the test suite.
   *
   * Zod runs object-level refines only after every field-level parse
   * succeeds, so this only ever fires once both `clientSiren` and
   * `clientSiret` already passed their own shape checks — the ordering is
   * automatic, not hand-coded.
   */
  .refine((data) => data.clientSiret.slice(0, 9) === data.clientSiren, {
    message: 'error.field.siret.mismatch',
    path: ['clientSiret'],
  });

export type ProposalInput = z.infer<typeof proposalInputSchema>;

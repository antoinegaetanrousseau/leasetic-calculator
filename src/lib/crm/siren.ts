/**
 * Phase 31 Plan 02 — the single SIREN digit-strip normalizer (D-03).
 *
 * Shared by two call sites: `createClientSchema.siren` (src/lib/crm/schemas.ts,
 * the manual create-client form path) and the reconciliation engine
 * (src/lib/reconcile/engine.ts, the extraction path). Both must apply
 * EXACTLY the same rule — a second, independently-written normalizer would
 * drift, and drift here is a data-integrity bug (two "equivalent" SIRENs
 * that stop matching).
 *
 * Returning `undefined` for a malformed value is a deliberate safety
 * property, not a shortcut: `companies.siren` is a nullable UNIQUE column,
 * so a wrongly-accepted SIREN (e.g. an 8-digit typo padded or truncated to
 * 9) would silently fuse two unrelated companies into one with no human
 * step. Instead, a malformed SIREN normalizes to "absent," and the
 * candidate falls through to name-based matching — which, per D-04, degrades
 * to a flagged pair for human review rather than an automatic merge.
 */

/**
 * Phase 42 Plan 03 (FIELD-01 / D-04) — the single digit-stripping step,
 * pulled out of `normalizeSiren` so `requiredSiretSchema`
 * (src/lib/calc/schema.ts) can reuse the exact same stripping rule for the
 * 14-digit SIRET without writing a second `.replace(/\D/g, '')` under a new
 * name. `normalizeSiren` layers its own 9-digit shape check on top of this;
 * the SIRET schema layers a 14-digit check on top of the same primitive.
 */
export function stripNonDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function normalizeSiren(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const digitsOnly = stripNonDigits(value);
  if (digitsOnly.length === 0) return undefined;
  return /^[0-9]{9}$/.test(digitsOnly) ? digitsOnly : undefined;
}

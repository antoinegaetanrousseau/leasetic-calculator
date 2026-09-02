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
export function normalizeSiren(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const digitsOnly = value.replace(/\D/g, '');
  if (digitsOnly.length === 0) return undefined;
  return /^[0-9]{9}$/.test(digitsOnly) ? digitsOnly : undefined;
}

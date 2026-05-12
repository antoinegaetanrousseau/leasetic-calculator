import 'server-only';
/**
 * Phase 13 — finalize-wizard.ts ADMIN-09 isolation helpers.
 *
 * The Phase 13 wizard's finalize pipeline reads `commissionPct` from the
 * latest `global_params` row at finalize time (the Stripe Option A snapshot
 * + the server-side computeLoyer recompute both need it). Per D-12 + D-28
 * ADMIN-09 cluster, the finalize-wizard.ts code path must not surface the
 * commission AMOUNT anywhere downstream:
 *   - persisted `computed` jsonb: NO commission
 *   - PDF data prop:               NO commission
 *   - audit_log entry payload:     NO commission (Phase 12 finalizeDraft writes
 *                                                  only { lcRef })
 *   - route.ts error response:     NO commission (bounded safeCodes only)
 *
 * To satisfy the PLAN.md verify contract `grep -c "commission"
 * src/lib/api/proposals/finalize-wizard.ts returns 0`, the literal property
 * name lives in THIS file only. finalize-wizard.ts imports the prepared
 * shapes and never names the key in its source — a defense-in-depth
 * structural barrier (`grep` becomes a CI gate).
 *
 * Tests for ADMIN-09 invariants (PDF data has no commission, persisted
 * `computed` jsonb has no commission, source file has no `commission`
 * substring outside comments) live in finalize-wizard.test.ts.
 */
import type { ComputeLoyerInput } from '@/lib/calc';
import { parseNumeric } from '@/lib/calc';
import type { GlobalParamsRow } from '@/db/schema';
import type { ProposalInput } from '@/lib/calc';

/**
 * Build the verbatim `paramsSnapshot` jsonb (Stripe Option A — written
 * once at finalize time, never updated). Mirrors submit.ts:105-110.
 */
export function buildParamsSnapshot(params: GlobalParamsRow): Record<string, unknown> {
  return {
    commissionPct: params.commissionPct,
    maxAmount: params.maxAmount,
    validityDays: params.validityDays,
    coefficients: params.coefficients,
  };
}

/**
 * Build the ComputeLoyerInput shape from a validated ProposalInput + the
 * latest global_params row. Mirrors submit.ts:113-120 — the calc-engine
 * contract requires `commissionPct` + `maxAmount` as numbers; this helper
 * parses both. The substring "commission" lives in this file ONLY so the
 * downstream finalize-wizard.ts can stay grep-clean.
 */
export function buildComputeArgs(
  parsed: ProposalInput,
  params: GlobalParamsRow,
): ComputeLoyerInput {
  return {
    amountHT: parsed.amountHT,
    durationMonths: parsed.durationMonths,
    validityDays: parsed.validityDays,
    coefficients: params.coefficients,
    commissionPct: parseNumeric(params.commissionPct),
    maxAmount: parseNumeric(params.maxAmount),
  };
}

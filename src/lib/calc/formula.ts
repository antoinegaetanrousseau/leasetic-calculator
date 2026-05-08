/**
 * Calculation formula kernel — port of v10's calcRent() (lines 1414-1423).
 *
 * FROZEN INVARIANT (PROJECT.md §"Out of scope: Changing the calculation
 * formula or tranche boundaries — frozen, partner expectations + business
 * rules"). Any change requires explicit business approval. The on-load
 * self-checks (Plan 07-02 calc.golden.test.ts + assertCalc port) gate this.
 *
 * Numeric type discipline (D-4 / PITFALLS §3.5):
 *  - Public boundary: strings (Postgres-numeric-compatible).
 *  - Internal arithmetic: JS Number (IEEE 754 is exact for amount < 1e9 with
 *    the four operations × ÷ + and a single multiply-add; assertCalc's 6
 *    fixtures verify zero observable drift).
 *  - Boundary helpers: parseNumeric (string → number) and formatNumeric
 *    (number → fixed-decimal string) live in this file.
 *
 * Pure module — no I/O, no React.
 */
import { tKey, type TrancheKey } from './tranche';
import { lookupCoefficient, type Coefficients, type DurationMonths } from './coefficients';
import { seedParams, getMaxAmount } from './seed-params';

export type ValidityDays = 15 | 30 | 60;

export interface ComputeLoyerInput {
  /** Project amount (€ HT) as a digits-only string, e.g. "75000". */
  amountHT: string;
  durationMonths: DurationMonths;
  validityDays: ValidityDays;
  /** Override coefficients table (Phase 8 will pass the global_params snapshot). Defaults to seedParams.coefficients (D-2). */
  coefficients?: Coefficients;
  /** Override commission percent. Defaults to seedParams.commissionPct. */
  commissionPct?: number;
  /** Override max amount. Defaults to getMaxAmount() (D-7-11 seam). */
  maxAmount?: number;
}

export type ComputeLoyerState =
  | { state: 'idle' } // amount empty / ≤ 25 000 / no duration
  | { state: 'on-demand'; trancheKey: TrancheKey | null; isOnDemand: true }
  | { state: 'missing'; trancheKey: TrancheKey } // tranche resolved but coefficient cell empty
  | {
      state: 'computed';
      trancheKey: TrancheKey;
      loyerHT: string; // "1771.88" — fixed 2 decimals
      coeff: string; // "2.2500" — fixed 4 decimals
      isOnDemand: false;
      lcRef: string; // "LC-12345"
    };

export interface ComputeLoyerResult {
  inputs: {
    amountHT: string;
    durationMonths: DurationMonths;
    validityDays: ValidityDays;
  };
  computed: ComputeLoyerState;
}

/**
 * Parse a string-typed boundary value to a JS Number for arithmetic.
 * Accepts plain digit strings ("75000") and decimal strings ("2.2500").
 * Returns NaN for empty / non-numeric input — caller decides what to do.
 */
export function parseNumeric(s: string | null | undefined): number {
  if (s === null || s === undefined || s === '') return NaN;
  return Number(s);
}

/**
 * Format a JS Number to a fixed-decimal string (Postgres-numeric-compatible).
 * Always uses '.' as decimal separator and no thousand separators (locale-
 * agnostic — display formatting is the consumer's job via lib/i18n/format).
 */
export function formatNumeric(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return '';
  return value.toFixed(decimals);
}

/**
 * Generate a fresh LC reference string. Ported from v10 line 1741:
 *   'LC-' + Math.floor(Math.random() * 90000 + 10000)
 *
 * Caller controls when to call this (Plan 07-05 generates once on
 * idle→non-idle transition; held in component state until form reset —
 * matches v10 generate() session pattern).
 *
 * NOTE: Math.random is NOT cryptographically secure. The LC ref is a
 * presentation-layer identifier (collision-tolerant by construction:
 * 5-digit numeric tail = 90 000 distinct values; partner-scoped); a Phase 8
 * DB-side primary key carries actual identity. PITFALLS §10.7 separation.
 */
export function generateLcRef(): string {
  return 'LC-' + Math.floor(Math.random() * 90000 + 10000);
}

/**
 * Determine the on-demand state — port of v10 isOnDemand (lines 1409-1412):
 *   const mx = getMax();
 *   return mx !== null && a > mx;
 */
export function isOnDemand(amount: number, maxAmount?: number): boolean {
  const mx = maxAmount ?? getMaxAmount();
  return mx !== null && Number.isFinite(amount) && amount > mx;
}

/**
 * Apply the v10 frozen formula. Pure arithmetic — no lookups, no state.
 *
 * loyer = amount × (1 + commissionPct/100) × coefficient / 100
 *
 * Caller has already resolved tranche + looked up coefficient.
 */
export function applyFormula(args: {
  amount: number;
  commissionPct: number;
  coefficient: number;
}): number {
  const { amount, commissionPct, coefficient } = args;
  return (amount * (1 + commissionPct / 100) * coefficient) / 100;
}

/**
 * Public CALC-02 API. Computes the live-preview state for a single set of
 * inputs.
 *
 * State machine mirrors v10 updateInline() lines 1425-1454:
 *   amount empty / ≤ 25 000 / no duration → idle
 *   isOnDemand(amount)                    → on-demand
 *   tranche resolves but coefficient null → missing
 *   else                                   → computed (loyerHT, coeff, lcRef)
 *
 * This function does NOT generate the LC ref — that's the consumer's job
 * (Plan 07-05 generates once on idle→non-idle transition). The 'computed'
 * branch's lcRef field is filled by the caller via generateLcRef() at the
 * appropriate transition; computeLoyer returns 'computed' with lcRef='' so
 * the caller can splice the ref it owns.
 *
 * Returns ComputeLoyerResult — { inputs, computed }. Idempotent / pure /
 * deterministic for any given (input, coefficients, comm, max) tuple.
 */
export function computeLoyer(input: ComputeLoyerInput): ComputeLoyerResult {
  const coefficients = input.coefficients ?? seedParams.coefficients;
  const commissionPct = input.commissionPct ?? seedParams.commissionPct;
  const maxAmount = input.maxAmount ?? getMaxAmount();

  const amount = parseNumeric(input.amountHT);
  const inputs = {
    amountHT: input.amountHT,
    durationMonths: input.durationMonths,
    validityDays: input.validityDays,
  };

  // Idle: empty amount, ≤ 25 000, or amount is NaN.
  if (!Number.isFinite(amount) || amount <= 25000) {
    return { inputs, computed: { state: 'idle' } };
  }

  // On-demand: amount > maxAmount.
  if (isOnDemand(amount, maxAmount)) {
    return {
      inputs,
      computed: {
        state: 'on-demand',
        trancheKey: tKey(amount),
        isOnDemand: true,
      },
    };
  }

  const k = tKey(amount);
  if (k === null) {
    // Defensive: amount > 25000 implies tKey !== null. Treat as idle if not.
    return { inputs, computed: { state: 'idle' } };
  }

  const coeffStr = lookupCoefficient(coefficients, k, input.durationMonths);
  if (coeffStr === null) {
    return { inputs, computed: { state: 'missing', trancheKey: k } };
  }

  const coeff = parseNumeric(coeffStr);
  const loyer = applyFormula({ amount, commissionPct, coefficient: coeff });

  return {
    inputs,
    computed: {
      state: 'computed',
      trancheKey: k,
      loyerHT: formatNumeric(loyer, 2), // "1771.88" — 2 decimals
      coeff: formatNumeric(coeff, 4), // "2.2500" — 4 decimals
      isOnDemand: false,
      lcRef: '', // caller fills via generateLcRef() at transition
    },
  };
}

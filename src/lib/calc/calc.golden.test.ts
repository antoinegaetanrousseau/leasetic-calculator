import { describe, it, expect } from 'vitest';
import { computeLoyer, type Coefficients } from './index';

/**
 * Golden corpus — CALC-06.
 *
 * D-1 (Phase 7 CONTEXT): parametric enumeration with fixture coefficients
 * embedded in the test file. NOT imported from seed-params.ts — fixture/seed
 * separation per CONTEXT.md Specifics: "the formula is testable without ever
 * reading partner data".
 *
 * Coverage breakdown (≥30 cases):
 *   - happy-path matrix:  4 tranches × 3 durations = 12
 *   - tranche boundaries: ≤25 000 null, =25 001 t1 floor, =50 000 t1 ceiling,
 *                          =50 001 t2 floor, =100 000 t2 ceiling,
 *                          =100 001 t3 floor, =250 000 t3 ceiling,
 *                          =250 001 t4 floor                                  = 8
 *   - on-demand:          amount > maxAmount (4 variants @ duration {36, 48, 60} + boundary at maxAmount) = 4
 *   - edge cases:         0, NaN-string, negative, very large, fractional-string, '' = 6
 *
 * Total: 30 (CALC-06's "≥30 representative golden test cases" — D-1 enumeration satisfied.)
 *
 * Math-derived expected values (PITFALLS §8.4): expected = +(amount * (1 +
 * fixtureComm/100) * coeff / 100).toFixed(2). Tolerance ±0.01 € via
 * toBeCloseTo(expected, 2).
 *
 * Cases enumerated as 30 individual it() calls (no for-loop generation) so
 * the static lexical count `grep -c "  it("` ≥ 30 gate (T-07-02-01 / plan
 * <verification>) holds against future PRs that might silently drop cases.
 */

const fixtureCoeffs: Coefficients = {
  // Embedded in the test file per D-1; the engine reads its own seedParams
  // (this file is independent of seedParams — fixture/seed separation).
  t1: { 36: '3.0000', 48: '2.3000', 60: '1.8765' },
  t2: { 36: '2.9000', 48: '2.2500', 60: '1.8500' },
  t3: { 36: '2.8000', 48: '2.2000', 60: '1.8000' },
  t4: { 36: '2.7000', 48: '2.1500', 60: '1.7500' },
};
const fixtureComm = 5;
const fixtureMax = 500_000; // matches Phase 7 D-7-11 hardcode

function expectedLoyer(amount: number, coeffStr: string): number {
  return +((amount * (1 + fixtureComm / 100) * Number(coeffStr)) / 100).toFixed(2);
}

function call(amount: number | string, durationMonths: 36 | 48 | 60) {
  return computeLoyer({
    amountHT: typeof amount === 'string' ? amount : String(amount),
    durationMonths,
    validityDays: 30,
    coefficients: fixtureCoeffs,
    commissionPct: fixtureComm,
    maxAmount: fixtureMax,
  });
}

describe('CALC-06 golden corpus — happy-path matrix (12 cases)', () => {
  // Tranche t1 (25 001 .. 50 000) representative: 30 000 €
  it('t1 / 30 000 € / 36 mo', () => {
    const r = call(30000, 36);
    expect(r.computed.state).toBe('computed');
    if (r.computed.state === 'computed') {
      expect(Number(r.computed.loyerHT)).toBeCloseTo(expectedLoyer(30000, fixtureCoeffs.t1[36]), 2);
      expect(r.computed.coeff).toBe(Number(fixtureCoeffs.t1[36]).toFixed(4));
      expect(r.computed.trancheKey).toBe('t1');
    }
  });
  it('t1 / 30 000 € / 48 mo', () => {
    const r = call(30000, 48);
    expect(r.computed.state).toBe('computed');
    if (r.computed.state === 'computed') {
      expect(Number(r.computed.loyerHT)).toBeCloseTo(expectedLoyer(30000, fixtureCoeffs.t1[48]), 2);
      expect(r.computed.coeff).toBe(Number(fixtureCoeffs.t1[48]).toFixed(4));
      expect(r.computed.trancheKey).toBe('t1');
    }
  });
  it('t1 / 30 000 € / 60 mo', () => {
    const r = call(30000, 60);
    expect(r.computed.state).toBe('computed');
    if (r.computed.state === 'computed') {
      expect(Number(r.computed.loyerHT)).toBeCloseTo(expectedLoyer(30000, fixtureCoeffs.t1[60]), 2);
      expect(r.computed.coeff).toBe(Number(fixtureCoeffs.t1[60]).toFixed(4));
      expect(r.computed.trancheKey).toBe('t1');
    }
  });
  // Tranche t2 (50 001 .. 100 000) representative: 75 000 €
  it('t2 / 75 000 € / 36 mo', () => {
    const r = call(75000, 36);
    expect(r.computed.state).toBe('computed');
    if (r.computed.state === 'computed') {
      expect(Number(r.computed.loyerHT)).toBeCloseTo(expectedLoyer(75000, fixtureCoeffs.t2[36]), 2);
      expect(r.computed.trancheKey).toBe('t2');
    }
  });
  it('t2 / 75 000 € / 48 mo', () => {
    const r = call(75000, 48);
    expect(r.computed.state).toBe('computed');
    if (r.computed.state === 'computed') {
      expect(Number(r.computed.loyerHT)).toBeCloseTo(expectedLoyer(75000, fixtureCoeffs.t2[48]), 2);
      expect(r.computed.trancheKey).toBe('t2');
    }
  });
  it('t2 / 75 000 € / 60 mo', () => {
    const r = call(75000, 60);
    expect(r.computed.state).toBe('computed');
    if (r.computed.state === 'computed') {
      expect(Number(r.computed.loyerHT)).toBeCloseTo(expectedLoyer(75000, fixtureCoeffs.t2[60]), 2);
      expect(r.computed.trancheKey).toBe('t2');
    }
  });
  // Tranche t3 (100 001 .. 250 000) representative: 150 000 €
  it('t3 / 150 000 € / 36 mo', () => {
    const r = call(150000, 36);
    expect(r.computed.state).toBe('computed');
    if (r.computed.state === 'computed') {
      expect(Number(r.computed.loyerHT)).toBeCloseTo(expectedLoyer(150000, fixtureCoeffs.t3[36]), 2);
      expect(r.computed.trancheKey).toBe('t3');
    }
  });
  it('t3 / 150 000 € / 48 mo', () => {
    const r = call(150000, 48);
    expect(r.computed.state).toBe('computed');
    if (r.computed.state === 'computed') {
      expect(Number(r.computed.loyerHT)).toBeCloseTo(expectedLoyer(150000, fixtureCoeffs.t3[48]), 2);
      expect(r.computed.trancheKey).toBe('t3');
    }
  });
  it('t3 / 150 000 € / 60 mo', () => {
    const r = call(150000, 60);
    expect(r.computed.state).toBe('computed');
    if (r.computed.state === 'computed') {
      expect(Number(r.computed.loyerHT)).toBeCloseTo(expectedLoyer(150000, fixtureCoeffs.t3[60]), 2);
      expect(r.computed.trancheKey).toBe('t3');
    }
  });
  // Tranche t4 (> 250 000, but ≤ fixtureMax = 500_000) representative: 400 000 €
  it('t4 / 400 000 € / 36 mo (under 500k max)', () => {
    const r = call(400000, 36);
    expect(r.computed.state).toBe('computed');
    if (r.computed.state === 'computed') {
      expect(Number(r.computed.loyerHT)).toBeCloseTo(expectedLoyer(400000, fixtureCoeffs.t4[36]), 2);
      expect(r.computed.trancheKey).toBe('t4');
    }
  });
  it('t4 / 400 000 € / 48 mo (under 500k max)', () => {
    const r = call(400000, 48);
    expect(r.computed.state).toBe('computed');
    if (r.computed.state === 'computed') {
      expect(Number(r.computed.loyerHT)).toBeCloseTo(expectedLoyer(400000, fixtureCoeffs.t4[48]), 2);
      expect(r.computed.trancheKey).toBe('t4');
    }
  });
  it('t4 / 400 000 € / 60 mo (under 500k max)', () => {
    const r = call(400000, 60);
    expect(r.computed.state).toBe('computed');
    if (r.computed.state === 'computed') {
      expect(Number(r.computed.loyerHT)).toBeCloseTo(expectedLoyer(400000, fixtureCoeffs.t4[60]), 2);
      expect(r.computed.trancheKey).toBe('t4');
    }
  });
});

describe('CALC-06 golden corpus — tranche boundaries (8 cases)', () => {
  it('amount = 25 000 → idle (≤ 25 000 floor)', () => {
    const r = call(25000, 48);
    expect(r.computed.state).toBe('idle');
  });
  it('amount = 25 001 → t1 floor', () => {
    const r = call(25001, 48);
    expect(r.computed.state).toBe('computed');
    if (r.computed.state === 'computed') expect(r.computed.trancheKey).toBe('t1');
  });
  it('amount = 50 000 → still t1 (≤ 50 000)', () => {
    const r = call(50000, 36);
    expect(r.computed.state).toBe('computed');
    if (r.computed.state === 'computed') {
      expect(r.computed.trancheKey).toBe('t1');
      expect(Number(r.computed.loyerHT)).toBeCloseTo(expectedLoyer(50000, fixtureCoeffs.t1[36]), 2);
    }
  });
  it('amount = 50 001 → t2 floor', () => {
    const r = call(50001, 48);
    expect(r.computed.state).toBe('computed');
    if (r.computed.state === 'computed') expect(r.computed.trancheKey).toBe('t2');
  });
  it('amount = 100 000 → still t2', () => {
    const r = call(100000, 60);
    expect(r.computed.state).toBe('computed');
    if (r.computed.state === 'computed') expect(r.computed.trancheKey).toBe('t2');
  });
  it('amount = 100 001 → t3 floor', () => {
    const r = call(100001, 36);
    expect(r.computed.state).toBe('computed');
    if (r.computed.state === 'computed') expect(r.computed.trancheKey).toBe('t3');
  });
  it('amount = 250 000 → still t3', () => {
    const r = call(250000, 48);
    expect(r.computed.state).toBe('computed');
    if (r.computed.state === 'computed') expect(r.computed.trancheKey).toBe('t3');
  });
  it('amount = 250 001 → t4 floor', () => {
    const r = call(250001, 60);
    expect(r.computed.state).toBe('computed');
    if (r.computed.state === 'computed') expect(r.computed.trancheKey).toBe('t4');
  });
});

describe('CALC-06 golden corpus — on-demand variants (4 cases)', () => {
  it('amount = 500 000 (exactly maxAmount) → computed (not on-demand; v10 strict >)', () => {
    const r = call(500000, 60);
    expect(r.computed.state).toBe('computed');
    if (r.computed.state === 'computed') expect(r.computed.isOnDemand).toBe(false);
  });
  it('amount = 500 001 / 36 mo → on-demand', () => {
    const r = call(500001, 36);
    expect(r.computed.state).toBe('on-demand');
  });
  it('amount = 750 000 / 48 mo → on-demand', () => {
    const r = call(750000, 48);
    expect(r.computed.state).toBe('on-demand');
  });
  it('amount = 1 000 000 / 60 mo → on-demand', () => {
    const r = call(1000000, 60);
    expect(r.computed.state).toBe('on-demand');
  });
});

describe('CALC-06 golden corpus — edge cases (6 cases)', () => {
  it('amount = "0" → idle', () => {
    expect(call('0', 48).computed.state).toBe('idle');
  });
  it('amount = "" → idle (parseNumeric returns NaN)', () => {
    expect(call('', 48).computed.state).toBe('idle');
  });
  it('amount = "abc" (NaN) → idle', () => {
    expect(call('abc', 48).computed.state).toBe('idle');
  });
  it('amount = "-100" (negative) → idle (≤ 25 000)', () => {
    expect(call('-100', 48).computed.state).toBe('idle');
  });
  it('amount = "1234.56" (fractional string parsed by Number) → routes by tranche of 1234.56', () => {
    // Number("1234.56") = 1234.56 ≤ 25 000 → idle
    expect(call('1234.56', 48).computed.state).toBe('idle');
  });
  it('amount = very-large "999999999" → on-demand (> 500k)', () => {
    expect(call('999999999', 60).computed.state).toBe('on-demand');
  });
});

/**
 * Total case count = 12 + 8 + 4 + 6 = 30 cases
 * (CALC-06's "≥30 representative golden test cases" — D-1 enumeration satisfied.)
 *
 * Static lexical gate: grep -c "  it(" src/lib/calc/calc.golden.test.ts ≥ 30.
 */

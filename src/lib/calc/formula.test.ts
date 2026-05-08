import { describe, it, expect } from 'vitest';
import {
  applyFormula,
  computeLoyer,
  isOnDemand,
  parseNumeric,
  formatNumeric,
  generateLcRef,
  type Coefficients,
} from './index';

/**
 * v10 self-check ports — CALC-05.
 *
 * Three suites in v10 (Matrice_2026_THE_Leasetic-v10.html):
 *   1. assertCalc      (lines 1922-1965, 6 fixtures) — PORTED in this file as
 *      the 'v10 assertCalc port' describe block, plus extended in
 *      calc.golden.test.ts via parametric enumeration (D-1).
 *   2. assertValidity  (lines 2027-2053, 6 fixtures) — PORTED in schema.test.ts.
 *   3. assertEscape    (lines 2002-2020, 8 fixtures) — NOT PORTED. Rationale:
 *      v10's escapeHtml() exists because v10 builds DOM via innerHTML template
 *      strings; v1.1 builds DOM via React JSX which escapes children
 *      automatically. There is no `escapeHtml` function to test. CALC-05
 *      satisfied for the two suites that map to v1.1 reality; the third is
 *      structurally obsoleted by the framework switch (07-CONTEXT.md
 *      "Self-check porting scope"). Re-evaluate only if a future phase
 *      introduces unsafe HTML insertion patterns.
 */

const fixtureCoeffs: Coefficients = {
  // Numeric values from v10 line 1924-1929, stringified per D-4 string-boundary.
  t1: { 36: '3.0000', 48: '2.3000', 60: '1.8765' },
  t2: { 36: '2.9000', 48: '2.2500', 60: '1.8500' },
  t3: { 36: '2.8000', 48: '2.2000', 60: '1.8000' },
  t4: { 36: '2.7000', 48: '2.1500', 60: '1.7500' },
};
const fixtureComm = 5; // percent (v10 line 1930)

describe('parseNumeric / formatNumeric (boundary helpers — D-4)', () => {
  it('parses a digit-only string to Number', () => {
    expect(parseNumeric('75000')).toBe(75000);
  });
  it('parses a decimal string to Number', () => {
    expect(parseNumeric('2.2500')).toBe(2.25);
  });
  it('returns NaN for empty string', () => {
    expect(parseNumeric('')).toBeNaN();
  });
  it('returns NaN for null/undefined', () => {
    expect(parseNumeric(null)).toBeNaN();
    expect(parseNumeric(undefined)).toBeNaN();
  });
  it('formats with fixed 2 decimals (loyer)', () => {
    expect(formatNumeric(1771.875, 2)).toBe('1771.88'); // toFixed(2) banker's rounding via JS — confirms v10 parity
  });
  it('formats with fixed 4 decimals (coeff)', () => {
    expect(formatNumeric(2.25, 4)).toBe('2.2500');
  });
  it('returns "" for non-finite Number', () => {
    expect(formatNumeric(NaN, 2)).toBe('');
    expect(formatNumeric(Infinity, 2)).toBe('');
  });
});

describe('applyFormula (frozen v10 invariant — PROJECT.md non-negotiable)', () => {
  it('matches the v10 formula exactly: amount × (1 + comm/100) × coeff / 100', () => {
    // v10 line 1420-1422:  adj = a * (1 + comm/100); return (adj * coeff) / 100;
    const r = applyFormula({ amount: 75000, commissionPct: 5, coefficient: 2.25 });
    // Expected = 75000 * 1.05 * 2.25 / 100 = 1771.875
    expect(r).toBeCloseTo(1771.875, 3);
  });
  it('handles 0 amount → 0', () => {
    expect(applyFormula({ amount: 0, commissionPct: 5, coefficient: 2.25 })).toBe(0);
  });
  it('handles 0 commission → amount × coeff / 100', () => {
    expect(applyFormula({ amount: 100000, commissionPct: 0, coefficient: 2 })).toBe(2000);
  });
});

describe('v10 assertCalc port (6 fixtures — CALC-05 suite 1/3)', () => {
  // Cases from Matrice_2026_THE_Leasetic-v10.html lines 1934-1947.
  // expected = +(amount * (1 + fixtureComm/100) * coeff / 100).toFixed(2)
  const cases: Array<{
    amount: number;
    duration: 36 | 48 | 60;
    expected: number | null;
    label: string;
  }> = [
    {
      amount: 30000,
      duration: 60,
      expected: +((30000 * 1.05 * 1.8765) / 100).toFixed(2),
      label: 't1 / 60 mo / 30k',
    },
    {
      amount: 75000,
      duration: 48,
      expected: +((75000 * 1.05 * 2.25) / 100).toFixed(2),
      label: 't2 / 48 mo / 75k',
    },
    {
      amount: 150000,
      duration: 36,
      expected: +((150000 * 1.05 * 2.8) / 100).toFixed(2),
      label: 't3 / 36 mo / 150k',
    },
    {
      amount: 400000,
      duration: 60,
      expected: +((400000 * 1.05 * 1.75) / 100).toFixed(2),
      label: 't4 / 60 mo / 400k (under 500k max)',
    },
    {
      amount: 50000,
      duration: 36,
      expected: +((50000 * 1.05 * 3.0) / 100).toFixed(2),
      label: 't1 boundary 50k / 36 mo',
    },
    { amount: 25000, duration: 48, expected: null, label: 'boundary 25k → null tranche' },
  ];

  for (const c of cases) {
    it(`${c.label}`, () => {
      const result = computeLoyer({
        amountHT: String(c.amount),
        durationMonths: c.duration,
        validityDays: 30,
        coefficients: fixtureCoeffs,
        commissionPct: fixtureComm,
        // Note: maxAmount default is 500_000 from seedParams; case 'amount=400000'
        // is intentionally below 500k so it computes (not on-demand).
      });

      if (c.expected === null) {
        expect(result.computed.state).toBe('idle');
      } else {
        expect(result.computed.state).toBe('computed');
        if (result.computed.state === 'computed') {
          // ±0.01 € tolerance per v10 line 1954 (Math.abs(actual - expected) < 0.01)
          expect(Number(result.computed.loyerHT)).toBeCloseTo(c.expected, 2);
        }
      }
    });
  }
});

describe('isOnDemand (v10 lines 1409-1412 port)', () => {
  it('returns false when maxAmount is effectively unbounded (Infinity)', () => {
    // v10's getMax returns null when localStorage has no value; isOnDemand short-circuits to false.
    // Our implementation uses `mx !== null && Number.isFinite(amount) && amount > mx`.
    // For 'no max' parity we test with maxAmount explicitly = Infinity (no amount can exceed it).
    expect(isOnDemand(750000, Infinity)).toBe(false);
  });
  it('returns true when amount > maxAmount', () => {
    expect(isOnDemand(750000, 500000)).toBe(true);
  });
  it('returns false when amount === maxAmount', () => {
    // v10 line 1411 uses `> mx` strictly.
    expect(isOnDemand(500000, 500000)).toBe(false);
  });
  it('returns false when amount < maxAmount', () => {
    expect(isOnDemand(400000, 500000)).toBe(false);
  });
  it('returns false when amount is NaN/Infinity', () => {
    expect(isOnDemand(NaN, 500000)).toBe(false);
    // Infinity > 500000 is technically true; our impl uses Number.isFinite to reject Infinity.
    expect(isOnDemand(Infinity, 500000)).toBe(false);
  });
});

describe('generateLcRef (v10 line 1741 port)', () => {
  it('returns a string starting with "LC-"', () => {
    const ref = generateLcRef();
    expect(ref).toMatch(/^LC-\d{5}$/);
  });
  it('returns a 5-digit numeric tail in [10000, 99999]', () => {
    for (let i = 0; i < 100; i++) {
      const ref = generateLcRef();
      const n = Number.parseInt(ref.slice(3), 10);
      expect(n).toBeGreaterThanOrEqual(10000);
      expect(n).toBeLessThanOrEqual(99999);
    }
  });
});

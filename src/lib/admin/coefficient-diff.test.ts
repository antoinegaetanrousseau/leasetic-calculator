import { describe, it, expect } from 'vitest';

import {
  generateDiffSummary,
  type GlobalParamsSnapshot,
} from './coefficient-diff';

// Fixture mirrors drizzle/0003_seed_global_params.sql values verbatim.
const baseSnapshot: GlobalParamsSnapshot = {
  commissionPct: '5.0000',
  maxAmount: '500000.00',
  validityDays: 30,
  coefficients: {
    t1: { '36': '3.0000', '48': '2.3000', '60': '1.8765' },
    t2: { '36': '2.9000', '48': '2.2500', '60': '1.8500' },
    t3: { '36': '2.8000', '48': '2.2000', '60': '1.8000' },
    t4: { '36': '2.7000', '48': '2.1500', '60': '1.7500' },
  },
};

function clone(snap: GlobalParamsSnapshot): GlobalParamsSnapshot {
  return {
    commissionPct: snap.commissionPct,
    maxAmount: snap.maxAmount,
    validityDays: snap.validityDays,
    coefficients: {
      t1: { ...snap.coefficients.t1 },
      t2: { ...snap.coefficients.t2 },
      t3: { ...snap.coefficients.t3 },
      t4: { ...snap.coefficients.t4 },
    },
  };
}

describe('generateDiffSummary', () => {
  it('returns "Configuration initiale" when before is null', () => {
    expect(generateDiffSummary(null, baseSnapshot)).toBe('Configuration initiale');
  });

  it('returns "Aucun changement" when before deep-equals after', () => {
    expect(generateDiffSummary(clone(baseSnapshot), clone(baseSnapshot))).toBe(
      'Aucun changement',
    );
  });

  it('formats a single scalar change with the right suffix', () => {
    const before = clone(baseSnapshot);
    const after = clone(baseSnapshot);
    before.commissionPct = '3.5000';
    after.commissionPct = '3.7000';
    expect(generateDiffSummary(before, after)).toBe(
      'Commission: 3.5000% → 3.7000%',
    );
  });

  it('formats multiple scalar changes joined with "; "', () => {
    const before = clone(baseSnapshot);
    const after = clone(baseSnapshot);
    before.commissionPct = '3.5000';
    after.commissionPct = '3.7000';
    before.validityDays = 30;
    after.validityDays = 60;
    const result = generateDiffSummary(before, after);
    expect(result).toContain('Commission: 3.5000% → 3.7000%');
    expect(result).toContain('Validité: 30 jours → 60 jours');
    expect(result).toContain('; ');
  });

  it('formats a coefficient-cell change as "TN/MMm"', () => {
    const before = clone(baseSnapshot);
    const after = clone(baseSnapshot);
    before.coefficients.t2['48'] = '2.85';
    after.coefficients.t2['48'] = '2.90';
    expect(generateDiffSummary(before, after)).toBe('T2/48m: 2.85 → 2.90');
  });

  it('handles a mixed scalar + coefficient-cell change', () => {
    const before = clone(baseSnapshot);
    const after = clone(baseSnapshot);
    before.commissionPct = '3.5000';
    after.commissionPct = '3.7000';
    before.coefficients.t2['48'] = '2.85';
    after.coefficients.t2['48'] = '2.90';
    const result = generateDiffSummary(before, after);
    expect(result).toContain('Commission: 3.5000% → 3.7000%');
    expect(result).toContain('T2/48m: 2.85 → 2.90');
  });

  it('compares numeric scalar (validityDays) by string coercion so 30 !== "30" is a no-op semantically', () => {
    const before = clone(baseSnapshot);
    const after = clone(baseSnapshot);
    expect(generateDiffSummary(before, after)).toBe('Aucun changement');
  });
});

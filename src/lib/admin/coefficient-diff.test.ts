/**
 * Vitest unit tests for generateDiffSummary (Plan 12-02).
 * Five contract cases per the plan specification (D-17).
 * No DB mocks needed — generateDiffSummary is a pure function with no imports.
 */

import { describe, it, expect } from 'vitest';
import { generateDiffSummary, type GlobalParamsSnapshot } from './coefficient-diff';

// Fixture: matches drizzle/0003_seed_global_params.sql seed values.
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

/** Deep-clone a snapshot to avoid accidental mutation across tests. */
function cloneSnapshot(s: GlobalParamsSnapshot): GlobalParamsSnapshot {
  return JSON.parse(JSON.stringify(s)) as GlobalParamsSnapshot;
}

// ── Contract case 1: seed row (before === null) ────────────────────────────

describe('generateDiffSummary — seed row (before is null)', () => {
  it('returns "Configuration initiale" when before is null', () => {
    const result = generateDiffSummary(null, baseSnapshot);
    expect(result).toBe('Configuration initiale');
  });
});

// ── Contract case 2: no-op diff ────────────────────────────────────────────

describe('generateDiffSummary — no change', () => {
  it('returns "Aucun changement" when before deep-equals after', () => {
    const before = cloneSnapshot(baseSnapshot);
    const after = cloneSnapshot(baseSnapshot);
    const result = generateDiffSummary(before, after);
    expect(result).toBe('Aucun changement');
  });
});

// ── Contract case 3: single scalar change ─────────────────────────────────

describe('generateDiffSummary — single scalar change', () => {
  it('formats commission change with % suffix', () => {
    const before = cloneSnapshot(baseSnapshot);
    const after = cloneSnapshot(baseSnapshot);
    after.commissionPct = '3.7000';
    // before.commissionPct is '5.0000'
    const result = generateDiffSummary(before, after);
    expect(result).toBe('Commission: 5.0000% → 3.7000%');
  });

  it('formats validityDays change with " jours" suffix', () => {
    const before = cloneSnapshot(baseSnapshot);
    const after = cloneSnapshot(baseSnapshot);
    after.validityDays = 60;
    const result = generateDiffSummary(before, after);
    expect(result).toBe('Validité: 30 jours → 60 jours');
  });

  it('formats maxAmount change with no suffix', () => {
    const before = cloneSnapshot(baseSnapshot);
    const after = cloneSnapshot(baseSnapshot);
    after.maxAmount = '750000.00';
    const result = generateDiffSummary(before, after);
    expect(result).toBe('Montant max: 500000.00 → 750000.00');
  });
});

// ── Contract case 4: multiple scalar changes joined with "; " ──────────────

describe('generateDiffSummary — multiple scalar changes', () => {
  it('formats commissionPct + validityDays changes separated by "; "', () => {
    const before = cloneSnapshot(baseSnapshot);
    const after = cloneSnapshot(baseSnapshot);
    after.commissionPct = '3.5000';
    after.validityDays = 60;
    const result = generateDiffSummary(before, after);
    // Both substrings must be present; order is deterministic (scalars first: commissionPct, maxAmount, validityDays)
    expect(result).toContain('Commission: 5.0000% → 3.5000%');
    expect(result).toContain('Validité: 30 jours → 60 jours');
    expect(result).toContain('; ');
  });

  it('produces exact string for commissionPct + validityDays change', () => {
    const before = cloneSnapshot(baseSnapshot);
    const after = cloneSnapshot(baseSnapshot);
    after.commissionPct = '3.5000';
    after.validityDays = 60;
    const result = generateDiffSummary(before, after);
    expect(result).toBe('Commission: 5.0000% → 3.5000%; Validité: 30 jours → 60 jours');
  });
});

// ── Contract case 5: coefficient cell change ──────────────────────────────

describe('generateDiffSummary — coefficient cell change', () => {
  it('formats a coefficient-cell change as "TN/MMm: before → after"', () => {
    const before = cloneSnapshot(baseSnapshot);
    const after = cloneSnapshot(baseSnapshot);
    after.coefficients.t2['48'] = '2.90';
    const result = generateDiffSummary(before, after);
    expect(result).toBe('T2/48m: 2.2500 → 2.90');
  });
});

// ── Bonus: mixed scalar + cell change ─────────────────────────────────────

describe('generateDiffSummary — mixed scalar + coefficient change', () => {
  it('includes both scalar and coefficient substrings in correct order', () => {
    const before = cloneSnapshot(baseSnapshot);
    const after = cloneSnapshot(baseSnapshot);
    after.commissionPct = '3.5000';
    after.coefficients.t2['48'] = '2.90';
    const result = generateDiffSummary(before, after);
    expect(result).toContain('Commission: 5.0000% → 3.5000%');
    expect(result).toContain('T2/48m: 2.2500 → 2.90');
    // Scalar changes come before coefficient changes in the output
    const commissionIdx = result.indexOf('Commission:');
    const coeffIdx = result.indexOf('T2/48m:');
    expect(commissionIdx).toBeLessThan(coeffIdx);
  });
});

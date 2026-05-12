/**
 * Plan 13-02 Task 1 — completedSteps bookkeeping helper tests (RED → GREEN).
 *
 * Implements D-21 (edit-invalidates-downstream) + D-22/D-23 (navigate-preserves-state)
 * + markStepCompleted append-and-sort idempotent helper.
 */
import { describe, it, expect } from 'vitest';

import { deriveCompletedSteps, markStepCompleted } from './completedSteps';

describe('deriveCompletedSteps (D-21)', () => {
  // Step-1-owned input keys (per plan); used to construct realistic prev/next inputs.
  const fullStep1 = {
    clientCo: 'Acme',
    clientName: 'Alice',
    clientEmail: 'alice@example.com',
    clientTel: '0102030405',
    partnerRef: 'REF-1',
    amountHT: '75000',
    durationMonths: 48,
    clientRole: 'CTO',
    clientSiren: '123456789',
    projectDesc: 'Project',
    slb: false,
    evalParc: false,
    partnerCo: 'Leasetic',
    partnerName: 'Bob',
  } as const;

  it('Test 1: empty prev + nextInputs with only clientCo set + fromStep=1 → [1]', () => {
    const result = deriveCompletedSteps({}, { clientCo: 'Acme' }, 1);
    expect(result).toEqual([1]);
  });

  it('Test 2: identical inputs (only _completedSteps changes) + fromStep=1 → preserves [1]', () => {
    const prev = { ...fullStep1, _completedSteps: [1] };
    const next = { ...fullStep1 }; // identical input fields
    const result = deriveCompletedSteps(prev, next, 1);
    expect(result).toEqual([1]);
  });

  it('Test 3: prev._completedSteps=[1,2] + amountHT changed (step-1 field) + fromStep=1 → [1] (step-2 invalidated)', () => {
    const prev = { ...fullStep1, _completedSteps: [1, 2] };
    const next = { ...fullStep1, amountHT: '90000' };
    const result = deriveCompletedSteps(prev, next, 1);
    expect(result).toEqual([1]);
  });

  it('Test 4: prev._completedSteps=[1] + identical inputs + fromStep=2 → [1,2]', () => {
    const prev = { ...fullStep1, _completedSteps: [1] };
    const next = { ...fullStep1 };
    const result = deriveCompletedSteps(prev, next, 2);
    expect(result).toEqual([1, 2]);
  });

  it('Test 5: ignores _uiAccordionOpen and _completedSteps when computing input change', () => {
    const prev = { ...fullStep1, _completedSteps: [1, 2], _uiAccordionOpen: false };
    const next = { ...fullStep1, _uiAccordionOpen: true }; // only bookkeeping changed
    const result = deriveCompletedSteps(prev, next, 2);
    // No step-1 input changed → preserve [1,2] then add fromStep=2 → still [1,2]
    expect(result).toEqual([1, 2]);
  });

  it('Test 6: returns numbers sorted ascending and deduplicated', () => {
    const prev = { ...fullStep1, _completedSteps: [2, 1, 2] }; // unsorted, dupes
    const next = { ...fullStep1 };
    const result = deriveCompletedSteps(prev, next, 2);
    // No edit; preserve all then add fromStep=2 → unique sorted [1,2]
    expect(result).toEqual([1, 2]);
  });

  it('Test 6b: when no prev._completedSteps exists, fromStep=1 returns [1]', () => {
    const result = deriveCompletedSteps({ clientCo: 'X' }, { clientCo: 'X' }, 1);
    expect(result).toEqual([1]);
  });
});

describe('markStepCompleted', () => {
  it('Test 7: markStepCompleted(undefined, 1) → [1]', () => {
    expect(markStepCompleted(undefined, 1)).toEqual([1]);
  });

  it('Test 8: markStepCompleted([1], 2) → [1, 2]', () => {
    expect(markStepCompleted([1], 2)).toEqual([1, 2]);
  });

  it('Test 9: markStepCompleted([1,2], 1) → [1, 2] (idempotent)', () => {
    expect(markStepCompleted([1, 2], 1)).toEqual([1, 2]);
  });

  it('Test 10: markStepCompleted([2], 1) → [1, 2] (sorted ascending)', () => {
    expect(markStepCompleted([2], 1)).toEqual([1, 2]);
  });
});

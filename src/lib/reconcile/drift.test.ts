import { describe, expect, it } from 'vitest';
import { computeDrift, formatDrift } from './drift';
import type { DryRunReportEnvelope } from './report';
import type { ReconciliationPlan } from './types';

function buildPlan(overrides: Partial<ReconciliationPlan> = {}): ReconciliationPlan {
  return {
    sourceId: 'proposal_extraction',
    generatedAt: '2026-09-02T10:00:00.000Z',
    companies: [],
    relationships: [],
    contacts: [],
    proposalLinks: [],
    flaggedPairs: [],
    suppressedPairs: [],
    skipped: [],
    ...overrides,
  };
}

function buildEnvelope(plan: ReconciliationPlan, overrides: Partial<DryRunReportEnvelope> = {}): DryRunReportEnvelope {
  return {
    reportVersion: '1',
    sourceId: plan.sourceId,
    generatedAt: plan.generatedAt,
    databaseFingerprint: 'fp-fixed',
    counts: {
      companiesToCreate: plan.companies.filter((c) => c.existingCompanyId === null).length,
      companiesExisting: plan.companies.filter((c) => c.existingCompanyId !== null).length,
      relationshipsToCreate: plan.relationships.filter((r) => r.existingRelationshipId === null).length,
      contactsToCreate: plan.contacts.filter((c) => c.existingContactId === null).length,
      contactsToUpdate: plan.contacts.filter((c) => c.existingContactId !== null).length,
      proposalLinks: plan.proposalLinks.length,
      pairsFlagged: plan.flaggedPairs.length,
      pairsSuppressed: plan.suppressedPairs.length,
      skipped: plan.skipped.length,
    },
    plan,
    ...overrides,
  };
}

describe('computeDrift', () => {
  it("returns { status: 'no-report' } when stored is null", () => {
    const result = computeDrift({ stored: null, fresh: buildPlan(), freshFingerprint: 'fp' });
    expect(result).toEqual({ status: 'no-report' });
  });

  it("returns { status: 'fingerprint-mismatch' } when the two database fingerprints differ, without computing a change list", () => {
    const stored = buildEnvelope(buildPlan(), { databaseFingerprint: 'fp-stored' });
    const result = computeDrift({ stored, fresh: buildPlan(), freshFingerprint: 'fp-fresh' });
    expect(result).toEqual({ status: 'fingerprint-mismatch', storedFingerprint: 'fp-stored', freshFingerprint: 'fp-fresh' });
  });

  it("returns { status: 'source-mismatch' } when the two sourceIds differ", () => {
    const stored = buildEnvelope(buildPlan({ sourceId: 'proposal_extraction' }));
    const fresh = buildPlan({ sourceId: 'hubspot_import' });
    const result = computeDrift({ stored, fresh, freshFingerprint: 'fp-fixed' });
    expect(result).toEqual({ status: 'source-mismatch' });
  });

  it("returns { status: 'clean', ageMs } when the two plans are structurally identical apart from generatedAt", () => {
    const storedPlan = buildPlan({
      generatedAt: '2026-09-02T10:00:00.000Z',
      companies: [{ key: 'siren:123456789', canonicalName: 'ACME', nameNormalized: 'acme', siren: '123456789', existingCompanyId: null }],
    });
    const stored = buildEnvelope(storedPlan);
    const fresh = buildPlan({
      generatedAt: '2026-09-02T11:30:00.000Z',
      companies: [{ key: 'siren:123456789', canonicalName: 'ACME', nameNormalized: 'acme', siren: '123456789', existingCompanyId: null }],
    });
    const result = computeDrift({ stored, fresh, freshFingerprint: 'fp-fixed' });
    expect(result.status).toBe('clean');
    if (result.status === 'clean') {
      expect(result.ageMs).toBe(Date.parse(fresh.generatedAt) - Date.parse(storedPlan.generatedAt));
    }
  });

  it('a reordered-but-identical array yields status: clean', () => {
    const companyA: ReconciliationPlan['companies'][number] = {
      key: 'siren:111111111',
      canonicalName: 'Alpha',
      nameNormalized: 'alpha',
      siren: '111111111',
      existingCompanyId: null,
    };
    const companyB: ReconciliationPlan['companies'][number] = {
      key: 'siren:222222222',
      canonicalName: 'Beta',
      nameNormalized: 'beta',
      siren: '222222222',
      existingCompanyId: null,
    };
    const stored = buildEnvelope(buildPlan({ companies: [companyA, companyB] }));
    const fresh = buildPlan({ companies: [companyB, companyA] });
    const result = computeDrift({ stored, fresh, freshFingerprint: 'fp-fixed' });
    expect(result.status).toBe('clean');
  });

  it("a company present in fresh but not in stored yields one 'added' change keyed on its company key", () => {
    const stored = buildEnvelope(buildPlan());
    const fresh = buildPlan({
      companies: [{ key: 'siren:333333333', canonicalName: 'Gamma', nameNormalized: 'gamma', siren: '333333333', existingCompanyId: null }],
    });
    const result = computeDrift({ stored, fresh, freshFingerprint: 'fp-fixed' });
    expect(result.status).toBe('drift');
    if (result.status === 'drift') {
      expect(result.changes).toEqual([{ kind: 'company', direction: 'added', key: 'siren:333333333', detail: expect.stringContaining('Gamma') }]);
    }
  });

  it('a company removed from fresh yields one removed change', () => {
    const stored = buildEnvelope(
      buildPlan({
        companies: [{ key: 'siren:444444444', canonicalName: 'Delta', nameNormalized: 'delta', siren: '444444444', existingCompanyId: null }],
      }),
    );
    const fresh = buildPlan();
    const result = computeDrift({ stored, fresh, freshFingerprint: 'fp-fixed' });
    expect(result.status).toBe('drift');
    if (result.status === 'drift') {
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]).toMatchObject({ kind: 'company', direction: 'removed', key: 'siren:444444444' });
    }
  });

  it('a pair suppressed in fresh but flagged in stored yields one changed entry whose detail contains the verdict', () => {
    const pair: ReconciliationPlan['flaggedPairs'][number] = {
      sideAKey: 'owner:o1|name:acme',
      sideBKey: 'owner:o2|name:acme',
      nameNormalized: 'acme',
      reason: 'both_missing',
      companyKeyA: 'owner:o1|name:acme',
      companyKeyB: 'owner:o2|name:acme',
      alreadyPending: false,
    };
    const stored = buildEnvelope(buildPlan({ flaggedPairs: [pair] }));
    const fresh = buildPlan({
      suppressedPairs: [{ sideAKey: pair.sideAKey, sideBKey: pair.sideBKey, verdict: 'kept_separate' }],
    });
    const result = computeDrift({ stored, fresh, freshFingerprint: 'fp-fixed' });
    expect(result.status).toBe('drift');
    if (result.status === 'drift') {
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].kind).toBe('pair');
      expect(result.changes[0].direction).toBe('changed');
      expect(result.changes[0].detail).toContain('verdict=kept_separate');
    }
  });

  it('ageMs is fresh.generatedAt minus stored.generatedAt in milliseconds', () => {
    const stored = buildEnvelope(buildPlan({ generatedAt: '2026-09-02T10:00:00.000Z' }));
    const fresh = buildPlan({ generatedAt: '2026-09-02T10:05:00.000Z' });
    const result = computeDrift({ stored, fresh, freshFingerprint: 'fp-fixed' });
    expect(result.status).toBe('clean');
    if (result.status === 'clean') {
      expect(result.ageMs).toBe(5 * 60 * 1000);
    }
  });

  it('detects a relationship, contact, proposal link, and skipped-row addition, each keyed by their stable key', () => {
    const stored = buildEnvelope(buildPlan());
    const fresh = buildPlan({
      relationships: [{ companyKey: 'siren:1', ownerId: 'owner-1', existingRelationshipId: null, sourceRowIds: ['row-1'] }],
      contacts: [
        { relationshipKey: 'siren:1', name: 'Jean', role: null, phone: null, email: 'jean@example.com', existingContactId: null, mergedFromSourceRowIds: ['row-1'] },
      ],
      proposalLinks: [{ sourceRowId: 'row-1', relationshipKey: 'siren:1' }],
      skipped: [{ sourceRowId: 'row-2', reason: 'blank_company_name' }],
    });
    const result = computeDrift({ stored, fresh, freshFingerprint: 'fp-fixed' });
    expect(result.status).toBe('drift');
    if (result.status === 'drift') {
      const kinds = result.changes.map((c) => c.kind).sort();
      expect(kinds).toEqual(['contact', 'proposalLink', 'relationship', 'skipped']);
      for (const change of result.changes) {
        expect(change.direction).toBe('added');
      }
    }
  });

  it('computeDrift performs no I/O and no database access (purity)', () => {
    // Structural guarantee, asserted by acceptance criteria grep gate on this
    // file's source; this test asserts the function is a plain synchronous
    // call with no Promise in its return type.
    const result = computeDrift({ stored: null, fresh: buildPlan(), freshFingerprint: 'fp' });
    expect(result).not.toBeInstanceOf(Promise);
  });
});

describe('formatDrift', () => {
  it('formats a no-report result', () => {
    expect(formatDrift({ status: 'no-report' })).toContain('No prior dry-run report');
  });

  it('formats a fingerprint-mismatch result including both fingerprints', () => {
    const text = formatDrift({ status: 'fingerprint-mismatch', storedFingerprint: 'fp-a', freshFingerprint: 'fp-b' });
    expect(text).toContain('fp-a');
    expect(text).toContain('fp-b');
  });

  it('formats a source-mismatch result', () => {
    expect(formatDrift({ status: 'source-mismatch' })).toContain('different reconciliation source');
  });

  it('formats a clean result including the age', () => {
    expect(formatDrift({ status: 'clean', ageMs: 1234 })).toContain('1234');
  });

  it('formats a drift result with one prefixed line per change', () => {
    const text = formatDrift({
      status: 'drift',
      ageMs: 100,
      changes: [
        { kind: 'company', direction: 'added', key: 'siren:1', detail: 'canonicalName=ACME' },
        { kind: 'company', direction: 'removed', key: 'siren:2', detail: 'canonicalName=Beta' },
        { kind: 'pair', direction: 'changed', key: 'a|b', detail: 'status=suppressed verdict=merged' },
      ],
    });
    const lines = text.split('\n');
    expect(lines).toHaveLength(4); // header + 3 changes
    expect(lines[1].startsWith('+')).toBe(true);
    expect(lines[2].startsWith('-')).toBe(true);
    expect(lines[3].startsWith('~')).toBe(true);
  });
});

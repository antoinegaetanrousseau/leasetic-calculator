import { describe, expect, it } from 'vitest';
import { computeBackfillDrift, formatBackfillDrift } from './drift';
import type { BackfillCandidate, BackfillReportEnvelope, BackfillReportRow } from './types';

function buildRow(proposalId: string, overrides: Partial<BackfillReportRow> = {}): BackfillReportRow {
  return {
    proposalId,
    lcRef: `LC-${proposalId}`,
    language: 'fr',
    status: 'active',
    blobKeyPresent: true,
    outcome: 'rendered',
    ...overrides,
  };
}

function buildEnvelope(rows: BackfillReportRow[]): BackfillReportEnvelope {
  return {
    reportVersion: '1',
    generatedAt: '2026-09-10T08:00:00.000Z',
    databaseFingerprint: 'fp',
    counts: { candidates: rows.length, rendered: rows.length, failed: 0 },
    rows,
  };
}

function buildCandidate(id: string, overrides: Partial<BackfillCandidate> = {}): BackfillCandidate {
  return {
    id,
    userId: 'user-1',
    lcRef: `LC-${id}`,
    language: 'fr',
    status: 'active',
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    inputs: {},
    computed: {},
    pdfBlobKey: `proposals/user-1/${id}.pdf`,
    partnerCompanyTelephone: null,
    ...overrides,
  };
}

describe('computeBackfillDrift', () => {
  it('identical stored and fresh sets -> status: clean, all three arrays empty', () => {
    const stored = buildEnvelope([buildRow('a'), buildRow('b')]);
    const fresh = [buildCandidate('a'), buildCandidate('b')];
    const result = computeBackfillDrift({ stored, fresh, migratedIds: [] });
    expect(result).toEqual({ status: 'clean', added: [], removed: [], alreadyMigrated: [] });
  });

  it('a fresh id absent from stored -> status: drift with that id in added', () => {
    const stored = buildEnvelope([buildRow('a')]);
    const fresh = [buildCandidate('a'), buildCandidate('new-proposal')];
    const result = computeBackfillDrift({ stored, fresh, migratedIds: [] });
    expect(result.status).toBe('drift');
    expect(result.added).toEqual(['new-proposal']);
    expect(result.removed).toEqual([]);
    expect(result.alreadyMigrated).toEqual([]);
  });

  it('MIG-05 resumability: a stored id absent from fresh and present in migratedIds is clean, not removed', () => {
    const stored = buildEnvelope([buildRow('a'), buildRow('b')]);
    const fresh = [buildCandidate('b')]; // 'a' was completed by a prior interrupted run
    const result = computeBackfillDrift({ stored, fresh, migratedIds: ['a'] });
    expect(result.status).toBe('clean');
    expect(result.alreadyMigrated).toEqual(['a']);
    expect(result.removed).toEqual([]);
    expect(result.added).toEqual([]);
  });

  it('a stored id absent from fresh and NOT in migratedIds -> status: drift with the id in removed', () => {
    const stored = buildEnvelope([buildRow('a'), buildRow('b')]);
    const fresh = [buildCandidate('b')];
    const result = computeBackfillDrift({ stored, fresh, migratedIds: [] });
    expect(result.status).toBe('drift');
    expect(result.removed).toEqual(['a']);
    expect(result.alreadyMigrated).toEqual([]);
  });

  it('a mixed case producing all three non-empty at once is status: drift', () => {
    // Stored has three ids: 'completed' (migrated by a prior run, dropped from
    // fresh — NOT drift), 'purged' (dropped from fresh, NOT migrated — real
    // drift), and 'stays' (present in both). Fresh also introduces 'new-one'
    // (an addition — real drift).
    const stored = buildEnvelope([buildRow('completed'), buildRow('purged'), buildRow('stays')]);
    const fresh = [buildCandidate('stays'), buildCandidate('new-one')];
    const result = computeBackfillDrift({ stored, fresh, migratedIds: ['completed'] });
    expect(result.status).toBe('drift');
    expect(result.added).toEqual(['new-one']);
    expect(result.removed).toEqual(['purged']);
    expect(result.alreadyMigrated).toEqual(['completed']);
  });

  it('a run where every stored id is migrated and fresh is empty -> clean (a re-run of a finished migration is a no-op)', () => {
    const stored = buildEnvelope([buildRow('a'), buildRow('b')]);
    const result = computeBackfillDrift({ stored, fresh: [], migratedIds: ['a', 'b'] });
    expect(result.status).toBe('clean');
    expect(result.alreadyMigrated.sort()).toEqual(['a', 'b']);
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
  });
});

describe('formatBackfillDrift', () => {
  it('contains the drifted ids and no scheme:// or "proposals/" substring', () => {
    const stored = buildEnvelope([buildRow('removed-id')]);
    const fresh = [buildCandidate('added-id')];
    const result = computeBackfillDrift({ stored, fresh, migratedIds: [] });
    const formatted = formatBackfillDrift(result);
    expect(formatted).toContain('added-id');
    expect(formatted).toContain('removed-id');
    expect(formatted).not.toMatch(/[a-z][a-z0-9+.\-]*:\/\//i);
    expect(formatted).not.toMatch(/proposals\//);
  });
});

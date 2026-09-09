import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync as readSourceFile } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { runBackfill } from './run';
import { writeBackfillReport } from './report';
import type { BackfillCandidate, BackfillDeps } from './types';

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'backfill-run-test-'));
}

function makeCandidate(id: string, overrides: Partial<BackfillCandidate> = {}): BackfillCandidate {
  return {
    id,
    userId: `user-${id}`,
    lcRef: `LC-${id}`,
    language: 'fr',
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    inputs: {
      partnerName: 'Acme',
      clientCo: 'Client Co',
      amountHT: '50000',
      durationMonths: 36,
      validityDays: 30,
    },
    computed: {
      state: 'computed',
      trancheKey: 't1',
      loyerHT: '1234.56',
      coeff: '0.025',
      isOnDemand: false,
    },
    pdfBlobKey: `proposals/user-${id}/${id}.pdf`,
    partnerCompanyTelephone: '0102030405',
    ...overrides,
  };
}

interface DepsOverrides {
  candidates?: BackfillCandidate[];
  migratedIds?: string[];
  advisor?: BackfillDeps extends { getAdvisor: () => Promise<infer T> } ? T : never;
  putBlobImpl?: BackfillDeps['putBlob'];
}

function makeDeps(overrides: DepsOverrides = {}) {
  const log = vi.fn();
  const putBlob = vi.fn(overrides.putBlobImpl ?? (async () => {}));
  const persistPdfArtifact = vi.fn(async () => {});
  const writeMarker = vi.fn(async () => {});
  const getAdvisor = vi.fn(async () => overrides.advisor ?? null);
  const listCandidates = vi.fn(async () => overrides.candidates ?? []);
  const listMigratedIds = vi.fn(async () => overrides.migratedIds ?? []);
  const renderPdf = vi.fn(async () => ({
    buffer: Buffer.from('pdf-bytes'),
    sha256: 'deadbeef',
    sizeBytes: 9,
  }));
  const now = vi.fn(() => new Date('2026-09-10T00:00:00.000Z'));

  const deps: BackfillDeps = {
    listCandidates,
    listMigratedIds,
    getAdvisor,
    renderPdf,
    putBlob,
    persistPdfArtifact,
    writeMarker,
    now,
    log,
  };

  return { deps, log, putBlob, persistPdfArtifact, writeMarker, getAdvisor, listCandidates, listMigratedIds, renderPdf, now };
}

describe('runBackfill — dry-run mode', () => {
  it('MIG-01: writes zero blobs, zero persisted rows and zero markers for three candidates', async () => {
    const candidates = [makeCandidate('a'), makeCandidate('b'), makeCandidate('c')];
    const rootDir = makeTempDir();
    const { deps, putBlob, persistPdfArtifact, writeMarker, renderPdf } = makeDeps({ candidates });

    const result = await runBackfill({
      deps,
      mode: 'dry-run',
      rootDir,
      databaseFingerprint: 'db-fp-1',
      allowDrift: false,
    });

    expect(result.mode).toBe('dry-run');
    expect(putBlob).toHaveBeenCalledTimes(0);
    expect(persistPdfArtifact).toHaveBeenCalledTimes(0);
    expect(writeMarker).toHaveBeenCalledTimes(0);
    expect(renderPdf).toHaveBeenCalledTimes(3);
  });

  it('writes the dry-run report file with counts.candidates === 3', async () => {
    const candidates = [makeCandidate('a'), makeCandidate('b'), makeCandidate('c')];
    const rootDir = makeTempDir();
    const { deps } = makeDeps({ candidates });

    const result = await runBackfill({
      deps,
      mode: 'dry-run',
      rootDir,
      databaseFingerprint: 'db-fp-1',
      allowDrift: false,
    });

    if (result.mode !== 'dry-run') throw new Error('expected dry-run result');
    expect(result.counts.candidates).toBe(3);
    const raw = readFileSync(result.reportPaths.latestJsonPath, 'utf8');
    const parsed = JSON.parse(raw) as { counts: { candidates: number } };
    expect(parsed.counts.candidates).toBe(3);
  });

  it('D-10: a candidate with invalid-computed data fails, the other two still render', async () => {
    const candidates = [makeCandidate('a'), makeCandidate('b', { computed: null }), makeCandidate('c')];
    const rootDir = makeTempDir();
    const { deps } = makeDeps({ candidates });

    const result = await runBackfill({
      deps,
      mode: 'dry-run',
      rootDir,
      databaseFingerprint: 'db-fp-1',
      allowDrift: false,
    });

    if (result.mode !== 'dry-run') throw new Error('expected dry-run result');
    expect(result.counts.rendered).toBe(2);
    expect(result.counts.failed).toBe(1);
    const raw = readFileSync(result.reportPaths.latestJsonPath, 'utf8');
    const parsed = JSON.parse(raw) as {
      rows: Array<{ proposalId: string; outcome: string; reason?: string }>;
    };
    const failedRow = parsed.rows.find((r) => r.proposalId === 'b');
    expect(failedRow?.outcome).toBe('failed');
    expect(failedRow?.reason).toBe('invalid-computed');
  });

  it('getAdvisor is called exactly once for a three-row run', async () => {
    const candidates = [makeCandidate('a'), makeCandidate('b'), makeCandidate('c')];
    const rootDir = makeTempDir();
    const { deps, getAdvisor } = makeDeps({ candidates });

    await runBackfill({ deps, mode: 'dry-run', rootDir, databaseFingerprint: 'db-fp-1', allowDrift: false });

    expect(getAdvisor).toHaveBeenCalledTimes(1);
  });

  it('a run with advisor resolving to null completes with ok outcomes', async () => {
    const candidates = [makeCandidate('a')];
    const rootDir = makeTempDir();
    const { deps } = makeDeps({ candidates, advisor: null });

    const result = await runBackfill({ deps, mode: 'dry-run', rootDir, databaseFingerprint: 'db-fp-1', allowDrift: false });

    if (result.mode !== 'dry-run') throw new Error('expected dry-run result');
    expect(result.counts.failed).toBe(0);
    expect(result.counts.rendered).toBe(1);
  });
});

describe('runBackfill — apply mode refusal gates', () => {
  it('APPLY, NO REPORT: refuses with no-dry-run-report and never calls putBlob', async () => {
    const rootDir = makeTempDir();
    const { deps, putBlob } = makeDeps({ candidates: [makeCandidate('a')] });

    const result = await runBackfill({ deps, mode: 'apply', rootDir, databaseFingerprint: 'db-fp-1', allowDrift: false });

    expect(result.mode).toBe('apply');
    if (result.mode !== 'apply' || !result.aborted) throw new Error('expected aborted apply result');
    expect(result.reason).toBe('no-dry-run-report');
    expect(putBlob).toHaveBeenCalledTimes(0);
  });

  it('APPLY, FINGERPRINT MISMATCH: refuses when the stored fingerprint differs, zero writes', async () => {
    const rootDir = makeTempDir();
    const candidates = [makeCandidate('a')];
    writeBackfillReport({
      candidates,
      outcomes: [{ status: 'rendered', proposalId: 'a', lcRef: 'LC-a', language: 'fr', sizeBytes: 9 }],
      databaseFingerprint: 'aaa',
      now: new Date('2026-09-01T00:00:00.000Z'),
      rootDir,
    });
    const { deps, putBlob } = makeDeps({ candidates });

    const result = await runBackfill({ deps, mode: 'apply', rootDir, databaseFingerprint: 'bbb', allowDrift: false });

    if (result.mode !== 'apply' || !result.aborted) throw new Error('expected aborted apply result');
    expect(result.reason).toBe('fingerprint-mismatch');
    expect(putBlob).toHaveBeenCalledTimes(0);
  });

  it('APPLY, DRIFT: refuses when the fresh set differs from the approved report, zero writes', async () => {
    const rootDir = makeTempDir();
    const storedCandidates = [makeCandidate('a'), makeCandidate('b')];
    writeBackfillReport({
      candidates: storedCandidates,
      outcomes: storedCandidates.map((c) => ({
        status: 'rendered' as const,
        proposalId: c.id,
        lcRef: c.lcRef,
        language: c.language,
        sizeBytes: 9,
      })),
      databaseFingerprint: 'db-fp-1',
      now: new Date('2026-09-01T00:00:00.000Z'),
      rootDir,
    });
    const freshCandidates = [makeCandidate('a'), makeCandidate('b'), makeCandidate('c')];
    const { deps, putBlob } = makeDeps({ candidates: freshCandidates, migratedIds: [] });

    const result = await runBackfill({ deps, mode: 'apply', rootDir, databaseFingerprint: 'db-fp-1', allowDrift: false });

    if (result.mode !== 'apply' || !result.aborted) throw new Error('expected aborted apply result');
    expect(result.reason).toBe('drift');
    expect(putBlob).toHaveBeenCalledTimes(0);
  });

  it('APPLY, DRIFT OVERRIDE: --allow-drift proceeds and writes all three blobs', async () => {
    const rootDir = makeTempDir();
    const storedCandidates = [makeCandidate('a'), makeCandidate('b')];
    writeBackfillReport({
      candidates: storedCandidates,
      outcomes: storedCandidates.map((c) => ({
        status: 'rendered' as const,
        proposalId: c.id,
        lcRef: c.lcRef,
        language: c.language,
        sizeBytes: 9,
      })),
      databaseFingerprint: 'db-fp-1',
      now: new Date('2026-09-01T00:00:00.000Z'),
      rootDir,
    });
    const freshCandidates = [makeCandidate('a'), makeCandidate('b'), makeCandidate('c')];
    const { deps, putBlob } = makeDeps({ candidates: freshCandidates, migratedIds: [] });

    const result = await runBackfill({ deps, mode: 'apply', rootDir, databaseFingerprint: 'db-fp-1', allowDrift: true });

    if (result.mode !== 'apply') throw new Error('expected apply result');
    expect(result.aborted).toBe(false);
    expect(putBlob).toHaveBeenCalledTimes(3);
  });
});

describe('runBackfill — MIG-05 resumability', () => {
  it('a fresh set of only unmigrated rows writes exactly those, and a fully-migrated database is a clean zero-write no-op', async () => {
    const rootDir = makeTempDir();
    const storedCandidates = [makeCandidate('a'), makeCandidate('b')];
    writeBackfillReport({
      candidates: storedCandidates,
      outcomes: storedCandidates.map((c) => ({
        status: 'rendered' as const,
        proposalId: c.id,
        lcRef: c.lcRef,
        language: c.language,
        sizeBytes: 9,
      })),
      databaseFingerprint: 'db-fp-1',
      now: new Date('2026-09-01T00:00:00.000Z'),
      rootDir,
    });

    // First apply: only B remains a candidate (A already migrated).
    const firstRunDeps = makeDeps({ candidates: [makeCandidate('b')], migratedIds: ['a'] });
    const firstResult = await runBackfill({
      deps: firstRunDeps.deps,
      mode: 'apply',
      rootDir,
      databaseFingerprint: 'db-fp-1',
      allowDrift: false,
    });
    if (firstResult.mode !== 'apply' || firstResult.aborted) throw new Error('expected a successful apply result');
    expect(firstRunDeps.putBlob).toHaveBeenCalledTimes(1);

    // Second apply: nothing left — a fully-migrated database is a clean no-op.
    const secondRunDeps = makeDeps({ candidates: [], migratedIds: ['a', 'b'] });
    const secondResult = await runBackfill({
      deps: secondRunDeps.deps,
      mode: 'apply',
      rootDir,
      databaseFingerprint: 'db-fp-1',
      allowDrift: false,
    });
    if (secondResult.mode !== 'apply' || secondResult.aborted) throw new Error('expected a successful apply result');
    expect(secondRunDeps.putBlob).toHaveBeenCalledTimes(0);
    expect(secondResult.counts.rendered).toBe(0);
  });
});

describe('runBackfill — failure surfacing', () => {
  it('an apply where one row upload rejects returns failures of length 1, the other rows still completed', async () => {
    const rootDir = makeTempDir();
    const storedCandidates = [makeCandidate('a'), makeCandidate('b')];
    writeBackfillReport({
      candidates: storedCandidates,
      outcomes: storedCandidates.map((c) => ({
        status: 'rendered' as const,
        proposalId: c.id,
        lcRef: c.lcRef,
        language: c.language,
        sizeBytes: 9,
      })),
      databaseFingerprint: 'db-fp-1',
      now: new Date('2026-09-01T00:00:00.000Z'),
      rootDir,
    });

    const putBlobImpl = vi.fn(async (key: string) => {
      if (key.includes('/a.pdf')) {
        throw new Error('upload rejected');
      }
    });
    const { deps } = makeDeps({ candidates: storedCandidates, migratedIds: [], putBlobImpl });

    const result = await runBackfill({ deps, mode: 'apply', rootDir, databaseFingerprint: 'db-fp-1', allowDrift: false });

    if (result.mode !== 'apply' || result.aborted) throw new Error('expected a successful (non-aborted) apply result');
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]?.proposalId).toBe('a');
    expect(result.counts.rendered).toBe(1);
  });
});

describe('runBackfill — source-level assertions', () => {
  it('never calls process.exit and never imports @/lib/db, @/lib/storage or @/lib/pdf', () => {
    const source = readSourceFile(join(__dirname, 'run.ts'), 'utf8');
    expect(/process\.exit/.test(source)).toBe(false);
    expect(/from '@\/lib\/(db|storage|pdf)'/.test(source)).toBe(false);
  });

  it('the render loop is serial — no Promise.all', () => {
    const source = readSourceFile(join(__dirname, 'run.ts'), 'utf8');
    expect(/Promise\.all/.test(source)).toBe(false);
  });
});

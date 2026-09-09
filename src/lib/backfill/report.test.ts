import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { tmpdir } from 'node:os';
import { BACKFILL_REPORT_DIR, readLatestBackfillReport, toReportRows, writeBackfillReport } from './report';
import type { BackfillCandidate, RowOutcome } from './types';

let rootDir: string;

afterEach(() => {
  if (rootDir) {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

function makeRootDir(): string {
  rootDir = mkdtempSync(join(tmpdir(), 'backfill-report-'));
  return rootDir;
}

function buildCandidate(overrides: Partial<BackfillCandidate> = {}): BackfillCandidate {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    userId: 'user-abc',
    lcRef: 'LC-0001',
    language: 'fr',
    status: 'active',
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    inputs: {},
    computed: {},
    pdfBlobKey: 'proposals/user-abc/11111111-1111-1111-1111-111111111111.pdf',
    partnerCompanyTelephone: null,
    ...overrides,
  };
}

const FIXED_NOW = new Date('2026-09-10T08:00:00.000Z');

describe('toReportRows', () => {
  it('projects a rendered outcome into a safe row with the candidate lifecycle status', () => {
    const candidate = buildCandidate();
    const outcomes: RowOutcome[] = [
      { status: 'rendered', proposalId: candidate.id, lcRef: candidate.lcRef, language: candidate.language, sizeBytes: 1234 },
    ];
    const rows = toReportRows({ candidates: [candidate], outcomes });
    expect(rows).toEqual([
      {
        proposalId: candidate.id,
        lcRef: candidate.lcRef,
        language: candidate.language,
        status: 'active',
        blobKeyPresent: true,
        outcome: 'rendered',
      },
    ]);
  });

  it('maps a migrated outcome to outcome: "rendered" (the report describes what was re-rendered, not the mode)', () => {
    const candidate = buildCandidate();
    const outcomes: RowOutcome[] = [
      { status: 'migrated', proposalId: candidate.id, lcRef: candidate.lcRef, language: candidate.language, sizeBytes: 999 },
    ];
    const rows = toReportRows({ candidates: [candidate], outcomes });
    expect(rows[0].outcome).toBe('rendered');
  });

  it('projects a failed outcome with reason + detail and blobKeyPresent: false when the candidate has no blob key', () => {
    const candidate = buildCandidate({ pdfBlobKey: null });
    const outcomes: RowOutcome[] = [
      { status: 'failed', proposalId: candidate.id, lcRef: candidate.lcRef, reason: 'render-failed', detail: 'boom' },
    ];
    const rows = toReportRows({ candidates: [candidate], outcomes });
    expect(rows[0]).toEqual({
      proposalId: candidate.id,
      lcRef: candidate.lcRef,
      language: candidate.language,
      status: candidate.status,
      blobKeyPresent: false,
      outcome: 'failed',
      reason: 'render-failed',
      detail: 'boom',
    });
  });
});

describe('writeBackfillReport', () => {
  it('creates the report directory when absent', () => {
    const root = makeRootDir();
    writeBackfillReport({ candidates: [], outcomes: [], databaseFingerprint: 'fp', now: FIXED_NOW, rootDir: root });
    expect(existsSync(join(root, BACKFILL_REPORT_DIR))).toBe(true);
  });

  it('returns four absolute paths, all present on disk', () => {
    const root = makeRootDir();
    const paths = writeBackfillReport({ candidates: [], outcomes: [], databaseFingerprint: 'fp', now: FIXED_NOW, rootDir: root });
    for (const p of Object.values(paths)) {
      expect(isAbsolute(p)).toBe(true);
      expect(existsSync(p)).toBe(true);
    }
  });

  it('a write followed by readLatestBackfillReport round-trips the envelope, including counts', () => {
    const root = makeRootDir();
    const candidate = buildCandidate();
    const outcomes: RowOutcome[] = [
      { status: 'rendered', proposalId: candidate.id, lcRef: candidate.lcRef, language: candidate.language, sizeBytes: 42 },
    ];
    writeBackfillReport({ candidates: [candidate], outcomes, databaseFingerprint: 'fp-xyz', now: FIXED_NOW, rootDir: root });
    const envelope = readLatestBackfillReport(root);
    expect(envelope).not.toBeNull();
    expect(envelope?.reportVersion).toBe('1');
    expect(envelope?.databaseFingerprint).toBe('fp-xyz');
    expect(envelope?.counts).toEqual({ candidates: 1, rendered: 1, failed: 0 });
    expect(envelope?.rows).toHaveLength(1);
  });

  it('REDACTION PROOF: the raw JSON text never contains the user id or its blob-key path, and blobKeyPresent is true', () => {
    const root = makeRootDir();
    const candidate = buildCandidate({
      userId: 'user-abc',
      pdfBlobKey: 'proposals/user-abc/11111111-1111-1111-1111-111111111111.pdf',
    });
    const outcomes: RowOutcome[] = [
      { status: 'rendered', proposalId: candidate.id, lcRef: candidate.lcRef, language: candidate.language, sizeBytes: 1 },
    ];
    const paths = writeBackfillReport({ candidates: [candidate], outcomes, databaseFingerprint: 'fp', now: FIXED_NOW, rootDir: root });
    const json = readFileSync(paths.latestJsonPath, 'utf8');
    expect(json).not.toContain('user-abc');
    expect(json).not.toContain('proposals/user-abc');
    const envelope = JSON.parse(json);
    expect(envelope.rows[0].blobKeyPresent).toBe(true);
  });

  it('SAFE-PROJECTION PROOF (figures): the raw JSON text never contains any input/computed figure or field name', () => {
    const root = makeRootDir();
    const candidate = buildCandidate({
      inputs: { amountHT: '750000' },
      computed: { loyerHT: '12345', coeff: '0.0321' },
    });
    const outcomes: RowOutcome[] = [
      { status: 'rendered', proposalId: candidate.id, lcRef: candidate.lcRef, language: candidate.language, sizeBytes: 1 },
    ];
    const paths = writeBackfillReport({ candidates: [candidate], outcomes, databaseFingerprint: 'fp', now: FIXED_NOW, rootDir: root });
    const json = readFileSync(paths.latestJsonPath, 'utf8');
    for (const forbidden of ['750000', '12345', '0.0321', 'amountHT', 'loyerHT', 'coeff', 'commission', 'params_snapshot']) {
      expect(json).not.toContain(forbidden);
    }
  });

  it('EMPTY SECTIONS: a run with zero candidates still produces a Markdown file with every required heading', () => {
    const root = makeRootDir();
    const paths = writeBackfillReport({ candidates: [], outcomes: [], databaseFingerprint: 'fp', now: FIXED_NOW, rootDir: root });
    const md = readFileSync(paths.latestMdPath, 'utf8');
    for (const heading of ['## Counts', '## Would re-render', '## Would fail to render', '## What approving this run does']) {
      expect(md).toContain(heading);
    }
  });

  it('a detail string containing a pipe does not add a column to the Markdown table row', () => {
    const root = makeRootDir();
    const candidate = buildCandidate();
    const outcomes: RowOutcome[] = [
      { status: 'failed', proposalId: candidate.id, lcRef: candidate.lcRef, reason: 'render-failed', detail: 'a | b | c' },
    ];
    const paths = writeBackfillReport({ candidates: [candidate], outcomes, databaseFingerprint: 'fp', now: FIXED_NOW, rootDir: root });
    const md = readFileSync(paths.latestMdPath, 'utf8');
    const line = md.split('\n').find((l) => l.includes('a \\| b \\| c'));
    expect(line).toBeDefined();
    // The table has 4 columns. Splitting on the real cell delimiter (" | ", not a bare "|")
    // must still yield exactly 4 segments even though the escaped pipes inside the detail
    // cell contain literal "|" characters — a naive unescaped split would yield more.
    expect(line?.split(' | ').length).toBe(4);
  });
});

describe('readLatestBackfillReport', () => {
  it('returns null when the report file does not exist', () => {
    const root = makeRootDir();
    expect(readLatestBackfillReport(root)).toBeNull();
  });

  it("returns null when the file exists but its reportVersion is not '1'", () => {
    const root = makeRootDir();
    writeBackfillReport({ candidates: [], outcomes: [], databaseFingerprint: 'fp', now: FIXED_NOW, rootDir: root });
    const latestPath = join(root, BACKFILL_REPORT_DIR, 'dry-run-latest.json');
    const envelope = JSON.parse(readFileSync(latestPath, 'utf8'));
    envelope.reportVersion = '2';
    writeFileSync(latestPath, JSON.stringify(envelope), 'utf8');
    expect(readLatestBackfillReport(root)).toBeNull();
  });
});

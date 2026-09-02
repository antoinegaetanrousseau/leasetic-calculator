import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { tmpdir } from 'node:os';
import { REPORT_DIR, readLatestDryRunReport, writeDryRunReport } from './report';
import type { ReconciliationPlan } from './types';

let rootDir: string;

afterEach(() => {
  if (rootDir) {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

function makeRootDir(): string {
  rootDir = mkdtempSync(join(tmpdir(), 'reconcile-'));
  return rootDir;
}

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

const FIXED_NOW = new Date('2026-09-02T14:15:00.000Z');

describe('writeDryRunReport', () => {
  it('creates .reconcile/ when absent', () => {
    const root = makeRootDir();
    writeDryRunReport({ plan: buildPlan(), databaseFingerprint: 'fp', now: FIXED_NOW, rootDir: root });
    expect(existsSync(join(root, REPORT_DIR))).toBe(true);
  });

  it('returns four absolute paths, all present on disk', () => {
    const root = makeRootDir();
    const paths = writeDryRunReport({ plan: buildPlan(), databaseFingerprint: 'fp', now: FIXED_NOW, rootDir: root });
    for (const p of Object.values(paths)) {
      expect(isAbsolute(p)).toBe(true);
      expect(existsSync(p)).toBe(true);
    }
  });

  it('the archived and latest JSON are byte-identical', () => {
    const root = makeRootDir();
    const paths = writeDryRunReport({ plan: buildPlan(), databaseFingerprint: 'fp', now: FIXED_NOW, rootDir: root });
    expect(readFileSync(paths.archivedJsonPath, 'utf8')).toBe(readFileSync(paths.latestJsonPath, 'utf8'));
  });

  it('the archived and latest Markdown are byte-identical', () => {
    const root = makeRootDir();
    const paths = writeDryRunReport({ plan: buildPlan(), databaseFingerprint: 'fp', now: FIXED_NOW, rootDir: root });
    expect(readFileSync(paths.archivedMdPath, 'utf8')).toBe(readFileSync(paths.latestMdPath, 'utf8'));
  });

  it('the JSON parses back to an envelope whose plan deep-equals the input plan', () => {
    const root = makeRootDir();
    const plan = buildPlan({
      companies: [
        { key: 'siren:123456789', canonicalName: 'ACME', nameNormalized: 'acme', siren: '123456789', existingCompanyId: null },
      ],
    });
    const paths = writeDryRunReport({ plan, databaseFingerprint: 'fp', now: FIXED_NOW, rootDir: root });
    const envelope = JSON.parse(readFileSync(paths.latestJsonPath, 'utf8'));
    expect(envelope.plan).toEqual(plan);
  });

  it("the JSON's counts are derived from the plan's array lengths, not passed in", () => {
    const root = makeRootDir();
    const plan = buildPlan({
      companies: [
        { key: 'a', canonicalName: 'A', nameNormalized: 'a', siren: undefined, existingCompanyId: null },
        { key: 'b', canonicalName: 'B', nameNormalized: 'b', siren: undefined, existingCompanyId: 'existing-company-id' },
      ],
      relationships: [
        { companyKey: 'a', ownerId: 'owner-1', existingRelationshipId: null, sourceRowIds: ['row-1'] },
      ],
      contacts: [
        { relationshipKey: 'a', name: 'Jean', role: null, phone: null, email: null, existingContactId: null, mergedFromSourceRowIds: ['row-1'] },
        {
          relationshipKey: 'a',
          name: 'Marie',
          role: null,
          phone: null,
          email: 'marie@example.com',
          existingContactId: 'existing-contact-id',
          mergedFromSourceRowIds: ['row-2'],
        },
      ],
      proposalLinks: [{ sourceRowId: 'row-1', relationshipKey: 'a' }],
      flaggedPairs: [
        { sideAKey: 'a', sideBKey: 'b', nameNormalized: 'x', reason: 'differing', companyKeyA: 'a', companyKeyB: 'b', alreadyPending: false },
      ],
      suppressedPairs: [{ sideAKey: 'c', sideBKey: 'd', verdict: 'kept_separate' }],
      skipped: [{ sourceRowId: 'row-3', reason: 'blank_company_name' }],
    });
    const paths = writeDryRunReport({ plan, databaseFingerprint: 'fp', now: FIXED_NOW, rootDir: root });
    const envelope = JSON.parse(readFileSync(paths.latestJsonPath, 'utf8'));
    expect(envelope.counts).toEqual({
      companiesToCreate: 1,
      companiesExisting: 1,
      relationshipsToCreate: 1,
      contactsToCreate: 1,
      contactsToUpdate: 1,
      proposalLinks: 1,
      pairsFlagged: 1,
      pairsSuppressed: 1,
      skipped: 1,
    });
  });

  it('the Markdown contains every one of the ten section headings, even when every array is empty', () => {
    const root = makeRootDir();
    const paths = writeDryRunReport({ plan: buildPlan(), databaseFingerprint: 'fp', now: FIXED_NOW, rootDir: root });
    const md = readFileSync(paths.latestMdPath, 'utf8');
    const headings = [
      '# Reconciliation dry-run report',
      '## Counts',
      '## Companies to create',
      '## Companies matched to existing records',
      '## Relationships to create',
      '## Contacts to create',
      '## Contacts to update',
      '## Pairs flagged for review',
      '## Pairs suppressed by an existing decision',
      '## Skipped rows',
    ];
    for (const heading of headings) {
      expect(md).toContain(heading);
    }
  });

  it('an empty section body is exactly `_None._` for every one of the eight list sections', () => {
    const root = makeRootDir();
    const paths = writeDryRunReport({ plan: buildPlan(), databaseFingerprint: 'fp', now: FIXED_NOW, rootDir: root });
    const md = readFileSync(paths.latestMdPath, 'utf8');
    const noneCount = (md.match(/_None\._/g) ?? []).length;
    expect(noneCount).toBe(8);
  });

  it('a plan with zero flagged pairs still produces the "Pairs flagged for review" heading followed by _None._', () => {
    const root = makeRootDir();
    const paths = writeDryRunReport({ plan: buildPlan(), databaseFingerprint: 'fp', now: FIXED_NOW, rootDir: root });
    const md = readFileSync(paths.latestMdPath, 'utf8');
    const idx = md.indexOf('## Pairs flagged for review');
    expect(idx).toBeGreaterThan(-1);
    expect(md.slice(idx, idx + 200)).toContain('_None._');
  });

  it('every SkippedRow appears in the Markdown with its sourceRowId — 3 skipped rows yield 3 matches', () => {
    const root = makeRootDir();
    const plan = buildPlan({
      skipped: [
        { sourceRowId: 'row-aaa', reason: 'blank_company_name' },
        { sourceRowId: 'row-bbb', reason: 'contact_without_name' },
        { sourceRowId: 'row-ccc', reason: 'already_linked', detail: 'linked to rel-1' },
      ],
    });
    const paths = writeDryRunReport({ plan, databaseFingerprint: 'fp', now: FIXED_NOW, rootDir: root });
    const md = readFileSync(paths.latestMdPath, 'utf8');
    const matches = ['row-aaa', 'row-bbb', 'row-ccc'].filter((id) => md.includes(id));
    expect(matches).toHaveLength(3);
  });

  it('the report never contains params_snapshot, commission, or a raw DATABASE_URL', () => {
    const root = makeRootDir();
    const plan = buildPlan({
      skipped: [{ sourceRowId: 'row-a', reason: 'blank_company_name', detail: 'no company name provided' }],
    });
    const paths = writeDryRunReport({ plan, databaseFingerprint: 'fp', now: FIXED_NOW, rootDir: root });
    const md = readFileSync(paths.latestMdPath, 'utf8');
    const json = readFileSync(paths.latestJsonPath, 'utf8');
    for (const forbidden of ['params_snapshot', 'commission', 'postgres://', 'postgresql://']) {
      expect(md).not.toContain(forbidden);
      expect(json).not.toContain(forbidden);
    }
  });
});

describe('readLatestDryRunReport', () => {
  it('returns null when .reconcile/dry-run-latest.json does not exist', () => {
    const root = makeRootDir();
    expect(readLatestDryRunReport(root)).toBeNull();
  });

  it("returns null when the file exists but its reportVersion is not '1'", () => {
    const root = makeRootDir();
    writeDryRunReport({ plan: buildPlan(), databaseFingerprint: 'fp', now: FIXED_NOW, rootDir: root });
    const latestPath = join(root, REPORT_DIR, 'dry-run-latest.json');
    const envelope = JSON.parse(readFileSync(latestPath, 'utf8'));
    envelope.reportVersion = '2';
    writeFileSync(latestPath, JSON.stringify(envelope), 'utf8');
    expect(readLatestDryRunReport(root)).toBeNull();
  });

  it('otherwise returns the parsed envelope', () => {
    const root = makeRootDir();
    writeDryRunReport({ plan: buildPlan(), databaseFingerprint: 'fp-xyz', now: FIXED_NOW, rootDir: root });
    const envelope = readLatestDryRunReport(root);
    expect(envelope).not.toBeNull();
    expect(envelope?.reportVersion).toBe('1');
    expect(envelope?.databaseFingerprint).toBe('fp-xyz');
  });
});

/**
 * Phase 31 Plan 07 — `run.ts` (`runReconciliation`) tests.
 *
 * Criterion 1 is a falsifiable assertion, not a claim: a full dry run over a
 * fixture source must leave `dbi.insert`/`dbi.update`/`dbi.delete` each
 * called exactly zero times, and every `dbi.execute` call it issues must
 * carry a `SELECT` statement. `./apply`'s plan writer is mocked so its own
 * spy proves the dry-run path never reaches it; `./engine`'s planner is
 * wrapped (not replaced) so its real, deterministic behavior still runs
 * while letting a test assert object identity against what it returned.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

vi.mock('server-only', () => ({}));

vi.mock('./apply', () => ({
  applyReconciliationPlan: vi.fn(async () => ({
    companiesCreated: 0,
    companiesReused: 0,
    relationshipsCreated: 0,
    relationshipsReused: 0,
    contactsCreated: 0,
    contactsUpdated: 0,
    contactsSkipped: 0,
    proposalsLinked: 0,
    pairsInserted: 0,
    pairsAlreadyPresent: 0,
  })),
}));

vi.mock('./engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./engine')>();
  return { ...actual, planReconciliation: vi.fn(actual.planReconciliation) };
});

import { applyReconciliationPlan } from './apply';
import { planReconciliation } from './engine';
import { runReconciliation } from './run';
import type { DbHandle, ReconciliationSource, SourceRow } from './types';

const applyMock = vi.mocked(applyReconciliationPlan);
const planSpy = vi.mocked(planReconciliation);

function makeDbi(): { dbi: DbHandle; insert: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; del: ReturnType<typeof vi.fn>; execute: ReturnType<typeof vi.fn> } {
  const insert = vi.fn();
  const update = vi.fn();
  const del = vi.fn();

  const normalizeRows = [
    { raw: 'Acme SIREN Co', norm: 'acme siren co' },
    { raw: 'Globex Ltd', norm: 'globex ltd' },
    { raw: 'Initech', norm: 'initech' },
    { raw: 'Umbrella Corp', norm: 'umbrella corp' },
  ];

  const execute = vi.fn(async () => normalizeRows);

  const builder: Record<string, unknown> = {};
  Object.assign(builder, {
    execute,
    select: () => builder,
    from: () => builder,
    where: () => builder,
    insert,
    update,
    delete: del,
    // Every `.select().from(...).where(...)` chain in engine.ts resolves via
    // `then` — an empty registry (no existing companies/relationships/
    // contacts/pair decisions) keeps every fixture row a brand-new candidate.
    then: (resolve: (value: unknown) => void) => Promise.resolve([]).then(resolve),
  });

  return { dbi: builder as unknown as DbHandle, insert, update, del, execute };
}

/** Extracts the literal SQL text (Param placeholders as `?`) from a drizzle-orm `sql` tagged template. */
function sqlText(query: unknown): string {
  const chunks = (query as { queryChunks?: Array<{ constructor: { name: string }; value: unknown[] }> }).queryChunks;
  if (!chunks) return String(query);
  return chunks.map((c) => (c.constructor.name === 'StringChunk' ? (c.value as string[]).join('') : '?')).join('');
}

function makeSource(id: 'proposal_extraction' | 'hubspot_import', rows: SourceRow[]): ReconciliationSource {
  return { id, loadRows: async () => rows };
}

function makeRow(overrides: Partial<SourceRow> & { sourceRowId: string; ownerId: string }): SourceRow {
  return {
    companyName: 'Acme SIREN Co',
    rawSiren: undefined,
    contactName: null,
    contactRole: null,
    contactPhone: null,
    contactEmail: null,
    occurredAt: new Date('2026-01-01T00:00:00.000Z'),
    alreadyLinkedRelationshipId: null,
    ...overrides,
  };
}

/**
 * The fixture set required by `<behavior>`: two SIREN-matched candidates
 * (r1/r2, cross-owner auto-merge, criterion 3), two name-only-matched
 * candidates (r3/r4, ambiguity flag), one blank-company-name row (r5), one
 * contact-without-name row (r6) and one already-linked row (r7).
 */
function baselineRows(): SourceRow[] {
  return [
    makeRow({ sourceRowId: 'r1', ownerId: 'o1', companyName: 'Acme SIREN Co', rawSiren: '123456789', contactName: 'Contact One' }),
    makeRow({ sourceRowId: 'r2', ownerId: 'o2', companyName: 'Acme SIREN Co', rawSiren: '123456789', contactName: 'Contact Two' }),
    makeRow({ sourceRowId: 'r3', ownerId: 'o3', companyName: 'Globex Ltd' }),
    makeRow({ sourceRowId: 'r4', ownerId: 'o4', companyName: 'Globex Ltd' }),
    makeRow({ sourceRowId: 'r5', ownerId: 'o5', companyName: '' }),
    makeRow({ sourceRowId: 'r6', ownerId: 'o6', companyName: 'Initech', contactName: null, contactPhone: '0102030405' }),
    makeRow({ sourceRowId: 'r7', ownerId: 'o7', companyName: 'AlreadyCo', alreadyLinkedRelationshipId: 'rel-existing-123' }),
  ];
}

/** A drifted fixture set: baseline plus one brand-new company/owner. */
function driftedRows(): SourceRow[] {
  return [...baselineRows(), makeRow({ sourceRowId: 'r8', ownerId: 'o8', companyName: 'Umbrella Corp' })];
}

const NOW = new Date('2026-09-02T12:00:00.000Z');
const FINGERPRINT = 'fp-database-a';

let rootDir: string;

function makeRootDir(): string {
  rootDir = mkdtempSync(join(tmpdir(), 'reconcile-run-'));
  return rootDir;
}

afterEach(() => {
  vi.clearAllMocks();
  if (rootDir) {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

describe('runReconciliation — dry-run mode', () => {
  it('criterion 1 — a dry run writes ZERO rows to the database', async () => {
    const { dbi, insert, update, del, execute } = makeDbi();
    const root = makeRootDir();
    const source = makeSource('proposal_extraction', baselineRows());

    const result = await runReconciliation({
      dbi,
      source,
      mode: 'dry-run',
      rootDir: root,
      databaseFingerprint: FINGERPRINT,
      now: NOW,
      allowDrift: false,
      log: () => {},
    });

    expect(result.mode).toBe('dry-run');
    expect(insert).toHaveBeenCalledTimes(0);
    expect(update).toHaveBeenCalledTimes(0);
    expect(del).toHaveBeenCalledTimes(0);

    // No dbi.execute() call issued while planning may carry anything other
    // than a read — the batched company-name normalization round trip is
    // the only execute() call this planner issues.
    expect(execute).toHaveBeenCalled();
    for (const call of execute.mock.calls) {
      const text = sqlText(call[0]).trim().toUpperCase();
      expect(text.startsWith('SELECT')).toBe(true);
    }
  });

  it('leaves all four report files on disk in the temp rootDir', async () => {
    const { dbi } = makeDbi();
    const root = makeRootDir();
    const source = makeSource('proposal_extraction', baselineRows());

    const result = await runReconciliation({
      dbi,
      source,
      mode: 'dry-run',
      rootDir: root,
      databaseFingerprint: FINGERPRINT,
      now: NOW,
      allowDrift: false,
      log: () => {},
    });

    if (result.mode !== 'dry-run') throw new Error('expected dry-run result');
    for (const p of Object.values(result.reportPaths)) {
      expect(existsSync(p)).toBe(true);
    }
  });

  it('never calls the mocked applyReconciliationPlan', async () => {
    const { dbi } = makeDbi();
    const root = makeRootDir();
    const source = makeSource('proposal_extraction', baselineRows());

    await runReconciliation({
      dbi,
      source,
      mode: 'dry-run',
      rootDir: root,
      databaseFingerprint: FINGERPRINT,
      now: NOW,
      allowDrift: false,
      log: () => {},
    });

    expect(applyMock).toHaveBeenCalledTimes(0);
  });
});

describe('runReconciliation — apply mode guards', () => {
  it('aborts with reason "no-dry-run-report" when no report exists, and writes nothing', async () => {
    const { dbi, insert, update, del } = makeDbi();
    const root = makeRootDir(); // empty — no prior dry run
    const source = makeSource('proposal_extraction', baselineRows());

    const result = await runReconciliation({
      dbi,
      source,
      mode: 'apply',
      rootDir: root,
      databaseFingerprint: FINGERPRINT,
      now: NOW,
      allowDrift: false,
      log: () => {},
    });

    expect(result).toEqual({ mode: 'apply', aborted: true, reason: 'no-dry-run-report' });
    expect(applyMock).toHaveBeenCalledTimes(0);
    expect(insert).toHaveBeenCalledTimes(0);
    expect(update).toHaveBeenCalledTimes(0);
    expect(del).toHaveBeenCalledTimes(0);
  });

  it('aborts with reason "fingerprint-mismatch" when the stored report is from a different database, and writes nothing', async () => {
    const { dbi, insert, update, del } = makeDbi();
    const root = makeRootDir();
    const source = makeSource('proposal_extraction', baselineRows());

    await runReconciliation({
      dbi,
      source,
      mode: 'dry-run',
      rootDir: root,
      databaseFingerprint: 'fp-database-a',
      now: NOW,
      allowDrift: false,
      log: () => {},
    });

    const result = await runReconciliation({
      dbi,
      source,
      mode: 'apply',
      rootDir: root,
      databaseFingerprint: 'fp-database-b',
      now: NOW,
      allowDrift: false,
      log: () => {},
    });

    expect(result).toEqual({ mode: 'apply', aborted: true, reason: 'fingerprint-mismatch' });
    expect(applyMock).toHaveBeenCalledTimes(0);
    expect(insert).toHaveBeenCalledTimes(0);
    expect(update).toHaveBeenCalledTimes(0);
    expect(del).toHaveBeenCalledTimes(0);
  });

  it('aborts with reason "source-mismatch" when the stored report is from a different source, and writes nothing', async () => {
    const { dbi, insert, update, del } = makeDbi();
    const root = makeRootDir();

    await runReconciliation({
      dbi,
      source: makeSource('hubspot_import', baselineRows()),
      mode: 'dry-run',
      rootDir: root,
      databaseFingerprint: FINGERPRINT,
      now: NOW,
      allowDrift: false,
      log: () => {},
    });

    const result = await runReconciliation({
      dbi,
      source: makeSource('proposal_extraction', baselineRows()),
      mode: 'apply',
      rootDir: root,
      databaseFingerprint: FINGERPRINT,
      now: NOW,
      allowDrift: false,
      log: () => {},
    });

    expect(result).toEqual({ mode: 'apply', aborted: true, reason: 'source-mismatch' });
    expect(applyMock).toHaveBeenCalledTimes(0);
    expect(insert).toHaveBeenCalledTimes(0);
    expect(update).toHaveBeenCalledTimes(0);
    expect(del).toHaveBeenCalledTimes(0);
  });

  it('aborts with reason "drift" and a non-empty change list when the fresh plan differs and allowDrift is false, and writes nothing', async () => {
    const { dbi, insert, update, del } = makeDbi();
    const root = makeRootDir();

    await runReconciliation({
      dbi,
      source: makeSource('proposal_extraction', baselineRows()),
      mode: 'dry-run',
      rootDir: root,
      databaseFingerprint: FINGERPRINT,
      now: NOW,
      allowDrift: false,
      log: () => {},
    });

    const result = await runReconciliation({
      dbi,
      source: makeSource('proposal_extraction', driftedRows()),
      mode: 'apply',
      rootDir: root,
      databaseFingerprint: FINGERPRINT,
      now: NOW,
      allowDrift: false,
      log: () => {},
    });

    if (result.mode !== 'apply' || !result.aborted) throw new Error('expected an aborted apply result');
    expect(result.reason).toBe('drift');
    expect(result.changes).toBeDefined();
    expect(result.changes!.length).toBeGreaterThan(0);
    expect(applyMock).toHaveBeenCalledTimes(0);
    expect(insert).toHaveBeenCalledTimes(0);
    expect(update).toHaveBeenCalledTimes(0);
    expect(del).toHaveBeenCalledTimes(0);
  });
});

describe('runReconciliation — apply mode success', () => {
  it('an apply run over an unchanged world calls applyReconciliationPlan exactly once, with the freshly computed plan', async () => {
    const { dbi } = makeDbi();
    const root = makeRootDir();

    await runReconciliation({
      dbi,
      source: makeSource('proposal_extraction', baselineRows()),
      mode: 'dry-run',
      rootDir: root,
      databaseFingerprint: FINGERPRINT,
      now: NOW,
      allowDrift: false,
      log: () => {},
    });

    const result = await runReconciliation({
      dbi,
      source: makeSource('proposal_extraction', baselineRows()),
      mode: 'apply',
      rootDir: root,
      databaseFingerprint: FINGERPRINT,
      now: NOW,
      allowDrift: false,
      log: () => {},
    });

    expect(applyMock).toHaveBeenCalledTimes(1);
    if (result.mode !== 'apply' || result.aborted) throw new Error('expected a successful apply result');

    // The plan handed to applyReconciliationPlan must be object-identical to
    // the value the (wrapped, still-real) planner actually returned for this
    // apply run — never the plan deserialized back out of the stored report.
    const lastPlanCallIndex = planSpy.mock.results.length - 1;
    const freshPlanReturned = await planSpy.mock.results[lastPlanCallIndex]!.value;
    expect(applyMock.mock.calls[0]![0].plan).toBe(freshPlanReturned);
  });

  it('a dry run immediately followed by an apply run over an unchanged world reports drift.status === "clean"', async () => {
    const { dbi } = makeDbi();
    const root = makeRootDir();

    await runReconciliation({
      dbi,
      source: makeSource('proposal_extraction', baselineRows()),
      mode: 'dry-run',
      rootDir: root,
      databaseFingerprint: FINGERPRINT,
      now: NOW,
      allowDrift: false,
      log: () => {},
    });

    const result = await runReconciliation({
      dbi,
      source: makeSource('proposal_extraction', baselineRows()),
      mode: 'apply',
      rootDir: root,
      databaseFingerprint: FINGERPRINT,
      now: NOW,
      allowDrift: false,
      log: () => {},
    });

    if (result.mode !== 'apply' || result.aborted) throw new Error('expected a successful apply result');
    expect(result.drift.status).toBe('clean');
  });

  it('an apply run with drift and allowDrift=true proceeds and calls applyReconciliationPlan once', async () => {
    const { dbi } = makeDbi();
    const root = makeRootDir();

    await runReconciliation({
      dbi,
      source: makeSource('proposal_extraction', baselineRows()),
      mode: 'dry-run',
      rootDir: root,
      databaseFingerprint: FINGERPRINT,
      now: NOW,
      allowDrift: false,
      log: () => {},
    });

    const result = await runReconciliation({
      dbi,
      source: makeSource('proposal_extraction', driftedRows()),
      mode: 'apply',
      rootDir: root,
      databaseFingerprint: FINGERPRINT,
      now: NOW,
      allowDrift: true,
      log: () => {},
    });

    expect(applyMock).toHaveBeenCalledTimes(1);
    if (result.mode !== 'apply' || result.aborted) throw new Error('expected a successful apply result');
    expect(result.drift.status).toBe('drift');
  });
});

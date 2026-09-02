/**
 * Phase 31 Plan 05 — apply.ts (`applyReconciliationPlan`) tests
 * (IMPORT-01/03/04, CRM-05, D-08, OQ-1, OQ-5).
 *
 * `applyReconciliationPlan` receives its `dbi` as a parameter (same pattern
 * as `engine.ts`), so the fake `dbi` below is passed directly — no module
 * mock of `@/lib/db` is needed. The fake records every statement's kind,
 * target table and payload so behavior can be asserted structurally rather
 * than by re-implementing SQL comparison.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as schema from '@/db/schema';
import { applyReconciliationPlan } from './apply';
import type { DbHandle, ReconciliationPlan } from './types';

interface RecordedCall {
  kind: string;
  table?: unknown;
  payload?: unknown;
}

function makeMockDbi(): {
  dbi: DbHandle;
  calls: RecordedCall[];
  /**
   * Replaces the queue's contents in place. Deliberately NOT a settable
   * property — the builder closures below capture the underlying array
   * reference once, so reassigning a plain property (rather than mutating
   * the existing array) would silently decouple the test's queue from the
   * one the closures actually read.
   */
  setResults: (items: unknown[]) => void;
  transactionSpy: ReturnType<typeof vi.fn>;
} {
  const calls: RecordedCall[] = [];
  const resultQueue: unknown[] = [];
  const transactionSpy = vi.fn();

  function setResults(items: unknown[]): void {
    resultQueue.length = 0;
    resultQueue.push(...items);
  }

  function nextResult(): unknown {
    if (resultQueue.length === 0) {
      throw new Error('mock dbi: resultQueue exhausted — test queued too few results');
    }
    return resultQueue.shift();
  }

  function makeInsertBuilder(table: unknown): Record<string, unknown> {
    calls.push({ kind: 'insert', table });
    const builder: Record<string, unknown> = {};
    Object.assign(builder, {
      values: (v: unknown) => {
        calls.push({ kind: 'values', table, payload: v });
        return builder;
      },
      onConflictDoNothing: (opts?: unknown) => {
        calls.push({ kind: 'onConflictDoNothing', table, payload: opts });
        return builder;
      },
      returning: () => {
        calls.push({ kind: 'returning', table });
        return Promise.resolve(nextResult());
      },
      then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
        Promise.resolve(nextResult()).then(resolve, reject),
    });
    return builder;
  }

  function makeSelectBuilder(): Record<string, unknown> {
    const builder: Record<string, unknown> = {};
    Object.assign(builder, {
      from: (table: unknown) => {
        calls.push({ kind: 'from', table });
        return builder;
      },
      where: (clause: unknown) => {
        calls.push({ kind: 'where', payload: clause });
        return builder;
      },
      limit: (n: unknown) => {
        calls.push({ kind: 'limit', payload: n });
        return Promise.resolve(nextResult());
      },
      then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
        Promise.resolve(nextResult()).then(resolve, reject),
    });
    return builder;
  }

  function makeUpdateBuilder(table: unknown): Record<string, unknown> {
    calls.push({ kind: 'update', table });
    const builder: Record<string, unknown> = {};
    Object.assign(builder, {
      set: (v: unknown) => {
        calls.push({ kind: 'set', table, payload: v });
        return builder;
      },
      where: (clause: unknown) => {
        calls.push({ kind: 'where', payload: clause });
        return builder;
      },
      returning: () => {
        calls.push({ kind: 'returning', table });
        return Promise.resolve(nextResult());
      },
      then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
        Promise.resolve(nextResult()).then(resolve, reject),
    });
    return builder;
  }

  const dbi = {
    insert: (table: unknown) => makeInsertBuilder(table),
    select: (cols?: unknown) => {
      calls.push({ kind: 'select', payload: cols });
      return makeSelectBuilder();
    },
    update: (table: unknown) => makeUpdateBuilder(table),
    transaction: transactionSpy,
  };

  return { dbi: dbi as unknown as DbHandle, calls, setResults, transactionSpy };
}

function emptyPlan(overrides: Partial<ReconciliationPlan> = {}): ReconciliationPlan {
  return {
    sourceId: 'proposal_extraction',
    generatedAt: '2026-09-02T00:00:00.000Z',
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

let mock: ReturnType<typeof makeMockDbi>;

beforeEach(() => {
  mock = makeMockDbi();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ── Task 1 — companies, relationships, proposal links, pending pairs ───────

describe('applyReconciliationPlan — companies', () => {
  it('inserts a siren-bearing company with source=proposal_extraction and increments companiesCreated', async () => {
    mock.setResults([[{ id: 'co-1' }], undefined]);
    const plan = emptyPlan({
      companies: [{ key: 'siren:111111111', canonicalName: 'Acme', nameNormalized: 'acme', siren: '111111111', existingCompanyId: null }],
    });
    const result = await applyReconciliationPlan({ dbi: mock.dbi, plan });
    expect(result.companiesCreated).toBe(1);
    expect(result.companiesReused).toBe(0);
    const valuesCall = mock.calls.find((c) => c.kind === 'values' && c.table === schema.companies);
    expect(valuesCall).toBeDefined();
    expect((valuesCall!.payload as Record<string, unknown>).source).toBe('proposal_extraction');
  });

  it('a siren-bearing company insert uses onConflictDoNothing targeting siren, then re-selects on zero rows', async () => {
    mock.setResults([[], [{ id: 'co-existing' }]]);
    const plan = emptyPlan({
      companies: [{ key: 'siren:222222222', canonicalName: 'Beta', nameNormalized: 'beta', siren: '222222222', existingCompanyId: null }],
    });
    const result = await applyReconciliationPlan({ dbi: mock.dbi, plan });
    expect(result.companiesCreated).toBe(0);
    expect(result.companiesReused).toBe(1);
    const conflictCall = mock.calls.find((c) => c.kind === 'onConflictDoNothing' && c.table === schema.companies);
    expect(conflictCall).toBeDefined();
    const selectCall = mock.calls.find((c) => c.kind === 'from' && c.table === schema.companies);
    expect(selectCall).toBeDefined();
  });

  it('a siren-less company with no existingCompanyId inserts unconditionally, no onConflictDoNothing', async () => {
    mock.setResults([[{ id: 'co-3' }], undefined]);
    const plan = emptyPlan({
      companies: [{ key: 'owner:o1|name:acme', canonicalName: 'Acme', nameNormalized: 'acme', siren: undefined, existingCompanyId: null }],
    });
    const result = await applyReconciliationPlan({ dbi: mock.dbi, plan });
    expect(result.companiesCreated).toBe(1);
    const insertCalls = mock.calls.filter((c) => c.kind === 'insert' && c.table === schema.companies);
    expect(insertCalls).toHaveLength(1);
    const conflictCalls = mock.calls.filter((c) => c.kind === 'onConflictDoNothing' && c.table === schema.companies);
    expect(conflictCalls).toHaveLength(0);
  });

  it('a company with a non-null existingCompanyId issues no INSERT at all', async () => {
    mock.setResults([]);
    const plan = emptyPlan({
      companies: [{ key: 'siren:333333333', canonicalName: 'Gamma', nameNormalized: 'gamma', siren: '333333333', existingCompanyId: 'co-preexisting' }],
    });
    const result = await applyReconciliationPlan({ dbi: mock.dbi, plan });
    expect(result.companiesCreated).toBe(0);
    expect(result.companiesReused).toBe(1);
    const insertCalls = mock.calls.filter((c) => c.kind === 'insert' && c.table === schema.companies);
    expect(insertCalls).toHaveLength(0);
  });

  it('every recorded companies insert payload carries source: proposal_extraction', async () => {
    mock.setResults([[{ id: 'co-a' }], [{ id: 'co-b' }], undefined]);
    const plan = emptyPlan({
      companies: [
        { key: 'siren:111111111', canonicalName: 'A', nameNormalized: 'a', siren: '111111111', existingCompanyId: null },
        { key: 'owner:o1|name:b', canonicalName: 'B', nameNormalized: 'b', siren: undefined, existingCompanyId: null },
      ],
    });
    await applyReconciliationPlan({ dbi: mock.dbi, plan });
    const valuesCalls = mock.calls.filter((c) => c.kind === 'values' && c.table === schema.companies);
    expect(valuesCalls).toHaveLength(2);
    for (const c of valuesCalls) {
      expect((c.payload as Record<string, unknown>).source).toBe('proposal_extraction');
    }
  });
});

describe('applyReconciliationPlan — relationships', () => {
  it('inserts with onConflictDoNothing on (company_id, owner_id) and source=proposal_extraction', async () => {
    mock.setResults([
      [{ id: 'co-1' }], // company insert
      undefined, // company audit batch
      [{ id: 'rel-1' }], // relationship insert
      undefined, // relationship audit batch
    ]);
    const plan = emptyPlan({
      companies: [{ key: 'siren:111111111', canonicalName: 'Acme', nameNormalized: 'acme', siren: '111111111', existingCompanyId: null }],
      relationships: [{ companyKey: 'siren:111111111', ownerId: 'owner-1', existingRelationshipId: null, sourceRowIds: ['r1'] }],
    });
    const result = await applyReconciliationPlan({ dbi: mock.dbi, plan });
    expect(result.relationshipsCreated).toBe(1);
    const conflictCall = mock.calls.find((c) => c.kind === 'onConflictDoNothing' && c.table === schema.clientRelationships);
    expect(conflictCall).toBeDefined();
    expect(conflictCall!.payload).toEqual({ target: [schema.clientRelationships.companyId, schema.clientRelationships.ownerId] });
    const valuesCall = mock.calls.find((c) => c.kind === 'values' && c.table === schema.clientRelationships);
    expect((valuesCall!.payload as Record<string, unknown>).source).toBe('proposal_extraction');
  });

  it('re-selects on a conflicting relationship insert (zero rows returned)', async () => {
    mock.setResults([
      [{ id: 'co-1' }],
      undefined, // company audit batch
      [], // conflict
      [{ id: 'rel-existing' }], // reselect
    ]);
    const plan = emptyPlan({
      companies: [{ key: 'siren:111111111', canonicalName: 'Acme', nameNormalized: 'acme', siren: '111111111', existingCompanyId: null }],
      relationships: [{ companyKey: 'siren:111111111', ownerId: 'owner-1', existingRelationshipId: null, sourceRowIds: ['r1'] }],
    });
    const result = await applyReconciliationPlan({ dbi: mock.dbi, plan });
    expect(result.relationshipsCreated).toBe(0);
    expect(result.relationshipsReused).toBe(1);
  });

  it('a relationship with a non-null existingRelationshipId issues no INSERT', async () => {
    mock.setResults([]);
    const plan = emptyPlan({
      companies: [{ key: 'siren:111111111', canonicalName: 'Acme', nameNormalized: 'acme', siren: '111111111', existingCompanyId: 'co-preexisting' }],
      relationships: [{ companyKey: 'siren:111111111', ownerId: 'owner-1', existingRelationshipId: 'rel-preexisting', sourceRowIds: ['r1'] }],
    });
    const result = await applyReconciliationPlan({ dbi: mock.dbi, plan });
    expect(result.relationshipsCreated).toBe(0);
    expect(result.relationshipsReused).toBe(1);
    const insertCalls = mock.calls.filter((c) => c.kind === 'insert' && c.table === schema.clientRelationships);
    expect(insertCalls).toHaveLength(0);
  });
});

describe('applyReconciliationPlan — proposal links (CRM-05 / OQ-1)', () => {
  it('the recorded proposals update payload key list is exactly [clientRelationshipId]', async () => {
    mock.setResults([
      [{ id: 'co-1' }],
      undefined, // company audit batch
      [{ id: 'rel-1' }],
      undefined, // relationship audit batch
      [{ id: 'prop-1' }], // proposals update .returning()
    ]);
    const plan = emptyPlan({
      companies: [{ key: 'siren:111111111', canonicalName: 'Acme', nameNormalized: 'acme', siren: '111111111', existingCompanyId: null }],
      relationships: [{ companyKey: 'siren:111111111', ownerId: 'owner-1', existingRelationshipId: null, sourceRowIds: ['prop-1'] }],
      proposalLinks: [{ sourceRowId: 'prop-1', relationshipKey: 'siren:111111111|owner-1' }],
    });
    const result = await applyReconciliationPlan({ dbi: mock.dbi, plan });
    expect(result.proposalsLinked).toBe(1);
    const setCall = mock.calls.find((c) => c.kind === 'set' && c.table === schema.proposals);
    expect(setCall).toBeDefined();
    expect(Object.keys(setCall!.payload as Record<string, unknown>)).toEqual(['clientRelationshipId']);
  });

  it('the recorded proposals update .where(...) predicate references client_relationship_id with an IS NULL check (source guard)', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');
    const filePath = join(dirname(fileURLToPath(import.meta.url)), 'apply.ts');
    const source = readFileSync(filePath, 'utf8');
    expect(source).toMatch(/isNull\(schema\.proposals\.clientRelationshipId\)/);
  });

  it('a proposal already linked (zero rows affected) does not increment proposalsLinked', async () => {
    mock.setResults([
      [{ id: 'co-1' }],
      undefined, // company audit batch
      [{ id: 'rel-1' }],
      undefined, // relationship audit batch
      [], // update affected zero rows — already linked
    ]);
    const plan = emptyPlan({
      companies: [{ key: 'siren:111111111', canonicalName: 'Acme', nameNormalized: 'acme', siren: '111111111', existingCompanyId: null }],
      relationships: [{ companyKey: 'siren:111111111', ownerId: 'owner-1', existingRelationshipId: null, sourceRowIds: ['prop-1'] }],
      proposalLinks: [{ sourceRowId: 'prop-1', relationshipKey: 'siren:111111111|owner-1' }],
    });
    const result = await applyReconciliationPlan({ dbi: mock.dbi, plan });
    expect(result.proposalsLinked).toBe(0);
  });
});

describe('applyReconciliationPlan — pending pairs', () => {
  it('inserts a flagged pair with onConflictDoNothing and increments pairsInserted', async () => {
    mock.setResults([[{ id: 'pair-1' }], undefined]);
    const plan = emptyPlan({
      flaggedPairs: [
        {
          sideAKey: 'owner:o1|name:acme',
          sideBKey: 'owner:o2|name:acme',
          nameNormalized: 'acme',
          reason: 'both_missing',
          companyKeyA: 'owner:o1|name:acme',
          companyKeyB: 'owner:o2|name:acme',
          alreadyPending: false,
        },
      ],
    });
    const result = await applyReconciliationPlan({ dbi: mock.dbi, plan });
    expect(result.pairsInserted).toBe(1);
    expect(result.pairsAlreadyPresent).toBe(0);
    const conflictCall = mock.calls.find((c) => c.kind === 'onConflictDoNothing' && c.table === schema.companyPairDecisions);
    expect(conflictCall).toBeDefined();
  });

  it('a pair entry with alreadyPending: true counts toward pairsAlreadyPresent and issues no INSERT', async () => {
    mock.setResults([]);
    const plan = emptyPlan({
      flaggedPairs: [
        {
          sideAKey: 'owner:o1|name:acme',
          sideBKey: 'owner:o2|name:acme',
          nameNormalized: 'acme',
          reason: 'both_missing',
          companyKeyA: 'owner:o1|name:acme',
          companyKeyB: 'owner:o2|name:acme',
          alreadyPending: true,
        },
      ],
    });
    const result = await applyReconciliationPlan({ dbi: mock.dbi, plan });
    expect(result.pairsInserted).toBe(0);
    expect(result.pairsAlreadyPresent).toBe(1);
    const insertCalls = mock.calls.filter((c) => c.kind === 'insert' && c.table === schema.companyPairDecisions);
    expect(insertCalls).toHaveLength(0);
  });

  it('a conflicting pair insert (zero rows) counts toward pairsAlreadyPresent, not pairsInserted', async () => {
    mock.setResults([[]]);
    const plan = emptyPlan({
      flaggedPairs: [
        {
          sideAKey: 'owner:o1|name:acme',
          sideBKey: 'owner:o2|name:acme',
          nameNormalized: 'acme',
          reason: 'both_missing',
          companyKeyA: 'owner:o1|name:acme',
          companyKeyB: 'owner:o2|name:acme',
          alreadyPending: false,
        },
      ],
    });
    const result = await applyReconciliationPlan({ dbi: mock.dbi, plan });
    expect(result.pairsInserted).toBe(0);
    expect(result.pairsAlreadyPresent).toBe(1);
  });
});

describe('applyReconciliationPlan — never touches a transaction', () => {
  it('dbi.transaction is never accessed', async () => {
    mock.setResults([]);
    const plan = emptyPlan();
    await applyReconciliationPlan({ dbi: mock.dbi, plan });
    expect(mock.transactionSpy).not.toHaveBeenCalled();
  });

  it('grep source guard: no .transaction( call anywhere in apply.ts', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');
    const filePath = join(dirname(fileURLToPath(import.meta.url)), 'apply.ts');
    const source = readFileSync(filePath, 'utf8');
    expect(source).not.toMatch(/\.transaction\(/);
  });
});

describe('applyReconciliationPlan — idempotent re-run', () => {
  it('applying the same plan a second time yields companiesCreated: 0, relationshipsCreated: 0, proposalsLinked: 0, pairsInserted: 0', async () => {
    const plan = emptyPlan({
      companies: [{ key: 'siren:111111111', canonicalName: 'Acme', nameNormalized: 'acme', siren: '111111111', existingCompanyId: null }],
      relationships: [{ companyKey: 'siren:111111111', ownerId: 'owner-1', existingRelationshipId: null, sourceRowIds: ['prop-1'] }],
      proposalLinks: [{ sourceRowId: 'prop-1', relationshipKey: 'siren:111111111|owner-1' }],
      flaggedPairs: [
        {
          sideAKey: 'owner:o1|name:acme',
          sideBKey: 'owner:o2|name:acme',
          nameNormalized: 'acme',
          reason: 'both_missing',
          companyKeyA: 'owner:o1|name:acme',
          companyKeyB: 'owner:o2|name:acme',
          alreadyPending: false,
        },
      ],
    });

    // Second run: everything the first run created now already exists —
    // every onConflictDoNothing conflicts (zero rows), forcing a re-select
    // for company/relationship, the proposal already carries the link
    // (zero rows affected), and the pair insert conflicts too.
    mock.setResults([
      [], // company onConflictDoNothing -> zero rows
      [{ id: 'co-1' }], // company reselect
      [], // relationship onConflictDoNothing -> zero rows
      [{ id: 'rel-1' }], // relationship reselect
      [], // proposal update -> zero rows affected (already linked)
      [], // pair onConflictDoNothing -> zero rows
    ]);
    const result = await applyReconciliationPlan({ dbi: mock.dbi, plan });
    expect(result.companiesCreated).toBe(0);
    expect(result.relationshipsCreated).toBe(0);
    expect(result.proposalsLinked).toBe(0);
    expect(result.pairsInserted).toBe(0);
  });
});

describe('applyReconciliationPlan — audit rows', () => {
  it('writes one company.extract audit row per created company, actorId: null, id-only payload', async () => {
    mock.setResults([[{ id: 'co-1' }], undefined]);
    const plan = emptyPlan({
      companies: [{ key: 'siren:111111111', canonicalName: 'Acme', nameNormalized: 'acme', siren: '111111111', existingCompanyId: null }],
    });
    await applyReconciliationPlan({ dbi: mock.dbi, plan });
    const auditValuesCall = mock.calls.find((c) => c.kind === 'values' && c.table === schema.auditLog);
    expect(auditValuesCall).toBeDefined();
    const rows = auditValuesCall!.payload as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ actorId: null, action: 'company.extract', targetType: 'company', targetId: 'co-1', payload: {} });
  });

  it('writes one client_relationship.extract audit row per created relationship', async () => {
    mock.setResults([[{ id: 'co-1' }], undefined, [{ id: 'rel-1' }], undefined]);
    const plan = emptyPlan({
      companies: [{ key: 'siren:111111111', canonicalName: 'Acme', nameNormalized: 'acme', siren: '111111111', existingCompanyId: null }],
      relationships: [{ companyKey: 'siren:111111111', ownerId: 'owner-1', existingRelationshipId: null, sourceRowIds: ['r1'] }],
    });
    await applyReconciliationPlan({ dbi: mock.dbi, plan });
    const auditValuesCalls = mock.calls.filter((c) => c.kind === 'values' && c.table === schema.auditLog);
    const relAudit = auditValuesCalls
      .flatMap((c) => c.payload as Array<Record<string, unknown>>)
      .find((r) => r.action === 'client_relationship.extract');
    expect(relAudit).toMatchObject({ actorId: null, targetType: 'client_relationship', targetId: 'rel-1' });
  });

  it('writes one company_pair.flag audit row per inserted pair', async () => {
    mock.setResults([[{ id: 'pair-1' }], undefined]);
    const plan = emptyPlan({
      flaggedPairs: [
        {
          sideAKey: 'owner:o1|name:acme',
          sideBKey: 'owner:o2|name:acme',
          nameNormalized: 'acme',
          reason: 'both_missing',
          companyKeyA: 'owner:o1|name:acme',
          companyKeyB: 'owner:o2|name:acme',
          alreadyPending: false,
        },
      ],
    });
    await applyReconciliationPlan({ dbi: mock.dbi, plan });
    const auditValuesCall = mock.calls.find((c) => c.kind === 'values' && c.table === schema.auditLog);
    const rows = auditValuesCall!.payload as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ actorId: null, action: 'company_pair.flag', targetType: 'company_pair', targetId: 'pair-1' });
  });
});

describe('applyReconciliationPlan — onProgress', () => {
  it('is invoked at least once per stage even when a stage is empty', async () => {
    mock.setResults([]);
    const plan = emptyPlan();
    const progressCalls: Array<{ stage: string; done: number; total: number }> = [];
    await applyReconciliationPlan({ dbi: mock.dbi, plan, onProgress: (p) => progressCalls.push(p) });
    const stages = new Set(progressCalls.map((p) => p.stage));
    expect(stages).toEqual(new Set(['companies', 'relationships', 'contacts', 'proposalLinks', 'pairs']));
  });
});

// ── Task 2 — contacts (OQ-5) ────────────────────────────────────────────────

describe('applyReconciliationPlan — contacts create', () => {
  it('inserts a new contact with source=proposal_extraction, resolved via the relationship key map', async () => {
    mock.setResults([
      [{ id: 'co-1' }],
      undefined, // company audit batch
      [{ id: 'rel-1' }],
      undefined, // relationship audit batch
      [{ id: 'contact-1' }], // contact insert
      undefined, // contact audit batch
    ]);
    const plan = emptyPlan({
      companies: [{ key: 'siren:111111111', canonicalName: 'Acme', nameNormalized: 'acme', siren: '111111111', existingCompanyId: null }],
      relationships: [{ companyKey: 'siren:111111111', ownerId: 'owner-1', existingRelationshipId: null, sourceRowIds: ['r1'] }],
      contacts: [
        {
          relationshipKey: 'siren:111111111|owner-1',
          name: 'Jean Dupont',
          role: 'Achats',
          phone: null,
          email: 'jean@acme.example',
          existingContactId: null,
          mergedFromSourceRowIds: ['r1'],
        },
      ],
    });
    const result = await applyReconciliationPlan({ dbi: mock.dbi, plan });
    expect(result.contactsCreated).toBe(1);
    const valuesCall = mock.calls.find((c) => c.kind === 'values' && c.table === schema.contacts);
    expect(valuesCall).toBeDefined();
    const payload = valuesCall!.payload as Record<string, unknown>;
    expect(payload.source).toBe('proposal_extraction');
    expect(payload.clientRelationshipId).toBe('rel-1');
  });

  it('writes a contact.extract audit payload containing neither name, email nor phone', async () => {
    mock.setResults([[{ id: 'co-1' }], undefined, [{ id: 'rel-1' }], undefined, [{ id: 'contact-1' }], undefined]);
    const plan = emptyPlan({
      companies: [{ key: 'siren:111111111', canonicalName: 'Acme', nameNormalized: 'acme', siren: '111111111', existingCompanyId: null }],
      relationships: [{ companyKey: 'siren:111111111', ownerId: 'owner-1', existingRelationshipId: null, sourceRowIds: ['r1'] }],
      contacts: [
        {
          relationshipKey: 'siren:111111111|owner-1',
          name: 'Jean Dupont',
          role: 'Achats',
          phone: '0102030405',
          email: 'jean@acme.example',
          existingContactId: null,
          mergedFromSourceRowIds: ['r1'],
        },
      ],
    });
    await applyReconciliationPlan({ dbi: mock.dbi, plan });
    const auditValuesCalls = mock.calls.filter((c) => c.kind === 'values' && c.table === schema.auditLog);
    const contactAudit = auditValuesCalls
      .flatMap((c) => c.payload as Array<Record<string, unknown>>)
      .find((r) => r.action === 'contact.extract');
    expect(contactAudit).toBeDefined();
    const payload = contactAudit!.payload as Record<string, unknown>;
    expect(payload).not.toHaveProperty('name');
    expect(payload).not.toHaveProperty('email');
    expect(payload).not.toHaveProperty('phone');
    expect(payload).toEqual({ clientRelationshipId: 'rel-1' });
  });
});

describe('applyReconciliationPlan — contacts fill-blanks update (OQ-5)', () => {
  it('the recorded contacts update .set(...) payload has no name key, and uses COALESCE for role/phone/email', async () => {
    mock.setResults([
      [{ id: 'co-1' }],
      undefined, // company audit batch
      [{ id: 'rel-1' }],
      undefined, // relationship audit batch
      [{ id: 'contact-existing' }], // update .returning()
    ]);
    const plan = emptyPlan({
      companies: [{ key: 'siren:111111111', canonicalName: 'Acme', nameNormalized: 'acme', siren: '111111111', existingCompanyId: null }],
      relationships: [{ companyKey: 'siren:111111111', ownerId: 'owner-1', existingRelationshipId: null, sourceRowIds: ['r1'] }],
      contacts: [
        {
          relationshipKey: 'siren:111111111|owner-1',
          name: 'Jean Dupont',
          role: null,
          phone: '0102030405',
          email: null,
          existingContactId: 'contact-existing',
          mergedFromSourceRowIds: ['r1'],
        },
      ],
    });
    const result = await applyReconciliationPlan({ dbi: mock.dbi, plan });
    expect(result.contactsUpdated).toBe(1);
    expect(result.contactsCreated).toBe(0);
    const setCall = mock.calls.find((c) => c.kind === 'set' && c.table === schema.contacts);
    expect(setCall).toBeDefined();
    const payload = setCall!.payload as Record<string, unknown>;
    expect(payload).not.toHaveProperty('name');
    expect(Object.keys(payload).sort()).toEqual(['email', 'phone', 'role', 'updatedAt'].sort());
  });

  it('the recorded contacts update .where(...) predicate references the source column (source guard)', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');
    const filePath = join(dirname(fileURLToPath(import.meta.url)), 'apply.ts');
    const source = readFileSync(filePath, 'utf8');
    expect(source).toMatch(/eq\(schema\.contacts\.source, ?'proposal_extraction'\)/);
  });

  it('does not increment contactsUpdated when the WHERE precondition matches zero rows', async () => {
    mock.setResults([
      [{ id: 'co-1' }],
      undefined, // company audit batch
      [{ id: 'rel-1' }],
      undefined, // relationship audit batch
      [], // zero rows — the matched contact's source was not proposal_extraction
    ]);
    const plan = emptyPlan({
      companies: [{ key: 'siren:111111111', canonicalName: 'Acme', nameNormalized: 'acme', siren: '111111111', existingCompanyId: null }],
      relationships: [{ companyKey: 'siren:111111111', ownerId: 'owner-1', existingRelationshipId: null, sourceRowIds: ['r1'] }],
      contacts: [
        {
          relationshipKey: 'siren:111111111|owner-1',
          name: 'Jean Dupont',
          role: null,
          phone: null,
          email: null,
          existingContactId: 'contact-existing',
          mergedFromSourceRowIds: ['r1'],
        },
      ],
    });
    const result = await applyReconciliationPlan({ dbi: mock.dbi, plan });
    expect(result.contactsUpdated).toBe(0);
  });
});

describe('applyReconciliationPlan — contacts skipped (contact_conflicts_with_human_row)', () => {
  it('a plan whose only contact entry is a skip records zero statements against the contacts table and increments contactsSkipped', async () => {
    mock.setResults([]);
    const plan = emptyPlan({
      skipped: [{ sourceRowId: 'r1', reason: 'contact_conflicts_with_human_row', detail: 'contact-human-1' }],
    });
    const result = await applyReconciliationPlan({ dbi: mock.dbi, plan });
    expect(result.contactsSkipped).toBe(1);
    expect(result.contactsCreated).toBe(0);
    expect(result.contactsUpdated).toBe(0);
    const contactCalls = mock.calls.filter((c) => c.table === schema.contacts);
    expect(contactCalls).toHaveLength(0);
  });
});

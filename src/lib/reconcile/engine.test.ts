/**
 * Phase 31 Plan 02 — engine.ts (`planReconciliation`) tests.
 *
 * The engine receives its `dbi` as a parameter, so only `server-only` needs
 * mocking here. The fake `dbi` tracks which table `.from(...)` targeted and
 * returns the matching fixture array on `.select().from().where()` — the
 * engine's WHERE predicates are not re-validated by this mock (that is
 * `dbi`'s job in a real Postgres, exercised by the DB-smoke CI step, not by
 * this unit suite); fixtures are scoped per test so an unfiltered return is
 * equivalent to the real filtered one.
 *
 * Company-name normalization is faked at the `dbi.execute()` boundary with a
 * caller-supplied `{ raw, norm }` table — this is deliberately NOT a
 * TypeScript reimplementation of `leasetic_normalize_company_name()`; it is
 * the test's way of saying "assume Postgres already computed this," which is
 * exactly the division of responsibility D-10 requires.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import * as schema from '@/db/schema';
import { planReconciliation } from './engine';
import type { DbHandle, ReconciliationSource, SourceRow } from './types';

interface Fixtures {
  normalizeRows: Array<{ raw: string; norm: string }>;
  companies?: Array<{ id: string; siren: string | null; nameNormalized: string }>;
  clientRelationships?: Array<{ relationshipId: string; companyId: string; ownerId: string }>;
  contacts?: Array<{
    id: string;
    clientRelationshipId: string;
    name: string;
    role: string | null;
    phone: string | null;
    email: string | null;
    source: string | null;
  }>;
  companyPairDecisions?: Array<{
    sideAKey: string;
    sideBKey: string;
    verdict: 'merged' | 'kept_separate' | null;
    survivorCompanyId: string | null;
  }>;
}

function makeDbi(fixtures: Fixtures): { dbi: DbHandle; insert: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; del: ReturnType<typeof vi.fn> } {
  const insert = vi.fn();
  const update = vi.fn();
  const del = vi.fn();
  let currentTable: unknown = null;

  const resultFor = (table: unknown): unknown[] => {
    if (table === schema.companies) return fixtures.companies ?? [];
    if (table === schema.clientRelationships) return fixtures.clientRelationships ?? [];
    if (table === schema.contacts) return fixtures.contacts ?? [];
    if (table === schema.companyPairDecisions) return fixtures.companyPairDecisions ?? [];
    return [];
  };

  const builder: Record<string, unknown> = {};
  Object.assign(builder, {
    execute: async () => fixtures.normalizeRows,
    select: () => builder,
    from: (table: unknown) => {
      currentTable = table;
      return builder;
    },
    where: () => builder,
    insert,
    update,
    delete: del,
    then: (resolve: (value: unknown) => void, reject?: (reason: unknown) => void) =>
      Promise.resolve(resultFor(currentTable)).then(resolve, reject),
  });

  return { dbi: builder as unknown as DbHandle, insert, update, del };
}

function makeSource(rows: SourceRow[]): ReconciliationSource {
  return { id: 'proposal_extraction', loadRows: async () => rows };
}

function makeRow(overrides: Partial<SourceRow> & { sourceRowId: string; ownerId: string }): SourceRow {
  return {
    companyName: 'Acme',
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

const NOW = new Date('2026-03-01T00:00:00.000Z');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('planReconciliation', () => {
  it('collapses two spellings from the same owner into one company, one relationship, no flag', async () => {
    const rows = [
      makeRow({ sourceRowId: 'r1', ownerId: 'o1', companyName: 'ACME SARL' }),
      makeRow({ sourceRowId: 'r2', ownerId: 'o1', companyName: 'Acme s.a.r.l.' }),
    ];
    const { dbi } = makeDbi({
      normalizeRows: [
        { raw: 'ACME SARL', norm: 'acme' },
        { raw: 'Acme s.a.r.l.', norm: 'acme' },
      ],
    });
    const plan = await planReconciliation({ dbi, source: makeSource(rows), now: NOW });
    expect(plan.companies).toHaveLength(1);
    expect(plan.relationships).toHaveLength(1);
    expect(plan.flaggedPairs).toHaveLength(0);
  });

  it('splits two distinct valid SIRENs under one owner+name into two companies with a "differing" flag (D-04)', async () => {
    const rows = [
      makeRow({ sourceRowId: 'r1', ownerId: 'o1', companyName: 'Acme', rawSiren: '111111111' }),
      makeRow({ sourceRowId: 'r2', ownerId: 'o1', companyName: 'Acme', rawSiren: '222222222' }),
    ];
    const { dbi } = makeDbi({ normalizeRows: [{ raw: 'Acme', norm: 'acme' }] });
    const plan = await planReconciliation({ dbi, source: makeSource(rows), now: NOW });
    expect(plan.companies).toHaveLength(2);
    expect(plan.flaggedPairs).toHaveLength(1);
    expect(plan.flaggedPairs[0]!.reason).toBe('differing');
  });

  it('flags two different owners with the same name and no SIREN as "both_missing" (criterion 4)', async () => {
    const rows = [
      makeRow({ sourceRowId: 'r1', ownerId: 'o1', companyName: 'Acme' }),
      makeRow({ sourceRowId: 'r2', ownerId: 'o2', companyName: 'Acme' }),
    ];
    const { dbi } = makeDbi({ normalizeRows: [{ raw: 'Acme', norm: 'acme' }] });
    const plan = await planReconciliation({ dbi, source: makeSource(rows), now: NOW });
    expect(plan.companies).toHaveLength(2);
    expect(plan.relationships).toHaveLength(2);
    expect(plan.flaggedPairs).toHaveLength(1);
    expect(plan.flaggedPairs[0]!.reason).toBe('both_missing');
  });

  it('flags two different owners, one with a SIREN and one without, as "one_missing"', async () => {
    const rows = [
      makeRow({ sourceRowId: 'r1', ownerId: 'o1', companyName: 'Acme', rawSiren: '111111111' }),
      makeRow({ sourceRowId: 'r2', ownerId: 'o2', companyName: 'Acme' }),
    ];
    const { dbi } = makeDbi({ normalizeRows: [{ raw: 'Acme', norm: 'acme' }] });
    const plan = await planReconciliation({ dbi, source: makeSource(rows), now: NOW });
    expect(plan.flaggedPairs).toHaveLength(1);
    expect(plan.flaggedPairs[0]!.reason).toBe('one_missing');
  });

  it('auto-merges two owners sharing one valid SIREN under different spellings — one company, two relationships, no flag (criterion 3)', async () => {
    const rows = [
      makeRow({ sourceRowId: 'r1', ownerId: 'o1', companyName: 'ACME SARL', rawSiren: '111111111', occurredAt: new Date('2026-01-01T00:00:00.000Z') }),
      makeRow({ sourceRowId: 'r2', ownerId: 'o2', companyName: 'Acme S.A.R.L.', rawSiren: '111111111', occurredAt: new Date('2026-01-02T00:00:00.000Z') }),
    ];
    const { dbi } = makeDbi({
      normalizeRows: [
        { raw: 'ACME SARL', norm: 'acme' },
        { raw: 'Acme S.A.R.L.', norm: 'acme' },
      ],
    });
    const plan = await planReconciliation({ dbi, source: makeSource(rows), now: NOW });
    expect(plan.companies).toHaveLength(1);
    expect(plan.relationships).toHaveLength(2);
    expect(plan.flaggedPairs).toHaveLength(0);
  });

  it('suppresses a pair already recorded with verdict "kept_separate" (criterion 5)', async () => {
    const rows = [
      makeRow({ sourceRowId: 'r1', ownerId: 'o1', companyName: 'Acme' }),
      makeRow({ sourceRowId: 'r2', ownerId: 'o2', companyName: 'Acme' }),
    ];
    const { dbi } = makeDbi({
      normalizeRows: [{ raw: 'Acme', norm: 'acme' }],
      companyPairDecisions: [
        { sideAKey: 'owner:o1|name:acme', sideBKey: 'owner:o2|name:acme', verdict: 'kept_separate', survivorCompanyId: null },
      ],
    });
    const plan = await planReconciliation({ dbi, source: makeSource(rows), now: NOW });
    expect(plan.flaggedPairs).toHaveLength(0);
    expect(plan.suppressedPairs).toHaveLength(1);
    expect(plan.suppressedPairs[0]!.verdict).toBe('kept_separate');
  });

  it('resolves both sides of a "merged" verdict to the survivor company id, with no flag', async () => {
    const rows = [
      makeRow({ sourceRowId: 'r1', ownerId: 'o1', companyName: 'Acme' }),
      makeRow({ sourceRowId: 'r2', ownerId: 'o2', companyName: 'Acme' }),
    ];
    const { dbi } = makeDbi({
      normalizeRows: [{ raw: 'Acme', norm: 'acme' }],
      companyPairDecisions: [
        { sideAKey: 'owner:o1|name:acme', sideBKey: 'owner:o2|name:acme', verdict: 'merged', survivorCompanyId: 'survivor-co' },
      ],
    });
    const plan = await planReconciliation({ dbi, source: makeSource(rows), now: NOW });
    expect(plan.flaggedPairs).toHaveLength(0);
    expect(plan.companies.every((c) => c.existingCompanyId === 'survivor-co')).toBe(true);
  });

  it('marks a pending (null-verdict) decision as alreadyPending in the flagged pair', async () => {
    const rows = [
      makeRow({ sourceRowId: 'r1', ownerId: 'o1', companyName: 'Acme' }),
      makeRow({ sourceRowId: 'r2', ownerId: 'o2', companyName: 'Acme' }),
    ];
    const { dbi } = makeDbi({
      normalizeRows: [{ raw: 'Acme', norm: 'acme' }],
      companyPairDecisions: [
        { sideAKey: 'owner:o1|name:acme', sideBKey: 'owner:o2|name:acme', verdict: null, survivorCompanyId: null },
      ],
    });
    const plan = await planReconciliation({ dbi, source: makeSource(rows), now: NOW });
    expect(plan.flaggedPairs).toHaveLength(1);
    expect(plan.flaggedPairs[0]!.alreadyPending).toBe(true);
  });

  it('reports a blank company name as skipped and contributes nothing else (D-02)', async () => {
    const rows = [makeRow({ sourceRowId: 'r1', ownerId: 'o1', companyName: null })];
    const { dbi } = makeDbi({ normalizeRows: [] });
    const plan = await planReconciliation({ dbi, source: makeSource(rows), now: NOW });
    expect(plan.skipped).toEqual([{ sourceRowId: 'r1', reason: 'blank_company_name' }]);
    expect(plan.companies).toHaveLength(0);
    expect(plan.relationships).toHaveLength(0);
  });

  it('skips an already-linked row and plans no link for it (OQ-1)', async () => {
    const rows = [makeRow({ sourceRowId: 'r1', ownerId: 'o1', alreadyLinkedRelationshipId: 'rel-existing' })];
    const { dbi } = makeDbi({ normalizeRows: [] });
    const plan = await planReconciliation({ dbi, source: makeSource(rows), now: NOW });
    expect(plan.skipped).toEqual([{ sourceRowId: 'r1', reason: 'already_linked' }]);
    expect(plan.proposalLinks).toHaveLength(0);
  });

  it('skips a phone/email-bearing row with no contact name (D-07)', async () => {
    const rows = [
      makeRow({ sourceRowId: 'r1', ownerId: 'o1', contactName: null, contactPhone: '0102030405', contactEmail: 'a@b.example' }),
    ];
    const { dbi } = makeDbi({ normalizeRows: [{ raw: 'Acme', norm: 'acme' }] });
    const plan = await planReconciliation({ dbi, source: makeSource(rows), now: NOW });
    expect(plan.contacts).toHaveLength(0);
    expect(plan.skipped).toContainEqual({ sourceRowId: 'r1', reason: 'contact_without_name' });
  });

  it('merges two rows sharing an email into one contact, filling blanks without overwriting populated fields (D-06)', async () => {
    const rows = [
      makeRow({ sourceRowId: 'r1', ownerId: 'o1', contactName: 'Jean Dupont', contactEmail: 'jean@x.example', contactRole: 'Directeur', contactPhone: null }),
      makeRow({ sourceRowId: 'r2', ownerId: 'o1', contactName: 'Jean Dupont', contactEmail: 'jean@x.example', contactRole: null, contactPhone: '0102030405' }),
    ];
    const { dbi } = makeDbi({ normalizeRows: [{ raw: 'Acme', norm: 'acme' }] });
    const plan = await planReconciliation({ dbi, source: makeSource(rows), now: NOW });
    expect(plan.contacts).toHaveLength(1);
    expect(plan.contacts[0]).toMatchObject({ role: 'Directeur', phone: '0102030405' });
    expect(plan.contacts[0]!.mergedFromSourceRowIds).toHaveLength(2);
  });

  it('merges two emailless rows with case/accent-differing identical names into one contact (D-06 name fallback)', async () => {
    const rows = [
      makeRow({ sourceRowId: 'r1', ownerId: 'o1', contactName: 'ÉLODIE Martin' }),
      makeRow({ sourceRowId: 'r2', ownerId: 'o1', contactName: 'elodie martin' }),
    ];
    const { dbi } = makeDbi({ normalizeRows: [{ raw: 'Acme', norm: 'acme' }] });
    const plan = await planReconciliation({ dbi, source: makeSource(rows), now: NOW });
    expect(plan.contacts).toHaveLength(1);
  });

  it('picks the most frequent raw spelling as canonicalName (OQ-2)', async () => {
    const rows = [
      makeRow({ sourceRowId: 'r1', ownerId: 'o1', companyName: 'Acme' }),
      makeRow({ sourceRowId: 'r2', ownerId: 'o1', companyName: 'Acme' }),
      makeRow({ sourceRowId: 'r3', ownerId: 'o1', companyName: 'ACME SA' }),
    ];
    const { dbi } = makeDbi({
      normalizeRows: [
        { raw: 'Acme', norm: 'acme' },
        { raw: 'ACME SA', norm: 'acme' },
      ],
    });
    const plan = await planReconciliation({ dbi, source: makeSource(rows), now: NOW });
    expect(plan.companies).toHaveLength(1);
    expect(plan.companies[0]!.canonicalName).toBe('Acme');
  });

  it('produces two deeply equal plans (apart from generatedAt) across two calls over identical input — determinism (D-15)', async () => {
    const rows = [
      makeRow({ sourceRowId: 'r1', ownerId: 'o1', companyName: 'ACME SARL', rawSiren: '111111111' }),
      makeRow({ sourceRowId: 'r2', ownerId: 'o2', companyName: 'Acme S.A.R.L.', rawSiren: '111111111' }),
      makeRow({ sourceRowId: 'r3', ownerId: 'o3', companyName: 'Acme' }),
    ];
    const fixtures: Fixtures = {
      normalizeRows: [
        { raw: 'ACME SARL', norm: 'acme' },
        { raw: 'Acme S.A.R.L.', norm: 'acme' },
        { raw: 'Acme', norm: 'acme' },
      ],
    };
    const run1 = makeDbi(fixtures);
    const run2 = makeDbi(fixtures);
    const plan1 = await planReconciliation({ dbi: run1.dbi, source: makeSource(rows), now: new Date('2026-01-01T00:00:00.000Z') });
    const plan2 = await planReconciliation({ dbi: run2.dbi, source: makeSource(rows), now: new Date('2026-02-02T00:00:00.000Z') });
    const { generatedAt: _g1, ...rest1 } = plan1;
    const { generatedAt: _g2, ...rest2 } = plan2;
    expect(rest1).toEqual(rest2);
  });

  it('performs zero writes — insert/update/delete are never called', async () => {
    const rows = [
      makeRow({ sourceRowId: 'r1', ownerId: 'o1', companyName: 'ACME SARL', rawSiren: '111111111' }),
      makeRow({ sourceRowId: 'r2', ownerId: 'o2', companyName: 'Acme S.A.R.L.', rawSiren: '111111111' }),
      makeRow({ sourceRowId: 'r3', ownerId: 'o3', companyName: 'Acme' }),
      makeRow({ sourceRowId: 'r4', ownerId: 'o4', companyName: 'Acme' }),
      makeRow({ sourceRowId: 'r5', ownerId: 'o1', companyName: null }),
      makeRow({ sourceRowId: 'r6', ownerId: 'o1', alreadyLinkedRelationshipId: 'rel-1' }),
    ];
    const { dbi, insert, update, del } = makeDbi({
      normalizeRows: [
        { raw: 'ACME SARL', norm: 'acme' },
        { raw: 'Acme S.A.R.L.', norm: 'acme' },
        { raw: 'Acme', norm: 'acme' },
      ],
    });
    await planReconciliation({ dbi, source: makeSource(rows), now: NOW });
    expect(insert).toHaveBeenCalledTimes(0);
    expect(update).toHaveBeenCalledTimes(0);
    expect(del).toHaveBeenCalledTimes(0);
  });
});

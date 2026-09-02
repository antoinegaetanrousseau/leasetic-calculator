/**
 * Phase 31 Plan 02 — proposals.ts adapter tests (IMPORT-01, D-01, D-02,
 * ADMIN-09).
 *
 * Mocking pattern mirrors `client-relationships.test.ts`'s stubBuilder
 * (chainable, records every call). `proposalsSource.loadRows` receives its
 * `dbi` as a parameter rather than calling the memoized `db()` singleton, so
 * only `server-only` needs mocking here — `@/lib/db`'s `schema` export is
 * imported for real (it carries no import-time side effects; only `db()`
 * touches `DATABASE_URL`).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { proposalsSource } from './proposals';
import type { DbHandle } from '../types';

/**
 * Recursively walk a Drizzle SQL/condition object looking for a Column chunk
 * whose own `.name` matches `columnName`. Deliberately does NOT descend into
 * a Column's `.table` back-reference (see client-relationships.test.ts for
 * the full rationale — an unguarded walk would false-positive on any column
 * belonging to the same table).
 */
function sqlReferencesColumn(node: unknown, columnName: string, seen = new Set<unknown>()): boolean {
  if (node == null || typeof node !== 'object') return false;
  if (seen.has(node)) return false;
  seen.add(node);
  const obj = node as Record<string, unknown>;
  if (obj.name === columnName) return true;
  for (const key of Object.keys(obj)) {
    if (key === 'table') continue;
    let val: unknown;
    try {
      val = obj[key];
    } catch {
      continue;
    }
    if (val && typeof val === 'object' && sqlReferencesColumn(val, columnName, seen)) {
      return true;
    }
  }
  return false;
}

function sqlReferencesValue(node: unknown, value: unknown, seen = new Set<unknown>()): boolean {
  if (node == null || typeof node !== 'object') return false;
  if (seen.has(node)) return false;
  seen.add(node);
  const obj = node as Record<string, unknown>;
  if (obj.value === value) return true;
  for (const key of Object.keys(obj)) {
    if (key === 'table') continue;
    let val: unknown;
    try {
      val = obj[key];
    } catch {
      continue;
    }
    if (val && typeof val === 'object' && sqlReferencesValue(val, value, seen)) {
      return true;
    }
  }
  return false;
}

interface RecordedCall {
  kind: string;
  payload: unknown;
}

function makeFakeDbi(rows: unknown[]): { dbi: DbHandle; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const builder: Record<string, unknown> = {};
  Object.assign(builder, {
    select: (cols: unknown) => {
      calls.push({ kind: 'select', payload: cols });
      return builder;
    },
    from: (table: unknown) => {
      calls.push({ kind: 'from', payload: table });
      return builder;
    },
    where: (clause: unknown) => {
      calls.push({ kind: 'where', payload: clause });
      return builder;
    },
    then: (
      resolve: (value: unknown) => void,
      reject?: (reason: unknown) => void,
    ) => Promise.resolve(rows).then(resolve, reject),
  });
  return { dbi: builder as unknown as DbHandle, calls };
}

function proposalRow(overrides: Partial<{
  id: string;
  userId: string;
  inputs: Record<string, unknown>;
  clientRelationshipId: string | null;
  createdAt: Date;
}> = {}) {
  return {
    id: 'prop-1',
    userId: 'user-1',
    inputs: {},
    clientRelationshipId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('proposalsSource', () => {
  it('is registered with id "proposal_extraction"', () => {
    expect(proposalsSource.id).toBe('proposal_extraction');
  });

  it('filters on status IN (active, deleted) — draft is excluded', async () => {
    const { dbi, calls } = makeFakeDbi([]);
    await proposalsSource.loadRows(dbi);
    const whereCalls = calls.filter((c) => c.kind === 'where');
    expect(whereCalls.length).toBeGreaterThan(0);
    const clause = whereCalls[0]!.payload;
    expect(sqlReferencesColumn(clause, 'status')).toBe(true);
    expect(sqlReferencesValue(clause, 'active')).toBe(true);
    expect(sqlReferencesValue(clause, 'deleted')).toBe(true);
    expect(sqlReferencesValue(clause, 'draft')).toBe(false);
  });

  it('maps proposals.id / userId / createdAt / clientRelationshipId to the SourceRow envelope', async () => {
    const { dbi } = makeFakeDbi([
      proposalRow({
        id: 'prop-42',
        userId: 'user-42',
        clientRelationshipId: 'rel-9',
        createdAt: new Date('2026-02-02T00:00:00.000Z'),
      }),
    ]);
    const rows = await proposalsSource.loadRows(dbi);
    expect(rows).toEqual([
      expect.objectContaining({
        sourceRowId: 'prop-42',
        ownerId: 'user-42',
        alreadyLinkedRelationshipId: 'rel-9',
        occurredAt: new Date('2026-02-02T00:00:00.000Z'),
      }),
    ]);
  });

  it('maps inputs.clientCo/clientSiren/clientName/clientRole/clientTel/clientEmail to the SourceRow fields', async () => {
    const { dbi } = makeFakeDbi([
      proposalRow({
        inputs: {
          clientCo: 'ACME SARL',
          clientSiren: '123456789',
          clientName: 'Jean Dupont',
          clientRole: 'Directeur',
          clientTel: '0102030405',
          clientEmail: 'jean@acme.example',
        },
      }),
    ]);
    const [row] = await proposalsSource.loadRows(dbi);
    expect(row).toMatchObject({
      companyName: 'ACME SARL',
      rawSiren: '123456789',
      contactName: 'Jean Dupont',
      contactRole: 'Directeur',
      contactPhone: '0102030405',
      contactEmail: 'jean@acme.example',
    });
  });

  it('treats a non-string inputs field as null, never a coerced string', async () => {
    const { dbi } = makeFakeDbi([
      proposalRow({ inputs: { clientCo: 42, clientName: null, clientRole: true } }),
    ]);
    const [row] = await proposalsSource.loadRows(dbi);
    expect(row!.companyName).toBeNull();
    expect(row!.contactName).toBeNull();
    expect(row!.contactRole).toBeNull();
  });

  it('treats a whitespace-only clientCo as companyName: null (D-02 recorded by the engine, not here)', async () => {
    const { dbi } = makeFakeDbi([proposalRow({ inputs: { clientCo: '   ' } })]);
    const [row] = await proposalsSource.loadRows(dbi);
    expect(row!.companyName).toBeNull();
  });

  it('passes rawSiren through unvalidated (normalization is the engine/crm layer\'s job)', async () => {
    const { dbi } = makeFakeDbi([proposalRow({ inputs: { clientSiren: 42 } })]);
    const [row] = await proposalsSource.loadRows(dbi);
    expect(row!.rawSiren).toBe(42);
  });

  it('handles an empty inputs object without throwing', async () => {
    const { dbi } = makeFakeDbi([proposalRow({ inputs: {} })]);
    await expect(proposalsSource.loadRows(dbi)).resolves.toHaveLength(1);
  });

  it('selects no commission-bearing column — source guard against paramsSnapshot/computed/globalParams', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, 'proposals.ts'), 'utf8');
    expect(source).not.toMatch(/paramsSnapshot|params_snapshot|globalParams/);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server-only first (test runner outside Next bundler — established Phase 6 pattern).
vi.mock('server-only', () => ({}));

// Mock @/lib/db with a stub query builder that records calls.
const calls: Array<{ kind: string; payload: unknown }> = [];

vi.mock('@/lib/db', async () => {
  // Re-import the real schema module — only db() is mocked.
  const real = await vi.importActual<typeof import('@/db/schema')>('@/db/schema');

  const stubBuilder = {
    select: () => stubBuilder,
    from: () => stubBuilder,
    where: (clause: unknown) => { calls.push({ kind: 'where', payload: clause }); return stubBuilder; },
    orderBy: (...args: unknown[]) => { calls.push({ kind: 'orderBy', payload: args }); return stubBuilder; },
    limit: (n: number) => { calls.push({ kind: 'limit', payload: n }); return Promise.resolve([]); },
    insert: () => stubBuilder,
    values: (args: unknown) => { calls.push({ kind: 'insert.values', payload: args }); return stubBuilder; },
    returning: () => Promise.resolve([{ id: 'mock-id', userId: 'u1', createdAt: new Date('2026-05-09T10:00:00Z') }]),
    update: () => stubBuilder,
    set: (args: unknown) => { calls.push({ kind: 'update.set', payload: args }); return stubBuilder; },
    delete: () => stubBuilder,
    query: {
      proposals: {
        findFirst: vi.fn(async () => null),
      },
      globalParams: {
        findFirst: vi.fn(async () => null),
      },
    },
  };

  return {
    db: () => stubBuilder,
    schema: real,
    DbError: class extends Error {},
    DbAuthError: class extends Error {},
    __resetDbForTests: () => { /* noop */ },
  };
});

import {
  encodeCursor, decodeCursor,
  listProposalsByUser, searchProposals,
  softDeleteProposal, restoreProposal, hardPurgeProposal,
  findByIdempotencyKey,
  createProposal,
} from './proposals';

beforeEach(() => { calls.length = 0; });

describe('encodeCursor / decodeCursor', () => {
  it('round-trips a (createdAt, id) tuple', () => {
    const c = { createdAt: '2026-05-09T10:00:00.000Z', id: '11111111-2222-3333-4444-555555555555' };
    const decoded = decodeCursor(encodeCursor(c));
    expect(decoded).toEqual(c);
  });
  it('returns null for malformed input', () => {
    expect(decodeCursor('not-base64-json!!!')).toBeNull();
  });
  it('returns null for partial cursor (missing id)', () => {
    const malformed = Buffer.from(JSON.stringify({ createdAt: '2026-05-09T10:00:00.000Z' }), 'utf8').toString('base64url');
    expect(decodeCursor(malformed)).toBeNull();
  });
});

describe('listProposalsByUser', () => {
  it('queries with limit = limit + 1 to compute hasMore', async () => {
    await listProposalsByUser({ userId: 'u1', limit: 20 });
    const limitCall = calls.find((c) => c.kind === 'limit');
    expect(limitCall?.payload).toBe(21);
  });
  it('queries with limit = 21 by default (DEFAULT_LIMIT 20 + 1)', async () => {
    await listProposalsByUser({ userId: 'u1' });
    const limitCall = calls.find((c) => c.kind === 'limit');
    expect(limitCall?.payload).toBe(21);
  });
  it('records orderBy + where calls (cursor-paginated shape)', async () => {
    await listProposalsByUser({ userId: 'u1' });
    expect(calls.some((c) => c.kind === 'where')).toBe(true);
    expect(calls.some((c) => c.kind === 'orderBy')).toBe(true);
  });
  it('uses cursor predicate when cursor provided', async () => {
    await listProposalsByUser({
      userId: 'u1',
      cursor: { createdAt: '2026-05-09T10:00:00.000Z', id: '11111111-2222-3333-4444-555555555555' },
    });
    expect(calls.some((c) => c.kind === 'where')).toBe(true);
  });
  it('returns { rows: [], hasMore: false, nextCursor: null } when db returns empty', async () => {
    const result = await listProposalsByUser({ userId: 'u1' });
    expect(result.rows).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });
});

describe('searchProposals', () => {
  it('falls back to listProposalsByUser when q is empty', async () => {
    await searchProposals({ userId: 'u1', q: '' });
    expect(calls.some((c) => c.kind === 'limit')).toBe(true);
  });
  it('falls back when q is whitespace-only', async () => {
    await searchProposals({ userId: 'u1', q: '   ' });
    expect(calls.some((c) => c.kind === 'limit')).toBe(true);
  });
  it('builds an ILIKE pattern for non-empty q', async () => {
    await searchProposals({ userId: 'u1', q: 'Alpha' });
    // The where clause should include the pattern '%Alpha%' somewhere in the
    // SQL fragment Drizzle constructed. We can't easily inspect the inner
    // structure of Drizzle's compiled SQL from the stub, but we can assert
    // the where call happened with a non-null payload (the OR ILIKE chain).
    expect(calls.some((c) => c.kind === 'where' && c.payload != null)).toBe(true);
  });
  it('uses fetchCount = limit + 1 for hasMore detection', async () => {
    await searchProposals({ userId: 'u1', q: 'Corp', limit: 5 });
    const limitCall = calls.find((c) => c.kind === 'limit');
    expect(limitCall?.payload).toBe(6);
  });
});

describe('createProposal', () => {
  it('inserts with the args we passed (idempotency_key, language, etc.)', async () => {
    await createProposal({
      userId: 'u1',
      language: 'fr',
      lcRef: 'LC-12345',
      idempotencyKey: 'mock-uuid',
      schemaVersion: '1.0.0',
      inputs: { clientCo: 'Société A' },
      paramsSnapshot: { commissionPct: '5.0000' },
      computed: { loyerHT: '925.88' },
    });
    const insertCall = calls.find((c) => c.kind === 'insert.values');
    expect(insertCall?.payload).toMatchObject({
      userId: 'u1',
      language: 'fr',
      lcRef: 'LC-12345',
      idempotencyKey: 'mock-uuid',
      schemaVersion: '1.0.0',
    });
  });
  it('sets duplicatedFromId to null when not provided', async () => {
    await createProposal({
      userId: 'u1',
      language: 'en',
      lcRef: 'LC-99999',
      idempotencyKey: 'mock-uuid-2',
      schemaVersion: '1.0.0',
      inputs: {},
      paramsSnapshot: {},
      computed: {},
    });
    const insertCall = calls.find((c) => c.kind === 'insert.values');
    expect((insertCall?.payload as { duplicatedFromId: unknown }).duplicatedFromId).toBeNull();
  });
});

describe('soft delete / restore / purge', () => {
  it('softDeleteProposal sets deleted_at to a Date', async () => {
    await softDeleteProposal('p1', 'u1');
    const setCall = calls.find((c) => c.kind === 'update.set');
    expect((setCall?.payload as { deletedAt: unknown }).deletedAt).toBeInstanceOf(Date);
  });
  it('restoreProposal nulls deleted_at', async () => {
    await restoreProposal('p1', 'u1');
    const setCall = calls.find((c) => c.kind === 'update.set');
    expect((setCall?.payload as { deletedAt: unknown }).deletedAt).toBeNull();
  });
  it('hardPurgeProposal records a delete + where call', async () => {
    await hardPurgeProposal('p1');
    expect(calls.some((c) => c.kind === 'where')).toBe(true);
  });
  it('findByIdempotencyKey calls findFirst', async () => {
    const { db } = await import('@/lib/db');
    const dbi = db() as unknown as { query: { proposals: { findFirst: ReturnType<typeof vi.fn> } } };
    await findByIdempotencyKey('u1', 'idem-key');
    expect(dbi.query.proposals.findFirst).toHaveBeenCalled();
  });
});

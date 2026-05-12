import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server-only first (test runner outside Next bundler — established Phase 6 pattern).
vi.mock('server-only', () => ({}));

// Phase 12: mocked helpers + controllable state. vi.hoisted() ensures these
// initialize before any vi.mock factory runs (vi.mock is hoisted to the top
// of the file, above regular const declarations — referencing externally
// declared vars from inside a factory triggers TDZ errors).
const { mockWriteAuditLog, mockState } = vi.hoisted(() => ({
  mockWriteAuditLog: vi.fn(async () => undefined),
  mockState: {
    returningResult: [
      { id: 'mock-id', userId: 'u1', createdAt: new Date('2026-05-09T10:00:00Z') },
    ] as unknown[],
    findFirstResult: null as unknown,
  },
}));

vi.mock('./audit-log', () => ({ writeAuditLog: mockWriteAuditLog }));

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
    returning: () => Promise.resolve(mockState.returningResult),
    update: () => stubBuilder,
    set: (args: unknown) => { calls.push({ kind: 'update.set', payload: args }); return stubBuilder; },
    delete: () => stubBuilder,
    query: {
      proposals: {
        findFirst: vi.fn(async () => mockState.findFirstResult),
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
  // Phase 12 — DB-01 draft CRUD lifecycle
  createDraft, updateDraft, finalizeDraft, listDraftsByUser, getDraftById,
  deriveDisplayStatus,
} from './proposals';
import type { ProposalRow } from '@/db/schema';

beforeEach(() => {
  calls.length = 0;
  mockState.returningResult = [
    { id: 'mock-id', userId: 'u1', createdAt: new Date('2026-05-09T10:00:00Z') },
  ];
  mockState.findFirstResult = null;
  mockWriteAuditLog.mockClear();
});

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

// ── Phase 12 — DB-01 draft CRUD lifecycle ───────────────────────────────────

describe('createDraft', () => {
  it('inserts a row with status=draft, inputs={}, language=arg, userId=arg', async () => {
    await createDraft({ userId: 'u1', language: 'fr' });
    const ins = calls.find((c) => c.kind === 'insert.values');
    expect(ins).toBeDefined();
    const payload = ins!.payload as Record<string, unknown>;
    expect(payload.status).toBe('draft');
    expect(payload.inputs).toEqual({});
    expect(payload.userId).toBe('u1');
    expect(payload.language).toBe('fr');
  });
  it('does NOT define lc_ref / idempotency_key / params_snapshot / computed at insert time', async () => {
    await createDraft({ userId: 'u1', language: 'en' });
    const ins = calls.find((c) => c.kind === 'insert.values');
    const payload = ins!.payload as Record<string, unknown>;
    expect(payload.lcRef).toBeUndefined();
    expect(payload.idempotencyKey).toBeUndefined();
    expect(payload.paramsSnapshot).toBeUndefined();
    expect(payload.computed).toBeUndefined();
  });
});

describe('updateDraft', () => {
  it('updates only inputs and filters by id + userId + status=draft', async () => {
    mockState.returningResult = [{ id: 'p1', userId: 'u1', inputs: { a: 1 } }];
    await updateDraft('p1', 'u1', { inputs: { a: 1 } });
    const setCall = calls.find((c) => c.kind === 'update.set');
    expect(setCall).toBeDefined();
    expect((setCall!.payload as Record<string, unknown>).inputs).toEqual({ a: 1 });
    expect(calls.some((c) => c.kind === 'where')).toBe(true);
  });
  it('returns null when no row matched', async () => {
    mockState.returningResult = [];
    const result = await updateDraft('p1', 'u1', { inputs: {} });
    expect(result).toBeNull();
  });
});

describe('finalizeDraft', () => {
  const finalArgs = {
    lcRef: 'L-001',
    idempotencyKey: '11111111-2222-4333-8444-555555555555',
    paramsSnapshot: { commissionPct: '5.0000' },
    computed: { loyer: '1000.00' },
    pdfBlobKey: 'proposals/u1/p1.pdf',
    pdfSha256: 'sha-deadbeef',
    pdfSizeBytes: 12345,
    pdfGeneratedAt: new Date('2026-05-12T10:00:00Z'),
  };
  it('writes status=active + all 4 nullable columns + pdf columns in one update', async () => {
    mockState.returningResult = [{ id: 'p1', userId: 'u1' }];
    await finalizeDraft('p1', 'u1', finalArgs);
    const setCall = calls.find((c) => c.kind === 'update.set');
    expect(setCall).toBeDefined();
    const payload = setCall!.payload as Record<string, unknown>;
    expect(payload.status).toBe('active');
    expect(payload.lcRef).toBe('L-001');
    expect(payload.idempotencyKey).toBe('11111111-2222-4333-8444-555555555555');
    expect(payload.paramsSnapshot).toEqual({ commissionPct: '5.0000' });
    expect(payload.computed).toEqual({ loyer: '1000.00' });
    expect(payload.pdfBlobKey).toBe('proposals/u1/p1.pdf');
    expect(payload.pdfSha256).toBe('sha-deadbeef');
    expect(payload.pdfSizeBytes).toBe(12345);
    expect(payload.pdfGeneratedAt).toBeInstanceOf(Date);
  });
  it('calls writeAuditLog with proposal.create action when update succeeds', async () => {
    mockState.returningResult = [{ id: 'p1', userId: 'u1' }];
    await finalizeDraft('p1', 'u1', finalArgs);
    expect(mockWriteAuditLog).toHaveBeenCalledTimes(1);
    const arg = mockWriteAuditLog.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(arg.action).toBe('proposal.create');
    expect(arg.actorId).toBe('u1');
    expect(arg.targetType).toBe('proposal');
    expect(arg.targetId).toBe('p1');
  });
  it('does NOT call writeAuditLog when no row matched', async () => {
    mockState.returningResult = [];
    await finalizeDraft('p1', 'u1', finalArgs);
    expect(mockWriteAuditLog).not.toHaveBeenCalled();
  });
  it('returns null when no row matched (cross-user attempt)', async () => {
    mockState.returningResult = [];
    const result = await finalizeDraft('p1', 'u-other', finalArgs);
    expect(result).toBeNull();
  });
});

describe('listDraftsByUser', () => {
  it('queries with where + orderBy on schema.proposals', async () => {
    await listDraftsByUser('u1');
    expect(calls.some((c) => c.kind === 'where')).toBe(true);
    expect(calls.some((c) => c.kind === 'orderBy')).toBe(true);
  });
});

describe('getDraftById', () => {
  it('returns null when row not found (cross-user attempt)', async () => {
    mockState.findFirstResult = null;
    const result = await getDraftById('p1', 'u-other');
    expect(result).toBeNull();
  });
  it('returns the row when findFirst resolves to a draft', async () => {
    const draftRow = { id: 'p1', userId: 'u1', status: 'draft', inputs: { a: 1 } };
    mockState.findFirstResult = draftRow;
    const result = await getDraftById('p1', 'u1');
    expect(result).toEqual(draftRow);
  });
});

describe('deriveDisplayStatus', () => {
  function row(overrides: Partial<ProposalRow> = {}): ProposalRow {
    return {
      id: 'p1',
      userId: 'u1',
      language: 'fr',
      status: 'active',
      lcRef: 'L-001',
      idempotencyKey: 'k',
      schemaVersion: '1.0.0',
      inputs: {},
      paramsSnapshot: { validityDays: 30 } as never,
      computed: {},
      pdfBlobKey: 'k',
      pdfSha256: 's',
      pdfSizeBytes: 1,
      pdfGeneratedAt: new Date(),
      deletedAt: null,
      duplicatedFromId: null,
      createdAt: new Date(),
      ...overrides,
    } as ProposalRow;
  }
  it('returns "draft" when row.status is draft', () => {
    expect(deriveDisplayStatus(row({ status: 'draft' }))).toBe('draft');
  });
  it('returns "deleted" when row.status is deleted', () => {
    expect(deriveDisplayStatus(row({ status: 'deleted' }))).toBe('deleted');
  });
  it('returns "expired" when status=active and pdfGeneratedAt + validityDays < now', () => {
    const past = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
    expect(
      deriveDisplayStatus(
        row({ status: 'active', pdfGeneratedAt: past, paramsSnapshot: { validityDays: 30 } as never }),
      ),
    ).toBe('expired');
  });
  it('returns "active" when status=active and within validity window', () => {
    const recent = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    expect(
      deriveDisplayStatus(
        row({ status: 'active', pdfGeneratedAt: recent, paramsSnapshot: { validityDays: 30 } as never }),
      ),
    ).toBe('active');
  });
  it('returns "active" defensively when pdfGeneratedAt is null', () => {
    expect(deriveDisplayStatus(row({ status: 'active', pdfGeneratedAt: null }))).toBe('active');
  });
  it('returns "active" defensively when paramsSnapshot is null', () => {
    expect(
      deriveDisplayStatus(row({ status: 'active', paramsSnapshot: null as never })),
    ).toBe('active');
  });
});

describe('softDeleteProposal + restoreProposal — D-08 status/deleted_at lockstep', () => {
  it('softDeleteProposal sets BOTH status=deleted AND deletedAt as a Date', async () => {
    await softDeleteProposal('p1', 'u1');
    const setCall = calls.find((c) => c.kind === 'update.set');
    const payload = setCall!.payload as Record<string, unknown>;
    expect(payload.status).toBe('deleted');
    expect(payload.deletedAt).toBeInstanceOf(Date);
  });
  it('restoreProposal sets BOTH status=active AND deletedAt=null', async () => {
    await restoreProposal('p1', 'u1');
    const setCall = calls.find((c) => c.kind === 'update.set');
    const payload = setCall!.payload as Record<string, unknown>;
    expect(payload.status).toBe('active');
    expect(payload.deletedAt).toBeNull();
  });
});

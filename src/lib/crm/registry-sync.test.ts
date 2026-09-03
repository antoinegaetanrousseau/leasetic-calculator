/**
 * Phase 34 Plan 07 Task 1 — `syncCompanyRegistry` tests.
 *
 * Mocking pattern copied from `src/lib/crm/actions.test.ts`: a queue-based
 * chainable db-builder stub, `@/lib/db` re-exporting the REAL `@/db/schema`
 * so the drizzle `eq()` in the module under test operates on real Column
 * objects. NO test performs a network call — `@/lib/registry/recherche-entreprises`
 * is mocked wholesale.
 *
 * The builder here adds one thing the 30-05 harness did not need: an update
 * chain that is AWAITED without `.returning()`. Drizzle's update builder is a
 * thenable, so the stub exposes `then` and settles from the same result queue.
 * Queueing an `Error` makes that settle REJECT, which is how the
 * `companies.siren` unique-violation case (34-PATTERNS trap 10) is simulated.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

interface MockCall {
  kind: string;
  payload?: unknown;
}

const { mockState } = vi.hoisted(() => ({
  mockState: {
    resultQueue: [] as unknown[],
    calls: [] as MockCall[],
  },
}));

function nextResult(): unknown {
  if (mockState.resultQueue.length === 0) {
    throw new Error('mock db: resultQueue exhausted — test queued too few results');
  }
  return mockState.resultQueue.shift();
}

/** An queued `Error` settles as a REJECTION — the driver-failure simulation. */
function settle(): Promise<unknown> {
  const value = nextResult();
  return value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
}

vi.mock('@/lib/db', async () => {
  const real = await vi.importActual<typeof import('@/db/schema')>('@/db/schema');

  function makeSelectBuilder(): Record<string, unknown> {
    const builder: Record<string, unknown> = { _whereClause: undefined as unknown };
    Object.assign(builder, {
      from: (table: unknown) => {
        mockState.calls.push({ kind: 'from', payload: table });
        return builder;
      },
      where: (clause: unknown) => {
        mockState.calls.push({ kind: 'where', payload: clause });
        builder._whereClause = clause;
        return builder;
      },
      limit: () => settle(),
      getSQL: () => builder._whereClause,
    });
    return builder;
  }

  function makeUpdateBuilder(table: unknown): Record<string, unknown> {
    mockState.calls.push({ kind: 'update', payload: table });
    const builder: Record<string, unknown> = {};
    Object.assign(builder, {
      set: (v: unknown) => {
        mockState.calls.push({ kind: 'set', payload: v });
        return builder;
      },
      where: (clause: unknown) => {
        mockState.calls.push({ kind: 'where', payload: clause });
        return builder;
      },
      returning: () => settle(),
      // Drizzle's update builder is a thenable; awaiting it without
      // `.returning()` executes the statement. Same result queue.
      then: (onOk: (v: unknown) => unknown, onErr: (e: unknown) => unknown) =>
        settle().then(onOk, onErr),
    });
    return builder;
  }

  const dbInstance = {
    select: (cols: unknown) => {
      mockState.calls.push({ kind: 'select', payload: cols });
      return makeSelectBuilder();
    },
    update: (table: unknown) => makeUpdateBuilder(table),
  };

  return {
    db: () => dbInstance,
    schema: real,
    DbError: class extends Error {},
    DbAuthError: class extends Error {},
    __resetDbForTests: () => { /* noop */ },
  };
});

const { lookupCompanyBySirenMock, insertRelationshipEventForOwnerMock } = vi.hoisted(() => ({
  lookupCompanyBySirenMock: vi.fn(),
  insertRelationshipEventForOwnerMock: vi.fn(),
}));

vi.mock('@/lib/registry/recherche-entreprises', () => ({
  lookupCompanyBySiren: lookupCompanyBySirenMock,
}));
vi.mock('@/lib/db/queries', () => ({
  insertRelationshipEventForOwner: insertRelationshipEventForOwnerMock,
}));

import { syncCompanyRegistry } from './registry-sync';

const IDENTITY = {
  legalName: 'DUPONT MENUISERIE',
  addressLine: '12 RUE DES LILAS',
  postalCode: '75011',
  city: 'PARIS',
  legalForm: '5499',
  nafCode: '43.32A',
  nafSection: 'F',
  headcountBand: '12',
  foundedOn: '2014-06-01',
  registryState: 'A',
};

/** The exact `.set()` key set on the success branch: ten identity columns
 * plus the two registry-status columns plus `updatedAt`. */
const SYNCED_SET_KEYS = [
  'addressLine',
  'city',
  'foundedOn',
  'headcountBand',
  'legalForm',
  'legalName',
  'nafCode',
  'nafSection',
  'postalCode',
  'registryState',
  'registryStatus',
  'registrySyncedAt',
  'updatedAt',
];

const ARGS = {
  companyId: 'company-1',
  siren: '123456789',
  relationshipId: 'rel-1',
  actorId: 'user-1',
  ownerId: 'user-1',
};

function setPayload(): Record<string, unknown> {
  const call = mockState.calls.find((c) => c.kind === 'set');
  if (!call) throw new Error('no .set() was recorded');
  return call.payload as Record<string, unknown>;
}

beforeEach(() => {
  mockState.resultQueue = [];
  mockState.calls = [];
  lookupCompanyBySirenMock.mockReset();
  insertRelationshipEventForOwnerMock.mockReset();
  insertRelationshipEventForOwnerMock.mockResolvedValue({ id: 'event-1' });
});

afterEach(() => vi.clearAllMocks());

describe('syncCompanyRegistry — the success branch', () => {
  it('writes the ten identity columns, the synced status and the sync timestamp, and appends a registry_synced event to the CALLER\'s relationship', async () => {
    lookupCompanyBySirenMock.mockResolvedValue({ ok: true, data: IDENTITY });
    mockState.resultQueue = [[]];

    const result = await syncCompanyRegistry(ARGS);

    expect(result).toEqual({ ok: true });

    const payload = setPayload();
    expect(Object.keys(payload).sort()).toEqual(SYNCED_SET_KEYS);
    expect(payload.legalName).toBe('DUPONT MENUISERIE');
    expect(payload.nafSection).toBe('F');
    expect(payload.registryState).toBe('A');
    expect(payload.registryStatus).toBe('synced');
    expect(payload.registrySyncedAt).toBeInstanceOf(Date);
    expect(payload.updatedAt).toBeInstanceOf(Date);

    expect(insertRelationshipEventForOwnerMock).toHaveBeenCalledTimes(1);
    expect(insertRelationshipEventForOwnerMock).toHaveBeenCalledWith({
      relationshipId: 'rel-1',
      ownerId: 'user-1',
      kind: 'registry_synced',
      actorId: 'user-1',
      payload: { siren: '123456789' },
    });
  });

  it('updates the companies table scoped to the company id', async () => {
    lookupCompanyBySirenMock.mockResolvedValue({ ok: true, data: IDENTITY });
    mockState.resultQueue = [[]];

    await syncCompanyRegistry(ARGS);

    const updateCall = mockState.calls.find((c) => c.kind === 'update');
    expect(updateCall).toBeDefined();
    const table = updateCall!.payload as { [k: symbol]: unknown };
    expect(String((table as unknown as { _: { name: string } })._?.name ?? '')).toBe('companies');
  });

  it('with a null relationshipId still writes the columns and simply skips the event (the creation path)', async () => {
    lookupCompanyBySirenMock.mockResolvedValue({ ok: true, data: IDENTITY });
    mockState.resultQueue = [[]];

    const result = await syncCompanyRegistry({ ...ARGS, relationshipId: null });

    expect(result).toEqual({ ok: true });
    expect(Object.keys(setPayload()).sort()).toEqual(SYNCED_SET_KEYS);
    expect(insertRelationshipEventForOwnerMock).not.toHaveBeenCalled();
  });
});

describe('syncCompanyRegistry — the failure→status mapping', () => {
  it('maps not_found onto registry_status = not_found and NEVER blanks a previously synced identity', async () => {
    lookupCompanyBySirenMock.mockResolvedValue({ ok: false, reason: 'not_found' });
    mockState.resultQueue = [[]];

    const result = await syncCompanyRegistry(ARGS);

    expect(result).toEqual({ ok: false, reason: 'not_found' });
    // The whole point: the ONLY keys are the status and the timestamp. An
    // identity column here would destroy a good earlier sync.
    expect(Object.keys(setPayload()).sort()).toEqual(['registryStatus', 'updatedAt']);
    expect(setPayload().registryStatus).toBe('not_found');
  });

  it.each([
    ['timeout', 'pending'],
    ['upstream_error', 'pending'],
    ['malformed', 'error'],
  ])('maps %s onto registry_status = %s', async (reason, status) => {
    lookupCompanyBySirenMock.mockResolvedValue({ ok: false, reason });
    mockState.resultQueue = [[]];

    const result = await syncCompanyRegistry(ARGS);

    expect(result).toEqual({ ok: false, reason: 'unavailable' });
    expect(Object.keys(setPayload()).sort()).toEqual(['registryStatus', 'updatedAt']);
    expect(setPayload().registryStatus).toBe(status);
  });

  it.each(['not_found', 'timeout', 'upstream_error', 'malformed'])(
    'writes NO registry_synced event on the %s branch',
    async (reason) => {
      lookupCompanyBySirenMock.mockResolvedValue({ ok: false, reason });
      mockState.resultQueue = [[]];

      await syncCompanyRegistry(ARGS);

      expect(insertRelationshipEventForOwnerMock).not.toHaveBeenCalled();
    },
  );
});

describe('syncCompanyRegistry — it never throws (D-09)', () => {
  it.each([
    [{ ok: true, data: IDENTITY }],
    [{ ok: false, reason: 'not_found' }],
    [{ ok: false, reason: 'timeout' }],
    [{ ok: false, reason: 'upstream_error' }],
    [{ ok: false, reason: 'malformed' }],
  ])('resolves rather than rejecting for %j', async (lookup) => {
    lookupCompanyBySirenMock.mockResolvedValue(lookup);
    mockState.resultQueue = [[]];

    await expect(syncCompanyRegistry(ARGS)).resolves.toEqual(expect.objectContaining({ ok: expect.any(Boolean) }));
  });

  it('collapses a companies.siren unique violation raised by ANOTHER partner\'s data into unavailable (trap 10)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    lookupCompanyBySirenMock.mockResolvedValue({ ok: true, data: IDENTITY });
    // A queued Error makes the awaited UPDATE reject, exactly as the driver
    // would on `companies_siren_unique`.
    mockState.resultQueue = [
      new Error('duplicate key value violates unique constraint "companies_siren_unique"'),
    ];

    const result = await syncCompanyRegistry(ARGS);

    expect(result).toEqual({ ok: false, reason: 'unavailable' });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('resolves to unavailable when the lookup module itself rejects', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    lookupCompanyBySirenMock.mockRejectedValue(new Error('boom'));

    await expect(syncCompanyRegistry(ARGS)).resolves.toEqual({ ok: false, reason: 'unavailable' });
    consoleError.mockRestore();
  });

  it('still RESOLVES when the event insert fails — the identity write already landed and the caller is never given an exception', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    lookupCompanyBySirenMock.mockResolvedValue({ ok: true, data: IDENTITY });
    insertRelationshipEventForOwnerMock.mockRejectedValue(new Error('event insert failed'));
    mockState.resultQueue = [[]];

    // The columns go FIRST and the event second precisely because there is no
    // transaction: a lost timeline entry is the harmless direction.
    await expect(syncCompanyRegistry(ARGS)).resolves.toEqual({ ok: false, reason: 'unavailable' });
    expect(Object.keys(setPayload()).sort()).toEqual(SYNCED_SET_KEYS);
    consoleError.mockRestore();
  });
});

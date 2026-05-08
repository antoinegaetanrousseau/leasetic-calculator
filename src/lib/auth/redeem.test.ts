import { describe, it, expect, vi, beforeEach } from 'vitest';

// server-only: throws in non-Next.js (Vitest) context — mock to a no-op
vi.mock('server-only', () => ({}));

// Mock @node-rs/argon2 — hash returns a fixed string
vi.mock('@node-rs/argon2', () => ({
  hash: vi.fn().mockResolvedValue('$argon2id$v=19$fixed-hash'),
}));

// Mock node:crypto randomBytes used for new account IDs
vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>();
  return {
    ...actual,
    randomBytes: vi.fn().mockReturnValue(Buffer.from('deadbeef'.repeat(4), 'hex')),
  };
});

// Better Auth auth mock
const mockRevoke = vi.fn().mockResolvedValue(undefined);
vi.mock('./index', () => ({
  auth: () => ({ api: { revokeUserSessions: (a: unknown) => mockRevoke(a) } }),
}));

// Token mock
vi.mock('./tokens', () => ({
  hashToken: vi.fn().mockReturnValue('TEST_HASH'),
}));

// Schemas mock — passthrough the actual schemas but allow spy
vi.mock('./schemas', async (importOriginal) => {
  return importOriginal<typeof import('./schemas')>();
});

// DB state for each test
let mockRecord: Record<string, unknown> | null = null;
let mockUser: Record<string, unknown> | null = null;
let mockExistingAccount: Record<string, unknown> | null = null;

const dbUpdates: { table: string; set: unknown }[] = [];
const dbInserts: { table: string; values: unknown }[] = [];

const fakeSchema = {
  passwordResets: {
    tokenHash: 'tokenHash',
    kind: 'kind',
    usedAt: 'usedAt',
    expiresAt: 'expiresAt',
    id: 'id',
  },
  accounts: {
    userId: 'userId',
    providerId: 'providerId',
    id: 'id',
    password: 'password',
    updatedAt: 'updatedAt',
  },
  users: {
    id: 'id',
    sessionVersion: 'sessionVersion',
  },
};

const fakeDb = {
  query: {
    passwordResets: {
      findFirst: vi.fn(),
    },
    users: {
      findFirst: vi.fn(),
    },
    accounts: {
      findFirst: vi.fn(),
    },
  },
  update: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  }),
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockResolvedValue(undefined),
  }),
};

vi.mock('@/lib/db', () => ({
  db: () => fakeDb,
  schema: fakeSchema,
}));

import { redeemToken } from './redeem';

beforeEach(() => {
  vi.clearAllMocks();
  mockRecord = null;
  mockUser = null;
  mockExistingAccount = null;
  dbUpdates.length = 0;
  dbInserts.length = 0;
  mockRevoke.mockResolvedValue(undefined);

  // Default: valid record
  fakeDb.query.passwordResets.findFirst.mockResolvedValue(null);
  fakeDb.query.users.findFirst.mockResolvedValue(null);
  fakeDb.query.accounts.findFirst.mockResolvedValue(null);

  // Reset update/insert mocks
  fakeDb.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  });
  fakeDb.insert.mockReturnValue({
    values: vi.fn().mockResolvedValue(undefined),
  });
});

describe('redeemToken', () => {
  // Test 1: valid invite token — hashes password, upserts accounts row, marks usedAt
  it('Test 1: valid invite token returns ok:true, creates accounts row, marks usedAt', async () => {
    fakeDb.query.passwordResets.findFirst.mockResolvedValue({
      id: 'reset-1',
      userId: 'user-1',
      kind: 'invite',
      tokenHash: 'TEST_HASH',
      usedAt: null,
      expiresAt: new Date(Date.now() + 86400_000),
    });
    fakeDb.query.users.findFirst.mockResolvedValue({ id: 'user-1', email: 'user@example.com' });
    fakeDb.query.accounts.findFirst.mockResolvedValue(null); // no existing account

    const result = await redeemToken('PLAINTEXT_TOKEN', 'invite', 'Password1!', 'Password1!');

    expect(result).toEqual({ ok: true });
    // accounts INSERT must have been called (new credential row)
    expect(fakeDb.insert).toHaveBeenCalled();
    // usedAt update must have been called
    expect(fakeDb.update).toHaveBeenCalled();
  });

  // Test 2: invalid/missing token → { ok: false, reason: 'invalid' }
  it('Test 2: invalid/missing token returns ok:false reason:invalid', async () => {
    fakeDb.query.passwordResets.findFirst.mockResolvedValue(null);

    const result = await redeemToken('BAD_TOKEN', 'invite', 'Password1!', 'Password1!');

    expect(result).toEqual({ ok: false, reason: 'invalid' });
    // DB must NOT be mutated
    expect(fakeDb.update).not.toHaveBeenCalled();
    expect(fakeDb.insert).not.toHaveBeenCalled();
  });

  // Test 3: already-used token → { ok: false, reason: 'invalid' }, no mutation
  it('Test 3: already-used token returns ok:false reason:invalid, no DB mutation', async () => {
    // usedAt already set means the WHERE clause (isNull) would exclude it —
    // the mock returning null simulates the DB returning no record
    fakeDb.query.passwordResets.findFirst.mockResolvedValue(null);

    const result = await redeemToken('USED_TOKEN', 'invite', 'Password1!', 'Password1!');

    expect(result).toEqual({ ok: false, reason: 'invalid' });
    expect(fakeDb.update).not.toHaveBeenCalled();
    expect(fakeDb.insert).not.toHaveBeenCalled();
  });

  // Test 4: expired token → { ok: false, reason: 'invalid' }
  it('Test 4: expired token returns ok:false reason:invalid', async () => {
    // expiresAt in the past → gt() filter excludes it → findFirst returns null
    fakeDb.query.passwordResets.findFirst.mockResolvedValue(null);

    const result = await redeemToken('EXPIRED_TOKEN', 'invite', 'Password1!', 'Password1!');

    expect(result).toEqual({ ok: false, reason: 'invalid' });
  });

  // Test 5: wrong kind (passing 'reset' for invite token) → { ok: false, reason: 'invalid' }
  it('Test 5: wrong kind returns ok:false reason:invalid', async () => {
    // DB returns null because kind mismatch in WHERE clause
    fakeDb.query.passwordResets.findFirst.mockResolvedValue(null);

    // Caller passes kind='reset' but the token is an invite — DB WHERE kind='reset' won't find it
    const result = await redeemToken('INVITE_TOKEN', 'reset', 'Password1!', 'Password1!');

    expect(result).toEqual({ ok: false, reason: 'invalid' });
    expect(fakeDb.update).not.toHaveBeenCalled();
  });

  // Test 6: kind='reset' bumps sessionVersion
  it('Test 6: kind=reset bumps sessionVersion via update', async () => {
    fakeDb.query.passwordResets.findFirst.mockResolvedValue({
      id: 'reset-2',
      userId: 'user-2',
      kind: 'reset',
      tokenHash: 'TEST_HASH',
      usedAt: null,
      expiresAt: new Date(Date.now() + 86400_000),
    });
    fakeDb.query.users.findFirst.mockResolvedValue({ id: 'user-2', email: 'user2@example.com' });
    fakeDb.query.accounts.findFirst.mockResolvedValue({ id: 'acc-2', password: 'old-hash' });

    const result = await redeemToken('RESET_TOKEN', 'reset', 'Password1!', 'Password1!');

    expect(result).toEqual({ ok: true });
    // update called multiple times: one for accounts, one for usedAt, one for sessionVersion
    expect(fakeDb.update).toHaveBeenCalledTimes(3);
    // revokeUserSessions also called
    expect(mockRevoke).toHaveBeenCalledWith({ body: { userId: 'user-2' } });
  });

  // Test 7: too-short password → { ok: false, reason: 'invalid_password' }
  it('Test 7: too-short password returns ok:false reason:invalid_password', async () => {
    const result = await redeemToken('ANY_TOKEN', 'invite', 'short', 'short');

    expect(result).toEqual({ ok: false, reason: 'invalid_password' });
    // Zod check must fail before ANY DB call
    expect(fakeDb.query.passwordResets.findFirst).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

// server-only: throws in non-Next.js (Vitest) context — mock to a no-op
vi.mock('server-only', () => ({}));

// Mock @node-rs/argon2 — hash returns a fixed string
vi.mock('@node-rs/argon2', () => ({
  hash: vi.fn().mockResolvedValue('$argon2id$v=19$fixed-hash'),
}));

// NOTE: there is deliberately NO './index' (Better Auth) mock here any more.
// redeem.ts used to call `auth().api.revokeUserSessions(...)` — an ADMIN-plugin
// endpoint — and this file mocked it to resolve successfully. That mock is what
// hid a real bug: in production the reset page is public, so the caller has no
// admin session and the call threw `APIError: UNAUTHORIZED` every time, turning
// a successful reset into a visible "server_error" AFTER the password had
// already been written and the token spent. redeem.ts now deletes the session
// rows directly, so it must not import Better Auth at all — if someone
// reintroduces that dependency, this file will fail to resolve it rather than
// silently paper over it.

// Token mock — hashToken always returns a known value
vi.mock('./tokens', () => ({
  hashToken: vi.fn().mockReturnValue('TEST_HASH'),
}));

// DB mock — must be defined inline to avoid hoisting reference errors
vi.mock('@/lib/db', () => {
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
      email: 'email',
    },
    sessions: {
      userId: 'userId',
    },
  };

  const fakeDb = {
    query: {
      passwordResets: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      users: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      accounts: {
        findFirst: vi.fn().mockResolvedValue(null),
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
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  };

  return {
    db: () => fakeDb,
    schema: fakeSchema,
    __fakeDb: fakeDb, // exposed for test access
  };
});

// Import after mocks are set up
import { redeemToken } from './redeem';
import * as dbModule from '@/lib/db';

// Helper to access the internal fakeDb from the mock module
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getFakeDb = () => (dbModule as any).__fakeDb as {
  query: {
    passwordResets: { findFirst: ReturnType<typeof vi.fn> };
    users: { findFirst: ReturnType<typeof vi.fn> };
    accounts: { findFirst: ReturnType<typeof vi.fn> };
  };
  update: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const VALID_RECORD = {
  id: 'reset-1',
  userId: 'user-1',
  kind: 'invite',
  tokenHash: 'TEST_HASH',
  usedAt: null,
  expiresAt: new Date(Date.now() + 86_400_000),
};

const VALID_USER = { id: 'user-1', email: 'user@example.com' };
const GOOD_PASSWORD = 'Password1!';

beforeEach(() => {
  vi.clearAllMocks();
  const fakeDb = getFakeDb();
  fakeDb.query.passwordResets.findFirst.mockResolvedValue(null);
  fakeDb.query.users.findFirst.mockResolvedValue(null);
  fakeDb.query.accounts.findFirst.mockResolvedValue(null);
  fakeDb.update.mockReturnValue({
    set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
  });
  fakeDb.insert.mockReturnValue({
    values: vi.fn().mockResolvedValue(undefined),
  });
  fakeDb.delete.mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  });
});

describe('redeemToken', () => {
  // Test 1: valid invite token — hashes password, creates accounts row, marks usedAt, returns ok:true
  it('Test 1: valid invite token returns ok:true, inserts accounts row, marks usedAt', async () => {
    const fakeDb = getFakeDb();
    fakeDb.query.passwordResets.findFirst.mockResolvedValue(VALID_RECORD);
    fakeDb.query.users.findFirst.mockResolvedValue(VALID_USER);
    fakeDb.query.accounts.findFirst.mockResolvedValue(null); // no existing account

    const result = await redeemToken('PLAINTEXT_TOKEN', 'invite', GOOD_PASSWORD, GOOD_PASSWORD);

    expect(result).toEqual({ ok: true });
    // A new accounts row must be inserted
    expect(fakeDb.insert).toHaveBeenCalled();
    // usedAt must be updated (update called at least once for passwordResets)
    expect(fakeDb.update).toHaveBeenCalled();
  });

  // Test 2: invalid/missing token → { ok: false, reason: 'invalid' }
  it('Test 2: invalid/missing token returns ok:false reason:invalid without mutating DB', async () => {
    const fakeDb = getFakeDb();
    fakeDb.query.passwordResets.findFirst.mockResolvedValue(null);

    const result = await redeemToken('BAD_TOKEN', 'invite', GOOD_PASSWORD, GOOD_PASSWORD);

    expect(result).toEqual({ ok: false, reason: 'invalid' });
    expect(fakeDb.update).not.toHaveBeenCalled();
    expect(fakeDb.insert).not.toHaveBeenCalled();
  });

  // Test 3: already-used token → db returns null (WHERE usedAt IS NULL fails)
  it('Test 3: already-used token returns ok:false reason:invalid, no mutation', async () => {
    const fakeDb = getFakeDb();
    // usedAt set → isNull(usedAt) filter → findFirst returns null (simulates the WHERE)
    fakeDb.query.passwordResets.findFirst.mockResolvedValue(null);

    const result = await redeemToken('USED_TOKEN', 'invite', GOOD_PASSWORD, GOOD_PASSWORD);

    expect(result).toEqual({ ok: false, reason: 'invalid' });
    expect(fakeDb.update).not.toHaveBeenCalled();
    expect(fakeDb.insert).not.toHaveBeenCalled();
  });

  // Test 4: expired token (expiresAt < now) → findFirst returns null
  it('Test 4: expired token returns ok:false reason:invalid', async () => {
    const fakeDb = getFakeDb();
    // gt(expiresAt, now) filter → findFirst returns null
    fakeDb.query.passwordResets.findFirst.mockResolvedValue(null);

    const result = await redeemToken('EXPIRED_TOKEN', 'invite', GOOD_PASSWORD, GOOD_PASSWORD);

    expect(result).toEqual({ ok: false, reason: 'invalid' });
  });

  // Test 5: wrong kind (invite token used as reset) → findFirst returns null
  it('Test 5: wrong kind returns ok:false reason:invalid', async () => {
    const fakeDb = getFakeDb();
    // eq(kind, 'reset') filter won't find the invite token → null
    fakeDb.query.passwordResets.findFirst.mockResolvedValue(null);

    const result = await redeemToken('INVITE_TOKEN', 'reset', GOOD_PASSWORD, GOOD_PASSWORD);

    expect(result).toEqual({ ok: false, reason: 'invalid' });
    expect(fakeDb.update).not.toHaveBeenCalled();
  });

  // Test 6: kind='reset' bumps sessionVersion
  it('Test 6: kind=reset bumps sessionVersion and calls revokeUserSessions', async () => {
    const fakeDb = getFakeDb();
    fakeDb.query.passwordResets.findFirst.mockResolvedValue({
      ...VALID_RECORD,
      id: 'reset-2',
      userId: 'user-2',
      kind: 'reset',
    });
    fakeDb.query.users.findFirst.mockResolvedValue({ id: 'user-2', email: 'user2@example.com' });
    fakeDb.query.accounts.findFirst.mockResolvedValue({
      id: 'acc-2',
      password: 'old-hash',
    });

    const result = await redeemToken('RESET_TOKEN', 'reset', GOOD_PASSWORD, GOOD_PASSWORD);

    expect(result).toEqual({ ok: true });
    // update called: accounts password + passwordResets usedAt + users sessionVersion = 3 times
    expect(fakeDb.update).toHaveBeenCalledTimes(3);
    // Sessions are evicted by a direct DELETE on the sessions table, NOT by
    // Better Auth's admin-only revokeUserSessions API. Regression guard for the
    // bug where that admin call threw UNAUTHORIZED on this public route and
    // turned a completed reset into a user-visible "server_error".
    expect(fakeDb.delete).toHaveBeenCalledTimes(1);
  });

  // Test 7: too-short password → Zod validation fails before any DB lookup
  it('Test 7: too-short password returns ok:false reason:invalid_password (no DB call)', async () => {
    const fakeDb = getFakeDb();

    const result = await redeemToken('ANY_TOKEN', 'invite', 'short', 'short');

    expect(result).toEqual({ ok: false, reason: 'invalid_password' });
    // Zod fails before DB lookup
    expect(fakeDb.query.passwordResets.findFirst).not.toHaveBeenCalled();
  });
});

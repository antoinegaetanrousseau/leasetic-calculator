import { describe, it, expect, vi, beforeEach } from 'vitest';

// server-only throws in non-Next.js (Vitest) context — mock it to a no-op
vi.mock('server-only', () => ({}));

// requireAdmin mock — default: resolves successfully (admin is present)
const mockRequireAdmin = vi.fn().mockResolvedValue({ session: { user: { id: 'admin-1' } } });
vi.mock('./require', () => ({ requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args) }));

// Better Auth revoke sessions API mock
const mockRevoke = vi.fn().mockResolvedValue(undefined);
vi.mock('./index', () => ({
  auth: () => ({ api: { revokeUserSessions: (a: unknown) => mockRevoke(a) } }),
}));

// Token generator mock — always returns the same predictable token pair
vi.mock('./tokens', () => ({
  generateToken: () => ({ plaintext: 'TESTTOKEN', hash: 'TESTHASH' }),
}));

// Track DB call order to verify requireAdmin() is called before any DB write
const dbCallOrder: string[] = [];
const mockFindFirst = vi.fn();
const fakeDb = {
  update: (t: unknown) => ({
    set: (s: unknown) => ({
      where: (w: unknown) => {
        dbCallOrder.push('update');
        return Promise.resolve({ t, s, w });
      },
    }),
  }),
  insert: (t: unknown) => ({
    values: (v: unknown) => {
      dbCallOrder.push('insert');
      return Promise.resolve({ t, v });
    },
  }),
  delete: (t: unknown) => ({
    where: (w: unknown) => {
      dbCallOrder.push('delete');
      return Promise.resolve({ t, w });
    },
  }),
  query: {
    users: {
      findFirst: (a: unknown) => mockFindFirst(a),
    },
  },
};
vi.mock('@/lib/db', () => ({
  db: () => fakeDb,
  schema: {
    users: {
      id: 'id',
      email: 'email',
      sessionVersion: 'sv',
      deletedAt: 'da',
      displayName: 'dn',
      name: 'name',
      role: 'role',
    },
    passwordResets: {
      userId: 'uid',
      tokenHash: 'th',
      kind: 'k',
      expiresAt: 'ea',
    },
    sessions: { userId: 'userId' },
  },
}));

import { disableUser, reEnableUser, createInvitation, createPasswordReset } from './actions';

beforeEach(() => {
  vi.clearAllMocks();
  dbCallOrder.length = 0;
  mockFindFirst.mockReset();
  // Restore default requireAdmin resolution
  mockRequireAdmin.mockResolvedValue({ session: { user: { id: 'admin-1' } } });
});

describe('disableUser', () => {
  it('calls requireAdmin() before any DB writes', async () => {
    // Track call sequence using a shared array
    const callSequence: string[] = [];
    mockRequireAdmin.mockImplementation(async () => {
      callSequence.push('requireAdmin');
      return { session: { user: { id: 'admin-1' } } };
    });
    // Wrap fakeDb.update to append to shared sequence
    const origUpdate = fakeDb.update.bind(fakeDb);
    vi.spyOn(fakeDb, 'update').mockImplementation((t) => {
      const result = origUpdate(t);
      // patch where() to record the call
      return {
        set: (s: unknown) => ({
          where: (w: unknown) => {
            callSequence.push('dbUpdate');
            return result.set(s).where(w);
          },
        }),
      };
    });
    await disableUser('user-123');
    expect(callSequence[0]).toBe('requireAdmin');
    expect(callSequence.indexOf('requireAdmin')).toBeLessThan(callSequence.indexOf('dbUpdate'));
  });

  it('updates users SET deleted_at + session_version + 1', async () => {
    await disableUser('user-123');
    expect(dbCallOrder).toContain('update');
    expect(mockRequireAdmin).toHaveBeenCalled();
  });

  it('calls the Better Auth revoke-sessions API with { body: { userId } }', async () => {
    await disableUser('user-456');
    expect(mockRevoke).toHaveBeenCalledOnce();
    expect(mockRevoke).toHaveBeenCalledWith({ body: { userId: 'user-456' } });
  });
});

describe('reEnableUser', () => {
  it('updates users SET deleted_at = null', async () => {
    await reEnableUser('user-789');
    expect(dbCallOrder).toContain('update');
    expect(mockRequireAdmin).toHaveBeenCalled();
  });

  it('does NOT call revoke API (re-enable should not log out the user)', async () => {
    await reEnableUser('user-789');
    expect(mockRevoke).not.toHaveBeenCalled();
  });
});

describe('createInvitation', () => {
  it('returns a URL with /invite/<plaintext> for a new user', async () => {
    mockFindFirst.mockResolvedValue(undefined); // no existing user
    const result = await createInvitation('partner@example.com', 'Alice Partner');
    expect(result.url).toContain('/invite/TESTTOKEN');
  });

  it('deletes prior unused tokens before inserting new one (D-11)', async () => {
    mockFindFirst.mockResolvedValue(undefined);
    await createInvitation('partner@example.com', 'Alice Partner');
    // delete must appear before insert in the call order
    const deleteIdx = dbCallOrder.indexOf('delete');
    const insertIdx = dbCallOrder.lastIndexOf('insert');
    expect(deleteIdx).toBeGreaterThanOrEqual(0);
    expect(insertIdx).toBeGreaterThan(deleteIdx);
  });

  it('throws when the existing user has deletedAt === null (active user, D-11)', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'existing-active',
      deletedAt: null,
      role: 'partner',
    });
    await expect(createInvitation('active@example.com', 'Active User'))
      .rejects.toThrow();
  });

  it('inserts a passwordResets row with kind=invite', async () => {
    mockFindFirst.mockResolvedValue(undefined);
    await createInvitation('partner@example.com', 'Alice');
    expect(dbCallOrder).toContain('insert');
    expect(mockRequireAdmin).toHaveBeenCalled();
  });

  it('calls requireAdmin() before any DB mutations', async () => {
    // Track call sequence using a shared array
    const callSequence: string[] = [];
    mockRequireAdmin.mockImplementation(async () => {
      callSequence.push('requireAdmin');
      return { session: { user: { id: 'admin-1' } } };
    });
    const origInsert = fakeDb.insert.bind(fakeDb);
    vi.spyOn(fakeDb, 'insert').mockImplementation((t) => {
      const result = origInsert(t);
      return {
        values: (v: unknown) => {
          callSequence.push('dbInsert');
          return result.values(v);
        },
      };
    });
    mockFindFirst.mockResolvedValue(undefined);
    await createInvitation('partner@example.com', 'Alice');
    expect(callSequence[0]).toBe('requireAdmin');
    const reqIdx = callSequence.indexOf('requireAdmin');
    const insertIdx = callSequence.indexOf('dbInsert');
    expect(insertIdx).toBeGreaterThan(reqIdx);
  });
});

describe('createPasswordReset', () => {
  it('returns a URL with /reset/<plaintext>', async () => {
    const result = await createPasswordReset('user-123');
    expect(result.url).toContain('/reset/TESTTOKEN');
  });

  it('invalidates prior tokens before inserting new one', async () => {
    await createPasswordReset('user-123');
    const deleteIdx = dbCallOrder.indexOf('delete');
    const insertIdx = dbCallOrder.lastIndexOf('insert');
    expect(deleteIdx).toBeGreaterThanOrEqual(0);
    expect(insertIdx).toBeGreaterThan(deleteIdx);
  });

  it('inserts a passwordResets row with kind=reset', async () => {
    await createPasswordReset('user-123');
    expect(dbCallOrder).toContain('insert');
    expect(mockRequireAdmin).toHaveBeenCalled();
  });
});

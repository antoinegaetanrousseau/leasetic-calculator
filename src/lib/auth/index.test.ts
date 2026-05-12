import { describe, it, expect, vi, beforeEach } from 'vitest';

// server-only throws in non-Next.js (Vitest) context — mock it to a no-op
vi.mock('server-only', () => ({}));

// Track DB calls to verify the updateLastLoginAt write shape.
type UpdateCall = { kind: 'update.set'; payload: unknown } | { kind: 'where'; payload: unknown };
const dbCalls: UpdateCall[] = [];

// Toggleable rejection for the best-effort failure-mode test.
let shouldReject = false;

const fakeDb = {
  update: () => ({
    set: (s: unknown) => {
      dbCalls.push({ kind: 'update.set', payload: s });
      return {
        where: (w: unknown) => {
          dbCalls.push({ kind: 'where', payload: w });
          if (shouldReject) {
            return Promise.reject(new Error('simulated transient DB failure'));
          }
          return Promise.resolve([]);
        },
      };
    },
  }),
};

vi.mock('@/lib/db', () => ({
  db: () => fakeDb,
  schema: {
    users: {
      id: 'id',
      lastLoginAt: 'last_login_at',
    },
  },
}));

import { updateLastLoginAt } from './index';

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  shouldReject = false;
});

describe('updateLastLoginAt', () => {
  it('writes users.lastLoginAt = a Date when called with a userId', async () => {
    await updateLastLoginAt('u-abc');
    const setCall = dbCalls.find((c) => c.kind === 'update.set');
    expect(setCall).toBeDefined();
    expect(setCall!.payload).toMatchObject({ lastLoginAt: expect.any(Date) });
  });

  it('targets users.id with the eq predicate via .where()', async () => {
    await updateLastLoginAt('u-abc');
    const whereCall = dbCalls.find((c) => c.kind === 'where');
    expect(whereCall).toBeDefined();
  });

  it('does NOT throw when the underlying DB call rejects (best-effort)', async () => {
    shouldReject = true;
    // The expect.assertions guard ensures we hit the actual await line.
    expect.assertions(1);
    await expect(updateLastLoginAt('u-abc')).resolves.toBeUndefined();
  });

  it('logs to console.error when the underlying DB call rejects', async () => {
    shouldReject = true;
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await updateLastLoginAt('u-abc');
    expect(errSpy).toHaveBeenCalled();
    const firstArg = errSpy.mock.calls[0]?.[0];
    expect(String(firstArg)).toContain('last_login_at');
    errSpy.mockRestore();
  });
});

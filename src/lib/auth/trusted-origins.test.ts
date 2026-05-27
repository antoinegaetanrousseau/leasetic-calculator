/**
 * Phase 20-01 (INFRA-03): Better Auth `trustedOrigins` derivation tests.
 *
 * Asserts the pure helper `__resolveTrustedOriginsForTests()` returns the
 * expected origin list under env-var permutations. The helper feeds Better
 * Auth's `trustedOrigins` config at `createAuth()` time — when the Origin
 * header on an incoming request matches no entry (with wildcard support per
 * 20-RESEARCH.md §1), Better Auth rejects the request with a non-2xx status.
 *
 * Why a pure-function test (not an integration test against a live request):
 *   - Booting the full Better Auth instance requires DATABASE_URL, AUTH_SECRET,
 *     storage adapter, drizzle adapter, and the admin plugin — all just to read
 *     back a static array of strings.
 *   - Better Auth's exact rejection response shape varies between point
 *     releases; asserting it would couple the test to library internals.
 *   - The helper is pure: env vars in, string[] out. Testing it in isolation
 *     covers every meaningful permutation in ~6 cases.
 *
 * Coverage (6 tests):
 *   1. Production-like env (APP_URL + NEXT_PUBLIC_APP_URL set) → both included
 *      plus wildcard plus localhost.
 *   2. APP_URL unset → list excludes the empty slot but keeps the rest.
 *   3. NEXT_PUBLIC_APP_URL unset → same as above for the other slot.
 *   4. Both env URLs unset → only wildcard + localhost remain.
 *   5. Vercel preview wildcard is ALWAYS present (regression guard against
 *      accidental removal during config edits).
 *   6. APP_URL with trailing whitespace → trimmed before insertion.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// server-only throws in non-Next.js (Vitest) context — mock it to a no-op.
// Must precede all imports per project convention (see src/lib/auth/index.test.ts).
vi.mock('server-only', () => ({}));

// Mock @/lib/db so `import { db }` resolves — even though this test never calls
// db(), the import graph in src/lib/auth/index.ts pulls it transitively.
vi.mock('@/lib/db', () => ({
  db: () => ({}),
  schema: { users: {} },
}));

import { __resolveTrustedOriginsForTests } from './index';

const VERCEL_WILDCARD = 'https://leasetic-matrice-*.vercel.app';
const LOCALHOST = 'http://localhost:3000';

beforeEach(() => {
  // Clear potentially inherited env state — vi.stubEnv only persists for the
  // current test block.
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('__resolveTrustedOriginsForTests', () => {
  it('Test 1: production-like env → APP_URL + NEXT_PUBLIC_APP_URL + wildcard + localhost', () => {
    vi.stubEnv('APP_URL', 'https://leasetic-matrice.vercel.app');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://leasetic-matrice.vercel.app');

    const origins = __resolveTrustedOriginsForTests();

    expect(origins).toContain('https://leasetic-matrice.vercel.app');
    expect(origins).toContain(VERCEL_WILDCARD);
    expect(origins).toContain(LOCALHOST);
    expect(origins).toHaveLength(4);
  });

  it('Test 2: APP_URL unset → list excludes empty slot, keeps the other 3', () => {
    vi.stubEnv('APP_URL', '');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://leasetic-matrice.vercel.app');

    const origins = __resolveTrustedOriginsForTests();

    expect(origins).not.toContain('');
    expect(origins).toContain('https://leasetic-matrice.vercel.app');
    expect(origins).toContain(VERCEL_WILDCARD);
    expect(origins).toContain(LOCALHOST);
    expect(origins).toHaveLength(3);
  });

  it('Test 3: NEXT_PUBLIC_APP_URL unset → same shape with the other slot dropped', () => {
    vi.stubEnv('APP_URL', 'https://leasetic-matrice.vercel.app');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');

    const origins = __resolveTrustedOriginsForTests();

    expect(origins).not.toContain('');
    expect(origins).toContain('https://leasetic-matrice.vercel.app');
    expect(origins).toContain(VERCEL_WILDCARD);
    expect(origins).toContain(LOCALHOST);
    expect(origins).toHaveLength(3);
  });

  it('Test 4: both env URLs unset → only wildcard + localhost remain', () => {
    vi.stubEnv('APP_URL', '');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');

    const origins = __resolveTrustedOriginsForTests();

    expect(origins).toEqual([VERCEL_WILDCARD, LOCALHOST]);
  });

  it('Test 5: Vercel preview wildcard is ALWAYS present (regression guard)', () => {
    // Iterate through several env-var permutations; the wildcard must persist.
    const permutations: Array<[string, string]> = [
      ['', ''],
      ['https://prod.example.com', ''],
      ['', 'https://prod.example.com'],
      ['https://prod.example.com', 'https://prod.example.com'],
      ['https://different.example.com', 'https://another.example.com'],
    ];
    for (const [appUrl, publicUrl] of permutations) {
      vi.stubEnv('APP_URL', appUrl);
      vi.stubEnv('NEXT_PUBLIC_APP_URL', publicUrl);
      const origins = __resolveTrustedOriginsForTests();
      expect(origins).toContain(VERCEL_WILDCARD);
    }
  });

  it('Test 6: APP_URL with surrounding whitespace is trimmed before insertion', () => {
    vi.stubEnv('APP_URL', '   https://prod.example.com   ');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');

    const origins = __resolveTrustedOriginsForTests();

    expect(origins).toContain('https://prod.example.com');
    expect(origins).not.toContain('   https://prod.example.com   ');
  });
});

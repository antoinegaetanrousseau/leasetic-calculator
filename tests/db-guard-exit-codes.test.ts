/**
 * D-06 evidence for OPS-05 / ROADMAP criterion 1: an 18-case fixture matrix drives the
 * REAL bash guard binary (`scripts/check-local-db-branch.sh`) via `execFileSync`,
 * asserting its exit status and output tokens per case — including the 2026-09-06
 * incident in both directions, the `NODE_ENV=test` exclusion, the bug_011 port-suffix
 * case, and both fail-safe cases. This suite (collected by `npm test`, and therefore by
 * CI's "Vitest unit tests" step) is what makes criterion 1's evidence run in CI rather
 * than living only in a human's terminal transcript.
 *
 * Two non-negotiables (D-06, D-08), both re-verified below rather than assumed:
 *  - No fixture ever contains a real credential — every `DATABASE_URL` uses the literal
 *    `fixture:fixture` and a `?sslmode=require&secretmarker=MUSTNOTAPPEAR` query
 *    fragment, so "no credential leaked" is provable from captured output, not merely
 *    asserted.
 *  - This suite never reads, writes, moves, or stats the repository's own `.env*` files.
 *    Every path lives inside a directory created by `mkdtempSync`; nothing here resolves
 *    an implicit working directory.
 *
 * Assertions target stable substrings (a leading `SKIP:`/`OK:`/`WARN:`/`ERROR:` token,
 * the expected hostname, the `from <source>` fragment), never a whole line —
 * `src/lib/auth/trusted-origins.test.ts` documents why this project refuses to couple
 * tests to volatile output shapes, and D-07 has just changed what this guard prints.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { chmodSync } from 'node:fs';
import { join } from 'node:path';
import {
  CASES,
  DEVELOPMENT_HOST,
  PRODUCTION_HOST,
  cleanupFixtureDir,
  makeFixtureDir,
  runGuard,
  urlFor,
} from './_db-guard-fixtures';

let dir: string | undefined;

afterEach(() => {
  if (dir) {
    cleanupFixtureDir(dir);
    dir = undefined;
  }
});

describe('check-local-db-branch.sh exit codes (D-06)', () => {
  for (const testCase of CASES) {
    it(testCase.name, () => {
      dir = makeFixtureDir(testCase.files);
      const result = runGuard(dir, testCase.nodeEnv, testCase.env);

      if (testCase.expect.kind === 'skip') {
        expect(result.status).toBe(0);
        expect(result.stdout).toMatch(/^SKIP:/);
        return;
      }

      if (testCase.expect.kind === 'ok') {
        expect(result.status).toBe(0);
        expect(result.stdout).toMatch(/^OK:/);
        expect(result.stdout).toContain(testCase.expect.host);
        expect(result.stdout).toContain(`from ${testCase.expect.source}`);
        return;
      }

      if (testCase.expect.kind === 'warn') {
        expect(result.status).toBe(0);
        expect(result.stdout).toMatch(/^WARN:/);
        expect(result.stdout).toContain(testCase.expect.host);
        expect(result.stdout).toContain(`from ${testCase.expect.source}`);
        return;
      }

      // 'error'
      expect(result.status).not.toBe(0);
      expect(result.stdout).toMatch(/^ERROR:/);
      if (testCase.expect.host) {
        expect(result.stdout).toContain(testCase.expect.host);
      }
      if (testCase.expect.source) {
        expect(result.stdout).toContain(`from ${testCase.expect.source}`);
      }
      for (const token of testCase.expect.contains ?? []) {
        expect(result.stdout).toContain(token);
      }
    });
  }

  it('no case emits any fixture credential material on stdout or stderr (D-08)', () => {
    for (const testCase of CASES) {
      const caseDir = makeFixtureDir(testCase.files);
      const result = runGuard(caseDir, testCase.nodeEnv, testCase.env);
      cleanupFixtureDir(caseDir);

      const combined = result.stdout + result.stderr;
      expect(combined).not.toContain('MUSTNOTAPPEAR');
      expect(combined).not.toContain('fixture:fixture');
      expect(combined).not.toContain('sslmode');
      // A leaked FIXTURE credential would always be `postgres://fixture:...` — checked
      // above via the `fixture:fixture` assertion. The guard's own no-user@host error
      // branch (scripts/check-local-db-branch.sh) prints a generic, credential-free
      // usage hint containing the literal scheme prefix as a placeholder template
      // (`postgres://user:pass@ep-<endpoint>-pooler.<region>.aws.neon.tech/db.`), which
      // is not a disclosure — it names no real host, user or password. Asserting the
      // bare substring `postgres://` is absent would therefore flag that legitimate,
      // pre-existing help text as if it were a leak; the precise check below targets an
      // actual embedded fixture credential instead.
      expect(combined).not.toMatch(/postgres:\/\/fixture/);
    }
  });

  /**
   * 39-REVIEW WR-03. `grep ... || true` cannot distinguish exit 1 ("no match", benign)
   * from exit >= 2 ("could not read the file", not benign). When the HIGHER-precedence
   * candidate is unreadable, the extracted line was empty, the loop moved on, and the
   * guard reported the LOWER-precedence file's value as the verdict — a root-owned or
   * restrictive-mode `.env.production.local` (dropped in by a container, or by a `sudo
   * vercel env pull`) turned the guard into a green light for a production build.
   *
   * Lives outside the shared CASES matrix on purpose: the differential suite feeds every
   * CASES entry to `resolveDatabaseUrl`, whose `readFileSync` would throw on a
   * mode-000 file, so this case is not expressible as a two-sided agreement.
   */
  it('WR-03: refuses instead of falling through when a higher-precedence env file cannot be read', () => {
    // Root can read a mode-000 file, so the premise does not hold there.
    if (typeof process.getuid === 'function' && process.getuid() === 0) return;

    dir = makeFixtureDir({
      '.env.production.local': `DATABASE_URL=${urlFor(PRODUCTION_HOST)}\n`,
      '.env.local': `DATABASE_URL=${urlFor(DEVELOPMENT_HOST)}\n`,
    });
    chmodSync(join(dir, '.env.production.local'), 0o000);

    const result = runGuard(dir, 'production');

    expect(
      result.status,
      'An unreadable higher-precedence env file must refuse, not fall through to the next ' +
        'candidate. Falling through reports a development host while the guarded command opens ' +
        'whatever the unreadable file actually contained.',
    ).not.toBe(0);
    expect(result.stdout).toMatch(/^ERROR:/);
    expect(result.stdout).toContain('.env.production.local');
    expect(result.stdout).not.toContain(DEVELOPMENT_HOST);
  });

  it('every ok/warn/error-with-source case names its source file with a "from <source>" fragment (D-07)', () => {
    let assertedAtLeastOne = false;
    for (const testCase of CASES) {
      if (testCase.expect.kind === 'skip') continue;
      const source = testCase.expect.kind === 'error' ? testCase.expect.source : testCase.expect.source;
      if (!source) continue;

      const caseDir = makeFixtureDir(testCase.files);
      const result = runGuard(caseDir, testCase.nodeEnv, testCase.env);
      cleanupFixtureDir(caseDir);

      expect(result.stdout).toContain(`from ${source}`);
      assertedAtLeastOne = true;
    }
    expect(assertedAtLeastOne).toBe(true);
  });
});

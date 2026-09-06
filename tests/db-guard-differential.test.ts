/**
 * D-02 anti-drift proof: the bash guard (`scripts/check-local-db-branch.sh`) and the
 * TypeScript resolver (`scripts/_env-precedence.ts`'s `resolveDatabaseUrl`) are asserted
 * to agree on every case in the shared matrix — same SKIP/resolve verdict, same
 * hostname, same source-file attribution — including the `NODE_ENV=test` exclusion and
 * the `process.env` case.
 *
 * It also compares the two halves' VERDICT about the host they resolved (Agreement 5,
 * 39-REVIEW WR-01), not just which file won. That half of the proof was missing: the
 * bash guard classifies by exact `hostname` equality against the shared record table
 * while `classifyDatabaseTarget` classifies by `startsWith(prefix)` behind a
 * `.neon.tech` suffix pre-gate, and those are genuinely different predicates. Agreeing
 * on the hostname while disagreeing on whether that hostname is production is exactly
 * the drift this suite exists to prevent.
 *
 * WHY THIS SUITE EXISTS: OPS-05 leaves two resolvers by necessity. D-01 keeps the guard
 * in bash so no `tsx` startup is added to every build, and a bash script cannot import a
 * TypeScript module — so a single shared implementation is not an option. D-02 makes
 * their agreement a test rather than a hope: a failure here means the two have drifted,
 * and one of them is now wrong about which database the next command will open.
 *
 * This suite inherits Task 1's no-real-credential and never-touch-the-repo's-`.env*`
 * discipline automatically, by reusing `tests/_db-guard-fixtures.ts`'s harness — every
 * fixture lives under a directory created by `mkdtempSync` and is removed immediately
 * after each case.
 *
 * Assertions parse the bash side's hostname/source out of its stdout with a narrow
 * regular expression anchored on the `from `/`(from ` fragment; they never assert
 * byte-equal log lines between the two resolvers — D-07 deliberately changed what the
 * guard prints, and coupling a test to log text is the failure mode
 * `src/lib/auth/trusted-origins.test.ts` documents.
 */
import { describe, expect, it } from 'vitest';
import { envFileOrder, resolveDatabaseUrl } from '../scripts/_env-precedence';
import { classifyDatabaseTarget } from '../scripts/_db-branch-guard';
import {
  CASES,
  DEVELOPMENT_HOST,
  PREVIEW_HOST,
  PRODUCTION_HOST,
  cleanupFixtureDir,
  makeFixtureDir,
  runGuard,
  urlFor,
} from './_db-guard-fixtures';

const UNRECOGNISED_HOST = 'ep-unrecognised-slot-pooler.c-3.eu-central-1.aws.neon.tech';

/** Type-satisfying placeholder only (see tests/_db-guard-fixtures.ts's runGuard docstring
 * for why the ambient value is irrelevant): resolveDatabaseUrl never reads `NODE_ENV`
 * itself, only the explicit `nodeEnv` argument. */
function toProcessEnv(env: Record<string, string> = {}): NodeJS.ProcessEnv {
  return { NODE_ENV: 'test', ...env };
}

/**
 * Parses the hostname and/or source filename out of the bash guard's stdout. Two shapes
 * exist across the guard's verdict lines:
 *   - `... (HOST) from SOURCE[.,]` — every OK/WARN/ERROR-with-a-resolved-host line.
 *   - `... (from SOURCE) ...` — the no-user@host-segment error, which has no hostname.
 * Deliberately narrow and anchored on the `from` fragment rather than a whole-line match.
 */
/**
 * The verdict classes the two halves are compared on (39-REVIEW WR-01).
 *
 * Until this existed the suite compared only `resolveDatabaseUrl` — WHICH FILE won and
 * WHICH HOST it named — and never the VERDICT either half reaches about that host. That
 * left the actual classification untested across two genuinely different predicates over
 * the same table: `scripts/check-local-db-branch.sh` matches a record by exact `hostname`
 * equality, while `classifyDatabaseTarget` matches by `startsWith(prefix)` behind a
 * `.neon.tech` suffix pre-gate. Agreeing on the hostname while disagreeing on what that
 * hostname MEANS is precisely the drift OPS-05 set out to end.
 *
 * Deliberately COARSE. The two halves word their output differently on purpose (D-07),
 * and refusing for slightly different stated reasons is not drift — one half passing
 * while the other refuses is. `refuse` therefore covers refuse-production,
 * refuse-unrecognised and refuse-malformed alike; the exact hostname is pinned
 * separately by Agreement 2.
 */
type VerdictClass = 'skip' | 'no-value' | 'ok' | 'warn' | 'refuse';

function bashVerdictClass(stdout: string): VerdictClass {
  if (/^SKIP:/.test(stdout)) return 'skip';
  if (stdout.includes('no DATABASE_URL found in any candidate file')) return 'no-value';
  if (/^OK:/.test(stdout)) return 'ok';
  if (/^WARN:/.test(stdout)) return 'warn';
  if (/^ERROR:/.test(stdout)) return 'refuse';
  throw new Error(`bash guard stdout matched no known verdict shape: ${JSON.stringify(stdout.slice(0, 120))}`);
}

function tsVerdictClass(tsResult: ReturnType<typeof resolveDatabaseUrl>): VerdictClass {
  // Mirrors assertSafeDatabaseTarget's own order: SKIP rule first, then "nothing
  // resolved", then the classification.
  if (tsResult.filesFound.length === 0) return 'skip';
  if (!tsResult.resolution) return 'no-value';

  const { verdict } = classifyDatabaseTarget(tsResult.resolution.url);
  if (verdict === 'ok-development' || verdict === 'ok-local-postgres') return 'ok';
  if (verdict === 'warn-preview') return 'warn';
  return 'refuse';
}

function parseHostAndSource(stdout: string): { host?: string; source?: string } {
  const withHost = /\(([^()]+)\)\s+from\s+(\S+?)[.,]?(?:\s|$)/.exec(stdout);
  if (withHost) {
    return { host: withHost[1], source: withHost[2] };
  }
  const sourceOnly = /\(from\s+(\S+?)\)/.exec(stdout);
  if (sourceOnly) {
    return { source: sourceOnly[1] };
  }
  return {};
}

describe('bash guard vs TypeScript resolver agreement (D-02)', () => {
  for (const testCase of CASES) {
    it(testCase.name, () => {
      const dir = makeFixtureDir(testCase.files);
      try {
        const bashResult = runGuard(dir, testCase.nodeEnv, testCase.env);
        const tsResult = resolveDatabaseUrl({
          cwd: dir,
          nodeEnv: testCase.nodeEnv,
          processEnv: toProcessEnv(testCase.env),
        });
        const parsed = parseHostAndSource(bashResult.stdout);
        const bashSkipped = bashResult.stdout.startsWith('SKIP:');

        // Agreement 1: SKIP on the bash side <=> an empty filesFound on the TS side.
        expect(bashSkipped).toBe(tsResult.filesFound.length === 0);

        // Agreements 2 and 3 used to sit behind bare `if (parsed.host)` / `if
        // (parsed.source)` guards (39-REVIEW WR-05). A wording change that broke
        // parseHostAndSource's regexes would have made BOTH regexes return `{}`, every
        // case would have silently degraded to asserting Agreement 1 alone, and the
        // suite would have stayed green with the anti-drift proof switched off. The
        // expectation now comes from the case itself, so "the output no longer parses"
        // fails loudly instead of quietly disabling the comparison.
        const expectsHost = testCase.expect.kind !== 'skip' && 'host' in testCase.expect && Boolean(testCase.expect.host);
        const expectsSource = testCase.expect.kind !== 'skip' && Boolean(testCase.expect.source);

        if (expectsHost) {
          expect(
            parsed.host,
            'the bash guard stdout no longer parses into a hostname — parseHostAndSource has ' +
              'drifted from the guard output, and this suite would silently stop proving anything.',
          ).toBeDefined();
        }
        if (expectsSource) {
          expect(
            parsed.source,
            'the bash guard stdout no longer parses into a `from <source>` fragment — ' +
              'parseHostAndSource has drifted from the guard output.',
          ).toBeDefined();
        }

        // Agreement 2: when the bash guard resolves a hostname, the TS side derives the
        // identical one. Compared via classifyDatabaseTarget rather than `new URL`
        // directly, because a deliberately malformed fixture would make a bare `new URL`
        // THROW inside the assertion; classify returns hostname '' for that input, and
        // Agreement 5 below is what pins the two halves' handling of it.
        if (parsed.host) {
          expect(tsResult.resolution).not.toBeNull();
          const tsHostname = tsResult.resolution ? classifyDatabaseTarget(tsResult.resolution.url).hostname : '';
          if (tsHostname !== '') {
            expect(tsHostname).toBe(parsed.host);
          }
        }

        // Agreement 3: when the bash guard names a `from <source>` fragment, the TS
        // side's EnvResolution.source is byte-identical.
        if (parsed.source) {
          expect(tsResult.resolution).not.toBeNull();
          expect(tsResult.resolution?.source).toBe(parsed.source);
        }

        // Agreement 4: the bash guard's "no DATABASE_URL in any candidate file" error
        // corresponds to a null TS resolution over a non-empty candidate set.
        if (bashResult.stdout.includes('no DATABASE_URL found in any candidate file')) {
          expect(tsResult.resolution).toBeNull();
          expect(tsResult.filesFound.length).toBeGreaterThan(0);
        }

        // Agreement 5 (WR-01): the two halves reach the same VERDICT about the host
        // they agreed on, not merely the same host. This is what covers the fact that
        // bash classifies by exact hostname equality while classifyDatabaseTarget
        // classifies by startsWith(prefix) — two different predicates over one table.
        const bashClass = bashVerdictClass(bashResult.stdout);
        expect(
          bashClass,
          'the bash guard and classifyDatabaseTarget disagree about what this host MEANS. ' +
            'One of them is now wrong about whether the next command may open this database.',
        ).toBe(tsVerdictClass(tsResult));

        // Agreement 6: the exit status is consistent with that verdict class. A refusal
        // that exits 0 is a fail-open; an OK that exits non-zero blocks a legitimate build.
        expect(bashResult.status === 0).toBe(bashClass === 'ok' || bashClass === 'warn' || bashClass === 'skip');
      } finally {
        cleanupFixtureDir(dir);
      }
    });
  }

  it('NODE_ENV=test: both sides agree .env.local was never consulted, even when it names a different host', () => {
    const testCase = CASES.find(
      (c) => c.name === 'NODE_ENV=test excludes .env.local: .env.test.local (development host) + .env.local (production host), nodeEnv test',
    );
    if (!testCase) throw new Error('fixture case not found');

    const dir = makeFixtureDir(testCase.files);
    try {
      const bashResult = runGuard(dir, testCase.nodeEnv, testCase.env);
      const tsResult = resolveDatabaseUrl({
        cwd: dir,
        nodeEnv: testCase.nodeEnv,
        processEnv: toProcessEnv(testCase.env),
      });
      const parsed = parseHostAndSource(bashResult.stdout);

      expect(tsResult.filesFound).not.toContain('.env.local');
      expect(tsResult.resolution?.source).not.toBe('.env.local');
      expect(parsed.source).not.toBe('.env.local');
    } finally {
      cleanupFixtureDir(dir);
    }
  });

  it('process.env case: both sides agree the source is process.env, not a file', () => {
    const testCase = CASES.find(
      (c) => c.name === 'process env DATABASE_URL (development host) + .env.local (production host), nodeEnv development',
    );
    if (!testCase) throw new Error('fixture case not found');

    const dir = makeFixtureDir(testCase.files);
    try {
      const bashResult = runGuard(dir, testCase.nodeEnv, testCase.env);
      const tsResult = resolveDatabaseUrl({
        cwd: dir,
        nodeEnv: testCase.nodeEnv,
        processEnv: toProcessEnv(testCase.env),
      });
      const parsed = parseHostAndSource(bashResult.stdout);

      expect(tsResult.resolution?.source).toBe('process.env');
      expect(parsed.source).toBe('process.env');
    } finally {
      cleanupFixtureDir(dir);
    }
  });

  describe('candidate order matches envFileOrder(nodeEnv) exactly, per node-env', () => {
    function assertOrderWinner(nodeEnvName: string, files: Record<string, string>): void {
      const dir = makeFixtureDir(files);
      try {
        const order = envFileOrder(nodeEnvName);
        const bashResult = runGuard(dir, nodeEnvName, {});
        const tsResult = resolveDatabaseUrl({ cwd: dir, nodeEnv: nodeEnvName, processEnv: toProcessEnv() });
        const parsed = parseHostAndSource(bashResult.stdout);

        expect(tsResult.resolution?.source).toBe(order[0]);
        expect(parsed.source).toBe(order[0]);
      } finally {
        cleanupFixtureDir(dir);
      }
    }

    it('development: the highest-precedence candidate file wins on both sides', () => {
      assertOrderWinner('development', {
        '.env.development.local': `DATABASE_URL=${urlFor(PRODUCTION_HOST)}\n`,
        '.env.local': `DATABASE_URL=${urlFor(PREVIEW_HOST)}\n`,
        '.env.development': `DATABASE_URL=${urlFor(DEVELOPMENT_HOST)}\n`,
        '.env': `DATABASE_URL=${urlFor(UNRECOGNISED_HOST)}\n`,
      });
    });

    it('production: the highest-precedence candidate file wins on both sides', () => {
      assertOrderWinner('production', {
        '.env.production.local': `DATABASE_URL=${urlFor(PRODUCTION_HOST)}\n`,
        '.env.local': `DATABASE_URL=${urlFor(PREVIEW_HOST)}\n`,
        '.env.production': `DATABASE_URL=${urlFor(DEVELOPMENT_HOST)}\n`,
        '.env': `DATABASE_URL=${urlFor(UNRECOGNISED_HOST)}\n`,
      });
    });

    it("test: .env.local is excluded from the order and never selected, even though it's present on disk", () => {
      const dir = makeFixtureDir({
        '.env.test.local': `DATABASE_URL=${urlFor(PRODUCTION_HOST)}\n`,
        '.env.local': `DATABASE_URL=${urlFor(PREVIEW_HOST)}\n`,
        '.env.test': `DATABASE_URL=${urlFor(DEVELOPMENT_HOST)}\n`,
        '.env': `DATABASE_URL=${urlFor(UNRECOGNISED_HOST)}\n`,
      });
      try {
        const order = envFileOrder('test');
        const bashResult = runGuard(dir, 'test', {});
        const tsResult = resolveDatabaseUrl({ cwd: dir, nodeEnv: 'test', processEnv: toProcessEnv() });
        const parsed = parseHostAndSource(bashResult.stdout);

        expect(order).not.toContain('.env.local');
        expect(tsResult.resolution?.source).toBe(order[0]);
        expect(tsResult.resolution?.source).not.toBe('.env.local');
        expect(parsed.source).toBe(order[0]);
        expect(parsed.source).not.toBe('.env.local');
      } finally {
        cleanupFixtureDir(dir);
      }
    });
  });
});

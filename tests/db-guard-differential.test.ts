/**
 * D-02 anti-drift proof: the bash guard (`scripts/check-local-db-branch.sh`) and the
 * TypeScript resolver (`scripts/_env-precedence.ts`'s `resolveDatabaseUrl`) are asserted
 * to agree on every case in the shared matrix — same SKIP/resolve verdict, same
 * hostname, same source-file attribution — including the `NODE_ENV=test` exclusion and
 * the `process.env` case.
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

        // Agreement 2: when the bash guard resolves a hostname, the TS side's resolved
        // URL parses to the identical hostname.
        if (parsed.host) {
          expect(tsResult.resolution).not.toBeNull();
          expect(new URL(tsResult.resolution?.url ?? '').hostname).toBe(parsed.host);
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

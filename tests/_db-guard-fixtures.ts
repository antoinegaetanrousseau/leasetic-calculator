/**
 * Shared temp-dir + process-spawn harness for OPS-05's D-06/D-02 evidence suites
 * (`tests/db-guard-exit-codes.test.ts`, `tests/db-guard-differential.test.ts`).
 *
 * This is a helper module, NOT a test file — `vitest.config.ts`'s include glob is
 * `tests/**\/*.test.ts`, so this bare `.ts` file is typechecked and linted but never
 * collected as a suite.
 *
 * `CASES` is the single case matrix. Both consumer suites iterate it, so adding a case
 * here extends the exit-code proof (D-06) and the differential proof (D-02) at once.
 *
 * Fixture discipline (D-06, D-08): every fixture credential is the literal
 * `fixture:fixture`, and every fixture connection string carries the query fragment
 * `?sslmode=require&secretmarker=MUSTNOTAPPEAR` — so "no credential leaked" is provable
 * from a case's captured output, not merely asserted. Nothing in this module reads,
 * writes, moves, or inspects the repository's own `.env*` files; every fixture path is
 * created fresh under `mkdtempSync` and removed by the caller via `cleanupFixtureDir`.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { URL as NodeURL, fileURLToPath } from 'node:url';

// Resolved from this module's own location, not from any notion of an implicit working
// directory — `tests/` and `scripts/` are invoked from different places, and a guard
// path built off an ambient starting directory would be wrong under some of them.
// Explicitly `node:url`'s `URL` class (not the global `URL`): under this suite's jsdom
// test environment, the shimmed global `URL` constructor resolves a relative ref against
// jsdom's fake `http://localhost:3000/` document location rather than the `file:` base
// passed as the second argument, silently pointing this at the wrong "file" (the same
// trap documented in `scripts/_neon-endpoints.ts`).
const GUARD_PATH = fileURLToPath(new NodeURL('../scripts/check-local-db-branch.sh', import.meta.url));

export const PRODUCTION_HOST = 'ep-icy-boat-alx5o1tz-pooler.c-3.eu-central-1.aws.neon.tech';
export const PREVIEW_HOST = 'ep-delicate-night-als4ogpc-pooler.c-3.eu-central-1.aws.neon.tech';
export const DEVELOPMENT_HOST = 'ep-polished-band-alphc576-pooler.c-3.eu-central-1.aws.neon.tech';

const FIXTURE_QUERY = 'sslmode=require&secretmarker=MUSTNOTAPPEAR';

/** Builds a throwaway connection string. Never a real credential — see module docstring. */
export function urlFor(host: string, port?: number): string {
  const hostPart = port === undefined ? host : `${host}:${String(port)}`;
  return `postgres://fixture:fixture@${hostPart}/db?${FIXTURE_QUERY}`;
}

export interface GuardCase {
  name: string;
  nodeEnv: string;
  /** filename -> file body. Bodies use fake credentials only. */
  files: Record<string, string>;
  /** extra process env for the spawned guard; DATABASE_URL only when the case is about it. */
  env?: Record<string, string>;
  expect:
    | { kind: 'skip' }
    | { kind: 'ok'; host: string; source: string }
    | { kind: 'warn'; host: string; source: string }
    | { kind: 'error'; host?: string; source?: string; contains?: string[] };
}

/** Creates a fresh temp dir (prefix distinct from every other fixture harness in this
 * repo: `reconcile-`, `reconcile-run-`, `env-precedence-`, `db-branch-guard-`) and writes
 * each fixture file into it. */
export function makeFixtureDir(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'db-guard-'));
  for (const [name, contents] of Object.entries(files)) {
    writeFileSync(join(dir, name), contents);
  }
  return dir;
}

/** Removes a directory created by `makeFixtureDir`. */
export function cleanupFixtureDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

/**
 * Invokes the REAL bash guard binary — `execFileSync('bash', [absolutePath, ...])` with
 * an argv array, never a concatenated shell string, so a fixture directory name
 * containing a shell metacharacter cannot be interpreted.
 *
 * The child's environment is constructed explicitly — `PATH` plus the case's own `env` —
 * and never inherits the surrounding environment wholesale. That is load-bearing: the
 * vitest worker may already carry a `DATABASE_URL` from the developer's shell or from
 * `.env.test.local`, and inheriting it would make the file-precedence cases pass for the
 * wrong reason, producing false assurance.
 */
export function runGuard(
  dir: string,
  nodeEnv: string,
  env: Record<string, string> = {},
): { status: number; stdout: string; stderr: string } {
  const childEnv: NodeJS.ProcessEnv = {
    // Type-satisfying placeholder only (Next.js's global type augmentation makes
    // `NODE_ENV` a required field of `NodeJS.ProcessEnv`). The guard never falls back to
    // reading this ambient value — `--node-env` below is always passed explicitly.
    NODE_ENV: 'test',
    PATH: process.env.PATH ?? '',
    ...env,
  };

  try {
    const stdout = execFileSync('bash', [GUARD_PATH, '--root', dir, '--node-env', nodeEnv], {
      encoding: 'utf8',
      env: childEnv,
    });
    return { status: 0, stdout, stderr: '' };
  } catch (error) {
    // execFileSync throws on a non-zero exit; the thrown error carries status/stdout/
    // stderr, returned here in the same shape as the success path so callers never
    // branch on throw-vs-return.
    const spawnError = error as { status?: number | null; stdout?: string; stderr?: string };
    return {
      status: spawnError.status ?? 1,
      stdout: spawnError.stdout ?? '',
      stderr: spawnError.stderr ?? '',
    };
  }
}

export const CASES: readonly GuardCase[] = [
  {
    name: 'only .env.local (development host), nodeEnv development',
    nodeEnv: 'development',
    files: { '.env.local': `DATABASE_URL=${urlFor(DEVELOPMENT_HOST)}\n` },
    expect: { kind: 'ok', host: DEVELOPMENT_HOST, source: '.env.local' },
  },
  {
    name: 'INCIDENT 2026-09-06: .env.production.local (production host) + .env.local (development host), nodeEnv production',
    nodeEnv: 'production',
    files: {
      '.env.production.local': `DATABASE_URL=${urlFor(PRODUCTION_HOST)}\n`,
      '.env.local': `DATABASE_URL=${urlFor(DEVELOPMENT_HOST)}\n`,
    },
    expect: { kind: 'error', host: PRODUCTION_HOST, source: '.env.production.local', contains: ['PRODUCTION'] },
  },
  {
    name: 'same two files, nodeEnv development',
    nodeEnv: 'development',
    files: {
      '.env.production.local': `DATABASE_URL=${urlFor(PRODUCTION_HOST)}\n`,
      '.env.local': `DATABASE_URL=${urlFor(DEVELOPMENT_HOST)}\n`,
    },
    expect: { kind: 'ok', host: DEVELOPMENT_HOST, source: '.env.local' },
  },
  {
    name: 'criterion 1 second half: only .env.local (development host), nodeEnv production',
    nodeEnv: 'production',
    files: { '.env.local': `DATABASE_URL=${urlFor(DEVELOPMENT_HOST)}\n` },
    expect: { kind: 'ok', host: DEVELOPMENT_HOST, source: '.env.local' },
  },
  {
    name: 'NODE_ENV=test excludes .env.local: .env.test.local (development host) + .env.local (production host), nodeEnv test',
    nodeEnv: 'test',
    files: {
      '.env.test.local': `DATABASE_URL=${urlFor(DEVELOPMENT_HOST)}\n`,
      '.env.local': `DATABASE_URL=${urlFor(PRODUCTION_HOST)}\n`,
    },
    expect: { kind: 'ok', host: DEVELOPMENT_HOST, source: '.env.test.local' },
  },
  {
    name: 'NODE_ENV=test with only .env.local present',
    nodeEnv: 'test',
    files: { '.env.local': `DATABASE_URL=${urlFor(DEVELOPMENT_HOST)}\n` },
    expect: { kind: 'skip' },
  },
  {
    name: '.env.development.local (preview host) + .env.local (development host), nodeEnv development',
    nodeEnv: 'development',
    files: {
      '.env.development.local': `DATABASE_URL=${urlFor(PREVIEW_HOST)}\n`,
      '.env.local': `DATABASE_URL=${urlFor(DEVELOPMENT_HOST)}\n`,
    },
    expect: { kind: 'warn', host: PREVIEW_HOST, source: '.env.development.local' },
  },
  {
    name: 'only .env (development host), nodeEnv development',
    nodeEnv: 'development',
    files: { '.env': `DATABASE_URL=${urlFor(DEVELOPMENT_HOST)}\n` },
    expect: { kind: 'ok', host: DEVELOPMENT_HOST, source: '.env' },
  },
  {
    name: '.env.local written as export DATABASE_URL="..." with leading whitespace',
    nodeEnv: 'development',
    files: { '.env.local': `   export DATABASE_URL="${urlFor(DEVELOPMENT_HOST)}"\n` },
    expect: { kind: 'ok', host: DEVELOPMENT_HOST, source: '.env.local' },
  },
  {
    name: '.env.local with DATABASE_URL commented out + .env with a real value',
    nodeEnv: 'development',
    files: {
      '.env.local': `# DATABASE_URL=${urlFor(PRODUCTION_HOST)}\n`,
      '.env': `DATABASE_URL=${urlFor(DEVELOPMENT_HOST)}\n`,
    },
    expect: { kind: 'ok', host: DEVELOPMENT_HOST, source: '.env' },
  },
  {
    name: '.env.local present but assigning no DATABASE_URL',
    nodeEnv: 'development',
    files: { '.env.local': 'SOME_OTHER_VAR=x\n' },
    expect: { kind: 'error', contains: ['.env.local'] },
  },
  {
    name: 'empty directory',
    nodeEnv: 'development',
    files: {},
    expect: { kind: 'skip' },
  },
  {
    name: 'process env DATABASE_URL (development host) + .env.local (production host), nodeEnv development',
    nodeEnv: 'development',
    files: { '.env.local': `DATABASE_URL=${urlFor(PRODUCTION_HOST)}\n` },
    env: { DATABASE_URL: urlFor(DEVELOPMENT_HOST) },
    expect: { kind: 'ok', host: DEVELOPMENT_HOST, source: 'process.env' },
  },
  {
    name: 'BUG_011: .env.local naming the production host with an explicit :5432 port, nodeEnv development',
    nodeEnv: 'development',
    files: { '.env.local': `DATABASE_URL=${urlFor(PRODUCTION_HOST, 5432)}\n` },
    expect: { kind: 'error', host: PRODUCTION_HOST, source: '.env.local', contains: ['PRODUCTION'] },
  },
  {
    name: 'FAIL-SAFE: .env.local naming ep-some-future-branch-abc123-pooler.c-3.eu-central-1.aws.neon.tech',
    nodeEnv: 'development',
    files: {
      '.env.local': `DATABASE_URL=${urlFor('ep-some-future-branch-abc123-pooler.c-3.eu-central-1.aws.neon.tech')}\n`,
    },
    expect: {
      kind: 'error',
      host: 'ep-some-future-branch-abc123-pooler.c-3.eu-central-1.aws.neon.tech',
      source: '.env.local',
      contains: ['unrecognised'],
    },
  },
  {
    name: 'FAIL-SAFE: .env.local naming a lookalike domain ...c-3.neon.tech.evil.test',
    nodeEnv: 'development',
    files: {
      '.env.local': `DATABASE_URL=${urlFor('ep-icy-boat-alx5o1tz-pooler.c-3.neon.tech.evil.test')}\n`,
    },
    expect: {
      kind: 'error',
      host: 'ep-icy-boat-alx5o1tz-pooler.c-3.neon.tech.evil.test',
      source: '.env.local',
      contains: ['unrecognised'],
    },
  },
  {
    name: '.env.local whose DATABASE_URL has no user@host segment',
    nodeEnv: 'development',
    files: { '.env.local': 'DATABASE_URL=not-a-connection-string\n' },
    expect: { kind: 'error', source: '.env.local', contains: ['user@host'] },
  },
  {
    name: '.env.local naming localhost',
    nodeEnv: 'development',
    files: { '.env.local': `DATABASE_URL=${urlFor('localhost', 5432)}\n` },
    expect: { kind: 'ok', host: 'localhost', source: '.env.local' },
  },
  {
    // 39-REVIEW CR-01. Rotating a connection string by APPENDING the new value and
    // leaving the old line above it is an ordinary operator action. dotenv.parse()
    // builds an object, so the LAST assignment in a file wins; a reader that took the
    // FIRST matching line reported the stale development host and exited 0 while every
    // TS consumer (and `next build`/`next start`) opened production — the OPS-05
    // incident verbatim, one file instead of two. Within-file last-wins and
    // across-file first-wins are independent rules; this case pins the former.
    name: 'CR-01 within one file the LAST DATABASE_URL wins: stale development line above a production line, nodeEnv development',
    nodeEnv: 'development',
    files: {
      '.env.local': `DATABASE_URL=${urlFor(DEVELOPMENT_HOST)}\nOTHER=1\nDATABASE_URL=${urlFor(PRODUCTION_HOST)}\n`,
    },
    expect: { kind: 'error', host: PRODUCTION_HOST, source: '.env.local', contains: ['PRODUCTION'] },
  },

  // ---------------------------------------------------------------------------------
  // 39-REVIEW WR-04. The bash guard extracts its value with grep+sed while the TS half
  // uses dotenv.parse(), and the two are separate parsers. These four shapes are the
  // ones where they measurably disagreed; each is an ordinary thing to find in a real
  // `.env.local`, and each is now decided by the differential suite (which runs the REAL
  // binary against the REAL resolver) rather than by nobody.
  // ---------------------------------------------------------------------------------
  {
    // Node ends the authority at the first `/`, `?` or `#` and takes the LAST `@`
    // WITHIN it as the userinfo delimiter; the sed pipeline took the FIRST `@` in the
    // whole string. An `@` in the password therefore put the two halves on different
    // hostnames — verified: TS resolved the development host, bash derived
    // `ssword@ep-polished-...` and refused it as unrecognised.
    name: 'WR-04 dotenv parity: a password containing @ (Node takes the LAST @ in the authority)',
    nodeEnv: 'development',
    files: {
      '.env.local': `DATABASE_URL=postgres://fixture:p@ssword@${DEVELOPMENT_HOST}/db?${FIXTURE_QUERY}\n`,
    },
    expect: { kind: 'ok', host: DEVELOPMENT_HOST, source: '.env.local' },
  },
  {
    // A connection string with a query but no path. The old derivation stripped at `/`
    // or `:` only, so `?sslmode=require&secretmarker=...` stayed glued to the hostname:
    // the guard both misclassified the host AND printed the query string, which is the
    // D-08 disclosure surface the MUSTNOTAPPEAR marker exists to detect.
    name: 'WR-04 dotenv parity: connection string with a query but no path',
    nodeEnv: 'development',
    files: {
      '.env.local': `DATABASE_URL=postgres://fixture:fixture@${DEVELOPMENT_HOST}?${FIXTURE_QUERY}\n`,
    },
    expect: { kind: 'ok', host: DEVELOPMENT_HOST, source: '.env.local' },
  },
  {
    // A CRLF file (an env file edited on Windows, or pasted through a tool that
    // normalises line endings). dotenv's value pattern excludes `\r` outright; the sed
    // left it attached, so the hostname carried a trailing carriage return and matched
    // no record. Combined here with an inline `#` comment, which dotenv also excludes
    // from an unquoted value and the sed did not.
    name: 'WR-04 dotenv parity: CRLF line ending plus an inline # comment',
    nodeEnv: 'development',
    files: {
      '.env.local': `DATABASE_URL=postgres://fixture:fixture@${DEVELOPMENT_HOST} # rotated 2026-09-06\r\n`,
    },
    expect: { kind: 'ok', host: DEVELOPMENT_HOST, source: '.env.local' },
  },
  {
    // An unmatched quote. dotenv requires BOTH quotes before it strips either, so the
    // value keeps its stray leading `'` and fails to parse as a URL — refuse-malformed.
    // The two independent sed substitutions stripped a leading quote regardless of
    // whether a closing one existed, turning a broken line into a confident OK. Both
    // halves must refuse; that they word the refusal differently is not drift.
    name: 'WR-04 dotenv parity: an unmatched leading quote must not be stripped',
    nodeEnv: 'development',
    files: {
      '.env.local': `DATABASE_URL='postgres://fixture:fixture@${DEVELOPMENT_HOST}/db?${FIXTURE_QUERY}\n`,
    },
    expect: { kind: 'error', source: '.env.local', contains: ['unrecognised'] },
  },
];

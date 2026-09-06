/**
 * 39-REVIEW WR-02: the refusal `scripts/_load-env.ts` produces must name the FILE that
 * caused it.
 *
 * `_load-env.ts` loads every candidate file with dotenv's `config()`, which WRITES
 * `process.env.DATABASE_URL`, and then calls the guard. If the guard is left to read the
 * ambient `process.env`, `resolveDatabaseUrl` takes its `processEnv.DATABASE_URL` branch
 * and reports `source: 'process.env'` — ALWAYS, for every refusal, no matter which file
 * actually supplied the value. D-07 exists to tell an operator which file to go fix, and
 * this is the only path that runs in production, so it was also the only path with no
 * coverage: `tests/db-branch-guard.test.ts` always passes an explicit `processEnv` with
 * no `DATABASE_URL`, which is exactly the shape that hides this.
 *
 * Proving it requires the REAL module-scope execution — the misattribution is a
 * consequence of statement ORDER inside the module, so nothing importable can observe
 * it. These cases therefore spawn a child `tsx` process whose cwd is a `mkdtempSync`
 * fixture directory, with an explicitly-constructed environment (never the surrounding
 * one, which may carry the developer's own `DATABASE_URL`). Fixture credentials only —
 * `fixture:fixture` plus the `MUSTNOTAPPEAR` marker, so "no credential leaked" stays
 * provable from captured output.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { URL as NodeURL, fileURLToPath, pathToFileURL } from 'node:url';

// Resolved from this module's own location — never from an ambient working directory.
// `node:url`'s URL explicitly, not the global one: under this suite's jsdom environment
// the shimmed global resolves a relative ref against jsdom's fake document location
// rather than the `file:` base (the trap documented in scripts/_neon-endpoints.ts).
const LOADER_PATH = fileURLToPath(new NodeURL('../scripts/_load-env.ts', import.meta.url));
const TSX_BIN = fileURLToPath(new NodeURL('../node_modules/.bin/tsx', import.meta.url));

const PRODUCTION_HOST = 'ep-icy-boat-alx5o1tz-pooler.c-3.eu-central-1.aws.neon.tech';
const DEVELOPMENT_HOST = 'ep-polished-band-alphc576-pooler.c-3.eu-central-1.aws.neon.tech';
const FIXTURE_QUERY = 'sslmode=require&secretmarker=MUSTNOTAPPEAR';

function urlFor(host: string): string {
  return `postgres://fixture:fixture@${host}/db?${FIXTURE_QUERY}`;
}

let dir: string | undefined;

afterEach(() => {
  if (dir) {
    rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  }
});

/**
 * Runs `scripts/_load-env.ts` for real, at module scope, in a child process rooted at
 * `cwd`. The child environment is built explicitly: PATH and NODE_ENV plus whatever the
 * case adds, never `...process.env`.
 */
function runLoader(
  cwd: string,
  // Next.js's global type augmentation narrows NodeJS.ProcessEnv['NODE_ENV'] to this
  // union, so it cannot be widened to a bare string here.
  nodeEnv: 'development' | 'production' | 'test',
  env: Record<string, string> = {},
): { status: number; stderr: string } {
  const childEnv: NodeJS.ProcessEnv = {
    PATH: process.env.PATH ?? '',
    HOME: process.env.HOME ?? '',
    NODE_ENV: nodeEnv,
  };
  for (const [key, value] of Object.entries(env)) {
    childEnv[key] = value;
  }

  try {
    execFileSync(TSX_BIN, ['-e', `import(${JSON.stringify(pathToFileURL(LOADER_PATH).href)})`], {
      cwd,
      encoding: 'utf8',
      env: childEnv,
    });
    return { status: 0, stderr: '' };
  } catch (error) {
    const spawnError = error as { status?: number | null; stderr?: string };
    return { status: spawnError.status ?? 1, stderr: spawnError.stderr ?? '' };
  }
}

describe('scripts/_load-env.ts refusal attribution (D-07)', () => {
  it('names the env file that supplied the production URL, not process.env', () => {
    dir = mkdtempSync(join(tmpdir(), 'load-env-attr-'));
    writeFileSync(join(dir, '.env.production.local'), `DATABASE_URL=${urlFor(PRODUCTION_HOST)}\n`);
    writeFileSync(join(dir, '.env.local'), `DATABASE_URL=${urlFor(DEVELOPMENT_HOST)}\n`);

    const result = runLoader(dir, 'production');

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('REFUSED');
    expect(result.stderr).toContain(PRODUCTION_HOST);
    expect(
      result.stderr,
      'The refusal must name the FILE that caused it. Reporting `process.env` means the guard ' +
        'read the environment dotenv had already mutated, so it can never tell an operator which ' +
        'file to go fix — which is the whole point of D-07.',
    ).toContain('.env.production.local');
    expect(result.stderr).not.toContain('from process.env');

    // D-08: the refusal carries no credential material.
    expect(result.stderr).not.toContain('MUSTNOTAPPEAR');
    expect(result.stderr).not.toContain('fixture:fixture');
  });

  it('still attributes a genuinely ambient DATABASE_URL to process.env (precedence unchanged)', () => {
    dir = mkdtempSync(join(tmpdir(), 'load-env-attr-'));
    // A development file on disk, so the SKIP rule does not short-circuit the guard, and
    // a PRODUCTION value in the real environment — which must still outrank every file.
    writeFileSync(join(dir, '.env.local'), `DATABASE_URL=${urlFor(DEVELOPMENT_HOST)}\n`);

    const result = runLoader(dir, 'development', { DATABASE_URL: urlFor(PRODUCTION_HOST) });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('REFUSED');
    expect(
      result.stderr,
      'A DATABASE_URL that was already in the environment before any file was loaded must still ' +
        'be attributed to process.env — capturing the pre-load environment must not invert the ' +
        'documented precedence (the real environment outranks every file).',
    ).toContain('process.env');
  });
});

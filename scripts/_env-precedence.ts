/**
 * The single TypeScript notion of "which dotenv file wins, and which one
 * supplied the effective DATABASE_URL" (OPS-05, D-02).
 *
 * WHY THIS EXISTS
 * OPS-05 named two independently-drifted resolvers: the bash guard
 * (`scripts/check-local-db-branch.sh`, hardcoded to `.env.local` only) and
 * the TS loader (`scripts/_load-env.ts`, which loads `.env.local` then
 * `.env` and never touches `.env.$NODE_ENV.local`). This module is the
 * shared, pure, testable core of the TS side: `_load-env.ts` (plan 39-03)
 * is rewired onto it, and the differential test (plan 39-05) compares the
 * bash guard's behaviour against it. Two resolvers necessarily exist
 * (a bash script cannot import TypeScript) — this module is what keeps the
 * TS half from drifting from itself, and gives the differential test a
 * single target to compare the bash half against.
 *
 * PRECEDENCE
 * `envFileOrder` is the ONLY place the candidate file order is written
 * down, matching `@next/env`: `.env.$NODE_ENV.local` -> `.env.local` ->
 * `.env.$NODE_ENV` -> `.env`, first-writer-wins, EXCEPT when `NODE_ENV` is
 * `test`, where `.env.local` is excluded outright (so a developer's local
 * override can never leak into a test run). An already-set process
 * environment variable outranks every file, matching dotenv's own
 * `override: false` default and `@next/env`'s behaviour.
 *
 * PARSE, NEVER EXECUTE (D-08)
 * Values are obtained exclusively through dotenv's own `parse()` — never
 * dotenv's mutating loader (which would change `process.env` as a side
 * effect of what must stay a pure, side-effect-free resolver), and never a
 * shell, `eval`, or `require`. A malformed or hostile line in an env file
 * can therefore never execute; at worst it fails to parse as a key/value
 * pair.
 *
 * CREDENTIAL HANDLING (D-07 / D-08)
 * `EnvResolution.url` carries a live credential. This module never prints,
 * logs, or otherwise embeds it — it returns data and lets the caller
 * decide what to do with it. The ONLY sanctioned use of `url` downstream is
 * deriving a hostname via `new URL(url).hostname` (never `.host`, which
 * would carry a port and let an explicit `:5432` slip past a prefix match
 * — bug_011). Callers print the hostname plus which file supplied it (a
 * bare filename, never a path, never a credential) so a reader can answer
 * "which file won?" without re-deriving it.
 *
 * THE LOCAL-ONLY SKIP SIGNAL
 * `filesFound` being empty is the canonical signal that no local env file
 * exists on disk — this is what lets `scripts/check-local-db-branch.sh` and
 * `scripts/_db-branch-guard.ts` no-op safely on Vercel's production builds
 * and inside the `MIGRATE PROD` GitHub Action, neither of which has any
 * `.env*` file checked out.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'dotenv';

/**
 * Returns the candidate dotenv filenames for `nodeEnv`, bare names (not
 * joined to any directory), highest precedence first. Callers must treat
 * the array as first-writer-wins: the first file whose parsed contents
 * assign a key wins, later files are ignored for that key.
 */
export function envFileOrder(nodeEnv: string): string[] {
  if (nodeEnv === 'test') {
    return [`.env.${nodeEnv}.local`, `.env.${nodeEnv}`, '.env'];
  }
  return [`.env.${nodeEnv}.local`, '.env.local', `.env.${nodeEnv}`, '.env'];
}

export interface EnvResolution {
  url: string;
  /** '.env.production.local' | ... | 'process.env' — never a path, never a credential. */
  source: string;
}

/**
 * Resolves the effective `DATABASE_URL` for `nodeEnv` under `cwd`, and
 * reports which file (or `process.env`) supplied it. Returns
 * `resolution: null` rather than guessing when nothing defines a non-empty
 * `DATABASE_URL` — callers that forget to handle `null` get a type error,
 * not a silent pass.
 */
export function resolveDatabaseUrl(opts: {
  cwd: string;
  nodeEnv: string;
  processEnv: NodeJS.ProcessEnv;
}): { resolution: EnvResolution | null; filesFound: string[] } {
  const { cwd, nodeEnv, processEnv } = opts;

  const filesFound = envFileOrder(nodeEnv).filter((file) => existsSync(join(cwd, file)));

  if (typeof processEnv.DATABASE_URL === 'string' && processEnv.DATABASE_URL !== '') {
    return {
      resolution: { url: processEnv.DATABASE_URL, source: 'process.env' },
      filesFound,
    };
  }

  for (const file of filesFound) {
    const contents = readFileSync(join(cwd, file), 'utf8');
    const parsed = parse(contents);
    if (typeof parsed.DATABASE_URL === 'string' && parsed.DATABASE_URL !== '') {
      return {
        resolution: { url: parsed.DATABASE_URL, source: file },
        filesFound,
      };
    }
  }

  return { resolution: null, filesFound };
}

/**
 * Shared TypeScript write-target guard for every `tsx` entry point (OPS-05, D-01/D-02/D-03).
 *
 * WHY THIS EXISTS
 * `scripts/check-local-db-branch.sh` proves the SAME thing for a developer running it by
 * hand; this module proves it programmatically, at module-load time, for every `tsx`
 * script and `drizzle.config.ts` that imports `scripts/_load-env.ts` (plan 39-03 wires the
 * call there). It is not a second policy — the verdict table is derived from
 * `scripts/_neon-endpoints.ts`'s `NEON_ENDPOINTS` (D-05, D-05a), the SAME declarative
 * source the bash guard and the fixture seeders read, and the effective target is
 * resolved via `scripts/_env-precedence.ts`'s `resolveDatabaseUrl` (D-02) — never by
 * reading the raw ambient `DATABASE_URL` variable directly, which is what makes this
 * guard and the bash guard two views of one resolver rather than two resolvers that can
 * drift apart.
 *
 * NEVER THE PORT-CARRYING URL PROPERTY (bug_011)
 * `classifyDatabaseTarget` derives the hostname with `new URL(url).hostname`, never the
 * sibling property that also carries the port — an explicit `:5432` on a production
 * endpoint would otherwise slip past a `startsWith` prefix match. See
 * `scripts/_neon-endpoints.list`'s header for the full incident history.
 *
 * FAIL-SAFE DIRECTION
 * An endpoint this module cannot prove is safe is treated as production, mirroring
 * `scripts/_neon-target.ts`: an unrecognised `*.neon.tech` host, and a lookalike domain
 * that merely ends in something resembling `neon.tech` (e.g. `neon.tech.evil.test`,
 * which does NOT satisfy `endsWith('.neon.tech')`), both refuse rather than pass.
 *
 * CREDENTIAL HANDLING — NEVER INTERPOLATE `EnvResolution.url` (D-07, D-08)
 * Every message this module can emit interpolates only a `hostname` (derived, never the
 * raw URL) and a `source` (a bare dotenv filename, or the literal `'process.env'` — never
 * a path, never a credential). This is load-bearing: guard output is expected to be
 * pasted into a transcript or an issue, so a credential in it would be a disclosure.
 *
 * WHY THE GUARD DOES NOT THROW BY DEFAULT
 * `tsx` entry points are plain Node processes. An uncaught rejection prints the error
 * OBJECT via Node's default handler, and `ERR_INVALID_URL` (thrown by `new URL()` on a
 * malformed string) carries the offending URL on an own enumerable `input` property —
 * which the inspector would dump verbatim, credential and all. This is the exact
 * disclosure trap `scripts/probe-write-isolation.ts`'s docstring documents for the same
 * reason. `assertSafeDatabaseTarget` therefore calls an injectable `onRefuse` (default:
 * print the message to stderr, then `process.exit(1)`) instead of throwing, so tests can
 * assert refusal without killing the vitest worker, and so a refusal in production never
 * risks that disclosure path.
 *
 * THE SKIP RULE IS LOAD-BEARING (D-04's premise)
 * `assertSafeDatabaseTarget` returns immediately and silently when
 * `resolveDatabaseUrl(...).filesFound` is empty — i.e. when NO `.env*` candidate file
 * exists on disk. This is what keeps three sanctioned production paths untouched, because
 * none of them has any `.env*` file checked out:
 *   - Vercel's production build (`DATABASE_URL` arrives as a platform environment
 *     variable, never a file)
 *   - the `MIGRATE PROD` GitHub Action (`.github/workflows/db-migrate.yml`), which injects
 *     `DATABASE_URL_MAIN`/`DATABASE_URL_PREVIEW`/`DATABASE_URL_DEVELOPMENT` as real
 *     environment variables from GitHub secrets
 *   - the INFRA-02 CI migration smoke job (`.github/workflows/ci.yml`, the "Apply
 *     migrations against ephemeral branch" step), which injects `DATABASE_URL` from the
 *     ephemeral Neon branch action's output, again with no `.env*` file present
 * Deleting this rule would break all three. It is re-verified here, not assumed — see
 * `tests/db-branch-guard.test.ts`'s SKIP-rule case.
 */
import { NEON_ENDPOINTS } from './_neon-endpoints';
import { resolveDatabaseUrl } from './_env-precedence';

export type TargetVerdict =
  | 'ok-development'
  | 'ok-local-postgres'
  | 'warn-preview'
  | 'refuse-production'
  | 'refuse-unrecognised'
  | 'refuse-malformed';

/**
 * Pure classification of a `DATABASE_URL` string into a verdict, its hostname (derived
 * via `.hostname`, never `.host` — bug_011), and a human-readable scope label. Exported
 * for direct test access, following the `__resolveTrustedOriginsForTests()` convention in
 * `src/lib/auth/index.ts`.
 *
 * Verdict mapping, derived from `NEON_ENDPOINTS`'s `branch` field — never a second
 * hardcoded table: `main` => `refuse-production`; `preview` => `warn-preview`;
 * `development` => `ok-development`; `localhost`/`127.0.0.1` => `ok-local-postgres`;
 * anything else (including an unrecognised `*.neon.tech` host or a non-parsing string)
 * => a `refuse-*` verdict. A URL that does not parse yields `refuse-malformed` with
 * `hostname: ''`.
 */
export function classifyDatabaseTarget(url: string): {
  verdict: TargetVerdict;
  hostname: string;
  scope: string;
} {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return { verdict: 'refuse-malformed', hostname: '', scope: 'malformed DATABASE_URL' };
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return { verdict: 'ok-local-postgres', hostname, scope: 'local Postgres' };
  }

  // Pre-gate on the exact `.neon.tech` suffix before prefix-matching the endpoint
  // table, so a lookalike domain (e.g. `...neon.tech.evil.test`) falls through to the
  // final `refuse-unrecognised` arm below rather than impersonating a real branch.
  if (hostname.endsWith('.neon.tech')) {
    const match = NEON_ENDPOINTS.find((endpoint) => hostname.startsWith(endpoint.prefix));

    if (!match) {
      return {
        verdict: 'refuse-unrecognised',
        hostname,
        scope: 'UNRECOGNISED Neon endpoint (treated as PRODUCTION)',
      };
    }

    if (match.branch === 'main') {
      return { verdict: 'refuse-production', hostname, scope: match.scope };
    }
    if (match.branch === 'preview') {
      return { verdict: 'warn-preview', hostname, scope: match.scope };
    }
    return { verdict: 'ok-development', hostname, scope: match.scope };
  }

  return {
    verdict: 'refuse-unrecognised',
    hostname,
    scope: 'unrecognised host (not a known Neon endpoint or local Postgres)',
  };
}

/**
 * Builds the operator-facing refusal message. Reuses the remediation wording already in
 * `scripts/check-local-db-branch.sh` (lines 88-91) so a developer sees identical fix
 * instructions from either guard. Interpolates ONLY `hostname` and `source` — never a raw
 * URL, user, password or query string (D-07, D-08).
 */
function buildRefusalMessage(hostname: string, source: string, scope: string): string {
  const target = hostname ? `${scope} (${hostname})` : scope;
  return [
    `REFUSED: DATABASE_URL (from ${source}) resolves to ${target}.`,
    '  Local commands must NEVER read or write production.',
    '  Fix: Neon Console → project leasetic-matrice → branch development →',
    '  Connection details → Pooled connection → copy URL into .env.local.',
  ].join('\n');
}

/** Default `onRefuse`: print to stderr, then exit. Never throws an inspectable object. */
function defaultOnRefuse(message: string): never {
  console.error(message);
  return process.exit(1);
}

/**
 * Resolves the effective `DATABASE_URL` for the given (or defaulted) environment and
 * refuses the process if it targets production or an unrecognised host.
 *
 * Defaults: `cwd` to `process.cwd()`, `nodeEnv` to `process.env.NODE_ENV ?? 'development'`,
 * `processEnv` to `process.env`, and `onRefuse` to `defaultOnRefuse` (stderr + exit).
 *
 * SKIP RULE (load-bearing, D-04's premise): if no `.env*` candidate file exists on disk
 * (`resolveDatabaseUrl(...).filesFound` is empty), this function returns immediately and
 * silently — see the module docstring for why that is required for Vercel, `MIGRATE PROD`
 * and the INFRA-02 CI smoke job to keep working.
 *
 * On a `warn-preview` verdict, prints one advisory line to stderr and returns. On any
 * `refuse-*` verdict, calls `onRefuse` with a message naming the hostname and the
 * `EnvResolution.source` filename, and nothing else.
 */
export function assertSafeDatabaseTarget(opts?: {
  cwd?: string;
  nodeEnv?: string;
  processEnv?: NodeJS.ProcessEnv;
  onRefuse?: (message: string) => never;
}): void {
  const cwd = opts?.cwd ?? process.cwd();
  const nodeEnv = opts?.nodeEnv ?? process.env.NODE_ENV ?? 'development';
  const processEnv = opts?.processEnv ?? process.env;
  const onRefuse = opts?.onRefuse ?? defaultOnRefuse;

  const { resolution, filesFound } = resolveDatabaseUrl({ cwd, nodeEnv, processEnv });

  // SKIP: no env file on disk at all — a CI runner, a Vercel build, or the MIGRATE PROD
  // GitHub Action. See the module docstring.
  if (filesFound.length === 0) {
    return;
  }

  // Nothing resolved a DATABASE_URL even though candidate files exist on disk (e.g. none
  // of them set the key). Nothing to classify; a consumer's own "DATABASE_URL is not set"
  // check is the correct place for that failure, not this guard.
  //
  // THIS IS A DELIBERATE ASYMMETRY WITH THE BASH GUARD (39-REVIEW WR-06), not an
  // oversight. `scripts/check-local-db-branch.sh` prints "no DATABASE_URL found in any
  // candidate file" and EXITS 1 on the same input. The two are allowed to differ here
  // because they answer different questions: the bash guard gates `npm run build`/`npm
  // run start`, where an unresolvable DATABASE_URL is unambiguously a misconfigured
  // machine and failing early is the kindest outcome; this guard runs at import time for
  // 14 consumers whose own startup checks already report the missing variable with
  // script-specific context. Refusing here would replace those specific messages with a
  // generic one and give a database-safety guard authority over a configuration
  // question it has no opinion about — there is no target to be unsafe ABOUT.
  //
  // The asymmetry is asserted in both directions by
  // `tests/db-guard-differential.test.ts`'s DELIBERATE ASYMMETRY case, so aligning the
  // two halves later is a decision someone has to make on purpose. Do not change one
  // side without the other.
  if (!resolution) {
    return;
  }

  const { verdict, hostname, scope } = classifyDatabaseTarget(resolution.url);

  if (verdict === 'warn-preview') {
    console.warn(
      `WARNING: DATABASE_URL (from ${resolution.source}) targets ${scope} (${hostname}). ` +
        'Isolated from production, but not typically the intended local target.',
    );
    return;
  }

  if (verdict === 'ok-development' || verdict === 'ok-local-postgres') {
    return;
  }

  onRefuse(buildRefusalMessage(hostname, resolution.source, scope));
}

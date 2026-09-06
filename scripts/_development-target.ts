/**
 * The write-target ALLOWLIST shared by every fixture seeder (39-REVIEW CR-03).
 *
 * WHY AN ALLOWLIST, NOT A DENYLIST
 * The three seeders each carried a byte-for-byte copy of
 * `NEON_ENDPOINTS.filter((e) => e.branch !== 'development')` and refused only on a hit
 * in that two-element DENYLIST. Anything not in it proceeded to `neon(databaseUrl)` and
 * wrote. That is the exact inversion of the rule `scripts/_neon-endpoints.list`'s own
 * header states:
 *
 *     FAIL-SAFE: an endpoint id that does NOT appear in this file must be treated as
 *     PRODUCTION by every consumer
 *
 * Two bypasses followed from the inversion, and both are closed here:
 *
 *   1. A RECREATED OR NEW PRODUCTION ENDPOINT. Neon issues a fresh endpoint id whenever
 *      `main` is recreated. Until an operator edits the `.list`, that host is
 *      unrecognised — hence not in the denylist — and the seeders would have written
 *      fixture rows straight into production. Under an allowlist, unrecognised is
 *      refused by construction, which is the direction the whole `.list` contract is
 *      written in.
 *
 *   2. CASE. `postgres:` is a NON-SPECIAL URL scheme, so Node's `new URL()` does NOT
 *      lowercase the host the way it does for `http:`/`https:`. An uppercase spelling of
 *      the production hostname therefore survives `new URL(url).hostname` verbatim and
 *      missed the denylist's `startsWith('ep-icy-boat-alx5o1tz')`. DNS is
 *      case-insensitive, so that connection string reaches production regardless. Every
 *      comparison below is made on a lowercased copy.
 *
 * The `_load-env` guard covers most of this in practice but not all of it:
 * `assertSafeDatabaseTarget` returns immediately when no `.env*` candidate file exists
 * on disk (its load-bearing SKIP rule), so `DATABASE_URL=<unrecognised-prod> npm run
 * db:seed:*` in a directory or container with no env file on disk leaves the seeder's
 * own gate as the ONLY thing standing between a fixture write and production. These
 * scripts advertise "development-only, no override flag"; this module is what makes
 * that promise true.
 *
 * MATCHED BY EXACT HOSTNAME EQUALITY, NOT BY PREFIX. A seeder is a write-capable,
 * developer-only tool with exactly one correct target, so it uses the strictest
 * available predicate — the same discipline `scripts/probe-write-isolation.ts` keeps
 * under the Phase 36 D-36-03 exemption. `.hostname` (never `.host`, which carries the
 * port — bug_011) is what callers must pass in.
 */
import { NEON_ENDPOINTS } from './_neon-endpoints';

/** Local Postgres escape hatches, matching the two the guards already recognise. */
const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

/**
 * True only for a hostname a fixture seeder is permitted to write to: the Neon
 * `development` branch endpoint, or local Postgres. Everything else — including any
 * host absent from `scripts/_neon-endpoints.list` — is false, i.e. treated as
 * PRODUCTION.
 *
 * `hostname` must come from `new URL(url).hostname`. Comparison is case-insensitive
 * because DNS is.
 */
export function isDevelopmentTarget(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (LOCAL_HOSTS.includes(host)) return true;
  return NEON_ENDPOINTS.some((e) => e.branch === 'development' && host === e.hostname.toLowerCase());
}

/**
 * The operator-facing refusal text. Interpolates ONLY the hostname — never the raw
 * connection string, user or password (D-07, D-08).
 */
export function developmentTargetRefusalMessage(hostname: string): string {
  return (
    'refusing to seed fixtures into an endpoint that is not the Neon development branch (' +
    hostname +
    '). An endpoint absent from scripts/_neon-endpoints.list is treated as PRODUCTION. ' +
    'This script is development-only and has no override flag.'
  );
}

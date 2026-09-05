/**
 * INFRA-05 write-isolation sentinel probe (CLOSE-05, Phase 36, D-36-03).
 *
 * WHAT THIS IS
 * A SQL-level probe that settles INFRA-05's write-isolation claim empirically: it
 * writes a uniquely-labelled sentinel row to the Neon `development` branch with a
 * raw `postgres` client, asks the `main` (production) branch whether that label
 * exists, then deletes the sentinel from `development`. A count of `0` on `main`
 * means the two branches are isolated; a count `> 0` means a write on `development`
 * is visible on `main` — an isolation violation.
 *
 * WHY THIS EXISTS
 * Phase 29 closed INFRA-05 on architectural inference because the original
 * app-level probe (ISOLATION-PROBE-29) was blocked: login against the
 * `development` branch fails (`[Better Auth]: Invalid password`) because that
 * branch is a copy-on-write fork frozen at 2026-05-27, so its Better Auth
 * credential hashes predate every password rotation since. A SQL-level probe
 * never touches Better Auth, so that blocker does not apply. See
 * `.planning/phases/29-migration-safety-net/29-VERIFICATION.md` §
 * "Known Weak Link — INFRA-05 Evidentiary Basis".
 *
 * WHY THIS IS NOT WIRED INTO CI
 * It requires a production connection string that exists only in the operator's
 * hands; CI has no such credential and must never have one. This is a
 * hand-invoked, local-only, one-shot script — the same posture as
 * `scripts/check-local-db-branch.sh`.
 *
 * THE `_load-env` DIVERGENCE — READ BEFORE "FIXING" THIS
 * Every other `scripts/*.ts` entry point begins `import './_load-env'`. This one
 * deliberately does NOT, because that shared loader reads the developer's local
 * dotenv-style file on disk, and D-36-03 forbids this probe from reading any env
 * file — the developer's local file is exactly the thing this probe must never
 * silently pick up a stored credential from. Both connection strings arrive
 * inline on the invocation via `PROBE_DEV_URL` and `PROBE_MAIN_URL`. DO NOT add
 * `import './_load-env'` back to "fix" a missing-env-var failure — that failure
 * is the intended fail-safe behaviour (see Behaviour below), not a bug.
 *
 * Security note (hostname-only output)
 * This script's output is expected to be pasted into a transcript and into
 * Phase 29's artifacts, so it prints hostnames, the sentinel label, counts and
 * verdicts ONLY — never a full connection string, username or password. The
 * `main`-side client (bound to the const `mainSql`) executes exactly one
 * read-only statement — `SELECT count(*) ... WHERE label = <sentinel>` — and
 * never reads customer data; no INSERT, UPDATE, DELETE or DDL is ever issued on
 * `mainSql`. Any caught error is printed via `err.message` with a `postgres://`
 * substring stripped, because postgres.js errors can embed the connection
 * string.
 *
 * WHY `schema_meta`
 * It is a bootstrap marker table (`src/db/schema.ts`) where a stray row is
 * harmless, and `/healthz` reads it with `.limit(0)` (`src/lib/health.ts:47-56`),
 * so a transient sentinel row cannot affect the health check.
 *
 * RUN (copy-pasteable; both URLs MUST be pooled `-pooler` connection strings)
 *   PROBE_DEV_URL='postgres://<dev-user>:<dev-pass>@ep-polished-band-alphc576-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require' \
 *   PROBE_MAIN_URL='postgres://<main-user>:<main-pass>@ep-icy-boat-alx5o1tz-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require' \
 *   npm run probe:write-isolation
 */
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';

// Full hostnames from docs/operations/neon-branch-routing.md. Matched by exact
// equality only — never a prefix or `startsWith` — so a lookalike host sharing
// an endpoint-ID prefix is rejected as unrecognised rather than misclassified.
const DEV_HOST: string = 'ep-polished-band-alphc576-pooler.c-3.eu-central-1.aws.neon.tech';
const MAIN_HOST: string = 'ep-icy-boat-alx5o1tz-pooler.c-3.eu-central-1.aws.neon.tech';

function usage(): void {
  console.error(
    'Usage: PROBE_DEV_URL=<dev pooled URL> PROBE_MAIN_URL=<main pooled URL> '
    + 'npm run probe:write-isolation',
  );
  console.error(
    `  PROBE_DEV_URL must resolve to the Neon development endpoint (${DEV_HOST}).`,
  );
  console.error(
    `  PROBE_MAIN_URL must resolve to the Neon main (production) endpoint (${MAIN_HOST}).`,
  );
}

// Substring between '@' and the following '/' or ':' — the TypeScript
// equivalent of check-local-db-branch.sh's `sed -E 's#^[^@]*@##; s#[/:].*$##'`.
function extractHostname(url: string): string | null {
  const atIndex = url.indexOf('@');
  if (atIndex === -1) return null;
  const rest = url.slice(atIndex + 1);
  const end = rest.search(/[/:]/);
  const host = end === -1 ? rest : rest.slice(0, end);
  return host || null;
}

/** Strip a caught error down to a bounded, credential-free message. */
function safeErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.replace(/postgres:\/\/[^\s]*/g, '[redacted]');
}

async function main(): Promise<void> {
  const devUrl = process.env.PROBE_DEV_URL;
  const mainUrl = process.env.PROBE_MAIN_URL;

  if (!devUrl || !mainUrl) {
    usage();
    process.exit(1);
    return;
  }

  const devHost = extractHostname(devUrl);
  const mainHost = extractHostname(mainUrl);

  if (!devHost) {
    console.error('ERROR: could not parse a hostname out of PROBE_DEV_URL.');
    process.exit(1);
    return;
  }
  if (!mainHost) {
    console.error('ERROR: could not parse a hostname out of PROBE_MAIN_URL.');
    process.exit(1);
    return;
  }

  if (devHost !== DEV_HOST) {
    console.error(`ERROR: PROBE_DEV_URL resolves to an unrecognised host: ${devHost}`);
    console.error(`  Expected exactly: ${DEV_HOST}`);
    process.exit(1);
    return;
  }
  if (mainHost !== MAIN_HOST) {
    console.error(`ERROR: PROBE_MAIN_URL resolves to an unrecognised host: ${mainHost}`);
    console.error(`  Expected exactly: ${MAIN_HOST}`);
    process.exit(1);
    return;
  }
  if (devHost === mainHost) {
    console.error(
      `ERROR: PROBE_DEV_URL and PROBE_MAIN_URL resolve to the same host (${devHost}) — refusing.`,
    );
    process.exit(1);
    return;
  }

  const sentinel = `isolation-probe-36-${randomUUID()}`;
  const note = 'INFRA-05 write-isolation probe (Phase 36, D-36-03) — deleted in the same run';

  console.log(`dev host:  ${devHost}`);
  console.log(`main host: ${mainHost}`);
  console.log(`sentinel:  ${sentinel}`);

  const devSql = postgres(devUrl, { max: 1, prepare: false, onnotice: () => {} });
  const mainSql = postgres(mainUrl, { max: 1, prepare: false, onnotice: () => {} });

  let exitCode = 1;

  try {
    await devSql`
      INSERT INTO schema_meta (label, note) VALUES (${sentinel}, ${note})
    `;

    const [devReadBack] = await devSql`
      SELECT count(*)::int AS n FROM schema_meta WHERE label = ${sentinel}
    `;
    const devCount = devReadBack?.n ?? 0;

    if (devCount !== 1) {
      console.error(
        `INCONCLUSIVE: sentinel write did not land on ${devHost} (dev count = ${devCount}).`,
      );
      exitCode = 1;
    } else {
      const [mainResult] = await mainSql`
        SELECT count(*)::int AS n FROM schema_meta WHERE label = ${sentinel}
      `;
      const mainCount = mainResult?.n ?? 0;

      if (mainCount === 0) {
        console.log(`PASS: sentinel ${sentinel} is absent from ${mainHost} — ISOLATED.`);
        exitCode = 0;
      } else {
        console.error(
          `ISOLATION VIOLATED: sentinel ${sentinel} is visible on ${mainHost} `
          + `(count = ${mainCount}). Investigate and remove this row from main.`,
        );
        exitCode = 1;
      }
    }
  } catch (err) {
    console.error(`ERROR during probe run: ${safeErrorMessage(err)}`);
    exitCode = 1;
  } finally {
    try {
      const deleteResult = await devSql`
        DELETE FROM schema_meta WHERE label = ${sentinel}
      `;
      if (deleteResult.count !== 1) {
        console.error(
          `WARNING: cleanup deleted ${deleteResult.count} row(s) for sentinel ${sentinel} `
          + `on ${devHost} (expected 1) — verify by hand.`,
        );
      }
    } catch (cleanupErr) {
      console.error(
        `WARNING: cleanup DELETE failed for sentinel ${sentinel} on ${devHost}: `
        + `${safeErrorMessage(cleanupErr)} — verify by hand.`,
      );
    }

    try {
      await devSql.end({ timeout: 5 });
    } catch (closeErr) {
      console.error(`WARNING: failed to close dev connection: ${safeErrorMessage(closeErr)}`);
    }

    try {
      await mainSql.end({ timeout: 5 });
    } catch (closeErr) {
      console.error(`WARNING: failed to close main connection: ${safeErrorMessage(closeErr)}`);
    }
  }

  process.exit(exitCode);
}

main();

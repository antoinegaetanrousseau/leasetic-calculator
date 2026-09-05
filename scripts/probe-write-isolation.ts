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
 * statement — `SELECT count(*), current_setting('transaction_read_only') ...
 * WHERE label = <sentinel>` — returning a count and a GUC value, never a row of
 * `schema_meta`; no INSERT, UPDATE, DELETE or DDL is ever issued on `mainSql`.
 *
 * What the read-only control actually guarantees, stated precisely: the
 * `default_transaction_read_only` startup parameter is REQUESTED on that
 * connection (see `MAIN_SESSION_READ_ONLY`), and the single statement above
 * then MEASURES in-band whether the server applied it. Requesting alone would
 * prove nothing — a proxy or pooler can accept the connection and silently
 * discard the parameter, yielding a read-write session with no error raised.
 *
 * On Neon it IS discarded: observed 2026-09-05 against the real `main` branch
 * on the pooled endpoint AND on the direct one, both reporting
 * `transaction_read_only = off`. So the run WARNS rather than refuses, and this
 * script makes no claim that the session is read-only at the server. The
 * properties it does guarantee are the D-36-03 ones — inline-only URLs, exactly
 * one read-only statement on `mainSql`, guaranteed `finally` cleanup,
 * hostname-only output — none of which depend on the GUC. The floor that would
 * actually hold is a read-only Neon ROLE in the PROBE_MAIN_URL slot; that is
 * credential work and belongs with OPS-01 in Phase 39.
 *
 * Every caught error — including anything that
 * escapes `main()` — goes through `safeErrorMessage`, which prints `err.message`
 * only and redacts both `postgres://` and `postgresql://` URLs, bare
 * `user:pass@` fragments, and the two supplied URLs verbatim. `main()` is never
 * invoked bare: Node's default unhandled-rejection handler prints the error
 * OBJECT, and `ERR_INVALID_URL` carries the offending URL on an `input`
 * property.
 *
 * SAFETY GATES (each one fails closed; nothing is echoed back from the input)
 *   1. Both URLs must be present, or the run refuses (this is the intended
 *      failure when no env file is read — see the `_load-env` note above).
 *   2. Each URL must parse as an absolute `postgres:`/`postgresql:` URL under
 *      the platform parser — the SAME parser postgres.js uses — and yield a
 *      bare DNS hostname. A hand-rolled substring split is NOT used: it folded
 *      credential material into the "hostname" and accepted scheme-less strings
 *      the driver routed elsewhere.
 *   3. Each hostname must equal, exactly, one of the two hostnames its branch
 *      is published under — the pooled endpoint from
 *      `docs/operations/neon-branch-routing.md` or the direct (non-pooled) form
 *      of the same endpoint. Exact equality against a two-element set; never a
 *      prefix match. The two branches' sets are disjoint, so supplying a dev
 *      hostname in the main slot is still refused.
 *   4. After construction, the DRIVER's own resolved host must equal the same
 *      value (compared case-insensitively on both sides), so the guard and the
 *      connect path can never diverge — this also neutralises postgres.js's
 *      `PGHOST` fallback.
 *   5. The `main` session's `transaction_read_only` setting is MEASURED in-band
 *      by the one statement it issues, and reported. This gate WARNS, it does
 *      not fail closed — Neon discards the startup parameter on both endpoint
 *      types (observed 2026-09-05), and the isolation verdict does not depend
 *      on it. See the branch itself for the full rationale.
 *   6. Cleanup must be confirmed: if the sentinel's DELETE cannot be shown to
 *      have removed exactly one row, the run exits non-zero even when the
 *      isolation verdict itself was PASS.
 *
 * WHY `schema_meta`
 * It is a bootstrap marker table (`src/db/schema.ts`) where a stray row is
 * harmless, and `/healthz` reads it with `.limit(0)` (`src/lib/health.ts:47-56`),
 * so a transient sentinel row cannot affect the health check.
 *
 * RUN (each URL must be that branch's pooled OR direct connection string)
 * Do NOT put the production password on the command line: that writes it into
 * shell history and into the process's `/proc`-visible argv for the duration of
 * the run. Read both values into hidden prompts, pass them through the
 * environment, and unset them immediately — this is the form the recorded run
 * in `.planning/phases/36-gate-repair-planning-record-hygiene/36-PROBE-TRANSCRIPT.md`
 * actually used:
 *
 *   read -rs -p 'dev  pooled URL: ' PROBE_DEV_URL;  echo
 *   read -rs -p 'main pooled URL: ' PROBE_MAIN_URL; echo
 *   PROBE_DEV_URL="$PROBE_DEV_URL" PROBE_MAIN_URL="$PROBE_MAIN_URL" npm run probe:write-isolation
 *   unset PROBE_DEV_URL PROBE_MAIN_URL
 *
 * The expected endpoints, for reference (hostnames only, never credentials):
 *   dev  → ep-polished-band-alphc576-pooler.c-3.eu-central-1.aws.neon.tech
 *          ep-polished-band-alphc576.c-3.eu-central-1.aws.neon.tech        (direct)
 *   main → ep-icy-boat-alx5o1tz-pooler.c-3.eu-central-1.aws.neon.tech
 *          ep-icy-boat-alx5o1tz.c-3.eu-central-1.aws.neon.tech             (direct)
 *
 * Either form works for either slot. Both are accepted because the direct
 * endpoint was, briefly, believed to be the fix for gate 5 — it is not.
 * Measured 2026-09-05 against the real `main` branch:
 *
 *   pooled endpoint -> transaction_read_only = off
 *   direct endpoint -> transaction_read_only = off
 *
 * Neon discards `default_transaction_read_only` on BOTH, so switching endpoint
 * type changes nothing about gate 5 (which now warns rather than refuses). The
 * dev slot is normally pooled simply because that is the value already sitting
 * in the local test-env file.
 *
 * TESTING THIS SCRIPT'S OWN GATES — READ BEFORE WRITING A TEST INPUT
 * Known residual, deliberately not designed away (no parse-only mode exists;
 * adding one would widen the surface of a production-touching script). There is
 * no way to exercise the hostname gates without opening a socket, because a
 * CORRECT guard is precisely one that lets well-formed, credential-shaped input
 * through — so any input that tests the hostname logic proceeds to a connection
 * attempt on gate 5.
 *
 * The consequence is not hypothetical. While demonstrating the CR-01 fix, an
 * agent ran this script with the REAL allow-listed hostnames and a synthetic
 * username; because the fix made that input pass, the script opened a socket to
 * the Neon `development` pooled endpoint and was rejected at auth
 * (`password authentication failed for user 'fakeuser'`). No write, no read,
 * `main` never contacted, nothing left behind — but only because the slot
 * involved was `development`. The identical mistake in the PROBE_MAIN_URL slot
 * opens a socket to production.
 *
 * So: to test the gates, copy this file and rewrite both host constants to
 * RFC-2606 `.invalid` names, then assert on the copy that the `DEV_POOLED` and
 * `MAIN_POOLED` lines both end in `.invalid` before running anything. (Do not
 * assert "zero matches for the real domain" — this paragraph mentions it, so
 * that check fails on its own prose.) DNS never resolves `.invalid`, so the
 * copy physically cannot reach an endpoint even when input passes every gate.
 * For a full end-to-end run, point the rewritten constants at a local socket.
 * Never use the real hostnames to test guard logic.
 */
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';

// Full hostnames from docs/operations/neon-branch-routing.md. Matched by exact
// equality only — never a prefix or `startsWith` — so a lookalike host sharing
// an endpoint-ID prefix is rejected as unrecognised rather than misclassified.
const DEV_POOLED: string = 'ep-polished-band-alphc576-pooler.c-3.eu-central-1.aws.neon.tech';
const MAIN_POOLED: string = 'ep-icy-boat-alx5o1tz-pooler.c-3.eu-central-1.aws.neon.tech';

/**
 * Neon exposes each endpoint at two hostnames: the pooled one (with a `-pooler`
 * suffix on the endpoint-ID label) and the direct one without it. Only the
 * pooled hostnames are recorded in `docs/operations/neon-branch-routing.md`,
 * because pooled is what the application uses (routing rule 2).
 *
 * The direct hostname is accepted here as well, for one specific reason: a
 * pgbouncer-family pooler can silently discard the `default_transaction_read_only`
 * startup parameter (see MAIN_SESSION_READ_ONLY below), and this was observed
 * against the real `main` pooled endpoint on 2026-09-05 — the run refused, and
 * the refusal message told the operator to use the direct endpoint, which the
 * allow-list then rejected. The advice was unreachable. Accepting the direct
 * hostname makes the documented remedy actually usable.
 *
 * This derivation strips the literal `-pooler` from the first label only, and
 * asserts it changed something — a hostname that does not match the expected
 * shape fails loudly at module load rather than silently widening the
 * allow-list to a value nobody intended.
 */
function directOf(pooled: string): string {
  const direct = pooled.replace(/^([^.]*)-pooler\./, '$1.');
  if (direct === pooled) {
    throw new Error(
      `probe-write-isolation: expected a '-pooler' suffix on the first label of '${pooled}'. `
      + 'The allow-list derivation is stale — check docs/operations/neon-branch-routing.md.',
    );
  }
  return direct;
}

// Each branch accepts exactly two hostnames. Membership is tested by exact
// equality against these frozen arrays — still never a prefix match, and the
// two sets are disjoint, so a dev hostname supplied in the main slot (or vice
// versa) is still refused.
const DEV_HOSTS: readonly string[] = Object.freeze([DEV_POOLED, directOf(DEV_POOLED)]);
const MAIN_HOSTS: readonly string[] = Object.freeze([MAIN_POOLED, directOf(MAIN_POOLED)]);

function usage(): void {
  console.error(
    'Usage: PROBE_DEV_URL=<dev pooled URL> PROBE_MAIN_URL=<main pooled URL> '
    + 'npm run probe:write-isolation',
  );
  console.error(
    `  PROBE_DEV_URL must resolve to a Neon development endpoint (${DEV_HOSTS.join(' or ')}).`,
  );
  console.error(
    `  PROBE_MAIN_URL must resolve to a Neon main (production) endpoint (${MAIN_HOSTS.join(' or ')}).`,
  );
}

// A bare DNS hostname as it appears in a Neon pooled URL: ASCII letters,
// digits, dots and hyphens only. Anything else — a comma-separated multihost
// list, a bracketed IPv6 literal, a percent-escape, a stray fragment of a
// credential — is refused rather than reported back to the operator.
const HOSTNAME_RE = /^[a-z0-9.-]+$/;

// Parse with the platform URL parser — the SAME parser the postgres driver
// uses (`postgres/src/index.js:543` calls `new URL`). This is deliberately NOT
// the TypeScript equivalent of check-local-db-branch.sh's
// `sed -E 's#^[^@]*@##; s#[/:].*$##'` any more: that hand-rolled form splits on
// the FIRST '@', so a password legally containing '@' made the "hostname" a
// substring beginning with the tail of the password, which was then echoed
// into an error message (a credential leak), and a string with no '://' at all
// yielded a plausible-looking hostname that the driver never connected to (a
// false PASS). A null return here takes the "could not parse a hostname"
// refusal branch, which echoes no input-derived text at all.
function extractHostname(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') return null;
  // Require credentials in the URL, matching `check-local-db-branch.sh:54-62`
  // ("no user@host segment (missing credentials)"). Without this the URL parser
  // happily accepts `postgres://host/db`, and postgres.js then fills the gap
  // from `env.PGUSERNAME` / `env.PGUSER` / `osUsername()` and `env.PGPASSWORD`
  // (`index.js:439,469`) — live env fallbacks on a run this header describes as
  // "both connection strings arrive inline".
  if (!parsed.username) return null;
  // `postgres:` is not a WHATWG "special" scheme, so the host is parsed as an
  // opaque host and is NOT case-folded — fold it here so an operator pasting a
  // URL with any uppercase in the host is not refused over DNS case.
  const host = parsed.hostname.toLowerCase();
  return host && HOSTNAME_RE.test(host) ? host : null;
}

/**
 * Strip a caught error down to a bounded, credential-free message.
 *
 * This is the last line of defence for every `catch` in this file and for the
 * terminal handler at the bottom, so its coverage is deliberately maximal:
 *
 *  1. Both accepted schemes. Neon's connection panel emits `postgresql://`,
 *     and postgres.js accepts it, so a `postgres://`-only pattern let the
 *     commonest real-world form straight through. Case-insensitive too.
 *  2. Any `user:pass@` userinfo fragment, with or WITHOUT the leading `//`.
 *     Errors routinely quote the authority without a scheme, and requiring the
 *     `//` left the bare form untouched.
 *  3. A verbatim scrub of the two URLs the operator actually supplied. Pattern
 *     matching can always be out-thought; an exact-string replacement of the
 *     known secrets cannot miss, whatever shape the driver embedded them in.
 *     Note its limit: it matches the whole URL, so it does NOT catch a password
 *     quoted on its own. Stage 2 is what covers `user:pass@` fragments, and no
 *     stage catches a bare password in isolation — postgres.js does not produce
 *     one today (`errors.js:16-27` embeds `host:port` only, and `PostgresError`
 *     copies a server message that never contains the client password), but the
 *     limit is worth knowing rather than assuming away.
 */
function safeErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  let out = raw
    .replace(/postgres(?:ql)?:\/\/\S*/gi, '[redacted]')
    .replace(
      /(\/\/)?[^\s/@]{1,64}:[^\s/@]{1,64}@/g,
      (_match, slashes: string | undefined) => `${slashes ?? ''}[redacted]@`,
    );
  for (const secret of [process.env.PROBE_DEV_URL, process.env.PROBE_MAIN_URL]) {
    if (secret) out = out.split(secret).join('[redacted]');
  }
  return out;
}

/**
 * Construct a `postgres` client with construction itself inside a `try`.
 * `postgres()` parses the URL EAGERLY (`parseOptions` → `parseUrl` → `new URL`),
 * so it can throw synchronously. Left unguarded, that throw escapes `main()` as
 * an unhandled rejection and Node's default handler inspects the error object —
 * and `ERR_INVALID_URL` carries the offending string on an own enumerable
 * `input` property, which the inspector dumps verbatim, password and all. Only
 * `err.message` is ever printed here, via `safeErrorMessage`.
 */
/**
 * Startup parameter REQUESTING that the `main` (production) session be
 * read-only at the server, so any future write on that client errors instead of
 * succeeding.
 *
 * Why a mechanical floor is wanted at all: the "exactly one read-only statement
 * on `mainSql`" property was otherwise enforced only by the source reading
 * correctly today — a later edit adding a second statement is a one-line change
 * against production with nothing but a lexical convention in its way. D-36-03
 * treats reading production from a local machine as the thing INFRA-05 forbids;
 * that exception deserves better than a naming convention.
 *
 * Why REQUESTING is not the same as HAVING, which is the whole point of the
 * in-band check on the `mainSql` statement. postgres.js does genuinely put this
 * in the StartupMessage (`postgres/src/connection.js:970`), and there are three
 * possible outcomes, not two:
 *
 *   - honoured  → `transaction_read_only` reports `on`; the floor is real.
 *   - refused   → the connection errors; the run fails closed. Safe.
 *   - DISCARDED → a pgbouncer-family pooler accepts the connection, drops the
 *                 parameter (`ignore_startup_parameters`, or not carrying it in
 *                 `track_extra_parameters`), raises NO error, and hands back a
 *                 read-write session. Nothing about sending the parameter
 *                 detects this — only reading the setting back does.
 *
 * The third branch is why this constant is not, by itself, a guarantee, and why
 * the header does not claim it is. Ideally pair it with a dedicated read-only
 * Neon role in the PROBE_MAIN_URL slot; this is the floor that holds even when
 * the operator supplies the owner role, which is what happens in practice.
 */
const MAIN_SESSION_READ_ONLY = { default_transaction_read_only: true } as const;

function createClient(
  varName: string,
  url: string,
  connection?: { default_transaction_read_only?: boolean },
) {
  try {
    return postgres(url, { max: 1, prepare: false, onnotice: () => {}, connection });
  } catch (err) {
    console.error(`ERROR: the postgres driver rejected ${varName}: ${safeErrorMessage(err)}`);
    process.exit(1);
  }
}

/**
 * Construct a client and then prove the DRIVER resolved the very host the
 * allow-list accepted.
 *
 * `extractHostname` and `postgres()` are two parsers, and a guard that
 * validates a string the driver does not use is no guard at all: postgres.js
 * derives its target as `o.hostname || o.host || multihost || url.hostname ||
 * env.PGHOST || 'localhost'` (`postgres/src/index.js:437`), so a URL could pass
 * the allow-list and connect somewhere else entirely — writing the sentinel to
 * whatever local/`$PGHOST` database answered, reading it back, and emitting a
 * false `PASS ... ISOLATED`. Asserting `sql.options.host` after construction is
 * what makes the two permanently inseparable, and it also neutralises the
 * driver's `PGHOST` fallback on a run the header describes as "both connection
 * strings arrive inline".
 *
 * The resolved host is deliberately NOT echoed: on a malformed URL it can be a
 * fragment of the credential.
 *
 * The comparison is case-insensitive on BOTH sides. `extractHostname` folds
 * case (DNS is case-insensitive) but `postgres:` is not a WHATWG "special"
 * scheme, so the driver preserves whatever case it was given — comparing the
 * two on different footings made a benign DNS-case difference trip this
 * assertion. That matters more than the inconvenience: this is the one message
 * in the script that means "the guard and the connect path disagree, something
 * is routing you somewhere unexpected", and an alarm that fires on benign input
 * teaches the operator to dismiss exactly the signal that must never be
 * dismissed.
 */
async function openClient(
  varName: string,
  url: string,
  expectedHosts: readonly string[],
  connection?: { default_transaction_read_only?: boolean },
) {
  const sql = createClient(varName, url, connection);
  const resolved = sql.options.host;
  if (resolved.length !== 1 || !expectedHosts.includes(resolved[0].toLowerCase())) {
    console.error(
      `ERROR: the postgres driver resolved a different host for ${varName} than the `
      + 'allow-list accepted — refusing.',
    );
    console.error(`  Expected the driver to target exactly one of: ${expectedHosts.join(', ')}`);
    await sql.end({ timeout: 5 });
    process.exit(1);
  }
  return sql;
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

  if (!DEV_HOSTS.includes(devHost)) {
    console.error(`ERROR: PROBE_DEV_URL resolves to an unrecognised host: ${devHost}`);
    console.error(`  Expected exactly one of: ${DEV_HOSTS.join(', ')}`);
    process.exit(1);
    return;
  }
  if (!MAIN_HOSTS.includes(mainHost)) {
    console.error(`ERROR: PROBE_MAIN_URL resolves to an unrecognised host: ${mainHost}`);
    console.error(`  Expected exactly one of: ${MAIN_HOSTS.join(', ')}`);
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

  // `finally` does not run on SIGINT/SIGTERM, so a probe interrupted during the
  // `main`-side query (the slowest step — a cold Neon compute can take seconds)
  // would leave the sentinel on `development` with nothing but the label
  // printed above to recover it from. Print the exact recovery statement
  // instead of relying on the operator having scrolled back. Deliberately does
  // NOT attempt the DELETE itself: async work in a signal handler racing
  // `process.exit` cannot be relied on, and a half-run cleanup that reports
  // success would be worse than an explicit instruction.
  const onInterrupt = (signal: string): void => {
    console.error(`\nINTERRUPTED (${signal}) — the sentinel may still exist on ${devHost}.`);
    console.error(`  Remove it by hand: DELETE FROM schema_meta WHERE label = '${sentinel}';`);
    process.exit(130);
  };
  process.once('SIGINT', () => onInterrupt('SIGINT'));
  process.once('SIGTERM', () => onInterrupt('SIGTERM'));

  const devSql = await openClient('PROBE_DEV_URL', devUrl, DEV_HOSTS);
  const mainSql = await openClient('PROBE_MAIN_URL', mainUrl, MAIN_HOSTS, MAIN_SESSION_READ_ONLY);

  let exitCode = 1;
  // The `finally` below runs unconditionally, including when the INSERT itself
  // threw (bad credentials, TLS failure, table missing). In that case the
  // cleanup DELETE correctly affects 0 rows and there is nothing to verify —
  // warning about it would send the operator to hand-inspect a database over a
  // non-event, and would dilute the one signal the transcript relies on.
  let inserted = false;

  try {
    await devSql`
      INSERT INTO schema_meta (label, note) VALUES (${sentinel}, ${note})
    `;
    inserted = true;

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
      // Still exactly ONE statement on `mainSql`, still returning a count and a
      // GUC value rather than any row of `schema_meta`. Folding
      // `current_setting('transaction_read_only')` into the statement the run
      // was always going to issue makes the session prove its own read-only-ness
      // as a side effect — see `MAIN_SESSION_READ_ONLY` for why sending the
      // startup parameter is not, on its own, evidence that it took effect.
      const [mainResult] = await mainSql`
        SELECT count(*)::int AS n, current_setting('transaction_read_only') AS ro
        FROM schema_meta WHERE label = ${sentinel}
      `;
      const mainCount = mainResult?.n ?? 0;
      const mainReadOnly = mainResult?.ro === undefined ? 'unknown' : String(mainResult.ro);

      // Gate 5 WARNS, it does not refuse. Rationale, recorded because the
      // opposite choice was tried first and had to be reversed:
      //
      // The read-only session is defence-in-depth added during code review
      // (WR-05). It is NOT one of D-36-03's constraints, which are: both URLs
      // inline-only, exactly one read-only statement on `mainSql`, guaranteed
      // `finally` cleanup, and hostname-only output. All four hold whatever this
      // GUC reports.
      //
      // Observed 2026-09-05 against the real `main` branch, both endpoint types:
      //   pooled (ep-icy-boat-alx5o1tz-pooler...)  -> transaction_read_only = off
      //   direct (ep-icy-boat-alx5o1tz...)         -> transaction_read_only = off
      // So this is not a pgbouncer artifact and the "use the direct endpoint"
      // remedy does not work. Neon appears to forward only an allowlist of
      // startup parameters through its proxy, which fronts both endpoint types.
      // That is inference from two observations, not a documented Neon behaviour.
      //
      // Refusing here made the probe unable to answer the question it exists to
      // answer, on this platform, ever — a control that can never pass is one
      // that gets deleted in frustration rather than respected. The floor that
      // actually holds is a read-only Neon ROLE in the PROBE_MAIN_URL slot; that
      // is credential work and belongs with OPS-01 in Phase 39.
      if (mainReadOnly !== 'on') {
        console.warn(
          `WARNING: the session on ${mainHost} is NOT read-only `
          + `(transaction_read_only = ${mainReadOnly}).`,
        );
        console.warn(
          '  The default_transaction_read_only startup parameter was sent but not honoured. '
          + 'Observed on 2026-09-05 for BOTH the pooled and the direct Neon endpoint, so this '
          + 'is not a pooler-only artifact and switching endpoint type does not fix it.',
        );
        console.warn(
          '  The isolation verdict below is still valid — it rests on the sentinel comparison, '
          + 'not on this setting. What is NOT guaranteed is the defence-in-depth floor: a future '
          + 'edit adding a write to `mainSql` would not be stopped by the server. Supply a role '
          + 'that is read-only at the database to close that gap (Phase 39, OPS-01).',
        );
      }

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
      if (inserted && deleteResult.count !== 1) {
        console.error(
          `WARNING: cleanup deleted ${deleteResult.count} row(s) for sentinel ${sentinel} `
          + `on ${devHost} (expected 1) — verify by hand.`,
        );
        // D-36-03 requires that nothing be left behind on `development`. A run
        // that cannot prove that has not met its own contract, so it fails —
        // the exit code the operator reports must not say 0 while a sentinel
        // may still exist.
        console.error('  Marking this run FAILED: cleanup could not be confirmed.');
        exitCode = 1;
      }
    } catch (cleanupErr) {
      if (inserted) {
        exitCode = 1;
        console.error(
          `WARNING: cleanup DELETE failed for sentinel ${sentinel} on ${devHost}: `
          + `${safeErrorMessage(cleanupErr)} — verify by hand.`,
        );
      } else {
        console.error(
          `NOTE: cleanup DELETE could not run (${safeErrorMessage(cleanupErr)}), but no `
          + 'sentinel was ever written — nothing to clean up.',
        );
      }
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

// Terminal handler. `main()` must never be invoked bare: Node's default
// unhandled-rejection handler prints the whole error OBJECT, and postgres.js
// errors can carry the connection string on a property (`input`, `cause`, …).
// Everything that escapes `main()` is funnelled through `safeErrorMessage`,
// which prints the message text only.
main().catch((err: unknown) => {
  console.error(`FATAL: ${safeErrorMessage(err)}`);
  process.exit(1);
});

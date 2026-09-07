/**
 * Phase 36 Plan 36-04/05/06 — CLOSE-05 gap coverage: the safety contracts that make
 * scripts/probe-write-isolation.ts safe to point at a production Neon endpoint.
 *
 * `scripts/probe-write-isolation.ts` is NEVER executed by this suite — it connects to
 * real Neon `development` and `main` endpoints, and D-36-03 (36-CONTEXT.md) exists
 * precisely so that only an operator, in their own shell, ever supplies those two
 * connection strings. Every contract below is a static source-text assertion against
 * the committed file.
 *
 * Neighbour, not a duplicate: `tests/load-env-contracts.test.ts` Contract 3 already pins
 * the first clause of D-36-03 — that this file does not import the shared `./_load-env`
 * loader. This file extends the remaining D-36-03 clauses (hostname allow-list,
 * fail-closed ordering, credential-free output, mainSql read-only-by-construction,
 * npm reachability, and the Phase 29 artifact this probe's existence is meant to close).
 * The two files are deliberate neighbours, not a copy — see Contract A below.
 *
 * What each contract protects, and what a red test means:
 *
 *   A. No env file is opened — extends load-env-contracts.test.ts Contract 3 (which
 *      pins the `./_load-env` import specifically) with the other three shapes D-36-03
 *      forbids: a `dotenv` import, a shell `source` of an env file, and a `readFileSync`
 *      of a `.env*` path. A red test here means the probe gained a path to a stored
 *      credential the operator did not type inline.
 *
 *   B. The header comment states, in words, why this file diverges from every other
 *      `scripts/*.ts` entry point by not importing `./_load-env`. Without this sentence,
 *      a future maintainer "fixing" a missing-env-var failure re-adds the import and
 *      silently reopens the exact hole D-36-03 closes.
 *
 *   C. The full-hostname allow-list names both real Neon endpoints, and the refusal path
 *      is fail-closed: a wrong dev-side hostname must be rejected BEFORE any client is
 *      constructed. Checked by source ORDER (the hostname-check lines appear before the
 *      first `openClient(` call that actually opens a socket), not by running the script.
 *
 *   D. No console.* call interpolates a credential — no username, no password, no
 *      `postgres://` scheme, hostnames only. Uses the exact technique
 *      `tests/load-env-contracts.test.ts` Contract 5 already established for this repo
 *      (a coarse, line-scoped backstop — see that file's own docstring for its stated
 *      limitation) rather than inventing a second detection method.
 *
 *   E. `mainSql` is read-only by construction: exactly one declaration, one query, one
 *      `end()`. See the extended note directly above that test below — the naive
 *      "grep the literal token mainSql, strip both comment forms" technique the phase's
 *      own plan (36-04) and verifier (36-VERIFICATION.md) used is now stale against the
 *      CURRENT committed file, for a reason neither of those documents anticipated.
 *
 *   F. Zero write verbs ever appear on the `mainSql` tagged-template query — the
 *      main-side session is read-only by construction, checked structurally.
 *
 *   G. `package.json` has a `probe:write-isolation` script reaching the probe.
 *
 *   H. `.planning/phases/29-migration-safety-net/29-VALIDATION.md` exists and its
 *      frontmatter carries a `nyquist_compliant` key (36-06-PLAN's artifact contract).
 *      The file legitimately records `not-derivable`, a deliberate refusal to fabricate
 *      retroactive Nyquist dimensions (D-36-04) — this test asserts the KEY is present,
 *      never that its value is `true`.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolvePhaseDoc } from './_planning-docs';

const REPO_ROOT = process.cwd();
const PROBE_FILE = 'scripts/probe-write-isolation.ts';

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

/** Non-comment ("code") lines only — strips `*` block-comment continuations and `//` line comments. */
function codeLines(contents: string): string[] {
  return contents.split('\n').filter((line) => !/^\s*(\*|\/\/)/.test(line));
}

describe('CLOSE-05 — scripts/probe-write-isolation.ts safety contracts (36-04/05/06)', () => {
  it('A. opens no env file — no dotenv, no source, no readFileSync of a .env* path (extends load-env-contracts.test.ts Contract 3)', () => {
    const contents = read(PROBE_FILE);
    const code = codeLines(contents).join('\n');

    expect(
      /from\s+['"]dotenv['"]|require\(\s*['"]dotenv['"]\s*\)/.test(code),
      `${PROBE_FILE} imports dotenv in a code line. D-36-03 forbids this probe from reading any ` +
        'stored env file — both connection strings must arrive inline on the invocation.',
    ).toBe(false);
    expect(
      /readFileSync\([^)]*\.env/.test(code),
      `${PROBE_FILE} calls readFileSync on a path containing ".env" in a code line. D-36-03 ` +
        'forbids reading any env file from disk.',
    ).toBe(false);
    expect(
      /\bsource\s+['"]?\.env/.test(code) || /child_process|execSync|\bexeca?\(|\bspawn\(/.test(code),
      `${PROBE_FILE} appears to shell out or source an env file. D-36-03 forbids sourcing any env ` +
        'file — the same discipline load-env-contracts.test.ts Contract 6 enforces for phase-39 scripts.',
    ).toBe(false);
  });

  it('B. the header comment states why it diverges from every other scripts/*.ts by not importing ./_load-env (D-36-03)', () => {
    const contents = read(PROBE_FILE);
    // Restrict to the header docblock (first `/** ... */`) so this is genuinely testing
    // documentation, not incidentally matching prose anywhere in the 600+ line file.
    const headerMatch = contents.match(/^\/\*\*[\s\S]*?\*\//);
    expect(headerMatch, `${PROBE_FILE} has no opening docblock header comment.`).not.toBeNull();
    const header = headerMatch![0];

    expect(
      header,
      `${PROBE_FILE}'s header comment no longer names D-36-03 as the source of its safety contract.`,
    ).toContain('D-36-03');
    expect(
      header,
      `${PROBE_FILE}'s header comment no longer explains the _load-env divergence in words — a ` +
        'future maintainer "fixing" a missing-env-var failure could silently re-add the import.',
    ).toMatch(/_load-env/);
    expect(
      header,
      `${PROBE_FILE}'s header comment must state that OTHER scripts/*.ts entry points DO import ` +
        'the shared loader while this one deliberately does not — the contrast is the point.',
    ).toMatch(/[Ee]very other[\s\S]{0,80}scripts\/\*\.ts/);
  });

  it('C. the full-hostname allow-list names both real endpoints, and the refusal path is fail-closed (hostname checks precede any connection)', () => {
    const contents = read(PROBE_FILE);

    expect(contents).toContain('ep-polished-band-alphc576-pooler');
    expect(contents).toContain('ep-icy-boat-alx5o1tz-pooler');

    // Fail-closed, checked by SOURCE ORDER rather than by running the script (which would
    // open a real socket — forbidden). All three hostname-refusal checks must appear before
    // the first call that actually opens a client connection.
    const devHostCheckIdx = contents.indexOf('DEV_HOSTS.includes(devHost)');
    const mainHostCheckIdx = contents.indexOf('MAIN_HOSTS.includes(mainHost)');
    const transposedCheckIdx = contents.indexOf('devHost === mainHost');
    const firstOpenClientCallIdx = contents.indexOf("openClient('PROBE_DEV_URL'");

    expect(devHostCheckIdx, 'DEV_HOSTS.includes(devHost) refusal check not found — the dev-side ' +
      'hostname gate is missing.').toBeGreaterThan(-1);
    expect(mainHostCheckIdx, 'MAIN_HOSTS.includes(mainHost) refusal check not found — the main-side ' +
      'hostname gate is missing.').toBeGreaterThan(-1);
    expect(transposedCheckIdx, 'devHost === mainHost transposition guard not found.').toBeGreaterThan(-1);
    expect(firstOpenClientCallIdx, 'No openClient(\'PROBE_DEV_URL\' call found — cannot verify ordering.')
      .toBeGreaterThan(-1);

    expect(
      devHostCheckIdx < firstOpenClientCallIdx,
      'The dev-hostname allow-list check appears AFTER the first client-opening call in source ' +
        'order — the script would open a connection before refusing an unrecognised dev hostname, ' +
        'the exact fail-open regression D-36-03 forbids.',
    ).toBe(true);
    expect(
      mainHostCheckIdx < firstOpenClientCallIdx,
      'The main-hostname allow-list check appears AFTER the first client-opening call in source ' +
        'order — the script could open a connection before refusing an unrecognised main hostname.',
    ).toBe(true);
    expect(
      transposedCheckIdx < firstOpenClientCallIdx,
      'The dev/main transposition guard appears AFTER the first client-opening call in source ' +
        'order — a transposed pair of variables could reach a connection before being refused.',
    ).toBe(true);

    // Exact-equality only — never a prefix or startsWith match, which would let a lookalike
    // host sharing an endpoint-ID prefix slip through as "recognised".
    expect(
      /startsWith\(|\.includes\('ep-/.test(contents),
      `${PROBE_FILE} appears to use prefix matching (startsWith or .includes('ep-')) on a ` +
        'hostname. Matching must be exact-equality only.',
    ).toBe(false);
  });

  it("D. no console.* call interpolates a credential — no username, no password, no postgres:// scheme (load-env-contracts.test.ts Contract 5 technique)", () => {
    // Same coarse, line-scoped backstop tests/load-env-contracts.test.ts Contract 5 uses:
    // it inspects only the single line containing the console.* call, so it cannot see a
    // credential assembled several lines away in a helper. That file's own docstring
    // records this as a deliberate, accepted limitation of the technique; this test
    // reuses the identical technique rather than inventing a second detection method,
    // per this gap's own instruction.
    const contents = read(PROBE_FILE);
    const interpolatesCredential = /\$\{[^}]*\b(url|DATABASE_URL|password|devUrl|mainUrl)\b[^}]*\}/i;
    const rawConnectionString = /postgres:\/\//i;

    const offendingLines = contents
      .split('\n')
      .filter((line) => /console\.(log|warn|error|info)\(/.test(line))
      .filter((line) => interpolatesCredential.test(line) || rawConnectionString.test(line));

    expect(
      offendingLines,
      `${PROBE_FILE} has a console.* call that appears to interpolate a credential-shaped value ` +
        'or a raw connection string. This script\'s output is pasted into transcripts and into ' +
        'Phase 29\'s artifacts (D-36-03) — only hostnames, the sentinel label, counts and verdicts ' +
        'may be printed. Offending lines: ' + JSON.stringify(offendingLines),
    ).toEqual([]);
  });

  /**
   * E. mainSql appears exactly 3 times in the file's CODE lines — a naive count, and why
   * this test does NOT use one.
   *
   * 36-04-PLAN.md's own acceptance criterion stripped only `*` block-comment lines and
   * counted 4; 36-VERIFICATION.md's "Verification of the known mainSql measurement-gap
   * claim" section corrected that by ALSO stripping `//` line comments (the NEW-02 fix's
   * comment at the-then line 427) and got 3, matching the three structural usages —
   * declaration, the single SELECT count(*), and end().
   *
   * Re-measured here against the file as it stands TODAY: stripping BOTH comment forms
   * (see codeLines() above) yields **4**, not 3 — a measurement gap neither 36-04-PLAN.md
   * nor 36-VERIFICATION.md anticipated. The 4th occurrence is not a reintroduced comment;
   * it is a genuine code line — a `console.warn(...)` string literal (added by the later
   * gate-5-downgrade commit `c76c294`, itself described in 36-VERIFICATION.md's
   * "Re-verification" section) that mentions `` `mainSql` `` in backtick-quoted PROSE
   * while warning the operator that "a future edit adding a write to `mainSql` would not
   * be stopped by the server". It is human-readable documentation text inside a runtime
   * string, not a fourth SQL statement — the underlying property (main executes exactly
   * one statement) still holds.
   *
   * A blunt substring count over code lines therefore cannot reliably assert "3" against
   * this file without also excluding string-literal content, which the phase's own
   * acceptance criterion never attempted. Rather than assert a token count that is
   * demonstrably false against the current committed file (or silently loosen it to 4,
   * which would stop catching a genuine second query), this test pins the three
   * STRUCTURAL usages directly and independently, by anchored pattern — which is stronger
   * than a token count: it still fails if a second declaration, a second query, or a
   * second `.end()` is ever added, and it is immune to future prose mentioning the
   * identifier in a warning string. Do not "fix" this back to a bare substring-count
   * assertion of 3 — it will fail against the file exactly as it is committed today.
   */
  it('E. mainSql is read-only by construction: exactly one declaration, one query, one end() (structural, not a token count — see comment above)', () => {
    const contents = read(PROBE_FILE);

    // Sanity-check the documented measurement gap itself, so this test also serves as a
    // living record of the drift: both-comment-forms-stripped token count is 4 today, not 3.
    const strippedTokenCount = codeLines(contents).join('\n').match(/mainSql/g)?.length ?? 0;
    expect(
      strippedTokenCount,
      'The naive both-comment-forms-stripped token count of "mainSql" has changed from the ' +
        'documented value of 4 (see the docblock above this test). If this is now 3, the prose ' +
        'warning-string mention this test documents may have been removed or reworded — re-read ' +
        'the docblock above and consider whether a simpler token-count assertion is viable again.',
    ).toBe(4);

    const declarationCount = (contents.match(/^\s*const mainSql = /gm) ?? []).length;
    // Anchored on `await mainSql\`` — the actual tagged-template invocation syntax — not a
    // bare `mainSql\`` substring. The header/inline comments repeatedly write the markdown
    // code-span `` `mainSql` `` (an OPENING backtick, the identifier, a CLOSING backtick) as
    // prose formatting, e.g. in the console.warn string documented above this test. A bare
    // `\bmainSql\`` pattern matches that closing backtick too, overcounting to 9. Real SQL
    // tagged-template calls in this codebase are always written as `await <client>\`...\``,
    // so anchoring on the preceding `await` keyword uniquely identifies the actual call.
    const queryCallCount = (contents.match(/\bawait\s+mainSql`/g) ?? []).length;
    const endCallCount = (contents.match(/\bmainSql\.end\(/g) ?? []).length;

    expect(
      declarationCount,
      `${PROBE_FILE} does not declare "const mainSql = " exactly once. Found ${declarationCount}.`,
    ).toBe(1);
    expect(
      queryCallCount,
      `${PROBE_FILE} does not invoke mainSql as a tagged-template SQL call exactly once. Found ` +
        `${queryCallCount}. The main-side client must issue exactly one statement.`,
    ).toBe(1);
    expect(
      endCallCount,
      `${PROBE_FILE} does not call mainSql.end( exactly once. Found ${endCallCount}. The main ` +
        'connection must be closed, and closed exactly once.',
    ).toBe(1);
  });

  it('F. zero write verbs (INSERT/UPDATE/DELETE/DROP/TRUNCATE/ALTER/CREATE) appear on the mainSql template literal', () => {
    const contents = read(PROBE_FILE);

    // Extract the single tagged-template call's contents: everything between `await mainSql``
    // and the next backtick. Anchored on `await` for the same reason as contract E above: the
    // header/inline comments repeatedly write the markdown code-span `` `mainSql` `` as prose,
    // and a bare `mainSql`([^`]*)`` pattern matches the FIRST such comment occurrence (which
    // precedes the real call in file order), extracting unrelated docblock prose instead of
    // the actual SQL — verified while writing this test: without the `await` anchor, this
    // regex captured the header docblock's prose text, not the query.
    const match = contents.match(/await\s+mainSql`([^`]*)`/s);
    expect(match, `${PROBE_FILE}: could not locate the mainSql tagged-template query to inspect.`)
      .not.toBeNull();
    const queryText = match![1];

    const writeVerbs = /\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE)\b/i;
    expect(
      writeVerbs.test(queryText),
      `The mainSql query contains a write verb: ${JSON.stringify(queryText)}. The main-side ` +
        'session must be read-only by construction — it may only ever issue a SELECT.',
    ).toBe(false);
  });

  it('G. package.json has a probe:write-isolation script reaching scripts/probe-write-isolation.ts', () => {
    const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };

    expect(
      pkg.scripts['probe:write-isolation'],
      'package.json is missing the probe:write-isolation script, or it no longer points at ' +
        'scripts/probe-write-isolation.ts.',
    ).toBe('tsx scripts/probe-write-isolation.ts');
  });

  it('H. 29-VALIDATION.md (Phase 29, wherever archived) exists and its frontmatter carries a nyquist_compliant key', () => {
    // Resolved by phase NUMBER rather than a literal path, so this contract survives any
    // future archive move (CLOSE-07 already moved this document once, into
    // .planning/milestones/v1.6-phases/29-migration-safety-net/). resolvePhaseDoc() itself
    // throws a clear "not found in EITHER location" error if the file is genuinely missing,
    // so the existsSync guard this test used to need is now redundant belt-and-braces.
    const validationPath = resolvePhaseDoc(29, '29-VALIDATION.md');

    const contents = readFileSync(validationPath, 'utf8');
    const frontmatterMatch = contents.match(/^---\n([\s\S]*?)\n---/);
    expect(
      frontmatterMatch,
      '29-VALIDATION.md has no parseable --- delimited frontmatter block.',
    ).not.toBeNull();
    const frontmatter = frontmatterMatch![1];

    // Assert the KEY is present. Deliberately do NOT assert a value — D-36-04 forbids
    // hand-writing a retroactive Nyquist validation, and the file legitimately records
    // `not-derivable` as a deliberate, honest refusal rather than a fabricated `true`.
    expect(
      /^nyquist_compliant:/m.test(frontmatter),
      '29-VALIDATION.md frontmatter no longer declares a nyquist_compliant key. This test ' +
        'intentionally does not assert its value (the file legitimately records ' +
        '"not-derivable", a deliberate refusal per D-36-04) — only that the key exists, which ' +
        'is what clears the v1.6 audit\'s file-existence finding.',
    ).toBe(true);
  });
});

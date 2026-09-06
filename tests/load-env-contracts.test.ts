/**
 * Phase 39 Plan 03 Task 3 — D-03 sequencing invariant + probe-write-isolation
 * exemption, a BLOCKING grep-contract suite (OPS-05).
 *
 * Precedent: `tests/admin-09-grep-contracts.test.ts` — a docstring stating what each
 * gate protects and what a failure means, then one `it()` per contract. This suite has
 * no fixtures and no temp dirs: it reads real repo files with `readFileSync` and
 * asserts with regular expressions against their current committed contents.
 *
 * What each gate protects, and what failure means:
 *
 *   Contract 1 (D-03 sequencing) — `scripts/_load-env.ts` corrected its dotenv
 *   precedence AND gained its `assertSafeDatabaseTarget()` guard call in the SAME
 *   edit (plan 39-03 Task 2). If a future edit keeps the corrected precedence
 *   (`envFileOrder`) but drops the guard call, this test fails. Ordering matters:
 *   correcting the precedence without the guard newly exposes the 14 write-capable
 *   `tsx` entry points to `.env.production.local`.
 *
 *   Contract 2 (no re-inlined order) — the dotenv candidate file order lives in
 *   EXACTLY one place, `scripts/_env-precedence.ts`'s `envFileOrder`. A future edit
 *   that re-inlines a literal `.env*` filename into `_load-env.ts`'s executable code
 *   (rather than calling `envFileOrder`) creates a second, independently-drifting
 *   copy of the order — exactly the OPS-05 defect this phase closes.
 *
 *   Contract 3 (probe exemption) — `scripts/probe-write-isolation.ts` deliberately
 *   does NOT import the shared loader (Phase 36 D-36-03: it must never read a stored
 *   env file). If the shared-loader import is ever added back to "fix" a
 *   missing-env-var failure, this test fails. Its own, stricter, inline hostname
 *   gates must still be present.
 *
 *   Contract 4 (coverage census) — every `scripts/*.ts` file (plus
 *   `drizzle.config.ts`) that imports the shared loader is named in an explicit,
 *   hand-reviewed array. A new write-capable script added without updating this
 *   array fails the test (forcing a reviewer to confirm it is guard-covered before
 *   merging), and a consumer that silently drops the import fails it too.
 *
 *   Contract 5 (no credential printing) — neither `scripts/_load-env.ts` nor
 *   `scripts/_db-branch-guard.ts` may pass a credential-shaped value (a raw URL,
 *   `DATABASE_URL`, or `password`) into a `console.*` call, and neither may contain
 *   a literal `postgres://` connection string (D-07, D-08).
 *
 *   Contract 6 (no sourcing) — no `scripts/*.ts` file touched by phase 39 shells out
 *   to `child_process` or a subprocess-exec function to read an env file. Parsing
 *   text, never executing it, is the standing discipline (D-08).
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = process.cwd();
const SCRIPTS_DIR = join(REPO_ROOT, 'scripts');

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

/**
 * True only for an ACTUAL import statement whose specifier resolves to the shared
 * loader — e.g. `import './_load-env';` or `import './scripts/_load-env';`. Deliberately
 * anchored to a line that (once trimmed) starts with `import`, so a docstring merely
 * QUOTING the import statement in prose (as `scripts/probe-write-isolation.ts`'s
 * "THE `_load-env` DIVERGENCE" section does, to explain why it does NOT have one) is
 * never mistaken for a real import.
 */
function hasRealLoadEnvImport(contents: string): boolean {
  return /^\s*import\s+['"][^'"]*\/_load-env['"];?\s*$/m.test(contents);
}

describe('load-env contracts (D-03 sequencing + probe-write-isolation exemption)', () => {
  it('Contract 1: envFileOrder implies assertSafeDatabaseTarget in scripts/_load-env.ts (D-03)', () => {
    const contents = read('scripts/_load-env.ts');
    const hasCorrectedPrecedence = /envFileOrder\s*\(/.test(contents);
    // Anchored to the CALL, `assertSafeDatabaseTarget(`, not merely the import specifier —
    // an import with the call deleted would otherwise still contain the bare identifier
    // and silently pass this gate. Deliberately NOT anchored to EMPTY parentheses: the
    // guard is now handed the pre-load environment snapshot (39-REVIEW WR-02) so its
    // refusal can name the file that caused it, and this contract is about the call
    // EXISTING, not about its argument list.
    const hasGuardCall = /assertSafeDatabaseTarget\s*\(/.test(contents);

    expect(
      hasCorrectedPrecedence,
      'scripts/_load-env.ts should call envFileOrder() for the corrected @next/env-matching precedence (D-02)',
    ).toBe(true);
    expect(
      hasGuardCall,
      'D-03 VIOLATION: scripts/_load-env.ts declares the corrected envFileOrder() precedence but ' +
        'no longer calls assertSafeDatabaseTarget(). Correcting precedence without guard coverage ' +
        'newly exposes all 14 write-capable tsx entry points to .env.production.local. Restore the ' +
        'guard call in the same file — it must never be separated from the precedence fix.',
    ).toBe(true);
  });

  it('Contract 2: no dotenv filename literal survives outside envFileOrder in scripts/_load-env.ts', () => {
    const contents = read('scripts/_load-env.ts');
    // Mirrors `grep -v '^ \*' scripts/_load-env.ts | grep -c "'.env"` — excludes block-comment
    // continuation lines (leading " *"), counts remaining code lines containing a quoted
    // dotenv filename literal.
    const codeLines = contents.split('\n').filter((line) => !/^ \*/.test(line));
    const offending = codeLines.filter((line) => line.includes("'.env"));

    expect(
      offending,
      'A dotenv filename literal (e.g. \'.env.local\') appears in scripts/_load-env.ts code ' +
        'outside envFileOrder(). The file order must live in exactly one place: ' +
        'scripts/_env-precedence.ts\'s envFileOrder.',
    ).toEqual([]);
  });

  it('Contract 3: scripts/probe-write-isolation.ts does not import the shared loader (Phase 36 D-36-03)', () => {
    const contents = read('scripts/probe-write-isolation.ts');

    expect(
      hasRealLoadEnvImport(contents),
      'scripts/probe-write-isolation.ts must NOT import ./_load-env — D-36-03 forbids this probe ' +
        'from reading any stored env file. If a missing-env-var failure prompted adding the import ' +
        'back, that failure is the intended fail-safe behaviour, not a bug to fix this way.',
    ).toBe(false);

    // Its own, stricter, inline hostname validation must still be present.
    expect(contents).toContain('extractHostname');
    expect(contents).toContain('DEV_HOSTS');
    expect(contents).toContain('MAIN_HOSTS');
  });

  it('Contract 4: the shared-loader consumer census matches the filesystem exactly (14 consumers)', () => {
    // Hand-reviewed, hardcoded expected set. A new script added to `scripts/*.ts` that
    // imports the shared loader without appearing here — or an existing consumer that
    // silently drops the import — fails this test.
    const EXPECTED_LOAD_ENV_CONSUMERS = [
      'scripts/backfill-coefficient-history.ts',
      'scripts/backfill-partner-type.ts',
      'scripts/grant-admin.ts',
      'scripts/migrate.ts',
      'scripts/purge-soft-deleted.ts',
      'scripts/purge-test-data.ts',
      'scripts/reconcile-proposals.ts',
      'scripts/seed-admins-launch.ts',
      'scripts/seed-fiche-fixtures.ts',
      'scripts/seed-partner-launch.ts',
      'scripts/seed-pipeline-fixtures.ts',
      'scripts/seed-reconciliation-fixtures.ts',
      'scripts/smoke-ovh.ts',
      'drizzle.config.ts',
    ].sort();

    expect(EXPECTED_LOAD_ENV_CONSUMERS.length).toBe(14);

    const tsFilesInScripts = readdirSync(SCRIPTS_DIR).filter((f) => f.endsWith('.ts'));
    const actualScriptConsumers = tsFilesInScripts
      .filter((f) => hasRealLoadEnvImport(readFileSync(join(SCRIPTS_DIR, f), 'utf8')))
      .map((f) => `scripts/${f}`);

    const drizzleConfigIsConsumer = hasRealLoadEnvImport(read('drizzle.config.ts'));
    const actualConsumers = [
      ...actualScriptConsumers,
      ...(drizzleConfigIsConsumer ? ['drizzle.config.ts'] : []),
    ].sort();

    expect(
      actualConsumers,
      'The set of files importing ./_load-env has drifted from the hand-reviewed ' +
        'EXPECTED_LOAD_ENV_CONSUMERS array in this test. If you added a new write-capable script, ' +
        'confirm it is guard-covered through the shared loader, then add it to the array. If a ' +
        'consumer silently dropped the import, restore it — every one of the 14 must stay covered.',
    ).toEqual(EXPECTED_LOAD_ENV_CONSUMERS);
  });

  // COARSE BACKSTOP ONLY (39-REVIEW WR-08). This gate inspects the single line
  // containing the `console.*` call, so it cannot see a credential assembled in a helper
  // — `defaultOnRefuse` is `console.error(message)` and the message is built in
  // `buildRefusalMessage` several lines away. Verified: injecting `resolution.url` into
  // that helper leaves this contract GREEN. The real proof is behavioural and lives in
  // `tests/db-branch-guard.test.ts` ("no refusal or warning output carries credential
  // material"), which asserts the actual emitted string for every refuse verdict and
  // fails on that same injection. Keep both; do not treat this one as sufficient.
  it('Contract 5 (backstop): no console.* call in the loader or the guard interpolates a credential', () => {
    const interpolatesCredential = /\$\{[^}]*\b(url|DATABASE_URL|password)\b[^}]*\}/i;
    const rawConnectionString = /postgres:\/\//i;

    for (const relativePath of ['scripts/_load-env.ts', 'scripts/_db-branch-guard.ts']) {
      const contents = read(relativePath);
      const offendingLines = contents
        .split('\n')
        .filter((line) => /console\.(log|warn|error|info)\(/.test(line))
        .filter((line) => interpolatesCredential.test(line) || rawConnectionString.test(line));

      expect(
        offendingLines,
        `${relativePath} has a console.* call that appears to interpolate a credential-shaped ` +
          'value or a raw connection string (D-07, D-08). Only hostname/source/scope may be printed.',
      ).toEqual([]);
    }
  });

  it('Contract 6: no phase-39 scripts/*.ts file sources or subprocess-reads an env file', () => {
    const PHASE_39_SCRIPT_FILES = [
      'scripts/_neon-endpoints.ts',
      'scripts/_neon-target.ts',
      'scripts/_development-target.ts',
      'scripts/seed-fiche-fixtures.ts',
      'scripts/seed-pipeline-fixtures.ts',
      'scripts/seed-reconciliation-fixtures.ts',
      'scripts/_env-precedence.ts',
      'scripts/_db-branch-guard.ts',
      'scripts/_load-env.ts',
    ];
    const SUBPROCESS_PATTERN = /child_process|execSync|\bexeca?\(|\bspawn\(|\bfork\(/;

    for (const relativePath of PHASE_39_SCRIPT_FILES) {
      const contents = read(relativePath);
      expect(
        SUBPROCESS_PATTERN.test(contents),
        `${relativePath} appears to use a subprocess/exec mechanism. Env files must be parsed as ` +
          'text (dotenv\'s parse()/config()), never sourced or read via a shelled-out command (D-08).',
      ).toBe(false);
    }
  });
});

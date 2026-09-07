/**
 * Phase 36 Plan 36-02 — HOUSE-03 gap coverage: the seed script's npm registration and
 * the v1.1 requirements-flip that HOUSE-03 also performed.
 *
 * Precedent: `tests/npm-guard-hooks.test.ts` — named gates (G-1, G-2…), each asserting
 * against the real, parsed `package.json`, with a failure message that states what
 * regressed and why it matters. This file follows the same shape for HOUSE-03.
 *
 * What each gate protects, and what a red test means:
 *
 *   G-1 (script entry exists) — `scripts/seed-partner-launch.ts` was reachable only by
 *   typing its full path since Phase 10 (WR-AUDIT-02). D-36-07 gave it a `db:seed:*`
 *   npm entry. If the key disappears, the script silently regresses to path-only
 *   discovery.
 *
 *   G-2 (the entry reaches the REAL script through the mock-server preload) — the
 *   `db:backfill:*` / `db:seed:*` convention is `tsx -r ./scripts/_preload-mock-server-only.cjs
 *   <script>`. A value that names `seed-partner-launch.ts` but drops the `-r` preload
 *   would still "mention the script" in a naive substring check while actually failing
 *   at runtime the moment the script's lazy `await import('../src/lib/db/index')` hits
 *   the `server-only` guard. This gate asserts the preload flag is present, not merely
 *   that the string contains the script name.
 *
 *   G-3 (the script file exists on disk) — a correct package.json entry pointing at a
 *   deleted or renamed file is a silent dead end; `npm run db:seed:partner-launch` would
 *   fail with an ENOENT that G-1/G-2 cannot see because they only read package.json text.
 *
 *   G-4 (the v1.1 requirements flip held, and nothing else was swept) — D-36-06 flipped
 *   CALC-07 and PROP-01 from `[~]` to `[x]` and required that the flip be surgical: BOOT-03's
 *   legitimate `[~]` at line 24 must survive untouched, and CALC-07/PROP-01 must be the
 *   ONLY two markers that moved. A future sweep-replace (e.g. a scripted `[~]` → `[x]`
 *   across the whole file) would silently mark unfinished work complete; this gate pins
 *   both directions — the two known-complete requirements read `[x]`, and exactly one
 *   `[~]` marker survives file-wide, and it is BOOT-03.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = process.cwd();
const REQUIREMENTS_FILE = '.planning/milestones/v1.1-REQUIREMENTS.md';

function readPackageJson(): { scripts: Record<string, string> } {
  const raw = readFileSync(join(REPO_ROOT, 'package.json'), 'utf8');
  return JSON.parse(raw) as { scripts: Record<string, string> };
}

function readRequirements(): string {
  return readFileSync(join(REPO_ROOT, REQUIREMENTS_FILE), 'utf8');
}

describe('HOUSE-03 — seed script npm registration (36-02)', () => {
  it('G-1: package.json declares a db:seed:partner-launch script', () => {
    const { scripts } = readPackageJson();

    expect(
      Object.prototype.hasOwnProperty.call(scripts, 'db:seed:partner-launch'),
      'package.json is missing the "db:seed:partner-launch" script entry. HOUSE-03 / D-36-07 ' +
        'requires scripts/seed-partner-launch.ts to be reachable by npm script name, following ' +
        'the existing db:backfill:*/db:seed:* naming convention, not only by typing its file path.',
    ).toBe(true);
  });

  it('G-2: db:seed:partner-launch reaches the real script through the mock-server preload, matching the db:backfill:* convention', () => {
    const { scripts } = readPackageJson();
    const entry = scripts['db:seed:partner-launch'] ?? '';

    // Two independent assertions, not one combined regex: a value that names the script
    // but drops the preload flag would still satisfy a substring check on the script name
    // alone. The preload is what actually neutralises the `server-only` guard so the
    // script's lazy `await import('../src/lib/db/index')` succeeds.
    expect(
      /-r\s+\.\/scripts\/_preload-mock-server-only\.cjs/.test(entry),
      'db:seed:partner-launch does not invoke the -r ./scripts/_preload-mock-server-only.cjs ' +
        'preload. Every db:backfill:* and db:seed:* sibling uses this preload to neutralise the ' +
        '`server-only` guard before the script lazily imports src/lib/db; without it the script ' +
        'would fail at runtime the moment it reaches that import, even though this string check ' +
        'would still "mention" the script name. Current value: ' + JSON.stringify(entry),
    ).toBe(true);
    expect(
      /scripts\/seed-partner-launch\.ts\b/.test(entry),
      'db:seed:partner-launch does not name scripts/seed-partner-launch.ts as its target. ' +
        'Current value: ' + JSON.stringify(entry),
    ).toBe(true);
    expect(
      entry,
      'db:seed:partner-launch has drifted from the exact db:backfill:*/db:seed:* invocation ' +
        'shape (tsx -r ./scripts/_preload-mock-server-only.cjs <script>). Current value: ' +
        JSON.stringify(entry),
    ).toBe('tsx -r ./scripts/_preload-mock-server-only.cjs scripts/seed-partner-launch.ts');
  });

  it('G-3: scripts/seed-partner-launch.ts exists on disk', () => {
    const scriptPath = join(REPO_ROOT, 'scripts/seed-partner-launch.ts');

    expect(
      existsSync(scriptPath),
      'scripts/seed-partner-launch.ts is missing. The db:seed:partner-launch npm entry (G-1/G-2) ' +
        'points at a file that no longer exists on disk — npm run db:seed:partner-launch would ' +
        'fail with ENOENT, a failure mode neither G-1 nor G-2 can detect from package.json text alone.',
    ).toBe(true);
  });

  it('G-4: CALC-07 and PROP-01 read [x], and BOOT-03 is the sole surviving [~] marker (D-36-06)', () => {
    const contents = readRequirements();

    // Direction 1: the two requirements Phase 8 actually completed must read complete.
    const calc07Complete = /^- \[x\] \*\*CALC-07\*\*/m.test(contents);
    const prop01Complete = /^- \[x\] \*\*PROP-01\*\*/m.test(contents);
    expect(
      calc07Complete,
      'CALC-07 no longer reads "- [x] **CALC-07**" in .planning/milestones/v1.1-REQUIREMENTS.md. ' +
        'D-36-06 flipped this marker because Phase 8 shipped the server-side recompute on save; a ' +
        'regression here would re-report a satisfied requirement as partial or open.',
    ).toBe(true);
    expect(
      prop01Complete,
      'PROP-01 no longer reads "- [x] **PROP-01**" in .planning/milestones/v1.1-REQUIREMENTS.md. ' +
        'D-36-06 flipped this marker because Phase 8 populated the proposals list (PROP-02..05); a ' +
        'regression here would re-report a satisfied requirement as partial or open.',
    ).toBe(true);

    // Direction 2: nothing else was swept. Exactly one [~] marker survives file-wide, and
    // it must be BOOT-03 — the legitimate partial requirement D-36-06 was explicitly
    // forbidden from touching. A future sweep-replace of [~] -> [x] across the whole file
    // would pass direction 1 above while silently marking BOOT-03 complete; this assertion
    // is what catches that.
    const tildeMarkers = contents.match(/^- \[~\] \*\*[A-Z0-9-]+\*\*/gm) ?? [];
    expect(
      tildeMarkers.length,
      'Expected exactly one surviving "[~]" marker in .planning/milestones/v1.1-REQUIREMENTS.md ' +
        '(BOOT-03). Found: ' + JSON.stringify(tildeMarkers) + '. If this is 0, BOOT-03 was ' +
        'incorrectly swept to [x]; if it is >1, a requirement other than BOOT-03 was left partial ' +
        'or a new partial marker was introduced without review.',
    ).toBe(1);
    expect(
      tildeMarkers[0],
      'The sole surviving [~] marker is not BOOT-03. D-36-06 requires that only CALC-07 and ' +
        'PROP-01 flip; every other partial requirement, including BOOT-03, must be left exactly ' +
        'as it was. Found marker: ' + JSON.stringify(tildeMarkers[0]),
    ).toContain('**BOOT-03**');
  });
});

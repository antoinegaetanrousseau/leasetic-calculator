# Phase 39: Database Guard Correctness - Pattern Map

**Mapped:** 2026-09-06
**Files analyzed:** 8 (new + modified)
**Analogs found:** 7 / 8 (bash-guard fixture testing has no repo precedent — see "No Analog Found")

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `scripts/check-local-db-branch.sh` (rewrite) | utility/guard (bash) | request-response (env → verdict) | itself (prior version) + `scripts/check-migration-journal-sync.sh` | exact (self) / role-match (JSON-in-bash) |
| `scripts/_load-env.ts` (fix) | config/utility | file-I/O (env resolution) | itself (prior version); `scripts/_neon-target.ts` for fail-safe resolver shape | exact (self) |
| declarative forbidden-endpoint list (NEW, JSON or newline-delimited) | config | transform (static data, no exec) | `drizzle/meta/_journal.json` consumed by `scripts/check-migration-journal-sync.sh` (bash) AND drizzle-orm (TS) | role-match — best "one file, two language consumers" precedent in repo |
| bash-guard fixture test (NEW, e.g. `tests/check-local-db-branch.test.ts`) | test | file-I/O (temp env files → exit code) | `src/lib/reconcile/report.test.ts` / `run.test.ts` (temp-dir fixtures) for the harness; **no existing test spawns a `.sh` file** | partial — temp-dir pattern is exact, process-spawn pattern has no analog |
| differential test: bash guard vs `_load-env.ts` (NEW) | test | transform (compare two resolvers) | `tests/neon-target.test.ts` (table-driven, fail-safe-asserting pure-function test) | role-match |
| `scripts/seed-fiche-fixtures.ts` (modify: read shared list) | service/script | request-response (guard-then-write) | itself — `FORBIDDEN_ENDPOINTS` block, lines 96-99 & 533-551 | exact (self) |
| `package.json` (modify: `prebuild`/`prestart`, guard wiring) | config | event-driven (npm lifecycle hooks) | existing `check:*` script entries + `.github/workflows/ci.yml` wiring | role-match |
| write-capable tsx entry points (guard coverage: `db:migrate`, seeders, `purge:*`, `grant:admin`) | script (env bootstrap) | file-I/O | `scripts/migrate.ts` / `scripts/grant-admin.ts` — `import './_load-env';` as first import | exact |

## Pattern Assignments

### `scripts/check-local-db-branch.sh` (bash guard, rewrite)

**Analog:** itself (prior version, same file) — this is a correction, not a greenfield write. Reuse its structure; fix the defect.

**The defect to remove** (lines 22-24):
```bash
cd "$(dirname "$0")/.."

ENV_FILE=".env.local"
```
This hardcodes exactly one file. Per D-01, it must instead reproduce `@next/env`'s file-order in shell: `.env.$NODE_ENV.local` (excluded when `NODE_ENV=test`, per D-02) → `.env.local` → `.env.$NODE_ENV` → `.env`, with **first-assignment-wins** semantics (the same "first value wins" rule `_load-env.ts`'s docstring already states for dotenv, lines 19-21 below) — checking each candidate file in order and taking the first one that defines `DATABASE_URL`.

**Parse-don't-source pattern to preserve exactly** (lines 31-48, 64-65):
```bash
raw_line=$(grep -E '^[[:space:]]*(export[[:space:]]+)?DATABASE_URL=' "$ENV_FILE" | head -n 1 || true)
...
value=$(printf '%s' "$raw_line" | sed -E 's/^[[:space:]]*(export[[:space:]]+)?DATABASE_URL=//')
value=$(printf '%s' "$value" | sed -E "s/^['\"]//; s/['\"][[:space:]]*\$//")
...
host=$(printf '%s' "$value" | sed -E 's#^[^@]*@##; s#[/:].*$##')
```
Non-negotiable per D-08: no file is ever `source`d, no credential is ever echoed — only the derived `host` variable is printed. Keep the guarded `case "$value" in *@*)` check (lines 54-62) that fails closed rather than mis-deriving a hostname when the user@host segment is missing.

**SKIP branch to re-verify, not assume** (lines 26-29):
```bash
if [ ! -f "$ENV_FILE" ]; then
  echo "SKIP: $ENV_FILE not found — this guard is local-only (no-op on CI/build machines)."
  exit 0
fi
```
D-04's `prebuild`/`prestart` safety rests entirely on this branch still no-op-ing when nothing resolves — re-derive the equivalent for the multi-file order (SKIP only if **none** of the candidate files exist / resolve a `DATABASE_URL`).

**Hostname classification `case` block to extend, not replace** (lines 76-104): same three-way branch (`development` OK / `preview` WARN / `main` ERROR / `localhost` OK / unrecognised ERROR). Per D-07, the OK/WARN lines must additionally name **which file supplied the value** — e.g. `echo "OK: local DATABASE_URL → Neon development branch ($host), from .env.local"`.

**JSON-in-bash-without-jq analog for the D-05 shared list** — `scripts/check-migration-journal-sync.sh` (full file read; see below) is the only existing case of a bash script parsing structured data without `jq` (not a declared dependency). Its technique — `grep -o` + `sed -E` capture group, then a `while IFS= read -r` loop over the newline-joined matches — is the pattern to copy for reading the new forbidden-endpoint list from bash, whichever of JSON/newline-delimited format is chosen:
```bash
# scripts/check-migration-journal-sync.sh lines 33-35, 63-71
tags=$(grep -o '"tag"[[:space:]]*:[[:space:]]*"[^"]*"' "$JOURNAL" | sed -E 's/.*"tag"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/' || true)
...
while IFS= read -r tag; do
  [ -n "$tag" ] || continue
  tag_count=$((tag_count + 1))
  if [ ! -f "drizzle/${tag}.sql" ]; then
    dangling="${dangling}${tag}"$'\n'
    dangling_count=$((dangling_count + 1))
  fi
done <<< "$tags"
```
If a newline-delimited plain-list format is chosen instead of JSON, the bash side becomes simpler still (a plain `while read` loop with no `grep -o`/`sed` extraction step needed) — worth weighing against the fact that the TS consumers already parse JSON natively.

---

### `scripts/_load-env.ts` (fix)

**Analog:** itself (prior version). The file's docstring already states the target precedence rule (lines 19-26) but the code (lines 38-41) does not implement it:
```typescript
config({ path: '.env.local' });
config({ path: '.env' });
```
Per D-02, replace with `.env.$NODE_ENV.local` → `.env.local` (**excluded when `NODE_ENV=test`**) → `.env.$NODE_ENV` → `.env`, keeping the existing dotenv "first assignment wins, `override` defaults false" mechanism the docstring documents (lines 19-21) — call `config()` once per candidate path in priority order and let dotenv's own no-clobber behavior do the precedence work, exactly as the current two-call structure already does.

**Preserve the "keep it the FIRST import" contract** (lines 31-36) — every consumer (`migrate.ts:20`, `grant-admin.ts:30`, `seed-fiche-fixtures.ts:85`, etc.) relies on `import './_load-env';` being the first statement in the file; do not change that calling convention.

**Fail-safe resolver shape to imitate** — `scripts/_neon-target.ts` (full file, 93 lines) is the strongest pure-function analog in the repo for "resolve an ambiguous input to a labelled, fail-safe-defaulting result," which is conceptually what both the bash guard and `_load-env.ts` are doing with file precedence:
```typescript
// scripts/_neon-target.ts lines 64-73
const match = ENDPOINTS.find((e) => hostname.startsWith(e.prefix));
if (!match) {
  return {
    hostname,
    isNeon: true,
    branch: 'unknown',
    isProductionSeverity: true,
    label: 'UNRECOGNISED Neon endpoint (treated as PRODUCTION)',
  };
}
```
Its test (`tests/neon-target.test.ts`, full file) is the model for the differential test below: table-driven, one `it()` per branch case, plus one dedicated "FAIL-SAFE" test asserting the unknown-input path defaults to the dangerous classification, not the safe one.

**Scope note:** `scripts/_neon-target.ts` and `scripts/seed-fiche-fixtures.ts` each hardcode their own copy of the same three endpoint prefixes (`_neon-target.ts` lines 46-50; `seed-fiche-fixtures.ts` lines 96-99) — a THIRD divergent copy beyond the two D-02 names. CONTEXT.md scopes D-05's shared list to only the bash guard + `seed-fiche-fixtures.ts`; flagging `_neon-target.ts` as a candidate future consumer is Claude's-discretion territory, not in scope to change here.

---

### Declarative forbidden-endpoint list (NEW file, format at planner's discretion per D-05)

**Analog for "one non-executable data file, two language consumers":** `drizzle/meta/_journal.json` — written by `drizzle-kit generate` (TS/node tooling), read by drizzle-orm's `migrate()` (TS) AND independently re-parsed by `scripts/check-migration-journal-sync.sh` (bash) for the parity gate. This is the only existing case in the repo of one data file being load-bearing for both a shell script and TypeScript code, which is exactly D-05's shape.

**Analog for the validation logic that will read this list** — `scripts/seed-fiche-fixtures.ts` lines 90-99 (declaration) and 519-551 (use):
```typescript
// scripts/seed-fiche-fixtures.ts lines 96-99
const FORBIDDEN_ENDPOINTS: ReadonlyArray<{ prefix: string; scope: string }> = [
  { prefix: 'ep-icy-boat-alx5o1tz', scope: 'PRODUCTION (Neon branch `main`)' },
  { prefix: 'ep-delicate-night-als4ogpc', scope: 'PREVIEW (Neon branch `preview`)' },
];
```
```typescript
// scripts/seed-fiche-fixtures.ts lines 533-551 — the bug_011 discipline
// bug_011 discipline: URL.hostname, never URL.host — `host` carries the port,
// so a connection string with an explicit :5432 would slip a prefix match.
let hostname: string;
try {
  hostname = new URL(databaseUrl).hostname;
} catch {
  fail('DATABASE_URL is malformed.');
}

const forbidden = FORBIDDEN_ENDPOINTS.find((e) => hostname.startsWith(e.prefix));
if (forbidden) {
  fail(
    'refusing to seed fixtures into ' +
      forbidden.scope +
      ' (' +
      hostname +
      '). This script is development-only and has no override flag.',
  );
}
console.log('[seed-fiche] target host: ' + hostname);
```
When this becomes data-driven, `seed-fiche-fixtures.ts` changes from declaring `FORBIDDEN_ENDPOINTS` inline to importing/reading the new shared file, but the `new URL(databaseUrl).hostname` + `.startsWith(prefix)` + `fail()`-on-match shape stays identical — this is the shape the bash guard's rewrite (above) must also reproduce for its own hostname check, and the `bug_011` comment (host-carries-port) must be documented once beside the new data file per D-05, not re-derived per consumer.

**Source-of-truth doc this list formalizes:** `docs/operations/neon-branch-routing.md` § Lifecycle (lines 33-37) — the human-readable table both existing hardcoded copies (`seed-fiche-fixtures.ts`, `_neon-target.ts`) already transcribe by hand. The new declarative file becomes the machine-readable counterpart of that table.

---

### Bash-guard fixture test (NEW — no direct analog; nearest partial analogs below)

**Temp-dir fixture harness to copy exactly** — `src/lib/reconcile/report.test.ts` (lines 1-19) and `src/lib/reconcile/run.test.ts` (lines 12-15, 131-143) share one pattern for disposable on-disk fixtures:
```typescript
// src/lib/reconcile/report.test.ts lines 1-19
import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { tmpdir } from 'node:os';
import { REPORT_DIR, readLatestDryRunReport, writeDryRunReport } from './report';
import type { ReconciliationPlan } from './types';

let rootDir: string;

afterEach(() => {
  if (rootDir) {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

function makeRootDir(): string {
  rootDir = mkdtempSync(join(tmpdir(), 'reconcile-'));
  return rootDir;
}
```
Copy this shape verbatim for the guard's fixture test: `mkdtempSync(join(tmpdir(), '<prefix>-'))` in a `beforeEach`/helper, `rmSync(dir, { recursive: true, force: true })` in `afterEach`, one dedicated prefix string per test file (`run.test.ts` uses `'reconcile-run-'` to avoid colliding with `report.test.ts`'s `'reconcile-'` — use an equally distinct prefix, e.g. `'db-guard-'`, so parallel test files never collide in the shared OS tmp dir).

**No existing analog for "spawn a shell script from a Vitest test and assert its exit code/stdout."** Searched the full repo (`grep -rl "execSync\|spawnSync\|child_process"` across `*.test.ts`) — zero hits. This must be built from Node's `node:child_process` (`execFileSync` with `{ cwd, env, encoding: 'utf8' }`, catching the thrown error for non-zero exit codes to inspect `.status`/`.stdout`/`.stderr`) composed with the temp-dir pattern above: write throwaway env files into the mkdtemp'd dir, invoke `execFileSync('bash', [guardPath], { cwd: tmpRootDir, env: {...} })`, assert on the caught status/stdout per D-06's case matrix (including `NODE_ENV=test`). Per D-06, fixtures must contain no real credential and must never touch the repo's actual `.env*` files — the `cwd`-redirection into the mkdtemp'd dir is what guarantees the guard's relative `ENV_FILE` lookups resolve inside the fixture dir, not the repo root (note the guard currently does `cd "$(dirname "$0")/.."` at line 22 — the fixture harness will need to either override `cwd` after that `cd`, or the guard's rewrite will need to accept a directory override for testability; flag this as a design decision for the planner, not resolved here).

**Test file location:** per `vitest.config.ts`'s `include` glob (`src/**/*.test.ts`, `app/**/*.test.ts`, `__pdf-fixtures__/**/*.test.ts`, `tests/**/*.test.ts`), a new script-level test belongs under `tests/` (matching precedent: `tests/neon-target.test.ts` already tests a `scripts/_*.ts` helper from that directory) — NOT colocated inside `scripts/` (nothing there currently matches the include glob).

---

### Differential test: bash guard vs `_load-env.ts` (NEW)

**Analog:** `tests/neon-target.test.ts` (full file, 73 lines) — table-driven pure-function test with an explicit fail-safe case:
```typescript
// tests/neon-target.test.ts lines 53-59
it('FAIL-SAFE: an unrecognised Neon endpoint is treated as production', () => {
  const t = resolveNeonTarget(`ep-some-future-branch-abc123-pooler.${SUFFIX}`);
  expect(t.isNeon).toBe(true);
  expect(t.branch).toBe('unknown');
  expect(t.isProductionSeverity).toBe(true);
  expect(t.label).toContain('PRODUCTION');
});
```
And the permutation-loop style from `src/lib/auth/trusted-origins.test.ts` lines 106-121 (Test 5) — iterate a small array of `[env-file-set, expected-hostname]` cases in one `it()` when the assertion is identical shape across cases:
```typescript
// src/lib/auth/trusted-origins.test.ts lines 106-121
const permutations: Array<[string, string]> = [ ... ];
for (const [appUrl, publicUrl] of permutations) {
  vi.stubEnv('APP_URL', appUrl);
  vi.stubEnv('NEXT_PUBLIC_APP_URL', publicUrl);
  const origins = __resolveTrustedOriginsForTests();
  expect(origins).toContain(VERCEL_WILDCARD);
}
```
Apply this shape to D-02's differential test: for each of the case-matrix rows (e.g. `.env.local` only, `.env.production.local` + `.env.local` both present, `NODE_ENV=test` excluding `.env.local`, etc.), write the fixture files via the temp-dir harness above, run BOTH the bash guard (via `execFileSync`) and `_load-env.ts`'s resolution (via a testable export, mirroring `__resolveTrustedOriginsForTests()`'s "export a pure function purely for test access" convention from `src/lib/auth/index.ts`), and assert the two resolve the **same** `DATABASE_URL`/hostname per case.

---

### `package.json` (prebuild/prestart hooks, D-04)

**Analog:** the existing `check:*` script family and how CI wires them (`.github/workflows/ci.yml` lines 45, 48, 51, 57, 112 each `run: npm run check:<name>`) — no `pre*` npm lifecycle hook exists yet in this repo, so there's no direct in-repo analog for the hook mechanism itself, only for the guard-script-as-npm-script convention it will hook into:
```json
"check:local-db-branch": "bash scripts/check-local-db-branch.sh",
```
Add `"prebuild": "npm run check:local-db-branch"` and `"prestart": "npm run check:local-db-branch"` following this exact naming convention (`npm run <existing check-script-name>`, not a duplicated inline `bash scripts/...` invocation) — npm's lifecycle-hook mechanism itself (`pre<script>` auto-runs before `<script>`) requires no repo precedent; it's a standard npm feature, not a codebase pattern to imitate.

---

### Write-capable tsx entry points (guard coverage, D-03)

**Analog:** every existing consumer's env-bootstrap import line — copy the exact convention, don't invent a new one:
```typescript
// scripts/migrate.ts line 20 / scripts/grant-admin.ts line 30 / etc.
import './_load-env';
```
This line is always the **first import** in each of: `migrate.ts:20`, `grant-admin.ts:30`, `purge-soft-deleted.ts:30`, `purge-test-data.ts:43`, `backfill-partner-type.ts:27`, `backfill-coefficient-history.ts:42`, `seed-partner-launch.ts:39`, `seed-admins-launch.ts:41`, `seed-pipeline-fixtures.ts:56`, `seed-reconciliation-fixtures.ts:61`, `smoke-ovh.ts:56`, `reconcile-proposals.ts:1`, `seed-fiche-fixtures.ts:85`. D-03's guard coverage for these entry points should hook the SAME import point (extending `_load-env.ts` itself to call the guard logic after resolving env, or adding a sibling import) rather than touching each of the 13 call sites individually — one change point, many consumers, matching how `_load-env.ts` already functions as this repo's single choke point for tsx env bootstrapping.

**Explicit exception — `scripts/probe-write-isolation.ts` does NOT import `_load-env`, on purpose** (its own docstring, lines 28-36):
```
THE `_load-env` DIVERGENCE — READ BEFORE "FIXING" THIS
Every other `scripts/*.ts` entry point begins `import './_load-env'`. This one
deliberately does NOT, because that shared loader reads the developer's local
dotenv-style file on disk, and D-36-03 forbids this probe from reading any env
file... Both connection strings arrive inline on the invocation via
`PROBE_DEV_URL` and `PROBE_MAIN_URL`. DO NOT add `import './_load-env'` back...
```
If D-03's guard coverage is implemented by hooking `_load-env.ts`, `probe-write-isolation.ts` is out of that hook's reach by design — its own inline `new URL(...).hostname` checks (see its docstring's "SAFETY GATES", item 2) already function as its independent guard. Do not force this script onto the shared loader to get guard coverage; treat it as already covered by its existing inline hostname validation, consistent with Phase 36's D-36-03.

## Shared Patterns

### Hostname-not-host discipline (`bug_011`)
**Source:** `scripts/seed-fiche-fixtures.ts` lines 533-534 (comment) + `scripts/probe-write-isolation.ts` docstring "SAFETY GATES" item 2 (lines 75-79)
**Apply to:** the bash guard's hostname derivation, `_load-env.ts` if it gains any URL parsing, and the new declarative-list consumers.
```typescript
// bug_011 discipline: URL.hostname, never URL.host — `host` carries the port,
// so a connection string with an explicit :5432 would slip a prefix match.
```
In bash there is no `URL` object, so the guard's existing `sed -E 's#^[^@]*@##; s#[/:].*$##'` (strip at `/` OR `:`) is the shell-equivalent discipline already in place (check-local-db-branch.sh line 65) — preserve the `:` in that character class; it is the bash guard's version of `.hostname` vs `.host`.

### Fail-safe defaulting on unrecognised input
**Source:** `scripts/_neon-target.ts` lines 64-73, tested by `tests/neon-target.test.ts` lines 53-59
**Apply to:** both the rewritten bash guard's `case "$host" in *) ... esac` default arm (already present, lines 98-103) and the new declarative-list lookup in every consumer — an unmatched/unknown host must classify as the DANGEROUS case (ERROR/production), never as OK.

### No credential ever printed, no file ever sourced
**Source:** `scripts/check-local-db-branch.sh` header comment (lines 14-19) and `scripts/probe-write-isolation.ts` docstring "Security note" (lines 38-46)
**Apply to:** every touched file in this phase — D-08 is explicit that this is non-negotiable. The `safeErrorMessage`-style redaction described in `probe-write-isolation.ts`'s docstring (redacts `postgres://`/`postgresql://` URLs and bare `user:pass@` fragments from ANY caught error, including ones that escape `main()`) is the strongest existing model if the guard's rewrite needs equivalent error-path redaction beyond its current happy-path-only hostname printing.

### Temp-dir fixture lifecycle (`mkdtempSync`/`rmSync`)
**Source:** `src/lib/reconcile/report.test.ts` lines 1-19, `src/lib/reconcile/run.test.ts` lines 12-15 & 131-143
**Apply to:** both new tests (fixture test + differential test) — use a distinct `mkdtempSync(join(tmpdir(), '<unique-prefix>-'))` prefix per test file and always clean up in `afterEach` with `rmSync(dir, { recursive: true, force: true })`, guarding on `if (rootDir)` since the var may be unset if a prior `beforeEach`/helper call threw.

### Assert membership/shape, not brittle response details
**Source:** `src/lib/auth/trusted-origins.test.ts` lines 10-17 (rationale) — explicitly why this project avoids over-coupling tests to volatile output shapes.
**Apply to:** the differential test — assert the resolved `DATABASE_URL` (or its hostname) is IDENTICAL between the two resolvers per case, not that either produces byte-identical log/stdout text, since D-07 changes what the guard prints (adds "which file supplied it") in a way unrelated to correctness of resolution.

## No Analog Found

| File/Concern | Role | Data Flow | Reason |
|---|---|---|---|
| Spawning a `.sh` file from Vitest and asserting exit code/stdout | test | event-driven (process exit) | No test in the repo shells out to a script (`grep -rl "execSync\|spawnSync\|child_process"` across all `*.test.ts` returned zero hits). Nearest building blocks are `node:child_process`'s `execFileSync` (stdlib, not a repo pattern) composed with the temp-dir harness above. Planner should treat this as new infrastructure, not a copy job. |
| npm `pre<script>` lifecycle hooks | config | event-driven | No `pre*`/`post*` script exists anywhere in the current `package.json`. This is a standard npm mechanism (documented in npm's own docs), not something to reverse-engineer from this codebase. |

## Metadata

**Analog search scope:** `scripts/`, `tests/`, `src/lib/auth/`, `src/lib/reconcile/`, `docs/operations/`, `package.json`, `.github/workflows/ci.yml`, `vitest.config.ts`
**Files scanned directly:** `scripts/check-local-db-branch.sh`, `scripts/_load-env.ts`, `scripts/_neon-target.ts`, `scripts/seed-fiche-fixtures.ts` (partial, targeted), `scripts/probe-write-isolation.ts` (partial), `scripts/check-migration-journal-sync.sh`, `scripts/migrate.ts`/`grant-admin.ts` (headers), all 13 tsx entry points (grep for `_load-env` import), `tests/neon-target.test.ts`, `src/lib/auth/trusted-origins.test.ts`, `src/lib/reconcile/report.test.ts`, `src/lib/reconcile/run.test.ts` (partial), `docs/operations/neon-branch-routing.md`, `package.json`, `vitest.config.ts`
**Pattern extraction date:** 2026-09-06

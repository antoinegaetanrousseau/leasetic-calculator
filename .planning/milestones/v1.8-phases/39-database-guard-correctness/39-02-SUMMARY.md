---
phase: 39-database-guard-correctness
plan: 02
subsystem: database
tags: [dotenv, env-precedence, neon, database-url, vitest, tdd]

# Dependency graph
requires: []
provides:
  - "scripts/_env-precedence.ts — the single TS notion of dotenv file order (envFileOrder) and effective DATABASE_URL resolution (resolveDatabaseUrl / EnvResolution), pure and side-effect-free, values obtained exclusively via dotenv.parse"
  - "tests/env-precedence.test.ts — 16-case temp-dir fixture proof of every precedence rule, including the NODE_ENV=test .env.local exclusion and the 2026-09-06 OPS-05 incident"
affects: [39-03, 39-04, 39-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure resolver returning a labelled result instead of throwing or printing — mirrors scripts/_neon-target.ts's fail-safe shape (null on ambiguity, never a guess)"
    - "processEnv passed as an explicit parameter, never read from the ambient environment, so tests can assert precedence without inheriting a developer's shell or .env.test.local"

key-files:
  created:
    - scripts/_env-precedence.ts
    - tests/env-precedence.test.ts

key-decisions:
  - "Routed all value extraction through dotenv's own parse() (never config()) — this is what makes the later differential test (39-05) and the _load-env.ts rewire (39-03) provably byte-identical to this module rather than a second hand-rolled parser that could quietly disagree"
  - "envFileOrder is the single place the file order is written down; both interface-contract acceptance greps for '.env.local' and for the forbidden-construct set were honored, with the one exception documented below (interface contract vs. acceptance-criteria regex conflict on the word 'source' / the string 'process.env')"

requirements-completed: [OPS-05]

# Metrics
duration: ~11min
completed: 2026-09-06
---

# Phase 39 Plan 02: Shared TypeScript Env-Precedence Resolver Summary

**`scripts/_env-precedence.ts` — the single pure TS function pair (`envFileOrder` + `resolveDatabaseUrl`) that decides dotenv file order and effective `DATABASE_URL`, proven against 16 on-disk temp-dir fixture cases including the exact 2026-09-06 OPS-05 incident.**

## Performance

- **Duration:** ~11 min
- **Started:** 2026-09-06T19:20:12+02:00 (approx, immediately after 39-01's docs commit)
- **Completed:** 2026-09-06T19:31:00+02:00 (approx)
- **Tasks:** 2
- **Files modified:** 2 (both created)

## Accomplishments

- Created `scripts/_env-precedence.ts` exporting `envFileOrder(nodeEnv)`, `resolveDatabaseUrl(opts)`, and `EnvResolution` exactly per the plan's `<interface_contract>` — `.env.$NODE_ENV.local` → `.env.local` → `.env.$NODE_ENV` → `.env`, first-writer-wins, with `.env.local` excluded outright for `nodeEnv: 'test'`
- Values are obtained exclusively via `dotenv`'s own `parse()` (never `config()`, never a shell, `eval`, or `require`) — the module reads text with `readFileSync` and hands it to `parse()`, so a malformed or hostile line in an env file cannot execute
- The module prints nothing; `EnvResolution.url` is documented as a live credential whose only sanctioned downstream use is `new URL(url).hostname` (never `.host`, per bug_011)
- Created `tests/env-precedence.test.ts` with 16 `it()` cases (plan required ≥12) proving every `<behavior>` bullet from Task 1, including the NODE_ENV=test exclusion, the commented-out-value case, all four quoting/whitespace forms, and — named explicitly so it is unmissable in CI output — the 2026-09-06 incident: with both `.env.production.local` (production host) and `.env.local` (development host) present, `nodeEnv: 'production'` resolves to the production host from `.env.production.local`
- Full test suite (2392 tests across 178 files, +16 from this plan over 39-01's 2376), `npm run typecheck`, `npm run lint:check`, and `npm run build` all pass; `git status --porcelain` confirms the repo's own `.env*` files were untouched by the fixture test run

## Task Commits

1. **Task 1: Create scripts/_env-precedence.ts** - `859e999` (feat)
2. **Task 2: Prove every precedence case with a temp-dir fixture test** - `82319a2` (test)

**Plan metadata:** committed alongside this SUMMARY

## Files Created/Modified

- `scripts/_env-precedence.ts` - `envFileOrder`, `resolveDatabaseUrl`, `EnvResolution`; pure, side-effect-free, dotenv.parse-only
- `tests/env-precedence.test.ts` - 16-case temp-dir fixture suite (`mkdtempSync`/`rmSync`, distinct `env-precedence-` prefix, no ambient `process.env`/`process.cwd()` reachability)

## Decisions Made

- **`dotenv.parse` over a hand-rolled extractor.** Per the plan's explicit instruction (load-bearing for 39-05's differential test): guarantees whatever `_load-env.ts` loads with `config()` in plan 39-03 is byte-identical to what this module reports.
- **`envFileOrder` returns bare filenames, never joined to a directory** — `resolveDatabaseUrl` joins them against `opts.cwd` itself, keeping the order-decision function pure and independently testable from filesystem access.
- **`filesFound` computed once, independent of `DATABASE_URL` resolution outcome** — so a `process.env` win still reports which files exist on disk, satisfying the interface contract's "local-only SKIP signal" role for callers.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test fixtures needed a `NODE_ENV` field to satisfy `NodeJS.ProcessEnv`**
- **Found during:** Task 2 (writing `tests/env-precedence.test.ts`)
- **Issue:** `npm run typecheck` failed with `TS2741: Property 'NODE_ENV' is missing` on every `processEnv: {}` / `processEnv: { DATABASE_URL: ... }` literal. Next.js's `next/types/global.d.ts` augments the global `NodeJS.ProcessEnv` interface with a required (non-optional) `NODE_ENV: 'development' | 'production' | 'test'` field — a repo-wide ambient type, not something either the plan or `scripts/_env-precedence.ts` control.
- **Fix:** Added a shared `BASE_PROCESS_ENV: NodeJS.ProcessEnv = { NODE_ENV: 'test' }` fixture constant (documented as a type-satisfying placeholder only — `resolveDatabaseUrl` never reads `NODE_ENV` itself, only the explicit `nodeEnv` argument) and spread it into every `processEnv` literal.
- **Files modified:** `tests/env-precedence.test.ts`
- **Verification:** `npm run typecheck` exits 0; all 16 tests still pass with identical assertions.
- **Committed in:** `82319a2` (Task 2 commit)

### Discovered Plan Inconsistency (not auto-fixed — documented instead)

**2. Two acceptance-criteria greps conflict with the plan's own mandatory interface contract.**

- **`scripts/_env-precedence.ts` Task 1 criterion:** `grep -Ec 'config\(|execSync|child_process|eval\(|\bsource\b' scripts/_env-precedence.ts` is specified to output `0`. After rewording every doc-comment usage of the bare word "source" to a paraphrase (e.g. "which file supplied it" instead of "source"), the count is down to **3** — all three are the mandatory `source` property of the interface-contract-defined `EnvResolution` type (`source: string;` and the two `source: '...'` / `source: file` return-site assignments in `resolveDatabaseUrl`). The interface contract (same plan file, `<interface_contract>` section, consumed by 39-03/39-04/39-05) names this field `source` explicitly — renaming it to dodge the grep would break the frozen downstream contract, which is a worse outcome than a literal grep mismatch. `config\(` and the other three alternatives all genuinely count 0.
- **`tests/env-precedence.test.ts` Task 2 criterion:** `grep -Ec 'process\.env' tests/env-precedence.test.ts` is specified to output `0`. After rewording every prose usage (docstring, `describe`/`it` titles) that isn't a direct assertion, the count is down to **1** — `expect(resolution?.source).toBe('process.env')`, which is the literal string value the interface contract mandates ("`source` is `'process.env'`") and is exactly what Task 2's own `<behavior>` bullet requires this test to assert. There is no way to test that assertion without the literal substring `process.env` appearing in the file.
- **Not auto-fixed** because obfuscating either literal (e.g., string-concatenating `'proc' + 'ess.env'`, or renaming the `source` field to something the grep wouldn't catch) would be dishonest engineering that defeats each criterion's actual intent — verifying that this module never invokes a shell `source`/`eval`/`require`/`child_process`, and never silently inherits the ambient process environment. Both properties are independently confirmed true: `scripts/_env-precedence.ts` has zero shell/eval/require/child_process usage (only the interface-mandated `source` identifier), and `tests/env-precedence.test.ts` has zero occurrences of `process.cwd` and zero occurrences of code that reads the ambient `process.env` object (confirmed separately — the sole remaining `process.env` match is a string literal being compared, not an environment read).
- **Impact:** None on correctness or safety. This is the same class of plan-authoring defect that 39-01's SUMMARY documented (acceptance-criteria regex written independently of, and prior to, the interface contract that mandates the exact identifiers the regex then flags). Plans 39-03/39-04/39-05 should expect these two counts (3 and 1, not 0) when checking this module and its test, and should write any analogous acceptance criteria in this phase to exclude the identifiers the interface contract itself mandates.

---

**Total deviations:** 1 auto-fixed (blocking, ambient `NodeJS.ProcessEnv` type augmentation) + 1 documented plan inconsistency (not auto-fixed, no safety impact, matches 39-01's precedent)
**Impact on plan:** The auto-fix was necessary for the test file to compile at all — inherited entirely from Next.js's global type augmentation, unrelated to this plan's own design. No scope creep; no functionality added beyond what the plan specified.

## Issues Encountered

None beyond the deviations documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `scripts/_env-precedence.ts` exports `envFileOrder`, `resolveDatabaseUrl`, and `EnvResolution` with the exact interface contract plans 39-03, 39-04, and 39-05 depend on.
- Plan 39-03 can rewire `scripts/_load-env.ts` onto `resolveDatabaseUrl` as a three-line change (call it, then `config({ path: resolution.source })`-equivalent or set `process.env.DATABASE_URL` directly from `resolution.url`) — the module's docstring flags the two rules that matter: keep the import first, and never call `config()` inside `_env-precedence.ts` itself.
- Plan 39-05's differential test has a function (`resolveDatabaseUrl`) to compare the bash guard's behaviour against, one endpoint hostname set already shared via 39-01's `_neon-endpoints.ts`.
- The two "acceptance-criteria grep vs. interface-contract identifier" conflicts documented above (item 2) should be read by 39-03/39-04/39-05 before writing or checking any analogous `grep -Ec ... outputs 0` criterion against this module or its test.
- Full test suite (2392 tests), typecheck, lint:check, and build all green at hand-off.

## Self-Check: PASSED

All 2 created files verified present on disk; both task commit hashes (`859e999`, `82319a2`) verified present in `git log`.

---
*Phase: 39-database-guard-correctness*
*Completed: 2026-09-06*

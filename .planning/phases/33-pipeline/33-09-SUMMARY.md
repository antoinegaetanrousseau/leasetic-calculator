---
phase: 33-pipeline
plan: 09
subsystem: routing
tags: [nextjs, react, access-control, pipeline, crm]
status: partial — awaiting checkpoint

# Dependency graph
requires:
  - phase: 33-pipeline
    plan: 03
    provides: listPipelineBoard, getConversionRateForOwner
  - phase: 33-pipeline
    plan: 05
    provides: formatConversionRate
  - phase: 33-pipeline
    plan: 06
    provides: SIREN gate wiring on /clients/[id] (verified live in task 3)
  - phase: 33-pipeline
    plan: 07
    provides: PipelineBoard, PipelineMobileList (mounted, not modified)
  - phase: 33-pipeline
    plan: 08
    provides: the DB-layer integration proof this plan's checkpoint cites for
      criteria 3/4
provides:
  - app/(authed)/pipeline/page.tsx — the /pipeline route (auth gate,
    owner-scoped fetch, conversion tile, board + mobile list)
  - app/(authed)/pipeline/access.test.tsx — the access-boundary proof
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zero-relationships branch computed from a total-card count across all
      seven stage buckets, replacing the tile+board with a guiding Empty
      state rather than rendering an empty seven-lane board (UIC-05)"

key-files:
  created:
    - app/(authed)/pipeline/page.tsx
    - app/(authed)/pipeline/access.test.tsx
  modified: []

key-decisions:
  - "Doc-comment prose in page.tsx deliberately avoids the literal substrings
    'requireRelationshipHolder()' and 'session.user.id' outside the actual
    call sites, so the plan's own grep-based acceptance criteria
    (count === 1 / count === 2) hold even in comments, matching the
    precedent 33-06-SUMMARY.md recorded for the same class of grep gate."
  - "Rule 1 auto-fix: access.test.tsx's listPipelineBoard mock needed an
    explicit parameter type on its factory function — tsc could not infer a
    non-empty call-args tuple from a zero-arg mock factory, so
    mock.calls[0][0] failed npm run typecheck (TS2493). Typed the mock's
    argument and switched the assertion to optional-chained access; no
    behavioral change to what the test proves."

requirements-completed: []
# PIPE-01..05 are structurally complete after tasks 1-2, but this plan's own
# <output> instructs leaving requirements unmarked until task 3's checkpoint
# is approved — matching the discipline 33-08-SUMMARY.md used for its own
# pending human-verify checkpoint.

# Metrics
duration: ~35min (tasks 1-2 only; task 3 pending)
completed: null
---

# Phase 33 Plan 09: Pipeline Route & Phase Acceptance Summary

**`/pipeline` — the route that mounts every piece Phase 33 built (conversion
tile, desktop board, mobile list) behind `requireRelationshipHolder()`, plus
the access-boundary test proving an admin never reaches the board query —
tasks 1-2 complete and gate-green; task 3 (the phase's blocking acceptance
checkpoint) is reported separately.**

## Performance

- **Duration:** ~35 min (tasks 1-2)
- **Tasks:** 2/3 completed (task 3 is `type="checkpoint:human-verify"
  gate="blocking"` — operator action only, reported alongside this summary)
- **Files created:** 2

## Accomplishments

- `app/(authed)/pipeline/page.tsx` — async server component,
  `dynamic = 'force-dynamic'`. Order of operations mirrors `/clients/[id]`'s
  numbered doc comment: the relationship-holder gate runs first (no
  `requireAdmin`, no role branch — a `sales` user reaches the identical
  surface, ROLE-02), then `getCurrentLang()`, then `listPipelineBoard` and
  `getConversionRateForOwner` in parallel, both scoped to `session.user.id`
  — the only source of owner scoping on this route (no `searchParams` are
  read at all, T-33-09-02).
- **Zero-relationships branch** — a total-card count across all seven stage
  buckets gates between a guiding `Empty` state (icon, title, body, a
  `/clients` CTA) and the tile+board/list pair, per UIC-05's stated
  two-line exception. Never an empty seven-lane board.
- **Otherwise** — exactly one `MetricTile` (`variant="total"`, D-11's
  two-motivating-elements cap), then `PipelineBoard` (`hidden md:block`)
  and `PipelineMobileList` (`block md:hidden`), both fed the same
  server-fetched `initial` — one route, one data fetch, two render paths.
  No `maxWidth`/`max-w-[` override — the board's horizontal scroll lives
  inside `Shell`'s capped `<main>` (UIC-09), via plan 33-07's
  `BoardScrollArea`.
- `app/(authed)/pipeline/access.test.tsx` — 6 assertions, inverting the
  `app/(admin)/[adminSegment]/companies/review/access.test.tsx` shape:
  admin is refused with the real 404-fallback digest (not a no-op mock —
  the refusal genuinely halts), `listPipelineBoard`/
  `getConversionRateForOwner` are asserted **never called** on that path
  (T-33-09-01 — the composition property a fetch-then-hide implementation
  would fail), the refusal is confirmed 404-not-403, and `partner`/`sales`
  are admitted as two independent named cases, each reaching the board
  query with their own session id and no second "all owners" argument.

## Task Commits

1. **Task 1: Create the /pipeline route** — `7cafde8` (feat)
2. **Task 2: Prove the access boundary** — `4b7a72b` (test)
3. **Rule 1 auto-fix (typecheck): type the mock's argument** — `8c76c88` (fix)

## Files Created/Modified

- `app/(authed)/pipeline/page.tsx` — the route (new)
- `app/(authed)/pipeline/access.test.tsx` — 6 assertions (new)

## Decisions Made

See `key-decisions` in the frontmatter. The load-bearing one: doc-comment
prose in `page.tsx` avoids the literal grep-targeted substrings outside
their real call sites, so the plan's own acceptance criteria hold even in
comments — the same discipline plan 33-06 already established for its own
page-level D-04 comment.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `access.test.tsx`'s mock factory produced an empty
call-args tuple, failing `npm run typecheck`**
- **Found during:** the mandatory four-gate verification run before the
  task 3 checkpoint (`npm run typecheck`).
- **Issue:** `listPipelineBoardMock: vi.fn(async () => ({...}))` has no
  declared parameter, so TypeScript infers its `mock.calls` entries as the
  empty tuple `[]`. Destructuring `listPipelineBoardMock.mock.calls[0]` as
  `[{ ownerId: string }]` produced `TS2493: Tuple type '[]' of length '0'
  has no element at index '0'`.
- **Fix:** Gave the mock factory an explicit `(_args: { ownerId: string })`
  parameter and switched the assertion to `mock.calls[0]?.[0]` with
  optional-chained property access — proves the identical fact (the board
  query's argument equals the caller's own session id, never an admin or
  sales id) with a type TypeScript can verify.
- **Files modified:** `app/(authed)/pipeline/access.test.tsx`
- **Verification:** `npm run typecheck` exits 0; `npx vitest run
  "app/(authed)/pipeline/access.test.tsx"` — 6/6 passed; `npm run
  lint:check` exits 0.
- **Committed in:** `8c76c88`

---

**Total deviations:** 1 auto-fixed (1 bug, typecheck-blocking)
**Impact on plan:** Necessary to keep `npm run typecheck` — a hard project
constraint and this plan's own mandatory verification step — at exit 0. No
scope creep: the fix is a type annotation and an equivalent assertion
rewrite, zero change to what the test proves or which files it touches.

## Automated Gate Results (run before task 3)

| Gate | Command | Result |
|---|---|---|
| Lint | `npm run lint:check` | exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
| Tests | `npm run test` | 146 test files passed, 3 skipped (integration, `DATABASE_URL_TEST` unset); 1807 tests passed, 38 skipped, **0 failed** |
| Build | `npm run build` | exit 0 — `/pipeline` listed as a registered dynamic route (`ƒ /pipeline`) |

`git diff --stat package.json package-lock.json components.json` — empty
(no dependency change, T-33-09-SC). `git status --short` — clean before
task 3 begins.

## Issues Encountered

None beyond the deviation documented above.

## User Setup Required

**Task 3 is a blocking operator checkpoint — see the `CHECKPOINT REACHED`
message returned alongside this summary.** All four automated gates above
are already green; task 3 is the fifteen-step manual acceptance walk against
a dev server pointed at the migrated Neon **development** branch, per the
plan's own `<how-to-verify>`. No connection string or manual gate re-run
should be chosen by an agent — the checkpoint's `<resume-signal>` requires
the operator to report steps 5 (A-5 keyboard drag), 10 (D-08 inline SIREN
gate) and 13 (D-04 decoupling) explicitly.

## Next Phase Readiness

- Tasks 1-2 are fully committed, typechecked, linted, tested and built
  green. They are **not yet verified** against the live interactive
  behaviors (keyboard drag, the inline SIREN round trip, D-04 decoupling on
  a running app) — that is task 3's sole purpose.
- Do **not** mark this plan complete in `ROADMAP.md`, and do **not** advance
  `STATE.md`'s Current Plan counter past 33-09, until task 3's checkpoint is
  approved with steps 5, 10 and 13 explicitly reported.
- Once approved, Phase 33 (Pipeline) is complete — this is the phase's final
  plan.

---
*Phase: 33-pipeline*
*Completed: pending task 3 checkpoint approval*

## Self-Check: PASSED

Verified `app/(authed)/pipeline/page.tsx` and
`app/(authed)/pipeline/access.test.tsx` present on disk. Verified all three
commit hashes present in git log:
- `7cafde8` — feat(33-09): create the /pipeline route
- `4b7a72b` — test(33-09): prove the /pipeline access boundary
- `8c76c88` — fix(33-09): type the listPipelineBoard mock's argument for tsc

`npm run lint:check`, `npm run typecheck` both exit 0. `npx vitest run
"app/(authed)/pipeline/access.test.tsx"` — 6/6 passed. `npm run test` — 1807
passed, 38 skipped, 0 failed. `npm run build` exits 0, `/pipeline` listed as
a registered route. `git diff --stat package.json package-lock.json
components.json` empty.

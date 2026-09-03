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

---

## Task 3 — Acceptance Checkpoint: APPROVED (2026-09-03)

Approved by Antoine on 2026-09-03: *"approved, steps 5 worked, 10 worked and
13 correct. all pass."* All fifteen acceptance steps confirmed.

### The three called-out steps

| Step | What it gates | Result |
|---|---|---|
| 5 | the keyboard path (A-5, as amended) | **PASS** — arrow keys move a focused card between adjacent settable lanes |
| 10 | the inline SIREN gate preserving typed values (D-08) | **PASS** — dialog stayed open, kept the typed date and reason, completed after a valid SIREN |
| 13 | the Decoupling Contract (D-04) | **PASS** — a won proposal did not move its relationship's card to Signé |

### Two amendments applied before the walkthrough

1. **A-5 withdrawn as a drag gate.** Antoine's decision, 2026-09-03: "no
   keyboard drag, only with cursor." Pick-up/drop and Escape-to-cancel were
   removed from the implementation (commit `1119c5f`) and replaced by a
   deterministic arrow-key move. Step 5 in the PLAN was restated to match, in
   commit `54450d6` — the original script described behaviour the code
   deliberately no longer has and could never have been approved as written.
2. **SIREN made mandatory** at proposal and client creation (commit
   `8daac4a`). A SIREN-less company is therefore no longer producible through
   the UI, which made step 10 reachable only on a seeded legacy row. The DB
   trigger `proposals_won_requires_siren` and the inline dialog gate are both
   retained as the safety net for pre-existing rows.

### Fixture prerequisite (commit `54450d6`)

The `development` Neon branch did not satisfy this plan's stated precondition
— two relationships, both on one company, no finalized partner proposal — so
steps 2-5, 9, 11, 12 and 14 were *unreachable* rather than passing, and step
10 was unreachable by construction. `scripts/seed-pipeline-fixtures.ts`
(`npm run db:seed:pipeline-fixtures`) seeds nine relationships across the five
settable stages and six finalized proposals, including one past its validity
window with no outcome and one on a siren-less legacy company. It is
development-only with no override flag, idempotent, and reverts with
`--remove`. No fixture carries a pre-set outcome and none uses a reserved
stage (D-04).

### Automated gates (re-run at approval, after commits 1119c5f / 8daac4a / 54450d6)

| Gate | Result |
|---|---|
| `npm run lint:check` | exit 0 |
| `npm run typecheck` | exit 0 |
| `npm run test` | exit 0 — 1810 passed, 38 skipped, 0 failed (146 files) |
| `npm run build` | exit 0 — compiled successfully, `/pipeline` registered |

The build was deliberately run **after** the manual walkthrough, not before:
a `next build` sharing `.next/` with a running `next dev` leaves the dev
server serving a stale `globals.css` compile, which would have corrupted the
visual steps.

### ROADMAP success criteria → evidence

| # | Criterion | Evidenced by |
|---|---|---|
| 1 | own relationships grouped by stage, own conversion rate | steps 1, 2, 6, 7, 12 |
| 2 | reserved stages refuse partner writes | steps 3, 4, 5, 8 |
| 3 | outcome capture with date and reason | steps 9, 11 + the recorded integration run in `33-08-SUMMARY.md` |
| 4 | won requires a SIREN | step 10 + the DB-level trigger proof in `33-08-SUMMARY.md` |
| 5 | no cross-partner comparison anywhere | steps 6, 12 |

*Completed: 2026-09-03 — checkpoint approved, plan 33-09 closed.*

---

## Post-Review Re-Verification (2026-09-03, after commits 8b58470 / 52d03e1)

The code review (`33-REVIEW.md`) ran AFTER this checkpoint was approved and
found five criticals, two of which invalidated acceptance evidence recorded
above. Both were repaired and the affected steps re-walked by Antoine, who
reported: *"steps 3, 10 and 14 all pass now."*

| Step | Why the original pass did not hold | Re-walk result |
|---|---|---|
| 3 | The reserved-lane refusal message was unreachable: `disabled` on the column disabled its DROPPABLE too, so a drop resolved `over` to null and the refusal branch never ran. What was visible was a silent snap-back, which D-09.1 calls worse than a lane that reads as unreachable (WR-01). | **PASS** — the lane is now a drop target that refuses out loud (`52d03e1`) |
| 10 | The gate travelled as a thrown error whose `.message` the dialog matched. Next.js redacts a Server Function's thrown message in production builds, so the gate was dev-only — the original pass observed behaviour that does not exist in production (CR-01). | **PASS** — the gate is now a returned discriminated result (`8b58470`) |
| 14 | The seeded row left `pdf_generated_at` null, and `deriveProposalOutcome` short-circuits to null on that, so the "Sans réponse" badge could not have rendered on the row it was checked against (CR-03). | **PASS** — fixture repaired; only the step-14 row is past validity (`8b58470`) |

Steps 1, 2, 4-9 and 11-15 stand on their original walkthrough — none of the
findings touched the code paths they exercise.

### Still open after this re-walk

1. **Step 10 in a production build.** `33-VERIFICATION.md`'s first human item
   asks for the gate to be re-walked against `npm run build && npm run start`
   rather than `next dev`, because dev-vs-production divergence is the exact
   class CR-01 belonged to. Residual risk is low — the repaired path carries
   no error message at all, and a Server Function's RETURN value serialises
   identically in both modes — but it has not been observed in production mode.
2. **The Space-then-arrow interaction.** WR-02 is fixed (`52d03e1`) and pinned
   by `PipelineBoard.test.tsx` Test 9b, but no operator has walked a dnd-kit
   keyboard drag (Space → ArrowRight → Space) to confirm exactly one stage
   change and one audit row.
3. **Migration 0009 on `main` / `preview`.** Deliberately deferred to milestone
   close per `33-02-SUMMARY.md`; every criterion is true in the codebase and on
   the development branch, and none is true in production until 0009 lands.

### Findings fixed after approval

| Finding | Fixed in |
|---|---|
| CR-01 — D-08's SIREN gate dead in production | `8b58470` |
| CR-02 — `--remove` guard always aborted (`<> any`) | `8b58470` |
| CR-03 — the `unanswered` fixture could not reach `unanswered` | `8b58470` |
| CR-04 — an outcome could be recorded on a draft | `8b58470` |
| CR-05 — `--remove` could destroy another partner's data | `8b58470` |
| WR-01 — reserved-lane refusal unreachable | `52d03e1` |
| WR-02 — arrow + keyboard drag double-write | `52d03e1` |

The remaining 14 warnings and 10 info findings in `33-REVIEW.md` are untouched
and unclaimed.

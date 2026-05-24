---
phase: 17-partner-surfaces
plan: 01
subsystem: database
tags: [drizzle, postgres, lc-ref-allocation, sequential-id, archived-filter, tdd]

# Dependency graph
requires:
  - phase: 12-schema-extensions-for-drafts-history
    provides: "proposals.lc_ref nullable + partial unique index proposals_user_id_lc_ref_uq WHERE lc_ref IS NOT NULL (D-05); createDraft/finalizeDraft helpers"
  - phase: 13-3-step-proposal-wizard
    provides: "finalizeDraft single-shot atomic UPDATE owning the audit_log entry (D-16); pre-finalize lifecycle invariant (no audit_log on draft creation, D-16)"
  - phase: 14-admin-polish-partners-history-home
    provides: "deriveDisplayStatus + ProposalRowDto displayStatus projection (D-27); ADMIN-09 9-gate grep-contract suite (D-29)"
  - phase: 8-persistence-pdf-pipeline
    provides: "generateLcRef format reference (LC- prefix); params_snapshot immutability invariant"
provides:
  - "lc_ref pre-allocated at createDraft (sequential per-user LC-2026-NNN); finalizeDraft sources it from the draft row"
  - "BuildListParams.archived?: boolean — Archivées view returns expired OR soft-deleted-within-30-days rows scoped to userId"
  - "allocateNextLcRefForUser internal helper with retry-on-unique-violation (D-04 gap-tolerant)"
  - "T-17-01-01 IDOR mitigation in archived branch (userId is FIRST AND predicate in every branch)"
affects:
  - "17-04 (/proposals Archivées view consumes BuildListParams.archived via ?archived=1 query param)"
  - "17-07 (Wizard step 3 PdfPreviewMock renders real draft.lcRef — unblocked by D-03 pre-allocation)"
  - "all future plans calling createDraft (signature unchanged, but lcRef now NOT NULL on returned row)"
  - "all future plans calling finalizeDraft (FinalizeDraftArgs no longer accepts lcRef field)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-user sequential ID allocation via SELECT DESC LIMIT 1 + parse + increment + retry-on-unique-violation"
    - "Candidate-set SQL + app-side deriveDisplayStatus narrow (keeps paramsSnapshot.validityDays math out of SQL)"
    - "userId is the FIRST AND predicate in every query branch (IDOR defense in depth)"

key-files:
  created:
    - "src/lib/api/proposals/list.test.ts (195 lines — 7 tests covering archived filter)"
  modified:
    - "src/lib/db/queries/proposals.ts (createDraft + finalizeDraft + listProposalsByUser + searchProposals + new allocateNextLcRefForUser helper)"
    - "src/lib/api/proposals/list.ts (BuildListParams.archived + threading)"
    - "src/lib/api/proposals/finalize-wizard.ts (drop generateLcRef call; source lcRef from draft row)"
    - "src/lib/db/queries/proposals.test.ts (3 new createDraft D-03 tests + 2 updated finalizeDraft tests = 42 total)"
    - "src/lib/api/proposals/finalize-wizard.test.ts (Test 6/7 updated for new arg shape + happy-path mock carries lcRef)"
    - "src/lib/pdf/no-commission.test.ts (30 fixtures + 2 helpers: mock draft now carries pre-allocated lcRef)"

key-decisions:
  - "lc_ref format LC-2026-NNN (≥3-digit zero-pad) — verified against plan format-constant spec, NOT v1.0's LC-NNNNN random format (legacy random refs explicitly excluded from sequence via LIKE 'LC-2026-%' filter)"
  - "Allocator algorithm (b) from 17-PATTERNS.md: SELECT DESC LIMIT 1 + parse + increment, no SELECT FOR UPDATE — retry-on-any-insert-error up to 3 attempts (partial unique index is the backstop)"
  - "Defensive throw in finalizeDraft when draft.lcRef is NULL — catches legacy pre-Phase-17 drafts; cannot silently write NULL into active row (would violate Phase 12 completeness CHECK)"
  - "Archivées branch uses candidate-set + app-side deriveDisplayStatus filter (NOT pure SQL) — keeps paramsSnapshot.validityDays + pdfGeneratedAt math centralized in deriveDisplayStatus per D-12 single source of truth"
  - "Fetch cap = limit * 3 in archived branch handles app-side shrink; v1.3 partner volume (<1000 rows/partner) per CONTEXT keeps it bounded (T-17-01-06 accepted)"

patterns-established:
  - "Per-user sequential ID allocation with partial-unique-index backstop + retry loop (no SELECT FOR UPDATE; transaction wrapper deferred — the partial unique index makes the worst case a retry)"
  - "Candidate-set + app-side narrow filter pattern for SQL that can't cleanly express derived state (e.g. deriveDisplayStatus reads paramsSnapshot.validityDays — too messy in pure SQL)"

requirements-completed: [WIZ-06, PROPS-01, PROPS-02]

# Metrics
duration: 13min
completed: 2026-05-24
---

# Phase 17 Plan 01: lc_ref allocation move + archived filter Summary

**Inverts Phase 13 D-15 (lc_ref at finalize) to allocate at createDraft (D-03 per-user sequential LC-2026-NNN), and adds BuildListParams.archived (D-13) for the /proposals Archivées view — both DB/API foundations that unblock the wizard step 3 real-lcRef PdfPreviewMock (Plan 17-07) and the /proposals filter pill (Plan 17-04).**

## Performance

- **Duration:** 13 min
- **Started:** 2026-05-24T14:47:39Z
- **Completed:** 2026-05-24T15:00:50Z
- **Tasks:** 2 (both TDD: RED → GREEN, 4 commits)
- **Files modified:** 6 (1 created + 5 modified)

## Accomplishments

- `createDraft` now allocates lc_ref via per-user sequential allocator (`allocateNextLcRefForUser`) producing `LC-2026-NNN`. Returns a row with non-null `lcRef`.
- `finalizeDraft` no longer accepts `lcRef` in args; reads it from the draft row inside the same transaction. Audit payload sources `lcRef` from the draft (not args).
- `finalize-wizard.ts` drops the `generateLcRef()` call (verification gate: `grep -c generateLcRef` == 0); threads the real `draft.lcRef` into the PDF data prop (unblocks WIZ-06 real-lcRef render in PdfPreviewMock).
- `BuildListParams.archived?: boolean` added; threads through `listProposalsByUser` + `searchProposals` to a new candidate-set branch + app-side `deriveDisplayStatus` filter returning expired OR soft-deleted-within-30-days rows.
- T-17-01-01 IDOR mitigation: `userId` is the FIRST `AND` predicate in every branch (Actives, deleted-window, Archivées, search variants). Test 4 enforces the invariant via cross-userId mock assertion.
- ADMIN-09 9-gate grep-contract suite remains green throughout. ADMIN-09 30-fixture no-commission corpus remains green (mock draft updated to carry pre-allocated lcRef).

## Task Commits

Each task was committed atomically (TDD: RED + GREEN per task):

1. **Task 1 RED — failing lcRef tests** — `99e1e62` (test)
2. **Task 1 GREEN — lc_ref allocation at createDraft (D-03)** — `0d3d301` (feat)
3. **Task 2 RED — failing archived filter tests** — `78cb99c` (test)
4. **Task 2 GREEN — archived filter (PROPS-02 D-13)** — `4f8279a` (feat)

## Files Created/Modified

- **src/lib/api/proposals/list.test.ts** (CREATED, 195 lines) — 7 Vitest tests for `buildListResponse` archived filter: Actives default preserved (Test 1/1b), Archivées returns expired + recently-deleted (Test 2), boundary > 30d delegated to DB layer (Test 3), userId IDOR invariant across two users (Test 4), q + archived orthogonal via searchProposals (Test 5), ADMIN-09 projection sanity.
- **src/lib/db/queries/proposals.ts** — Added `allocateNextLcRefForUser` helper (SELECT DESC LIMIT 1 + parse + increment + retry-up-to-3); `createDraft` calls allocator + persists lcRef + retries on insert error; `FinalizeDraftArgs` interface lost `lcRef` field; `finalizeDraft` reads lcRef via `getDraftById` + throws defensively if NULL; `ListProposalsArgs` gained `archived?: boolean`; `listProposalsByUser` + `searchProposals` gained candidate-set + app-side `deriveDisplayStatus` archived branch with `userId` as first AND predicate.
- **src/lib/api/proposals/list.ts** — `BuildListParams.archived?: boolean` added with JSDoc citing D-13; `buildListResponse` threads `archived` through both query branches; default = `false` (Actives view).
- **src/lib/api/proposals/finalize-wizard.ts** — `generateLcRef` import + call removed; D-16 step 6 comment updated (idempotency_key only); reads `draft.lcRef` directly; throws bounded `FinalizeFailed` if NULL (legacy pre-Phase-17 draft catch).
- **src/lib/db/queries/proposals.test.ts** — 3 new createDraft tests (D-03: lcRef matches `/^LC-2026-\d+$/`, starts at LC-2026-001, no audit_log); 2 updated finalizeDraft tests (lcRef sourced from draft row, audit payload.lcRef equals draft.lcRef).
- **src/lib/api/proposals/finalize-wizard.test.ts** — Default `getDraftByIdMock` mock now returns `lcRef: 'LC-2026-001'`; Test 6 + Test 7 retargeted to assert `lcRef` is NOT in finalizeDraft args (Phase 17 D-03 inversion).
- **src/lib/pdf/no-commission.test.ts** — Both `getDraftByIdMock.mockResolvedValue(...)` call sites (loop body + sanity loop) updated to include `lcRef: 'LC-2026-001'` on the mocked draft row.

## Decisions Made

- **lc_ref format LC-2026-NNN (≥3-digit zero-pad).** The existing `generateLcRef` in `src/lib/calc/formula.ts` produces `LC-NNNNN` (random 5-digit), but the Phase 17 plan + CONTEXT D-21 + 17-PATTERNS.md all specify `LC-2026-NNN`. The allocator excludes legacy random refs from the sequence via `WHERE lcRef LIKE 'LC-2026-%'` so the two formats don't shadow each other in `ORDER BY lcRef DESC`.
- **Algorithm (b) — sequential allocator with retry, no SELECT FOR UPDATE.** Per 17-PATTERNS.md recommendation. The partial unique index `proposals_user_id_lc_ref_uq WHERE lc_ref IS NOT NULL` (Phase 12 D-05) is the uniqueness backstop. On any insert error (concurrent race losing a unique violation), the next iteration re-SELECTs and picks the next suffix. Cap = 3 attempts. D-04 gap-tolerance accepted.
- **Defensive throw in finalizeDraft when draft.lcRef is NULL.** Post-Phase-17 drafts always have lcRef, but legacy pre-Phase-17 drafts may exist (created when `createDraft` did not allocate). Better to surface a bounded error than silently write NULL into the active row (which would violate the Phase 12 D-04 `proposals_finalized_completeness_check`).
- **Candidate-set + app-side narrow for Archivées.** Pure SQL `(pdf_generated_at + (inputs->>'validityDays')::int * interval '1 day') < NOW()` works but bypasses `deriveDisplayStatus` and duplicates the expired derivation in two places. The candidate-set approach keeps `deriveDisplayStatus` as the single source of truth. Fetch cap `limit * 3` bounds the app-side shrink.

## Deviations from Plan

None — plan executed exactly as written. Both tasks followed the TDD RED → GREEN cycle per the plan's `tdd="true"` directive. All 5 plan-level verification gates pass:

1. `npm test -- src/lib/db/queries/proposals.test.ts src/lib/api/proposals/list.test.ts` → exits 0 (49 tests)
2. `npm test -- tests/admin-09-grep-contracts.test.ts` → exits 0 (9 gates green)
3. `FinalizeDraftArgs` interface no longer contains `lcRef:` field
4. `grep -c generateLcRef src/lib/api/proposals/finalize-wizard.ts` → 0
5. `BuildListParams` contains `archived?: boolean`

## Issues Encountered

- **3 downstream test files needed mock updates** for the `getDraftById` mock to include the new `lcRef` field: `finalize-wizard.test.ts` (1 site), `no-commission.test.ts` (2 sites). Each update is a 1-line addition (`lcRef: 'LC-2026-001',`) to the mocked draft row. Committed alongside the Task 1 GREEN commit because the breakage was a direct consequence of the `finalizeDraft` signature change.
- **Pre-existing test failures unrelated to this plan:** 11 failures remain (9 in `src/components/ui/RetractableSidebar.test.tsx` due to a `window.localStorage.clear is not a function` jsdom setup issue, and 2 in `__pdf-fixtures__/render-fixtures.test.ts` byte-determinism fixtures). These were failing on `main` BEFORE this plan started (verified via `git stash`); unchanged by these commits. Logged here for future cleanup but NOT this plan's scope.

## TDD Gate Compliance

Both tasks followed the per-task TDD cycle correctly:

- Task 1: `test(17-01)` commit (RED, 99e1e62) BEFORE `feat(17-01)` commit (GREEN, 0d3d301). RED phase verified failing with 4 failed tests; GREEN phase verified all 42 tests pass.
- Task 2: `test(17-01)` commit (RED, 78cb99c) BEFORE `feat(17-01)` commit (GREEN, 4f8279a). RED phase verified failing with 6 failed tests; GREEN phase verified all 7 tests pass.

## User Setup Required

None — no external service configuration, no environment variables, no schema migrations (Phase 12 D-05 partial unique index already supports drafts with lc_ref values).

## Next Phase Readiness

- **Plan 17-02 (Partner Home rewrite)** can begin immediately. `BuildListParams.archived` is wired but Plan 17-02 only consumes the default Actives view; the `archived=1` toggle ships in Plan 17-04.
- **Plan 17-04 (/proposals Archivées view)** can begin immediately. The DB/API layer is complete; the route just calls `buildListResponse({ userId, q, cursorEncoded, archived })` with the new flag.
- **Plan 17-07 (Wizard step 3 PdfPreviewMock real lcRef)** can begin immediately. `draft.lcRef` is non-null on any post-Phase-17 draft; the route can pass `draft.lcRef!` to `<PdfPreviewMock lcRef={...} />`.
- **No blockers** for downstream plans.

## Self-Check: PASSED

Files verified to exist:
- FOUND: `src/lib/api/proposals/list.test.ts`
- FOUND: `src/lib/db/queries/proposals.ts` (modified)
- FOUND: `src/lib/api/proposals/list.ts` (modified)
- FOUND: `src/lib/api/proposals/finalize-wizard.ts` (modified)
- FOUND: `src/lib/db/queries/proposals.test.ts` (modified)
- FOUND: `src/lib/api/proposals/finalize-wizard.test.ts` (modified)
- FOUND: `src/lib/pdf/no-commission.test.ts` (modified)

Commits verified in `git log --all`:
- FOUND: 99e1e62 (test RED Task 1)
- FOUND: 0d3d301 (feat GREEN Task 1)
- FOUND: 78cb99c (test RED Task 2)
- FOUND: 4f8279a (feat GREEN Task 2)

---
*Phase: 17-partner-surfaces*
*Completed: 2026-05-24*

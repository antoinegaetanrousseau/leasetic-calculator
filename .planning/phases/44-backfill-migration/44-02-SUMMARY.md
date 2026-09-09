---
phase: 44-backfill-migration
plan: 02
subsystem: backfill
tags: [zod, pdf-render, dependency-injection, mig-03, mig-04]

# Dependency graph
requires:
  - phase: 44-backfill-migration
    plan: 01
    provides: "src/lib/backfill/types.ts contracts (BackfillCandidate, AdvisorIdentity, RowOutcome, RowFailureReason, BackfillDeps, BackfillMode)"
  - phase: 43-new-pdf-layout
    provides: "ProposalDocumentProps['data'] shape (advisor block, partner block)"
provides:
  - "buildBackfillPdfData() — stored row -> ProposalDocumentProps['data'], computed carried verbatim"
  - "renderRow() — mode-aware per-row render/upload/persist/mark worker, dependency-injected"
  - "redactDetail() — credential-safe error-message reducer reused by plan 04's report writer"
affects: [44-03, 44-04, 44-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Render-shape zod schema distinct from the strict wizard-write schema, so a pre-Phase-42 row with no clientSiret/partnerTel renders instead of being rejected (FIELD-03)"
    - "Docstrings paraphrase forbidden literal tokens (e.g. 'the coefficient-recompute helper' instead of the literal function name) so a grep-based absence gate on the source file passes while the same reasoning stays readable in prose"
    - "Bounded, non-throwing per-row function returning a discriminated result union (RowOutcome), matching src/lib/admin/purge.ts's best-effort per-row loop shape one level down"

key-files:
  created:
    - src/lib/backfill/pdf-data.ts
    - src/lib/backfill/pdf-data.test.ts
    - src/lib/backfill/render-row.ts
    - src/lib/backfill/render-row.test.ts
  modified:
    - .planning/REQUIREMENTS.md

key-decisions:
  - "Module docstrings never spell out 'computeLoyer', 'getLatestGlobalParams', 'params_snapshot', 'paramsSnapshot', '@/lib/db', '@/lib/storage', or the '@/lib/pdf' barrel import as literal substrings — the acceptance-criteria greps check the whole file text, not just import statements, so even an explanatory comment naming what is NOT called would trip the gate. Paraphrased equivalents preserve the same meaning (mirrors the Plan 01 'server-only' deviation)."
  - "backfillRenderInputsSchema and backfillComputedSchema live in pdf-data.ts as local exports rather than types.ts, since they are zod validators (runtime behavior), not type contracts — types.ts stays pure-types-only per its own docstring."
  - "writeMarker's dependency signature (src/lib/backfill/types.ts) uses the field name pdfSizeBytes, not sizeBytes as the plan's illustrative snippet showed; render-row.ts follows the actual types.ts contract (source of truth) rather than the plan's prose example."

requirements-completed: []

# Metrics
duration: ~24min
completed: 2026-09-09
---

# Phase 44 Plan 02: PDF Data Mapping + Per-Row Render Worker Summary

**Two pure, dependency-injected modules — `pdf-data.ts` turns a stored proposal row into document props with its own language and its stored `computed` jsonb printed verbatim, and `render-row.ts` sequences render → (apply-only) upload → persist → mark, with the marker written strictly last — plus the MIG-04 transitive-satisfaction restatement recorded in REQUIREMENTS.md.**

## Performance

- **Duration:** ~24 min
- **Started:** 2026-09-09T21:58:18Z
- **Completed:** 2026-09-09T22:10:12Z
- **Tasks:** 3
- **Files modified:** 5 (4 created, 1 modified)

## Accomplishments

- `buildBackfillPdfData()` validates a stored row through two new local render-shape zod schemas (`backfillRenderInputsSchema`, `backfillComputedSchema`) — deliberately not `proposalInputSchema` — so a pre-Phase-42 row with no `clientSiret`/`partnerTel` renders instead of being rejected (FIELD-03), while `language` is used exactly as stored (MIG-03) and `computed` is passed through unchanged (D-05/MIG-04). Every rejection path returns a bounded `{ ok: false, reason, detail }` form with field-name-only `detail` text — never a stored value.
- `renderRow()` sequences `buildBackfillPdfData` → `deps.renderPdf` → (dry-run stops here, MIG-01) → `deps.putBlob` at `proposals/{userId}/{id}.pdf` (an in-place overwrite per D-01, no existence probe per D-04) → `deps.persistPdfArtifact` → `deps.writeMarker` last (D-06/MIG-05 ordering). Every step's failure is caught and returned as a bounded `failed` `RowOutcome` via `redactDetail()`, which strips `scheme://…` tokens and truncates to 200 chars before any caught-error text reaches a report-bound value.
- REQUIREMENTS.md's MIG-04 bullet gained an inline restatement (matching the PROF-03/DOC-03 style already in the file) recording that MIG-04 is satisfied transitively per D-05, and that the absent `params_snapshot` read at render time is designed behaviour, not a coverage gap.
- 27 new tests across the two modules (14 + 13), all passing; `npx tsc --noEmit` and `npm run lint:check` both exit 0.

## Task Commits

Each task was committed atomically:

1. **Task 1: pdf-data.ts — stored row to document props, computed verbatim (D-05, D-02, MIG-03, MIG-04)** - `b4a03db` (feat)
2. **Task 2: render-row.ts — mode-aware render, in-place overwrite, marker last (D-01, D-04, D-06, D-10)** - `0ccc1d5` (feat)
3. **Task 3: Record the MIG-04 restatement in REQUIREMENTS.md (D-05)** - `602fd13` (docs)

_No TDD tasks in this plan — all three were `type="auto"`._

## Files Created/Modified

- `src/lib/backfill/pdf-data.ts` (new) - `buildBackfillPdfData()`, `backfillRenderInputsSchema`, `backfillComputedSchema`; zod-only runtime import, `ProposalDocumentProps` imported as type-only
- `src/lib/backfill/pdf-data.test.ts` (new) - 14 tests: verbatim-computed + falsification, own-language proof (fr/en/rejected-de), legacy-row acceptance vs strict-schema rejection, redacted invalid-inputs detail, invalid/missing computed, missing lc_ref, null advisor, D-02 live-read passthrough, two source-level absence assertions
- `src/lib/backfill/render-row.ts` (new) - `renderRow()`, `redactDetail()`; dependency-injected via `BackfillDeps`, no runtime import of any database/storage/PDF module
- `src/lib/backfill/render-row.test.ts` (new) - 13 tests: dry-run zero-write proof, apply invocation order, blob-key shape + falsification, persisted-value provenance (sha256/now()), failure containment for buildBackfillPdfData/renderPdf/putBlob/persistPdfArtifact/writeMarker rejections, `redactDetail` credential-safety + truncation, source-level dependency-injection assertion
- `.planning/REQUIREMENTS.md` (modified) - MIG-04's own sentence unchanged; appended a `*(Restated 2026-09-09 by Phase 44 D-05: ...)*` parenthetical recording transitive satisfaction

## Decisions Made

- Followed `types.ts`'s actual `BackfillDeps.writeMarker` signature (`pdfSizeBytes`, not `sizeBytes`) rather than the plan action text's illustrative snippet, since `types.ts` is the contract module plans 02-04 are written against and is the source of truth.
- Reworded three docstring passages (once in `pdf-data.ts`, once in `render-row.ts`) to avoid the literal substrings `proposalInputSchema`, `@/lib/db`, and `@/lib/storage`/`@/lib/pdf'` — the acceptance-criteria and test-level greps scan the whole file text, not just import statements, so even a comment explaining what is *not* imported would have tripped the gate. Meaning is preserved via paraphrase (e.g. "the strict wizard-input schema declared in `src/lib/calc/schema.ts`" instead of naming it, "no database module, no storage module, no PDF-renderer module" instead of the path literals).
- `backfillRenderInputsSchema` and `backfillComputedSchema` are exported from `pdf-data.ts` (not `types.ts`) since they are runtime zod validators, consistent with `types.ts`'s own docstring that it "imports nothing at runtime" and is "pure types only."

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reworded literal `proposalInputSchema` mentions out of pdf-data.ts's docstring**

- **Found during:** Task 1 acceptance-criteria verification
- **Issue:** The docstring explaining why the render-shape schema is NOT `proposalInputSchema` used the literal identifier twice, which made `grep -c "proposalInputSchema" src/lib/backfill/pdf-data.ts` print `2` instead of the required `0`.
- **Fix:** Reworded both sentences to describe the schema ("the strict wizard-input schema declared in `src/lib/calc/schema.ts`", "that stricter wizard schema") without the literal identifier, preserving the same meaning. The identifier is still used (and needed) in `pdf-data.test.ts`, which has no such gate.
- **Files modified:** `src/lib/backfill/pdf-data.ts`
- **Verification:** `grep -c "proposalInputSchema" src/lib/backfill/pdf-data.ts` now prints `0`; `npx tsc --noEmit` and `npx eslint --max-warnings=0` still pass.
- **Committed in:** `b4a03db` (part of Task 1 commit)

**2. [Rule 3 - Blocking] Reworded literal `@/lib/db` / `@/lib/storage` mentions out of render-row.ts's module docstring**

- **Found during:** Task 2's own test — the source-level dependency-injection assertion (`render-row.test.ts`) failed against the file it was asserting on
- **Issue:** The module docstring stated "no `@/lib/db`, no `@/lib/storage`, no `@/lib/pdf` runtime import" as prose explaining the dependency-injection contract — but the test's regex (`/head\(|@\/lib\/storage|@\/lib\/db|@\/lib\/pdf'/`, specified verbatim by the plan) matches those substrings anywhere in the file, comments included, so the module's own explanatory docstring tripped its own absence gate.
- **Fix:** Reworded to "no database module, no storage module, no PDF-renderer module is imported at runtime" — same meaning, no literal path substrings.
- **Files modified:** `src/lib/backfill/render-row.ts`
- **Verification:** The source-assertion test in `render-row.test.ts` passes; all 13 tests in the file pass; `npx tsc --noEmit` and `npx eslint --max-warnings=0` still pass.
- **Committed in:** `0ccc1d5` (part of Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking — acceptance-criteria / test greps). Both are cosmetic wording fixes with no change to types, exports, schemas, or behavior.

## Issues Encountered

None beyond the two deviations above, both caught and fixed before committing.

## User Setup Required

None — no external service configuration required. Both modules are pure and dependency-injected; nothing runs against a live database, blob store, or PDF renderer in this plan.

## Requirements Traceability

This plan's frontmatter lists `requirements: [MIG-03, MIG-04]` for relevance, but neither is marked complete here — per the "requirements: is relevance, not ownership" rule, each requirement's full text was checked against what this plan actually closes end-to-end:

- **MIG-03** ("Each proposal is re-rendered in its own committed `language`...") — this plan's `buildBackfillPdfData()` reads `row.language` verbatim and never defaults it, which is the mechanism MIG-03 needs. But MIG-03 describes an operator-observable outcome of a completed *run* ("no delivered document changes language at its existing reference"), which only exists once plan 04's orchestration loop and plan 05's operator-run script exist. Left open.
- **MIG-04** ("Every re-rendered PDF shows the same financial figures...") — same reasoning: the mechanism (`computed` carried verbatim) is built and tested here, and the transitive-satisfaction interpretation is now recorded in REQUIREMENTS.md (Task 3), but the requirement itself describes the outcome of an executed backfill run, which does not exist until later plans. Left open.

Neither checkbox was ticked in this plan (Task 3's acceptance criteria explicitly forbid ticking any MIG checkbox — confirmed via `grep -c '\- \[x\] \*\*MIG-'` printing `0`).

## Next Phase Readiness

- Plan 03 (report/drift) and plan 04 (orchestration) can import `buildBackfillPdfData`, `renderRow`, and `redactDetail` directly from `src/lib/backfill/pdf-data` and `src/lib/backfill/render-row` without re-deriving the render-shape validation or the write-ordering discipline.
- `redactDetail()` is exported and ready for plan 03's report writer to reuse for any error text surfaced in the dry-run/apply report, rather than writing a second redaction function.
- No blockers. No schema migration, no new runtime dependency (zod was already a project dependency).

## Self-Check: PASSED

All 5 claimed files found on disk; all 3 commit hashes (`b4a03db`, `0ccc1d5`, `602fd13`) found in git log.

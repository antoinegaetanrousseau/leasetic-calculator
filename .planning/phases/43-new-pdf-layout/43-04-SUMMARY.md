---
phase: 43-new-pdf-layout
plan: 04
subsystem: pdf
tags: [react-pdf, drizzle, advisor, proposal-finalize, byte-determinism]

# Dependency graph
requires:
  - phase: 43-new-pdf-layout
    provides: "plan 43-01's styles.ts token transcription and the DOC-03 amendment this plan's D-13 comments cite"
  - phase: 42-captured-data-fields-advisor-profile
    provides: "getAdvisor() (null-returning, never throws), leasetic_advisor's four nullable content columns, and users.companyTelephone/telephone"
provides:
  - "emDash(value) / EM_DASH — the single DOC-11 absence formatter, pinned not to swallow 0 and pinned to codepoint U+2014"
  - "ProposalDocumentProps grown with inputs.clientSiret?/inputs.partnerTel? (FIELD-03), a new sibling `partner.companyTelephone` and a nullable four-key `advisor` (D-12/D-13)"
  - "Both render call sites (finalize-wizard.ts, submit.ts) read getAdvisor() live and construct the grown data shape, with companyTelephone threaded opaquely from the session by both routes"
  - "A null advisor and a pre-Phase-42 (legacy) proposal both proven not to throw, at both the pipeline layer and the document-render layer"
affects: [43-05, 43-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single absence formatter over per-call-site ternaries — emDash(value) is a geometry guarantee that decays if reimplemented inline; 43-05/43-06 must import it rather than hand-roll a `?? '—'`"
    - "Advisor row mapped as an explicit four-key literal, never spread — the only way to keep the row's non-content columns (actor id, mutable timestamp) structurally unreachable from the document"
    - "Typed-interface enforcement: growing ProposalDocumentProps and letting tsc name every call site is the established mechanism (43-PATTERNS.md), not a runtime shape check"

key-files:
  created:
    - src/lib/pdf/em-dash.ts
    - src/lib/pdf/em-dash.test.ts
  modified:
    - src/lib/pdf/document.tsx
    - src/lib/api/proposals/finalize-wizard.ts
    - src/lib/api/proposals/submit.ts
    - app/api/proposals/finalize/route.ts
    - app/api/proposals/route.ts
    - src/lib/api/proposals/finalize-wizard.test.ts
    - src/lib/api/proposals/submit.test.ts
    - src/lib/pdf/no-commission.test.ts
    - src/lib/pdf/document.test.tsx
    - __pdf-fixtures__/fixtures.ts
    - src/lib/pdf/sanitize-number.test.ts
    - app/api/proposals/finalize/route.test.ts

key-decisions:
  - "The D-13 explanatory comment in document.tsx was worded to avoid the literal substrings 'updatedBy' and 'updatedAt' entirely (not just from the type literal) — Task 2's acceptance grep (`! grep -q \"updatedBy\"`) checks the whole file, including comments, not just the four-key type."
  - "EM_DASH is written as the JS escape '\\u2014', not a pasted Unicode character — confirmed by inspecting the raw bytes; a pasted em dash silently satisfies visual review but fails the plan's own grep gate for the escape form."
  - "companyTelephone was added as a required (non-optional) string | null field on both FinalizeWizardArgs and SubmitProposalArgs, matching the plan's action text verbatim — every existing test call site needed the field added, not defaulted away."

patterns-established:
  - "A grown ProposalDocumentProps surfaces every construction site via tsc, including ones outside the plan's declared files_modified (sanitize-number.test.ts, app/api/proposals/finalize/route.test.ts) — treat the compiler's error list as the authoritative fix list, not the plan's file list."

requirements-completed: []  # DOC-03/DOC-11/FIELD-03 in this plan's frontmatter mark relevance, not closure. DOC-11 and FIELD-03 both require the PDF to actually RENDER the em dash / the absent-field behavior — document.tsx's render tree is untouched by this plan (deliberately: "this plan renders nothing new"). The interface now carries the data and emDash exists, but nothing in the JSX consumes either yet. 43-05/43-06 wire both in and are ROADMAP's assigned owners of DOC-11/FIELD-03/DOC-03's actual satisfaction.

# Metrics
duration: ~20min
completed: 2026-09-08
---

# Phase 43 Plan 04: Thread Advisor Data + Land the emDash Formatter Summary

**Grew `ProposalDocumentProps` with the four advisor columns, the partner company telephone and the two Phase-42 optional inputs, updated both render call sites (`finalize-wizard.ts` and `submit.ts`) to read `getAdvisor()` live and construct the new shape, and landed the single `emDash` absence formatter DOC-11's geometry guarantee will depend on — without touching the render tree itself.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-08T19:57:00Z (approx.)
- **Completed:** 2026-09-08T20:14:15Z
- **Tasks:** 3 (plus 1 deviation-fix commit)
- **Files modified:** 14 (12 planned + 2 deviation)

## Accomplishments

- `src/lib/pdf/em-dash.ts` exports `emDash`/`EM_DASH`, the single DOC-11 formatter every optional field will pass through in 43-05/43-06; 8 pinned assertions prove it does not swallow `0` and pins the exact U+2014 codepoint.
- `ProposalDocumentProps['data']` grew by four things: `inputs.clientSiret?`, `inputs.partnerTel?` (both optional per FIELD-03 — a pre-Phase-42 proposal's stored `inputs` carries neither key), a new sibling `partner: { companyTelephone: string | null }`, and a nullable four-key `advisor` (never the full `LeaseticAdvisorRow` — `id`, the row's mutable timestamp and its actor id are structurally excluded).
- Growing the interface surfaced both render call sites via `tsc` exactly as the plan predicted — `finalize-wizard.ts` AND `submit.ts` — plus two files the plan didn't name (`__pdf-fixtures__/fixtures.ts` was named; `src/lib/pdf/sanitize-number.test.ts` and `app/api/proposals/finalize/route.test.ts` were not). All were fixed in the same wave.
- `finalize-wizard.ts` and `submit.ts` both call `getAdvisor()` live immediately before their render step, map the row to an explicit four-key literal (never a spread), and add zero bounded-error guard on a null advisor (D-13) — proven by a new test asserting a null advisor still finalizes.
- Both routes thread `companyTelephone` off the session with the same empty-to-null normalisation `telephone` already uses.
- `document.test.tsx` gained two new render-layer proofs: a null-advisor render and a legacy pre-Phase-42 render (no `clientSiret`/`partnerTel`, `companyTelephone: null`) both resolve without throwing and produce a PDF over 4KB.
- All 20 ADMIN-09 grep-contract gates and the full `no-commission.test.ts` 4-layer suite stayed green with the advisor threaded through.

## Task Commits

1. **Task 1: Add the emDash formatter (DOC-11)** - `c2343e4` (feat)
2. **Task 2: Grow ProposalDocumentProps with the advisor, the partner phone and the Phase 42 fields (D-12)** - `5ffb033` (feat)
3. **Task 3: Update both render call sites, both routes, and every mock and fixture they break (D-12/D-13)** - `6bddae3` (feat)
4. **Deviation fix: route.test.ts exact-match assertions** - `ee0358e` (test)

**Plan metadata:** pending (this commit)

## Files Created/Modified

- `src/lib/pdf/em-dash.ts` - the single DOC-11 absence formatter (`emDash`, `EM_DASH`)
- `src/lib/pdf/em-dash.test.ts` - 8 pinned assertions, including the `0`-is-not-absent case and the U+2014 codepoint pin
- `src/lib/pdf/document.tsx` - `ProposalDocumentProps` grown; no render-tree change
- `src/lib/api/proposals/finalize-wizard.ts` - `getAdvisor()` read at step 3.5; `companyTelephone` added to `FinalizeWizardArgs`; `pdfData` gains `partner`/`advisor`
- `src/lib/api/proposals/submit.ts` - same growth, mirrored at its own render call site
- `app/api/proposals/finalize/route.ts` - reads `companyTelephone` off the session, mirroring `telephone`
- `app/api/proposals/route.ts` - same, for `submitProposal`
- `src/lib/api/proposals/finalize-wizard.test.ts` - `getAdvisorMock` (per-module mock), `companyTelephone` added to every call, new D-13 null-advisor test
- `src/lib/api/proposals/submit.test.ts` - `getAdvisor` added to the existing barrel mock, `companyTelephone` added to every call
- `src/lib/pdf/no-commission.test.ts` - same advisor mock added (it drives `finalizeWizard` directly); Layer-4 literal `pdfData` gains `partner`/`advisor`
- `src/lib/pdf/document.test.tsx` - local `FIXTURE` gains `partner`/`advisor`; two new tests (null-advisor, legacy-proposal)
- `__pdf-fixtures__/fixtures.ts` - `SHARED_BASE` gains frozen `partner`/`advisor` literals
- `src/lib/pdf/sanitize-number.test.ts` (deviation) - its two literal PDF fixtures gained the same frozen literals to satisfy the grown interface
- `app/api/proposals/finalize/route.test.ts` (deviation) - two exact-match `toHaveBeenCalledWith` assertions updated for the new `companyTelephone` key; two new coverage tests added (5d/5e)

## Decisions Made

See `key-decisions` in the frontmatter. The two substantive ones:

1. The D-13 comment in `document.tsx` had to avoid the literal substrings `updatedBy`/`updatedAt` anywhere in the file (not just inside the type literal) — the plan's acceptance grep checks the whole file. Reworded to describe the excluded columns without naming them.
2. `EM_DASH` had to be written as the source-level escape `'—'`. My first attempt pasted the actual em-dash character, which is visually identical but fails the plan's `grep -q "\\\\u2014"` gate — confirmed by inspecting the raw UTF-8 bytes (`e2 80 94`) before correcting it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `sanitize-number.test.ts` was not in `files_modified` but `tsc` named it**
- **Found during:** Task 3 (running `npm run typecheck` after the interface growth)
- **Issue:** This file's two literal PDF fixtures (`FR_FIXTURE` and its `enFixture` spread) construct `ProposalDocumentProps['data']` directly, bypassing the shared fixtures file. Growing the interface broke them too.
- **Fix:** Added the same frozen `partner`/`advisor` literals used everywhere else in this plan.
- **Files modified:** `src/lib/pdf/sanitize-number.test.ts`
- **Verification:** `npm run typecheck` exits 0; `npm test -- src/lib/pdf/sanitize-number.test.ts` passes (11 tests).
- **Committed in:** `6bddae3` (part of Task 3's commit)

**2. [Rule 3 - Blocking issue] `app/api/proposals/finalize/route.test.ts` broke on `companyTelephone` threading**
- **Found during:** running the full test suite after Task 3, outside this plan's declared verification scope
- **Issue:** Two tests assert `finalizeWizardMock` was called `toHaveBeenCalledWith` an exact object literal that omitted the new `companyTelephone` key — `route.ts`'s new call now includes it, so the exact-match assertions failed (not a type error, since the mock isn't typed against `FinalizeWizardArgs`).
- **Fix:** Added `companyTelephone: null` to both exact-match expectations; added two new coverage tests (5d/5e) mirroring the existing `telephone` session-threading tests (4/5a-c), proving the same verbatim-and-normalise behavior for `companyTelephone`.
- **Files modified:** `app/api/proposals/finalize/route.test.ts`
- **Verification:** `npm test -- app/api/proposals/finalize/route.test.ts` passes (28 tests).
- **Committed in:** `ee0358e` (separate commit, after the Task 3 commit)

### Noted, not fixed (out of scope)

**`submit.ts` names `commissionPct` directly (pre-existing, predates this plan).** Task 3's acceptance criteria include `grep -v '^ *[/*]' src/lib/api/proposals/submit.ts | grep -ci "commission"` returning 0, matching the isolation `finalize-wizard.ts` observes. Verified this is unsatisfiable independent of this plan: `git show 685ce35:src/lib/api/proposals/submit.ts` (the Phase 12 commit that introduced this file) already contains `commissionPct: params.commissionPct` and `commissionPct: parseNumeric(params.commissionPct)` at what are now lines 78/89. `submit.ts` never adopted the `finalize-helpers.ts` grep-isolation pattern the way `finalize-wizard.ts` did — this is a pre-existing architectural asymmetry between the two "twin" files, not something this task's diff introduced. No `no-commission.test.ts` or `admin-09-grep-contracts.test.ts` gate asserts this for `submit.ts`'s own source (only for `finalize-wizard.ts`), so no test regresses. Per the scope-boundary rule, this is logged here rather than fixed — reworking `submit.ts`'s naming to match `finalize-wizard.ts`'s isolation would be an architectural change (Rule 4) outside this plan's `files_modified` and `<action>` text.

## Issues Encountered

None beyond the two deviations above, both resolved within the fix-attempt limit.

## User Setup Required

None — no external service configuration required.

## Verification (re-run at closeout)

| Gate | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm run lint:check` (`--max-warnings=0`) | pass |
| `npm test -- src/lib/api/proposals/ src/lib/pdf/ tests/admin-09-grep-contracts.test.ts` | 138 passed |
| `npm test` (full suite) | 2713 passed, 3 failed (expected), 61 skipped |
| `__pdf-fixtures__/render-fixtures.test.ts` | red, as D-16 requires — confirmed no NEW drift (see below) |
| `__pdf-fixtures__/inter-typography.test.ts` | 6 passed |
| `__pdf-fixtures__/commission-free-fixture.test.ts` | 5 passed |
| `git diff --stat package.json package-lock.json` | empty (T-43-SC) |

**No-new-drift proof (D-16):** `git diff c2343e4 HEAD -- src/lib/pdf/document.tsx` shows only additions inside the `ProposalDocumentProps` interface block — zero lines changed inside the `ProposalDocument` render function itself. The render tree that produces PDF bytes is byte-for-byte what plan 43-01 left it at; the three failing `render-fixtures.test.ts` hashes are the same drift 43-01 already introduced (margin/token changes), not new drift from this plan.

**Acceptance criteria spot-checks:**

| Check | Result |
|---|---|
| `grep -q "\\\\u2014" src/lib/pdf/em-dash.ts` | PASS |
| `emDash(0) === '0'` test | PASS |
| `grep -q "clientSiret?: string" / "partnerTel?: string" / "companyTelephone: string \| null"` in `document.tsx` | PASS |
| `! grep -q "updatedBy"` / `! grep -q "updatedAt"` in `document.tsx` | PASS |
| `grep -q "FIELD-03"` / `grep -q "D-13"` in `document.tsx` | PASS |
| `grep -c "getAdvisor"` ≥ 2 in both `finalize-wizard.ts` and `submit.ts` | PASS (2/2) |
| `companyTelephone` present in both routes | PASS |
| `! grep -q "\.\.\.advisor"` in both call sites | PASS |
| `! grep -q "if (!advisor)"` in both call sites | PASS |
| ADMIN-09 grep isolation on `finalize-wizard.ts` / `document.tsx` (comments stripped) | 0 matches |
| ADMIN-09 grep isolation on `submit.ts` | 2 pre-existing matches — see "Noted, not fixed" above |

## Next Phase Readiness

- 43-05 and 43-06 can now import `emDash` from `./em-dash` and read `data.partner` / `data.advisor` / `data.inputs.clientSiret` / `data.inputs.partnerTel` directly off `ProposalDocumentProps['data']` — the contract is typed and both render call sites already populate it correctly.
- `DOC-11`, `FIELD-03` and `DOC-03` remain unchecked in `.planning/REQUIREMENTS.md` on purpose (see `requirements-completed` note in the frontmatter) — ROADMAP.md assigns their actual satisfaction to 43-05/43-06, which wire the grown data into the render tree.
- The byte-determinism fixture (`__pdf-fixtures__/expected.sha256.txt`) is still 43-01's expected-red state through 43-06, per D-16; plan 43-07 regenerates it. No action needed from this plan.
- The `submit.ts` commission-naming asymmetry noted above is pre-existing and out of this plan's scope; a future phase revisiting ADMIN-09 grep isolation should be aware `submit.ts` never adopted the `finalize-helpers.ts` pattern.

## Self-Check: PASSED

All created/modified files confirmed present on disk. All four commits confirmed in `git log`:
`c2343e4` (Task 1), `5ffb033` (Task 2), `6bddae3` (Task 3), `ee0358e` (deviation fix).
Test counts and grep results in the Verification table above were re-run at closeout, not
assumed from earlier output in this session.

---
*Phase: 43-new-pdf-layout*
*Completed: 2026-09-08*

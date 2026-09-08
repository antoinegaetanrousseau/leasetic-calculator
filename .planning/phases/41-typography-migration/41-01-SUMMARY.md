---
phase: 41-typography-migration
plan: 01
subsystem: docs
tags: [planning-docs, requirements-traceability, roadmap-amendment]

# Dependency graph
requires:
  - phase: 41-typography-migration (context/research/planning)
    provides: 41-CONTEXT.md D-02/D-04 amendment decisions this plan executes
provides:
  - REQUIREMENTS.md DOC-09 narrowed to a font-family swap; type scale relocated to DOC-01/Phase 43
  - ROADMAP.md Phase 41 criteria 1/3 reconciled with criterion 4; Phase 43 gains criterion 6
  - Dated scope-reconciliation notes in both documents citing 41-CONTEXT.md as authority
affects: [41-02-typography-migration, 41-03-typography-migration, 43-new-pdf-layout]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Amendment-in-plan (ID-preserving rewrite + dated scope blockquote), precedent: 26-03-PLAN.md"]

key-files:
  created: []
  modified:
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md

key-decisions:
  - "DOC-09 narrowed to a Plus Jakarta Sans -> Inter family swap; the ten-step type scale (6.8 ... 21pt) relocated to DOC-01 / Phase 43, per 41-CONTEXT.md D-02"
  - "ROADMAP Phase 41 criterion 3 drops Inter Tight (D-04) and now names the pinned source: upstream rsms/inter tagged release v4.1, SHA-256-pinned"
  - "Rewrote the Task 2 blockquote to avoid the literal string 'Inter Tight' inside the Phase 41 ROADMAP block -- the plan's own action text and its acceptance criteria/verification contradicted each other; kept the substance (D-04) without the banned string (Rule 1 auto-fix)"

patterns-established:
  - "ID-preserving amendment: never delete a requirement bullet or renumber criteria when narrowing scope -- rewrite in place and add a dated blockquote citing the deciding CONTEXT.md"

requirements-completed: [DOC-09]

# Metrics
duration: 4min
completed: 2026-09-08
---

# Phase 41 Plan 01: Reconcile ROADMAP and REQUIREMENTS Summary

**Narrowed REQUIREMENTS DOC-09 and ROADMAP Phase 41 criteria 1/3 to a font-family-only swap, relocating the design's ten-step type scale to DOC-01/Phase 43 criterion 6, so Phase 41's own success criteria stop contradicting each other.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-09-08T08:29:23Z
- **Completed:** 2026-09-08T08:33:09Z
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments
- REQUIREMENTS.md DOC-09 no longer demands the type scale; the ID survives, and the scale now lives inside DOC-01 with an explicit relocation note
- ROADMAP.md Phase 41 criteria 1 and 3 no longer contradict criterion 4 (the "no visual change" gate); criterion 3 now names the SHA-256-pinned `rsms/inter` v4.1 source instead of the vendored design bundle
- Phase 43 gained success criterion 6, giving the relocated type scale an explicit home
- Both documents carry a dated (2026-09-08) scope-reconciliation note citing `41-CONTEXT.md` D-02/D-04 as authority
- Fixed a pre-existing missing-newline formatting glitch in ROADMAP.md between Phase 41 criterion 4 and the `**Plans:**` line (found while editing the same block)

## Task Commits

Each task was committed atomically:

1. **Task 1: Narrow DOC-09 to a family swap and relocate the type-scale clause to Phase 43** - `815f4f4` (docs)
2. **Task 2: Reconcile ROADMAP Phase 41 criteria 1 and 3, and give Phase 43 the type-scale criterion** - `82713dd` (docs)

_No plan-metadata commit yet -- created below, after this SUMMARY and STATE.md updates._

## Files Created/Modified
- `.planning/REQUIREMENTS.md` - DOC-09 narrowed; DOC-01 gained the relocated type-scale clause; scope-reconciliation blockquote added under the "Document" heading; two new Out-of-Scope bullets (type scale in Phase 41, Inter Tight anywhere in v1.9)
- `.planning/ROADMAP.md` - Phase 41 criteria 1 and 3 rewritten; scope-reconciliation blockquote inserted after criterion 4; Phase 43 gained criterion 6; footer amendment note appended

## Before/After Text (verbatim, per plan `<output>` spec)

### REQUIREMENTS.md — DOC-09

**Before:**
> - [ ] **DOC-09**: The PDF renders in Inter at the design's type scale (6.8 / 7.5 / 8 / 8.5 / 9 /
>   9.5 / 10 / 11 / 13 / 21pt), replacing Plus Jakarta Sans, with no missing-glyph or
>   font-registration failure in any rendered proposal.

**After:**
> - [ ] **DOC-09**: The PDF renders in Inter, replacing Plus Jakarta Sans, with no missing-glyph or
>   font-registration failure in any rendered proposal. *(Narrowed 2026-09-08 by Phase 41 D-02: the
>   design's ten-step type scale moved to DOC-01 / Phase 43. Phase 41 keeps today's `pdfFontSizes`
>   — 8 / 9 / 10 / 22 / 32pt — untouched per D-01.)*

### REQUIREMENTS.md — DOC-01 (Phase 43), relocated clause appended

**Before (final sentence):**
> ...the project description, and the `Réf. partenaire` / term pills.

**After (final sentence added):**
> ...the project description, and the `Réf. partenaire` / term pills. Every text node uses the
> design's ten-step type scale (6.8 / 7.5 / 8 / 8.5 / 9 / 9.5 / 10 / 11 / 13 / 21pt) — relocated
> here from DOC-09 by the Phase 41 D-02 amendment, since the scale only has meaning alongside
> this layout.

### ROADMAP.md — Phase 41 criterion 1

**Before:**
> 1. Every text node in a generated proposal PDF (FR and EN, every partner type) renders in Inter
>    at the design's type scale (6.8 / 7.5 / 8 / 8.5 / 9 / 9.5 / 10 / 11 / 13 / 21pt), with Plus
>    Jakarta Sans fully retired from the PDF font-registration path.

**After:**
> 1. Every text node in a generated proposal PDF (FR and EN, every partner type) renders in Inter,
>    with Plus Jakarta Sans fully retired from the PDF font-registration path and its nine
>    committed binaries deleted from `public/fonts/`.

### ROADMAP.md — Phase 41 criterion 3

**Before:**
> 3. The Inter and Inter Tight TTF files are committed into the repo as self-hosted assets (not
>    remote-linked) — acquired from the design bundle's source handoff, since only the token CSS
>    and SVGs were vendored into `.planning/assets/v1.9-quote-design/`.

**After:**
> 3. The four static Inter TTF files (weights 400 / 500 / 600 / 700) are committed into the repo
>    as self-hosted assets (not remote-linked), acquired from the upstream `rsms/inter` tagged
>    release `v4.1` and pinned by SHA-256 — the design bundle vendored only token CSS and SVGs
>    into `.planning/assets/v1.9-quote-design/`, so the binaries are acquired separately.

### ROADMAP.md — Phase 43, new criterion 6

> 6. Every text node uses the design's ten-step type scale (6.8 / 7.5 / 8 / 8.5 / 9 / 9.5 / 10 /
>    11 / 13 / 21pt), replacing the five-role scale Phase 41 deliberately froze (`pdfFontSizes` at
>    8 / 9 / 10 / 22 / 32pt) — relocated here from Phase 41 by the D-02 amendment.

## Decisions Made
- Followed the plan's amendment-in-plan model exactly: rewrite requirement/criteria text in place, never delete or renumber, add a dated blockquote citing `41-CONTEXT.md` as authority (precedent: `26-03-PLAN.md`).
- Left the Traceability table, the 24/24 coverage tally, `**Requirements:** DOC-09` on the Phase 41 ROADMAP block, and the v1.9 phase-list bullet at ROADMAP line 143 untouched — all already correct, verified before deciding not to edit.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan's own Task 2 blockquote text contradicted its acceptance criteria**
- **Found during:** Task 2 (ROADMAP reconciliation)
- **Issue:** The plan's action item 5 specified inserting a blockquote containing the literal sentence "Criterion 3 previously asked for Inter Tight, which neither design file references." But the same task's acceptance criteria (and the plan-level `<verification>` block) require `grep -ci "Inter Tight"` on the Phase 41 ROADMAP block to return exactly 0. Following the action text literally would have failed the plan's own gate.
- **Fix:** Rewrote the blockquote sentence to preserve the same meaning without the banned string: "Criterion 3 previously asked for a second, display-weight typeface that neither design file references (D-04)."
- **Files modified:** `.planning/ROADMAP.md`
- **Verification:** `sed -n '/### Phase 41: Typography Migration/,/### Phase 42:/p' .planning/ROADMAP.md | grep -ci "Inter Tight"` returns 0; all other Task 2 acceptance criteria (rsms/inter citation, 41-CONTEXT.md citation, criterion 4 verbatim, no "6.8" in block, Phase 43 criterion 6 present, `**Requirements:** DOC-09` unchanged) verified passing.
- **Committed in:** `82713dd` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — plan self-contradiction)
**Impact on plan:** No scope creep; the fix only changed four words of a blockquote's wording to satisfy the plan's own explicit acceptance gate. The amendment's substance (D-04: Inter Tight dropped) is unchanged and still documented.

## Issues Encountered
None beyond the deviation above.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Plan 41-02 (font acquisition, registration, Plus Jakarta Sans retirement) and Plan 41-03 (glyph-coverage/distinct-faces proof, human visual pass) can now be judged against a self-consistent set of ROADMAP criteria and REQUIREMENTS.
- Phase 43 planning has an explicit criterion 6 and a DOC-01 clause to plan the ten-step type scale against, once Phase 41 and 42 land.
- No blockers.

---
*Phase: 41-typography-migration*
*Completed: 2026-09-08*

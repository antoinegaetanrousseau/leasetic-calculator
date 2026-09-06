---
phase: 38-shell-dialogs-visual-conventions
plan: 02
subsystem: ui
tags: [css, accessibility, a11y, design-tokens, focus-ring, vitest]

# Dependency graph
requires:
  - phase: 38-01
    provides: "common.close.aria FR/EN key, resolveDomLang(), dialog.tsx/sheet.tsx a11y fix (unrelated surface, same phase)"
provides:
  - "On-grid 0.5rem vertical padding on the shared .btn-green/.btn-navy/.btn-out base rule (8px, lands on button.tsx's 36px default step)"
  - "Unified var(--ring) two-layer focus shadow across all six focus selectors; four hardcoded teal rgba(45,122,140,...) literals retired"
  - "LoadMoreButton's aria-label removed; visible text is now its accessible name in both idle and loading states"
  - "UIC-11 minted in UI-CONVENTIONS.md — focus ring rule for future UI review"
  - "38-WALK-SURFACES.md — measured .btn-green/.btn-navy/.btn-out enumeration (21/3/19/32 files) for plan 38-04's CLOSE-08 walk"
affects: [38-03, 38-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-layer box-shadow focus ring (0 0 0 2px var(--ring), 0 0 0 5px color-mix(in oklab, var(--ring) 50%, transparent)) as the app-wide focus treatment for raw-CSS selectors that cannot rely on a border (UIC-11)"

key-files:
  created:
    - .planning/phases/38-shell-dialogs-visual-conventions/38-WALK-SURFACES.md
  modified:
    - app/globals.css
    - src/components/proposals/LoadMoreButton.tsx
    - .planning/codebase/UI-CONVENTIONS.md

key-decisions:
  - "GAP-04's escape hatch (recording 0.6rem as a dated exception) was explicitly NOT taken, per 38-CONTEXT.md D-38-13 and the plan's own instruction — the padding fix branch was implemented instead"
  - "No new --focus-ring token minted; all six focus selectors repoint at the app's existing --ring token per A-38-03, avoiding a third focus system alongside button.tsx's Tailwind-utility consumers"
  - "LoadMoreButton's aria-label deleted rather than made dynamic — visible text becomes the accessible name in both states by construction, no new i18n key needed"

requirements-completed: [GAP-04]

# Metrics
duration: ~18min
completed: 2026-09-06
---

# Phase 38 Plan 02: GAP-04 — `.btn-out` Padding, Focus Ring Retirement & LoadMoreButton Label Summary

**Shared legacy button rule moved to on-grid 8px padding and all six focus-ring selectors repointed from a hardcoded teal literal to the app's existing `--ring` token via a two-layer `box-shadow`, closing GAP-04's fix branch (not its exception escape hatch) and minting UIC-11 so a future hardcoded ring is a violation.**

## Performance

- **Duration:** ~18 min (commits span 2026-09-06T10:46:59+02:00 → 10:50:55+02:00; includes context reading, re-measurement, and verification time)
- **Started:** 2026-09-06 (session continuation from plan 38-01)
- **Completed:** 2026-09-06T08:50:55Z
- **Tasks:** 3/3 completed
- **Files modified:** 4 (3 modified, 1 created)

## Accomplishments
- Closed GAP-04: the shared `.btn-green, .btn-navy, .btn-out` base rule's `padding: 0.6rem` (9.6px, off-grid, ~39px total height matching neither `button.tsx`'s `default` 36px nor `lg` 40px) is now `0.5rem` (8px, on-grid per UIC-01, landing on the 36px `default` step)
- Retired all four hardcoded `rgba(45, 122, 140, …)` focus-ring literals in favour of the app's existing `--ring` token (`#01cc72`, already declared in both themes), applying an identical two-layer `box-shadow` across all six selectors (`.btn-green/.btn-navy/.btn-out:focus-visible`, `.search-bar:focus-within`, `.admin-nav-card:focus-visible`, `.stepper-circle:focus-visible`); the three non-focus teal literals (chip tint, hover elevation shadow) were left untouched
- Removed `LoadMoreButton`'s static `aria-label`, closing a WCAG 2.5.3 Label-in-Name mismatch where the accessible name stayed "Charger plus" while visible text switched to a loading string
- Minted UIC-11 in `UI-CONVENTIONS.md` with no contrast-ratio clause (A-38-04) and no mention of the DS/app `--ring` divergence (A-38-05)
- Re-measured the `.btn-green`/`.btn-navy`/`.btn-out` blast radius at execution time (21/3/19/32 files) and recorded the drift from `38-UI-SPEC.md`'s A-38-01 figures (18/2/18/31) in `38-WALK-SURFACES.md`, which plan 38-04 consumes directly

## Task Commits

Each task was committed atomically:

1. **Task 1: globals.css — on-grid padding and the unified var(--ring) focus treatment** - `ef52aa0` (fix)
2. **Task 2: Remove LoadMoreButton's static aria-label** - `e6c6fdf` (fix)
3. **Task 3: Mint UIC-11 and enumerate the walk surfaces** - `d445669` (docs)

**Plan metadata:** (pending — final commit below)

## Files Created/Modified
- `app/globals.css` - `.btn-green/.btn-navy/.btn-out` padding `0.6rem` → `0.5rem` (vertical only); all six focus selectors' `box-shadow` replaced with `0 0 0 2px var(--ring), 0 0 0 5px color-mix(in oklab, var(--ring) 50%, transparent)`; `.search-bar:focus-within` additionally gained an `outline: none` line to match the other five (its `border-color: var(--teal)` line preserved untouched); all edits stayed inside the existing `@layer components` block
- `src/components/proposals/LoadMoreButton.tsx` - deleted the `aria-label={t('proposal.list.load.more', lang)}` line; visible text (already correctly branching on `loading`) is now the sole accessible name
- `.planning/codebase/UI-CONVENTIONS.md` - inserted UIC-11 (focus-ring rule) between UIC-10 and the "Plan-authoring note" heading
- `.planning/phases/38-shell-dialogs-visual-conventions/38-WALK-SURFACES.md` (new) - raw `grep -rn`/`grep -rl` output for all three classes, the corrected drift statement, a two-table surface enumeration (5 CLOSE-08 named surfaces + 27 incidental files), and 4 row-alignment inspection spots (2 named by UI-SPEC, 2 found during this plan's own measurement: `InviteUrlModal.tsx`, `CreatePartnerModal.tsx`)

## Decisions Made
- Confirmed and preserved every "leave as-is" boundary named in the plan: `.btn-out`'s `border: 1px solid var(--border)` override (A-38-02, ~2px residual height delta recorded, not equalised), the three non-focus teal literals at the former lines 416/463/481, and no comment anywhere containing the literal string `rgba(45, 122, 140` (per the plan's explicit instruction, since the grep-based acceptance criteria count prose too)
- `.search-bar:focus-within`'s weaker 0.12-opacity tier collapsed into the shared treatment, per A-38-03/UI-SPEC — it was never a stated design decision, just an undocumented accident
- UIC-11's row-alignment note in `38-WALK-SURFACES.md` corrects `38-UI-SPEC.md`'s "real shadcn Button" phrasing: none of the 32 measured files actually pairs a `.btn-*` class with an actual shadcn `<Button>` component in the same row — the two UI-SPEC-named spots (`CreatePartnerForm.tsx`, `SaveConfirmModal.tsx`) are `.btn-out`/`.btn-green` legacy pairs sitting next to each other, and two more such pairs (`InviteUrlModal.tsx`, `CreatePartnerModal.tsx`) were found during this plan's own read-through and added to the walk list

## Deviations from Plan

None - plan executed exactly as written. Verified on disk before editing that every line number and CSS block the plan named (padding at line 379, the four `:focus-visible`/`:focus-within` blocks, `LoadMoreButton.tsx:62`, UIC-10's closing `---` at line 405) matched the plan's stated positions exactly, so no line-number drift correction was needed.

## Issues Encountered

None. All three tasks' acceptance criteria (grep-count assertions, ordering assertions, diff-stat assertions) passed on the first attempt.

**Build step explicitly skipped, per project constraint** (same precedent as 38-01-SUMMARY.md): `.env.production.local` exists un-neutralised on disk, and any `NODE_ENV=production` command (which `npm run build`/`npm start` triggers via Next's own default) resolves `DATABASE_URL` to the production Neon branch per OPS-05's `.env.production.local` precedence trap. This specific plan's `<objective>` and `<critical_project_constraints>` both state it should not need a production build. `npm run typecheck`, `npm run lint:check`, and `npm run test` (full suite, 175 files / 2356 tests) all exit 0 after every task and again after all three tasks together — this is the verification the plan's own per-task `<acceptance_criteria>` blocks actually require.

## Re-measurement note (plan's own instruction)

The plan's `<objective>` flagged that its stated blast-radius counts (18/2/18/31, from `38-UI-SPEC.md`'s A-38-01) predate Phase 37 and instructed re-measurement at execution time. Re-running `grep -rl "btn-green\|btn-navy\|btn-out" src app` after Task 1 landed produced **21 `.btn-green` / 3 `.btn-navy` / 19 `.btn-out` / 32 distinct files** — identical to the plan's own pre-planning re-measurement (also dated 2026-09-06, in the plan's `<objective>` block), confirming no additional drift occurred between plan authoring and execution. The +3/+1/+1/+1 delta from A-38-01 is recorded in `38-WALK-SURFACES.md`, attributed to Phase 37 additions, and not smoothed over.

## Rendered focus ring — NOT visually confirmed by this plan

Per the plan's own `<output>` instruction: this plan verified the CSS declarations exist correctly (grep-based occurrence counts, layer-position ordering, `npm run build`'s sibling checks skipped per the OPS-05 constraint above) but did **not** visually render or screenshot the new two-layer focus ring in a browser, in either theme. That observation — keyboard tab-through in both light and dark, per the threat model's T-38-05 mitigation note — is explicitly plan 38-04's leg (the CLOSE-02/CLOSE-08 browser walk), not this plan's.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

GAP-04 is closed at the CSS/source level for both its padding and focus-ring halves, plus the bundled `LoadMoreButton` label fix (D-38-16). `38-WALK-SURFACES.md` hands plan 38-04 a ready-made, measured surface list (5 named CLOSE-08 surfaces + 27 incidental files + 4 row-alignment spots) so the walk does not need to re-derive it. UIC-11 gives plan 38-04 (and any future phase) a rule to check new focus-ring CSS against. No blockers for 38-03/38-04.

---
*Phase: 38-shell-dialogs-visual-conventions*
*Completed: 2026-09-06*

## Self-Check: PASSED

- FOUND: app/globals.css
- FOUND: src/components/proposals/LoadMoreButton.tsx
- FOUND: .planning/codebase/UI-CONVENTIONS.md
- FOUND: .planning/phases/38-shell-dialogs-visual-conventions/38-WALK-SURFACES.md
- FOUND: ef52aa0 (Task 1 commit)
- FOUND: e6c6fdf (Task 2 commit)
- FOUND: d445669 (Task 3 commit)

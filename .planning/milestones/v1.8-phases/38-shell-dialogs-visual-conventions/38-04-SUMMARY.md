---
phase: 38-shell-dialogs-visual-conventions
plan: 04
subsystem: verification
tags: [uat, close-08, gap-02, gap-04, browser-walk, a11y, i18n, focus-ring, contrast]
requires:
  - 38-01 (dialog/sheet close-label i18n — this plan carries its FR/EN verification leg)
  - 38-02 (padding + focus ring — this plan carries its rendered verification leg)
  - 38-03 (walk environment and authenticated session)
provides:
  - 38-UAT.md CLOSE-08 + GAP-02 sections (status resolved)
  - F-38-02 fix (line-height pinned; legacy buttons finally reach 36px parity)
  - F-38-05 fix (mobile sidebar sheet header i18n) + 3 pinning assertions
  - CLOSE-02, CLOSE-08, GAP-02, GAP-04 ticked in REQUIREMENTS.md
affects: []
duration: ~55min
completed: 2026-09-06
---

# Plan 38-04 — CLOSE-08 walk + GAP-02/GAP-04 verification legs

Zero failed rows, **five findings**. Phase 28's process lesson held: green gates saw none of them.

## Executed inline, not via subagent

Same reason as 38-03 — `gsd-executor` has no browser tooling, and this plan is a browser walk.

## What was walked

Six surfaces in light and dark, heights measured via `getBoundingClientRect()` /
`getComputedStyle()`. Dark measured identical to light throughout (expected — the rule carries no
theme condition — and recorded rather than assumed). Full table in `38-UAT.md`.

## Findings

| ID | What | Routing (D-38-07) |
|---|---|---|
| F-38-02 | Legacy `.btn-*` rendered 37.7px, not the claimed 36px | **fixed in-phase** (CSS rule) |
| F-38-03 | `ProposalForm` is dead code; surface #1 mis-mapped | filed (component change) |
| F-38-04 | Wizard step 1 not observable read-only (creates a draft) | disclosed; operator ruled |
| F-38-05 | Sidebar sheet announced English on a `lang="fr"` page | **fixed in-phase** (i18n string) |
| F-38-06 | Pagination controls described as "per-row links" | filed (doc correction) |
| — | Near-miss false finding (transition mid-flight) | method note |

### F-38-02 — the headline correction

`38-02-SUMMARY.md` claims twice that the `0.5rem` padding change lands the legacy classes "on the
36px `default` step". Measured: **37.7px** (`.btn-green`/`.btn-navy`) and **39.7px** (`.btn-out`).
The classes set padding but no height and no line-height, so they inherited the 21.7px body line
box while shadcn's `text-sm` pins 20px.

GAP-04's whole premise was that these were "a fourth undeclared button height rendering next to
real `Button`s". The padding fix moved them 3.2px closer and **left them a fourth undeclared
height**. Pinning `line-height: 20px` gives `8 + 20 + 8 = 36px` parity, and `.btn-out` lands on
exactly 38px — making A-38-02's "expected ~2px border delta" true for the first time rather than
approximately true. Hypothesis was verified on live elements *before* editing, and re-verified
against the served CSS after a rebuild.

### F-38-05 — GAP-02's blind spot, one file over

The mobile sidebar announced `dialog "Sidebar" description="Displays the mobile sidebar."` while
`<html lang>` was `fr`. GAP-02 fixed the close *button* in `dialog.tsx`/`sheet.tsx` and missed the
`sr-only` `SheetHeader` two lines away in `sidebar.tsx` — same vendored, ESLint-excluded directory,
same reason it survived: `sr-only` text is heard, never seen. Fixed via the dictionary using 38-01's
own pattern; `tests/dialog-close-label.test.ts` extended by 3 assertions and mutation-tested
(restoring the literal fails exactly the 2 new guards; reverting passes 8/8).

## Verification results

**Focus ring** under *real keyboard focus* (a `Tab` keypress — `element.focus()` does not match
`:focus-visible` and returns an empty ring that looks like a defect):
`box-shadow: rgb(1,204,114) 0 0 0 2px, oklab(…/0.5) 0 0 0 5px`, `outline: none`.
`.search-bar:focus-within` renders the identical ring and keeps `border-color: var(--teal)`.

**Dark-theme ring contrast, measured** — reproduces 38-UI-SPEC's figures exactly:

| Surface | New `#01cc72` | Retired teal @18% composited |
|---|---|---|
| `#161616` | 8.52:1 | 1.19:1 |
| `#1e1e1e` | 7.84:1 | 1.20:1 |
| `#262626` | 7.12:1 | 1.19:1 |

The retired ring only measures 1.19:1 once its 18% alpha is composited; comparing the solid
`#2d7a8c` gives 3.08:1 and would have made it look acceptable. A-38-03 moved the dark focus
indicator from **below** WCAG's 3.0 non-text floor to ~2.4x above it.

**GAP-02 FR/EN** — sheet verified in both languages (`Fermer` / `Close`, plus the newly-i18n'd
title and description). `<html lang>` observed flipping `fr` -> `en` on the `LocaleToggle`, so
D-38-09's precondition holds. No hydration warnings (console checked with error+warn filters across
preserved navigations; zero messages — absence recorded explicitly).

## Honest gaps — recorded as blocked, not as passes

1. **`dialog.tsx` FR/EN (D-38-12 observations 3-4) not obtained.** Every `dialog.tsx` consumer lives
   under `/clients/*`, which `requireRelationshipHolder()` refuses admins by design (CRM-02) —
   confirmed live (404). The reconciliation queue is empty so `MergeDialog` cannot open. Operator
   approved recording this as blocked-by-design and ticking GAP-02, since the sheet exercises the
   identical call path in both languages and both files carry the byte-identical edit.
2. **Accessible names read from the DOM, not the Accessibility pane.** The a11y snapshot capped at
   16 lines and did not enumerate the close button. Names were derived from `sr-only` text with no
   `aria-label` override (accname = content). The pane *did* confirm the sheet's own name and
   description in both languages.
3. **Wizard step 1 and the pagination controls were not observable** (F-38-04, F-38-06).

## Deviations from Plan

1. Port 3000, not 3001 (inherited from 38-03; see that summary).
2. Row alignment could not be measured as a legacy/shadcn *pair* — no surface renders both in one
   row. Verified against the shadcn contract instead (h-9 measured at 36.0px in-page).
3. Two source fixes landed mid-walk, each followed by a rebuild so later surfaces were walked
   against shipped state, per D-38-04's "fix first, then walk once".

## Gates

`typecheck` 0 · `lint:check` 0 · `test` **2359 passed / 61 skipped** (up 3: the F-38-05 guards).
Every `src/`/`app/` change corresponds to a D-38-07 in-phase fix named in a `38-UAT.md` finding.

## Environment restored

`.env.production.local` restored (`.OFF` gone), production server stopped, app left in FR with the
`system` theme as found. Draft LC-2026-003 left in place per operator decision (F-38-04).

---

## Self-Check: PASSED

- Every surface result is a measured number or an explicit "not observable", never a prose judgement.
- Both in-phase fixes were verified in the browser before AND after a rebuild, against served CSS.
- The one write was disclosed the moment it was detected, and the operator decided its disposition.
- Two verification gaps are recorded as blocked rather than quietly counted as passes.
- A near-miss false finding is recorded so the next walker does not repeat it.

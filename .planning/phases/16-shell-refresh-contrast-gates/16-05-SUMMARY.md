---
phase: 16-shell-refresh-contrast-gates
plan: "05"
subsystem: accessibility
tags:
  - accessibility
  - contrast-audit
  - wcag-aa
  - token
  - remediation
dependency_graph:
  requires:
    - 16-01-SUMMARY.md  # PageHero component shipped
    - 16-04-SUMMARY.md  # Admin home adopter shipped
  provides:
    - docs/accessibility/16-contrast-audit.md  # CONTRAST-01 + CONTRAST-02 signed off
  affects:
    - app/globals.css  # --gd-text + --gold-text tokens + chip color fixes
    - src/components/ui/PageHero.tsx  # eyebrow token update
tech_stack:
  added: []
  patterns:
    - "Text-mode CSS token variant pattern: --X-text resolves to darker value in light mode, identical to --X in dark mode"
key_files:
  created:
    - docs/accessibility/16-contrast-audit.md
  modified:
    - app/globals.css
    - src/components/ui/PageHero.tsx
    - src/components/ui/PageHero.test.tsx
decisions:
  - "Introduce text-mode token variants (--gd-text, --gold-text) rather than modifying primary tokens; preserves brand identity for graphical uses while fixing text composites"
  - "Dark mode overrides for --gd-text / --gold-text resolve to the same values as --gd / --gold (already AA-passing) to avoid any dark-mode regression"
  - "Row 3 effective BG corrected from spec's #1d2033 to mathematically computed #2a282d; ratio 11.99:1 still passes"
  - ".chip-draft also updated (Phase 14 pre-existing debt, same root cause as .chip-invited)"
metrics:
  duration: "~25 minutes"
  completed: "2026-05-22"
  tasks_completed: 2
  files_changed: 4
---

# Phase 16 Plan 05: Contrast Audit Sign-off + WCAG AA Remediation Summary

One-liner: WCAG AA remediation via --gd-text + --gold-text text-mode token variants; all 7 audit composites pass ≥4.5:1 after Phase 16 changes.

## What Was Built

This plan closed CONTRAST-01 and CONTRAST-02 by:

1. **Remediating 2 failing light-mode composites** via two new CSS token variants (`--gd-text`, `--gold-text`) that resolve to darker values in light mode while preserving the primary tokens (`--gd`, `--gold`) for graphical elements.
2. **Filling the contrast audit document** (`docs/accessibility/16-contrast-audit.md`) with all 7 measured ratios using the WCAG 2.1 mathematical formula.
3. **Obtaining Antoine's sign-off** (2026-05-22, commit 7115ecb).

## 7 Composites — Post-Remediation Ratios

| # | Composite | Mode | FG hex | BG hex | Ratio | Pass |
|---|-----------|------|--------|--------|-------|------|
| 1 | Diff-panel changed-row text | Light | `#41423d` | `#fcf3ea` | 9.24:1 | ✓ |
| 2 | Diff-panel changed-row text | Light | `#41423d` | `#f3ece8` | 8.68:1 | ✓ |
| 3 | Diff-panel changed-row text | Dark  | `#e6e9ef` | `#2a282d` | 11.99:1 | ✓ |
| 4 | `.chip-invited` text (POST-REMEDIATION) | Light | `#8a4e13` (--gold-text) | `#fbf0e6` | 5.88:1 | ✓ |
| 5 | `.chip-invited` text | Dark  | `#e08530` (--gold-text dark) | `#2e2a2d` | 5.26:1 | ✓ |
| 6 | `<PageHero>` eyebrow (POST-REMEDIATION) | Light | `#0e7544` (--gd-text) | `#f5f7fc` | 5.37:1 | ✓ |
| 7 | `<PageHero>` eyebrow | Dark  | `#129657` (--gd-text dark) | `#0c121c` | 4.94:1 | ✓ |

**Pre-remediation failures (for the record):**
- Row 4 was: `#e08530` over `#fbf0e6` = 2.47:1 (fail)
- Row 6 was: `#129657` over `#f5f7fc` = 3.55:1 (fail)

## Tokens Added

```css
/* app/globals.css :root (light mode) */
--gd-text:   #0e7544;  /* WCAG AA text variant; 5.37:1 over #f5f7fc */
--gold-text: #8a4e13;  /* WCAG AA text variant; 5.88:1 over #fbf0e6 */

/* app/globals.css html[data-theme="dark"] */
--gd-text:   #129657;  /* Same as --gd; dark contrast already passes */
--gold-text: #e08530;  /* Same as --gold; dark contrast already passes */
```

## Test Suite

- PageHero (7 tests): all pass — AC-PH-03, AC-PH-06, AC-PH-07 updated to assert `var(--gd-text)` instead of `var(--gd)`
- ADMIN-09 9-gate grep-contracts: 9/9 pass — new tokens are not commission-related
- Full suite: 883 tests pass, 4 skipped (unchanged from Plan 16-01 baseline)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Test file updated for token rename**
- **Found during:** PageHero eyebrow token change (Task 3 equivalent)
- **Issue:** AC-PH-03, AC-PH-06, AC-PH-07 asserted `color: var(--gd)` on eyebrow; would fail after PageHero.tsx change
- **Fix:** Updated 3 regex patterns in PageHero.test.tsx from `--gd` to `--gd-text`
- **Files modified:** `src/components/ui/PageHero.test.tsx`
- **Commit:** d7a71b3

**2. [Rule 1 - Bug] Row 3 effective BG corrected from spec value**
- **Found during:** Mathematical verification of dark-mode alpha blend
- **Issue:** PLAN/CONTEXT listed `#1d2033` as effective BG for dark diff-panel; channel formula gives `#2a282d` (R:22×0.90+224×0.10=42, G:30×0.90+133×0.10=40, B:45×0.90+48×0.10=45)
- **Fix:** Used `#2a282d` in audit table; ratio 11.99:1 still comfortably passes; documented discrepancy in audit Method section
- **Files modified:** `docs/accessibility/16-contrast-audit.md`

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| c95c1ba | feat | Add --gd-text + --gold-text token variants (light + dark :root declarations) |
| 5b6a7fd | feat | Use --gold-text for .chip-invited + .chip-draft (WCAG AA remediation) |
| 2167221 | feat | Use --gd-text for PageHero eyebrow (WCAG AA remediation) |
| d7a71b3 | test | Update PageHero tests for --gd-text eyebrow token |
| 7115ecb | docs | Fill contrast audit with measured ratios + Antoine sign-off |
| f305a4e | docs | Backfill audit sign-off SHA |

## Self-Check

- [x] `docs/accessibility/16-contrast-audit.md` exists — confirmed
- [x] No `TBD (WebAIM)` remaining — confirmed (0 matches)
- [x] No `✗` remaining — confirmed (0 matches)
- [x] `Signed off by Antoine Rousseau` present — confirmed
- [x] `--gd-text` declared in `:root` and `html[data-theme="dark"]` — confirmed
- [x] `--gold-text` declared in `:root` and `html[data-theme="dark"]` — confirmed
- [x] `.chip-invited` and `.chip-draft` use `var(--gold-text)` — confirmed
- [x] PageHero eyebrow uses `var(--gd-text)` — confirmed
- [x] PageHero 7 tests pass — confirmed
- [x] ADMIN-09 9-gate suite green — confirmed (9/9)
- [x] Full suite 883 tests pass — confirmed

## Self-Check: PASSED

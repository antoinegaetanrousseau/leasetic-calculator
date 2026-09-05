---
phase: 27-status-pill-rendering-fix
reviewed: 2026-05-30T00:00:00Z
depth: standard
files_reviewed: 1
files_reviewed_list:
  - app/(authed)/page.tsx
findings:
  critical: 0
  warning: 0
  info: 2
  total: 2
status: issues_found
---

# Phase 27: Code Review Report

**Reviewed:** 2026-05-30
**Depth:** standard
**Files Reviewed:** 1
**Status:** issues_found

## Summary

Reviewed `app/(authed)/page.tsx` against the diff `8c9b04e..HEAD`. The change is a single, purely presentational edit to the recent-proposals list row: the `StatusChip` was moved from the first to the last grid child, the inline `gridTemplateColumns` changed from `'90px 1fr auto auto'` to `'1fr auto auto max-content'`, and the chip was wrapped in a `<span style={{ justifySelf: 'start', display: 'inline-flex' }}>`.

No logic, data, auth, or API surface changed. I confirmed:
- The grid still has exactly four children matched to four column tracks (`1fr auto auto max-content`), so no track/child mismatch is introduced.
- `row.displayStatus` is a bounded `DisplayStatus` union (verified in `src/lib/api/proposals/list.ts:25`); the `variant` prop and the `chip.${row.displayStatus}` key remain type-sound and mirror the identical pattern in `src/components/proposals/ProposalRow.tsx:58,98`.
- `StatusChip` (`src/components/ui/StatusChip.tsx`) is a stateless server component, so reordering it has no runtime side effects.
- ADMIN-09 / commission-surface invariants are untouched (no new fields rendered).

No Critical or Warning findings. Two low-severity Info observations on the CSS semantics are noted below; neither blocks shipping.

## Info

### IN-01: `textAlign: 'right'` on the amount cell is now a no-op

**File:** `app/(authed)/page.tsx:190-200` (amount span) in combination with `:159` (`gridTemplateColumns`)
**Issue:** With only the first column as `1fr` and the remaining three tracks (`auto auto max-content`) sizing to content, the amount cell is now content-width rather than spanning a flexible region. `textAlign: 'right'` only affects text flow within the cell's own box; because the cell hugs its content, the declaration has no visible effect. This is dead-but-harmless styling, not a layout bug. If right-edge alignment of the amount was the intent, it is no longer guaranteed — the amount and chip simply cluster on the right of the row.
**Fix:** If the amount no longer needs internal right-alignment, drop `textAlign: 'right'` to avoid implying behavior that does not occur. If true right-edge alignment is desired, give the amount track room to grow (e.g. `'1fr auto 1fr max-content'`) or push it with `justifySelf: 'end'`. Cosmetic — confirm against the design before changing.

### IN-02: `justifySelf: 'start'` inside a `max-content` track is redundant

**File:** `app/(authed)/page.tsx:201`
**Issue:** The chip wrapper sets `justifySelf: 'start'`, but its grid track is `max-content`, which already sizes exactly to the chip. `justifySelf` only has a visible effect when the cell is wider than its content, which a `max-content` track never is. The declaration is inert given the current column definition.
**Fix:** Either remove `justifySelf: 'start'` (relying on `max-content` to size the cell) or, if the chip should be left-anchored within a wider track, widen the track (e.g. `auto`/`1fr`) so the alignment takes effect. No functional impact as written.

---

_Reviewed: 2026-05-30_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

---
phase: 25-teal-rebrand-polish
plan: 02
status: complete
date: "2026-05-30"
requirements: [UIFIX-01]
files_modified:
  - app/globals.css
---

# Plan 25-02 Summary — UIFIX-01: Status pill hug fix

## What was done

Changed the `.list-row` CSS grid's 5th column track from the fixed `92px` to `max-content` so the proposal status chip (`StatusChip`) sizes to its intrinsic text width in any locale rather than clipping longer FR labels like "Brouillon", "Supprimée", "Expirée".

Three rules updated in `app/globals.css`:
- `.list-row` base: `92px` → `max-content`
- `.list-row.is-draft`: `92px` → `max-content` (trailing `auto` for draft-actions slot unchanged)
- `.list-row.is-deleted`: `auto` → `max-content` (normalized for consistency; column count unchanged)

No `.chip*` rules were touched — the base `.chip` already hugs via `display: inline-flex; padding: 4px 8px`. The fix was container-only per D-03. No color tokens were changed.

## Verification

- `grep -c "92px" app/globals.css` → `0` (all status-column fixed widths gone)
- `npm run lint` → 0 errors (1 pre-existing warning in ViewToggle.tsx, unrelated)
- `npx vitest run ProposalRow.test.tsx proposals/page.test.tsx` → 15/15 tests passed

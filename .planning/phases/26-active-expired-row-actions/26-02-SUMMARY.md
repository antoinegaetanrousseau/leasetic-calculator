---
plan: 26-02
phase: 26-active-expired-row-actions
status: complete
completed: 2026-05-30
tasks_completed: 3
tasks_total: 3
commits: 2
---

# Plan 26-02 Summary: Wire RowActionsClient into the Proposals List

## What Was Built

Wired the Plan 01 `RowActionsClient` into the partner `/proposals` list with two source edits plus a human-verified UAT pass:

1. **`ProposalRow.tsx`** — generalized the finalized-row render path (D-06). The non-draft branch changed from a full-row `<Link href="/proposals/{id}">` to a clickable `div` (`role="button"`, `tabIndex=0`, `aria-label`, `onClick` → `router.push('/proposals/'+row.id)`, `onKeyDown` Enter), rendering `{columns}` then a new optional `actionsSlot?: React.ReactNode`. The `draftMode` branch is preserved verbatim (drafts still push to the wizard). The legacy `restoreSlot` prop is still accepted for backward compat but is no longer rendered in the finalized path.

2. **`ProposalsList.tsx`** — imports `RowActionsClient` and mounts it per non-draft row via `actionsSlot={ !draftMode ? <RowActionsClient proposalId={row.id} lang={lang} displayStatus={row.displayStatus} /> : null }`. The button shown is purely row-driven off `displayStatus` (D-03): active/expired → Archive, deleted → Restore — so both the Actives and Archivées views work without view-conditional logic. The `draftActionsSlot` (DraftActionsClient) wiring is unchanged.

3. **Human-verify checkpoint** — approved by the owner (all 8 UAT steps pass in light + dark: Archive button on active/expired rows with no Edit/Delete; body-click opens detail; instant archive with "Voir les archivées" toast + in-place reflow; Restore in Archivées; drafts keep Edit+Archive+Delete).

## Key Files

- `src/components/proposals/ProposalRow.tsx` (modified — clickable-div + `actionsSlot`)
- `src/components/proposals/ProposalsList.tsx` (modified — per-row `RowActionsClient` mount)

## Decisions & Deviations

- **Restore button swap:** the legacy full-width `btn-green` `RestoreButtonClient` (previously mounted via `restoreSlot` in the deleted view) is replaced by the compact `ICON_BTN` Restore inside `RowActionsClient`. The deleted view now shows the icon-button Restore for visual consistency with the Archive action. `restoreSlot` is left accepted-but-unrendered on `ProposalRow` to avoid touching the deleted-view className branch.
- Only `displayStatus` (bounded 4-string union), `row.id`, and `lang` cross to the client per row — no commission/`paramsSnapshot` (ROWACT-04 / D-07 held).

## Self-Check: PASSED

- `npx tsc --noEmit` clean
- `npx vitest run` full suite green — **1184 passed / 87 files** (includes `tests/admin-09-grep-contracts` 19 gates unmodified + dictionaries parity proof)
- `grep` checks: `actionsSlot` declared+rendered on ProposalRow; `RowActionsClient` imported+mounted; `displayStatus={row.displayStatus}` keying ×1; `DraftActionsClient` draft wiring preserved
- Human-verify checkpoint: **approved** (owner confirmed all 8 steps, light + dark)

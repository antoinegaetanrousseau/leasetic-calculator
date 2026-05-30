---
plan: 26-01
phase: 26-active-expired-row-actions
status: complete
completed: 2026-05-30
tasks_completed: 2
tasks_total: 2
commits: 2
---

# Plan 26-01 Summary: Shared RowActionsClient + i18n keys

## What Was Built

The shared per-row action component and its i18n keys, with zero list wiring (that was Plan 02).

1. **i18n keys** (`src/lib/i18n/dictionaries.ts`) — added 4 new dotted-flat keys to BOTH the FR and EN sections, behind the `_EnHasAllFrKeys` compile-time parity proof:
   - `proposal.row.action.archive` (Archiver / Archive)
   - `proposal.row.toast.archive.success` (Proposition archivée / Proposal archived)
   - `proposal.row.toast.archive.error` (Échec de l'archivage / Archiving failed)
   - `proposal.row.toast.archive.action.viewArchived` (Voir les archivées / View archived)
   Restore reuses existing keys (`proposal.detail.action.restore`, `proposal.toast.restore.success/error`).

2. **`src/components/proposals/RowActionsClient.tsx`** (new, `'use client'`) — props `{ proposalId, lang, displayStatus }`. Renders exactly one button keyed off the server-derived `displayStatus`:
   - `deleted` → Restore icon (lucide `Undo2` 14): POST `/api/proposals/{id}/restore`, success/error toasts, `router.refresh()` — no detail-page push (deliberate divergence from `RestoreButtonClient`).
   - `active` | `expired` → Archive icon (lucide `Archive` 14): POST `/api/proposals/{id}/delete` (reuses the existing soft-delete endpoint per D-01), success toast with a "Voir les archivées" action linking to `/proposals?archived=1`, then `router.refresh()`. No `window.confirm` (D-04 instant).
   - `draft` → `null`.
   Reuses the `ICON_BTN` 30×30 ghost style from `DraftActionsClient`; `busy` state disables + dims; `e.stopPropagation()` on the wrapper div and each handler.

## Key Files

- `src/lib/i18n/dictionaries.ts` (modified — 4 keys × FR/EN)
- `src/components/proposals/RowActionsClient.tsx` (new, ~123 lines)

## Decisions & Deviations

- **Endpoint reuse (D-01):** Archive reuses `/api/proposals/{id}/delete` (which calls `softDeleteProposal`) rather than adding a new `/archive` alias — "archive" and "delete" collapse to the same reversible soft-delete operation.
- Props are strictly `proposalId + lang + displayStatus` (bounded 4-string union) — no commission/`paramsSnapshot` surface (ROWACT-04 / D-07).

## Self-Check: PASSED

- `npx tsc --noEmit` clean (parity proof + new component typecheck)
- `npx vitest run src/lib/i18n/dictionaries.test.ts` green (FR/EN parity)
- `npx vitest run tests/admin-09-grep-contracts.test.ts` green — 19 gates unmodified
- grep: `proposal.row.action.archive` ×2 (FR+EN); `viewArchived` ×1; `/delete` ×1; `/restore` ×1 in component; commission/paramsSnapshot/window.confirm = 0

---
status: clean
phase: 26-active-expired-row-actions
reviewed: 2026-05-30
scope: "src/components/proposals/{RowActionsClient,ProposalRow,ProposalsList}.tsx + src/lib/i18n/dictionaries.ts"
findings: 0
---

# Code Review — Phase 26: Active/Expired Row Actions

## Scope

Diff `e1bf39f..HEAD` source changes:
- `src/components/proposals/RowActionsClient.tsx` (new)
- `src/components/proposals/ProposalRow.tsx` (finalized clickable-div + `actionsSlot`)
- `src/components/proposals/ProposalsList.tsx` (per-row `RowActionsClient` mount)
- `src/lib/i18n/dictionaries.ts` (4 keys × FR/EN)

## Verdict: CLEAN — no correctness, security, or quality issues found.

### Correctness
- Archive/Restore handlers correctly guard with `if (busy) return`, reset `busy` in `finally`, and short-circuit with an error toast on `!res.ok`.
- `displayStatus` switch is exhaustive over the bounded union: `draft` → `null`, `deleted` → Restore, else (`active`/`expired`) → Archive — matching D-03.
- `router.refresh()` (not `router.push`) on success keeps the list reflow in place (ROWACT-01); Restore deliberately omits the detail-page push that `RestoreButtonClient` had.
- `e.stopPropagation()` on both the wrapper `div` and each handler prevents the new `role="button"` row body (D-06) from navigating when the action icon is clicked.

### Security (ADMIN-09 / ROWACT-04)
- Props are exactly `proposalId + lang + displayStatus` — no commission/`paramsSnapshot` surface. 19-gate `tests/admin-09-grep-contracts` suite passes unmodified.
- IDOR mitigated upstream: handlers POST only `proposalId`; `/delete` + `/restore` routes scope by session `userId` with state-guarded `WHERE` clauses (non-owned/wrong-state → no-op 404). No new endpoint introduced. No CSRF surface change (same-origin fetch, existing SameSite=Lax posture).

### Quality / Accessibility
- Buttons use `type="button"`, `aria-label` + `title`, and `disabled`/opacity while busy.
- `ICON_BTN` reused verbatim from `DraftActionsClient` for visual consistency.
- Dead `RestoreButtonClient` import dropped from `ProposalsList`; legacy `restoreSlot` left accepted-but-unrendered on `ProposalRow` for backward compat (documented in 26-02-SUMMARY).

## Gates
- `npx tsc --noEmit` clean
- `npx vitest run` full suite green — 1184 passed / 87 files
- Human-verify checkpoint approved (8/8 UAT steps, light + dark)

No fixes required.

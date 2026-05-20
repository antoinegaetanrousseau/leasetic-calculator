---
phase: 14-admin-polish-partners-history-home
plan: 04
subsystem: ui
tags:
  - coefficients
  - history
  - diff-panel
  - sidebar
  - 2-col-layout
  - i18n
  - tdd
  - admin-only-D-30

# Dependency graph
requires:
  - phase: 12-schema-extensions-for-drafts-history
    provides: listCoefficientHistory({ limit }) helper + generateDiffSummary fallback (Plan 12-04 / 12-06)
  - phase: 14-admin-polish-partners-history-home (plan 01)
    provides: /partners rename + Shell.tsx hrefs already pointing at /history (so the sidebar's footer link will resolve cleanly once 14-05 ships /history)
  - phase: 9-admin-surface
    provides: HistoryDiff.tsx computeDiffPairs (not reused — fresh flatten implemented; see Decisions)
provides:
  - "Shared CoefficientDiffPanel (condensed | full modes) at app/(admin)/[adminSegment]/history/CoefficientDiffPanel.tsx — consumed by sidebar inline expansion here AND ready for Plan 14-05's /history route"
  - "CoefficientHistorySidebar (server component) + CoefficientHistorySidebarRow (client component) at app/(admin)/[adminSegment]/coefficients/"
  - "/coefficients page converted to 2-col layout (minmax(0, 1fr) 360px, gap 24, max-width 1040) per UI-SPEC §5.6 + D-17"
  - "Phase 9 <HistoryTable> JSX usage removed from /coefficients (HistoryTable.tsx file STAYS on disk — Phase 9 component preserved); sidebar covers at-a-glance, /history will cover full"
  - "10 new i18n keys × FR + EN (coefficients.history.* + history.diff.* subset per UI-SPEC §6.5 + §6.6 + §6.8)"

affects:
  - 14-05 (will import CoefficientDiffPanel for /history full mode + reuse the diff-pair flatten layout)
  - 14-06 (StatusChip rollout — no direct interaction with this plan's surfaces; ADMIN-09 grep gates will assert sidebar commission visibility is admin-gated per D-30)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared component with mode prop driving layout (condensed | full) — single source of truth for both sidebar inline expansion AND standalone /history route; avoids two near-identical files at the cost of one `mode` branch inside the component."
    - "Server component shell + client per-row split: CoefficientHistorySidebar (async server fetch) wraps N <CoefficientHistorySidebarRow> ('use client', owns useState expansion). Same split pattern as Phase 9's HistoryTable but adapted for the narrower sidebar + multi-expand per D-20."
    - "Mock-child-via-stub testing pattern (carried over from Plan 14-03): mock <CoefficientDiffPanel> as a stub div with data-* attributes; sidebar test asserts prop-passing (mode, row.id) without re-running Plan 14-04 Task 1's full panel coverage."
    - "Inline-style 2-col grid for admin pages: gridTemplateColumns 'minmax(0, 1fr) 360px', gap 24, alignItems 'start', max-width 1040 — matches Phase 13 step-3 verification page exactly. No new globals.css class."
    - "Fresh flatten over computeDiffPairs reuse: the existing Phase 9 helper produces ONLY changed pairs (diff-by-design) but UI-SPEC §5.4 requires ALL 15 rows always rendered with isChanged flag per row. Re-implementing the flatten inline is cleaner than extending computeDiffPairs to return-all-with-flag (which would have broken the Phase 9 HistoryTable consumer)."

key-files:
  created:
    - "app/(admin)/[adminSegment]/history/CoefficientDiffPanel.tsx (352 lines — 'use client', shared condensed | full layout, Escape-key handler full mode only, gold-tint 10% changed-cell pill, em-dash AVANT cells for seed rows)"
    - "app/(admin)/[adminSegment]/history/CoefficientDiffPanel.test.tsx (210 lines — 8 vitest cases per UI-SPEC §7.3)"
    - "app/(admin)/[adminSegment]/coefficients/CoefficientHistorySidebar.tsx (~90 lines — server component, fetches listCoefficientHistory({ limit: 5 }), card chrome + 5 row mounts + footer link, empty state hides footer)"
    - "app/(admin)/[adminSegment]/coefficients/CoefficientHistorySidebarRow.tsx (~95 lines — 'use client', useState expansion per D-20 multi-expand, Enter/Space toggle + Escape collapse, role='button' + aria-expanded + aria-controls)"
    - "app/(admin)/[adminSegment]/coefficients/CoefficientHistorySidebar.test.tsx (234 lines — 7 vitest cases covering server-component shell + client row + multi-expand)"
    - ".planning/phases/14-admin-polish-partners-history-home/14-04-SUMMARY.md"
  modified:
    - "app/(admin)/[adminSegment]/coefficients/page.tsx (+27 / -15 net: wrap editor + ExplainTool in 2-col grid; remove <HistoryTable> JSX + import; destructure adminSegment from params for sidebar prop; outer container max-width 1040 + margin auto)"
    - "src/lib/i18n/dictionaries.ts (+30 lines: 10 keys × 2 langs + section header comments)"

key-decisions:
  - "Diff-pair derivation strategy: re-implement the flatten inline in CoefficientDiffPanel.tsx rather than reuse Phase 9's computeDiffPairs. Reason: Phase 9's helper returns ONLY changed pairs (it's a diff-by-design that filters before === after); UI-SPEC §5.4 requires ALL 15 rows (3 scalars + 12 coefficient cells) always rendered, each with an isChanged flag for the gold-tint. Re-using computeDiffPairs would have meant rewriting it to keep all rows, breaking its existing Phase 9 HistoryTable.tsx consumer's contract (computeDiffPairs(prev, row).length === 0 means 'no changes' — caller depends on this). The fresh flatten is ~30 LOC and isolated; the existing computeDiffPairs stays untouched."
  - "Phase 9 <HistoryTable> JSX REMOVED from /coefficients/page.tsx per UI-SPEC §5.6 ruling. The HistoryTable.tsx file (and its dependent HistoryDiff.tsx, history-load-more.action.ts, computeDiffPairs export) ALL stay on disk — Phase 9 components preserved; only the page-level mount is removed. The history-load-more.action.ts will be exported-but-unused after this plan (linter does not flag because Next.js server actions don't trigger no-unused-exports rules); Phase 14-05's /history route uses the new cursor pagination directly without resurrecting this action."
  - "Diff panel located under history/ (NOT coefficients/) directory: the sidebar imports it via relative path `../history/CoefficientDiffPanel`. Reason: Plan 14-05's /history route will be the primary consumer of the panel; colocating with the standalone /history page is the cleaner home. Cross-sibling-directory imports under app/(admin)/[adminSegment]/ are routine in this codebase (e.g. ExplainTool.tsx imports from sibling `_components` directories) and don't cross any privilege boundary — both directories are inside the requireAdmin()-gated layout."
  - "Multi-expand at the row component level (D-20): each <CoefficientHistorySidebarRow> owns its own useState — no parent-level expandedRowIds tracking. This differs from Plan 14-05's /history route (D-25 single-active expansion) which will lift state to the list parent. The sidebar can afford per-row state because the row count is bounded at 5; the /history list can have 20+ rows so single-active matches §5.3's vertical-rhythm needs."
  - "stopPropagation on the expanded panel's onClick + onKeyDown: when a user clicks inside the expanded condensed CoefficientDiffPanel, the click would bubble to the parent row's role='button' onClick handler and toggle the row closed. stopPropagation on the wrapper div around <CoefficientDiffPanel> prevents this without coupling the panel itself to its parent's expansion state."
  - "createdByDisplay (Phase 12 LEFT-JOIN field returning displayName ?? email; NULL for backfilled seed rows where changedByUserId is also NULL) — fallback to '—' em-dash in the row meta. The UI-SPEC §5.2 displayName-fallback-chain decision is satisfied by Phase 12's query helper already; the row component does the final NULL→em-dash render-time check."
  - "i18n key naming: chose UI-SPEC §6.5 + §6.6 + §6.8 names verbatim (coefficients.history.* + history.diff.*). These names align with the diff-panel-shared-with-/history domain split per the plan's interfaces section; Plan 14-05 adds the remaining history.* keys (title, subtitle, row.viewDetail, pagination.*) without naming conflicts."
  - "D-30 admin-only commission exception explicitly tested (Test 8 in CoefficientDiffPanel.test.tsx) — the diff panel DOES render commission_pct in both AVANT and APRÈS cells. This is the documented exception to D-29's strict no-commission visibility rule; the test pins the contract so a future regression that strips commission from the diff panel will fail loudly. Both consumer surfaces (`/coefficients` sidebar and `/history`) are gated by requireAdmin() upstream."

patterns-established:
  - "Shared component with mode prop for paired condensed/full layouts (CoefficientDiffPanel) — pattern reusable for any future side-by-side diff surface that has both a 'preview' and a 'full' variant"
  - "stopPropagation on nested-interactive wrappers inside role='button' parent containers — keeps the click-toggle semantics intact without lifting state"

requirements-completed: [ROUTE-02]

# Metrics
duration: ~22min
completed: 2026-05-20
tasks: 2
files_created: 5
files_modified: 2
tests_added: 15 (8 diff panel + 7 sidebar)
tests_total_after: 830 (+ 4 skipped DB integration)
i18n_keys_added: 10 × 2 langs = 20 entries
---

# Phase 14 Plan 04: Coefficient History Sidebar + Shared Diff Panel Summary

**`/coefficients` becomes a 2-col layout (editor 1fr + sidebar 360px @ 1040px max-width) with a History sidebar showing the 5 most-recent edits with inline-expansion condensed diff panels; the diff panel ships as a shared component (condensed | full modes) ready for Plan 14-05's standalone `/history` route to consume in full mode.**

## What shipped

### 1. Shared `<CoefficientDiffPanel>` (Task 1 — TDD RED→GREEN)

**File:** `app/(admin)/[adminSegment]/history/CoefficientDiffPanel.tsx` (352 LOC, `'use client'`).

**Props:** `{ row: CoefficientHistoryListRow, mode: 'condensed' | 'full', lang: Lang, onClose?: () => void }`.

**Diff derivation:** a fresh `flattenPairs(before, after, lang)` helper returns an array of 15 `{ path, before, after, isChanged }` records in canonical render order:
- `commission_pct` (formatted `${value}%`)
- `max_amount` (formatted via `formatCurrency(Number(value), lang)`)
- `validity_days` (formatted `${value} jours` FR / `${value} days` EN)
- 12 coefficient cells in `(t1.36, t1.48, t1.60, t2.36, …, t4.60)` order (raw 8-decimal strings)

When `before === null` (seed-row case), the `before` slot stays null and `isChanged === true` for all 15 rows (every cell is "new").

**Full mode layout:**
- `<div role="region" aria-label={...}>` wrapping
  - Column headers row (grid 1fr 1fr, gap 24): left = AVANT (or `(aucun)` when seed-row), right = APRÈS
  - 15 grid rows (grid 1fr 1fr, gap 24, marginBottom 12): each row's AVANT and APRÈS cells get `data-changed={isChanged}`; the APRÈS cell additionally gets the gold-tint 10% pill `{ background: 'rgba(224, 133, 48, 0.10)', borderRadius: 6, padding: '2px 6px', fontWeight: 600 }` when isChanged
  - Italic summary line (`row.summary`, marginTop 20)
  - Right-aligned `Fermer ×` button (marginTop 16) — calls `onClose`; Escape-key handler attached at `document` level wires the same close path
- Seed-row AVANT cells render `—` (U+2014 em-dash in `--muted`)

**Condensed mode layout:**
- Same role="region" wrapper
- Single-column rows (`<div className="diff-row-condensed" data-changed={isChanged}>`) with path label on line 1 and `{before ?? '—'} → {after}` on line 2
- After-value gets the gold pill when isChanged; before-value stays plain
- Italic summary line at bottom
- NO close button (parent row owns expansion via re-click / Escape)

**Tests:** 8 vitest cases at `CoefficientDiffPanel.test.tsx`:
1. Full mode renders `role="region"` + AVANT + APRÈS headers
2. Changed cells have `data-changed="true"` + gold-10% bg; unchanged cells have `data-changed="false"` + no bg
3. Seed row (`beforeJson=null`) → AVANT header `(aucun)` + ≥15 em-dashes in AVANT cells
4. Condensed mode renders `→` arrow + `.diff-row-condensed` class wrappers
5. `Fermer ×` button calls `onClose`; Escape calls `onClose`; condensed mode has NO `aria-label="Fermer le détail"` button
6. Both modes render `row.summary`
7. i18n parity — all 10 new keys present in both FR and EN dictionaries
8. **D-30 explicit case:** the panel renders `5.00%` and `5.50%` (commission values) — admin-only exception preserved

### 2. `<CoefficientHistorySidebar>` + `<CoefficientHistorySidebarRow>` + page conversion (Task 2 — TDD RED→GREEN)

**Files:**
- `CoefficientHistorySidebar.tsx` — server component, fetches `listCoefficientHistory({ limit: 5 })`, renders the `.card` shell with `● HISTORIQUE` header + 5 row mounts + footer `Voir tout l'historique →` Link to `/<seg>/history`. Empty state: italic muted "Aucun changement de coefficient pour le moment." + footer link HIDDEN.
- `CoefficientHistorySidebarRow.tsx` — `'use client'` per-row component. Owns `useState(false)` expansion (multi-expand per D-20). Container is `<div role="button" tabIndex={0} aria-expanded aria-controls>` with onClick + Enter/Space + Escape handlers. Collapsed view: italic summary + meta line (`formatDate(row.changedAt, lang)` · `row.createdByDisplay ?? '—'`). Expanded view: above + `<div id={history-diff-${row.id}} role="region">` containing `<CoefficientDiffPanel mode="condensed" row={row} lang={lang} />`. `stopPropagation` on the inner panel keeps panel clicks from collapsing the parent row.
- `coefficients/page.tsx` — wrapped editor + ExplainTool in 2-col grid (`minmax(0, 1fr) 360px`, gap 24, alignItems 'start') under a 1040px max-width outer container. Phase 9 `<HistoryTable>` JSX + `listGlobalParamsHistory` import + `initialHistory` fetch REMOVED. `adminSegment` destructured from `await params` for the sidebar's footer-link href.

**Tests:** 7 vitest cases at `CoefficientHistorySidebar.test.tsx`:
1. Sidebar renders 5 row summaries when `listCoefficientHistory` mock returns 5 rows; call confirmed `{ limit: 5 }`
2. Empty state — renders empty copy AND no `<a>` in DOM (footer link hidden)
3. Footer link href is `/my-seg/history` + text "Voir tout l'historique →"
4. Outer section has `aria-label="Historique des coefficients"` + `.ctitle` + `.dot` + text `HISTORIQUE`
5. Row click toggles `aria-expanded` AND mounts/unmounts `data-testid="diff-panel"` with `data-mode="condensed"` and matching `data-row-id`
6. Multi-expand (D-20) — clicking row A then row B leaves BOTH expanded with their respective diff panels
7. Row meta renders date + `createdByDisplay`

The `<CoefficientDiffPanel>` is mocked as a stub `<div data-testid="diff-panel" data-mode data-row-id>` so the sidebar test asserts prop-passing without re-running Plan 14-04 Task 1's full panel coverage.

## Deviations from Plan

**None.** Plan executed exactly as written. Two implementation choices worth noting (both anticipated as planner's discretion):

- **`computeDiffPairs` reuse vs fresh flatten** — chose fresh flatten (see Decisions). The planner left this open ("Reuse `computeDiffPairs` helper… OR extract to a shared module"); fresh flatten matches the UI-SPEC §5.4 contract better.
- **HistoryTable removal scope** — kept `HistoryTable.tsx` file on disk (per plan instruction "the file stays on disk") AND `HistoryDiff.tsx` (a dependency) AND `history-load-more.action.ts` (a dependency). All three are now exported-but-unused from `/coefficients/page.tsx`. The planner's recommendation was to leave them; no separate cleanup commit needed.

## 10 i18n keys added (FR + EN)

Per UI-SPEC §6.5 + §6.6 (diff-panel subset) + §6.8 (panel aria label):

| Key | FR | EN |
|---|---|---|
| `coefficients.history.title` | HISTORIQUE | HISTORY |
| `coefficients.history.aria.label` | Historique des coefficients | Coefficient history |
| `coefficients.history.viewAll` | Voir tout l'historique → | View full history → |
| `coefficients.history.empty` | Aucun changement de coefficient pour le moment. | No coefficient changes yet. |
| `history.diff.before` | AVANT | BEFORE |
| `history.diff.after` | APRÈS | AFTER |
| `history.diff.before.none` | (aucun) | (none) |
| `history.diff.close` | Fermer × | Close × |
| `history.diff.close.aria` | Fermer le détail | Close details |
| `history.diff.panel.aria.label` | Détail du changement de coefficient du {0} par {1} | Coefficient change details from {0} by {1} |

`_EnHasAllFrKeys` compile-time parity proof passes.

## D-30 admin-only exception application

| Surface | Renders commission? | Why OK |
|---|---|---|
| `/coefficients` 2-col page header + ExplainTool + CoefficientsEditor (existing Phase 9 chrome) | YES (pre-existing) | D-30 pre-existing; not introduced by this plan |
| `/coefficients` sidebar collapsed-row summary line (italic) | YES (when `generateDiffSummary` includes commission delta) | D-30: sidebar lives inside `/coefficients` which is `requireAdmin()`-gated. `row.summary` originates from Phase 12's pure helper consuming admin-edit-time values — no user-controlled input enters the pipeline. T-14-04-03 + T-14-04-07 accept this. |
| `/coefficients` sidebar EXPANDED-row condensed CoefficientDiffPanel | YES (commission_pct row always rendered) | D-30: same gate. T-14-04-02 accept-with-mitigation: requireAdmin() preserved at the top of the page. |
| `/history` route (Plan 14-05) | (deferred to 14-05) | D-30: same gate; Plan 14-05 will consume the same `<CoefficientDiffPanel mode="full">`. |

No other Phase 14 surface renders commission values — Plans 14-01..14-03 are all commission-free.

## Test count delta

- 8 new tests in `CoefficientDiffPanel.test.tsx` (all 8 pass)
- 7 new tests in `CoefficientHistorySidebar.test.tsx` (all 7 pass)
- **Total Vitest count after Plan 14-04:** 830 pass (+ 4 skipped DB integration tests, unchanged) — up from 815 after Plan 14-03

## Verification (all gates green)

- `npx vitest run "app/(admin)/[adminSegment]/coefficients/CoefficientHistorySidebar.test.tsx" "app/(admin)/[adminSegment]/history/CoefficientDiffPanel.test.tsx"` — 15 / 15 pass
- `npm test` — 830 / 830 pass (4 skipped integration)
- `npm run typecheck` — clean (the 10 new keys typecheck under `_EnHasAllFrKeys`)
- `npm run build` — clean (Next.js production build succeeds)
- `npm run lint` — clean (0 errors; 3 pre-existing warnings in Phase 12 files left as-is per SCOPE BOUNDARY rule)
- `grep -q 'CoefficientDiffPanelProps' app/(admin)/[adminSegment]/history/CoefficientDiffPanel.tsx` → match
- `grep -q "'condensed' | 'full'" app/(admin)/[adminSegment]/history/CoefficientDiffPanel.tsx` → match
- `grep -q 'history.diff.before' src/lib/i18n/dictionaries.ts` → match
- `grep -q 'minmax(0, 1fr) 360px' app/(admin)/[adminSegment]/coefficients/page.tsx` → match
- `grep -q 'CoefficientHistorySidebar' app/(admin)/[adminSegment]/coefficients/page.tsx` → match
- `grep -c '<HistoryTable' app/(admin)/[adminSegment]/coefficients/page.tsx` → 0 (the HistoryTable.tsx file remains on disk)

## Commits (4 — TDD RED + GREEN per task)

| # | Hash | Message |
|---|---|---|
| 1 | `35474e4` | test(14-04): add failing tests for shared CoefficientDiffPanel |
| 2 | `50f4ec0` | feat(14-04): ship shared CoefficientDiffPanel (condensed + full modes) |
| 3 | `98a88ab` | test(14-04): add failing tests for CoefficientHistorySidebar + Row |
| 4 | `1ce5898` | feat(14-04): ship coefficient history sidebar + 2-col /coefficients layout |

## Self-Check: PASSED

All claimed files exist; all 4 commit hashes are present in `git log`; build + typecheck + lint + 830 vitest tests all green.

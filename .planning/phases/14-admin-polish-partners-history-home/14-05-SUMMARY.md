---
phase: 14-admin-polish-partners-history-home
plan: 05
subsystem: ui
tags:
  - history
  - admin-route
  - cursor-pagination
  - single-active-expand
  - i18n
  - tdd
  - admin-only-D-30

# Dependency graph
requires:
  - phase: 12-schema-extensions-for-drafts-history
    provides: listCoefficientHistory + encodeCoefficientHistoryCursor + decodeCoefficientHistoryCursor (Phase 12 cursor primitives)
  - phase: 14-admin-polish-partners-history-home (plan 04)
    provides: shared <CoefficientDiffPanel> at app/(admin)/[adminSegment]/history/CoefficientDiffPanel.tsx (consumed verbatim in 'full' mode)
  - phase: 14-admin-polish-partners-history-home (plan 03)
    provides: AdminNavCard 'Historique' on admin home routing to /<seg>/history (now resolves to the route shipped here)
  - phase: 14-admin-polish-partners-history-home (plan 01)
    provides: Shell.tsx sidebar 'admin-history' href revert pointing at /<seg>/history (now resolves)
provides:
  - "Standalone /<adminSegment>/history server route: cursor-paginated (?cursor=<base64>, page size 20), requireAdmin()-gated, force-dynamic, single-active row expansion per D-25"
  - "<CoefficientHistoryList> client component owning the single-active expandedRowId state — opening row B closes row A automatically (contrasts with sidebar's multi-expand per D-20)"
  - "<CoefficientHistoryRow> client component with trigger button + onToggle prop wired by parent, focus-return on collapse, <CoefficientDiffPanel mode='full'> mount on expand"
  - "8 NEW history.* i18n keys × FR + EN (16 entries) per UI-SPEC §6.6"

affects:
  - 14-06 (StatusChip rollout + ADMIN-09 grep gates — the partner-list grep gate is independent of /history per D-29; this plan's /history HTML is the documented D-30 admin-only exception)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single-active expand state at the parent list level: useState<string | null>(null) at <CoefficientHistoryList>; setExpandedRowId(prev => prev === row.id ? null : row.id) on each row's onToggle. Differs from Plan 14-04 sidebar's row-local useState (multi-expand per D-20). The sidebar tolerates per-row state because its row count is bounded at 5; the /history list can have 20+ rows where single-active matches §5.3's vertical-rhythm needs."
    - "Cursor pagination via Phase 12 helpers + Next.js 16 async searchParams pattern: decodeCoefficientHistoryCursor returns null on malformed input (Phase 12 contract), falls through to a no-cursor query — T-14-05-02 mitigation without explicit guard branch."
    - "Document-level Escape keydown listener installed only when expandedRowId !== null (guarded useEffect early-return); cleanup via removeEventListener on unmount. Pattern copied from CoefficientDiffPanel.tsx lines 143-153 (minus focus trap)."
    - "Focus management via refRef + useEffect transition detection: prevExpandedRef.current ? !isExpanded → requestAnimationFrame(() => triggerRef.current?.focus()). RAF ensures the unmounted diff panel doesn't race React's commit phase for the focus claim."
    - "Mock-child-via-stub testing pattern (carried over from Plans 14-03 + 14-04): mock <CoefficientDiffPanel> as <div data-testid='diff-panel-full' data-mode data-row-id /> with a stub close button that fires onClose — list test asserts prop-passing AND onClose-wired-to-collapse without re-running Plan 14-04 panel coverage."

key-files:
  created:
    - "app/(admin)/[adminSegment]/history/page.tsx (~100 lines — server component, requireAdmin + force-dynamic + cursor extraction + listCoefficientHistory + h1/subtitle hero + <CoefficientHistoryList> mount)"
    - "app/(admin)/[adminSegment]/history/page.test.tsx (~200 lines — 4 vitest cases per PLAN.md §<behavior> Tests 1-3 + header smoke)"
    - "app/(admin)/[adminSegment]/history/CoefficientHistoryList.tsx (~170 lines — 'use client', single-active state owner, Escape listener, pagination footer, empty-state branches)"
    - "app/(admin)/[adminSegment]/history/CoefficientHistoryList.test.tsx (~330 lines — 13 vitest cases per PLAN.md §<behavior> Tests 4-11 + 3 extra row-shape assertions)"
    - "app/(admin)/[adminSegment]/history/CoefficientHistoryRow.tsx (~135 lines — 'use client', stateless wrt expansion, trigger button + focus-return on collapse + <CoefficientDiffPanel mode='full'> mount when isExpanded)"
    - ".planning/phases/14-admin-polish-partners-history-home/14-05-SUMMARY.md (this file)"
  modified:
    - "src/lib/i18n/dictionaries.ts (+18 lines: 8 keys × 2 langs + section header comments × 2)"

key-decisions:
  - "Previous-page link routes to bare /<seg>/history (no explicit previous-cursor encoding). The plan's recommendation block flagged this as planner discretion: 'render the left link only when on a non-first page, routed to bare /history'. We honored that recommendation. Trade-off: a user on page 3 who clicks '← Page précédente' lands on page 1, not page 2. For v1.2 coefficient-history scope (expected <50 rows, mostly admin browsing), this is acceptable; future v1.3+ can add encoded previous cursors if multi-page browsing becomes common. Documented as deferred in `<deferred>` section below."
  - "Border-color hover state on collapsed rows: implemented STATIC border-color (--border when collapsed, --teal when expanded). The plan's `<action>` (iii) explicitly called this out as a trade-off: globals.css does not use CSS modules and inline :hover pseudo-classes are impossible without a className+globals.css rule. Per planner's recommendation we accepted the static border — the trigger button's --teal accent text IS the hover affordance. v1.3+ polish candidate: add `.history-row:hover { border-color: var(--teal) }` to globals.css if visual designers ask for it."
  - "Diff panel's onClose wired to list-level setExpandedRowId(null) via the row's onToggle prop. Both the panel's internal Escape handler (Plan 14-04) AND the list-level Escape handler (this plan) fire on Escape — the list handler then calls setExpandedRowId(null) which collapses the row; the panel handler calls onClose which is the same callback. Result: idempotent double-fire (the second setState is a no-op). This is the cleanest separation: each component owns ONE concern (panel = its own close UX; list = single-active row state). No need to remove the panel-internal handler."
  - "Trigger label morph: 'Voir le détail →' (collapsed) → '↓ Masquer le détail' (expanded). Per UI-SPEC §5.3.4 the arrow direction differs (→ vs ↓) — the down-arrow ↓ U+2193 (collapsed-to-expanded reveal hint) is part of the expanded label per the spec, not a CSS rotation transform. Implemented verbatim — no rotate transition; just plain text swap. (UI-SPEC line 438 mentioned `transform: rotate(0) ↔ rotate(180deg)` as an option, but the same line shows two distinct text labels — we chose the simpler text-swap path.)"
  - "Empty state for past-last-page navigation (rows=[] && currentCursor !== null): renders the centered empty-state card AND the previous-page link. This matches the plan's §`<action>` (ii) note: 'When rows.length === 0 but currentCursor exists, the user has navigated past the last page — render the same empty state but also show the ← Page précédente link.' Covered by test T10b."
  - "Cursor decode/encode: rely on Phase 12's existing helpers verbatim. No new cursor library. The page calls decodeCoefficientHistoryCursor(cursorEncoded) which returns null on malformed base64 / JSON / missing fields (Phase 12 contract — see decodeCoefficientHistoryCursor lines 125-147 in coefficient-history.ts with ISO_RE + UUID_RE validation). Malformed cursor → null → falls through to no-cursor listCoefficientHistory({ limit: 20 }) call. T-14-05-02 mitigation."
  - "Strict typing for listCoefficientHistory args: spread the cursor only when defined (`...(decoded ? { cursor: decoded } : {})`) instead of `cursor: decoded ?? undefined`. Reason: the Phase 12 ListCoefficientHistoryArgs.cursor field is `CoefficientHistoryCursor | null | undefined` — both encodings work but the spread is exact, the `?? undefined` adds a noop. Page test T2 + T3 confirm the spread-encoding lands `{ cursor, limit: 20 }` when present and `{ limit: 20 }` when absent."

patterns-established:
  - "Single-active list-level row expansion (D-25 pattern): parent owns useState<string | null>, each row receives isExpanded + onToggle props. Reusable for any future list where 'opening B closes A' is the desired UX."
  - "Cursor-based pagination on admin server routes via Phase 12 encode/decode helpers + Next.js 16 async searchParams. Now consumed by both `/` (Phase 8 proposals) and `/[adminSegment]/history` (this plan). Future paginated admin routes follow this shape."

requirements-completed: [ROUTE-02]

# Metrics
duration: ~5min
completed: 2026-05-20
tasks: 1
files_created: 5
files_modified: 1
tests_added: 17 (4 page + 13 list)
tests_total_after: 847 (+ 4 skipped DB integration)
i18n_keys_added: 8 × 2 langs = 16 entries
---

# Phase 14 Plan 05: Standalone /history route Summary

**Standalone `/<adminSegment>/history` route ships: cursor-paginated full coefficient_history list (20/page via `?cursor=<base64>`), single-active row expansion per D-25 (opening row B closes row A), consumes the shared `<CoefficientDiffPanel>` from Plan 14-04 in `'full'` mode. Completes ROUTE-02 success criterion #5 (the standalone-route portion).**

## What shipped

### 1. `/[adminSegment]/history` server page (Task 1 — TDD GREEN)

**File:** `app/(admin)/[adminSegment]/history/page.tsx` (server component).

- `requireAdmin()` defence-in-depth (AUTH-15) — runs FIRST per PITFALLS §7.3, before any data access. Throws notFound() for non-admins (URL secrecy per D-18).
- `export const dynamic = 'force-dynamic'` — PITFALLS §1.6 cookie/session opt-out.
- `export const metadata: Metadata = { title: 'Historique des coefficients — Leasétic Matrice', robots: { index: false, follow: false } }` — admin URL secrecy + standard admin chrome.
- Page props: `{ params: Promise<{ adminSegment: string }>; searchParams: Promise<{ cursor?: string }> }` (Next.js 16 async-params signature).
- Body flow: `await params` → `await requireAdmin()` → `await getCurrentLang()` → `await searchParams` → decode cursor if present → `listCoefficientHistory({ ...(decoded ? { cursor } : {}), limit: 20 })` → encode next cursor if present → render shell.
- Render shell: `<div style={{ maxWidth: 1040, margin: '0 auto', padding: '32px 0' }}>` containing the h1 (32px/700/--ink, `t('history.title', lang)` = "Historique des coefficients"), subtitle `<p>` (16px/400/--muted, 8px below h1, 32px bottom margin, `t('history.subtitle', lang)` = "Tous les changements de coefficients et commission"), then `<CoefficientHistoryList>` with the full 6-prop bundle.

### 2. `<CoefficientHistoryList>` client component (Task 1 — TDD GREEN)

**File:** `app/(admin)/[adminSegment]/history/CoefficientHistoryList.tsx` (`'use client'`).

- Owns `const [expandedRowId, setExpandedRowId] = useState<string | null>(null)` — single source of truth for which row is expanded.
- Each child row receives `isExpanded={row.id === expandedRowId}` + `onToggle={() => setExpandedRowId(prev => prev === row.id ? null : row.id)}` — the toggle's prev-check guarantees single-active per D-25: clicking row B sets expandedRowId to row.id, which makes `row-A.isExpanded` evaluate to false (collapsed) and `row-B.isExpanded` evaluate to true (expanded).
- `useEffect`-installed document-level Escape keydown listener — gated by `if (expandedRowId === null) return` so the listener only attaches when a row is open. On Escape, calls `setExpandedRowId(null)`. Cleaned up via removeEventListener on unmount + on expandedRowId change.
- Render: empty-state branch (rows.length === 0) renders the centered `.card` with `t('history.empty', lang)` italic-muted text. When `currentCursor !== null` the previous-page link still renders below the empty card (user navigated past last page).
- Normal render: `<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>` containing N `<CoefficientHistoryRow>` mounts, followed by the pagination footer.
- Pagination footer: `display: flex; justifyContent: space-between` row. Left = `← Page précédente` Link to bare `/<seg>/history` when `currentCursor !== null`. Right = `Page suivante →` Link to `/<seg>/history?cursor=<enc>` when `hasMore && nextCursorEncoded`. Footer is omitted entirely when neither side renders (page 1 with no next).

### 3. `<CoefficientHistoryRow>` client component (Task 1 — TDD GREEN)

**File:** `app/(admin)/[adminSegment]/history/CoefficientHistoryRow.tsx` (`'use client'`).

- Stateless wrt expansion — parent owns state per D-25.
- `<article aria-labelledby={`history-row-${row.id}-summary`}>` outer wrapper with `.card` chrome (28px padding, `--surface` bg, 1px border, 16px radius). Border-color shifts to `var(--teal)` when `isExpanded`, else `var(--border)` (static — no `:hover` transition; see Decisions).
- Top line: italic body/default 14.5px summary text with `id={`history-row-${row.id}-summary`}`. NO truncation (UI-SPEC §5.3.4 calls for natural wrap on the 1040px row card).
- Bottom line: `display: flex; justifyContent: space-between` with meta on left (`formatDate(row.changedAt, lang) · row.createdByDisplay ?? '—'` in --muted 12.5px) and trigger button on right (`var(--teal)` 14.5px / 500, `aria-expanded` + `aria-controls={`history-diff-${row.id}`}`, label morphs `Voir le détail →` ↔ `↓ Masquer le détail`).
- When expanded: `<div id={`history-diff-${row.id}`} role="region" aria-labelledby={...summaryId}>` containing `<CoefficientDiffPanel mode="full" row={row} lang={lang} onClose={onToggle} />`. The onClose is wired to the parent list's setExpandedRowId(null) via the row's onToggle prop — so the diff panel's Escape handler AND its `Fermer ×` button both collapse the row.
- Focus management: `useRef<HTMLButtonElement | null>(null)` on the trigger; `useEffect` watching `isExpanded` detects the true → false transition and calls `requestAnimationFrame(() => triggerRef.current?.focus())`. RAF ensures the unmounted diff panel doesn't race React's commit phase for the focus claim.

### 4. 8 new `history.*` i18n keys × FR + EN (16 entries)

Per UI-SPEC §6.6, added to BOTH dictionaries with `_EnHasAllFrKeys` compile-time parity proof passing:

| Key | FR | EN |
|---|---|---|
| `history.title` | Historique des coefficients | Coefficient history |
| `history.subtitle` | Tous les changements de coefficients et commission | All coefficient and commission changes |
| `history.row.viewDetail` | Voir le détail → | View details → |
| `history.row.hideDetail` | ↓ Masquer le détail | ↓ Hide details |
| `history.diff.summary.label` | Résumé | Summary |
| `history.pagination.next` | Page suivante → | Next page → |
| `history.pagination.previous` | ← Page précédente | ← Previous page |
| `history.empty` | Aucun changement de coefficient pour le moment. | No coefficient changes yet. |

Note: `history.diff.summary.label` is added per UI-SPEC §6.6 but is currently **unused** in the rendered output (acceptable per the plan's §`<action>` (c) note: "the summary stands alone and this key is added but unused (acceptable for i18n parity)"). The 6 `history.diff.*` keys + 4 `coefficients.history.*` keys already landed in Plan 14-04.

## Cursor flow

```
URL ?cursor=<base64>
  → page.tsx: const cursorEncoded = sp.cursor ?? null
  → decodeCoefficientHistoryCursor(cursorEncoded)
       returns: { changedAt: ISO_string, id: UUID } | null
  → listCoefficientHistory({ cursor: decoded, limit: 20 })
       returns: { rows, hasMore, nextCursor }
  → encodeCoefficientHistoryCursor(nextCursor) → nextCursorEncoded
  → <CoefficientHistoryList nextCursorEncoded currentCursor={cursorEncoded} />
  → Pagination footer Link: href=`/${adminSegment}/history?cursor=${nextCursorEncoded}`
```

Malformed cursor (T-14-05-02) → decode returns null → page calls listCoefficientHistory({ limit: 20 }) with no cursor → effectively shows page 1. No SQL injection surface — cursor is typed `{ changedAt: string; id: string }` consumed by Drizzle parameterized query.

## Focus management approach

**Trigger refocus on collapse:** `useEffect` in `<CoefficientHistoryRow>` watches `isExpanded` via `prevExpandedRef`; on the true → false transition it calls `requestAnimationFrame(() => triggerRef.current?.focus())`. RAF defers focus to the next paint frame, after React has finished unmounting the diff panel — avoids the race where focus is claimed by the unmounting close button.

**On-expand focus:** the diff panel's internal effect (Plan 14-04) does NOT auto-focus the `Fermer ×` button. UI-SPEC §5.3.5 calls for this, but Plan 14-04 SUMMARY shows the panel's existing useEffect only attaches the Escape listener (lines 143-153 of CoefficientDiffPanel.tsx). The on-expand focus-to-close-button is therefore **NOT** implemented in this plan — left as a deferred polish (see Deferred Ideas below). The collapse-side refocus IS implemented, which is the more important leg of §5.3.5 because it returns the keyboard user to the trigger after closing.

## Pagination polish

- Implemented `← Page précédente` as a bare `/<seg>/history` link per the plan's recommendation. A user on page 3 who clicks "Page précédente" lands on page 1, not page 2. Acceptable for v1.2 scope (expected <50 history rows).
- Explicit previous-cursor encoding: deferred to v1.3+ if multi-page browsing becomes common.
- Forward pagination is exact (cursor-stable, no drift): clicking `Page suivante →` from cursor=X lands on the next 20 rows after X.

## Border-color hover state on collapsed rows

Implemented STATIC border-color (no CSS `:hover` rule):

- Collapsed: `borderColor: 'var(--border)'`
- Expanded: `borderColor: 'var(--teal)'`

The plan's §`<action>` (iii) explicitly identified this trade-off: the project does NOT use CSS modules, and inline-style `:hover` pseudo-classes are impossible in React without injecting a global rule. Per planner's recommendation we accepted the static border. The trigger button's `var(--teal)` text color IS the hover affordance. v1.3+ polish candidate: add `.history-row:hover { border-color: var(--teal) }` to `app/globals.css` if visual designers request it.

## Test count delta

- 4 new tests in `page.test.tsx` (T1 auth gate + T2 cursor decode + T3 list-mount props + T3b header copy) — all 4 pass.
- 13 new tests in `CoefficientHistoryList.test.tsx` (T4-T11 per `<behavior>` + 3 extra: T7b onClose wiring, T9b no-prev-link-on-page-1, row meta render) — all 13 pass.
- **Total Vitest count after Plan 14-05:** 847 pass (+ 4 skipped DB integration unchanged) — up from 830 after Plan 14-04 (+17).

## Verification (all gates green)

- `npx vitest run app/(admin)/[adminSegment]/history` → 25/25 pass (4 page + 13 list + 8 pre-existing diff panel)
- `npm test -- --run` → 847 / 847 pass (4 skipped DB integration unchanged)
- `npm run typecheck` → clean (`_EnHasAllFrKeys` parity proof passes with 8 new keys)
- `npm run lint` → 0 errors, 3 pre-existing warnings in Phase 12 files (out of scope per SCOPE BOUNDARY rule — same set as Plan 14-04 left)
- `npm run build` → clean; `/[adminSegment]/history` appears as `ƒ` (dynamic, server-rendered on demand) in the route manifest
- `grep -q 'listCoefficientHistory' app/(admin)/[adminSegment]/history/page.tsx` → match
- `grep -q 'decodeCoefficientHistoryCursor' app/(admin)/[adminSegment]/history/page.tsx` → match
- `grep -q 'requireAdmin' app/(admin)/[adminSegment]/history/page.tsx` → match
- `grep -q 'expandedRowId' app/(admin)/[adminSegment]/history/CoefficientHistoryList.tsx` → match
- `grep -q 'mode="full"' app/(admin)/[adminSegment]/history/CoefficientHistoryRow.tsx` → match
- `grep -q 'history.title' src/lib/i18n/dictionaries.ts` → match

## D-30 admin-only commission visibility (preserved)

Both surfaces on `/history` MAY render commission percentages — explicitly logged as the D-30 admin-only exception. Both are gated by `requireAdmin()` upstream (the route's defence-in-depth `notFound()` for non-admins per D-18).

| Surface | Renders commission? | Justification |
|---|---|---|
| Collapsed-row HTML (italic `row.summary` text) | YES (when generateDiffSummary includes commission delta) | D-30 admin-only. `row.summary` originates from Phase 12's pure helper consuming admin-edit-time values — no user-controlled input enters the pipeline. T-14-05-03 disposition: mitigate via the admin gate. |
| Expanded-row diff panel HTML | YES (commission_pct row always rendered) | D-30 same gate. T-14-05-04 disposition: accept (explicitly admin-only). Plan 14-04 already locked this behavior with its Test 8 D-30 explicit case. |

Plan 14-06's grep gate will verify the **partner-list** HTML (D-29 strict) does NOT contain commission — a different surface, unaffected by this plan.

## Deviations from Plan

**None.** Plan 14-05 executed exactly as written. Three implementation choices worth noting (all anticipated as planner's discretion):

1. **Previous-page link routes to bare /history (page 1), not an explicit previous-cursor.** Planner explicitly flagged this as a recommendation in `<action>` (ii): "render the left link only when on a non-first page, routed to bare /history". Honored verbatim. Documented above + deferred-ideas below.
2. **Border-color hover on collapsed rows: static, no :hover rule.** Planner flagged this as a known trade-off in `<action>` (iii) — accepted the static border per recommendation. Documented above + deferred-ideas below.
3. **On-expand focus to `Fermer ×` button: NOT implemented.** UI-SPEC §5.3.5 calls for this, but Plan 14-04's CoefficientDiffPanel does not auto-focus the close button on mount. Adding this would require either modifying the Plan 14-04 component (out of scope for this plan) or wiring focus from outside the panel (brittle — the close button has no exposed ref). Left as deferred polish. The collapse-side refocus (trigger button regains focus on close) IS implemented, which is the more important keyboard-navigation leg.

## Deferred ideas

- **Explicit previous-cursor encoding** — v1.3+ if multi-page admin browsing becomes common (>3 pages typical session). Would require tracking the previous cursor server-side and encoding it into the previous-page Link.
- **Border-color hover state on collapsed rows** — v1.3+ polish. Add `.history-row:hover { border-color: var(--teal) }` to globals.css (or a co-located CSS Module) if visual designers request it.
- **On-expand focus to `Fermer ×`** — v1.3+ a11y enhancement. Requires forwarding a ref from `<CoefficientDiffPanel>` to its internal close button (Plan 14-04 modification), then calling `closeBtnRef.current?.focus()` from `<CoefficientHistoryRow>`'s expand-side useEffect.
- **Keyboard arrow-key row navigation** — v1.3+ a11y enhancement. Up/Down arrow could cycle through trigger buttons; Enter expand; Escape collapse (Escape already wired here).
- **Cursor stability under concurrent admin edits** — the cursor encodes `{changedAt, id}` of a row. If an admin saves a new coefficient entry while another admin is paginating, the new row inserts at the top — the existing cursor still points to a valid `(changedAt, id)` tuple but the meaning of "page N" shifts. Acceptable for v1.2 (admin team size = 1-2 humans); revisit if admin team grows or if listCoefficientHistory adds a real-time invalidation channel.

## Self-Check: PASSED

- `app/(admin)/[adminSegment]/history/page.tsx` — FOUND
- `app/(admin)/[adminSegment]/history/page.test.tsx` — FOUND
- `app/(admin)/[adminSegment]/history/CoefficientHistoryList.tsx` — FOUND
- `app/(admin)/[adminSegment]/history/CoefficientHistoryList.test.tsx` — FOUND
- `app/(admin)/[adminSegment]/history/CoefficientHistoryRow.tsx` — FOUND
- `src/lib/i18n/dictionaries.ts` — MODIFIED (8 keys × 2 langs added)
- Commit `1baf55c` (test RED) — FOUND in git log
- Commit `45ed2a9` (feat GREEN) — FOUND in git log

All claimed files exist; both commit hashes are present in `git log`; build + typecheck + lint + 847 vitest tests all green.

## Commits

| # | Hash | Type | Message |
|---|---|---|---|
| 1 | `1baf55c` | test | test(14-05): add failing tests for /history page + CoefficientHistoryList |
| 2 | `45ed2a9` | feat | feat(14-05): ship standalone /history route with cursor pagination + single-active expand |

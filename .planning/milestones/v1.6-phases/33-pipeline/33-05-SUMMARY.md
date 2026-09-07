---
phase: 33-pipeline
plan: 05
subsystem: ui
tags: [react, tailwind, i18n, kanban, sidebar, breadcrumb]

# Dependency graph
requires:
  - phase: 33-pipeline
    plan: 01
    provides: src/lib/pipeline/stages.ts (PipelineStage, isReservedStage, STAGE_DICT_KEY), pipeline.* + sidebar.nav.pipeline dictionary namespace
  - phase: 33-pipeline
    plan: 03
    provides: src/lib/db/queries/pipeline.ts (PipelineCardRow, ConversionRate shapes this plan formats/renders)
provides:
  - src/lib/pipeline/format.ts (formatConversionRate, stageLabel) — pure formatting every pipeline surface resolves copy through
  - app/(authed)/pipeline/PipelineCard.tsx — the relationship card shared by the desktop board and mobile list
  - app/(authed)/pipeline/PipelineColumnHeader.tsx — the three-state (active/terminal/reserved) lane header
  - the reserved-lane drag-refusal CSS rule in app/globals.css
  - Pipeline sidebar entry + /pipeline route-meta breadcrumb
affects: [33-07 (board + mobile list consume PipelineCard/PipelineColumnHeader and the CSS rule for dnd-kit wiring)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Type-only cross-module import to keep a server-only-guarded query module's types usable from client components without dragging the guard into the client bundle"
    - "data-lane-state test hook (reserved/terminal/active) — same discipline as MetricTile's data-variant, asserting semantics not colour classes"

key-files:
  created:
    - src/lib/pipeline/format.ts
    - src/lib/pipeline/format.test.ts
    - app/(authed)/pipeline/PipelineCard.tsx
    - app/(authed)/pipeline/PipelineCard.test.tsx
    - app/(authed)/pipeline/PipelineColumnHeader.tsx
    - app/(authed)/pipeline/PipelineColumnHeader.test.tsx
  modified:
    - app/globals.css
    - src/components/ui/AppSidebar.tsx
    - src/components/ui/AppSidebar.test.tsx
    - src/lib/route-meta.ts
    - src/lib/route-meta.test.ts

key-decisions:
  - "Collapsible-not-Accordion finding recorded in the plan's own decision_record is reconfirmed still true (src/components/ui/accordion.tsx does not exist) — relevant for plan 33-07's Perdu-lane disclosure and mobile stage sections."
  - "Rule 1 auto-fix: AppSidebar.test.tsx's 'Agent view: a non-admin still gets Clients' test asserted toHaveLength(5) — a fifth assertion the plan's task text didn't name but the new Pipeline entry also breaks (that test renders the full non-admin partnerNavItems() array, which now carries 6 items). Updated to toHaveLength(6) alongside the four the plan did name."
  - "PipelineCard/PipelineColumnHeader use an inner `flex flex-col gap-2` wrapper for the card's three stacked rows rather than relying on Card's own `gap-(--card-spacing)` (16px at size=sm) — the UI-SPEC's 8px inter-row gap is tighter than the card's own content spacing, so the two must not share one gap variable."

requirements-completed: [PIPE-02, PIPE-03, PIPE-04]

# Metrics
duration: ~30min
completed: 2026-09-03
---

# Phase 33 Plan 05: Pipeline Presentation Layer & Nav Integration Summary

**Pure conversion-rate/stage-label formatting, the shared `PipelineCard`/`PipelineColumnHeader` components with their three-state lane rendering, the reserved-lane drag-refusal CSS ring, and a Pipeline entry in the partner sidebar + route-meta breadcrumb — everything plan 33-07's board and mobile list will render without inventing presentation of their own.**

## Performance

- **Duration:** ~30 min
- **Tasks:** 3/3 completed
- **Files modified/created:** 11 (6 new, 5 modified)

## Accomplishments

- `src/lib/pipeline/format.ts` — `formatConversionRate(rate, lang)` renders an em dash for a `pct: null` (zero-denominator) rate and the exact Copywriting Contract percent forms otherwise (`"25 %"` fr / `"25%"` en), with a sublabel that always interpolates `{won}`/`{total}` literally, including the zero case (UIC-08). `stageLabel(stage, lang)` is the single resolution point for a stage's display string. 11 test assertions, including a loop over every `PIPELINE_STAGES` member in both langs.
- `app/(authed)/pipeline/PipelineCard.tsx` — server-safe (no `'use client'`, no hooks), renders company name as a `next/link` to `/clients/{relationshipId}` (never `companyId` — T-33-05-01), the SIREN or an em dash, and the counts row with real zeros (UIC-08). 5 test assertions.
- `app/(authed)/pipeline/PipelineColumnHeader.tsx` — branches on `isReservedStage`: reserved lanes (`signe`/`debloque`) render a `BanIcon` + "Réservé" badge and never a digit (T-33-05-03); `perdu` renders the same real count badge as active lanes, muted label only; active lanes render the foreground label + outline count badge. `data-lane-state` (`reserved`/`terminal`/`active`) is the test hook. 5 test assertions.
- `app/globals.css` — the D-09.1 layer-2 reserved-lane drag-in-progress ring rule, appended inside the existing `@layer components` block (before `@theme inline`), using `@apply ring-2 ring-destructive/40 cursor-not-allowed` on `[data-slot="kanban"][data-dragging="true"] [data-slot="kanban-column"][data-disabled="true"]`. Zero new tokens; `--radius` untouched.
- `AppSidebar.tsx` — `pipeline` joined `clients` inside the same `isAdmin ? [] : [...]` spread (one ternary, two entries). Final partner nav order: **Accueil, Nouvelle proposition, Propositions, Clients, Pipeline, Aide** — 6 items, up from 5.
- `route-meta.ts` — `'pipeline'` added to `ActiveNav`; a `/pipeline` branch returns a single non-link breadcrumb crumb (no `hasDetail` fork — no child detail route).

## data-lane-state values (for 33-07)

`reserved` (signe, debloque — no count, "Réservé" badge), `terminal` (perdu — real count, muted label), `active` (the other four — real count, foreground label).

## Task Commits

1. **Task 1: Conversion-rate and stage-label formatting as pure, tested functions** — `36fc5dc` (feat)
2. **Task 2: PipelineCard, PipelineColumnHeader, and the reserved-lane drag-refusal CSS** — `f08d370` (feat)
3. **Task 3: Add Pipeline to the partner sidebar and the route-meta breadcrumb** — `c3ac2f8` (feat)

## Files Created/Modified

- `src/lib/pipeline/format.ts` — `formatConversionRate`, `stageLabel` (new)
- `src/lib/pipeline/format.test.ts` — 11 assertions (new)
- `app/(authed)/pipeline/PipelineCard.tsx` — the shared relationship card (new)
- `app/(authed)/pipeline/PipelineCard.test.tsx` — 5 assertions (new)
- `app/(authed)/pipeline/PipelineColumnHeader.tsx` — the three-state lane header (new)
- `app/(authed)/pipeline/PipelineColumnHeader.test.tsx` — 5 assertions (new)
- `app/globals.css` — the reserved-lane drag-refusal ring rule
- `src/components/ui/AppSidebar.tsx` — `pipeline` nav entry
- `src/components/ui/AppSidebar.test.tsx` — 4 plan-named assertions updated + 1 Rule-1 fix + 1 new admin-hides-pipeline test
- `src/lib/route-meta.ts` — `'pipeline'` `ActiveNav` member + branch
- `src/lib/route-meta.test.ts` — `/pipeline` + `/pipeline/` describe block, added to the breadcrumb-invariant fixture list

## Decisions Made

See `key-decisions` in the frontmatter. Additionally: the plan's own decision record already resolved the reserved-lane visual-muting-vs-toast split (layers 1/2 here, layer 3 in 33-07) and the `Collapsible`-not-`Accordion` question — both re-verified true during this plan (`src/components/ui/accordion.tsx` still does not exist).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `AppSidebar.test.tsx`'s Agent-view non-admin test asserted the pre-change item count**
- **Found during:** Task 3 verification (`npx vitest run src/components/ui/AppSidebar.test.tsx`)
- **Issue:** The plan's task text named four assertions to update (line 79, the FR array, the EN array, line 188). A fifth pre-existing assertion — `'Agent view: a non-admin still gets Clients (ROLE-02 — sales sees what partner sees)'` — also renders the full non-admin `partnerNavItems()` array and asserted `toHaveLength(5)`, which the new Pipeline entry breaks identically to the four named assertions.
- **Fix:** Updated the assertion to `toHaveLength(6)`, with a comment noting why.
- **Files modified:** `src/components/ui/AppSidebar.test.tsx`
- **Verification:** `npx vitest run src/components/ui/AppSidebar.test.tsx` — 23/23 passed.
- **Committed in:** `c3ac2f8` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary to keep the full test suite green per the plan's own `<verification>` block (`npm run test` exits 0). No scope creep — the fix is the same mechanical count update the plan already prescribed for four sibling assertions in the same file.

## Issues Encountered

None beyond the deviation above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `PipelineCard` and `PipelineColumnHeader` are ready for plan 33-07 to compose into the desktop kanban board and `PipelineMobileList`, with `data-lane-state` as the semantic test hook plan 33-07's own board tests should reuse.
- The reserved-lane drag-refusal CSS rule is ready for 33-07's `Kanban` root to drive via `data-dragging`/`data-disabled` — no CSS work remains for D-09.1 layers 1/2; only layer 3 (the `onMove` refusal toast) is 33-07's.
- `/pipeline` is reachable from the sidebar and self-identifies in the shell header/breadcrumb, but the route itself (`app/(authed)/pipeline/page.tsx`) does not exist yet — that is plan 33-07's/33-06's responsibility. Until it lands, the sidebar link 404s for every role, which is expected and does not affect this plan's own tests (they render `AppSidebar` and `route-meta` in isolation, never navigate).

---
*Phase: 33-pipeline*
*Completed: 2026-09-03*

## Self-Check: PASSED

All created files verified present on disk (src/lib/pipeline/format.ts, format.test.ts,
app/(authed)/pipeline/PipelineCard.tsx, PipelineCard.test.tsx, PipelineColumnHeader.tsx,
PipelineColumnHeader.test.tsx) and all task commit hashes (36fc5dc, f08d370, c3ac2f8, 3f525ae)
verified present in git log.

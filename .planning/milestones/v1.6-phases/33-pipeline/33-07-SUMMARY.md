---
phase: 33-pipeline
plan: 07
subsystem: ui
tags: [react, dnd-kit, base-ui, kanban, i18n, pipeline, crm]

# Dependency graph
requires:
  - phase: 33-pipeline
    plan: 01
    provides: src/lib/pipeline/stages.ts (PIPELINE_STAGES, isReservedStage, PARTNER_SETTABLE_STAGES), pipeline.* dictionary namespace
  - phase: 33-pipeline
    plan: 03
    provides: src/lib/db/queries/pipeline.ts (listPipelineBoard, PipelineCardRow — the exact row shape both surfaces render)
  - phase: 33-pipeline
    plan: 04
    provides: src/lib/pipeline/actions.ts (advanceRelationshipStageAction) — the single write path both surfaces call
  - phase: 33-pipeline
    plan: 05
    provides: PipelineCard, PipelineColumnHeader, stageLabel, the reserved-lane drag-refusal CSS rule
provides:
  - app/(authed)/pipeline/PipelineBoard.tsx — the desktop kanban, onMove write path, three-layer reserved-lane drop refusal
  - app/(authed)/pipeline/PipelineMobileList.tsx — sub-md disclosure sections + explicit stage picker
  - handleKanbanMove / handleMobileStageChange — exported, independently testable move handlers sharing one write path
affects: [33-09 (mounts both components on app/(authed)/pipeline/page.tsx and runs the keyboard-drag acceptance checkpoint)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "KanbanItem composed with render={<KanbanItemHandle cursor />} to merge dnd-kit's focus attributes and drag listeners onto one DOM node — verified against the vendored primitive's actual mergeProps precedence (external props win) before writing, not assumed from the plan text alone"
    - "React's documented 'adjust state during render' pattern (compare prop identity, setState conditionally in the render body) used instead of a reseed-on-prop-change useEffect — this repo's eslint --max-warnings=0 gate enforces react-hooks/set-state-in-effect, which the literal plan text's useEffect form violates"
    - "Move-handler logic extracted into a standalone exported async function (handleKanbanMove / handleMobileStageChange) taking columns/setColumns/refresh as arguments, so the three outcome branches (reserved refusal, legal move, rollback) are unit-testable without driving a real dnd-kit drag through jsdom"
    - "Select `items` prop passed up front so Base UI's SelectValue resolves the picked stage's real label on first paint, not the raw enum string — its label-from-item-collection resolution otherwise only populates once the popup has been opened"

key-files:
  created:
    - app/(authed)/pipeline/PipelineBoard.tsx
    - app/(authed)/pipeline/PipelineBoard.test.tsx
    - app/(authed)/pipeline/PipelineMobileList.tsx
    - app/(authed)/pipeline/PipelineMobileList.test.tsx
  modified: []

key-decisions:
  - "KanbanItem/KanbanItemHandle composition: <KanbanItem value={id} render={<KanbanItemHandle cursor />}>. Confirmed by reading base-ui's useRenderElement source (evaluateRenderProp: mergeProps(props, render.props), external wins) and by a throwaway render-only test before writing the real component — the final DOM node carries data-slot=\"kanban-item\" (KanbanItem's own value wins the merge), tabIndex/role/aria-roledescription (KanbanItem's attributes), AND the pointer/keyboard listeners (KanbanItemHandle's own defaultProps, never overridden since KanbanItem's own props never touch onPointerDown/onKeyDown). Keyboard operability (A-5) is verified in test: every card node carries tabIndex, and the merge was confirmed structurally, not just asymptotically inferred."
  - "handleKanbanMove branch order, exactly as the plan specifies: (1) overContainer === activeContainer -> return, no write; (2) isReservedStage(overContainer) -> toast.error(dropRefused), no setColumns, no write; (3) otherwise -> optimistic setColumns, await advanceRelationshipStageAction, refresh() on success (no toast) or setColumns(previous) + toast.error(bounded) on rejection."
  - "Column-width classes: w-[280px] shrink-0 for the five partner-settable stages (including Perdu, per the UI-SPEC's 'de-emphasis is about attention, not width' rule), w-[220px] shrink-0 for the two reserved stages."
  - "Perdu disclosure default: closed (Collapsible open=false initially, controlled via a single perduOpen boolean — there is only ever one Perdu column). The mobile list mirrors this exactly via a Record<PipelineStage, boolean> seeded with perdu: false and the other four partner-settable stages: true."
  - "Prop shape plan 33-09 must pass to both components, byte-identical: { initial: Record<PipelineStage, PipelineCardRow[]>; lang: Lang }. Both components own their own local `columns` state seeded from `initial` and reseed it (via the render-time comparison pattern, not an effect) whenever `initial`'s identity changes, which is what lets a post-move `router.refresh()` reconverge the board/list with the server."
  - "Keyboard-drag end-to-end sequence (Tab -> Space/Enter pick up -> Arrows -> Space/Enter drop -> Escape cancel) is NOT re-verified by an automated test in this plan — jsdom's zero-sized getBoundingClientRect makes dnd-kit's cross-column collision detection unreliable for a scripted assertion. What IS verified in this plan: (a) every card node carries tabIndex via the single-node merge (structural proof the primitive's own mechanism is wired correctly), and (b) all three onMove outcome branches are exercised directly via the exported handleKanbanMove. The full interactive sequence is deferred to plan 33-09's blocking human-verify checkpoint, per this plan's own <verification> block."

requirements-completed: [PIPE-01, PIPE-02, PIPE-04]

# Metrics
duration: ~25min
completed: 2026-09-03
---

# Phase 33 Plan 07: Pipeline Board & Mobile List Summary

**PipelineBoard (desktop kanban, onMove-mode single-mutation write path, three-layer reserved-lane drop refusal, single-node keyboard-operable cards) and PipelineMobileList (disclosure-section + explicit-Select stage picker reaching the identical server action) — both built on plan 33-05's PipelineCard/PipelineColumnHeader, neither mounted yet.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2/2 completed
- **Files modified/created:** 4 (all new)

## Accomplishments

- `app/(authed)/pipeline/PipelineBoard.tsx` — seven fixed-order `KanbanColumn`s inside the vendored `Kanban` root in `onMove` mode, wrapped in a horizontally-scrolling `BoardScrollArea` (Base UI `ScrollArea`, copied near-verbatim from the vetted `deal-pipeline.tsx` reference) so the board scrolls inside the shell's capped `<main>` without ever widening it (UIC-09). Reserved lanes (`signé`/`débloqué`) render only the muted caption on a `bg-muted/40` wash — no `KanbanColumnContent`, nothing sortable. `Perdu` gets a real `KanbanColumnContent` behind a `Collapsible` that starts closed. No `KanbanColumnHandle`, no add-stage control, no per-stage colour dots.
- `handleKanbanMove` — exported standalone async function implementing D-09.2's three branches (same-lane no-op, reserved-drop refusal, legal-move optimistic-update-then-rollback). Wired to the Kanban root's `onMove` prop unchanged; also directly unit-tested without needing a real dnd-kit drag.
- `app/(authed)/pipeline/PipelineMobileList.tsx` — a stack of disclosure sections in fixed stage order. Reserved stages render the shared `PipelineColumnHeader` treatment with no caret and no content region. The other five each hold a `Collapsible` (`Perdu` closed, the rest open) containing the stage's cards, each followed by a `Select` listing all seven stages — the two reserved ones `disabled` with a "(réservé)" suffix, derived from `isReservedStage` rather than hand-listed. Imports nothing from `@dnd-kit/*` or the vendored kanban module (T-33-07-07).
- `handleMobileStageChange` — the mobile analogue of `handleKanbanMove`, calling the identical `advanceRelationshipStageAction` (D-09.2's "one write path, two entry points"). A no-op when the selected stage equals the card's current stage.
- 9 assertions in `PipelineBoard.test.tsx`, 8 in `PipelineMobileList.test.tsx` — both suites mock `@/lib/pipeline/actions`, `sonner`, and `next/navigation` per the plan, and both render the REAL vendored `Kanban`/`Collapsible`/`Select` primitives (confirmed safe in jsdom by a throwaway smoke render before writing the real suites) rather than mocking them away.

## The KanbanItem/KanbanItemHandle single-node composition (for 33-09's keyboard-drag checkpoint)

`<KanbanItem value={row.relationshipId} render={<KanbanItemHandle cursor />}>{card}</KanbanItem>`.

Verified by reading `@base-ui/react`'s `useRenderElement` source directly (not assumed): when a component's `render` prop is a `ReactElement`, `evaluateRenderProp` computes `mergeProps(props, render.props)` — the component's OWN computed props (`props`, first argument) survive over the `render` element's own declared props (`render.props`, second argument, external/loser) for any key the second doesn't also declare. Concretely: `KanbanItem`'s own props (`data-slot="kanban-item"`, `tabIndex`/`role`/`aria-roledescription` via its dnd-kit `attributes`, `ref`, `data-value`) flow through as the base props into `KanbanItemHandle`, and because `KanbanItemHandle` never itself declares those same keys as "external" when computing ITS OWN final `mergeProps(defaultProps, props)` call, the incoming `data-slot="kanban-item"` from `KanbanItem` wins over `KanbanItemHandle`'s own default `data-slot="kanban-item-handle"`. Meanwhile `KanbanItemHandle`'s own `listeners` (from `ItemContext`, the pointer/keyboard drag-start handlers) are declared ONLY in its own `defaultProps` and never touched by the incoming props, so they survive untouched. Result: one DOM node carrying both the focusable attributes AND the drag-start listeners — confirmed with a throwaway render test before writing `PipelineBoard.tsx` for real (`[data-slot="kanban-item"]` present, `tabindex="0"` present, listeners present).

**What this plan proved vs. deferred:** the structural merge (one node, correct attributes) is proven, and every rendered card node carries `tabIndex` per an automated assertion. The full interactive keyboard sequence (Tab → Space/Enter → Arrows → Space/Enter → Escape) needs real pointer/keyboard geometry dnd-kit computes from `getBoundingClientRect`, which jsdom returns as zero-sized — that live verification is 33-09's blocking human-verify checkpoint, exactly as this plan's own `<verification>` block specifies.

## `onMove` branch order (for any future touch on this write path)

1. `overContainer === activeContainer` → return, no state change, no write (same-lane reorder is not a stage change).
2. `isReservedStage(overContainer)` → `toast.error('pipeline.toast.dropRefused')`, no `setColumns` call at all (dnd-kit's own drop animation returns the card to origin), no write.
3. Otherwise → `setColumns` optimistically, `await advanceRelationshipStageAction({ relationshipId, toStage: overContainer })`; success → `refresh()`, no toast; rejection → `setColumns(previous)` + `toast.error('pipeline.toast.error')`.

`handleMobileStageChange` mirrors branch 3 exactly (its "no-op" branch is selecting the current stage, the mobile-picker equivalent of branch 1).

## Prop shape both components share (for 33-09)

```typescript
{ initial: Record<PipelineStage, PipelineCardRow[]>; lang: Lang }
```

Both hold local `columns` state seeded from `initial`, reseeded via a render-time prop-identity comparison (see Deviations) whenever `initial` changes identity — the mechanism that lets a post-move `router.refresh()` reconverge the server-rendered `initial` with local state.

## Task Commits

1. **Task 1: PipelineBoard — the desktop kanban, its single-mutation write path, and the three-layer drop refusal** — `72c3ebb` (feat)
2. **Task 2: PipelineMobileList — disclosure sections and an explicit stage picker** — `e30ae54` (feat)

## Files Created/Modified

- `app/(authed)/pipeline/PipelineBoard.tsx` — desktop kanban (new)
- `app/(authed)/pipeline/PipelineBoard.test.tsx` — 9 assertions (new)
- `app/(authed)/pipeline/PipelineMobileList.tsx` — mobile disclosure list (new)
- `app/(authed)/pipeline/PipelineMobileList.test.tsx` — 8 assertions (new)

## Decisions Made

See `key-decisions` in the frontmatter and the two dedicated sections above (the single-node composition, the `onMove` branch order).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's literal "useEffect that reseeds from initial" trips this repo's `react-hooks/set-state-in-effect` lint gate**
- **Found during:** Task 1, `npm run lint:check`
- **Issue:** The plan's action text specifies `useState(initial)` plus "a `useEffect` that reseeds local state when `initial` changes". Writing that literally (`useEffect(() => setColumns(initial), [initial])`) fails this repo's `eslint --max-warnings=0` gate under `react-hooks/set-state-in-effect`, which forbids a synchronous `setState` call inside a `useEffect` body (the rule's own guidance: effects should synchronize with external systems, not derive React state from React props — see https://react.dev/learn/you-might-not-need-an-effect).
- **Fix:** Replaced the `useEffect` with React's own documented alternative — comparing the incoming `initial` prop against a `prevInitial` state value DURING RENDER and calling `setColumns`/`setPrevInitial` conditionally in the render body (not inside an effect). This achieves the byte-identical reseed-on-identity-change behavior the plan specifies, with zero effect involved. Applied identically in both `PipelineBoard.tsx` and `PipelineMobileList.tsx`.
- **Files modified:** `app/(authed)/pipeline/PipelineBoard.tsx`, `app/(authed)/pipeline/PipelineMobileList.tsx`
- **Verification:** `npm run lint:check` exits 0; `npm run typecheck` exits 0; both test suites' structural assertions (which depend on `initial` seeding `columns` correctly) pass.
- **Committed in:** `72c3ebb` (Task 1), `e30ae54` (Task 2)

---

**Total deviations:** 1 auto-fixed (1 bug), applied identically in both files
**Impact on plan:** Necessary to keep `npm run lint:check` — a hard project constraint and this plan's own mandatory verification step — at exit 0. No behavioral change: the reseed-on-identity-change contract 33-09 needs is preserved exactly.

## Issues Encountered

- **Base UI's `Select.Value` does not resolve a picked item's label until the popup has been opened at least once**, since its value→label registry populates from the rendered `Select.Item`s inside the (lazily-mounted) popup content. Without a fix, the mobile picker's trigger would show the raw stage enum string (e.g. `"prospect"`) on first paint instead of "Prospect". Fixed by passing the `items` prop (a `Record<PipelineStage, string>` built via `stageLabel`) to the `Select` root up front — this is a `Select` API feature specifically for this case, not a workaround. Not a plan deviation (the plan's own `<read_first>` directed reading `select.tsx`'s real API "before writing props," which is exactly what surfaced this).
- **Base UI's `Select` needs a full pointer-event sequence (`pointerdown` + `pointerup` + `click`) to open and select an option in jsdom** — a bare `fireEvent.click` alone does not register with its interaction layer. Discovered via a throwaway smoke test before writing the real suite; documented as a comment at the top of `PipelineMobileList.test.tsx` for future maintainers.
- **`vi.waitFor` does not flush React's scheduled re-render the way `@testing-library/react`'s `waitFor` does** (the latter wraps polling in `act()`). An initial rollback-assertion test failed because it read the DOM before React had actually re-rendered post-rollback, even though the mocked `toast.error` had already been called synchronously in the same tick. Switched to `@testing-library/react`'s `waitFor`.

## User Setup Required

None — no external service configuration required. Neither `--kanban.tsx` nor any dependency was touched (`git diff package.json package-lock.json components.json src/components/reui/kanban.tsx` empty, verified — T-33-07-SC and the vendored-primitive-untouched requirement).

## Next Phase Readiness

- `PipelineBoard` and `PipelineMobileList` are both complete, tested, and export the exact prop shape (`{ initial, lang }`) plan 33-09's `app/(authed)/pipeline/page.tsx` needs to pass in — `hidden md:block` / `block md:hidden` per 33-UI-SPEC, one server-fetched `initial` shared by both.
- The full manual keyboard-drag sequence and the horizontal-scroll-at-laptop-width behavior remain plan 33-09's blocking human-verify checkpoint items, exactly as this plan's own `<verification>` block specifies — nothing here should be read as having exercised the live interactive sequence.
- `handleKanbanMove` and `handleMobileStageChange` are both exported and independently testable; Phase 34's future work (ACTV-02) can continue to treat `advanceRelationshipStageAction` as the single stage-write call site — this plan added zero new call sites to it (`grep -c` proofs hold: 2 occurrences per file, one import + one call, in both `PipelineBoard.tsx` and `PipelineMobileList.tsx`).

---
*Phase: 33-pipeline*
*Completed: 2026-09-03*

## Self-Check: PASSED

All created files verified present on disk (app/(authed)/pipeline/PipelineBoard.tsx,
PipelineBoard.test.tsx, PipelineMobileList.tsx, PipelineMobileList.test.tsx) and both
task commit hashes (72c3ebb, e30ae54) verified present in git log.

---
phase: 34-fiche-client
plan: 11
subsystem: ui
tags: [react, client-component, timeline, reui, i18n, forms, tdd]

# Dependency graph
requires:
  - phase: 34-05
    provides: "RelationshipEventListRow (owner-scoped, ordered occurred_at DESC) on the queries barrel"
  - phase: 34-06
    provides: "addRelationshipNoteAction and addNoteSchema (body capped, occurredAt optional and coerced)"
  - phase: 34-03
    provides: "the vendored ReUI timeline primitives and the solution-crm-5 composition reference"
  - phase: 34-01
    provides: "the clients.timeline.* dictionary keys, EVENT_KIND_DICT_KEY, SYSTEM_EVENT_KINDS, isSystemEventKind"
  - phase: 33-05
    provides: "STAGE_DICT_KEY / PIPELINE_STAGES for resolving a stage_changed payload to a label"
provides:
  - "ActivityTimeline — the day-bucketed, type-filtered single stream (ACTV-01, ACTV-02)"
  - "NoteComposer — the in-place dated note form (ACTV-03)"
  - "data-testid=\"timeline-event\" + data-event-id / data-event-kind as the addressable row handles"
  - "data-testid=\"timeline-bucket\" + data-bucket as the addressable bucket handles"
  - "data-testid=\"timeline-actor\" as the attribution handle"
affects: [34-12 (mounts both in the Activité tab), 34-13 acceptance walkthrough]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "type filter as a LENS: one array narrowed in place, asserted by an all → notes → all DOM-order equality test"
    - "day buckets derived from a server-read nowMs prop, stepped with setDate so a DST day does not shift a bucket"
    - "jsonb payload read through a value-level guard against the known vocabulary, never trusted as typed"
    - "blank <input type=\"date\"> normalised to undefined via register({ setValueAs }) so an optional coerced date is ABSENT, not ''"

key-files:
  created:
    - "app/(authed)/clients/[id]/ActivityTimeline.tsx"
    - "app/(authed)/clients/[id]/ActivityTimeline.test.tsx"
    - "app/(authed)/clients/[id]/NoteComposer.tsx"
    - "app/(authed)/clients/[id]/NoteComposer.test.tsx"
  modified: []

key-decisions:
  - "The timeline lives under app/(authed)/clients/[id]/ and imports the ReUI primitives directly. It imports nothing from the vendored block tree, which is ESLint-excluded for both the import-restriction and the SHELL-06 hardcoded-text layers — a timeline living there would ship untranslated copy with no gate catching it, and would be lost on the next registry refresh."
  - "The type filter narrows ONE array in place. Test 3 asserts all → notes → system → all reproduces the identical DOM order, which two rendered lists behind a visibility toggle cannot satisfy."
  - "Timeline is rendered with value={0} so no item receives the data-completed accent border. The vendored demo passes defaultValue={entries.length} (every item completed), which would paint every indicator with --primary and spend UIC-03's accent reserve on ornament."
  - "No vendored file was edited. No row was added to UI-CONVENTIONS' re-import table, because there is nothing to re-apply."
  - "A stage_changed event whose payload lacks a usable fromStage drops the sentence entirely and falls back to the plain kind label, rather than printing an interpolated null."
  - "No per-event edit or delete control exists (T-34-11-07). D-14 provides no update path and ACTV-01 describes a record."
  - "The composer's catch block resets nothing — the typed body survives a rejected submit — and inspects nothing about what it caught."

patterns-established:
  - "Lens-not-list assertion: prove a filter is a lens by comparing the DOM order before filtering and after returning to the unfiltered state, rather than only asserting what is hidden."
  - "Comment-vs-grep discipline: when an acceptance criterion counts occurrences of a literal, the file's own prose names the thing without quoting the literal (this file's header says 'the vendored solution-crm-5 demo' and 'the vendored tree', never the path)."

requirements-completed: [ACTV-01, ACTV-02, ACTV-03]

# Metrics
duration: 11min
completed: 2026-09-03
---

# Phase 34 Plan 11: The Activité surface — Summary

**A relationship's notes and system events now render as one chronological stream, day-bucketed and filterable by a lens that never splits it in two, with every actor attributed and a dated note addable in place without leaving the page.**

## Performance

- **Duration:** ~11 min
- **Started:** 2026-09-03T20:42Z
- **Completed:** 2026-09-03T20:53Z
- **Tasks:** 2/2
- **Files modified:** 4 (4 created, 0 modified)

## Task Commits

1. **Task 1: ActivityTimeline — one stream, day buckets, type filter (TDD)**
   - RED — `92549cb` (`test(34-11): pin the single timeline's order, attribution and buckets`)
   - GREEN — `1091b5c` (`feat(34-11): render the relationship's activity as one filtered stream`)
2. **Task 2: NoteComposer — adding a dated note in place (TDD)**
   - RED — `00445fb` (`test(34-11): pin the note composer's loss-free failure path`)
   - GREEN — `d2f7a11` (`feat(34-11): let a partner record a dated note without leaving the client`)

No REFACTOR commit on either task: neither GREEN left duplication or dead shape behind.

## Prop shapes (plan 34-12 mounts both)

```ts
export interface ActivityTimelineProps {
  /** Already owner-scoped and already ordered occurred_at DESC — in SQL (34-05). */
  events: RelationshipEventListRow[];
  relationshipId: string;
  lang: Lang;
  /** Unix-ms "now", read from the clock ONCE on the server and passed down. */
  nowMs: number;
}

export interface NoteComposerProps {
  relationshipId: string;
  lang: Lang;
}
```

Both are `'use client'`. `ActivityTimeline` renders the `clients.timeline.title` heading; `NoteComposer` renders the form only. The parent mounts the composer **above** the timeline.

`relationshipId` on the timeline is not decorative — it is the suffix of the section's
`aria-labelledby` id (`activity-timeline-title-{relationshipId}`), so the declared prop is a
real binding rather than an unused destructure that `--max-warnings=0` would reject.

## ReUI primitives used, and whether anything was edited

| Primitive | Used for |
|---|---|
| `Timeline` | one per day bucket, `value={0}` |
| `TimelineItem` | one per event, `step={index + 1}` |
| `TimelineHeader` | title + separator + indicator row |
| `TimelineSeparator` | the connecting rule, forced to `bg-border!` (the demo's own override) |
| `TimelineIndicator` | the per-kind glyph in a 24px neutral disc |
| `TimelineTitle` | `EVENT_KIND_DICT_KEY[kind]` |
| `TimelineContent` | actor + timestamp + detail line |
| `TimelineDate` | the timestamp, as a real `<time dateTime>` |

Non-timeline reuse: `ToggleGroup` / `ToggleGroupItem` for the segmented filter (its first
call site in app code), `Empty` / `EmptyMedia variant="icon"` / `EmptyDescription` for UIC-05,
product icons from `@/components/ui/icons` for the per-kind glyphs (UIC-07 tier 1 — the demo's
Hugeicons are tier 2, vendored-internal only).

**Nothing under `src/components/reui/` or the vendored block tree was edited.** `git diff` on both
trees is empty, so **no row was added** to UI-CONVENTIONS' "Vendored ReUI modifications to re-apply
after any re-import" table — there is nothing to re-apply. `src/components/ui/select.tsx` (the
directive contested between the two vendored blocks) was **not touched**: the filter is a
`ToggleGroup`, not a `Select`.

`Timeline` is rendered with **`value={0}`** rather than the demo's `defaultValue={entries.length}`.
The demo marks every item "completed", which paints each indicator `border-primary`; UIC-03 reserves
`--primary` for the surface's one CTA, so every step stays un-completed and the stream sits entirely
in the neutral tier. Kinds are differentiated by **glyph and type weight only**.

## Bucket boundaries and the `nowMs` contract

`nowMs` is a **Unix-ms instant read once on the server** by the page that renders the timeline —
the same contract as `ProposalRow` and 34-09's `RelanceCard`. The component contains no clock read
of any kind (asserted structurally: the source matches neither `Date.now()` nor a bare `new Date()`).
34-12's page must obtain it through the module-level `async function getNowMs()` helper shape that
`app/(authed)/proposals/[id]/page.tsx:24` established — `react-hooks/purity` rejects the inline form
even in a server component.

| Bucket | Condition (all comparisons between **local day boundaries**) |
|---|---|
| `today` | `startOfDay(occurredAt) >= startOfDay(nowMs)` — includes a same-day instant later than `nowMs` |
| `yesterday` | `startOfDay(occurredAt) >= startOfDay(nowMs, -1)` |
| `earlier` | everything older |

Buckets render in `today → yesterday → earlier` order and an **empty bucket renders nothing at all**
— no heading with no rows under it. The previous day's boundary is stepped with `setDate(-1)` rather
than by subtracting 86 400 000 ms, so a 23-hour or 25-hour DST day does not shift a row into the
wrong bucket. The timeline **never re-sorts**: the order is `listRelationshipEvents`' `occurred_at
DESC`, and bucketing is a partition of that order, not a second sort.

## `stage_changed` and the null `fromStage`

`payload` is `jsonb`, so nothing about its shape is guaranteed by the type system. Each end is read
through a guard that returns a `PipelineStage` only when the value is a string **and** a member of
the seven-value vocabulary; anything else is `null`.

- **Both ends present** → `clients.timeline.event.stageChanged` interpolated **at the call site**
  via `.replace('{0}', …).replace('{1}', …)`, each stage resolved through Phase 33's
  `STAGE_DICT_KEY`. The raw storage strings (`negociation`, `proposition_envoyee`, …) never reach
  the screen — test 6 asserts it.
- **`fromStage` null** (an event written before 34-08 put both ends in the payload) → the sentence
  is **dropped entirely** and the row falls back to its plain kind label ("Changement d'étape").
  Test 7 asserts the row contains neither `"null"` nor an un-replaced `{0}`.

The same guard means a stage value that is retired from the vocabulary in some future migration
degrades to the kind label instead of rendering a raw enum string.

## Attribution (ACTV-02, T-34-11-02)

`event.actorDisplayName ?? t('clients.timeline.actor.system', lang)` — one expression, one
occurrence, grep-asserted to exactly 1. A null actor is **the system**, never a blank author, never
"unknown", and never the reader's own name. Test 4 asserts the rendered actor node is non-empty,
carries the system label, and that the row matches neither `/inconnu/i` nor `/unknown/i`.

## Untrusted text (T-34-11-01, D-10)

Note bodies (partner-authored) and payload-derived text both render as React **children**.
`dangerouslySetInnerHTML` is grep-asserted absent, and test 11 renders a body of
`<script>alert(1)</script>`, asserting it appears as visible text, that `container.querySelector('script')`
is null, and that the serialised HTML contains `&lt;script&gt;`.

## The composer's failure path

On success: toast `clients.timeline.note.toast.added`, `reset()`, `router.refresh()`.
On failure: toast `relationship.toast.error` and **nothing else** — no reset, so the partner's
paragraph survives a network blip. Test 5 asserts the exact typed string is still in the field and
that `router.refresh()` was not called.

The catch block **inspects nothing** about what it caught (D-24 / 33-REVIEW CR-01). Grepped 0 in
this plan's acceptance criteria and covered globally by `tests/server-action-error-contracts.test.ts`,
which passes.

**The optional date is ABSENT when blank, not `null` and not `''`.** An empty `<input type="date">`
posts `''`, and `addNoteSchema.occurredAt` is `z.coerce.date().optional()` — `new Date('')` is an
Invalid Date, so `''` would *fail the parse* rather than mean "now". It is normalised at
registration (`register('occurredAt', { setValueAs: v => v === '' ? undefined : v })`) and the key
is then spread in only when a date was picked, so "now" is resolved in SQL by
`insertRelationshipEventForOwner`. Test 3 asserts `'occurredAt' in arg === false` for the undated
case — an assertion `toBeUndefined()` would have passed for all three wrong spellings.

## Verification

| Gate | Result |
|---|---|
| `npx vitest run ActivityTimeline.test.tsx` | 11/11 passed |
| `npx vitest run NoteComposer.test.tsx` | 7/7 passed |
| `npx vitest run tests/server-action-error-contracts.test.ts tests/vendored-ui-integrity.test.ts` | 8/8 passed |
| `npm run typecheck` | exit 0 |
| `npm run lint:check` | exit 0 (`eslint . --max-warnings=0`) |
| `npm run test` | exit 0 — **2164 passed**, 38 skipped (integration, no `DATABASE_URL_TEST`), 162 files |
| `git diff package.json package-lock.json` | empty (T-34-11-SC — no new dependency) |
| `git diff src/components/blocks/ src/components/reui/` | empty |

### Acceptance greps

| Criterion | Expected | Actual |
|---|---|---|
| `grep -c "@/components/reui/timeline" ActivityTimeline.tsx` | 1 | 1 |
| `grep -c "components/blocks" ActivityTimeline.tsx` | 0 | 0 |
| `grep -c "Date.now()" ActivityTimeline.tsx` | 0 | 0 |
| `grep -c "clients.timeline.actor.system" ActivityTimeline.tsx` | 1 | 1 |
| `grep -cE "dangerouslySetInnerHTML" ActivityTimeline.tsx` | 0 | 0 |
| `ActivityTimeline.tsx` line count | ≥ 140 | 310 |
| `grep -cE "e\.message\|err\.message\|error\.message" NoteComposer.tsx` | 0 | 0 |
| `grep -c "addRelationshipNoteAction" NoteComposer.tsx` | 2 | 2 |
| `NoteComposer.tsx` line count | ≥ 70 | 143 |

`npm run build` was **deliberately not run** — the orchestrator builds once when the wave closes,
and a build running beside a live `next dev` freezes `globals.css` recompiles (a recorded incident).

## Deviations from Plan

### Adjustments made while executing

**1. [Rule 3 — blocking] The blank date input needed a `setValueAs` normalisation the plan did not specify.**
- **Found during:** Task 2, writing the GREEN implementation against test 3.
- **Issue:** `addNoteSchema.occurredAt` is `z.coerce.date().optional()`. An untouched
  `<input type="date">` registers as `''`, which coerce turns into an Invalid Date and the resolver
  rejects — so *every* undated note would have failed validation, which is the common case.
- **Fix:** `register('occurredAt', { setValueAs: (v) => (v === '' ? undefined : v) })`, plus a
  conditional spread so the key is omitted rather than sent as `undefined`.
- **Files:** `app/(authed)/clients/[id]/NoteComposer.tsx`
- **Commit:** `d2f7a11`

**2. `Timeline` is rendered with `value={0}` instead of the demo's `defaultValue={entries.length}`.**
- **Why:** the demo marks every step "completed", which resolves the indicator to `border-primary`.
  UIC-03 reserves the accent; the plan's own `<action>` says differentiate by glyph and weight and
  do not introduce a per-kind accent. `value={0}` keeps the whole stream in the neutral tier without
  editing the vendored primitive.

**3. One `<Timeline>` element per day bucket, following the vendored composition.**
- **Why:** this is `solution-crm-5`'s own shape and D-19 says adapt by reuse. It is not the
  "two lists" ACTV-01 forbids: the split is by **day**, never by note-vs-system, and the buckets
  partition a single already-ordered array. The forbidden shape is guarded by test 3's DOM-order
  equality assertion, not by the element count.

**4. `relationshipId` is consumed as the `aria-labelledby` id suffix.**
- **Why:** the plan mandates the prop but the timeline needs no id to render. Declared-and-unused
  would trip `--max-warnings=0`; making it the heading's unique id is a real use that also makes the
  section correctly labelled when two client pages are ever rendered in one tree.

### Comment wording (the recurring trap this phase)

`ActivityTimeline.tsx`'s header comment explains its provenance without ever quoting the literals
its acceptance criteria count. It says "the vendored `solution-crm-5` demo" and "the vendored tree"
rather than the path, and "a clock read inside a component body" rather than the call expression.
This is the fourth time in phase 34 that a doc comment would otherwise have tripped an
occurrence-counting criterion; the comment was reworded rather than the check weakened, per the
precedent already recorded in `src/lib/relationship/actions.ts`'s own header and in 34-05.

### Not done, deliberately

- **`npm run build`** — excluded by the orchestrator; the wave closes with a single build.
- **`requirements mark-complete`** — excluded by the orchestrator.
- **`STATE.md` / `ROADMAP.md` / `REQUIREMENTS.md` updates and the usual `docs(...)` metadata
  commit covering them** — plan 34-10 was executing concurrently in the same working tree, and
  those three files are shared, not owned by this plan. Two executors advancing the plan counter
  and rewriting the progress bar at the same time is a lost-update race, so shared-state
  advancement is left to the orchestrator that closes wave 5. Only this SUMMARY is committed here.

### Concurrency notes (plan 34-10 running in parallel)

- Every commit staged **only** this plan's four files by explicit path. No `git add -A`, no
  `git add .`, no `-a`, no amend, no rebase, no reset.
- One transient `npm run typecheck` failure was observed at 20:47Z:
  `EditCompanyDialog.test.tsx … Cannot find module './EditCompanyDialog'` — plan 34-10's RED test
  landed before its GREEN implementation. Not touched, not fixed. Re-run at 20:52Z after the
  sibling's GREEN commit: exit 0.
- `src/components/ui/select.tsx` was **not touched**.

## Self-Check: PASSED

**Files claimed as created — all present on disk:**

- FOUND: `app/(authed)/clients/[id]/ActivityTimeline.tsx`
- FOUND: `app/(authed)/clients/[id]/ActivityTimeline.test.tsx`
- FOUND: `app/(authed)/clients/[id]/NoteComposer.tsx`
- FOUND: `app/(authed)/clients/[id]/NoteComposer.test.tsx`

**Commits claimed — all present in git history:**

- FOUND: `92549cb` — `test(34-11): pin the single timeline's order, attribution and buckets`
- FOUND: `1091b5c` — `feat(34-11): render the relationship's activity as one filtered stream`
- FOUND: `00445fb` — `test(34-11): pin the note composer's loss-free failure path`
- FOUND: `d2f7a11` — `feat(34-11): let a partner record a dated note without leaving the client`

**Gates proven green together at `d2f7a11`:**

- `npm run typecheck` → exit 0
- `npm run lint:check` → exit 0
- `npm run test` → exit 0, **2164 passed / 38 skipped / 0 failed** across 162 files
- `npm run build` → not run (orchestrator builds at wave close, by instruction)

**TDD gate compliance:** both tasks show a `test(...)` commit followed by a `feat(...)` commit.
RED was confirmed failing before each GREEN (module-resolution failure, then 11/11 and 7/7 green).

## Known Stubs

None. Both components render real data end to end; neither ships a hardcoded empty value, a
placeholder string, or a component with no data source. They are simply not mounted yet — plan
34-12 mounts them in the Activité tab, which the plan states as its intended output, not as a stub.

## Threat Flags

None. No new network endpoint, auth path, file access pattern or schema change. Both components are
pure render-and-submit surfaces over data and actions that plans 34-05 and 34-06 already secured.

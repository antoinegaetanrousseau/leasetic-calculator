---
phase: 35-sales-motivation
reviewed: 2026-09-05T09:56:49Z
depth: deep
files_reviewed: 15
files_reviewed_list:
  - src/lib/momentum/types.ts
  - src/lib/momentum/window.ts
  - src/lib/momentum/window.test.ts
  - src/lib/momentum/badges.ts
  - src/lib/momentum/badges.test.ts
  - src/lib/db/queries/momentum.ts
  - src/lib/db/queries/momentum.test.ts
  - src/lib/db/queries/momentum.isolation.integration.test.ts
  - src/lib/db/queries/index.ts
  - app/(authed)/_components/MomentumCard.tsx
  - app/(authed)/_components/MomentumCard.test.tsx
  - app/(authed)/page.tsx
  - app/(authed)/page.test.tsx
  - src/lib/i18n/dictionaries.ts
  - app/globals.css
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 35: Code Review Report

**Reviewed:** 2026-09-05T09:56:49Z
**Depth:** deep
**Files Reviewed:** 15
**Status:** issues_found

## Summary

This review prioritised the phase's own stated risk order: owner scoping across the three
`src/lib/db/queries/momentum.ts` functions, the admin gate in `app/(authed)/page.tsx`, the
Europe/Paris week-window half-open boundary, and SQL composition safety.

**Owner scoping (CRM-02/GAME-04):** verified independently for all three exported functions.
Each issues exactly one statement with the owner predicate (`eq(schema.clientRelationships.ownerId,
ownerId)`) composed in the same `where(and(...))` as every other predicate — no pre-check, no
post-query filter. The real-Postgres isolation suite
(`momentum.isolation.integration.test.ts`) independently proves this at runtime, including
through a company two partners both hold, which is the sharpest leak shape. No defect found here.

**Admin gate (D-15):** verified both halves. `page.tsx` computes `isAdmin` from `role` before
building the `Promise.all` tuple, and gates the three momentum queries behind
`isAdmin ? null : Promise.all([...])` — so the queries genuinely never resolve for an admin, not
merely their result being discarded. The render is separately gated by `{!isAdmin && momentum &&
<MomentumCard .../>}`. `page.test.tsx` asserts both halves (`toHaveBeenCalledTimes(0)` and the
absence of the zero-state copy string). No defect found here.

**Week boundary / timezone:** `currentWeekWindow` produces a half-open `[start, end)` window
anchored to Europe/Paris Monday 00:00, consumed via `gte(...start)` / `lt(...end)` (never `lte`)
in `listWeeklyMovementsForOwner`. DST transitions are exercised by dedicated unit tests (167h
spring / 169h autumn) and the integration suite's win/prevWin/prev2Win/prev3Win fixtures walk
backward one `currentWeekWindow` call at a time rather than subtracting raw milliseconds. No
off-by-one or DST defect found.

**SQL composition:** all dynamic SQL uses parameterised `sql` template values
(`sql\`${value}\``) — no `sql.raw`, no string concatenation of user- or DB-derived values into
SQL text. `'perdu'` and the pipeline-stage vocabulary are developer-authored literals, not
externally controlled input, so their inline appearance in the `IS_PROGRESS_EVENT` fragment is
not an injection vector.

The two WARNINGs below concern a real, if currently unreached, gap: `MomentumCard.tsx` branches
on `row.kind === 'stage_changed' && row.toStage` (a truthiness check) rather than on `row.kind`
alone, with no validation of `payload->>'toStage'` at the query layer. This is inert today only
because the single write path (`src/lib/pipeline/actions.ts`) always writes a `toStage` drawn
from a Zod-validated enum — but nothing in this phase's code enforces that invariant at the read
or render layer, and a violation crashes the whole Server Component render, not just the card.

## Warnings

### WR-01: A `stage_changed` movement with a falsy `toStage` silently renders as "proposal finalized"

**File:** `app/(authed)/_components/MomentumCard.tsx:145-155`
**Issue:** `movementCopy` branches on `row.kind === 'stage_changed' && row.toStage` rather than on
`row.kind` alone:
```ts
if (row.kind === 'stage_changed' && row.toStage) {
  // "Dupont → Négociation, mardi"
} else {
  // "Dupont — proposition envoyée, mardi"
}
```
If a `stage_changed` event ever reaches this component with a null/empty `toStage` (the query
layer performs no validation — `src/lib/db/queries/momentum.ts:115` casts
`payload->>'toStage'` straight through as `string | null`), the row is mislabeled as a proposal
finalization instead of a stage change. This is a silent data-integrity bug: the partner sees an
incorrect, confident-sounding sentence about their own book with no error surfaced anywhere.
Currently unreachable because the only write path (`src/lib/pipeline/actions.ts:148`) always
populates `toStage`, but nothing in this module enforces that invariant, and there is no test
covering the fallback branch for this shape.
**Fix:** Branch on `row.kind` explicitly and treat a `stage_changed` row with no usable `toStage`
as its own (logged or clearly-labeled) case rather than silently reusing the `proposal_finalized`
copy:
```ts
if (row.kind === 'proposal_finalized') {
  full = t('dashboard.momentum.move.proposalFinalized', lang)...
} else if (row.kind === 'stage_changed' && row.toStage) {
  full = t('dashboard.momentum.move.stageChanged', lang)...
} else {
  // Explicit, logged fallback — never silently reuse another kind's copy.
}
```

### WR-02: An unrecognized `toStage` value crashes the entire home-page render, not just the card

**File:** `app/(authed)/_components/MomentumCard.tsx:146`
**Issue:** `t(STAGE_DICT_KEY[row.toStage], lang)` assumes `row.toStage` is always one of the
seven values `STAGE_DICT_KEY` (`src/lib/pipeline/stages.ts:58`) covers. If `payload->>'toStage'`
ever contains a value outside that set (legacy data, a future write path, manual DB edit,
migration artifact), `STAGE_DICT_KEY[row.toStage]` is `undefined`, `t(undefined, lang)` returns
`undefined` (via `dictionaries[lang][key] ?? dictionaries.fr[key]`, both undefined for an unknown
key), and `undefined.replace(...)` throws a `TypeError`. Because `MomentumCard` is rendered
inline inside the `HomePage` Server Component with no error boundary around it, this throws
during the render of the whole page — the partner sees a full crash, not a degraded card. There
is no test exercising this path (all fixtures use valid `PipelineStage` values), and the query
layer (`src/lib/db/queries/momentum.ts`) performs no runtime validation of the JSONB payload
before casting it to `PipelineStage | null`.
**Fix:** Validate defensively at the point of use rather than trusting the cast:
```ts
const stageLabel = row.toStage && row.toStage in STAGE_DICT_KEY
  ? t(STAGE_DICT_KEY[row.toStage], lang)
  : null;
if (row.kind === 'stage_changed' && stageLabel) {
  full = t('dashboard.momentum.move.stageChanged', lang)
    .replace('{0}', row.companyName)
    .replace('{1}', stageLabel)
    .replace('{2}', weekday);
} else { /* explicit fallback, never a bare crash */ }
```

## Info

### IN-01: Redundant `!isAdmin` check alongside the already-null-gated `momentum` value

**File:** `app/(authed)/page.tsx:158`
**Issue:** `{!isAdmin && momentum && <MomentumCard .../>}` checks `isAdmin` a second time even
though `momentum` is already guaranteed `null` whenever `isAdmin` is true (the IIFE at line
105-118 returns `null` unless `momentumData` — itself gated by `isAdmin ? null : Promise.all(...)`
— is present). This isn't wrong, but it creates two places that encode the same gate, which is
exactly the "second surface to secure" pattern the phase's own comments (D-15) warn against
elsewhere on this page. A future edit to one without the other would be easy to miss.
**Fix:** Drop the redundant check and rely on the single source of truth: `{momentum &&
<MomentumCard .../>}`.

### IN-02: `BADGE_THRESHOLDS` is exported as a mutable object

**File:** `src/lib/momentum/badges.ts:23-27`
**Issue:** `BADGE_THRESHOLDS` is the single source of truth for every badge tier threshold
(GAME-03), read by `deriveBadgeProgress` on every request, but it is a plain exported object with
no `Object.freeze`. Any importing module (test or production code) that mutates a nested value
(e.g. `BADGE_THRESHOLDS.wins.bronze = 0`) would silently change the game rules for every user in
the same process for the remainder of its lifetime, with no compiler or runtime signal.
**Fix:** `export const BADGE_THRESHOLDS = Object.freeze({ clients: Object.freeze({...}), ... })`
or a shallow `Object.freeze` at each level, so an accidental mutation throws in strict mode
instead of silently drifting.

---

_Reviewed: 2026-09-05T09:56:49Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_

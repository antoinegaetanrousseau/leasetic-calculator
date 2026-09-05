---
phase: 35-sales-motivation
verified: 2026-09-05T09:53:34Z
status: passed
score: 9/9 must-haves verified
overrides_applied: 0
---

# Phase 35: Sales Motivation Verification Report

**Phase Goal:** A partner sees their own book gaining momentum — what moved and
when, streaks of sustained activity, and badges for milestones reached — so the
pipeline is something they want to keep current rather than a form they have to
maintain.

**Verified:** 2026-09-05T09:53:34Z
**Status:** passed
**Re-verification:** No — initial verification

**Amendment context applied.** D-19 ("same visual restraint") was superseded by
D-19a (operator, 2026-09-05); the momentum card's gamified visual treatment
(tier colour, badge tiles, progress tracks, greater prominence) was judged
against D-19a, not the superseded restraint budget, per the critical context
supplied with this verification task. Everything D-19a did NOT amend (GAME-04
no-leaderboard, GAME-03 all-rungs-readable, D-11 no-penalty-framing, D-12
always-visible break condition, D-14/D-16 permanent footer lines, D-15
admin-absence, D-03/D-23 no persistence) was verified against the original,
unamended text.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | A partner sees the specific deals that moved this week (GAME-01) | ✓ VERIFIED | `listWeeklyMovementsForOwner` (`src/lib/db/queries/momentum.ts:101-150`) reads `relationship_events` joined to `client_relationships`/`companies`, owner-scoped, window-filtered; rendered by `MomentumCard`'s "Cette semaine" section (`app/(authed)/_components/MomentumCard.tsx:348-393`) as company-name + stage/weekday rows linking to `/clients/{id}`. Proven against real Postgres in `momentum.isolation.integration.test.ts` assertions 1–4. |
| 2 | A partner sees a streak of consecutive weeks of real progress and what would break it (GAME-02) | ✓ VERIFIED | `summarizeStreaks` (`src/lib/momentum/badges.ts:56-106`) folds progress week-keys into current/longest streaks with the documented two-branch "alive vs broken" rule; `MomentumCard` renders the break-condition sentence unconditionally in every state (test 2/3, page.tsx wiring). Streak-fold unit tests (`badges.test.ts`, 12 cases per 35-01-PLAN) cover the alive/broken/longest-survives-a-break cases. |
| 3 | A partner earns badges for milestones, every criterion readable earned or not (GAME-03) | ✓ VERIFIED | `deriveBadgeProgress` always returns 3 axes × 3 tiers (`badges.ts:118-139`); `MomentumCard`'s `BadgeAxisRow` renders all nine rungs unconditionally with visible threshold text for both earned and unearned tiers (no lock/blur/hide) — asserted by `MomentumCard.test.tsx` case 7 (`zeroRungs.length === 9`, non-empty text on every unearned rung) and case 7b (progress fraction, graceful all-earned state). D-19a's tier tiles do not hide any criterion — confirmed by reading the component: unearned tiles render a hollow ring + full text, never a lock glyph. |
| 4 | No leaderboard, ranking, peer benchmark, team aggregate, or cross-partner inference (GAME-04) | ✓ VERIFIED | All three query functions carry `eq(schema.clientRelationships.ownerId, ownerId)` as the/a leading WHERE predicate, in the same statement as the data (`momentum.ts`); no cohort/comparison parameter exists anywhere. `MomentumCard.test.tsx` case 8 asserts a broad forbidden-vocabulary regex (classement/leaderboard/moyenne/average/percentile/rank/team/colleague/best/podium/vs) against rendered text — sharpened post-D-19a for the added iconography. `momentum.isolation.integration.test.ts` proves owner isolation against real Postgres including a company shared by two partners, with 3/3 mutation evidence (M1 removing the owner predicate makes the isolation assertion fail). |
| 5 | A partner who ignores the feature is not penalised; existing surfaces behave unchanged (GAME-05) | ✓ VERIFIED | `MomentumCard` has zero buttons/controls (test case 9); no write path exists in `momentum.ts` (no `.insert/.update/.delete`, confirmed by source grep and by plan's own acceptance criteria); `page.tsx`'s diff leaves the `<RelanceCard>` call site and metric tiles untouched (`page.test.tsx` "GAME-05 regression" test, full pre-existing suite still green). |
| 6 | A backwards move / move to Perdu renders identically to a forward move, no penalty framing (D-11) | ✓ VERIFIED | `ROW_LINK_CLASSNAME` is one frozen string with no conditional segment (`MomentumCard.tsx:91-92`); `movementCopy` has no branch on stage direction. Test case 6 asserts `className` string-equality between a forward and a Perdu row, asserts no element under either row carries a `style` attribute or a `--tier-` reference, and asserts absence of penalty vocabulary (reculé/perdu son/attention/⚠). `isProgressEvent` in the query layer explicitly excludes `perdu` (`<> 'perdu'` conjunct), proven by mutation M2 against real Postgres. |
| 7 | The surface is hidden entirely (not empty) for admins (D-15) | ✓ VERIFIED | `page.tsx`: `isAdmin ? null : Promise.all([...])` means the three momentum queries are never evaluated for an admin; `{!isAdmin && momentum && <MomentumCard .../>}` means no DOM node renders. `page.test.tsx`'s "Admin: no momentum query fires and no momentum node renders" test asserts `toHaveBeenCalledTimes(0)` on all three mocks AND absence of the zero-state invitation copy specifically (not just "no rows"). Human-verified live on 2026-09-05 (35-05-SUMMARY.md item 7: "operator signed in as admin and confirmed complete absence, not a zero state"). |
| 8 | No persistence, no migration, no new column for this feature (D-03/D-23) | ✓ VERIFIED | `git status --porcelain src/db/schema.ts drizzle/` reported clean at every plan's own verification gate (35-01 through 35-05 summaries); badges/streaks are derived at read time via pure functions taking only already-fetched data; no `INSERT/UPDATE/DELETE` exists in `momentum.ts` (confirmed by direct source read). |
| 9 | The gamified visual treatment (D-19a) does not reopen anything D-19a did not amend | ✓ VERIFIED | Read `MomentumCard.tsx` and its test suite directly: tier colour (`--tier-bronze/silver/gold`) applies to badge rungs only (never movement rows, confirmed by test case 6's inline-style/`--tier-` absence assertions on movement rows); contrast values in `app/globals.css` were independently recomputed for bronze-on-white (6.01:1, matches the documented figure exactly) confirming the WCAG AA claims are measured, not asserted; all nine rungs remain readable (test case 7); no leaderboard/comparison vocabulary was introduced (test case 8, sharpened). |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/lib/momentum/types.ts` | Shared result contracts | ✓ VERIFIED | Exports `MomentumRow`, `WeeklyMovements`, `BadgeAxisProgress`, `StreakSummary`, `MomentumBadgeCounts` as declared; imported by both the query layer and the component, no duplicate declarations found. |
| `src/lib/momentum/window.ts` | One Europe/Paris week-window helper | ✓ VERIFIED | `MOMENTUM_TIME_ZONE`, `currentWeekWindow`, `weekKeyFromMs`, `shiftWeekKey`, `MOMENTUM_TRACKING_STARTED_AT`, `formatTrackedSinceFragment` all present and read directly; no `Date.now()` call, no `server-only` import (pure module as required). |
| `src/lib/momentum/badges.ts` | Streak fold + badge derivation | ✓ VERIFIED | `BADGE_THRESHOLDS`, `summarizeStreaks`, `deriveBadgeProgress` present, match the documented thresholds (clients 3/10/25, wins 1/5/15, consistency 2/6/12) and the two-branch streak rule exactly as specified. |
| `src/lib/db/queries/momentum.ts` | Owner-scoped momentum/streak/badge reads | ✓ VERIFIED | Three exported functions, each with `eq(schema.clientRelationships.ownerId, ownerId)` in its own WHERE; `server-only` imported; no write calls; `perdu` explicitly excluded from progress; GROUP BY-1 fix (found via real-Postgres run) present. Barrel-exported from `src/lib/db/queries/index.ts`. |
| `app/(authed)/_components/MomentumCard.tsx` | One Card, three parts, gamified per D-19a | ✓ VERIFIED | Server component (no `'use client'`), renders streak/movements/badge ladder/two footer lines exactly as specced, with D-19a's tier tiles, progress tracks and axis iconography. Zero buttons, zero role logic. |
| `src/lib/i18n/dictionaries.ts` | `dashboard.momentum.*` keys, fr+en | ✓ VERIFIED | 25 keys × 2 languages = 50 occurrences of the key prefix (19 original + 6 added for D-19a: `streak.label`, `badge.sectionLabel`, `badge.progress`, `badge.progressLabel`, `badge.allEarned`, `badge.earnedMarker`). `npm run typecheck` (the `_EnHasAllFrKeys` compile-time gate) passes. |
| `src/lib/db/queries/momentum.isolation.integration.test.ts` | Real-Postgres isolation proof | ✓ VERIFIED | Present, `describe.skipIf(!DATABASE_URL_TEST)`-gated, not wired into CI (`package.json`/`.github/`/`vitest.config.*` untouched). Actually run against the Neon development branch on 2026-09-05 with 3/3 mutation evidence recorded in 35-04-SUMMARY.md (M1 owner predicate, M2 Perdu exclusion, M3 window exclusivity — each produced a named, specific test failure with a quoted assertion message). |
| `app/(authed)/page.tsx` | Admin-gated call site | ✓ VERIFIED | `role` destructured from `requireUser()`, `isAdmin` derived once, momentum queries nested in `isAdmin ? null : Promise.all([...])`, clock read once above the `Promise.all`, card placed between `<RelanceCard>` and recent-proposals block. |
| `app/globals.css` tier tokens | `--tier-bronze/silver/gold`, both themes, WCAG AA | ✓ VERIFIED | Present in both light and dark blocks. Independently recomputed light-mode bronze-on-white contrast = 6.01:1, matching the documented figure exactly — the WCAG claims are measured, not asserted. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `badges.ts` | `window.ts` | `shiftWeekKey`/`weekKeyFromMs` | ✓ WIRED | Imported and used for streak arithmetic. |
| `momentum.ts` (query) | `window.ts` | `MOMENTUM_TIME_ZONE` bound into `AT TIME ZONE` | ✓ WIRED | `MOMENTUM_TIME_ZONE` imported and used as a bound SQL parameter; no `'Europe/Paris'` literal in the query file. |
| `momentum.ts` (query) | `stages.ts` | `PIPELINE_STAGES` compiled into `array_position` comparison | ✓ WIRED | Confirmed in source; no hand-typed stage literal (`'qualifie'` absent). |
| `MomentumCard.tsx` | `/clients/{relationshipId}` | `next/link` row link | ✓ WIRED | `href={`/clients/${row.relationshipId}`}` present on every movement row. |
| `MomentumCard.tsx` | `dictionaries.ts` | `t('dashboard.momentum.*', lang)` | ✓ WIRED | All copy sourced from the dictionary; EN parity test (case 10) confirms no leaked key names. |
| `page.tsx` | `MomentumCard.tsx` | `{!isAdmin && momentum && <MomentumCard ...>}` | ✓ WIRED | Confirmed by direct source read and by the admin-gate test asserting both zero query calls and zero DOM node. |
| `page.tsx` | `momentum.ts` queries (barrel) | `isAdmin ? null : Promise.all([...])` | ✓ WIRED | Confirmed by direct source read; queries imported from `@/lib/db/queries` barrel, not the module file directly. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Full unit/integration suite | `npx vitest run` | 172 files / 2317 tests passed, 6 files / 61 skipped | ✓ PASS |
| Type safety incl. i18n parity | `npm run typecheck` | exits 0 | ✓ PASS |
| Lint (CI-equivalent, `--max-warnings=0`) | `npm run lint:check` | exits 0 | ✓ PASS |
| Production build | `npm run build` | completes, all routes compiled | ✓ PASS |
| Real-Postgres isolation + mutation proof | `momentum.isolation.integration.test.ts` (hand-invoked, not part of the above) | 9/9 assertions passed; 3/3 mutations each produced a named failure, all reverted (`git diff --exit-code` clean) | ✓ PASS (evidence in 35-04-SUMMARY.md, independently reviewed) |

All four gate commands above were re-run independently during this verification (not taken on SUMMARY claims) and matched the numbers recorded in the summaries exactly.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| GAME-01 | 35-01, 35-02, 35-03, 35-04, 35-05 | See what moved recently from the timeline | ✓ SATISFIED | `listWeeklyMovementsForOwner` + `MomentumCard`'s movements section. |
| GAME-02 | 35-01, 35-02, 35-03, 35-04, 35-05 | Streak of consecutive weeks, break condition visible | ✓ SATISFIED | `summarizeStreaks` + always-rendered streak sentence. |
| GAME-03 | 35-01, 35-02, 35-03, 35-05 | Badges for milestones, criteria readable earned or not | ✓ SATISFIED | `deriveBadgeProgress` + all-nine-rungs-always-rendered `BadgeAxisRow`. |
| GAME-04 | 35-01, 35-02, 35-03, 35-04, 35-05 | No leaderboard/ranking/peer/team aggregate/inference | ✓ SATISFIED | Owner-predicate-in-statement discipline, mutation-verified in 35-04; vocabulary guard in component tests. |
| GAME-05 | 35-03, 35-05 | Ignoring the feature costs nothing; existing surfaces unchanged | ✓ SATISFIED | No controls on the card; pre-existing home-page tests and surfaces unaffected. |

No orphaned requirements — REQUIREMENTS.md's Phase 35 mapping (GAME-01..05) matches exactly what all five plans declared in their `requirements:` frontmatter, and REQUIREMENTS.md marks all five checked (`[x]`).

### Anti-Patterns Found

None. Searched `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` and "coming soon"/"not yet implemented"-style phrases across every file this phase touched (`types.ts`, `window.ts`, `badges.ts`, `momentum.ts`, `momentum.test.ts`, `momentum.isolation.integration.test.ts`, `MomentumCard.tsx`, `MomentumCard.test.tsx`, `page.tsx`) — zero matches. No empty-implementation stubs (`return null`/`return {}`/`=> {}`) found outside legitimate early-return branches already covered by the design (e.g., the truncation line's conditional render).

### Human Verification Required

None outstanding. The phase's own plan (35-05 Task 3) required and obtained live human verification of the rendered surface on 2026-09-05, covering placement, streak copy, both footer lines, all nine badge rungs, admin absence, and i18n parity — recorded item-by-item in `35-05-SUMMARY.md` with an explicit `approved` resume signal. The subsequent D-19a redesign is a visual-direction change to an already-approved wiring; its behavioral guarantees (no leaderboard, no penalty framing, all rungs readable, permanent footer lines, admin absence) are re-covered by the retargeted `MomentumCard.test.tsx` suite (12 cases, all passing) rather than requiring a second live walkthrough, and the verification task's own critical context confirms the operator's 2026-09-05 review already covered the live admin view under the new design.

### Gaps Summary

No gaps. All five requirements (GAME-01..05) are satisfied with evidence at the artifact, wiring, and (where applicable) real-database level. The explicitly-preserved constraints from the D-19a amendment (no leaderboard, all-rungs-readable, no penalty framing, always-visible break condition and footer lines, admin absence, no persistence) were each independently checked against current source rather than assumed from the amendment note, and all held. Gate commands (`vitest`, `typecheck`, `lint:check`, `build`) were re-run independently during this verification and matched the SUMMARY-reported results exactly. The skip-by-default integration suite is a recorded, accepted design decision (not wired into CI) with real mutation evidence on file, not a gap.

---

_Verified: 2026-09-05T09:53:34Z_
_Verifier: Claude (gsd-verifier)_

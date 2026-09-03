---
phase: 33-pipeline
verified: 2026-09-03T15:31:12Z
status: human_needed
score: 5/5 must-haves verified in code — 2 with voided acceptance evidence
verified_at_commit: 8b5847008ed3d61e68abe193b587d3c39861f424
overrides_applied: 0
re_verification:
  previous_status: null
  previous_score: null
  note: >-
    Initial verification. Runs AFTER 33-REVIEW.md (31 findings) and after
    commit 8b58470, which repaired all five criticals. The five ROADMAP
    success criteria are re-derived from ROADMAP.md, not taken from the
    33-09 acceptance table.
human_verification:
  - test: >-
      Against a PRODUCTION build (npm run build && npm run start, NOT next
      dev) on the migrated Neon development branch: seed the fixtures
      (npm run db:seed:pipeline-fixtures), open /clients/[id] for the
      siren-less legacy company (Pépinières Vaugelas), press "Marquer
      gagné", enter a date and a reason, submit.
    expected: >-
      The dialog STAYS OPEN, keeps the typed date and reason, and reveals
      the SIREN banner + SIREN field with the relabelled submit button.
      Entering a valid 9-digit SIREN and resubmitting completes the win.
      A generic error toast with no SIREN field is a FAILURE.
    why_human: >-
      This re-walks acceptance step 10, whose original evidence is void
      twice over. (a) It ran against `next dev`, where the old thrown
      SIREN_REQUIRED sentinel survived — 33-REVIEW CR-01 proved that gate
      was dead in a production build. (b) The code it exercised no longer
      exists: 8b58470 replaced the thrown sentinel with a returned
      discriminated result. No operator has ever walked the CURRENT gate,
      and no test crosses the RSC serialisation boundary
      (MarkWonDialog.test.tsx still vi.mocks '@/lib/pipeline/actions' —
      the exact structural blind spot CR-01 named). A grep cannot decide
      whether a Server Function's return value round-trips in production.
  - test: >-
      On the same seeded development branch, open /clients/[id] for the
      relationship carrying fixture 08a (validityDays 15, ageDays 40) and
      look at the proposal row's outcome slot.
    expected: >-
      A muted "Sans réponse" badge renders alongside BOTH the "Marquer
      gagné" and "Marquer perdu" triggers (D-06 — a derived value never
      removes the ability to record an explicit one). No other seeded row
      shows the badge.
    why_human: >-
      This re-walks acceptance step 14. 33-REVIEW CR-03 established that
      the row it was checked against had pdf_generated_at NULL, on which
      deriveProposalOutcome short-circuits to null — the badge could not
      have rendered, so the reported PASS evidenced nothing. 8b58470 fixed
      the fixture (both created_at and pdf_generated_at now set, only the
      step-14 row expired) but the step was not re-walked. Unit tests pin
      deriveProposalOutcome and the control's four states; only a live
      seeded row proves the fixture actually reaches the state.
  - test: >-
      On /pipeline (desktop), focus a card with the keyboard, press Space
      to start a dnd-kit keyboard drag, then press ArrowRight, then Space.
    expected: >-
      The card lands in exactly ONE adjacent settable stage and exactly
      one relationship.stage_change audit row is written.
    why_human: >-
      33-REVIEW WR-02 (unfixed) reports that the component's own
      onKeyDown and dnd-kit's activator listeners are composed on the same
      DOM node, so an arrow during an active keyboard drag fires both the
      drag-move and moveByKeyboard — two writes and a stage the partner
      did not choose. Acceptance step 5 was re-scripted (commit 54450d6)
      to the plain arrow path only, so the interaction between the two
      keyboard mechanisms was never walked.
  - test: >-
      On /pipeline (desktop), drag a card with the mouse and release it
      over the "Signé" or "Débloqué" lane.
    expected: >-
      A refusal message explaining the lane is system-owned (D-09.1
      layer 3), not a silent snap-back.
    why_human: >-
      33-REVIEW WR-01 (unfixed) traces `disabled` on KanbanColumn into
      dnd-kit's useSortable, which disables the DROPPABLE as well as the
      draggable, so `over === null` and handleKanbanMove's
      isReservedStage branch — and its toast — never run. D-09.1 names a
      silent snap-back as worse than a lane that reads as unreachable.
      Acceptance steps 3/4/8 covered the static muting, not drop feedback.
  - test: >-
      Decide whether migration 0009 is applied to the Neon `main` (and
      `preview`) branches before /pipeline is exposed to real users.
    expected: >-
      A deliberate MIGRATE PROD run at milestone close, per
      33-02-SUMMARY.md's own note.
    why_human: >-
      33-02-SUMMARY.md records "Production (`main`) has NOT been migrated.
      The Neon `preview` branch has not been migrated either." Every
      criterion below is TRUE in the codebase and on the development
      branch; none is true in production until 0009 lands there. This is a
      documented, deliberate deferral, not a phase gap — but it is an
      operator decision that must not be forgotten.
deferred:
  - truth: >-
      Nothing writes `signé`/`débloqué`; the contract tool will. When it
      does, WR-08 makes those relationships vanish silently from the board.
    addressed_in: "v1.7+ (Contract-tool inbound status feedback)"
    evidence: >-
      REQUIREMENTS.md § Deferred: "Contract-tool inbound status feedback |
      v1.7+ | Drives PIPE-02's system-owned stages." WR-08 is latent until
      that integration exists.
  - truth: >-
      The stage-change audit payload carries only `toStage`, while
      audit-log.ts documents "the from/to stage strings" for Phase 34's
      ACTV-02 timeline (WR-16).
    addressed_in: "Phase 34"
    evidence: >-
      ROADMAP Phase 34 SC 2: "A stage change or a new proposal
      automatically appends a timestamped, attributed system event to the
      relevant relationship's timeline." Phase 34 owns the timeline that
      consumes this payload and can widen it there.
---

# Phase 33: Pipeline Verification Report

**Phase Goal:** Every relationship has a place in a partner-advanced pipeline, and every proposal records whether it converted — giving a real per-quote conversion rate without ever blocking a partner from quoting a prospect who has no paperwork yet.
**Verified:** 2026-09-03T15:31:12Z
**Verified at commit:** `8b58470` (working tree clean)
**Status:** human_needed
**Re-verification:** No — initial verification, run after 33-REVIEW.md and after the CR fix commit.

## Method note

The 33-09 acceptance table maps five criteria to fifteen walkthrough steps. That table is
**not** treated as evidence here. Each ROADMAP success criterion was re-derived from
`.planning/ROADMAP.md` § "Phase 33" and traced to the file and symbol that makes it true,
independently of what any SUMMARY claims. Where the only end-to-end evidence for a criterion
is a walkthrough step that 33-REVIEW subsequently invalidated, that is called out explicitly
and routed to the operator.

## Goal Achievement

### Observable Truths (the five ROADMAP success criteria)

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | A relationship's owner (partner or sales) advances their relationship through the early pipeline stages themselves. | ✓ VERIFIED (⚠️ WR-02) | `src/db/schema.ts:439` `stage` column, NOT NULL DEFAULT `'prospect'`, + `client_relationships_stage_check` (`:450`). `src/lib/pipeline/schemas.ts` `advanceStageSchema` derives its enum from `PARTNER_SETTABLE_STAGES` (never a re-typed literal). `src/lib/pipeline/actions.ts:69` `advanceRelationshipStageAction` — auth first await (`:70`), ownership re-proved inside the UPDATE's own WHERE (`:81-84`), zero-rows as the only failure signal. Sales admitted identically: `src/lib/auth/require.ts:106` `requireRelationshipHolder` refuses only `admin`, and `app/(authed)/pipeline/access.test.tsx:178` pins the `sales` case. |
| 2 | The late stages (`signé`, `débloqué`) are visible on the relationship but are NOT hand-editable — the UI communicates they are system-owned. | ✓ VERIFIED (⚠️ WR-01) | Visible: `src/lib/pipeline/stages.ts:22-30` carries all seven values; `listPipelineBoard` seeds a lane for every one (`src/lib/db/queries/pipeline.ts:99-101`). Not editable: `advanceStageSchema`'s enum excludes `RESERVED_STAGES`, so `'signe'`/`'debloque'` are unreachable **at parse time**, and `src/lib/pipeline/actions.ts:80` is the ONLY `.set({ stage: … })` in the repo (grep across `src/` + `app/` returns one non-test hit). Communicated: `PipelineColumnHeader.tsx:32-44` replaces the count with a `BanIcon` + "Réservé" badge (`data-lane-state="reserved"`); `PipelineBoard.tsx:322-328` renders a reserved caption and no `KanbanColumnContent`; `PipelineMobileList.tsx:181-183` renders reserved `SelectItem`s `disabled` with a reserved suffix. |
| 3 | A partner marks a proposal `won`, `lost`, or `unanswered` with a date and an optional reason; a per-quote conversion rate can be computed. | ✓ VERIFIED — **acceptance evidence for the `unanswered` half is void, re-check required** | Columns + invariants: `src/db/schema.ts:267-270`, `proposals_outcome_check` (`:306`) and `proposals_outcome_completeness_check` (`:311`); migration `drizzle/0009_phase33_pipeline.sql:16-22`. Writes: `markProposalWonAction` / `markProposalLostAction` (`actions.ts:186`, `:121`) with `date` required and `reason` optional (`schemas.ts` `outcomeFieldsSchema`). `unanswered` derived, never stored: `src/lib/db/queries/proposals.ts:938-951` `deriveProposalOutcome`. UI: `ProposalOutcomeControl.tsx` renders the four states and is mounted per row in `app/(authed)/clients/[id]/page.tsx:169-175`. Rate: `getConversionRateForOwner` (`pipeline.ts:146-169`), formula pinned on **real Postgres** (33-08, 28/28) at `{won:1,total:3,pct:33}` / `{won:1,total:1,pct:100}` / `{won:0,total:0,pct:null}`; rendered via `formatConversionRate` → `MetricTile` (`pipeline/page.tsx:58,79-84`). **See "Weakened evidence" below.** |
| 4 | Marking a deal `won` is blocked unless the company has a SIREN; quoting or advancing early pipeline stages is never blocked by a missing SIREN. | ✓ VERIFIED (blocking half) — **D-08's recovery path has no valid evidence, re-check required** | DB half: `drizzle/0009_phase33_pipeline.sql:23-49` — `proposals_won_requires_siren()` + `_ins`/`_upd` triggers, fail-closed on NULL `client_relationship_id` and on a missing join row. Executed against real Postgres: `client-relationships.isolation.integration.test.ts:494,517,539,561` all reject; `:509` proves `lost` never requires a SIREN. Server half: `actions.ts:250` gate + `:262-269,287` re-proves `companies.siren IS NOT NULL` inside the UPDATE's own WHERE. Never blocked elsewhere: `advanceStageSchema`/`advanceRelationshipStageAction` reference no SIREN at all; `markLostSchema` has no `siren` member. **See "Weakened evidence" below.** |
| 5 | A partner opens their pipeline view and sees their own relationships grouped by stage; they never see another partner's. | ✓ VERIFIED (⚠️ WR-06) | Route: `app/(authed)/pipeline/page.tsx` — `requireRelationshipHolder()` is the first await (`:49`), `session.user.id` is the only owner source (`:53-54`), **no `searchParams` are read on the route at all**. Query: `src/lib/db/queries/pipeline.ts:89` — `eq(clientRelationships.ownerId, args.ownerId)` is the sole WHERE predicate; `ownerId` is required and non-defaulted on both exports; there is no admin path in the module. Proof: `access.test.tsx` — admin refused with the real 404 digest and the refusal HALTS (`:147`), `listPipelineBoard`/`getConversionRateForOwner` asserted **never called** on that path, 404 not 403 (`:159`), partner and sales each admitted with their own id (`:166,178`), and the board argument asserted equal to the session id (`:190`). D-12: no team/peer aggregate anywhere in `pipeline.ts`. |

**Score:** 5/5 criteria delivered by the codebase. 2 of them (3 and 4) carry acceptance
evidence that 33-REVIEW invalidated and that has not been regenerated.

### Weakened evidence — the two findings that undermine the approved walkthrough

**Criterion 4 / acceptance step 10 — CR-01. Evidence void twice over.**

The approved walkthrough recorded step 10 as PASS: *"dialog stayed open, kept the typed date
and reason, completed after a valid SIREN."* Two independent reasons that PASS cannot be
carried forward:

1. **It ran against `next dev`.** The gate at the time travelled as a thrown
   `Error(SIREN_REQUIRED)` whose `.message` `MarkWonDialog` compared to a sentinel. Next.js
   substitutes a generic message plus a digest for a Server Function's thrown error in
   production builds, so the comparison was always false once deployed. The walkthrough
   observed dev-only behaviour and reported it as the product's behaviour.
2. **The code it exercised no longer exists.** Commit `8b58470` replaced the thrown sentinel
   with a returned discriminated result (`src/lib/pipeline/constants.ts` `MarkWonResult`;
   `actions.ts:258` `return { ok: false, reason: 'siren_required' }`;
   `MarkWonDialog.tsx:99-109` `if (!result.ok)`). The sentinel is deleted — no `SIREN_REQUIRED`
   export survives anywhere in `src/` or `app/`.

The new shape is structurally sound: a plain serialisable object returned from a Server
Function crosses the RSC boundary intact, unlike a thrown error's message. **But nothing has
verified it.** `MarkWonDialog.test.tsx` still `vi.mock`s `@/lib/pipeline/actions` — the exact
structural blind spot CR-01 named ("Passing tests are not evidence here"), and the review's own
remediation clause ("add one integration-level test that does **not** mock the action module,
**or the same defect recurs**") was **not** implemented by `8b58470`. The only thing standing
between this and a repeat is the code comment at `actions.ts:251-257`.

*What this does and does not cost criterion 4:* the criterion as written — "Marking a deal
`won` is **blocked** unless the company has a SIREN" — is fully evidenced by the DB trigger
and the server-action predicate, both proven against real Postgres in the 33-08 run, and
neither depends on the client handshake. What is unevidenced is D-08's **recovery** path: that
a real partner in production can supply the missing SIREN inline instead of hitting a dead-end
toast. That is the phase's own decision, not the ROADMAP criterion, so it is a WARNING and an
operator re-check, not a BLOCKER.

**Criterion 3 / acceptance step 14 — CR-03. Evidence void.**

Step 14 ("past validity, no outcome → 'Sans réponse'") was reported passing against seed
fixture `08a`. `deriveProposalOutcome` (`proposals.ts:944`) returns `null` the moment
`pdfGeneratedAt` is null and measures the validity window from that column, not `created_at`.
The seeder inserted `created_at` only. The badge **could not have rendered on that row**, so
the reported PASS evidenced nothing.

`8b58470` fixed the fixture — `scripts/seed-pipeline-fixtures.ts` now writes `pdf_generated_at`
and `created_at` to the same `sentAt` instant, and only the step-14 fixture is expired. The
step has not been re-walked.

*What this does and does not cost criterion 3:* the `won`/`lost` write path, the date/reason
capture and the conversion rate are independently evidenced (unit tests plus the real-Postgres
28/28 run) and never depended on step 14. The `unanswered` derivation is evidenced at unit
level — `deriveProposalOutcome` is exercised directly, and `page.test.tsx` "Outcome Test 2"
renders a lapsed undecided row and asserts the badge plus both override triggers. What has
never been observed is the badge on a real seeded database row. WARNING, re-check.

*One thing verified while checking this, worth recording:* `8b58470`'s CR-04 half gates the
outcome control on `row.displayStatus === 'active'`. That looked like it would suppress the
`unanswered` badge, since a lapsed proposal derives `'expired'`. It does not —
`app/(authed)/clients/[id]/page.tsx:101` sets `displayStatus: p.status`, the **stored** status,
and never calls `deriveDisplayStatus` on this surface. A lapsed proposal is stored `'active'`,
so it still receives the control. No regression.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/db/schema.ts` | `stage` column + 7-value CHECK; `outcome`/`outcome_date`/`outcome_reason` + 2 CHECKs | ✓ VERIFIED | `:439`, `:450`, `:267-270`, `:306`, `:311`; `client_relationships_owner_id_stage_idx` at `:454` |
| `drizzle/0009_phase33_pipeline.sql` | Migration incl. hand-written SIREN trigger | ✓ VERIFIED | 49 lines; DDL `:15-22`, trigger function `:23-47`, two triggers `:48-49`. Applied to Neon `development` only (see human item 5) |
| `src/lib/pipeline/stages.ts` | 7-value union, reserved pair, settable list | ✓ VERIFIED | 64 lines; `PIPELINE_STAGES`, `RESERVED_STAGES`, `PARTNER_SETTABLE_STAGES`, `isReservedStage`, `STAGE_DICT_KEY` |
| `src/lib/pipeline/schemas.ts` | Parse-time reserved-stage exclusion; outcome fields | ✓ VERIFIED | `advanceStageSchema` enum derived from `PARTNER_SETTABLE_STAGES`; `date` required, `reason` optional ≤500 |
| `src/lib/pipeline/constants.ts` | Client/server shared contract | ✓ VERIFIED | Sentinel removed; now exports only `MarkWonResult`. Header documents the CR-01 history |
| `src/lib/pipeline/actions.ts` | 3 server actions, auth-first, bounded errors | ✓ VERIFIED | 314 lines; `requireRelationshipHolder()` is the first await in all three; single `.set({ stage })` at `:80` |
| `src/lib/db/queries/pipeline.ts` | Owner-scoped board + conversion rate | ✓ VERIFIED | 169 lines; `import 'server-only'`; `countDistinct` on both child joins (cartesian-product trap handled) |
| `src/lib/pipeline/format.ts` | Conversion-rate copy, stage labels | ✓ VERIFIED | `pct === null` → `—`, never `0 %`; type-only import of `ConversionRate` keeps `server-only` out of the client bundle |
| `app/(authed)/pipeline/page.tsx` | The route | ✓ VERIFIED | 98 lines; `force-dynamic`; zero-relationship `Empty` branch; board `hidden md:block` / list `block md:hidden` |
| `app/(authed)/pipeline/PipelineBoard.tsx` | Kanban, single write path | ✓ VERIFIED (⚠️) | `handleKanbanMove` is the sole call site of `advanceRelationshipStageAction` on desktop; optimistic move + rollback. WR-01 / WR-02 unfixed |
| `app/(authed)/pipeline/PipelineMobileList.tsx` | Mobile stage picker | ✓ VERIFIED | Reserved `SelectItem`s disabled with suffix; 8 tests |
| `app/(authed)/pipeline/PipelineColumnHeader.tsx` | 3 lane states | ✓ VERIFIED | `data-lane-state` reserved/terminal/active; reserved never renders a real `0` |
| `app/(authed)/clients/[id]/MarkWonDialog.tsx` | D-08 inline SIREN | ✓ VERIFIED (⚠️ stale docs) | Result-based gate at `:99`; fields stay mounted. Header comment `:12-29` still describes the deleted `SIREN_REQUIRED` sentinel — see Anti-Patterns |
| `app/(authed)/clients/[id]/ProposalOutcomeControl.tsx` | 4 outcome states | ✓ VERIFIED | `data-outcome-state`; no "mark unanswered" trigger (D-06) |
| `app/(authed)/pipeline/access.test.tsx` | Access boundary | ✓ VERIFIED | 6 assertions, all passing |
| `scripts/seed-pipeline-fixtures.ts` | Dev fixtures for the walkthrough | ✓ VERIFIED (⚠️ partial) | CR-02 (`<> all`), CR-03 (`pdf_generated_at`), CR-05 (owner-scoped revert) all applied. The review's two follow-ups — a seed→`--remove --dry-run` regression assertion, and identifying the SIREN-less fixture by id rather than by company name — were not |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `pipeline/page.tsx` | `listPipelineBoard` | direct call, `ownerId: session.user.id` | ✓ WIRED | `:53`; asserted by `access.test.tsx:190` |
| `pipeline/page.tsx` | `getConversionRateForOwner` | direct call | ✓ WIRED | `:54`, feeds `formatConversionRate` → `MetricTile` |
| `PipelineBoard` | `advanceRelationshipStageAction` | `handleKanbanMove` (drag + arrow) | ✓ WIRED | Optimistic `setColumns` → await → `refresh()` / rollback + toast |
| `PipelineMobileList` | `advanceRelationshipStageAction` | `handleMobileStageChange` | ✓ WIRED | Test 6 asserts one call with the relationship id and destination |
| `MarkWonDialog` | `markProposalWonAction` | `await` + `if (!result.ok)` | ⚠️ WIRED, UNPROVEN ACROSS THE BOUNDARY | Correct shape; no test or walkthrough has exercised it through real RSC serialisation (CR-01 remediation clause unimplemented) |
| `ProposalOutcomeControl` | `/clients/[id]/page.tsx` | `ProposalRow` `actionsSlot` | ✓ WIRED | `:169-175`, gated on stored `status === 'active'` |
| `advanceRelationshipStageAction` | `client_relationships.stage` | single `.set()` | ✓ WIRED | `actions.ts:80` — the only stage write in the repo |
| `markProposalWonAction` | `proposals_won_requires_siren` trigger | DB, third layer | ✓ WIRED | Proven rejecting on real Postgres (33-08) |
| `/pipeline` | sidebar + breadcrumb | `AppSidebar.tsx:124`, `route-meta.ts:200-206` | ✓ WIRED | Shares `/clients`' relationship-holder conditional |

### Data-Flow Trace (Level 4)

| Artifact | Data variable | Source | Produces real data | Status |
|---|---|---|---|---|
| `pipeline/page.tsx` | `board` | `listPipelineBoard` → real `SELECT … JOIN companies LEFT JOIN contacts LEFT JOIN proposals … WHERE owner_id = $1 GROUP BY … ORDER BY` | Yes | ✓ FLOWING |
| `pipeline/page.tsx` | `rate` | `getConversionRateForOwner` → `COUNT(*) FILTER (WHERE outcome='won')` / `COUNT(*)` over the caller's own finalized, non-deleted, relationship-linked rows | Yes — numbers pinned against real Postgres | ✓ FLOWING |
| `PipelineBoard` / `PipelineMobileList` | `columns` | `initial` prop = the server fetch above; reseeded on prop identity change | Yes — no hardcoded empty prop at the call site (`page.tsx:88,91` pass `board`) | ✓ FLOWING |
| `ProposalOutcomeControl` | `outcome` | `deriveProposalOutcome(p)` over rows from `listProposalsForRelationship(id, ownerId)` | Yes | ✓ FLOWING |
| `MetricTile` | `value` / `sublabel` | `formatConversionRate(rate, lang)` | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Full suite green at HEAD | `npm run test` | 146 files passed, 3 skipped; **1813 passed, 38 skipped, 0 failed** | ✓ PASS |
| Types sound | `npm run typecheck` | exit 0 | ✓ PASS |
| Lint gate (`--max-warnings=0`) | `npm run lint:check` | exit 0 | ✓ PASS |
| Single stage writer | grep `.set({ stage` across `src/` + `app/` | one non-test hit: `src/lib/pipeline/actions.ts:80` | ✓ PASS |
| Sentinel fully removed | grep `SIREN_REQUIRED` across `src/` + `app/` | 0 live references — 6 hits, all inside explanatory comments/test titles | ✓ PASS |
| Debt markers in phase files | grep `TBD|FIXME|XXX|HACK|PLACEHOLDER|TODO` across the 15 phase source files | none | ✓ PASS |
| Working tree | `git status --short` | clean at `8b58470` | ✓ PASS |
| Production build | `npm run build` | **not run** | ? SKIP — a `next dev` process is live; per this project's recorded gotcha, a concurrent `next build` freezes the dev server's `globals.css` recompiles. `8b58470` records build exit 0 |
| DB-layer invariants | `npx vitest run …isolation.integration.test.ts` | **not run** — `DATABASE_URL_TEST` unset locally, and `.env.local` resolves to a live Neon endpoint, so an agent must not choose the connection string | ? SKIP — 33-08 records 28/28 against `development` on `f9b9032`; that file is untouched by `8b58470`, so the result still applies |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|---|---|---|---|
| PIPE-01 | A relationship carries a pipeline stage that its owner can advance | ✓ SATISFIED | Criterion 1 above |
| PIPE-02 | Late stages marked system-owned, not hand-editable | ✓ SATISFIED | Criterion 2 above — enforced at parse time, not only in CSS |
| PIPE-03 | Proposal outcome with date + optional reason → real conversion rate | ✓ SATISFIED (re-check the `unanswered` read) | Criterion 3 above |
| PIPE-04 | A partner sees their pipeline grouped by stage | ✓ SATISFIED | Criterion 5 above |
| PIPE-05 | Marking won requires a SIREN; quoting never blocked | ✓ SATISFIED (re-check the D-08 recovery) | Criterion 4 above. Note the 2026-09-03 amendment in REQUIREMENTS.md line 134 — SIREN is now required at proposal and client creation, so D-07/D-08 are a legacy-row safety net, which is exactly why step 10 needed a seeded fixture |

No orphaned requirements: REQUIREMENTS.md maps PIPE-01..05 to Phase 33 and all five appear in the phase's plans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `app/(authed)/clients/[id]/MarkWonDialog.tsx` | 12-29 | Stale doc comment — describes the deleted `SIREN_REQUIRED` sentinel, "Only when it rejects with the `SIREN_REQUIRED` sentinel", and a "Rule 3 auto-fix" import that no longer exists | ⚠️ Warning | The header now contradicts the code beneath it (`:99` reads a returned result). A future reader repairing "the missing import" could resurrect the CR-01 defect. Cheap to fix |
| `app/(authed)/clients/[id]/MarkWonDialog.test.tsx` | 40 | `vi.mock('@/lib/pipeline/actions')` retained on the one path CR-01 identified as untestable through mocks | ⚠️ Warning | The review's explicit remediation ("or the same defect recurs") is unimplemented; the suite remains structurally incapable of catching a regression in the gate's serialisation |
| `app/(authed)/clients/[id]/MarkLostDialog.test.tsx` | 10, 106 | Test title still references "the SIREN_REQUIRED string" | ℹ️ Info | Cosmetic only; the assertion (no SIREN field ever appears on the lost path) is still correct |
| `app/(authed)/pipeline/PipelineBoard.tsx` | 169-172, 312 | WR-01 — reserved-lane drop-refusal branch unreachable | ⚠️ Warning | Silent snap-back, which D-09.1 names as worse than an unreachable-looking lane. Static muting still communicates system-ownership, so criterion 2 holds |
| `app/(authed)/pipeline/PipelineBoard.tsx` | 264-282 | WR-02 — arrow handler composes with dnd-kit's activator listeners | ⚠️ Warning | During an active keyboard drag, one arrow can produce two stage writes and a destination the partner did not choose |
| `src/lib/pipeline/actions.ts` | 91-97, 146-152, 295-301 | WR-03 — post-commit audit write inside the same try, no transaction available | ⚠️ Warning | An audit failure reports failure and rolls the UI back while the DB holds the new value |
| `src/lib/pipeline/schemas.ts` | 48 | WR-04 — `z.coerce.date()` with no dictionary-key message | ⚠️ Warning | An unparseable date renders an **empty** `role="alert"`; the form refuses to submit with no visible reason |
| `src/lib/db/queries/pipeline.ts` | 81-87 | WR-06 — `proposals` join omits the `user_id` defence-in-depth predicate | ⚠️ Warning | Latent only: a relationship's proposals are its owner's by construction today. Criterion 5's isolation is carried by the `owner_id` WHERE |
| `src/lib/calc/schema.ts` | — | WR-15 — `requiredSirenSchema` neither normalises nor rejects interleaved non-digits, unlike its `crm/schemas.ts` sibling | ⚠️ Warning | Two SIREN validators of materially different strictness now exist; the DB CHECK `^[0-9]{9}$` is the backstop |

None of these is a BLOCKER: no criterion's supporting artifact is missing, stubbed, orphaned or fed hollow data. All 16 warnings and 10 info findings from 33-REVIEW remain open by design — `8b58470` scoped itself to the five criticals.

### Human Verification Required

See the `human_verification` block in the frontmatter for the full scripts. In priority order:

1. **Re-walk acceptance step 10 against a PRODUCTION build** (`npm run build && npm run start`, never `next dev`). This is the one that matters. The original PASS is void twice over — it observed dev-only behaviour, and the code it observed has since been replaced.
2. **Re-walk acceptance step 14 against the re-seeded fixtures.** The original PASS was recorded against a row that could not render the badge; the fixture is fixed, the observation is not.
3. **Keyboard drag interaction (WR-02)** — Space, ArrowRight, Space on a focused card; confirm one move and one audit row, not two.
4. **Mouse drag onto a reserved lane (WR-01)** — confirm whether the silent snap-back is acceptable as shipped, or whether D-09.1 layer 3 must be restored before the milestone closes.
5. **Decide on migration 0009 for Neon `main`/`preview`.** Nothing in this phase is true in production until it lands.

### Gaps Summary

There are no implementation gaps. Every one of the five ROADMAP success criteria is delivered
by code that exists, is substantive, is wired end to end, and carries real data — traced to a
named file and symbol above rather than to a SUMMARY bullet. The full suite is green at HEAD
(1813 passed, 0 failed), lint and typecheck exit 0, the working tree is clean, and the DB-layer
invariants behind criteria 3 and 4 were executed against real Postgres, not mocked.

The problem is not the code — it is the **audit trail**. Phase 33 was accepted by a human
walkthrough (`c85b649`, "all 15 steps pass") and then, afterwards, a code review found five
criticals, two of which prove specific steps of that walkthrough could not have demonstrated
what they were reported as demonstrating:

- **Step 10** confirmed a SIREN gate that only worked because it ran in `next dev`. In a
  production build the partner would have received a generic toast and no way to supply the
  SIREN — the precise dead end D-08 exists to prevent. The gate has since been rewritten into a
  shape that does survive serialisation, but no human and no test has exercised the new shape
  across the boundary, and the review's explicit "add a non-mocking test or this recurs" clause
  was not implemented.
- **Step 14** confirmed an `unanswered` badge on a database row whose `pdf_generated_at` was
  NULL, on which `deriveProposalOutcome` short-circuits to `null`. The badge was not on screen.
  The fixture has been repaired; the step has not been re-run.

Both are evidence failures rather than delivery failures, so the phase is **not** blocked — but
the phrase "all 15 steps pass" should not be carried into the milestone audit unamended. Two
steps need re-walking, and the SIREN one needs re-walking against a production build
specifically, because that is the exact condition the original walkthrough could not observe.

Two further unfixed warnings (WR-01, WR-02) sit on interaction paths the walkthrough either
skipped or re-scripted around, so they are folded into the same operator pass rather than
deferred silently.

Status is `human_needed`, not `passed`: five verification items require a person.

---

_Verified: 2026-09-03T15:31:12Z_
_Verifier: Claude (gsd-verifier) — goal-backward, adversarial stance, at commit `8b58470`_

---

## Addendum — 2026-09-03, after commit `52d03e1`

This report was written at commit `8b58470`. Three of its five human items
have since been acted on; the record below supersedes the corresponding
`human_verification` entries. Nothing in the per-criterion verdicts changes —
all five were already assessed as delivered in code.

**Closed by an operator re-walk.** Antoine re-walked the two steps whose
evidence this report voided, plus the reserved-lane drop: *"steps 3, 10 and 14
all pass now."*

- **Item 2 (step 14, the `unanswered` badge) — CLOSED.** Observed on the
  repaired fixture.
- **Item 4 (reserved-lane drop refusal) — CLOSED.** WR-01 was fixed in
  `52d03e1`: `KanbanColumn` now accepts dnd-kit's object form of `disabled`,
  so a reserved lane stays a drop target while refusing to be dragged, and
  `handleKanbanMove`'s refusal branch runs. The refusal is a message, not a
  silent snap-back.
- **Item 1 (step 10, D-08's gate) — PARTIALLY CLOSED.** Re-walked and passing,
  but against `next dev`, not the production build this report asked for. The
  residual risk is materially lower than when the item was written: the
  repaired path carries no error message at all, and a Server Function's
  RETURN value serialises identically in dev and production. The remaining
  gap is observational, not structural. `tests/server-action-error-contracts.test.ts`
  (added in `52d03e1`) is the recurrence guard the review asked for — it fails
  the build if any client component branches on a caught error's `.message`
  again.

**Item 3 (Space → ArrowRight → Space) — STILL OPEN, but no longer sitting on
an unfixed defect.** WR-02 was fixed in `52d03e1`: the component's direct
arrow path stands down while `data-dragging` is true, so dnd-kit owns the
arrows during a live drag and exactly one write occurs.
`PipelineBoard.test.tsx` Test 9b pins it. The operator walk remains
unperformed.

**Item 5 (migration 0009 on `main` / `preview`) — STILL OPEN by design.**
Unchanged: a deliberate deferral to milestone close.

Gates at `52d03e1`: `lint:check` 0, `typecheck` 0, `test` 0 (1817 passed, 38
skipped), `build` 0.

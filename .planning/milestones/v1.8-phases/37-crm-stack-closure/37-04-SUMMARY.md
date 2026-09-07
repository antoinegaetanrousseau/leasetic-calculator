---
phase: 37-crm-stack-closure
plan: 04
subsystem: security
tags: [code-review, crm, authorization, activity-timeline, phase-34, documentation]

# Dependency graph
requires:
  - phase: 34-fiche-client
    provides: the authorization/ownership boundary, the relationship_events write path, and the CRM/relationship server actions being reviewed
  - phase: 35-sales-motivation
    provides: 35-REVIEW.md, the Critical/Warning/Info severity taxonomy and structural model D-37-03 names explicitly
  - phase: 37-crm-stack-closure (plan 03)
    provides: 34-VERIFICATION.md, the verification half of CLOSE-04 this plan completes
provides:
  - ".planning/phases/34-fiche-client/34-REVIEW.md — the scoped code review Phase 34 never received"
  - "0 Critical / 1 Warning / 1 Info findings across authorization, the relationship_events write path, and the server actions, each with a file:line citation"
  - "CLOSE-04 marked complete in REQUIREMENTS.md — both 34-VERIFICATION.md and 34-REVIEW.md now exist"
affects: ["40-milestone-record-closure (this document is now part of what Phase 40 audits when it formally closes v1.6)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A scoped review declares its scope machine-readably (depth: scoped, files_reviewed_list whose length equals files_reviewed) AND in prose (an opening Summary sentence naming the scope decision and what was NOT examined), so the document cannot be mistaken for a full review by a reader who only skims the frontmatter or only reads the prose."
    - "A finding's severity is judged by whether the flagged value can vary per call, not merely by whether the SQL-composition primitive used is normally risky — a sql.raw() splice of a hardcoded, non-input-derived constant is Info, not Critical, but is still worth flagging because the primitive itself invites future misuse by copy-paste."

key-files:
  created:
    - .planning/phases/34-fiche-client/34-REVIEW.md
  modified: []

key-decisions:
  - "Both tasks (risk areas 1+2, then risk area 3 and report closure) were committed as a single atomic commit, matching plan 37-03's own documented judgment call: the document is only a coherent, citable artifact once all three risk-area verdicts and the closed frontmatter counts exist together. No code was touched by either task — only one markdown file — so this carries none of the risk atomic per-task commits exist to bound."
  - "WR-01 (createClientRelationshipAction has no revalidatePath call, unlike every sibling Phase 34 write) is recorded as a Warning, not escalated as an operator decision point, because no Critical was found. Per the plan's disposition rule, only a Critical requires an explicit operator decision in this SUMMARY — Warnings and Info findings are recorded in the document and listed here for visibility, not fixed in-flight."
  - "A fourth `companies`-table write site (`src/lib/pipeline/actions.ts:305-312`, Phase 33's markProposalWonAction SIREN-fill) was discovered by a repo-wide grep run to confirm Phase 34's writers were exhaustively enumerated, but was NOT treated as an in-scope finding: it is outside this plan's file list, only fills a NULL siren (never overwrites), and is already audit-logged (`company.siren_add`). Noted in the review's Summary prose as a scope boundary, not as a numbered finding — re-deriving a Phase 33 surface in full would have exceeded D-37-03's scope fence."

requirements-completed: [CLOSE-04]

# Metrics
duration: ~50min
completed: 2026-09-05
tasks: 2
commits: 1
files: 1
---

# Phase 37 Plan 04: Phase 34 Scoped Code Review Summary

**`.planning/phases/34-fiche-client/34-REVIEW.md` created — a scoped review of Phase 34's authorization/ownership boundary, its `relationship_events` write path, and its server actions, finding 0 Critical, 1 Warning (a missing cache-invalidation call on client creation), and 1 Info (an unnecessary `sql.raw()` on a safe compile-time constant), with all 21 reviewed files resolving on disk and CLOSE-04 now fully closed.**

## Performance

- **Duration:** ~50 min
- **Completed:** 2026-09-05
- **Tasks:** 2 (both landed in one commit — see Decisions Made)
- **Files modified:** 1 (created)

## Accomplishments

- Closed the review half of CLOSE-04: Phase 34 shipped 13 plans with no `34-REVIEW.md`; it now has one, scoped per D-37-03 to the highest-risk surfaces rather than a phase-wide re-read of the 13-plan diff.
- Reviewed the authorization/ownership boundary across 8 files (`client-relationships.ts`, `companies.ts`, `require.ts`, both `/clients` pages, both admin oversight pages) and found no defect: every partner-facing read compiles `ownerId` into the same statement as the lookup, not-found and not-owned are byte-identical on every tab including the `?tab=` variant, role is always server-derived, and the "guard that does not guard" shape named by `37-CONTEXT.md` (Phase 35's IN-01 precedent) was explicitly checked for and not found anywhere in this surface.
- Reviewed the `relationship_events` write path (`relationship-events.ts`, `relationship/kinds.ts`, `db/schema.ts`'s CHECK constraint) and found no defect: `insertRelationshipEventForOwner`'s `INSERT … SELECT` derives the relationship id from an ownership-verified source row, `actorId` is a required non-defaulted field, event `kind` is constrained twice (TS union + DB CHECK, confirmed identical at both), and the timeline read applies the same owner predicate the write proves.
- Reviewed the server actions (`crm/actions.ts`, `relationship/actions.ts`, both schema files, `audit-log.ts`) and found one Warning: `createClientRelationshipAction` performs no `revalidatePath` call, unlike every sibling Phase 34 write — currently inert under this project's Next.js 16.2.4 default (`staleTimes.dynamic: 0`), but an inconsistency against the pattern every other action in the same two files follows. Confirmed FICHE-01's outage behaviour, FICHE-03's audit-log coverage (including the SIREN-correction branch), and the returned-vs-thrown error discipline by reading the catch blocks, not the comments.
- Re-ran `tests/server-action-error-contracts.test.ts` live (1 file / 3 tests passed) rather than citing its prior-run result, plus all four CI gates (`lint:check`, `typecheck`, `test` — 172/2331 passed, 6/61 skipped, same baseline plan 37-03 confirmed) as this plan's own required verification.
- Marked CLOSE-04 complete in `.planning/REQUIREMENTS.md` — both `34-VERIFICATION.md` (37-03) and `34-REVIEW.md` (this plan) now exist, closing the requirement plan 37-03 deliberately left open.

## Task Commits

Both tasks produced sections of the same single output document
(`34-REVIEW.md`); the plan was executed as one atomic commit rather than
two per-task commits, since the document is only a coherent, citable
artifact once all three risk areas' verdicts and the closed frontmatter
`findings` counts exist together (see Decisions Made).

1. **Task 1 + Task 2: Review authorization/event-write path, then the server actions and close the report** — `c5fd370` (docs)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP update)

## Files Created/Modified

- `.planning/phases/34-fiche-client/34-REVIEW.md` — the full scoped review: frontmatter (`depth: scoped`, `files_reviewed: 21`, `findings: {critical: 0, warning: 1, info: 1, total: 2}`, `status: issues_found`, `reviewed_at_commit: eec4948e33b085ce22f9a39e0027574168a595cf`), a `## Summary` opening with the scope declaration and an explicit "what was NOT examined" list, one paragraph per risk area each ending in an explicit verdict, `## Warnings` (WR-01), `## Info` (IN-01), a live-re-run "Behavioral confirmation" section, and the three-line footer.

## Decisions Made

- **Single commit for both tasks.** Same reasoning 37-03 used: Task 1 alone produces an unclosed document (missing risk area 3's verdict, the closed `findings` counts, and the footer), which cannot satisfy this plan's own acceptance criteria or be independently citable. No code was touched by either task.
- **WR-01 recorded, not escalated.** Per the plan's disposition rule, only a Critical finding requires an explicit operator decision point in this SUMMARY. WR-01 (Warning) and IN-01 (Info) are recorded in the review document itself, listed below for visibility, and NOT fixed in-flight — this plan produces a document, not a patch to Phase 34 source. `git status --porcelain` after the commit shows only `34-REVIEW.md` changed.
- **The Phase 33 `pipeline/actions.ts` SIREN-fill site is out of scope, not a finding.** Discovered via a repo-wide grep run to confirm Phase 34's `companies`-table writers were exhaustively enumerated (there were 4, not the expected 3: `updateCompanyDisplayAction`, `registry-sync.ts` twice, and this one). Confirmed it only fills a NULL siren and is already audit-logged, then explicitly excluded from re-derivation as a Phase 33 surface outside this plan's file list — recorded in the review's Summary prose so a future reader knows it was seen and deliberately not re-audited, not missed.

## Findings (recorded, not fixed)

**0 Critical.** No operator decision point required by this plan's disposition rule.

**1 Warning — WR-01.** `createClientRelationshipAction` (`src/lib/crm/actions.ts:219`) performs no `revalidatePath` call, unlike `updateCompanyDisplayAction`, `refreshCompanyRegistryAction`, `deleteClientRelationshipAction`, `updateRelationDetailsAction`, `addRelationshipNoteAction` and `setNextActionAction`, all of which do. Currently inert: `CreateClientDialog.tsx` navigates to a brand-new route the Router Cache cannot already hold, and this project's Next.js 16.2.4 default (`staleTimes.dynamic: 0`, no override in `next.config.ts`) means the Router Cache does not hold dynamic pages at all today. Recommended fix (in the review document): add `revalidatePath('/clients', 'layout')` and `revalidatePath('/pipeline')` before the action's return, matching every sibling.

**1 Info — IN-01.** `listRelationshipsNeedingFollowUp` (`src/lib/db/queries/relationship-events.ts:226, 270`) uses `sql.raw()` to splice in a hardcoded module constant (`"interval '30 days'"`). Not exploitable — the value is never derived from any input — but it is the only `sql.raw()` call across the 21 reviewed files, and the primitive itself bypasses parameter binding entirely. Recommended fix: write the interval literal directly inside the template, removing the one `sql.raw()` call in this module.

## Deviations from Plan

None that affected correctness or scope. The only departure from the plan's literal task-by-task commit cadence is the single-commit choice documented above, a documentation-only judgment call with no code impact (matching plan 37-03's own precedent in this phase).

## Issues Encountered

None. Both the 4 CI gates and the plan's own `tests/server-action-error-contracts.test.ts` re-run were performed live during this plan, not taken from a prior claim, and all passed at the reviewed commit (`eec4948`) before this plan's own commit (`c5fd370`) was made.

## Review Report Key Facts (for the operator)

- **Final status:** `issues_found` (0 Critical / 1 Warning / 1 Info)
- **`files_reviewed`:** 21, all confirmed to resolve (`test -f` exits 0 for every listed path)
- **`reviewed_at_commit`:** `eec4948e33b085ce22f9a39e0027574168a595cf`
- **Live gate numbers at this plan's own verification pass:** `lint:check` exit 0 · `typecheck` exit 0 · `test` 172 files / 2331 tests passed, 6 files / 61 skipped · `tests/server-action-error-contracts.test.ts` (the plan's cited recurrence guard) 1 file / 3 tests passed, re-run live
- **No Critical found.** No operator decision point is required by this plan. The one Warning and one Info are recorded above and in `34-REVIEW.md` for future disposition, not fixed here.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `34-REVIEW.md` now exists alongside `34-VERIFICATION.md`, and CLOSE-04 is marked complete in `.planning/REQUIREMENTS.md` — both halves plan 37-03 identified as required now exist.
- No Phase 34 source file was modified by this plan; the two findings (WR-01, IN-01) remain open for a future phase or operator decision to act on, exactly as the plan's disposition rule requires for non-Critical findings.
- No blockers for plan 37-05's consolidated operator walk. This plan touched no UI surface, no requirement checkbox beyond CLOSE-04, and no Phase 38/39/40 artifact (`git status --porcelain` after the commit showed only `34-REVIEW.md`).

---
*Phase: 37-crm-stack-closure*
*Completed: 2026-09-05*

## Self-Check: PASSED

- `test -f .planning/phases/34-fiche-client/34-REVIEW.md` — FOUND
- `test -f .planning/phases/37-crm-stack-closure/37-04-SUMMARY.md` — FOUND
- `git log --oneline --all | grep c5fd370` — FOUND
- `.planning/REQUIREMENTS.md:57` — `CLOSE-04` checkbox is `[x]`

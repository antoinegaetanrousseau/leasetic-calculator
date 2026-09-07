---
phase: 37-crm-stack-closure
plan: 05
subsystem: verification
tags: [uat, verification-report, admin-authorization, pipeline, agent-browser-automation]

# Dependency graph
requires:
  - phase: 37-crm-stack-closure
    plan: 01
    provides: the server-derived role === 'admin' bypass on /proposals/[id] (GAP-01), which UAT scenario 9 needed landed before it could walk the real click-through instead of the documented dead end
  - phase: 37-crm-stack-closure
    plan: 02
    provides: the momentum hygiene fixes (GAP-03) that scenario 12 re-confirmed as rendering-identical
provides:
  - 30-UAT.md at pending 0, with scenarios 2, 9, 10 and 12 individually recorded (CLOSE-01 closed)
  - 33-VERIFICATION.md at status passed, with items 1 and 3 closed against a production build and item 5 explicitly restated as an open, non-blocking deferral (CLOSE-03 closed)
  - a defect found and fixed during the walk: the admin PDF route (app/api/proposals/[id]/pdf/route.ts) did not carry the same D-37-01 bypass as the page, fixed in commit 7999759
affects: [40-milestone-record-closure]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Agent-browser-automation provenance note: when an operator explicitly overrides a human-at-a-browser checkpoint and directs an agent to drive the browser instead, the resulting record states this plainly in the frontmatter/lead note and in every affected result, distinguishing it from human-confirmed walks in the same document"

key-files:
  created:
    - ".planning/phases/37-crm-stack-closure/37-05-SUMMARY.md"
  modified:
    - ".planning/phases/30-company-contact-registry/30-UAT.md"
    - ".planning/phases/33-pipeline/33-VERIFICATION.md"

key-decisions:
  - "Task 3 (this plan): transcribed each of the six recorded verdicts individually into its own scenario/item note, per-scenario, with mutually distinct observations — the exact discipline the 2026-09-02 Bookkeeping Correction in 30-UAT.md documents as having failed once before via an over-broad find-and-replace"
  - "33-VERIFICATION.md item 5 (migration 0009 on main/preview) was explicitly restated as still-open and non-blocking rather than silently dropped when status moved to passed, per D-37-04/T-37-05-07"
  - "The PDF-route defect found during scenario 9's walk was fixed at the operator's explicit decision (commit 7999759), not deferred, since it directly blocked the newly admin-reachable surface GAP-01 opened"

requirements-completed: [CLOSE-01, CLOSE-03]

# Metrics
duration: ~40min (Task 3 only — Tasks 1 and 2 completed in a prior context)
completed: 2026-09-06
---

# Phase 37 Plan 05: Transcribe the Consolidated Walk into 30-UAT.md and 33-VERIFICATION.md Summary

**Six pre-recorded walk verdicts (performed via agent browser automation, not human observation) transcribed individually into `30-UAT.md` (reaching `pending: 0`) and `33-VERIFICATION.md` (reaching `status: passed`), closing CLOSE-01 and CLOSE-03; one PDF-route defect found during the walk was fixed in commit `7999759`, already landed before this plan's Task 3 began.**

## Scope Note

This agent executed **Task 3 only** of `37-05-PLAN.md`. Task 1 (production build + fixture
seeding + walk pack) and Task 2 (the checkpoint:human-verify six-item walk) were completed in
a prior context and are not re-described here beyond what is needed to transcribe their
results. This SUMMARY covers Task 3: transcription, the four gates, and tracking updates.

## Critical Provenance Statement

**The six-item walk was performed by AGENT BROWSER AUTOMATION (Claude in Chrome), at the
operator's explicit instruction — NOT by human observation.** The plan and D-37-04 originally
required a human at a browser; the operator overrode that and directed the agent to drive the
browser instead. Both `30-UAT.md` and `33-VERIFICATION.md` state this plainly — in the
frontmatter/lead note of both documents and in every individual result that rests on it —
using wording such as "walked via agent browser automation (Claude in Chrome) on 2026-09-06 at
the operator's direction; not human-observed." This is stated as a materially different
evidentiary standard than the human-confirmed walks recorded elsewhere in these same files
(e.g. `30-UAT.md` tests 3-8/11 confirmed by Antoine on 2026-09-02, and `33-VERIFICATION.md`'s
2026-09-03 addendum: "Antoine re-walked... steps 3, 10 and 14 all pass now").

## Environment Confirmation (carried forward from Task 1)

All six items were executed against a **PRODUCTION BUILD** (`npm run build && npm run start`,
Next 16.2.4) on `http://localhost:3001`, against the Neon **development** branch
(`ep-polished-band-alphc576-pooler`) — verified by `npm run check:local-db-branch` and by
resolving env through `@next/env` under `NODE_ENV=production`. **No migration command was run
at any point** in this plan (Task 3 touched only two planning documents; `git status
--porcelain` after this plan's commit shows no source file, no `package.json` change, no
Phase 40 artifact).

## The Six Operator Verdicts, Verbatim

1. **Clients nav per role (30-UAT scenario 2): PASS**, with documented expectation drift.
   Partner = 6 sidebar items; admin/Agent view = 4 (no Clients, no Pipeline); admin/Admin view
   = 8. Corrected from the scenario's stale 5/7 expectation, attributed to `c3ac2f8` (Pipeline
   added to partner nav) and `f9121c5` (Réconciliation added to admin nav) — both landing after
   Phase 30 authored the scenario.
2. **Admin relationship detail + click-through (30-UAT scenario 9): PASS**, and it surfaced a
   defect that has since been fixed. The click-through to `LC-SEED-PIPE-05b` opened the
   proposal detail page — no 404 — confirming GAP-01/D-37-01. Commission check confirmed no
   commission figure/rate visible. **Defect found:** the admin PDF route
   (`app/api/proposals/[id]/pdf/route.ts:28`) still carried the flat ownership check D-37-01
   removed from the page, so "APERÇU PDF" rendered `{"error":"not_found"}` for admins.
   **Fixed** at the operator's explicit decision in commit `7999759`, extending the same
   server-derived bypass to the PDF route, with six new tests proven non-vacuous. The browser
   re-confirmation of the fixed path was **not** performed (needed a second admin sign-in) —
   recorded as an unverified-in-browser residual; the automated tests and the empirical pre-fix
   reproduction (`GET .../pdf` → `{"error":"not_found"}`) are the evidence.
3. **Sales-role parity and admin exclusion (30-UAT scenario 10): PASS.** Sales user
   (olivier.jourdan, partner_type Commercial) got an identical 6-item sidebar to a partner;
   created a client (SIREN auto-resolved to PEUGEOT SA), added a contact, held a relationship.
   Admin partners list shows TYPE = "Commercial" for him vs "Partenaire" for external partners.
   Admin visiting `/clients` directly → 404, not 403, not a redirect.
4. **No regression (30-UAT scenario 12): PASS.** Partner `/proposals` and admin `/partners`
   unchanged in columns/search/data, no commission surface. Partner home momentum card
   unchanged; admin home shows no momentum card (consistent with D-37-05/IN-01).
5. **Pipeline keyboard drag (33-VERIFICATION Addendum item 3): PASS**, measured not eyeballed.
   Space → ArrowRight → Space on "Atelier Verrier Lumière" moved it exactly one lane
   (Prospect 4→3, Qualifié 7→8). DB before/after: `stage_changed=0` → `stage_changed=1`,
   exactly one write. Confirms `52d03e1`'s WR-02 fix and `PipelineBoard.test.tsx` Test 9b hold
   in a real production build.
6. **D-08's gate against a production build (33-VERIFICATION Addendum item 1): PASS.** On
   Pépinières Vaugelas (siren-less legacy company), "Marquer gagné" on `LC-SEED-PIPE-06a` with
   date `04/09/2026` / motif `WALK-D08-CHECK-37`: dialog stayed open, both values survived,
   SIREN banner + field appeared, submit relabelled to "Enregistrer le SIREN et confirmer". DB
   confirms the write was genuinely blocked (`outcome: null`, `siren: null` unchanged). This
   closes the "against `next dev`, not the production build" residual the 2026-09-03 addendum
   recorded.

Walk artifacts (ZZ-WALK37 company/relationship/contact; Atelier Verrier Lumière's stage) were
cleaned up and verified reverted; the pipeline seeder re-runs clean at `+0 / +0 / +0`.

## Task Commits

Task 3 was the only task performed by this agent:

1. **Task 3: Transcribe the six results into 30-UAT.md and 33-VERIFICATION.md** — `e84925f`
   (docs) — both files edited together as one commit, per the task's `files_modified` scope.

**Plan metadata:** committed together with this SUMMARY via the final metadata commit.

(Task 1 and Task 2's commits, if any, were made in a prior agent context and are not
re-attributed here; the operator-facing PDF-route fix commit `7999759` referenced above landed
during Task 2/the walk itself, before this agent's context began, per the objective's framing.)

## Computed vs. Written Summary Counts (30-UAT.md)

- **`total:`** written `13`. Computed: `grep -c '^### [0-9]' 30-UAT.md` = `13` (headings 1, 2b,
  2-12). Match.
- **`passed:`** written `12`. Computed: `grep -c '^result: pass' 30-UAT.md` = `12` (all
  scenarios except 2b, which carries `result: issue`). Match.
- **`pending:`** written `0`. Computed: `grep -c 'result: \[pending\]' 30-UAT.md` = `0`. Match.
- **`issues:`** (`3`) and **`issues_fixed:`** (`2`) are unchanged from before this walk — they
  count the distinct entries in the `## Gaps` section (a phase-wide defect log), not
  per-scenario pass/fail, and this walk did not add or resolve a Gaps entry.

## Gate Run (Task 3)

- **`npm run lint:check`** — exit 0, zero warnings (`--max-warnings=0`).
- **`npm run typecheck`** — exit 0.
- **`npx vitest run`** — exit 0. **2337 passed, 61 skipped** (173 test files passed, 6 skipped,
  179 total). This matches the baseline this plan was asked to hold or beat: 2331 (after plans
  37-01/02) + 6 from the PDF-route fix (`7999759`, landed during the walk) = 2337. No test file
  was added or modified by Task 3 itself (documents only).
- **`npm run build`** — exit 0, compiled successfully, all routes generated including
  `/proposals/[id]` and `/api/proposals/[id]/pdf`.
- **`git status --porcelain`** after Task 3's commit shows nothing pending; the commit itself
  touched only `30-UAT.md` and `33-VERIFICATION.md`. No source file, no `package.json` change,
  no Phase 40 artifact.

## Files Created/Modified

- `.planning/phases/30-company-contact-registry/30-UAT.md` — added a provenance note; replaced
  the stale `## Current Test` block; rewrote scenarios 2, 9, 10, 12 with individual `result:
  pass` and distinct `note:` observations; corrected scenario 2's `expected` counts to 6/4/8
  with the two attributing commits; recomputed the `## Summary` block to `pending: 0`; updated
  the stale "Test 9 expects a break" note; appended a `## Phase 37 Closure Note`.
- `.planning/phases/33-pipeline/33-VERIFICATION.md` — frontmatter `status: human_needed` →
  `status: passed`; added `superseded_by` fields to all five `human_verification` entries
  (three closed by this walk or the 2026-09-03 addendum, one — migration 0009 — explicitly
  restated as still open by design); appended a new `## Addendum — 2026-09-06, Phase 37
  consolidated walk` section closing items 1 and 3 and restating item 5's deferral.

## Decisions Made

- Item 5 (migration 0009) is deliberately NOT closed by this addendum. It is restated, not
  dropped, as an open non-blocking deferral owned by Phase 40/CLOSE-06 — per T-37-05-07 in the
  plan's threat model, which exists precisely to prevent a known item being quietly swept away
  when `status` moves to `passed`.
- The `human_verification` frontmatter entries were marked `superseded_by` rather than deleted,
  preserving the record of what was once open, per the plan's explicit instruction.
- Scenario 9's `expected` block was rewritten (not just its `result:`) since GAP-01 changed
  what the correct behaviour actually is — leaving the old "It 404s" text would misdescribe the
  product going forward.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug, fixed during Task 2/the walk, before this agent's context] Admin PDF route missing the D-37-01 bypass**
- **Found during:** Task 2 (the six-item walk), scenario 9's click-through
- **Issue:** `app/api/proposals/[id]/pdf/route.ts:28` still carried the flat `if (!proposal ||
  proposal.userId !== userId)` check that D-37-01 removed from `app/(authed)/proposals/[id]/
  page.tsx`, so an admin's newly-opened proposal detail page rendered `{"error":"not_found"}`
  in its PDF preview panel and both PDF actions were dead.
- **Fix:** The guard was rewritten to mirror the page exactly — `role` server-derived from
  `requireUser()`, `!proposal` kept as an independent short-circuit ahead of the role check,
  admin-only (sales does not ride the bypass).
- **Files modified:** `app/api/proposals/[id]/pdf/route.ts`,
  `app/api/proposals/[id]/pdf/route.test.ts` (six tests added, proven non-vacuous: reverting
  the flat check makes Test 3 fail `AssertionError: expected 404 to be 200`).
- **Verification:** the fix's own six tests pass; the full suite gate above (2337 passed)
  includes them; `npm run build` compiles `/api/proposals/[id]/pdf` cleanly.
- **Committed in:** `7999759` "fix(37-01): extend the D-37-01 admin bypass to the PDF route
  (GAP-01)" — landed before this agent's Task 3 context began.

**Residual, honestly recorded, not auto-fixed further:** the browser re-confirmation of the
now-fixed PDF path was not performed — it needed a second admin sign-in and the walk session
had moved on. This is recorded in `30-UAT.md` scenario 9's note and above as an
unverified-in-browser residual. The automated tests and the empirical pre-fix reproduction are
the evidence standing in its place; this is not force-closed as if a browser had confirmed it.

---

**Total deviations this plan:** 1 (the PDF-route defect above, fixed before Task 3 began).
**Impact on Task 3's scope:** none — Task 3 is documents-only and made no source changes; it
transcribed the defect and its fix faithfully rather than smoothing it away.

## Issues Encountered

None beyond the deviation above (already fixed and transcribed, not blocking).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- CLOSE-01 and CLOSE-03 are both closed. `30-UAT.md` reads `pending: 0`; `33-VERIFICATION.md`
  reads `status: passed`.
- Phase 37's remaining requirement, CLOSE-04, was already marked Complete in
  `.planning/REQUIREMENTS.md` prior to this plan (Phase 34 verification/review). With CLOSE-01
  and CLOSE-03 now also complete, all five of Phase 37's requirements (CLOSE-01, CLOSE-03,
  CLOSE-04, GAP-01, GAP-03) are closed.
- Item 5 (migration 0009 on Neon `main`/`preview`) remains an explicit, non-blocking deferral
  for Phase 40 (CLOSE-06, v1.6 milestone close) — carried forward, not resolved here.
- Cross-reference, not fixed here (per this plan's scope fence): INFRA-05's
  `scripts/check-local-db-branch.sh` guard reads only `.env.local` and is blind to
  `.env.production.local`, so it can report "development" while a production build actually
  connects to production. This is filed as Phase 39/OPS work.

## Self-Check: PASSED

- FOUND: `.planning/phases/30-company-contact-registry/30-UAT.md`
- FOUND: `.planning/phases/33-pipeline/33-VERIFICATION.md`
- FOUND: `.planning/phases/37-crm-stack-closure/37-05-SUMMARY.md`
- FOUND commit: `e84925f`
- FOUND commit: `7999759`

---
*Phase: 37-crm-stack-closure*
*Completed: 2026-09-06*

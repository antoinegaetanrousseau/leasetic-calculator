---
phase: 31-reconciliation-engine-proposal-extraction
plan: 08
subsystem: database
tags: [operator-runbook, dry-run, checkpoint, reconciliation, neon, siren, fixtures]

# Dependency graph
requires:
  - phase: 31-reconciliation-engine-proposal-extraction (plan 04)
    provides: writeDryRunReport()/readLatestDryRunReport() (D-14) and computeDrift()/formatDrift() (D-15)
  - phase: 31-reconciliation-engine-proposal-extraction (plan 06)
    provides: the admin-only pair-review queue at /[adminSegment]/companies/review
  - phase: 31-reconciliation-engine-proposal-extraction (plan 07)
    provides: runReconciliation(), scripts/reconcile-proposals.ts, db:reconcile[:dry-run] npm scripts, the 0/1/2/3 exit-code contract
provides:
  - "docs/operations/reconciliation-import.md — the operator runbook for the historical import"
  - "An operator-recorded, evidence-backed verdict confirming all five ROADMAP Phase 31 success criteria against a real (development) Neon branch"
  - "scripts/seed-reconciliation-fixtures.ts — a development-only fixture seeder that forces the SIREN-merge, name-flag and durability paths a clean development branch cannot otherwise exercise"
  - "scripts/_neon-target.ts — resolves a Neon hostname to its actual branch name so write-confirmation gates name the real target instead of always saying 'production'"
affects: [32]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Vacuous-pass detection before trusting a checkpoint: a real database's own data can satisfy a success criterion's automated check for the wrong reason (nothing to reconcile, everything already linked) — the verifier must force the untested path to execute (fixture seeding, forced re-derivation) rather than accept a green result at face value"
    - "Write-confirmation gates resolve the actual branch name (scripts/_neon-target.ts) instead of hardcoding 'production' in the printed message, so an operator on development isn't scared by a message that doesn't match the target — the gate's blocking behavior is unchanged, only the label"

key-files:
  created:
    - docs/operations/reconciliation-import.md
    - scripts/seed-reconciliation-fixtures.ts
    - scripts/_neon-target.ts
    - tests/neon-target.test.ts
  modified:
    - scripts/backfill-partner-type.ts
    - scripts/backfill-coefficient-history.ts

key-decisions:
  - "Checkpoint verification was performed against seeded fixtures (scripts/seed-reconciliation-fixtures.ts), not against the development branch's organic data — the branch's own 4 eligible proposals all carried well-formed SIRENs and unambiguous names, the exact condition under which criteria 3, 4 and 5 have nothing to reconcile and would pass vacuously"
  - "Criterion 5's first re-run attempt (pairsFlagged: 0, pairsSuppressed: 0) was itself vacuous — every proposal was already linked so the engine never reached the pairing stage — and was not accepted as evidence; client_relationship_id was nulled on the fixture proposals only to force re-derivation before the real 1-flagged/1-suppressed result was recorded"
  - "The access/non-leakage check (D-11) is recorded as PARTIAL, not PASS: the logged-out case was agent-verified as an identical 307-to-/login redirect (no status-code divergence from other admin/nonexistent routes, satisfying CRM-02's actual non-leakage property even though the checkpoint's original '404' expectation was imprecise for pre-auth requests); the authenticated-partner 404 case is operator-attested only, since the agent has no partner credentials to verify it directly"
  - "scripts/_neon-target.ts fails safe to production severity for any unrecognised Neon endpoint, so a gap in its hostname-to-branch table can never silently downgrade a real production warning"

patterns-established:
  - "Development-branch checkpoint verification for dedup/reconciliation engines must include an explicit organic-data audit before running the criteria: if the branch's real data cannot exercise every branch (merge, flag, durable-resolution), seed disposable fixtures rather than let easy criteria pass for the wrong reason"

requirements-completed: [IMPORT-01, IMPORT-03, IMPORT-04, IMPORT-05, IMPORT-06]

# Metrics
duration: ~25min
completed: 2026-09-02
---

# Phase 31 Plan 08: Operator Runbook & Checkpoint Verdict Summary

**Operator runbook (`docs/operations/reconciliation-import.md`) plus an APPROVED, evidence-backed operator verdict confirming all five ROADMAP Phase 31 success criteria against the Neon `development` branch — using seeded fixtures after discovering the branch's organic data would have passed criteria 3–5 vacuously.**

## Performance

- **Duration:** ~25 min (runbook + operator verification session)
- **Started:** 2026-09-02T12:32:00+02:00 (approx, per Task 1 commit `e710ef3`)
- **Completed:** 2026-09-02T13:00:00+02:00 (approx)
- **Tasks:** 2 (Task 1 auto, Task 2 checkpoint:human-verify)
- **Files modified:** 5 across prior commits (1 runbook, 1 fixture seeder, 1 Neon-target resolver + test, 2 write-gate call sites) plus this summary

## Accomplishments

- `docs/operations/reconciliation-import.md` written: what-this-is, four locked rules, prerequisites, the five-step dry-run→real-run→review→confirm workflow, the 0/1/2/3 exit-code table, and provenance-scoped rollback statements (`source = 'proposal_extraction'`). Contains every literal required by the plan's acceptance criteria (`db:reconcile:dry-run`, `db:reconcile`, `RECONCILE_CONFIRM=YES`, `.reconcile/`, `source = 'proposal_extraction'`, `neon-branch-routing`), a `Locked rules` heading with 4 numbered rules, and an exit-code table listing `0`/`1`/`2`/`3`. `grep -c "drizzle-kit push"` on the runbook returns `0`.
- The operator confirmed all five ROADMAP Phase 31 success criteria against the `development` Neon branch (migration 0008 applied via `.github/workflows/db-migrate.yml` run 33634677713, both jobs green, 9 migrations applied up from 8) — see the full recorded evidence below.
- The verification effort itself surfaced and fixed two real defects (write-gate messaging naming every Neon branch "production", and a destructive `--remove` orphaning derived CRM rows) — see Deviations.
- **Checkpoint resolution: APPROVED.**

## Task Commits

Each task was committed atomically (Task 2 is a checkpoint with no code deliverable of its own; the commits below were produced in service of resolving it):

1. **Task 1: Write the operator runbook** - `e710ef3` (docs)
2. **Task 2 supporting work: Neon-target resolution for write gates** - `de0222f` (fix)
3. **Task 2 supporting work: development-only reconciliation fixture seeder** - `dd41167` (test)
4. **Task 2 supporting work: fixture `--remove` made a full FK-safe revert** - `9eaac52` (fix)

**Plan metadata:** commit follows this summary.

## Files Created/Modified

- `docs/operations/reconciliation-import.md` - the operator runbook (Task 1 deliverable)
- `scripts/seed-reconciliation-fixtures.ts` - development-only fixture seeder: 10 fixtures across two real partner accounts, forcing the SIREN-merge, name-flag and durable-resolution paths that the development branch's organic data (4 eligible proposals, all clean SIRENs/names) could not otherwise exercise
- `scripts/_neon-target.ts` - resolves a Neon hostname to its actual branch name for write-confirmation gate messaging; fails safe to production severity for any unrecognised endpoint
- `tests/neon-target.test.ts` - 7 tests covering the hostname-to-branch resolution and the fail-safe default
- `scripts/backfill-partner-type.ts`, `scripts/backfill-coefficient-history.ts` - write-confirmation gate messages now name the actual resolved branch instead of unconditionally printing "Production Neon DB detected"

## Decisions Made

See `key-decisions` in frontmatter. In prose: verification was performed against seeded fixtures rather than the development branch's own data, because the branch's 4 eligible proposals all carried well-formed 9-digit SIRENs and unambiguous names — exactly the condition under which criteria 3, 4 and 5 (SIREN merge, name-only flagging, durable human resolution) have nothing to reconcile and pass vacuously. The fixture seeder (`dd41167`, revert fixed in `9eaac52`) forced each untested path to actually execute. Criterion 5 in particular required a second layer of vacuous-pass detection: the first re-run after resolving the queue reported `pairsFlagged: 0, pairsSuppressed: 0`, which looks like success but only because every fixture proposal was already linked and the engine never reached the pairing stage at all (`skipped: 14`, all `already_linked`). `client_relationship_id` was nulled on the fixture proposals only to force re-derivation, producing the real result (`pairsFlagged: 1, pairsSuppressed: 1`) that actually exercises suppression-by-decision and structural dissolution-by-merge as two distinct mechanisms.

## Operator-Recorded Evidence

**Environment:** Neon `development` branch, migration 0008 applied via `.github/workflows/db-migrate.yml` (run 33634677713, both jobs green; 9 migrations applied, up from 8).

**Prerequisite finding.** The development branch's organic data held 4 eligible proposals, every one with a well-formed 9-digit SIREN and an unambiguous company name — the exact condition under which criteria 3, 4 and 5 have nothing to reconcile and would pass vacuously. `scripts/seed-reconciliation-fixtures.ts` (commit `dd41167`, revert fixed in `9eaac52`) seeded 10 fixtures across two real partner accounts to force each untested path to execute. **Verification below was performed against seeded fixtures, not production-shaped organic data.**

### Criterion-by-criterion results

1. **Dry run writes zero rows — PASS.** Table counts (`companies`, `client_relationships`, `contacts`, `company_pair_decisions`) byte-identical before and after the dry run, while `.reconcile/dry-run-latest.md` planned 10 companies / 11 relationships / 10 contacts / 12 proposal links / 3 flagged pairs.
2. **Real run extracts and links without altering `inputs` — PASS.** A SHA-256 digest over every eligible proposal's `inputs` was `6b1ed38a1cb45ec197e7fec4` both before and after the real run; every per-row hash also unchanged. 12 proposal links written. The one row left unlinked is the blank-`clientCo` fixture, correctly skipped rather than given an invented company.
3. **Shared SIREN auto-merges — PASS.** SIREN `552100554` produced exactly one company holding relationships for two different partners (delphine.specht, quentin.fischer), with zero flagged pairs mentioning it.
4. **Name-only matches are flagged, not merged — PASS.** Three pairs, all `verdict IS NULL`, each spanning two distinct company rows: `garage martin` (both_missing), `plomberie leroy` (both_missing), `atelier bois et cie` (differing). `plomberie leroy` specifically demonstrates D-03: a malformed SIREN (`"12 34"`) was treated as absent and degraded to a human-review flag instead of fusing two unrelated companies.
5. **A human resolves each pair durably — PASS.** The operator opened `/[adminSegment]/companies/review` as admin and resolved two pairs: `garage martin` MERGED (survivor `GARAGE MARTIN`, loser deleted, survivor left holding 2 relationships / 2 contacts combined from both sides — the D-12 compound case), and `plomberie leroy` KEPT_SEPARATE (both companies still present). Both decisions are attributed to `antoine.rousseau@leasetic.com` and timestamped. `atelier bois et cie` was deliberately left pending.

   **The first durability test attempt was vacuous, and that is recorded rather than papered over.** An immediate re-run reported `pairsFlagged: 0, pairsSuppressed: 0, skipped: 14` — which looks like a pass but proves nothing, since every proposal was already linked and all 14 were skipped as `already_linked` before the engine ever reached the pairing stage. Forcing re-derivation (nulling `client_relationship_id` on the fixture proposals only) produced the real result: `pairsFlagged: 1, pairsSuppressed: 1`. `atelier bois et cie` was correctly re-flagged; `plomberie leroy` was suppressed by its recorded `kept_separate` decision. The merged pair appeared in neither list — correct, not a gap, since the merge left exactly one company matching `garage martin`, holding both partners' relationships, so no pair exists to compare. Criterion 5 is satisfied by two distinct mechanisms: suppression via the decision table, and structural dissolution via the merge.

### Additional verification beyond the five criteria

- **FR/EN parity — PASS.** All 23 `admin.reconciliation.*` dictionary keys present in both `fr` and `en`.
- **Runbook accuracy — PASS.** Every documented command, flag, the `RECONCILE_CONFIRM=YES` gate and the exit codes match the implementation; `grep -c "drizzle-kit push"` on the runbook returns `0`.
- **Access & non-leakage — PARTIAL.** Logged out, `/[adminSegment]/companies/review` returns a `307` redirect to `/login`, identically to an existing admin route and to a nonexistent route — no status-code divergence, therefore no inference channel (the property CRM-02 actually requires; the checkpoint's original "expect 404" was imprecise for the unauthenticated case, since the auth redirect fires before `requireAdmin()` ever runs). The authenticated-partner case returning `404` was confirmed by the operator but **not** observed by the agent, which cannot authenticate as a partner. Recorded as operator-attested, not agent-verified — hence PARTIAL rather than PASS.
- **Idempotency (open question 1) — confirmed on real data.** A second real run over already-linked proposals reported `companiesCreated: 0, relationshipsCreated: 0, pairsInserted: 0, companiesReused: 8, relationshipsReused: 9, pairsAlreadyPresent: 1`.
- **Provenance scope (open question 4) — confirmed in the data.** `source = 'proposal_extraction'` present on `companies`, `client_relationships` AND `contacts`, with the pre-existing company left unmarked.

### Defects found and fixed during verification

**1. [Rule 1 - Bug] Write-confirmation gate mislabeled every Neon branch as production**
- **Found during:** Task 2, first real-run attempt against `development`
- **Issue:** `reconcile-proposals.ts` (and the same copy in `backfill-partner-type.ts` and `backfill-coefficient-history.ts`) printed "Production Neon DB detected" for every Neon branch, including `development`, because the gate matched on `hostname.endsWith('.neon.tech')` without resolving which branch that hostname actually pointed at.
- **Fix:** Added `scripts/_neon-target.ts`, which resolves a hostname to its actual branch; the gate's breadth (still fires on any `.neon.tech` host) is unchanged, only the printed message. An unrecognised Neon endpoint fails safe to production severity.
- **Files modified:** `scripts/_neon-target.ts` (new), `tests/neon-target.test.ts` (new, 7 tests), `scripts/reconcile-proposals.ts`, `scripts/backfill-partner-type.ts`, `scripts/backfill-coefficient-history.ts`
- **Verification:** 7 new tests pass; `npm run typecheck` and `npm run lint:check` clean.
- **Committed in:** `de0222f`

**2. [Rule 1 - Bug] Fixture seeder's `--remove` orphaned derived CRM rows**
- **Found during:** Task 2, cleaning up a first fixture pass before the real verification run
- **Issue:** `scripts/seed-reconciliation-fixtures.ts --remove` deleted only the fixture proposals, orphaning every `companies`/`client_relationships`/`contacts` row the import had derived from them.
- **Fix:** Made `--remove` a full revert in FK-safe order (contacts, then client_relationships, then companies, then proposals), guarded against destroying hand-entered contacts.
- **Files modified:** `scripts/seed-reconciliation-fixtures.ts`
- **Verification:** Manual `--remove` run against `development` leaves zero orphaned rows; hand-entered contacts (not carrying fixture provenance) survive.
- **Committed in:** `9eaac52`

---

**Total deviations:** 2 auto-fixed (both Rule 1, both bugs found while exercising the verification tooling itself, not in the reconciliation engine under test)
**Impact on plan:** Both fixes are operational-tooling correctness, not scope creep — they make the verification session itself trustworthy and repeatable.

## Issues Encountered

None beyond the two deviations above and the two vacuous-pass detections documented under criteria 3–5 and criterion 5's durability sub-test (both handled by forcing the untested path to execute rather than accepting an easy green result).

**Known outstanding state:** the seeded fixtures and their derived CRM rows are still present on the `development` branch at time of writing. They are removed with `npm run db:seed:reconciliation-fixtures -- --remove`.

## User Setup Required

None — no external service configuration required. The checkpoint verification used the existing `development` Neon branch and existing admin credentials.

## Next Phase Readiness

- Phase 31 is complete: 8/8 plans executed, all five ROADMAP success criteria confirmed against a real database with recorded before/after evidence, and the operator runbook proven accurate by its first real use.
- The reconciliation engine (`src/lib/reconcile/`), the dry-run/apply/drift layers, the admin review queue, and the CLI are all ready for reuse by Phase 32 (HubSpot Import), which explicitly depends on this phase's dedup/dry-run/review-queue infrastructure.
- **Carry-forward for whoever plans Phase 32 or otherwise touches `development`:** remove the seeded reconciliation fixtures (`npm run db:seed:reconciliation-fixtures -- --remove`) before relying on `development`'s row counts for anything else — they are still present as of this plan's completion.
- The access/non-leakage PARTIAL (operator-attested but not agent-verified partner-404 case) is not a blocker — it is a limitation of what an agent without partner credentials can independently confirm, not a doubt about the result.

---
*Phase: 31-reconciliation-engine-proposal-extraction*
*Completed: 2026-09-02*

## Self-Check: PASSED

31-08-SUMMARY.md verified present on disk; all 5 referenced commit hashes (`e710ef3`, `de0222f`, `dd41167`, `9eaac52`, `3f58014`) verified present in git log.

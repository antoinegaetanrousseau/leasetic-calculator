---
phase: 36-gate-repair-planning-record-hygiene
plan: 02
subsystem: infra
tags: [planning-hygiene, npm-scripts, requirements-audit, tsx]

# Dependency graph
requires:
  - phase: 36-01
    provides: HOUSE-01 (lint gate closed by evidence) and HOUSE-02 (stale open-questions annotated)
provides:
  - CALC-07 and PROP-01 flipped from [~] (partial) to [x] (complete) at all four sites in .planning/milestones/v1.1-REQUIREMENTS.md, with the completing phase (Phase 8) named inline
  - Line-345 PROP-01 rationale prose explicitly reconciled with the flip instead of left as a silent, unexplained contradiction
  - `db:seed:partner-launch` npm script making scripts/seed-partner-launch.ts reachable by name instead of by path
affects: [37-crm-stack-closure, 40-milestone-record-closure]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Flip attribution `(flipped <date>, Phase <N> <REQ-ID> / D-<id>)` appended in-line to a requirement bullet so a future auditor can trace who changed a shipped-status marker and on what authority"

key-files:
  created: []
  modified:
    - .planning/milestones/v1.1-REQUIREMENTS.md
    - package.json

key-decisions:
  - "CALC-07 and PROP-01 rewritten in the house `— <narrative>` completed-with-nuance style (matching the CALC-06 neighbour) rather than simply deleting the PARTIAL clause, so the narrative still names the concrete artefacts that satisfy the requirement"
  - "Line-345 PROP-01 rationale prose was reconciled (appended clause), not deleted or left silent, per D-36-06's explicit instruction"
  - "db:seed:partner-launch takes no baked-in CONFIRM= or INITIAL_PASSWORD= prefix (unlike purge:soft-deleted:dry) because those env vars are the operator's authorization gate, not a dry-run safety switch — baking them in would mask the gate's own error message"

requirements-completed: [HOUSE-03]

# Metrics
duration: ~18min
completed: 2026-09-05
---

# Phase 36 Plan 02: Requirements Flip + Seed-Partner npm Script Summary

**Flipped CALC-07/PROP-01 from stale `[~]` to `[x]` across four sites in v1.1-REQUIREMENTS.md (naming Phase 8 as the completing phase) and gave `scripts/seed-partner-launch.ts` a discoverable `db:seed:partner-launch` npm entry, proven safe with a live dry-run that reached the CONFIRM gate without ever constructing a DB client.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-09-05T14:13:34Z (continuing from plan 36-01's session)
- **Completed:** 2026-09-05T14:18:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- CALC-07 and PROP-01 now read `[x]` in both the requirement list and the traceability table; each narrative names Phase 8 as the completing phase and the concrete artefacts (`proposalInputSchema.parse`, `computeLoyer`, `params_snapshot + inputs + computed` jsonb write for CALC-07; PROP-02..05 for PROP-01), with a `(flipped 2026-09-05, Phase 36 HOUSE-03 / D-36-06)` attribution
- The line-345 PROP-01 rationale prose — which already argued the empty CTA satisfies PROP-01 — was extended with an explicit reconciliation clause rather than left to silently contradict the flip
- BOOT-03's legitimate `[~]` marker (line 24) confirmed untouched; no sweep-replace occurred
- Added `db:seed:partner-launch` to `package.json`, identical in shape to the three neighbouring `db:seed:*` entries, invoking `tsx -r ./scripts/_preload-mock-server-only.cjs scripts/seed-partner-launch.ts`
- Proved the `--` separator reaches `process.argv`: `npm run db:seed:partner-launch -- probe@test.leasetic.com` with no `CONFIRM`/`INITIAL_PASSWORD` exported passed gate 0 (the `@test.leasetic.com` domain check) and was refused by gate 1 (typed confirmation), echoing `CONFIRM=SEED-PARTNER-probe@test.leasetic.com` — proof the positional email reached the script and was used to build the email-scoped token
- Confirmed no DB client was ever constructed (`[seed-partner] Connected to:` absent by count) and nothing was written to `src/`, `app/`, or `drizzle/`

## Task Commits

Each task was committed atomically:

1. **Task 1: Flip CALC-07 and PROP-01 from [~] to [x] at all four sites and reconcile the line-345 prose** - `7fa7e6e` (docs)
2. **Task 2: Add the db:seed:partner-launch npm script and prove the positional arg reaches process.argv** - `1bd26ee` (feat)

**Plan metadata:** (this commit, following this summary)

## Files Created/Modified
- `.planning/milestones/v1.1-REQUIREMENTS.md` - CALC-07 body (line 81) and PROP-01 body (line 86) flipped `[~]`→`[x]` with Phase 8 narrative; traceability rows (lines 283, 285) flipped `Partial`→`Complete`; line-345 PROP-01 rationale prose reconciled with an appended clause
- `package.json` - new `db:seed:partner-launch` entry in the `scripts` block, placed immediately after `db:seed:fiche-fixtures`

## Decisions Made
- Kept the existing artefact descriptions (client preview seam, empty-state shell) verbatim inside each flipped bullet and only replaced the forward-looking "blocks on Phase 8" clause with a completed statement — preserves the historical record of what Phase 7 shipped vs. what Phase 8 added, rather than rewriting history
- Traceability rows use the `Complete (<plan-id> <clause>)` shape already established by the CALC-08 row, retaining each requirement's original authoring-phase attribution in cells 1–2
- No `CONFIRM=`/`INITIAL_PASSWORD=` prefix baked into the npm script value (see key-decisions above)

## Deviations from Plan

None — plan executed exactly as written. Both tasks matched their acceptance criteria on the first attempt; no auto-fixes, no blocking issues, no architectural questions.

## Verification Evidence

**Task 1 (`.planning/milestones/v1.1-REQUIREMENTS.md`):**
- `git diff --numstat` shows exactly 5 insertions / 5 deletions (within the "at most 5/5" bound)
- All acceptance-criteria greps passed: `[~]` count 0 / `[x]` count 1 for both CALC-07 and PROP-01; traceability rows show `Complete` not `Partial`; no `PARTIAL (07-05)`/`PARTIAL (07-03)` clause remains; both bullets contain the literal `Phase 8` and `D-36-06`; line-345's `the empty CTA satisfies PROP-01` anchor preserved verbatim; BOOT-03's `[~]` count unchanged at 1

**Task 2 (`package.json` + live dry run) — full transcript:**

```
$ unset CONFIRM INITIAL_PASSWORD
$ npm run db:seed:partner-launch -- probe@test.leasetic.com

> leasetic-matrice@0.1.0 db:seed:partner-launch
> tsx -r ./scripts/_preload-mock-server-only.cjs scripts/seed-partner-launch.ts probe@test.leasetic.com

[seed-partner] FATAL: typed-confirmation gate not satisfied.
[seed-partner] Expected: CONFIRM=SEED-PARTNER-probe@test.leasetic.com
[seed-partner] Got:      CONFIRM=(unset)

=== EXIT CODE: 2 ===
```

**Which gate refused:** Gate 1 (typed-confirmation), not gate 0 (domain check). The email `probe@test.leasetic.com` matched the `@test.leasetic.com` pattern and passed gate 0 silently; gate 1 then refused because `CONFIRM` was unset, echoing back `Expected: CONFIRM=SEED-PARTNER-probe@test.leasetic.com` — proof the positional argument reached `process.argv` and was used to build the email-scoped confirmation token, exactly as the plan required.

- `test "$(printf '%s' "$OUT" | grep -c '[seed-partner] Connected to:')" = "0"` → **true**: no DB client was ever constructed
- `test "$(printf '%s' "$OUT" | grep -c 'REFUSE: email does not match')" = "0"` → **true**: confirms the run did not stop at gate 0
- `git status --porcelain -- src/ app/ drizzle/` → empty: nothing written
- `git diff -U0 -- package.json | grep -c '^[+-]'` → 5 (≤ 6 bound); no `dependencies`/`devDependencies`/`version` line touched
- `git status --porcelain package-lock.json` → empty: lockfile untouched
- `npm run typecheck` → exit 0
- `npm run lint:check` → exit 0
- `node -e "JSON.parse(...)"` on `package.json` → exit 0 (valid JSON after the trailing-comma fix)

**Why the run cannot touch a database — stated correctly:** It is NOT that `DATABASE_URL` is unset — `scripts/seed-partner-launch.ts:39` runs `import './_load-env'`, which loads `.env.local` regardless of the operator's shell state, so `DATABASE_URL` was in fact populated during this run. The actual guarantee is **ordering**: gates 0 and 1 both `process.exit(2)` before the lazy `await import('../src/lib/db/index')` at ~line 135, so no Postgres client is ever constructed. This is why `[seed-partner] Connected to:` never appears in the transcript above. A future maintainer must not "fix" this by unsetting `DATABASE_URL` locally — that is not what protects the run.

**Overall plan-level verification (all passed):**
1. `node -e "JSON.parse(...)"` on `package.json` → exit 0
2. `npm run typecheck` → exit 0
3. `npm run lint:check` → exit 0
4. `git status --porcelain package-lock.json` → empty
5. `[~]` marker count in `.planning/milestones/v1.1-REQUIREMENTS.md`: 3 (at HEAD~2, before this plan) → 1 (after) — exactly 2 fewer, confirming only CALC-07 and PROP-01 were swept and BOOT-03's remains
6. `git diff -- eslint.config.mjs` → empty (untouched, per constraint)

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. The `db:seed:partner-launch` script is gated by `CONFIRM`/`INITIAL_PASSWORD`/`DATABASE_URL` env vars that an operator supplies at invocation time; no new setup step was introduced.

## Next Phase Readiness

- HOUSE-03 is closed: `.planning/REQUIREMENTS.md`'s HOUSE-03 checkbox should be flipped by the orchestrator per the execution-mode instructions (plan 36-01 already flipped HOUSE-01/HOUSE-02; this plan flips HOUSE-03 only).
- `eslint.config.mjs` remains byte-identical to HEAD, as required — Phase 36 continues to close HOUSE-01 by evidence only.
- Ready for the next plan in Phase 36's wave (HOUSE-04 vendored ReUI block deletion, or CLOSE-05's sentinel probe), neither of which this plan touched.

---
*Phase: 36-gate-repair-planning-record-hygiene*
*Completed: 2026-09-05*

## Self-Check: PASSED

- FOUND: `.planning/phases/36-gate-repair-planning-record-hygiene/36-02-SUMMARY.md`
- FOUND: `7fa7e6e` (Task 1 commit)
- FOUND: `1bd26ee` (Task 2 commit)

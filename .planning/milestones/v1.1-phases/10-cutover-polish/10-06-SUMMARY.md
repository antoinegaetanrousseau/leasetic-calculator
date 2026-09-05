---
phase: 10-cutover-polish
plan: "06"
subsystem: operations/docs/ci
tags: [runbook, launch-checklist, privacy, ci-grep-gate, CUT-01, CUT-02, CUT-03, CUT-07, CUT-08, phase-10]
dependency_graph:
  requires:
    - "10-01: check:no-v10-localstorage npm script registered in package.json"
    - "10-02: PURGE_CRON_SECRET documented; /api/internal/purge-soft-deleted route + vercel.json shipped"
    - "10-03: scripts/purge-test-data.ts + purge:test-data npm script shipped"
    - "10-04: SeedBanner.tsx + 'Vérifier les coefficients' UI shipped"
    - "10-05: scripts/smoke-ovh.ts + smoke:ovh npm script shipped"
  provides:
    - "scripts/check-no-v10-localstorage.sh: CI grep gate enforcing CUT-03 (no v10 localStorage keys in src/ + app/)"
    - "docs/operations/deploy-ovh.md: Antoine-context OVH deployment runbook (Provisioning → Smoke → Cron → Rollback)"
    - "docs/operations/launch-checklist.md: 9-step GFM pre-launch + pilot + batch-onboard checklist"
    - "docs/legal/privacy-coverage-confirmation.md: date-stamped paper-trail stub for Thomas's Open Q3 reply"
    - ".planning/PROJECT.md: 1-line CUT-02 vacuous-resolution cross-reference"
  affects:
    - scripts/check-no-v10-localstorage.sh
    - .github/workflows/ci.yml
    - docs/operations/deploy-ovh.md
    - docs/operations/launch-checklist.md
    - docs/legal/privacy-coverage-confirmation.md
    - .planning/PROJECT.md
    - .planning/REQUIREMENTS.md
tech_stack:
  added: []
  patterns:
    - "bash CI grep-gate structure: shebang + set -euo pipefail + hardcoded PATTERNS array + fixed-string grep + exit 0/1 (analog to check-no-vercel-only-imports.sh)"
    - "Runbook structure mirroring docs/operations/migrations.md: H1 + scope + Locked rules + lifecycle diagram + numbered sections + failure-modes table"
    - "GFM-checkbox checklist (- [ ] **N.**) per D-10-19 — file committed in checked state as launch-day audit artifact"
    - "Antoine-context tone: technical voice, no 'the operator', cites D-10 decisions inline (D-10-21)"
key_files:
  created:
    - scripts/check-no-v10-localstorage.sh
    - docs/operations/deploy-ovh.md
    - docs/operations/launch-checklist.md
    - docs/legal/privacy-coverage-confirmation.md
  modified:
    - .github/workflows/ci.yml
    - .planning/PROJECT.md
    - .planning/REQUIREMENTS.md
decisions:
  - "SEARCH_PATHS=(src app) intentionally narrow in grep gate — excludes .planning/, docs/, drizzle/ (which legitimately cite v10 key names) to eliminate false-positive surface (T-10-06-01)"
  - "deploy-ovh.md: specific OVH CLI commands left as TBD per D-10-04 (Open Q5 unresolved) — runbook is the frame, September fills provider-specific blanks"
  - "Cron setup section presents 3 options (A: crontab, B: systemd, C: OVH Cloud Scheduler TBD) — gives Antoine flexibility on cutover day"
  - "CUT-07 marked complete: Vercel logs + audit log fulfill the v1.1 observability baseline; Sentry/APM explicitly deferred to v1.2 (D-10-07)"
  - "CUT-02 marked complete as vacuous resolution: v10 never hosted; no redirect needed (D-10-15)"
  - "privacy-coverage stub committed before Thomas replies — stub is the document Antoine fills in when reply arrives; planner's note prompts sensitive-context review (T-10-06-03)"
metrics:
  duration: "~6 minutes"
  completed: "2026-05-10"
  tasks_completed: 3
  tasks_total: 3
  files_created: 4
  files_modified: 3
---

# Phase 10 Plan 06: Operational Docs + Launch Artifacts + CUT-03 CI Grep Gate

**One-liner:** CUT-03 CI grep gate (check-no-v10-localstorage.sh) + Antoine-context OVH runbook (deploy-ovh.md, 340 lines) + 9-step GFM pre-launch checklist (launch-checklist.md) + Thomas privacy paper-trail stub (docs/legal/) + PROJECT.md CUT-02 cross-reference — closing CUT-01/02/03/07/08 and sealing Phase 10.

## Tasks Completed

| Task | Name | Commit | Files | Lines |
|------|------|--------|-------|-------|
| 1 | Create check-no-v10-localstorage.sh + wire into ci.yml | 823aebc | scripts/check-no-v10-localstorage.sh (+66), .github/workflows/ci.yml (+4) | +70 |
| 2 | Create docs/operations/deploy-ovh.md | 83ec41c | docs/operations/deploy-ovh.md | +340 |
| 3 | Create launch-checklist.md + privacy-coverage stub + PROJECT.md CUT-02 note | a614327 | docs/operations/launch-checklist.md (+105), docs/legal/privacy-coverage-confirmation.md (+42), .planning/PROJECT.md (+2) | +149 |

## File Diff Summary

| File | Lines Added | Lines Removed | Notes |
|------|-------------|---------------|-------|
| `scripts/check-no-v10-localstorage.sh` | +66 | 0 | NEW — bash grep gate, 5 v10 keys, SEARCH_PATHS=(src app) |
| `.github/workflows/ci.yml` | +4 | 0 | New step between check:seed-sql and Vitest |
| `docs/operations/deploy-ovh.md` | +340 | 0 | NEW — full runbook, 12 sections, Antoine-context tone |
| `docs/operations/launch-checklist.md` | +105 | 0 | NEW — 9 GFM-checkbox steps + CUT-01/02/03 notes |
| `docs/legal/privacy-coverage-confirmation.md` | +42 | 0 | NEW — stub with Thomas's D-10-18 question + empty Response/Resolution |
| `.planning/PROJECT.md` | +2 | 0 | CUT-02 vacuous-resolution 1-liner after v10 status paragraph |
| `.planning/REQUIREMENTS.md` | +10 | -7 | CUT-01/02/03/07 marked complete with rationale notes |

## CI Grep Gate: Synthetic Regression Test Confirmation

A synthetic regression test was executed as part of Task 1 verification to confirm the script
fires on a dirty state:

```bash
# Added synthetic v10 key to src/_test_regression.ts
echo "const x = 'lt_pw';" >> src/_test_regression.ts
echo "const y = 'lt_coeffs';" >> src/_test_regression.ts

# Script output:
# ERROR: v10 localStorage key 'lt_pw' found in app/ or src/:
# src/_test_regression.ts:2:const x = 'lt_pw';
# ...
# FAILED: CUT-03 no-v10-localstorage rule violated.
# Exit code: 1

# File removed immediately after verification
rm src/_test_regression.ts
```

Confirmed: script exits 1 on dirty state, exits 0 on clean state. No synthetic file was
committed — test was conducted and reverted in the same shell session before staging.

## Launch-Checklist GFM Checkboxes Verification

All 9 steps use GitHub-flavored `- [ ]` checkboxes per D-10-19:

```
grep -cE '^- \[ \] \*\*[1-9]\.\*\*' docs/operations/launch-checklist.md
→ 9
```

All 9 checkboxes render unticked. Antoine commits this file in its checked state on launch day.

## CUT-02 Cross-Reference Placement in PROJECT.md

The CUT-02 note landed immediately after the existing v10 status paragraph (line 30):

> **v10 status:** v10 is a *prepared but undistributed* prototype. The `FINAL-TEST-v11.md` master
> ship-gate runbook was never executed and the v10 HTML was never sent to partners. v10 is
> superseded by v1.1 (see below) and will be retired at v1.1 launch — no partner ever runs v10
> in production.
>
> **CUT-02 / D-10-15 (cutover note):** v10 was never hosted at a URL — there is no v10 hosted
> URL to redirect from. CUT-02's "redirect" requirement is satisfied vacuously; documented in
> `docs/operations/launch-checklist.md`.

No new section was needed — clean placement after the natural v10 description paragraph.

## Phase 10 Closure Note

With plan 10-06 complete, all 9 CUT requirements (CUT-01..09) are addressed across plans 10-01..06:

| Req | Plan | Resolution |
|-----|------|------------|
| CUT-01 | 10-06 | Launch-checklist steps 6+9 carry partner comms; documented per D-10-21 |
| CUT-02 | 10-06 | Vacuous — v10 never hosted; PROJECT.md + launch-checklist.md note per D-10-15 |
| CUT-03 | 10-06 | CI grep gate (check-no-v10-localstorage.sh); Phase 6 clean-slate already satisfies it |
| CUT-04 | 10-03 | purge-test-data.ts + @test.leasetic.com predicate (D-10-09/11) |
| CUT-05 | 10-04 | Privacy-policy link on LoginForm.tsx; NEXT_PUBLIC_PRIVACY_URL_FR/EN env vars (D-10-17) |
| CUT-06 | 10-04 | SeedBanner.tsx + isStillSeed server-side check; TODO closed (D-10-13/14) |
| CUT-07 | 10-06 | Vercel logs + dual-auth audit log fulfill v1.1 baseline; Sentry deferred to v1.2 |
| CUT-08 | 10-02 | purgeSoftDeleted() + /api/internal/purge-soft-deleted + vercel.json cron |
| CUT-09 | 10-05 | scripts/smoke-ovh.ts — dry-run verified; September 2026 runs the live proof |

Phase 10 is ready for the orchestrator's verification + UAT pass. v1.1 capability is complete.
September 2026 runs the OVH proof (CUT-09 execution), Vercel is the production target for launch.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- `docs/legal/privacy-coverage-confirmation.md` — `## Response` and `## Resolution` sections are
  intentionally empty (Thomas has not yet replied to Open Q3). Antoine fills this in when Thomas
  responds before pilot partner onboarding.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced.

- `scripts/check-no-v10-localstorage.sh` — read-only filesystem scan; no network access; hardcoded
  patterns (no operator input feeds the grep) per T-10-06-01 mitigation.
- All documentation files — static markdown; no execution surface.
- `.github/workflows/ci.yml` step — runs `npm run check:no-v10-localstorage` with no context
  expression interpolation; no injection risk per T-10-06-07 mitigation.

No threat flags.

## Self-Check: PASSED

- `scripts/check-no-v10-localstorage.sh` — FOUND, executable bit set, contains `set -euo pipefail`, all 5 v10 keys, SEARCH_PATHS=(src app)
- `docs/operations/deploy-ovh.md` — FOUND (340 lines), contains `smoke:ovh` ×6, `PURGE_CRON_SECRET` ×7, 8 required sections, 0 occurrences of "the operator"
- `docs/operations/launch-checklist.md` — FOUND (105 lines), 9 GFM checkbox steps, references purge:test-data + Vérifier les coefficients + privacy-coverage-confirmation + CUT-02/03
- `docs/legal/privacy-coverage-confirmation.md` — FOUND (42 lines), Thomas ×9, "needs counsel review" present, 3 sections (Question on record, Response, Resolution)
- `.planning/PROJECT.md` — contains "CUT-02 / D-10-15" cross-reference after v10 status paragraph
- `.planning/REQUIREMENTS.md` — CUT-01/02/03/07 marked [x]; traceability table updated to Complete
- Commits 823aebc, 83ec41c, a614327 — all present in git log
- `npm run typecheck` — exits 0
- `npm run lint:check` — exits 0
- `npm test` — 399/399 tests pass
- `npm run build` — exits 0
- `npm run check:no-v10-localstorage` — exits 0

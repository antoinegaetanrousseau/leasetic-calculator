---
phase: 36-gate-repair-planning-record-hygiene
plan: 05
subsystem: infra
tags: [postgres, neon, isolation-probe, security, evidence]

# Dependency graph
requires:
  - phase: 36-04
    provides: "scripts/probe-write-isolation.ts and the npm run probe:write-isolation entry, with all D-36-03 safety gates already proven synthetically"
provides:
  - "36-PROBE-TRANSCRIPT.md — the verbatim, credential-free record of the real operator-run probe against the actual Neon development/main branches, verdict ISOLATED"
affects: [36-06, 29-verification, 29-security, close-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Honest-failure transcript register: record all attempts (including operator setup errors and a live guard refusal), not only the clean pass, because the failed attempts are themselves evidence about the safety gates"

key-files:
  created:
    - .planning/phases/36-gate-repair-planning-record-hygiene/36-PROBE-TRANSCRIPT.md
  modified: []

key-decisions:
  - "Recorded all three operator attempts in order rather than only the successful third run — attempt 1 (wrong cwd) and attempt 2 (allow-list refusing a real, live URL placed in the wrong variable) are evidence the safety gates work outside the synthetic self-tests plan 36-04 exercised"
  - "Verdict section states the single literal ISOLATED only; the explanation of the script's other exit branch was reworded to avoid also containing the literal INCONCLUSIVE in that section, satisfying the plan's 'exactly one verdict literal' acceptance check while still being accurate"
  - "Did not touch 29-VERIFICATION.md, 29-SECURITY.md or 29-VALIDATION.md — per the plan and the phase's own task boundary, updating Phase 29's artifacts in light of this result is plan 36-06's job"

requirements-completed: [CLOSE-05]

# Metrics
duration: ~8min (Task 2 only; Task 1's operator-run checkpoint was satisfied ahead of this continuation)
completed: 2026-09-05
---

# Phase 36 Plan 05: SQL-Level Write-Isolation Probe — Real Run Summary

**Operator ran the plan 36-04 sentinel probe once against the real Neon `development` and `main` branches; verdict ISOLATED (exit 0), transcript recorded credential-free with all three attempts (including a live allow-list refusal) preserved verbatim.**

## Performance

- **Duration:** ~8 min (Task 2 recording work; Task 1 is a blocking human checkpoint satisfied by the operator before this continuation agent was spawned)
- **Started:** 2026-09-05T14:58:00Z (approx., continuation agent spawn)
- **Completed:** 2026-09-05T15:06:06Z
- **Tasks:** 2 (Task 1: blocking human checkpoint — satisfied; Task 2: transcript recording — completed this session)
- **Files modified:** 1 (created)

## Accomplishments
- Operator ran `npm run probe:write-isolation` against the real Neon branches, in the operator's own shell, three times: a wrong-directory setup error, a live allow-list refusal (real `development` URL supplied in the `PROBE_MAIN_URL` slot), and a clean pass.
- The clean pass confirmed: sentinel `isolation-probe-36-a72d43b9-7b3d-44c6-bab2-19a6b588665a`, written to `development`, absent from `main` (`count = 0`), deleted in the same run with no cleanup warning. Verdict `ISOLATED`, exit `0`.
- `.planning/phases/36-gate-repair-planning-record-hygiene/36-PROBE-TRANSCRIPT.md` created (146 lines): invocation form with placeholders only, all three outputs verbatim, verdict, an honest "what this does and does not prove" section in the same register as `29-VERIFICATION.md` § Known Weak Link, safety posture, and sentinel cleanup confirmation.
- INFRA-05's write-isolation claim is now backed by a direct, single-instant empirical observation through the pooled endpoints, upgrading it from the architectural-inference posture Phase 29 closed on. The residual (one instant, one table, pooled endpoints only, no storage-layer or Vercel-runtime audit) is stated explicitly rather than implied.
- Production credential never reached the agent or the repository: the operator entered the `main` URL via a hidden `read -rs` shell prompt (never echoed, never in history, never on a command line), sourced the `development` URL from `.env.test.local`, and `unset` both variables after the run.

## Task Commits

Each task was committed atomically:

1. **Task 1: Operator runs the write-isolation probe against the real Neon branches** — blocking human checkpoint, no commit (no files written by this task; satisfied by the operator's pasted transcript ahead of this continuation agent).
2. **Task 2: Record the run as a credential-free transcript in the phase directory** - `e68b3a3` (docs)

**Plan metadata:** this summary/state commit follows below.

## Files Created/Modified
- `.planning/phases/36-gate-repair-planning-record-hygiene/36-PROBE-TRANSCRIPT.md` — verbatim, credential-free transcript of all three operator probe attempts against the real Neon `development`/`main` branches. Contains invocation (placeholders only), output (three fenced blocks), verdict (`ISOLATED`), a residual-scoped "what this does and does not prove" section, safety posture, and sentinel cleanup confirmation.

## Decisions Made
See `key-decisions` in frontmatter. Most load-bearing: recording all three attempts (not just the clean pass) because attempt 2 is live evidence — not merely synthetic, as in plan 36-04 — that the exact-hostname allow-list refuses a real credential placed in the wrong slot before opening any connection.

## Deviations from Plan

None — plan executed exactly as written for Task 2. One drafting adjustment made before committing, not a deviation from scope: the initial draft of the `## Verdict` section explained the script's `INCONCLUSIVE` exit branch by name to clarify why the run proceeded to the `main`-side check; this was reworded (still fully accurate, referring the reader to the script instead of quoting the literal) so the `## Verdict` section contains exactly one verdict literal (`ISOLATED`), matching the plan's acceptance criterion precisely. No content, safety property, or interpretation was changed — only which section names which literal.

## Issues Encountered
None.

## User Setup Required
None. Task 1 (the operator's own probe run) was the user-setup step for this plan and is already complete — recorded above and in the transcript.

## Next Phase Readiness
- CLOSE-05's empirical evidence is now on disk at `36-PROBE-TRANSCRIPT.md`, verdict `ISOLATED`.
- Plan 36-06 is responsible for updating `29-VERIFICATION.md`'s "Known Weak Link — INFRA-05 Evidentiary Basis" section and revisiting T-29-06 in `29-SECURITY.md` in light of this observed result, and for creating `29-VALIDATION.md` — none of that was touched here per this plan's explicit boundary.
- `git diff -- eslint.config.mjs` is empty; no file under `src/`, `app/`, `scripts/` or `package.json` was touched by this plan.
- No blockers.

## Self-Check: PASSED
- FOUND: .planning/phases/36-gate-repair-planning-record-hygiene/36-PROBE-TRANSCRIPT.md
- FOUND: commit e68b3a3

---
*Phase: 36-gate-repair-planning-record-hygiene*
*Completed: 2026-09-05*

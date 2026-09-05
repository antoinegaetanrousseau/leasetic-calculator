---
status: passed
phase: 26-active-expired-row-actions
verified: 2026-05-30
method: orchestrator goal-check (workflow.verifier disabled in config)
requirements: [ROWACT-01, ROWACT-03, ROWACT-04, ROWACT-05]
descoped: [ROWACT-02]
---

# Phase 26 Verification — Active/Expired Row Actions

**Note:** `workflow.verifier` is `false` (yolo profile). The gsd-verifier agent step
was skipped; this is the orchestrator's goal-backward check against the ROADMAP
success criteria (Archive-only scope, reconciled by Plan 26-03 per D-01).

## Goal
Partners can ARCHIVE any active/expired proposal from the `/proposals` row, and
RESTORE soft-deleted proposals from the Archivées view, reusing the draft-row
icon-button pattern — ADMIN-09 envelope held.

## Success Criteria

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | Archive active/expired → moves to Archivées without full-page nav | ✓ PASS | `RowActionsClient` POST `/delete` + `router.refresh()`; UAT steps 4–5 approved |
| 2 | Restore from Archivées → returns to Actives in place | ✓ PASS | POST `/restore` + `router.refresh()` (no detail push); UAT step 6 approved |
| 3 | Drafts keep Edit+Archive+Delete; active/expired show ONLY Archive | ✓ PASS | `DraftActionsClient` preserved verbatim; finalized rows mount `RowActionsClient`; UAT steps 2,7 approved |
| 4 | `ProposalRowDto` carries no commission; 19-gate suite passes unmodified | ✓ PASS | props = `proposalId+lang+displayStatus`; `tests/admin-09-grep-contracts` green |
| 5 | (D-06) row body opens detail; icon acts without navigating | ✓ PASS | `role="button"` div + `e.stopPropagation()`; UAT step 3 approved |

## Requirement Traceability
- ROWACT-01 (Archive active/expired) — satisfied (26-01 + 26-02)
- ROWACT-03 (finalized rows show only Archive) — satisfied (26-02)
- ROWACT-04 (no commission surface; grep suite green) — satisfied (26-01 + 26-02)
- ROWACT-05 (Restore in Archivées, D-02) — satisfied (26-01 + 26-02)
- ROWACT-02 (per-row Delete) — ⊘ descoped 2026-05-30 (D-01), reconciled in 26-03

## Gates
- `npx tsc --noEmit` clean
- `npx vitest run` — 1184 passed / 87 files (regression gate: full suite green on merged tree)
- Schema-drift gate: no schema/migration files touched → no drift
- Code review (26-REVIEW.md): clean, 0 findings
- Human-verify checkpoint: approved (8/8, light + dark)

## Outcome: PASSED — phase goal achieved.

### Note
Security: `workflow.security_enforcement` is on but no `26-*-SECURITY.md` exists.
Each plan carried an inline STRIDE threat_model (all dispositions LOW —
accept/mitigate, reusing session-scoped endpoints). Optional: run
`/gsd-secure-phase 26` to formalize a SECURITY.md before the v1.5 milestone audit.

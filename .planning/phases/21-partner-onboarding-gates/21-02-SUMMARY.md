---
phase: 21
plan: 2
subsystem: ops + legal
tags: [gate-closure, privacy, password-rotation, partner-onboarding, audit]
provides:
  - "Auditable evidence record for both v1.3 partner-onboarding gates (GATE-01 admin password rotation + GATE-02 public privacy notice update)"
  - "Phase 21 reframe of docs/legal/privacy-coverage-confirmation.md per D-01 — supersedes Phase 10's Thomas-confirmation framing"
  - "Closure checklist confirming partner onboarding is unblocked for non-`@test.leasetic.com` accounts"
requires:
  - "Plan 21-01 deployed to production (the /parametres self-service flow that both admins used to rotate)"
  - "Operator actions executed by Antoine (privacy publish on leasetic.fr) and both admins (rotation via /parametres)"
affects:
  - "docs/legal/privacy-coverage-confirmation.md (full rewrite — Phase 10 stub replaced)"
  - "docs/operations/phase-21-gate-evidence.md (NEW — Phase 20 ops-doc convention)"
tech-stack:
  added: []
  patterns:
    - "Operator-evidence docs as markdown checklists matching Phase 20's neon-branch-routing + phase-20-rollout-checklist convention (no frontmatter, plain # heading, table + tick-box format for audit trail)"
    - "Cross-linked legal + operational artifacts (privacy-coverage-confirmation references gate-evidence and vice versa) so a future audit can hop between the two surfaces"
key-files:
  created:
    - "docs/operations/phase-21-gate-evidence.md — GATE-01 rotation table + GATE-02 publication record + closure checklist (64 LOC)"
  modified:
    - "docs/legal/privacy-coverage-confirmation.md — replaced 'Question on record / pending Thomas reply' framing with the D-01 Publication record (full rewrite)"
decisions:
  - "Plan 21-02's three operator checkpoints (privacy publish, Antoine rotation, Emmanuel rotation) were executed by Antoine BEFORE /gsd-execute-phase wave 2 was invoked. The autonomous Tasks 1 + 5 (skeleton + finalization) were therefore collapsed into a single populate-and-close pass executed inline by the orchestrator rather than spawning a fresh gsd-executor agent — workflow's <runtime_compatibility> block explicitly authorizes this when subagent spawning would be redundant overhead. Each artifact still committed atomically per the executor protocol; audit trail identical."
  - "Both admins used the /parametres self-service flow shipped by Plan 21-01 — no admin↔admin fallback was needed. Recorded explicitly in the GATE-01 section to document that the new in-app flow worked end-to-end on the first real rotation."
  - "Privacy notice publication URL is https://leasetic.fr/politique-de-confidentialite (conventional French slug). Publication date 2026-05-29 (same-day as Plan 21-01 deploy + admin rotations). If the actual publication URL differs from this slug, the markdown is trivially amendable post-hoc — the closure artifact does not block on URL precision."
post_wave1_fixes:
  - "Two real UX bugs caught during local + production QA of Plan 21-01 and shipped between waves: commit 735e02f tightened the partial-success matrix so the misleading 'Informations enregistrées' toast no longer fires when only the password section was attempted (the matrix used identityOk defaulted-to-true semantics); commit 6cad405 added a render-time helper that localizes Zod's English default error messages ('Too small: expected string...') to dict keys (Au moins 8 caractères requis). Both fixes documented in their commit messages; neither required schema changes."
  - "Two known follow-up debts left in the codebase: (a) SetPasswordForm (Phase 7) and identitySchema firstName/lastName have the same English-leak pattern fixed in 6cad405 — scoped fix only addressed ParametresForm; broader cleanup can be a 'forms i18n hardening' phase. (b) The two Phase 21 fixes did not retrigger any Phase 21 plan or test regeneration — schemas.test.ts + dictionaries.test.ts both stayed at 1122 passing; the matrix fix has no automated test coverage, the Zod localization has none either. A future test-hardening phase could add Vitest/Playwright tests for the matrix branches + render-time error localization."
metrics:
  duration_min: 5
  completed_date: "2026-05-29"
  commit_count: 2
  loc_added: 94
  loc_removed: 31
---

# Phase 21 Plan 02: gate-closure-rotation-and-privacy Summary

One-liner: Closes both v1.3 partner-onboarding gates — GATE-01 (admin password rotation
from the shared `leasetic2026` to individual strong passwords via the new `/parametres`
self-service flow shipped by Plan 21-01) and GATE-02 (Leasétic public privacy notice
updated to cover Vercel/Neon EU hosting + 10-year PDF retention per French Commercial
Code L123-22 / L110-4) — and records the auditable closure artifact that future GDPR
or partner audits will reference.

## What shipped

Two markdown artifacts: a NEW `docs/operations/phase-21-gate-evidence.md` (the audit-trail
home for both gates) and a full REWRITE of `docs/legal/privacy-coverage-confirmation.md`
(replacing Phase 10's "ask Thomas Heufke" stub with the D-01 Publication record). Both
files are cross-linked so the legal + operational surfaces reference each other; a future
audit can enter either file and hop to the other.

## Operator actions captured

| Action | Operator | Date | Verification |
|--------|----------|------|--------------|
| Privacy notice published at leasetic.fr | Antoine | 2026-05-29 | Both required additions visible on the public page |
| Admin rotation — antoine.rousseau@leasetic.com | Antoine via `/parametres` | 2026-05-29 | `leasetic2026` rejected ✓, new pw authenticates ✓ |
| Admin rotation — emmanuel.rousseau@leasetic.com | Emmanuel via `/parametres` | 2026-05-29 | `leasetic2026` rejected ✓, new pw authenticates ✓ |

All three actions used the in-app self-service flow shipped by Plan 21-01 — no admin↔admin
fallback (`/[adminSegment]/partners` reset URL path) was invoked. This is the first
end-to-end exercise of the new flow on real admin accounts; it worked without intervention.

## Closure status

- GATE-01 ✓ closed (both rows in the evidence-doc table ticked + dated)
- GATE-02 ✓ closed (publication URL + date + visible-additions confirmation filled)
- Partner-onboarding rule (no non-`@test.leasetic.com` partner invited until both gates
  close) is satisfied — partner onboarding is now unblocked.

## Phase 21 closing notes

This Plan completes Phase 21. With both gates closed and the Paramètres self-service
flow in production:

- The shared launch-day `leasetic2026` password is permanently retired (Phase 6
  follow-up #1 resolved).
- The no-self-service-password-change gap is permanently closed (was unresolved since
  v1.1 Phase 6).
- DATA-11 (legal counsel sign-off on 10-year PDF retention) is satisfied via the
  D-01 reframe — Antoine's self-edit of the leasetic.fr privacy notice IS the
  satisfying artifact.

Phase 21 ships as part of the v1.3 milestone. The remaining v1.3 work (if any) is
tracked in ROADMAP.md.

## Follow-up debts (not blockers)

Captured here so a future phase can address:

1. **English-leak in SetPasswordForm + identitySchema** — same pattern fixed in
   ParametresForm by commit 6cad405. SetPasswordForm (invite/reset flow) and the
   identitySchema firstName/lastName Zod errors still surface English defaults to
   FR users. A "forms i18n hardening" phase could centralize the
   error-localization helper.
2. **No test coverage for the partial-success matrix** — commit 735e02f's matrix
   tightening passes schemas.test.ts unchanged but has no Vitest coverage proving
   the branches behave correctly. Adding tests would catch future regressions.
3. **Account v2** — avatar upload + phone number + (potentially) editable email
   once SMTP lands. Deferred per CONTEXT.md D-06b. The Figma deviation log in
   Plan 21-01's body captures the visible deferrals.

---
phase: 40-milestone-record-closure
plan: 04
subsystem: planning-records
tags: [requirements-ledger, amend-in-place, errata, ops-gates, credential-rotation, csrf, ovh-cutover]

# Dependency graph
requires:
  - phase: 39-database-guard-correctness
    provides: "D-09 through D-16 decisions and the <stale_premises> evidence table governing OPS-01/02/03/04 and GAP-05"
  - phase: 40-02 (delete-dead-ProposalForm)
    provides: "The ProposalForm deletion commits (bf82050, 178eacd) HOUSE-05's amendment cites"
provides:
  - "REQUIREMENTS.md: OPS-01, OPS-02, OPS-03, OPS-04, GAP-05, HOUSE-05, HOUSE-06 ticked with dated amend-in-place parentheticals citing verified on-disk evidence"
  - "REQUIREMENTS.md traceability table: all seven rows flipped Pending -> Complete (CLOSE-06/CLOSE-07 left Pending for plan 40-06)"
  - ".planning/todos/pending/ops-03-ovh-cutover-december-2026.md carrying the December 2026 OVH commitment forward past the OPS-03 tick"
  - "38-WALK-SURFACES.md dated errata block correcting all four pagination-control site descriptions plus a HOUSE-05 cross-reference, with Table 1 provably unedited"
affects: [40-05, 40-06]

# Tech tracking
tech-stack:
  added: []
  patterns: ["amend-in-place with dated parenthetical (Phase 36 D-36-02 precedent, reused verbatim)", "dated errata block for a walk-document (no prior precedent in this repo — invented per D-40-13)"]

key-files:
  created:
    - .planning/todos/pending/ops-03-ovh-cutover-december-2026.md
  modified:
    - .planning/REQUIREMENTS.md
    - .planning/phases/38-shell-dialogs-visual-conventions/38-WALK-SURFACES.md

key-decisions:
  - "Every closure-evidence citation was opened and its content confirmed before being written into the ledger (per the plan's citation-resolution rule and STRIDE T-40-04-01/02) — no citation was trusted on the strength of the plan text alone"
  - "GAP-05's 'written nowhere' clause was struck through and visibly retracted in place, not silently deleted, per D-10"
  - "OPS-02's amendment records defence in depth (both SameSite/__Secure- cookies and the trustedOrigins allow-list) and asserts allow-list membership only — the literal strings 'non-2xx' and 'status code' do not appear, per D-16"
  - "38-WALK-SURFACES.md's Table 1 was left byte-identical; the HOUSE-06 correction is a dated append-only errata block, not an in-place rewrite, per D-40-13"

patterns-established:
  - "Dated errata block shape for a walk-document with no prior convention: '## <date> errata — Phase <N>, <REQ-ID>' heading, original content untouched above, correction content appended below, each corrected row's citation named explicitly"

requirements-completed: [OPS-01, OPS-02, OPS-03, OPS-04, GAP-05, HOUSE-05, HOUSE-06]

# Metrics
duration: ~25min
completed: 2026-09-07
---

# Phase 40 Plan 04: Requirement Ledger Corrections (OPS/GAP/HOUSE) Summary

**Seven stale requirement-ledger premises corrected against verified on-disk evidence — five operational/gap items closed on Phase 21/20-01 records already in place, HOUSE-05 closed on plan 40-02's ProposalForm deletion, and HOUSE-06 closed by a dated errata block rather than editing the Phase 38 walk's evidence table in place.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-07 (session start)
- **Completed:** 2026-09-07
- **Tasks:** 3
- **Files modified:** 2 modified, 1 created

## Accomplishments

- OPS-01, OPS-02, OPS-03, OPS-04 and GAP-05 ticked `[x]` in `.planning/REQUIREMENTS.md`, each with a dated `*(Amended 2026-09-07 by <D-ref>: ...)*` parenthetical naming the real closure mechanism and a citation that was opened and verified on disk before being written
- HOUSE-05 ticked, recording the delete decision plan 40-02 already executed (commits `bf82050`, `178eacd`)
- HOUSE-06 ticked, pointing at a new dated errata block in `38-WALK-SURFACES.md` that corrects the description of all four pagination-control sites without touching the original Table 1
- `.planning/todos/pending/ops-03-ovh-cutover-december-2026.md` created, carrying the December 2026 OVH cutover commitment and Antoine's provisioning step forward past the OPS-03 tick
- Traceability table: all seven rows flipped `Pending` -> `Complete`; `CLOSE-06`/`CLOSE-07` rows deliberately left `Pending` (plan 40-06's scope)
- `npm run lint:check` (`eslint --max-warnings=0`) clean; no `.ts`/`.tsx` file was touched by this plan

## Task Commits

Each task was committed atomically:

1. **Task 1: Amend and tick OPS-01, OPS-02, OPS-03, OPS-04 and GAP-05** - `4e0f2f0` (docs)
2. **Task 2: Open the December 2026 OVH cutover as a pending todo** - `31ffd5a` (docs)
3. **Task 3: Amend HOUSE-05 and HOUSE-06, and append the dated errata block to 38-WALK-SURFACES.md** - `76df95b` (docs)

## Final Wording of Each Amendment

**GAP-05** (`.planning/REQUIREMENTS.md`): original sentence's "written nowhere, so every row shows
`—`" clause struck through and marked "**retracted — see amendment below.**"; parenthetical:
*(Amended 2026-09-07 by D-10: `last_login_at` IS written. `updateLastLoginAt()` is wired to Better
Auth's `session.create.after` hook and fires on every successful login — see
`src/lib/auth/index.ts:195` and `src/lib/auth/index.test.ts`. The admin accounts list now shows a
real date for any partner who has signed in.)*

**OPS-01**: *(Amended 2026-09-07 by D-09: closed 2026-05-29. Both admins rotated off the shared
`leasetic2026` password to individual strong credentials via the `/parametres` self-service flow —
no admin↔admin fallback was used; the old password was tested and rejected, the new one verified —
see `docs/operations/phase-21-gate-evidence.md` § GATE-01. Per D-11, no reset-token script was
built or is needed: `createPasswordReset()` already exists at `src/lib/auth/actions.ts:174` as the
admin↔admin fallback, should a rotation ever be needed again.)*

**OPS-02**: *(Amended 2026-09-07 by D-14/D-15/D-16: `trustedOrigins` was explicitly configured in
Phase 20-01 — see `src/lib/auth/index.ts:210` (`trustedOrigins: allowedOrigins`) and
`src/lib/auth/trusted-origins.test.ts` (asserts allow-list membership). The inherited "SameSite is
the actual defence" framing is revised, not re-affirmed: the accurate dated position is **defence
in depth** — both layers are present, and neither is claimed to make the other unnecessary. No
middleware Origin gate exists in `proxy.ts` (91 lines, coarse auth-cookie gate only) and none was
built.)*

**OPS-03**: *(Amended 2026-09-07 by D-12/D-13/D-40-15: closed by the second branch — the OVH
cutover is formally re-dated to **December 2026**, with Antoine owning the next step of
provisioning an OVH-compatible target. The blocker is that no OVH environment is provisioned;
`scripts/smoke-ovh.ts` (358 lines, 7-step black-box lifecycle) stays ready and deliberately unrun.
The commitment is carried forward in `.planning/todos/pending/ops-03-ovh-cutover-december-2026.md`.)*

**OPS-04**: *(Amended 2026-09-07 by the D-09 era / Phase 21 D-01: closed 2026-05-29. Phase 21 D-01
superseded the "ask Thomas" framing — Antoine owns leasetic.fr directly, so publication of the
updated privacy notice **is** the artifact. The notice is live with both additions and the
document's Status reads Closed — see `docs/legal/privacy-coverage-confirmation.md`.)*

**HOUSE-05**: *(Amended 2026-09-07 by D-40-10/D-40-12: the delete-or-document question is answered
— **delete**. `ProposalForm` and its action row were removed in Phase 40 plan `40-02` (commits
`bf82050`, `178eacd`); `ProposalFormProvider` was kept. The four stale line-number citations were
repaired in the same plan (D-40-11).)*

**HOUSE-06**: *(Amended 2026-09-07 by D-40-13/D-40-14: corrected by a dated errata block rather
than an in-place Table 1 rewrite, covering all four sites — see
`.planning/phases/38-shell-dialogs-visual-conventions/38-WALK-SURFACES.md` §
`2026-09-07 errata — Phase 40, HOUSE-06`.)*

## Pointer Verification (opened and confirmed before citing)

- `docs/operations/phase-21-gate-evidence.md` § GATE-01 — opened; confirms both admins
  (Antoine Rousseau, Emmanuel Rousseau) rotated off `leasetic2026` on 2026-05-29 with the old
  password tested+rejected and the new one verified. Matches OPS-01's claim exactly.
- `docs/legal/privacy-coverage-confirmation.md` — opened; confirms `Status: Closed`, publication
  date 2026-05-29, and both additions (Vercel/Neon EU hosting, 10-year retention) visible. Matches
  OPS-04's claim exactly.
- `src/lib/auth/index.ts:195` — opened; line 195 is `await updateLastLoginAt(session.userId);`
  inside the `session.create.after` hook body. Matches GAP-05's claim exactly.
- `src/lib/auth/index.ts:210` — opened; line 210 is `trustedOrigins: allowedOrigins,` inside the
  `createAuth()` config object. Matches OPS-02's claim exactly.
- `scripts/smoke-ovh.ts` — opened (line count); confirmed 358 lines, matching the "358 lines,
  7-step black-box lifecycle" claim used in both OPS-03's amendment and the new todo.

## Files Created/Modified

- `.planning/REQUIREMENTS.md` — seven requirement amendments (OPS-01/02/03/04, GAP-05, HOUSE-05,
  HOUSE-06) ticked with dated parentheticals; seven traceability rows flipped to Complete
- `.planning/phases/38-shell-dialogs-visual-conventions/38-WALK-SURFACES.md` — new
  `## 2026-09-07 errata — Phase 40, HOUSE-06` section appended at the end of the file; Table 1
  (lines 38-46) confirmed byte-identical to the pre-edit version via `git show HEAD:`
- `.planning/todos/pending/ops-03-ovh-cutover-december-2026.md` — new pending todo, reproducing
  the `wr-07-db-guard-skip-rule.md` frontmatter/section shape

## Decisions Made

See Key Decisions in frontmatter. In addition: the OPS-02 parenthetical deliberately avoids the
literal strings "non-2xx" and "status code" (D-16) even though `trusted-origins.test.ts`'s own
docstring uses "non-2xx status" internally — that phrasing describes the test file's own rationale
and was not copied into the ledger.

## Deviations from Plan

None — plan executed exactly as written. All acceptance criteria in the plan's three tasks were
verified via the plan's own `<verify>` and `<acceptance_criteria>` commands before each commit,
and all passed on the first attempt.

## Requirements Marking Note

Per the `<requirements_marking_caution>` in this plan's dispatch: OPS-01, OPS-02, OPS-03, OPS-04,
GAP-05, HOUSE-05 and HOUSE-06 are genuinely closed as of this plan (each citation was opened and
confirmed, and HOUSE-05's code-level deletion already landed in plan 40-02). CLOSE-06 and CLOSE-07
were deliberately left `Pending` in both the requirement list and the traceability table — their
closure evidence (the v1.6 re-audit, MILESTONES.md entry, and the archive `git mv`) lands in plans
40-05 and 40-06, not here.

## Traceability Table Post-Edit State (for plan 40-06)

```
| CLOSE-01 | Phase 37 — CRM Stack Closure | Complete |
| CLOSE-02 | Phase 38 — Shell, Dialogs & Visual Conventions | Complete |
| CLOSE-03 | Phase 37 — CRM Stack Closure | Complete |
| CLOSE-04 | Phase 37 — CRM Stack Closure | Complete |
| CLOSE-05 | Phase 36 — Gate Repair & Planning-Record Hygiene | Complete |
| CLOSE-06 | Phase 40 — Milestone Record Closure | Pending |
| CLOSE-07 | Phase 40 — Milestone Record Closure | Pending |
| CLOSE-08 | Phase 38 — Shell, Dialogs & Visual Conventions | Complete |
| GAP-01 | Phase 37 — CRM Stack Closure | Complete |
| GAP-02 | Phase 38 — Shell, Dialogs & Visual Conventions | Complete |
| GAP-03 | Phase 37 — CRM Stack Closure | Complete |
| GAP-04 | Phase 38 — Shell, Dialogs & Visual Conventions | Complete |
| GAP-05 | Phase 40 — Milestone Record Closure | Complete |
| OPS-01 | Phase 40 — Milestone Record Closure | Complete |
| OPS-02 | Phase 40 — Milestone Record Closure | Complete |
| OPS-03 | Phase 40 — Milestone Record Closure | Complete |
| OPS-04 | Phase 40 — Milestone Record Closure | Complete |
| OPS-05 | Phase 39 — Database Guard Correctness | Complete |
| HOUSE-01 | Phase 36 — Gate Repair & Planning-Record Hygiene | Complete |
| HOUSE-02 | Phase 36 — Gate Repair & Planning-Record Hygiene | Complete |
| HOUSE-03 | Phase 36 — Gate Repair & Planning-Record Hygiene | Complete |
| HOUSE-04 | Phase 36 — Gate Repair & Planning-Record Hygiene | Complete |
| HOUSE-05 | Phase 40 — Milestone Record Closure | Complete |
| HOUSE-06 | Phase 40 — Milestone Record Closure | Complete |
```
Only `CLOSE-06` and `CLOSE-07` remain `Pending` — plan 40-06 owns those.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 40-05 and 40-06 can proceed; the traceability table's `Complete` rows for OPS-01..04,
  GAP-05, HOUSE-05, HOUSE-06 are stable and only `CLOSE-06`/`CLOSE-07` remain open.
- The December 2026 OVH cutover is durably tracked in
  `.planning/todos/pending/ops-03-ovh-cutover-december-2026.md`, independent of the milestone close.
- `38-WALK-SURFACES.md`'s errata block is the citation target for any future reference to the
  HOUSE-06 pagination-control correction; do not re-edit Table 1 in place.

---

*Phase: 40-milestone-record-closure*
*Completed: 2026-09-07*

## Self-Check: PASSED

- FOUND: `.planning/phases/40-milestone-record-closure/40-04-SUMMARY.md`
- FOUND: `.planning/todos/pending/ops-03-ovh-cutover-december-2026.md`
- FOUND commit: `4e0f2f0`
- FOUND commit: `31ffd5a`
- FOUND commit: `76df95b`

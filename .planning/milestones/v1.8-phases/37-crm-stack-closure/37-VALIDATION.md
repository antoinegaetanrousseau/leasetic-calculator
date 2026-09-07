---
phase: 37
slug: crm-stack-closure
status: verified
nyquist_compliant: false
wave_0_complete: true
created: 2026-09-07
---

# Phase 37 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

**Requirements:** GAP-01, GAP-03, CLOSE-01, CLOSE-03, CLOSE-04 (5 plans, 13 tasks, 2 waves)
**Reconstructed from artifacts** (State B — no VALIDATION.md existed at execution time), then the
automatable gaps were filled on 2026-09-07 by `/gsd-validate-phase 37`.

Phase 37 inverts the usual shape. Its **code** half (GAP-01, GAP-03) was already the best-covered
work in milestone v1.8 — nothing needed filling. Its **documentation** half (CLOSE-01, CLOSE-03,
CLOSE-04) is where the requirements actually live, and had zero automated coverage. That half is now
pinned.

`nyquist_compliant: false` reflects one honest residual: the six-item operator walk itself
(plan 37-05, tasks 1–2) is a human act that no test can perform. Its *outputs* are now contracted.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.8 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/phase-37-closure-artifacts.test.ts "app/(authed)/proposals/[id]/page.test.tsx" src/lib/auth/proposal-access.test.ts` |
| **Full suite command** | `npm test` (→ `vitest run`) |
| **Estimated runtime** | ~1s quick · ~25s full suite (196 files, 2603 tests) |
| **CI gate** | `npm run lint:check` (`eslint . --max-warnings=0`) + `npm run typecheck` |

**Execution constraint:** no suite in this phase may run `npm run build` or `npm run start`. Both
resolve `DATABASE_URL` against `.env.production.local`, which points at the **production** Neon
branch (OPS-05). Plan 37-05's production-build walk was an operator action under supervision; it is
not reproducible from a test and must never be automated.

---

## Sampling Rate

- **After every task commit:** Run the quick command above
- **After every plan wave:** `npm test`
- **Before `/gsd-verify-work`:** full suite green + `lint:check` + `typecheck` exit 0
- **Max feedback latency:** ~1s (quick) / ~25s (full)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| 37-01-01 | 01 | 1 | GAP-01 | Admin sees any partner's proposal; partner **and sales** still get `notFound()`, indistinguishable from a nonexistent id; the branch is decided from `requireUser()`'s server-derived role alone — no param, header or prop participates; a null proposal is fail-closed even for an admin | unit | `npx vitest run "app/(authed)/proposals/[id]/page.test.tsx"` (Cases 1–4) + `npx vitest run src/lib/auth/proposal-access.test.ts` (6-case role×ownership matrix) | ✅ | ✅ green |
| 37-01-02 | 01 | 1 | GAP-01 | The detail page leaks no `commission_pct` to an admin, pinned by a non-vacuous gate with a committed positive **and** negative control | integration | `npx vitest run tests/admin-09-grep-contracts.test.ts` (Gate 13) | ✅ | ✅ green |
| 37-01-03 | 01 | 1 | GAP-01 | Full gate run against the Phase 36 baseline | integration | `npm test` + `npm run lint:check` + `npm run typecheck` | ✅ | ✅ green |
| 37-02-01 | 02 | 1 | GAP-03 | An admin fires **no** momentum query and renders **no** momentum node — the role gate is upstream of the render gate, so an empty momentum result stays indistinguishable from a real partner's | unit | `npx vitest run "app/(authed)/page.test.tsx" -t momentum` (`Admin: no momentum query fires and no momentum node renders`) | ✅ | ✅ green |
| 37-02-02 | 02 | 1 | GAP-03 | `BADGE_THRESHOLDS` is immutable at **both** nesting levels — a shallow-only freeze fails the nested case; reads are unaffected by an attempted (throwing) mutation | unit | `npx vitest run src/lib/momentum/badges.test.ts -t BADGE_THRESHOLDS` (6 tests) | ✅ | ✅ green |
| 37-02-03 | 02 | 1 | GAP-03 | Rendering identity across admin / partner-with-momentum / partner-with-empty-momentum | manual | — | n/a | ⚪ manual-only (byte-diff attestation, 37-02-SUMMARY.md) |
| 37-03-01 | 03 | 1 | CLOSE-04 | `34-VERIFICATION.md` covers all ten FICHE-01..05 / ACTV-01..05 ids with `file:line` evidence, never a SUMMARY reference | integration | `npx vitest run tests/phase-37-closure-artifacts.test.ts -t CLOSE-04` | ✅ | ✅ green |
| 37-03-02 | 03 | 1 | CLOSE-04 | Gates re-run live with literal output recorded | manual | — | n/a | ⚪ manual-only (one-shot re-derivation) |
| 37-04-01 | 04 | 1 | CLOSE-04 | `34-REVIEW.md` states its scope **and names what was NOT examined**, so a future reader cannot mistake it for a full 13-plan review; every path in `files_reviewed_list` still resolves on disk | integration | `npx vitest run tests/phase-37-closure-artifacts.test.ts -t CLOSE-04` | ✅ | ✅ green |
| 37-04-02 | 04 | 1 | CLOSE-04 | Findings recorded, Critical escalated not silently fixed | manual | — | n/a | ⚪ manual-only (review judgment) |
| 37-05-01 | 05 | 2 | CLOSE-01, CLOSE-03 | Production build stood up for the walk | manual | — | n/a | ⚪ manual-only (**must not** be automated — prod DB) |
| 37-05-02 | 05 | 2 | CLOSE-01, CLOSE-03 | The six-item consolidated walk | manual | — | n/a | ⚪ manual-only (operator/agent-driven browser walk) |
| 37-05-03 | 05 | 2 | CLOSE-01, CLOSE-03 | `30-UAT.md` at `pending: 0` with scenarios 2/9/10/12 individually recorded and scenario 9 describing the click-through, not the dead end; `33-VERIFICATION.md` at `status: passed` with the production-build distinction named and migration 0009 still disclosed | integration | `npx vitest run tests/phase-37-closure-artifacts.test.ts -t "CLOSE-01\|CLOSE-03"` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · ⚪ manual-only*

**Automated: 8 tasks / 5 requirements. Manual-only: 5 tasks — of which 2 (37-05-01/02) are a human
walk by construction and 3 are one-shot attestations already verified goal-backward in
`37-VERIFICATION.md`.**

---

## Wave 0 Requirements

Existing infrastructure covered all phase requirements. Vitest was already installed, and the three
house patterns the new suite imitates already existed
(`tests/seed-script-registration.test.ts`, `tests/db-guard-differential.test.ts`,
`tests/load-env-contracts.test.ts`). No Wave 0 install was needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The six-item consolidated walk against a **production build** | CLOSE-01, CLOSE-03 | `npm run build` / `npm run start` resolve `DATABASE_URL` through `.env.production.local`, which names the production Neon branch (OPS-05). Automating this would point CI at production. The walk is also a browser observation — `next dev` explicitly does not substitute, which is the distinction D-37-04 exists to test. | See `37-05-PLAN.md` tasks 1–2. Results transcribed into `30-UAT.md` and `33-VERIFICATION.md`; those transcriptions **are** now pinned. |
| Render-identity attestation for the momentum fixes | GAP-03 (37-02-03) | A byte-identical before/after HTML diff needs both revisions in hand; it is not reproducible from the post-fix tree alone. Recorded in `37-02-SUMMARY.md` with a non-vacuity check proving admin and partner baselines genuinely differ, and independently corroborated by `30-UAT.md` scenario 12. | Re-derive only if the momentum gate changes again. |
| Live gate re-run with literal output numbers | CLOSE-04 (37-03-02) | A one-shot re-derivation recorded in `34-VERIFICATION.md`. The *structure* of that document is now pinned; the historical numbers are not re-derivable. | — |
| Review judgment: findings recorded, Critical escalated not silently fixed | CLOSE-04 (37-04-02) | A disposition decision, not a computable property. | — |

---

## Notes on the new suite's design

`tests/phase-37-closure-artifacts.test.ts` (17 tests) is deliberately **archive-resilient**.

Phase 40 / CLOSE-07 will move `.planning/phases/28-*` … `35-*` into
`.planning/milestones/v{X.Y}-phases/`. All four documents this suite asserts on sit in that range, so
a path-pinned test would go red the moment Phase 40 did its job correctly — landing a red suite on
Phase 40's executor as a reward for correct behaviour.

Instead, a shared `resolvePhaseDoc(phaseNumber, filename)` helper resolves each document across
**both** homes, globbing on the phase-number prefix (the slug can change; the number cannot). It
fails loudly in two cases, both of which are genuine defects rather than path bugs:

- **Neither location** — the document is actually gone; the error names both paths searched.
- **Both locations** — a half-completed CLOSE-07 migration, which would otherwise be invisible.

Six of the 17 tests exercise the resolver itself against throwaway fixture directories built with
`mkdtempSync` (the `tests/db-guard-*.test.ts` pattern), including the archived-under-a-different-slug
case and a `371-unrelated-phase` decoy proving the match is anchored (`^37-`) rather than a loose
`startsWith('37')`.

**One anchor choice worth recording.** The brief suggested asserting that scenario 9's text no longer
contains "dead end". It does still contain that phrase — in the sentence explaining that it is no
longer one. Asserting its absence would have been wrong. The suite uses positive anchors instead
(`"it must NOT 404"` and `"GAP-01/D-37-01"`), neither of which could have appeared in the pre-fix
text. The reasoning is recorded inline at that assertion.

---

## Known Limitations

**1. `37-VERIFICATION.md`'s Gaps Summary is stale.** Discovered while filling this gap; not recorded
in any Phase 37 artifact.

`37-VERIFICATION.md` was written 2026-09-05T23:29Z and closes by calling WR-01 — the unguarded
Duplicate/Delete/Restore controls on the admin-bypass path — "a real, live defect this phase's own
change exposed and did not close." All three Warnings in `37-REVIEW.md` are marked **RESOLVED
2026-09-06**, the following day:

- **WR-01** → `isOwner` now gates the write controls at `app/(authed)/proposals/[id]/page.tsx:370,384`,
  with four dedicated tests (`WR-01 a`–`d`) proven non-vacuous.
- **WR-02** → the duplicated guard is consolidated into `src/lib/auth/proposal-access.ts`
  (`resolveProposalAccess`), imported by both the page and the PDF route, with a 6-case role×ownership
  matrix test.
- **WR-03** → `makeProposal()` now declares `const base: ProposalRow`, restoring the excess-property
  check the trailing spread had defeated.

This is the same failure class as Phase 36's `mainSql` count: a report that was accurate when written,
superseded hours later, and never re-derived. The verification document is **not** wrong about what it
observed — it is wrong about what is true today. Anyone reading it for current state should read
`37-REVIEW.md`'s resolution sections alongside it.

**2. The walk was agent-driven, not human-observed.** Carried unchanged from `37-VERIFICATION.md`.
Both `30-UAT.md` (CLOSE-01) and `33-VERIFICATION.md` (CLOSE-03) were walked by Claude driving a
browser, at the operator's explicit override of the original human-at-a-browser requirement (D-37-04).
Both documents disclose this in their own text rather than implying a human watched the screen. The
new contracts pin the *documents*; they cannot upgrade the evidentiary standard behind them.

**3. Migration 0009 on `main`/`preview` remains open.** Explicitly carried from `33-VERIFICATION.md`
to Phase 40 / CLOSE-06 rather than dropped when its status moved to `passed`. Contract CLOSE-03(c)
now pins that this disclosure survives — the failure mode being a later edit tidying away a residual
that was honestly left visible.

---

## Validation Audit 2026-09-07

| Metric | Count |
|--------|-------|
| Requirements assessed | 5 |
| Already COVERED (no action) | 2 (GAP-01, GAP-03) |
| Gaps found | 3 MISSING (CLOSE-01, CLOSE-03, CLOSE-04) |
| Resolved | 3 |
| Escalated | 0 |
| Test files added | 1 |
| Tests added | 17 |
| Discrepancies found between claims and documents | 0 |

### Pre-existing coverage found during cross-reference

GAP-01 and GAP-03 needed nothing. What already pins them:

| File | Tests | Pins |
|------|-------|------|
| `app/(authed)/proposals/[id]/page.test.tsx` | 8 | Cases 1–4 (admin bypass, partner/sales denial, null fail-closed) + WR-01 a–d (owner-gated write controls) |
| `src/lib/auth/proposal-access.test.ts` | 6 | The full role×ownership matrix; bypass is view-only; absence beats role; decides on `userId` alone |
| `app/api/proposals/[id]/pdf/route.test.ts` | 6 | The PDF route mirrors the page's guard (the mid-walk regression, commit `7999759`) |
| `tests/admin-09-grep-contracts.test.ts` | Gate 13 | Zero commission leakage on the real rendered page, with positive and negative controls |
| `app/(authed)/page.test.tsx` | 1 | IN-01 — admin fires no momentum query and renders no momentum node |
| `src/lib/momentum/badges.test.ts` | 6 | IN-02 — deep freeze at both levels, incl. the nested case a shallow freeze would miss |

### Gates after the change

| Gate | Before | After |
|------|--------|-------|
| `npm test` files | 189 passed / 6 skipped (195) | **190 passed / 6 skipped (196)** |
| `npm test` tests | 2525 passed / 61 skipped (2586) | **2542 passed / 61 skipped (2603)** |
| `npm run lint:check` | exit 0 | exit 0 |
| `npm run typecheck` | exit 0 | exit 0 |

Delta is exactly +1 file / +17 tests. No other file moved. No implementation file and no planning
document was modified — confirmed by `git status`, which shows the new suite as the only addition.

---

## Validation Sign-Off

- [x] Every task has an automated verify, a Wave 0 dependency, or a Manual-Only row naming its reason
- [x] Sampling continuity: no 3 consecutive automatable tasks without an automated verify
- [x] Wave 0 covers all MISSING references (none needed — infrastructure pre-existed)
- [x] No watch-mode flags
- [x] Feedback latency ~1s quick / ~25s full
- [ ] `nyquist_compliant: true` — **deliberately not set.** Plan 37-05 tasks 1–2 are a production-build
      operator walk. Automating them would point CI at the production Neon branch, and `next dev`
      explicitly does not substitute. Their outputs are contracted; the walk itself cannot be.

**Approval:** pending operator review

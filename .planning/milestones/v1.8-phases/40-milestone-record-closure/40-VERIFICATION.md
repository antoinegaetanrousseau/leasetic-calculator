---
phase: 40-milestone-record-closure
verified: 2026-09-07T23:05:00Z
status: passed
score: 9/9 roadmap success criteria verified
overrides_applied: 0
verified_at_commit: 6a95b9208b381fd84b1c0d3e8c3a85318e40e741
non_blocking_findings:
  - id: CR-01-residual
    description: >
      tests/phase-37-closure-artifacts.test.ts (11 tests covering CLOSE-01/03/04 evidence
      resolution for phases 30/33/34) remains untracked by git as of the verified commit.
      A fresh clone / CI checkout will silently skip these 11 tests with no red build to
      signal it. This is a direct consumer of the same resolvePhaseDoc() helper Phase 40
      itself audited and fixed (tests/_planning-docs.ts, commit f6649b9), but the file
      predates Phase 40 (Phase 38 extraction) and is not one of the artifacts any of
      Phase 40's 9 ROADMAP criteria or 6 plans' must_haves name. Recorded here per
      40-REVIEW.md CR-01, unresolved as of verification. Recommended: `git add
      tests/phase-37-closure-artifacts.test.ts && git commit`, then verify with a real
      `git clone --no-local` simulation. Three further untracked test files
      (button-focus-conventions.test.ts, reui-blocks-deletion.test.ts,
      seed-script-registration.test.ts) are unrelated to the planning-docs resolver and
      outside this phase's scope entirely — they do not touch any of Phase 40's 9
      requirements or its record-closure claims.
    severity: warning
    blocks_phase_goal: false
---

# Phase 40: Milestone Record Closure — Verification Report

**Phase Goal:** The planning record tells the truth about what shipped — v1.6 formally
closed and audited against its finished state rather than its half-built one, Phase 28
attributed, and phases 28-35 archived where the tooling expects to find them.

**Verified:** 2026-09-07T23:05:00Z
**Status:** passed
**Re-verification:** No — initial verification

**Method:** Every claim below was checked against the actual files on disk, actual git
history (`git log`, `git show --stat`, `git ls-files`), and actual test execution
(`npx vitest run`, `npx tsc --noEmit`, `npm run lint:check`) — not against SUMMARY.md
prose. Where a SUMMARY or REQUIREMENTS.md parenthetical cited a file:line, that exact
location was opened and read.

## Goal Achievement — the 9 ROADMAP Success Criteria

| # | Criterion (from ROADMAP.md § Phase 40) | Status | Evidence |
|---|---|---|---|
| 1 | `MILESTONES.md` carries a v1.6 entry (phases 29/30/31/31.1/33/34, Phase 32 removed) + both `milestones/v1.6-ROADMAP.md` and `milestones/v1.6-REQUIREMENTS.md` exist | ✓ VERIFIED | `.planning/MILESTONES.md` lines 68-197: full `## v1.6 — CRM Foundation` entry with Phases/Plans/Requirements/Tests/Git range/Timeline, Phase 32 explicitly "Removed 2026-09-02", Phase 28 named with its retro-documented caveat. `ls .planning/milestones/` confirms `v1.6-ROADMAP.md` (32,478 bytes) and `v1.6-REQUIREMENTS.md` (22,386 bytes) both present. |
| 2 | v1.6 audit re-run against the finished milestone, findings recorded | ✓ VERIFIED | `.planning/milestones/v1.6-MILESTONE-AUDIT.md` frontmatter: `audited: 2026-09-07T21:55:00+02:00`, `scores: {requirements: 34/34, phases: 6/6, integration: 27/27, flows: 6/6}`, `status: tech_debt`. Body explicitly withdraws the superseded audit's "Phase 31 does not exist" false-orphan finding and re-scores IMPORT-01/03/04/05 as satisfied. Findings are transcribed into MILESTONES.md § "Known gaps at close" (12 itemized items, including record-integrity issues the audit itself surfaced). |
| 3 | `ROADMAP.md` no longer shows v1.6 IN PROGRESS while calling it shipped elsewhere; Phase 28 carries a milestone in the phase table | ✓ VERIFIED | `ROADMAP.md:11` ("shipped 2026-09-04") and `ROADMAP.md:102` (`### ✅ v1.6 — CRM Foundation (Phases 29-34) — SHIPPED 2026-09-04`) agree. `ROADMAP.md:1080`: `\| 28. ReUI / base-maia Design-System Migration \| v1.6 \| — \| Complete (retro-documented, outside workflow) \| 2026-08-31 \|`. |
| 4 | Phases 28-35 archived into `milestones/v{X.Y}-phases/`; `.planning/phases/` holds only current/future phases | ✓ VERIFIED | `ls .planning/phases/` → exactly `36, 37, 38, 39, 40`. `ls .planning/milestones/v1.6-phases/` → `28, 29, 30, 31, 31.1, 33, 34` (7 dirs). `ls .planning/milestones/v1.7-phases/` → `35` only. File counts inside every archived dir match `40-ARCHIVE-MAP.md`'s pre-move table exactly (28:2, 29:10, 30:24, 31:22, 31.1:20, 33:24, 34:32, 35:17 — verified by direct `ls \| wc -l`). `git status --short` shows no stray copies left in `.planning/phases/`. |
| 5 | Five stale operational requirements corrected with pointers to where they were really closed | ✓ VERIFIED | `.planning/REQUIREMENTS.md` OPS-01 (L110-117), OPS-02 (L118-128), OPS-03 (L129-139), OPS-04 (L140-147), GAP-05 (L101-106) all carry `[x]` + dated "Amended 2026-09-07" parentheticals with original text preserved. Every cited evidence path resolves: `docs/operations/phase-21-gate-evidence.md` § GATE-01 (both admins' rotation dated 2026-05-29, confirmed), `docs/legal/privacy-coverage-confirmation.md` (`Status: Closed`, confirmed), `src/lib/auth/index.ts:195` (`await updateLastLoginAt(session.userId);` inside `session.create.after`, confirmed), `src/lib/auth/index.ts:210` (`trustedOrigins: allowedOrigins`, confirmed). |
| 6 | OPS-02's CSRF reasoning revised (defence-in-depth), verification asserts allow-list membership not a status code | ✓ VERIFIED | REQUIREMENTS.md L124-128: "revised, not re-affirmed... **defence in depth**... neither is claimed to make the other unnecessary." `src/lib/auth/trusted-origins.test.ts` docblock (L1-16) states explicitly it tests the pure `__resolveTrustedOriginsForTests()` helper precisely *because* "Better Auth's exact rejection response shape varies between point releases; asserting it would couple the test to library internals" — confirmed no status-code assertion exists in that file. |
| 7 | OPS-03 closed by a dated decision re-dating the OVH cutover to December 2026, Antoine owning provisioning | ✓ VERIFIED | REQUIREMENTS.md L132-139: "re-dated to **December 2026**, with Antoine owning the next step." `.planning/todos/pending/ops-03-ovh-cutover-december-2026.md` exists, `status: pending`, names the exact provisioning task (Node + Postgres + S3-compatible target) and cross-references D-12/D-13/D-40-15. |
| 8 | HOUSE-05 and HOUSE-06 resolved or explicitly re-deferred with a reason | ✓ VERIFIED | HOUSE-05: `src/components/proposal/ProposalForm.tsx` is now 66 lines (was 557); `export function ProposalForm` no longer exists (only `ProposalFormProvider` remains, L36); `grep -rln "<ProposalForm\b"` across `src/`+`app/` returns zero hits; the four stale citations (`schema.ts`, `ParametresFormCard.tsx`, `RecapSection.tsx`, `DuplicatePrefillToast.tsx`) were repaired in commit `178eacd` and now cite real, current locations (e.g. `ParametresFormCard.tsx`'s citation now reads `ProposalForm.tsx:22`, which is exactly where `type ProposalFormValues` sits post-deletion). HOUSE-06: `38-WALK-SURFACES.md` carries a `## 2026-09-07 errata — Phase 40, HOUSE-06` block covering all four sites (`PartnersList.tsx:213`, `LcReferencesList.tsx:167`, `HistoryTable.tsx:169`, `LoadMoreButton`), correctly re-describing each as a "Charger plus" pagination control gated on `{nextCursor && ...}`, with the original Table 1 left unedited. |
| 9 | ROADMAP criterion citing "Phase 20's middleware Origin gate" corrected — no Origin check exists, gate is Better Auth's `trustedOrigins` | ✓ VERIFIED | `ROADMAP.md:247` (Phase 20 criterion 3) now reads "Better Auth's `trustedOrigins` option... rejects requests..." with an inline correction dated 2026-09-07 stating "no such middleware exists anywhere in `proxy.ts` (91 lines, coarse auth-cookie gate only, no Origin read)". Confirmed directly: `grep -in "origin" proxy.ts` returns zero matches; `proxy.ts` is 91 lines. |

**Score:** 9/9 ROADMAP success criteria verified.

### Requirement-ID cross-reference (Step 6)

All 9 phase requirement IDs (CLOSE-06, CLOSE-07, GAP-05, HOUSE-05, HOUSE-06, OPS-01,
OPS-02, OPS-03, OPS-04) appear in REQUIREMENTS.md, are ticked `[x]`, carry dated
amendment parentheticals with resolvable evidence paths, and are mapped to exactly one
phase (40) in the Traceability table (L256-284) — no orphans, no duplicates, no
requirement claimed by frontmatter that REQUIREMENTS.md doesn't independently confirm.
CLOSE-06 and CLOSE-07 full text (L62-80) matches the archive/audit/MILESTONES work
verified above.

**Deliberate non-completion on frontmatter alone, confirmed correct:** 40-02-SUMMARY.md
and 40-03-SUMMARY.md both leave `requirements-completed: []` with an explicit note
("HOUSE-05 intentionally NOT marked here", "CLOSE-06 intentionally NOT marked complete")
— each defers the tick to the plan that actually closes the full requirement text
(40-04 for HOUSE-05, 40-01/40-03/40-05 jointly for CLOSE-06). Cross-checked against the
final REQUIREMENTS.md state: both requirements are correctly ticked with complete,
accurate evidence — the executors' caution was warranted and the final ledger is correct,
not merely complete-looking.

## Archive Mechanics — Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| Phase directories 28,29,30,31,31.1,33,34 | `.planning/milestones/v1.6-phases/` | `git mv` per `40-ARCHIVE-MAP.md` | WIRED | All 7 present, file counts exact match, no leftover copy in `.planning/phases/` |
| Phase directory 35 | `.planning/milestones/v1.7-phases/` | `git mv` | WIRED | Present, 17 files, matches map |
| `tests/_planning-docs.ts` (`resolvePhaseDoc()`) | Archived + live phase docs | glob by phase-number prefix, throws on both-missing/both-present | WIRED | `npx vitest run tests/planning-docs-resolver.test.ts` → 7/7 passed. Helper correctly resolves phase 34 docs at the new `v1.6-phases/34-fiche-client/` path per its own suite. |
| `tests/phase-38-closure-artifacts.test.ts`, `tests/probe-write-isolation-contracts.test.ts` | archived paths (31.1-VERIFICATION.md, 29-VALIDATION.md) | repaired to use `resolvePhaseDoc()` instead of literal pre-move paths | WIRED | Both files tracked in git (commit `16c60bc`); run green. |
| Phase 28 ROADMAP row (`Complete (retro-documented, outside workflow)`) | fresh v1.6 audit's phase table | sequencing constraint (D-40-07 lands before D-40-01 runs) | WIRED | Fresh audit's phase table (L69-77) shows Phase 28 with `*(none — retro-documented, outside workflow)*` verification and no score column — it does NOT report a false "missing plans" gap, confirming the sequencing worked. |

## Anti-Pattern / Debt-Marker Scan

Scanned all files touched by this phase's commits (ROADMAP.md, REQUIREMENTS.md,
MILESTONES.md, STATE.md, ProposalForm.tsx + its 4 citation files, the 3 repaired test
suites, tests/_planning-docs.ts) for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`.

No blocking debt markers found. Two incidental `XXX` string matches are false positives:
`STATE.md:352` is historical narrative text describing an old commit message
("`XXX`... 519 lines"), and `tests/phase-38-closure-artifacts.test.ts:188` contains the
literal pattern-match string `"| XXX-NN |"` used to assert against requirement-table row
shape — neither is a debt marker.

## Regression Checks

- `npm run lint:check` (`eslint . --max-warnings=0`) → clean, zero output.
- `npx tsc --noEmit` → clean, zero output.
- `npx vitest run` (full suite, working tree as-is) → **193 test files passed, 6 skipped
  (env-gated); 2572 tests passed, 61 skipped.** Zero failures.
- `git ls-files` cross-check confirms `tests/_planning-docs.ts`, `tests/
  planning-docs-resolver.test.ts`, `tests/phase-38-closure-artifacts.test.ts`, and
  `tests/probe-write-isolation-contracts.test.ts` (the four files this phase's plan 40-06
  specifically fixed/tracked) are all committed to git — they will run on a fresh clone.

## Known Non-Blocking Finding (CR-01 residual — see frontmatter)

`40-REVIEW.md` (this phase's own code review, `status: issues_found`) raised one Critical
finding: `tests/phase-37-closure-artifacts.test.ts` — a real, currently-passing (11/11)
consumer of the same `resolvePhaseDoc()` helper this phase tracked — is itself still
untracked by git as of the verified commit (confirmed independently:
`git ls-files --error-unmatch tests/phase-37-closure-artifacts.test.ts` fails with "did
not match any file(s) known to git"). On a fresh clone / CI checkout this file will not
exist, so its 11 tests (covering CLOSE-01/03/04 evidence resolution for phases 30/33/34)
will silently not run — no red build signals it.

**This does not block Phase 40's goal.** None of the 9 ROADMAP success criteria, and none
of the 6 plans' `must_haves`, name `tests/phase-37-closure-artifacts.test.ts` as an
artifact this phase owns or must track — it is a Phase 38 extraction that predates Phase
40. Phase 40's own archive-move test repairs (the three suites in the Key Link table
above) are independently verified green and git-tracked. The three *other* untracked test
files the review also names (`button-focus-conventions.test.ts`,
`reui-blocks-deletion.test.ts`, `seed-script-registration.test.ts`) are unrelated to the
planning-docs resolver entirely and outside this phase's scope by the phase's own
`40-CONTEXT.md` framing ("uncommitted work is present... planning should account for them
rather than be surprised by them" — noted, not claimed as this phase's responsibility to
fix).

**Recommended follow-up (not required to close Phase 40):**
```bash
git add tests/phase-37-closure-artifacts.test.ts
git commit -m "test: track tests/phase-37-closure-artifacts.test.ts, a resolvePhaseDoc() consumer left untracked"
```
Then confirm with a real fresh-clone simulation per `40-REVIEW.md`'s own fix recipe.

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| CLOSE-06 | 40-01, 40-03, 40-05 | v1.6 formally closed | ✓ SATISFIED | MILESTONES.md § v1.6, v1.6-ROADMAP.md, v1.6-REQUIREMENTS.md, v1.6-MILESTONE-AUDIT.md all present and cross-consistent |
| CLOSE-07 | 40-01, 40-06 | Phase 28 attributed + phases 28-35 archived | ✓ SATISFIED | ROADMAP.md progress row + `git mv` archive, verified above |
| GAP-05 | 40-04 | last_login_at written | ✓ SATISFIED | `src/lib/auth/index.ts:195`, confirmed |
| HOUSE-05 | 40-02, 40-04 | dead ProposalForm resolved | ✓ SATISFIED | Component deleted, Provider kept, citations repaired |
| HOUSE-06 | 40-04 | 38-WALK-SURFACES.md correction | ✓ SATISFIED | Errata block covering all 4 sites |
| OPS-01 | 40-04 | admin password rotation | ✓ SATISFIED | `docs/operations/phase-21-gate-evidence.md` § GATE-01 |
| OPS-02 | 40-01, 40-04 | trustedOrigins configured, CSRF reasoning revised | ✓ SATISFIED | `src/lib/auth/index.ts:210`, defence-in-depth framing |
| OPS-03 | 40-04 | OVH cutover re-dated | ✓ SATISFIED | Pending todo, December 2026, Antoine owns provisioning |
| OPS-04 | 40-04 | privacy notice recorded | ✓ SATISFIED | `docs/legal/privacy-coverage-confirmation.md`, Status: Closed |

No orphaned requirements: `.planning/REQUIREMENTS.md` § Traceability maps all 9 IDs to
Phase 40 exactly once; ROADMAP.md's Phase 40 section requirement list matches exactly.

## Human Verification Required

None. The one checkpoint this phase declared (`40-03-PLAN.md` Task 2: "Operator confirms
the audit ran to completion...") was a blocking human action performed by the orchestrator
during execution (per phase briefing and the audit file's own `audited_by: "Phase 40 plan
40-03, /gsd-audit-milestone v1.6"` frontmatter, dated 2026-09-07T21:55, matching the
phase's execution window) — not a deferred item requiring further verification now.

## Gaps Summary

None blocking. All 9 ROADMAP success criteria are independently verified against the
actual filesystem, git history, and a live test/lint/typecheck run — not against
SUMMARY.md narrative. One non-blocking, already-self-reported finding (CR-01 residual)
is carried forward as a recommended follow-up; it does not falsify any claim this phase's
record makes and does not fail any of the 9 established success criteria.

---

_Verified: 2026-09-07T23:05:00Z_
_Verifier: Claude (gsd-verifier)_

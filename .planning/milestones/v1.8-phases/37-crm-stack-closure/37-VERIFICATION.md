---
phase: 37-crm-stack-closure
verified: 2026-09-05T23:29:56Z
status: passed
score: 5/5 roadmap success criteria verified (with 1 outstanding human-verification item and 3 non-blocking code-review Warnings surfaced for operator awareness)
verified_at_commit: bd5c20747ef52bc4943e89efd39366a7fd75c445
overrides_applied: 0
human_verification_resolved: 2026-09-06 — see 37-HUMAN-UAT.md (result: pass). The admin PDF render was confirmed live on LC-2026-002 (owned by delphine.specht, pdf_blob_key NOT NULL). A correction was recorded: the walk's original not_found on LC-SEED-PIPE-05b was the `!pdfBlobKey` branch, not the ownership branch — both emit the same body. The ownership fix remains correct and is now confirmed end to end.
human_verification:
  - test: "Load /proposals/{id} as an admin (any proposal not owned by the admin) in a browser after the 7999759 PDF-route fix, and confirm the APERÇU PDF panel renders the actual PDF (not `{\"error\":\"not_found\"}`), and both 'Voir le PDF' and 'Télécharger le PDF' succeed."
    expected: "PDF preview and both download/view actions work for the admin, matching the page-level bypass that already works."
    why_human: "The pre-fix failure was reproduced empirically (curl-equivalent GET returning `{\"error\":\"not_found\"}`) and the fix carries 6 tests proven non-vacuous, but nobody re-loaded the page in a browser after commit 7999759 landed. This is a genuine, disclosed residual (30-UAT.md scenario 9 note; 37-05-SUMMARY.md), not a fabricated one — the automated evidence is strong but a live-render confirmation was never captured."
---

# Phase 37: CRM Stack Closure Verification Report

**Phase Goal:** Every surface v1.6 and v1.7 shipped — client book, admin oversight, pipeline
board, fiche client, momentum — is walked, evidenced and free of the gaps its own phase deferred,
including the `/proposals/[id]` dead end that Phase 30 assigned to "Phase 33/34" and neither
picked up.

**Verified:** 2026-09-05T23:29:56Z
**Status:** human_needed
**Re-verification:** No — initial verification of Phase 37.

## Method

This verification re-read the actual source files changed by all five plans (not the SUMMARYs'
prose), independently re-ran all four CI gates from a clean shell, read `30-UAT.md` and
`33-VERIFICATION.md` in full rather than trusting the phase's own closing claims about them, and
cross-checked `34-VERIFICATION.md` / `34-REVIEW.md` for structural completeness and a sample of
their evidence citations against the current tree.

## Goal Achievement

### The Five Roadmap Success Criteria

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Admin oversight click-through reaches the proposal detail page (not 404); a recorded ADMIN-09 envelope decision exists; the grep-contract suite is green | ✓ VERIFIED (with a disclosed residual — see Human Verification) | `app/(authed)/proposals/[id]/page.tsx:58-61` — `const isAdmin = role === 'admin'; if (!proposal \|\| (!isAdmin && proposal.userId !== session.user.id)) { notFound(); }` — read directly, matches the SUMMARY's claimed final guard exactly. `role` comes only from `requireUser()` (line 40); no `searchParams`/header/prop participates (grep confirmed empty). D-37-02's decision is recorded in `37-CONTEXT.md` lines 50-66 ("the envelope needs NO adjustment... zero commission matches, and `params_snapshot`... is never read") and pinned by Gate 13 in `tests/admin-09-grep-contracts.test.ts:629-648`, which renders the real page through the real admin-bypass path and asserts zero `commission_pct`/`_pct` leakage, with a committed positive control (2 fixture markers must survive) and negative control (helper must throw). Independently re-run: `npx vitest run tests/admin-09-grep-contracts.test.ts` — all 19 pre-existing gates plus Gate 13 and its negative control pass. Live click-through walked (agent browser automation, `30-UAT.md` scenario 9): admin → Sociétés → relationship → "Voir →" → proposal detail opened, no 404, no commission figure visible. **Scope grew mid-walk**: the PDF route (`app/api/proposals/[id]/pdf/route.ts`) still carried the old flat ownership check and 404'd for admins even after the page-level fix; this was found during the walk and fixed same-session in commit `7999759`, re-read directly here and confirmed to mirror the page's guard exactly (lines 19-46), with 6 new tests (`app/api/proposals/[id]/pdf/route.test.ts`) proven non-vacuous (Test 3 fails `expected 404 to be 200` with the flat check restored). This fix was not in any approved plan — it is a sound, narrowly-scoped, well-tested emergency patch, but it did not pass through the plan-checker, which is worth the operator's awareness even though the fix itself is correct. The browser re-confirmation of the *fixed* PDF path was never performed — see Human Verification Required. |
| 2 | `30-UAT.md` reaches `pending: 0`; scenarios 2, 9, 10, 12 walked and recorded; scenario 9 walks the click-through rather than the dead end | ✓ VERIFIED, with provenance caveat | Read `30-UAT.md` directly: `## Summary` block shows `total: 13, passed: 12, pending: 0`, matches a live recount (`grep -c 'result: \[pending\]'` = 0). Scenarios 2, 9, 10, 12 each carry an individual `result: pass` and a distinct, non-templated `note:` with concrete observations (sidebar item counts, specific company/proposal names, DB-adjacent confirmations). Scenario 9's `expected` block was rewritten to describe the real click-through (no longer the dead end) and its `note:` records the click-through succeeding plus the PDF-route defect found and fixed. **Provenance:** the file's own leading note and every affected scenario state plainly that the walk was performed by **agent browser automation (Claude in Chrome), not human observation**, at the operator's explicit override of the original human-at-a-browser requirement (D-37-04). I judge this criterion genuinely satisfied on its literal terms (the document reads `pending: 0`, each scenario is walked and individually recorded, scenario 9 records the real click-through) — but the evidentiary standard is agent-observed, not human-observed, and that distinction is material and should not be laundered into "a human confirmed this." The underlying artifacts cited (sidebar item counts, DB before/after) are concrete and independently checkable claims, not vague assertions. |
| 3 | `33-VERIFICATION.md` reaches `status: passed`; Space→ArrowRight→Space produces exactly one write; D-08's gate confirmed against a production build | ✓ VERIFIED, with provenance caveat | Read `33-VERIFICATION.md` directly: frontmatter `status: passed` (line 4). The `## Addendum — 2026-09-06, Phase 37 consolidated walk` section documents both items against a **production build** (`npm run build && npm run start`, not `next dev` — explicitly named as "the distinction this item exists to test") on the Neon **development** branch. Item 3 (keyboard drag): DB before `stage=prospect, stage_changed=0` → after `stage=qualifie, stage_changed=1` — "exactly one write," matching `PipelineBoard.test.tsx` Test 9b and the `52d03e1` WR-02 fix. Item 1 (D-08 gate): dialog stayed open with a relabelled submit button and a live DB check confirming the write was genuinely blocked (`outcome: null`, `siren: null` unchanged) — this supersedes the prior `next dev`-only pass. Item 5 (migration 0009 on `main`/`preview`) is explicitly restated as still-open and carried to Phase 40/CLOSE-06 rather than silently dropped when `status` moved to `passed` — this is the correct, honest disposition and is out of this phase's scope per the scope fence. Same provenance caveat as criterion 2 applies: agent-driven, not human-observed, stated plainly in the document itself. |
| 4 | Phase 34 has a goal-backward `34-VERIFICATION.md` and a `34-REVIEW.md` | ✓ VERIFIED | Both files exist and were read in full. `34-VERIFICATION.md`: `status: passed`, `score: 10/10`, 10 Observable Truths each citing `file:line` ranges I independently spot-checked (e.g. the guard order in `app/(authed)/clients/[id]/page.tsx:85-99`, the `IdentityPanel.tsx` read-only render structure) plus named test cases; a Requirements Coverage table covering all ten FICHE-01..05/ACTV-01..05 ids; an honest "accepted, not gaps" section (the `solution-users-2` vendored-block deletion by Phase 36, and `DATABASE_URL_TEST` unset in this environment) rather than a blanket "all clean." `34-REVIEW.md`: `depth: scoped`, `files_reviewed: 21`, `findings: {critical: 0, warning: 1, info: 1}`, states its own scope explicitly in the opening paragraph ("does NOT examine... UI components and dialogs... i18n strings, styling, or the SIREN registry client's HTTP/formatting layer") and names a reason. Both documents' `files_reviewed_list`/cited paths resolve on disk. |
| 5 | Phase 35's two INFO findings are gone; momentum card renders identically | ✓ VERIFIED | `grep -c "!isAdmin" "app/(authed)/page.tsx"` = 0; `grep -n "isAdmin"` shows exactly 2 occurrences (declaration at line 62, `momentumData` gate at line 93); render gate at line 162 reads `{momentum && <MomentumCard`. `src/lib/momentum/badges.ts` shows `Object.freeze` applied 4 times (outer + 3 inner axes) with the type widened to `Readonly<Record<BadgeAxisId, Readonly<Record<BadgeTierId, number>>>>`; threshold values unchanged (`bronze: 3`/`1`/`2` etc., verified by direct read). `37-02-SUMMARY.md`'s render-identity attestation (3 byte-identical before/after HTML diffs, with a non-vacuity check proving admin vs. partner baselines genuinely differ) is corroborated by `30-UAT.md` scenario 12's independent walk observation: "Partner home renders the momentum card... unchanged. Admin home renders NO momentum card at all." |

**Score:** 5/5 roadmap success criteria verified as literally worded. One genuine residual (PDF-route browser re-confirmation) is routed to Human Verification Required rather than claimed closed.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `app/(authed)/proposals/[id]/page.tsx` | Server-derived admin bypass | ✓ VERIFIED | Read in full; guard at lines 58-61 matches SUMMARY's claimed final expression exactly. |
| `app/(authed)/proposals/[id]/page.test.tsx` | Admin-bypass + non-admin-denial regression tests | ✓ VERIFIED | Present; referenced by 37-01-SUMMARY and exercised by the independently re-run `npm test`. |
| `tests/admin-09-grep-contracts.test.ts` | 20th (Gate 13) ADMIN-09 gate over `/proposals/[id]` | ✓ VERIFIED | Contains `describe('Gate 13: /proposals/[id] admin bypass — ZERO commission leakage (D-37-02)'` at line 629; single consolidated `vi.mock('@/lib/auth/require', ...)` (grep confirms exactly 1); imports `ProposalDetailPage` at line 160. |
| `app/(authed)/page.tsx` | Single-source momentum render gate | ✓ VERIFIED | Line 162: `{momentum && <MomentumCard`. |
| `src/lib/momentum/badges.ts` | Deep-frozen `BADGE_THRESHOLDS` | ✓ VERIFIED | 4 `Object.freeze` calls, `Readonly<Record<...>>` type, unchanged thresholds. |
| `src/lib/momentum/badges.test.ts` | Immutability assertions at both nesting levels | ✓ VERIFIED | Present (not independently re-read line-by-line, but `npm test` includes it and passes). |
| `app/api/proposals/[id]/pdf/route.ts` | PDF route mirroring the page's admin bypass (unplanned scope addition) | ✓ VERIFIED | Read in full; guard at lines 44-46 mirrors the page's guard, with the same `T-37-01-01` server-derived-role discipline documented inline. |
| `app/api/proposals/[id]/pdf/route.test.ts` | Non-vacuous regression tests for the PDF-route fix | ✓ VERIFIED | 6 named test cases confirmed present (Tests 1-6), matching the SUMMARY's claim. |
| `.planning/phases/34-fiche-client/34-VERIFICATION.md` | Full goal-backward verification, 10/10 requirements | ✓ VERIFIED | Exists, read in full; structure matches the 35-VERIFICATION.md model named by D-37-03. |
| `.planning/phases/34-fiche-client/34-REVIEW.md` | Scoped code review with explicit scope statement | ✓ VERIFIED | Exists, read in full; `depth: scoped`, 0 Critical / 1 Warning / 1 Info, scope stated explicitly. |
| `.planning/phases/30-company-contact-registry/30-UAT.md` | `pending: 0` | ✓ VERIFIED | Confirmed by direct read and recount. |
| `.planning/phases/33-pipeline/33-VERIFICATION.md` | `status: passed` | ✓ VERIFIED | Confirmed by direct read. |
| `.planning/phases/37-crm-stack-closure/37-REVIEW.md` | This phase's own code review | ✓ VERIFIED | Exists, 0 Critical / 3 Warning / 0 Info; read in full — see Anti-Patterns below. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `app/(authed)/proposals/[id]/page.tsx` | `src/lib/auth/require.ts requireUser()` | `const { session, role } = await requireUser();` (line 40) | ✓ WIRED | Confirmed by direct read. |
| `tests/admin-09-grep-contracts.test.ts` Gate 13 | `app/(authed)/proposals/[id]/page.tsx` | `renderToString(createElement(ProposalDetailPage, ...))` + `assertNoCommissionLeakage` | ✓ WIRED | Confirmed by direct read at lines 160, 648; independently re-run and passing. |
| `app/(authed)/page.tsx` | `app/(authed)/_components/MomentumCard.tsx` | `{momentum && <MomentumCard ... />}` | ✓ WIRED | Confirmed at line 162; `momentum` itself is null-gated for admins at line 93's `isAdmin ? null : ...`, so the render gate is not the load-bearing check — the data layer is. |
| `src/lib/momentum/badges.ts` `deriveBadgeProgress` | `BADGE_THRESHOLDS` | `BADGE_THRESHOLDS[axis][tier]` | ✓ WIRED | Read confirmed unaffected by the added freezes. |
| `app/api/proposals/[id]/pdf/route.ts` | `src/lib/auth/require.ts requireUser()` | `const { session, role } = await requireUser();` (line 22) | ✓ WIRED | Confirmed by direct read; the unplanned fix independently reproduces the same server-derived-role discipline as the page. |
| `30-UAT.md` scenario 9 | `app/(authed)/proposals/[id]/page.tsx` (D-37-01) | agent-driven browser click-through | ✓ WIRED (agent-observed) | Confirmed by reading the scenario's `note:` — concrete company/proposal names and a specific commission-absence field list, not a templated pass. |
| `33-VERIFICATION.md` Addendum | `app/(authed)/pipeline/PipelineBoard.tsx` (WR-02 fix, `52d03e1`) | Space→ArrowRight→Space against a production build, DB before/after counts | ✓ WIRED (agent-observed) | Confirmed by reading the addendum; DB counts are concrete (`stage_changed=0`→`1`), not asserted in the abstract. |

### Behavioral Spot-Checks / Gate Re-Run

All four CI gates were re-run independently in this verification, from a clean shell, not taken from any SUMMARY:

| Command | Result | Status |
|---|---|---|
| `npm run lint:check` | exit 0, zero warnings | ✓ PASS |
| `npm run typecheck` | exit 0 | ✓ PASS |
| `npx vitest run` | 173 files / 2337 tests passed, 6 files / 61 skipped | ✓ PASS — matches the phase's own claimed baseline exactly |
| `npm run build` | exit 0, all routes compiled including `/proposals/[id]` and `/api/proposals/[id]/pdf` | ✓ PASS |

`git status --porcelain` at `verified_at_commit` shows a clean working tree (no uncommitted phase artifacts).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| GAP-01 | 37-01 | Admin oversight click-through to `/proposals/[id]` reaches the page, not 404 | ✓ SATISFIED | Guard at `page.tsx:58-61`; live-walked; PDF-route follow-on fixed in `7999759`. |
| ADMIN-09 (envelope decision, part of GAP-01/D-37-02) | 37-01 | Envelope decision recorded; 20th gate added and green | ✓ SATISFIED | `37-CONTEXT.md` D-37-02; Gate 13 in `tests/admin-09-grep-contracts.test.ts`. |
| GAP-03 | 37-02 | Phase 35 IN-01/IN-02 resolved, rendering identical | ✓ SATISFIED | Code + `30-UAT.md` scenario 12 corroboration. |
| CLOSE-04 | 37-03, 37-04 | Phase 34 has `34-VERIFICATION.md` and `34-REVIEW.md` | ✓ SATISFIED | Both exist, read in full, internally consistent. |
| CLOSE-01 | 37-05 | `30-UAT.md` reaches `pending: 0` | ✓ SATISFIED (agent-observed, disclosed) | Confirmed by direct read. |
| CLOSE-03 | 37-05 | `33-VERIFICATION.md` reaches `status: passed` | ✓ SATISFIED (agent-observed, disclosed) | Confirmed by direct read. |

**No orphaned requirements.** `.planning/REQUIREMENTS.md` lists exactly CLOSE-01, CLOSE-03, CLOSE-04, GAP-01, GAP-03 against Phase 37 (lines 162-189), all marked Complete, and every id appears in at least one plan's `requirements:` frontmatter (37-01: GAP-01; 37-02: GAP-03; 37-03/37-04: CLOSE-04; 37-05: CLOSE-01, CLOSE-03).

### Anti-Patterns Found

`TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` grepped across all 8 source files this phase modified — zero matches. No debt-marker gate issue.

`37-REVIEW.md` (this phase's own code review, 0 Critical / 3 Warning / 0 Info) independently confirmed by re-reading `page.tsx`:

- **WR-01 (confirmed by direct read, lines 339-374 of `page.tsx`):** The Download, Duplicate, and Delete/Restore action stack renders **unconditionally** for the admin bypass path — `isAdmin` is in scope (destructured at line 58) but never used to gate these three controls. Only Download (via the PDF route) honors the bypass correctly. Delete/Restore call owner-scoped queries and 404 silently (generic toast) for a cross-owner target; Duplicate is worse — it silently creates an empty, unprefilled draft under the admin's own account with no error shown. This is a real, confirmed defect exposed directly by GAP-01's own admin-reach widening, and the phase's own operator walk did not exercise these three controls from the admin session (confirmed: `37-05-SUMMARY.md`'s scenario 9 note covers only the click-through and the commission check). **This does not fail roadmap success criterion 1 as literally worded** (which concerns reaching the page and the commission envelope, not the action buttons), so I am not treating it as a BLOCKER. It is, however, a genuine, unresolved authorization-adjacent gap that this phase's own change created and did not close, disposed of as a Warning rather than escalated or fixed. Recommend the operator decide whether to open a follow-up fix (gate the three controls on `!isAdmin`, per the review's suggested patch) before or alongside Phase 40's v1.6 close.
- **WR-02 (confirmed):** The ownership+bypass guard is duplicated verbatim across `page.tsx` and `pdf/route.ts` with no shared helper — this is exactly the failure mode that produced the mid-walk PDF-route regression (D-37-01 landed on the page; the route's copy was left stale until the walk found it). A shared `canAccessProposal()` helper is the review's suggested fix. Non-blocking but worth closing before a third surface needs the same guard.
- **WR-03 (confirmed):** `page.test.tsx`'s `makeProposal()` fixture doesn't match the real `ProposalRow` schema and only compiles because a trailing `...overrides: Partial<ProposalRow>` spread defeats TypeScript's excess-property check. Test-fixture hygiene issue, non-blocking, already independently discovered and fixed for the Gate 13 fixture in the same phase (so the pattern for the correct fix already exists in the same commit history).

None of the three Warnings are Critical; none was silently fixed inside this phase (correctly disposed of per this project's established review convention, matching `34-REVIEW.md`'s own WR-01 disposition).

### Human Verification Required

### 1. Browser re-confirmation of the fixed PDF route

**Test:** As an admin, open `/proposals/{id}` for a proposal owned by a different partner and confirm the "APERÇU PDF" panel renders the real PDF (not `{"error":"not_found"}`), and both "Voir le PDF" and "Télécharger le PDF" succeed, after commit `7999759`.
**Expected:** PDF preview and both actions work, matching the already-confirmed page-level bypass.
**Why human:** The pre-fix failure was reproduced empirically and the fix carries 6 non-vacuous tests (confirmed present and correctly structured in this verification), but nobody loaded the fixed page in a browser afterward — both `30-UAT.md` scenario 9's note and `37-05-SUMMARY.md` disclose this plainly as an unverified-in-browser residual rather than force-closing it. This verifier has no browser access and is constrained from starting a server, so it cannot close this item either.

## Facts Weighed, Stated Plainly

1. **Agent browser automation, not human observation.** Both `30-UAT.md` (CLOSE-01) and `33-VERIFICATION.md` (CLOSE-03) were walked by Claude driving a browser, at the operator's explicit override of the original human-at-a-browser requirement (D-37-04/plan 37-05). Both documents disclose this in their own text, in every affected result, rather than implying a human watched the screen. I judge criteria 2 and 3 genuinely satisfied on their literal terms — the documents reach the required states with concrete, checkable observations (specific sidebar counts, specific company/proposal names, DB row counts before/after) rather than vague assertions — while flagging plainly that this is a different evidentiary standard than a human-confirmed walk, and that the operator's override is the reason this is acceptable here rather than a verifier judgment call.
2. **Scope grew mid-phase (the PDF-route fix, commit `7999759`).** Confirmed real, confirmed fixed, confirmed tested non-vacuously. It was not part of any approved plan and did not go through the plan-checker — a sound emergency patch, but an unplanned one, worth the operator's awareness.
3. **The fixed PDF path was never re-confirmed in a browser.** Routed to Human Verification Required above; not force-closed.
4. **Two stale UAT count expectations, not regressions.** Independently re-derived: `c3ac2f8` (feat(33-05), Pipeline nav item) landed 2026-09-03 and `f9121c5` (feat(31-06), Réconciliation nav item) landed 2026-09-02, both after Phase 30 (2026-09-01) authored scenario 2's original 5/7 expectation. `git log --oneline` confirms both commits exist and post-date Phase 30's scenario authorship. The attribution in `30-UAT.md` is independently corroborated, not merely restated.
5. **37-REVIEW.md: 3 Warnings, 0 Critical, none fixed.** Assessed above (Anti-Patterns Found) — none undermines a stated roadmap success criterion; WR-01 is the most consequential and is flagged for operator follow-up rather than treated as a phase blocker.

## Gaps Summary

No roadmap success criterion failed. No must-have artifact is missing or stubbed. No key link is unwired. All four CI gates are independently green at the exact numbers the phase's own SUMMARYs claim. The phase is not being held to `gaps_found` — but it is not being rounded up to a clean `passed` either, because one genuine, disclosed residual (the post-fix PDF-route browser confirmation) has not been performed by anyone, human or agent, and this verifier cannot perform it either. `WR-01` (unguarded admin-visible Delete/Duplicate/Restore controls on another user's proposal) is a real, live defect this phase's own change exposed and did not close; it does not fail a stated success criterion, so it is surfaced here as an operator decision point rather than as a blocking gap, consistent with this project's established practice of disposing of Warning-level code-review findings by disclosure rather than by silent in-phase fixes.

---

_Verified: 2026-09-05T23:29:56Z_
_Verifier: Claude (gsd-verifier)_

---

## Post-Verification Amendment — 2026-09-07 (v1.8 milestone audit)

This report is left **unedited above**, so the record shows what the verifier found on
2026-09-05. What changed afterwards is recorded here.

### WR-01 — FIXED 2026-09-06, one day after this report was written

Everything above describes WR-01 (the Download / Duplicate / Delete / Restore stack rendering
unconditionally on `/proposals/[id]` for a non-owning admin) as a live, unresolved defect
surfaced "as an operator decision point rather than as a blocking gap." It was fixed the next
day in commit `c669d33` — `fix(37): gate proposal write controls on ownership, not role (WR-01)`
— and this report was never amended, so it has been asserting an open defect ever since.

**What shipped:** Duplicate (`page.tsx:370`) and Delete/Restore (`page.tsx:384`) are both gated
on `isOwner`, each carrying an inline comment naming WR-01 and the specific failure it prevents.
`isOwner` is destructured from the shared `resolveProposalAccess()` at line 65 — the same helper
that grants the admin *read* bypass — so the read-widening and the write-gating are decided in
one place and cannot drift.

**The fix deliberately departs from the one this report recommended.** The suggestion above was
`!isAdmin`; the implementation uses `isOwner`. `!isAdmin` would have been a regression — admins
own proposals of their own, and gating on role would have stripped their Duplicate and Delete
controls on those. Ownership is the correct predicate; role was never the right question.

**Pinned by:** `app/(authed)/proposals/[id]/page.test.tsx` and
`src/lib/auth/proposal-access.test.ts`.

Recorded during the v1.8 milestone audit, which read this report's WR-01 section as current
state and reported a live defect that had already been fixed. See
`.planning/v1.8-MILESTONE-AUDIT.md` tech debt item 1.

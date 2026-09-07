---
phase: 38
slug: shell-dialogs-visual-conventions
status: verified
nyquist_compliant: false
wave_0_complete: true
created: 2026-09-07
---

# Phase 38 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

**Requirements:** GAP-02, GAP-04, CLOSE-02, CLOSE-08 (4 plans, 11 tasks, 4 waves)
**Reconstructed from artifacts** (State B — no VALIDATION.md existed at execution time), then the
automatable gaps were filled on 2026-09-07 by `/gsd-validate-phase 38`.

This phase carried the milestone's only **CSS** requirement and its only two *accepted-not-closed*
coverage gaps. Both are now handled, differently and deliberately:

- **GAP-04** had zero automated guard against a drift class this repo has already been bitten by. It
  now has 20 contracts.
- **CLOSE-08**'s two unobserved surfaces cannot be closed by a test — they are blocked by an
  access-control boundary and a draft-minting side effect. What *can* be pinned is that they stay
  **visibly unclosed**, and that the two findings the verifier caught being falsely "filed" stay
  genuinely filed. That is what the honesty contracts do.

`nyquist_compliant: false` reflects the operator walk (plans 38-03, 38-04) and the two accepted
override gaps. Their outputs are contracted; the observations themselves cannot be.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.8 |
| **Config file** | `vitest.config.ts` (include glob `tests/**/*.test.ts` + colocated) |
| **Quick run command** | `npx vitest run tests/button-focus-conventions.test.ts tests/phase-38-closure-artifacts.test.ts tests/dialog-close-label.test.ts` |
| **Full suite command** | `npm test` (→ `vitest run`) |
| **Estimated runtime** | ~1s quick · ~24s full suite (199 files, 2633 tests) |
| **CI gate** | `npm run lint:check` (`eslint . --max-warnings=0`) + `npm run typecheck` |

**Execution constraint:** plan 38-03 task 1 stands up a **local production build**. `npm run build` /
`npm run start` resolve `DATABASE_URL` through `.env.production.local`, which names the production
Neon branch (OPS-05). No suite in this phase may invoke them.

---

## Sampling Rate

- **After every task commit:** Run the quick command above
- **After every plan wave:** `npm test`
- **Before `/gsd-verify-work`:** full suite green + `lint:check` + `typecheck` exit 0
- **Max feedback latency:** ~1s (quick) / ~24s (full)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| 38-01-01 | 01 | 1 | GAP-02 | `dialog.tsx` and `sheet.tsx` read `common.close.aria` through `resolveDomLang()`; both FR and EN values exist; the sidebar sheet reads its title/description from the dictionary too | unit | `npx vitest run tests/dialog-close-label.test.ts tests/dom-lang.test.ts` | ✅ | ✅ green |
| 38-01-02 | 01 | 1 | GAP-02 | A re-import of either vendored primitive that restores the English literal **fails** the suite (the two `it.each` blocks pin both files) | unit | `npx vitest run tests/dialog-close-label.test.ts` | ✅ | ✅ green |
| 38-02-01 | 02 | 2 | GAP-04 | The shared `.btn-green/.btn-navy/.btn-out` rule declares on-grid `padding: 0.5rem 1.5rem`; the retired off-grid `0.6rem` is gone from the file entirely; no per-class override duplicates it; all 6 focus selectors render the identical two-layer `var(--ring)` shadow with no colour literal; `--ring` is declared in both the light and dark blocks | unit | `npx vitest run tests/button-focus-conventions.test.ts` | ✅ | ✅ green |
| 38-02-02 | 02 | 2 | GAP-04 | `LoadMoreButton` carries no static `aria-label`, so visible text is the accessible name; both text branches read from the dictionary; the idle/loading ternary is genuinely conditional, not two branches resolving to the same call | unit | `npx vitest run tests/button-focus-conventions.test.ts -t LoadMoreButton` | ✅ | ✅ green |
| 38-02-03 | 02 | 2 | GAP-04 | UIC-11 exists as its own heading quoting the exact two-layer shadow, and states a hardcoded focus colour is a **violation** — not an optional preference | unit | `npx vitest run tests/button-focus-conventions.test.ts -t UIC-11` | ✅ | ✅ green |
| 38-03-01 | 03 | 3 | CLOSE-02 | Production build + authenticated session for the walk | manual | — | n/a | ⚪ manual-only (**must not** be automated — prod DB) |
| 38-03-02 | 03 | 3 | CLOSE-02 | Dark first-paint filmstrip + dark-mode PDF surface captured | manual | — | n/a | ⚪ manual-only (visual observation) |
| 38-03-03 | 03 | 3 | CLOSE-02 | `31.1-VERIFICATION.md` reads `status: passed` **and cites `38-UAT.md`** as the walk that produced it — not a bookkeeping flip; the `evidence/` directory exists, is non-empty, and is referenced from `38-UAT.md` | integration | `npx vitest run tests/phase-38-closure-artifacts.test.ts -t CLOSE-02` | ✅ | ✅ green |
| 38-04-01 | 04 | 4 | CLOSE-08 | Light-theme walk of the five named surfaces | manual | — | n/a | ⚪ manual-only (visual observation) |
| 38-04-02 | 04 | 4 | CLOSE-08, GAP-02 | Dark re-walk + live FR/EN close-label observation | manual | — | n/a | ⚪ manual-only — **partially unobserved, accepted under override** (see Known Limitations) |
| 38-04-03 | 04 | 4 | CLOSE-08 | Every defect found is genuinely **filed in `REQUIREMENTS.md`** (HOUSE-05, HOUSE-06 — both in the requirements list and the traceability table, mapped to Phase 40; coverage line re-derived, not trusted); the two unobserved surfaces stay recorded as *not observable*, never as a pass; the "accepted, not closed" framing and its three-row blocker table survive; F-38-04's disclosed write survives | integration | `npx vitest run tests/phase-38-closure-artifacts.test.ts -t CLOSE-08` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · ⚪ manual-only*

**Automated: 7 tasks / 4 requirements. Manual-only: 4 tasks — all of them visual observation or a
production-build session, none automatable in principle.**

---

## Wave 0 Requirements

Existing infrastructure covered all phase requirements. Vitest was already installed, and the
patterns the new suites imitate already existed (`tests/radius-scale.test.ts` and
`tests/container-radius.test.ts` for `globals.css` contracts;
`tests/seed-script-registration.test.ts` for planning-document markers;
`tests/_db-guard-fixtures.ts` for the underscore-prefixed shared-helper convention). No Wave 0
install was needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dark first-paint filmstrip — no flash of light chrome before the first dark frame | CLOSE-02 | A throttled performance trace judged frame by frame. The evidence is committed as images under `evidence/`; a reader adjudicates it. No assertion can replace looking. | `38-03-PLAN.md` tasks 1–2. Artifacts: `caseA-cookie-dark_frame-0*.jpg`, `caseB-system-osdark_frame-0*.jpg`, `close02-trace-analysis.txt`. |
| PDF surface renders white-on-`#1a2832` while the app is in dark theme | CLOSE-02 | Visual observation of a rendered PDF. | Artifact: `evidence/close02-check2_pdf-surface-dark_LC-2026-002.png`. |
| The five Phase 28 surfaces walked in light **and** dark | CLOSE-08 | Browser observation against a production build. 5 of 7 surfaces have measured results in both themes; two do not — see Known Limitations. | `38-UAT.md` § CLOSE-08 table. |
| `dialog.tsx`'s own close control announcing FR and EN live | GAP-02 | Every `dialog.tsx` consumer lives under `/clients/*`, which `requireRelationshipHolder()` refuses admins **by design** (CRM-02, confirmed live with a 404). `MergeDialog`'s reconciliation queue was empty. Reaching it needs a relationship-holder session. | Seed one duplicate-company record so `MergeDialog` opens, or grant a relationship-holder session for a single `CreateClientDialog`/`EditRelationDialog` observation. |

---

## Notes on the new suites' design

### `tests/button-focus-conventions.test.ts` (20 tests) — GAP-04

This repo has a documented CSS-drift blind spot: a duplicate radius scale shipped across five commits
while 1213 Vitest tests stayed green. GAP-04 is the same class — a shared rule plus a token
unification across six selectors — and had no guard at all.

Two design points worth recording:

**The focus-selector count is derived, not asserted.** One test parses `globals.css` and pins the
count it finds (**6** selectors across 4 rule blocks: the three `.btn-*:focus-visible`,
`.search-bar:focus-within`, `.admin-nav-card:focus-visible`, `.stepper-circle:focus-visible`). A
seventh focus rule added without the two-layer treatment fails; so does a sixth silently deleted.

**The hardcoded-colour contract is scoped at the selector level, not the text level.** `globals.css`
still contains three `rgba(45, 122, 140, …)` literals (lines 441, 490, 509) — all decorative
(`:hover` shadows), none in a focus rule. A naive text search would have flagged them and forced the
contract to be weakened. Instead the parser isolates focus rule bodies, and a dedicated self-check
test proves the scoping mechanism actually excludes `.admin-nav-card:hover` while still catching a
retired flat-teal literal placed inside a focus rule. Six of the 20 tests are self-checks of this
kind — they prove the parser can fail, not just that today's CSS passes.

### `tests/phase-38-closure-artifacts.test.ts` (9 tests) — CLOSE-02 + CLOSE-08

**The honesty contracts are the point.** `38-VERIFICATION.md`'s Gap 1 **failed** because `38-UAT.md`
claimed findings F-38-03 and F-38-06 were "filed for a later phase" while nothing had been added to
`REQUIREMENTS.md`. The verifier's words: *"A UAT footnote that says 'filed' is not the same as being
filed."* Four of the nine contracts guard that exact defect and its neighbours:

- HOUSE-05 and HOUSE-06 exist as real rows **in both** the requirements list and the traceability
  table, mapped to Phase 40.
- The coverage count is re-derived by counting traceability rows, then compared to the stated line —
  so the number cannot drift from reality.
- The two unobserved surfaces stay recorded as **not observable**, never upgraded to a pass.
- "Accepted, not closed" and its three-row blocker table survive in `38-VERIFICATION.md`.

**One contract deliberately does not adjudicate.** `38-UAT.md`'s Environment block says
`mode: read-only … nothing created/edited/deleted`, while F-38-04 in the same file discloses that
entering the wizard persisted draft `LC-2026-003` and consumed a sequential LC reference. The verifier
flagged this as an internal contradiction. The contract asserts only that **the disclosure survives**
— it does not assert the Environment block is correct, and it does not assert the contradiction away.
The inconsistency is noted in a code comment as recorded and unadjudicated.

### Path treatment differs by phase number — on purpose

`31.1-VERIFICATION.md` sits in Phase 40 / CLOSE-07's 28–35 archive-move range, so it is resolved
through the shared archive-resilient `resolvePhaseDoc()`. `38-UAT.md`, `38-VERIFICATION.md` and
`evidence/` are **not** in that range, so they are pinned at literal paths — archive-resilience there
would mask a genuine disappearance rather than tolerate a legitimate move. Both choices are explained
in the suite's docblock.

### Shared helper extracted: `tests/_planning-docs.ts`

`resolvePhaseDoc()` was written into `tests/phase-37-closure-artifacts.test.ts` yesterday and is now
needed by two suites. Rather than copy it — the very WR-02 duplication failure Phase 37 itself had to
fix by extracting `resolveProposalAccess` — it moved into an underscore-prefixed shared module
following `tests/_db-guard-fixtures.ts`'s convention (typechecked and linted, never collected, since
vitest's include glob is `tests/**/*.test.ts`).

Its six mechanism tests moved with it into `tests/planning-docs-resolver.test.ts`, so the helper's
proof lives beside the helper. The Phase 37 suite kept all 11 of its contract tests, unchanged in
name, order, threshold and anchor string — the edit was import-only.

**A latent bug was found and fixed during the extraction.** The resolver built its prefix regex as
`new RegExp('^' + phaseNumber + '-')` with the phase number interpolated **raw**. Phase `31.1`
contains a literal `.` — an unescaped regex metacharacter — so `31.1` would also have matched a
hypothetical `3141-*` or `31x1-*` directory as a spurious ambiguity, tripping the "found in both"
guard against an unrelated phase. It did not manifest against today's directory contents (the real
neighbour `31-reconciliation-engine-proposal-extraction` mismatches at the 4th character either way),
but the defect was real. `escapeRegExpLiteral()` now escapes the number before it reaches `RegExp()`,
proven by a decoy-directory fixture test. Phase 38 is the first consumer to pass a decimal phase
number, which is why it surfaced here.

---

## Known Limitations

**1. Two coverage gaps are accepted, not closed.** Carried unchanged from `38-VERIFICATION.md`'s dated
operator override of 2026-09-06. Nothing here claims the missing observations were made:

| Unobserved | Blocker |
|---|---|
| Wizard step 1, dark theme | Entering the wizard mints a draft and consumes an LC reference (F-38-04). A dark pass creates a second stray row; the operator declined. Surface #1 has **no dark observation of any kind** — not even a "not observable" one. |
| LC-references "Charger plus", both themes | Rendered only inside `{nextCursor && …}`. The dataset is 16 rows on a single page, so the control does not exist to be measured. HOUSE-06 records the multi-page-dataset precondition. |
| `dialog.tsx` close control, FR and EN | Every consumer lives under `/clients/*`, which `requireRelationshipHolder()` refuses admins by design (CRM-02, confirmed live). `MergeDialog`'s queue was empty. |

Closing all three needs a relationship-holder login, a disposable database, and a multi-page LC
dataset. The new contracts guarantee these stay *visible* as gaps; they cannot fill them.

**2. GAP-02's code fix is verified by proxy, not by direct observation.** `dialog.tsx`'s edit is
byte-identical to `sheet.tsx`'s, pinned by `tests/dialog-close-label.test.ts`, and `sheet.tsx`
exercised that exact `t('common.close.aria', resolveDomLang())` call path live in both languages. That
is real mitigating evidence and was correctly labelled as mitigation rather than substitution in
`38-UAT.md` — but the roadmap's literal "verified in FR and EN" was not met for the primitive itself.

**3. `38-UAT.md` contains a recorded internal contradiction.** Its Environment block claims a
read-only session; F-38-04 in the same file discloses the wizard-entry write. The write is disclosed
prominently, so this is a documentation inconsistency rather than a hidden write. Contract (f)
preserves the disclosure without adjudicating the contradiction.

---

## Validation Audit 2026-09-07

| Metric | Count |
|--------|-------|
| Requirements assessed | 4 |
| Already COVERED (no action) | 1 (GAP-02) |
| Gaps found | 3 MISSING (GAP-04, CLOSE-02, CLOSE-08) |
| Resolved | 3 |
| Escalated | 0 |
| Test files added | 3 (+1 shared helper module) |
| Tests added | 30 net (+36 new, −6 relocated) |
| Latent bugs found and fixed | 1 (unescaped decimal phase number in the shared resolver) |
| Discrepancies found between claims and files | 0 |

### Files added

| File | Tests | Purpose |
|------|-------|---------|
| `tests/_planning-docs.ts` | — | Shared archive-resilient phase-document resolver (never collected) |
| `tests/planning-docs-resolver.test.ts` | 7 | The resolver's own proof — 6 relocated from the Phase 37 suite + 1 new for the decimal-escaping fix |
| `tests/button-focus-conventions.test.ts` | 20 | GAP-04 — padding, focus-ring unification, `LoadMoreButton`, UIC-11, + 6 parser self-checks |
| `tests/phase-38-closure-artifacts.test.ts` | 9 | CLOSE-02 (3) + CLOSE-08 (6, incl. the honesty contracts) |

`tests/phase-37-closure-artifacts.test.ts` was edited **import-only**; its 11 contract tests are
unchanged in name, order, threshold and anchor.

### Pre-existing coverage found during cross-reference

GAP-02 needed nothing: `tests/dialog-close-label.test.ts` (8 tests — two `it.each` blocks pinning both
vendored primitives, plus the sidebar and dictionary contracts) and `tests/dom-lang.test.ts` (7 tests
over `resolveDomLang()`).

### Gates after the change

| Gate | Before | After |
|------|--------|-------|
| `npm test` files | 190 passed / 6 skipped (196) | **193 passed / 6 skipped (199)** |
| `npm test` tests | 2542 passed / 61 skipped (2603) | **2572 passed / 61 skipped (2633)** |
| `npm run lint:check` | exit 0 | exit 0 |
| `npm run typecheck` | exit 0 | exit 0 |

Delta +3 files / +30 tests, consistent with the extraction arithmetic (−6 relocated, +7, +20, +9).
`git status` confirms no implementation file and no planning document was modified.

---

## Validation Sign-Off

- [x] Every task has an automated verify, a Wave 0 dependency, or a Manual-Only row naming its reason
- [x] Sampling continuity: no 3 consecutive automatable tasks without an automated verify
- [x] Wave 0 covers all MISSING references (none needed — infrastructure pre-existed)
- [x] No watch-mode flags
- [x] Feedback latency ~1s quick / ~24s full
- [ ] `nyquist_compliant: true` — **deliberately not set.** Plans 38-03 and 38-04 are visual operator
      walks against a production build, and two of their observations remain accepted-not-closed
      behind an access-control boundary (CRM-02), a draft-minting side effect, and a single-page
      dataset. Marking this phase compliant would assert coverage the override explicitly declined.

**Approval:** pending operator review

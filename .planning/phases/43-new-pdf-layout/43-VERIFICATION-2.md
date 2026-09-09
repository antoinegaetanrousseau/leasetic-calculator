---
phase: 43-new-pdf-layout
verified: 2026-09-09T20:23:59Z
status: passed
score: 6/6 roadmap success criteria verified (13/13 requirement IDs verified)
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 5/6 truths (10/13 requirement IDs), 3 gaps
  gaps_closed:
    - "Gap 1 (DOC-01): title-row mid-word hyphenation in FR/EN"
    - "Gap 2 (DOC-03): VOTRE CONTACT card renders one undifferentiated 6-row list with duplicate Téléphone labels, plus Finding 3 (partnerCo falling back to a person's name)"
    - "Gap 3 (DOC-02/FIELD-03): clientSiret fixture/coverage hole — populated-SIRET render path had zero test coverage"
  gaps_remaining: []
  regressions: []
deferred: []
human_verification: []
---

# Phase 43: New PDF Layout Verification Report (Round 2 — Gap Closure)

**Phase Goal:** The generated proposal PDF matches the Claude Design layout pixel-for-pixel in both languages — replacing the current single-page text-only document — while holding ADMIN-09 commission invisibility and byte-determinism as non-negotiable gates on the finished output.
**Verified:** 2026-09-09
**Status:** passed
**Re-verification:** Yes — this is the second verification pass, closing the three gaps raised by `43-VERIFICATION.md`.

## Summary

All three gaps from the first verification pass are genuinely closed in the codebase, not merely
claimed closed in SUMMARY.md prose. Every `missing[]` bullet across all three gaps was traced to
concrete code and independently re-derived by this pass — including re-running the full test suite
(200 files / 2723 passed / 61 skipped), independently falsifying the new DOC-01 guard by reverting
the fix and confirming it fails RED with the exact hyphenation artifact, confirming scope discipline
on 43-11 via `git diff --stat` across the whole gap-closure commit range, and confirming the
byte-determinism baseline was regenerated exactly once and is the last commit to touch any
render-path file. `npx tsc --noEmit` and `npm run lint:check` are both clean.

One non-blocking documentation-fidelity finding is recorded below (DOC-03's REQUIREMENTS.md prose
was never amended to match the final 43-10 restructure, even though the checkbox was ticked) — it
does not affect the functional verdict but should be fixed before it confuses a future reader.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A generated PDF matches the design spec end to end (header/title/cards/hero+table/acceptance/footer) | ✓ VERIFIED | Both defects from the first pass are code-fixed and test-guarded: (a) `Font.registerHyphenationCallback((word) => [word])` present exactly once at `src/lib/pdf/document.tsx:64`, independently falsified by this verifier (see "DOC-01 Guard Falsification" below); (b) VOTRE CONTACT card rebuilt to two headlined entities at `document.tsx` lines ~296-330 (verified below). |
| 2 | Conditions paragraph always states the proposal's actual `validityDays`, never a hardcoded 30 | ✓ VERIFIED | Unchanged from first pass; still green in the full suite (`layout.test.ts` DOC-06). |
| 3 | English proposals render every label + full legal paragraph from `Quote-EN-A.dc.html`; French from `Quote-FR-A.dc.html` | ✓ VERIFIED | `dehyphenate()` is now fully deleted from `layout.test.ts` (confirmed: `grep -n "dehyphenate" src/lib/pdf/layout.test.ts` returns only the file-header prose explaining its removal, no callable). `reconstructVisibleTextFontAware` returns raw, unnormalised text. DOC-10 assertions are now real guards against the actual rendered bytes, not a laundered string — closing the exact defect the first pass caught. |
| 4 | A field with no captured value renders its label followed by an em dash | ✓ VERIFIED | `emDash()` still consistently applied at every card row, including the two new headlines (`emDash(inputs.partnerName)`, `emDash(advisor?.name)`) and `emDash(inputs.clientSiret)`, `emDash(inputs.partnerCo)`. |
| 5 | No commission figure/rate/derived value appears anywhere; byte-identical re-renders | ✓ VERIFIED | `no-commission.test.ts` (42 tests) and `tests/admin-09-grep-contracts.test.ts` (21 tests) both green. `__pdf-fixtures__/expected.sha256.txt` regenerated exactly once (commit `9e2f49d`), confirmed to be the sole commit touching that file since the prior (43-07) regeneration, and confirmed to be the LAST commit touching any render-path file (`document.tsx`, `dictionaries.ts`, `render.ts`, `fixtures.ts`) in the gap-closure range — no unintended drift silently absorbed. `render-fixtures.test.ts` passes against the current source right now. |
| 6 | Every text node uses the design's ten-step type scale | ✓ VERIFIED | Unchanged from first pass; `styles.ts` untouched by gap closure. |

**Score:** 6/6 truths verified (up from 5/6 — Criterion 1 now fully closed)

### Gap-by-Gap Trace of `43-VERIFICATION.md`'s `missing[]` Bullets

**Gap 1 (DOC-01 — title hyphenation):**

| `missing[]` bullet | Status | Evidence |
|---|---|---|
| Add `Font.registerHyphenationCallback((word) => [word])` beside `Font.register` | ✓ CLOSED | `src/lib/pdf/document.tsx:64`, confirmed present exactly once, placed immediately after the `Font.register` block (line 42). |
| Replace `dehyphenate()` with a positive assertion of absence | ✓ CLOSED | `dehyphenate()` deleted entirely (not just renamed/reworded). New `describe('DOC-01: the title never wrap-hyphenates ...')` block at `layout.test.ts:288` asserts both the clean phrase (`.toContain`) AND the absence of the wrap-hyphen artifact via `.not.toContain('finan- cière')` / `.not.toMatch(/finan-\s/)` (FR) and the EN equivalent. **Independently falsified by this verifier**: commenting out the callback reproduces the exact defect — `text` contains `"finan- cière"` / `"pro- posal"` and 4 tests fail (2 DOC-01, 2 DOC-10); restoring the callback returns to 16/16 green with zero diff. This is a genuine guard, not the same normalization trick reworded — the first pass's exact failure mode does not recur. |
| Regenerate `expected.sha256.txt` | ✓ CLOSED | Landed in 43-12 (commit `9e2f49d`), after all four byte-changing plans (43-09/10/11/12) — see Gap 3 trace below for the sequencing proof. |

**Gap 2 (DOC-03 — VOTRE CONTACT card semantics + Finding 3):**

| `missing[]` bullet | Status | Evidence |
|---|---|---|
| Implement the 7-row structure (partner headline + Partenaire/Téléphone, advisor headline + Fonction/Téléphone/Email) | ✓ CLOSED | `document.tsx` lines ~296-330: two `emDash`-wrapped headlines (`inputs.partnerName`, `advisor?.name`) each followed by their own `CardKeyValueRow`s — `partner`/`partnerPhone` under the first, `advisorRole`/`advisorPhone`/`advisorEmail` under the second. Matches the shipped structure exactly. |
| Dictionary deletions/additions (delete `salesRep`/`advisorName`, add `partner`) | ✓ CLOSED | `dictionaries.ts` confirmed: only `pdf.card.contact.title/partner/partnerPhone/advisorRole/advisorPhone/advisorEmail` remain (FR lines 508-513, EN 1880-1885) — `salesRep` and `advisorName` are absent as dictionary keys (`grep` for both string literals across `document.tsx` and `dictionaries.ts` returns nothing). |
| Resolve Finding 3 (`partnerCo` fallback to a person's name) | ✓ CLOSED | Both hydration sites (`app/(authed)/proposals/new/parametres/page.tsx:112`, `.../_actions/saveAndAdvance.action.ts:82`) confirmed to resolve to `u.companyName?.trim() || ''` — the `|| nameFallback` chain is gone from the `partnerCo` derivation at both sites (still correctly present on the separate `partnerName` derivation, which legitimately names a person). Schema (`src/lib/calc/schema.ts:184`) confirmed `partnerCo: z.string().optional()`, and `ProposalDocumentProps.inputs.partnerCo?: string` narrowed to match (`document.tsx:83`). Option (b) — an admin edit path for `companyName` — was explicitly declined and is confirmed absent: `git diff --stat` across the full gap-closure range (`d064ed6..0b90fee`) touches zero files under `src/lib/admin/` or `app/(admin)/`, and the unmerged `fix/partner-company-telephone-edit` branch (PR #13) is untouched. |

**Gap 3 (DOC-02/FIELD-03 — clientSiret fixture/coverage hole):**

| `missing[]` bullet | Status | Evidence |
|---|---|---|
| Add a valid `clientSiret` to happy-path fixtures, keep ≥1 fixture without it | ✓ CLOSED | `__pdf-fixtures__/fixtures.ts:36`: `SHARED_BASE.inputs.clientSiret = '12345678900012'` (first 9 digits equal `clientSiren`, satisfying the schema refine) — used by both `happy-path-fr`/`happy-path-en`. `withoutClientSiret()` helper (line 75) strips the key for `AGENT_COMMISSION_FREE_BASE`, so **FIELD-03 legacy coverage survives**: `agent-commission-free` still carries no `clientSiret` key at all. |
| Add a positive render assertion for populated SIRET | ✓ CLOSED | `layout.test.ts:528` `describe('DOC-02: a populated client SIRET renders ...')` — FR/EN positive cases assert the SIRET value appears after its own label (not merely somewhere on the page), plus a control case asserting the absent branch renders exactly one MORE em dash, proving the populated branch genuinely replaced an em dash rather than adding a stray glyph. All three pass in the current suite. |
| Regenerate `expected.sha256.txt` | ✓ CLOSED | Regenerated exactly once in 43-12 (`9e2f49d`), after 43-09/43-10/43-11's byte-changing work. `git log --oneline -- __pdf-fixtures__/expected.sha256.txt` confirms `9e2f49d` is the only commit touching the file between the prior 43-07 regeneration (`cc49778`) and HEAD, and `git log 9e2f49d..HEAD -- document.tsx dictionaries.ts render.ts fixtures.ts` is empty — nothing render-affecting changed after the regeneration, so no unintended drift was silently absorbed. `render-fixtures.test.ts` passes right now against the checked-in hash. |
| Operator confirmation on a real finalized proposal | ✓ CLOSED | `43-13-SUMMARY.md` records the verbatim verdict "all three yes, c: shows all empty" — question (a), "Does the SIRET row show the 14-digit number you typed?", answered YES on a real finalized proposal on the production Neon branch (`.env.local`). |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/pdf/document.tsx` | Full page render tree, hyphenation disabled, two-entity contact card, optional `partnerCo` | ✓ VERIFIED | All three fixes confirmed on disk and exercised by the currently-green suite. |
| `src/lib/pdf/layout.test.ts` | Falsifiable DOC-01 guard, DOC-03 ordering guard, DOC-02 positive-render guard | ✓ VERIFIED | All three describe blocks present, independently falsified/re-derived by this verifier (DOC-01) or read directly against passing output (DOC-02, DOC-03). |
| `src/lib/i18n/dictionaries.ts` | `salesRep`/`advisorName` deleted, `partner` key added | ✓ VERIFIED | Confirmed both FR and EN blocks. |
| `src/lib/calc/schema.ts` | `partnerCo` optional | ✓ VERIFIED | `z.string().optional()` confirmed at line 184. |
| `__pdf-fixtures__/fixtures.ts` | `clientSiret` on happy-path fixtures, absent on one legacy fixture | ✓ VERIFIED | Confirmed; `withoutClientSiret()` helper present and wired. |
| `__pdf-fixtures__/expected.sha256.txt` | Regenerated exactly once, reflecting all gap-closure bytes | ✓ VERIFIED | Confirmed via commit-range analysis; `render-fixtures.test.ts` green against current source. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `document.tsx` Font block | react-pdf renderer | `Font.registerHyphenationCallback` | ✓ WIRED | Module-load global state, confirmed to actually change rendered output (falsification test). |
| `document.tsx` contact card | `dictionaries.ts` | `t('pdf.card.contact.*', lang)` | ✓ WIRED | All 6 keys (`title`, `partner`, `partnerPhone`, `advisorRole`, `advisorPhone`, `advisorEmail`) consumed at their exact call sites. |
| `parametres/page.tsx` / `saveAndAdvance.action.ts` | `document.tsx` `inputs.partnerCo` | schema + hydration | ✓ WIRED | Optional end to end: schema → props interface → both hydration sites, all consistently `?? ''`/`undefined`, never a name fallback. |
| `fixtures.ts` | `layout.test.ts` DOC-02 | `FR_FIXTURE.data.inputs.clientSiret` | ✓ WIRED | Test reads the fixture's actual populated value, not a hardcoded literal, so a future fixture rotation that accidentally drops the key would fail the test's own non-vacuousness assertion. |

### Requirements Coverage

| Requirement | Status | Evidence | Note |
|---|---|---|---|
| DOC-01 | ✓ SATISFIED | Full text (single-page A4, header band, 2px rule, 21pt title, ten-step type scale) — the type scale and header were already verified in round 1; hyphenation defect now closed and independently falsified. | Ticked `[x]` in REQUIREMENTS.md, matches code. |
| DOC-02 | ✓ SATISFIED | Full text (SOCIÉTÉ CLIENTE card: company name, SIREN, SIRET, destinataire, fonction, téléphone, email, two-column grid) — all 7 fields confirmed present at `document.tsx` lines 285-296 via `CardKeyValueRow`/`emDash`; SIRET's populated-value render path now has automated + operator-confirmed coverage. | Ticked `[x]`, matches code. |
| DOC-03 | ⚠ SATISFIED, but requirement TEXT is stale | Code matches operator's final, explicitly-approved 43-08 structure (partner name headline + Partenaire/Téléphone, advisor name headline + Fonction/Téléphone/Email) and was structurally confirmed unambiguous by the operator on a real document. **However**, REQUIREMENTS.md's own DOC-03 prose still reads "whose headline is the partner **company**, commercial and téléphone" — the pre-43-08 structure. 43-11 flipped the checkbox to `[x]` but did not append a further amendment note recording the final restructure, breaking this project's own established "amendment-in-plan" precedent (the same requirement had already been amended twice, by D-24 and D-03). This is a documentation-fidelity gap, not a functional one — see Finding 1 below. | Ticked `[x]`; code is correct; **prose text needs a follow-up amendment**. |
| DOC-04 through DOC-13, FIELD-03 | ✓ SATISFIED | Unchanged from round 1 — none were in scope for this gap-closure round, all remain verified against the green suite. | — |

**Orphaned requirements check:** No change from round 1 — all 13 phase-mapped requirement IDs are ticked, matching REQUIREMENTS.md and ROADMAP.md's requirement mapping table.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `.planning/REQUIREMENTS.md` | 33-43 | DOC-03's prose describes the pre-43-08 card structure ("headline is the partner company, commercial and téléphone"), not the shipped 7-row structure (name headline, explicit `Partenaire` company row, `salesRep`/"commercial" row deleted) | ⚠️ Warning | Documentation drift — a future reader (including a future planning/verification pass) could be misled about what DOC-03 actually requires. Does not affect the functional verdict; code and operator confirmation both independently establish the actual shipped behavior is correct and intended. |
| `.planning/ROADMAP.md` | 145 | The v1.9 milestone summary line for Phase 43 still reads `[~]` ... "NOT closed, DOC-01/02/03 stay unticked, gap-closure plan required before Phase 44" — stale, pre-dates the 43-09..43-13 gap closure | ⚠️ Warning | Same class of drift as above — REQUIREMENTS.md's own per-requirement table (line 158-160) and checkboxes were updated by the gap-closure commits, but this rollup summary line was not. Could mislead whoever starts Phase 44 into re-litigating already-closed gaps, or could cause a future audit pass to re-flag closed work as open. |

No `TBD`/`FIXME`/`XXX` debt markers found in any file touched by the gap-closure round (`document.tsx`, `layout.test.ts`, `dictionaries.ts`, `dictionaries.test.ts`, `schema.ts`, `schema.test.ts`, `page.tsx`, `page.test.tsx`, `saveAndAdvance.action.ts`, `saveAndAdvance.action.test.ts`, `fixtures.ts`, `expected.sha256.txt`).

### Behavioral Spot-Checks / Independent Falsification

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| DOC-01 guard actually detects the regression it claims to guard against | Comment out `Font.registerHyphenationCallback`, run `layout.test.ts` | 4 tests fail with `"finan- cière"` / `"pro- posal"` in the extracted text — the exact defect from round 1 | ✓ PASS |
| DOC-01 guard restores clean after reverting the comment-out | `git diff` on `document.tsx` after restore | Zero diff; 16/16 tests pass | ✓ PASS |
| Scope discipline: nothing under `src/lib/admin/`/`app/(admin)/` touched by gap closure | `git diff --stat d064ed6..0b90fee -- src/lib/admin app/(admin)` | Empty output | ✓ PASS |
| Byte-determinism baseline regenerated exactly once, last, absorbing no unintended drift | `git log --oneline -- expected.sha256.txt`; `git log 9e2f49d..HEAD -- document.tsx dictionaries.ts render.ts fixtures.ts` | Single commit `9e2f49d` since prior regen; zero commits touch render-path files after it | ✓ PASS |
| Full suite green, no untracked test files (CI phantom-pass risk) | `git status --porcelain`; `npm test` | Clean tree; 200 files / 2723 passed / 61 skipped | ✓ PASS |
| Type-check and lint gates | `npx tsc --noEmit`; `npm run lint:check` | Both exit 0, no output | ✓ PASS |
| Write paths still enforce `clientSiret` (Gap 3 "not a live defect" claim) | Read `finalize-wizard.ts:172` (`LegacyDraftIncomplete`), `submit.ts:77` + `schema.ts:141-146,231` (`requiredSiretSchema`, SIREN-prefix refine) | Both paths confirmed to require and validate the field | ✓ PASS |
| `companyName` remains settable at partner creation (declined admin-edit path is not a total dead end) | `app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.tsx` sets `companyName` | Confirmed present | ✓ PASS (context, not a gap) |

### Probe Execution

No `scripts/*/tests/probe-*.sh` convention found. Skipped — not applicable, same as round 1.

### The "shows all empty" observation (item 7 of the brief)

**Assessed as defensible.** The operator's screenshot shows every VALUE in the VOTRE CONTACT card as
an em dash while the STRUCTURE (two headlines, five labelled rows) is exactly what 43-10 shipped.
Three independent, verifiable facts support treating this as a data-absence, not a rendering
defect:

1. `companyTelephone`'s only admin edit path (PR #13, `fix/partner-company-telephone-edit`) is
   confirmed **unmerged** into `main` (`git merge-base --is-ancestor` returns false) — so no admin
   UI exists yet to have set it for this account.
2. `companyName` is set only at partner-creation time (`CreatePartnerForm.tsx`), with no later edit
   path by 43-11's own explicit, operator-approved scoping (option (a), not (b)) — an account
   created before this field mattered, or created without it, will legitimately have none.
3. The advisor being unconfigured is a documented, pre-existing condition (flagged as far back as
   the 43-08 checkpoint), not something this gap-closure round could have introduced or should have
   fixed — Phase 43's requirements are about PDF structure, not admin data entry.

The operator's own answer to question (c) — "is it now unambiguous who is partner vs. advisor" —
was YES, and the screenshot structurally confirms the 7-row layout. Recording the emptiness as a
follow-up rather than reopening DOC-03 is the correct call; reopening a structural requirement over
an unrelated, already-tracked data-population gap would conflate two different concerns.

## Findings

### Finding 1 (non-blocking): REQUIREMENTS.md DOC-03 prose is stale

`REQUIREMENTS.md` lines 33-43 still describe the pre-43-08 VOTRE CONTACT structure ("headline is the
partner company, commercial and téléphone"). The actual shipped structure (verified against code and
operator confirmation) headlines the partner's **name** with an explicit `Partenaire` company row
beneath, and the `commercial`/`salesRep` row is deleted entirely. 43-11 ticked the DOC-03 checkbox
but did not append a further amendment note, breaking the "amendment-in-plan" precedent this same
requirement had already followed twice (Phase 42 D-24, Phase 43 D-03). Recommend a short follow-up
amendment note (same pattern as D-03/D-24) before Phase 44 or any future phase reads this
requirement's text as authoritative.

### Finding 2 (non-blocking): ROADMAP.md's Phase 43 milestone summary line is stale

`ROADMAP.md` line 145 still reads `[~] **Phase 43: New PDF Layout** — ... NOT closed, DOC-01/02/03
stay unticked, gap-closure plan required before Phase 44` — written before the gap closure landed.
`REQUIREMENTS.md`'s own requirement table (updated by the gap-closure commits) and this
verification both show all three as closed. Recommend flipping this line to `[x]` with a
`(completed 2026-09-09)` note, consistent with every other closed-phase entry in that file, before
Phase 44 starts — so a future planner/verifier reading the rollup does not re-litigate closed work.

Neither finding blocks phase closure: both are pointer-only, and the underlying code + tests +
operator confirmation are all independently correct.

## Gaps Summary

None. All three gaps from `43-VERIFICATION.md` are closed with concrete code evidence, re-derived
independently by this pass (not merely re-read from SUMMARY.md prose):

1. **Title-row hyphenation** — fixed and independently falsified by this verifier via a live
   RED→GREEN revert.
2. **VOTRE CONTACT card semantics + Finding 3** — card restructured, `partnerCo` fallback removed,
   scope discipline confirmed via `git diff --stat` across the full gap-closure commit range.
3. **clientSiret fixture/coverage hole** — fixture populated, positive assertion added, FIELD-03
   legacy coverage preserved via `withoutClientSiret()`, fixture baseline regenerated exactly once
   and confirmed to be the last render-affecting commit, operator confirmed on a real proposal.

Full suite (200 files / 2723 passed / 61 skipped), `npx tsc --noEmit`, and `npm run lint:check` all
green as of this verification. No untracked test files. No debt markers in touched files.

**Phase 43 is done.** The two documentation-fidelity findings above (stale DOC-03 prose, stale
ROADMAP rollup line) should be swept before or during Phase 44's kickoff, but they do not block
Phase 44's backfill from proceeding — the document Phase 44 will re-render every existing proposal
into is now correct.

---

*Verified: 2026-09-09*
*Verifier: Claude (gsd-verifier)*

---
phase: 38-shell-dialogs-visual-conventions
verified: 2026-09-06T17:00:00Z
status: gaps_found
score: 2/5 must-haves fully verified (2 partially verified with legitimate but real coverage gaps, 1 failed)
overrides_applied: 0
gaps:
  - truth: "Every defect the CLOSE-08/CLOSE-02 walk found is either fixed in-phase or filed as a requirement — none left as an unrouted observation (38-04-PLAN.md must_have)"
    status: failed
    reason: >
      F-38-03 ("ProposalForm is dead code, and CLOSE-08 surface #1 was mis-mapped") and F-38-06
      ("38-WALK-SURFACES.md describes pagination controls as 'per-row' links") are both recorded
      in 38-UAT.md with "status: open — filed for a later phase" / "status: open — documentation
      correction". Neither actually appears anywhere in .planning/REQUIREMENTS.md — not as a new
      GAP-XX/OPS-XX/HOUSE-XX line, and not in the "Future Requirements (deferred beyond v1.8)"
      table. `git show 48a03b6 -- .planning/REQUIREMENTS.md` shows only CLOSE-02 and CLOSE-08
      being ticked; no new rows were added. D-38-07's own language ("File as a requirement for a
      later phase") and the plan's must-have both point at the project's established ledger
      (REQUIREMENTS.md), which is what every other CLOSE/GAP/OPS/HOUSE item in this project uses.
      A UAT footnote that says "filed" is not the same as being filed.
    artifacts:
      - path: ".planning/REQUIREMENTS.md"
        issue: "No entry for F-38-03 (delete/document the unrendered ProposalForm component) or F-38-06 (correct 38-WALK-SURFACES.md's 'per-row link' description to 'pagination control, conditional on nextCursor')"
    missing:
      - "Add a requirement row (or a Future Requirements table row) for F-38-03: ProposalForm.tsx is an unrendered/dead component that D-38-04's surface map incorrectly cited as CLOSE-08 surface #1's .btn-out/.btn-navy source"
      - "Add a requirement row (or fold into the same entry) for F-38-06: 38-WALK-SURFACES.md's surface descriptions for PartnersList/LcReferencesList/HistoryTable/LoadMoreButton need 'per-row link' corrected to 'pagination control (conditional on nextCursor)'"
  - truth: "Phase 28's browser-verification backlog is walked in light AND dark with each result recorded (ROADMAP success criterion 2 / 38-04-PLAN.md must_have: 'Each of Phase 28's five named surfaces has a recorded light result and a recorded dark result')"
    status: partial
    reason: >
      5 of 7 enumerated surfaces have real measured pass results in both light and dark
      (proposals list, coefficients history, /parametres, partners list, create-partner form).
      Two do not: wizard step 1 (surface #1) renders zero `.btn-*` elements at all (confirmed via
      live DOM query), so nothing was measured there, AND — separately — the operator explicitly
      decided not to re-enter the wizard for a dark-theme pass at all (F-38-04), because doing so
      mints a second persisted draft and burns a second sequential LC reference. So surface #1 has
      no dark observation of any kind, not even a "not observable" one. LC references (surface
      #5c) never rendered its `.btn-out` "Charger plus" control in either theme because the
      dataset is single-page (16 rows, no `nextCursor`). The walk substitutes a same-CSS-rule
      argument (the shared `.btn-out` rule was measured elsewhere) for a direct observation of
      this named surface, which is reasonable engineering evidence but is not the "recorded light
      result and recorded dark result" the plan's own must-have asked for on this specific
      surface.
    artifacts:
      - path: ".planning/phases/38-shell-dialogs-visual-conventions/38-UAT.md"
        issue: "CLOSE-08 table rows 1 and 5c read 'not observable' rather than a measured pass/fail; row 1 has no dark entry at all"
    missing:
      - "A genuine dark-theme observation of /proposals/new/parametres (surface #1), which needs a disposable/rollback-safe database so a second draft-and-LC-reference write is acceptable, or an explicit operator-accepted deviation recorded in REQUIREMENTS.md/ROADMAP.md accepting the surface as permanently unwalkable while ProposalForm remains dead code"
      - "A genuine observation of the LC-references/Partners 'Charger plus' control rendered and measured, which needs a seeded multi-page dataset (>1 page of LC references or partners) on the read-only development branch"
  - truth: "Every icon-only dialog close control announces an accessible name in the viewer's language, verified in FR and EN (ROADMAP success criterion 3)"
    status: partial
    reason: >
      Only 2 of the 4 observations D-38-12 asked for were obtained: the mobile sidebar sheet's
      close button was directly observed announcing 'Fermer' (fr) and 'Close' (en) via the
      accessibility tree. `dialog.tsx`'s own close control was never observed in either language
      — every consumer lives under `/clients/*`, which `requireRelationshipHolder()` refuses to
      admins by design (CRM-02), and the one admin-reachable consumer (`MergeDialog` on the
      reconciliation queue) had no data to open it against. The mitigating evidence (byte-identical
      edit in both files, a passing pinning test, and the sheet's live observation of the same
      `t('common.close.aria', resolveDomLang())` call path) is real and was correctly labelled as
      mitigation rather than substitution in 38-UAT.md — but the roadmap criterion's literal text
      ("verified in FR and EN") was not met for the `dialog.tsx` primitive itself; it was inferred
      from a sibling file plus static analysis.
    artifacts:
      - path: "src/components/ui/dialog.tsx"
        issue: "Close-button i18n fix (t('common.close.aria', resolveDomLang())) is present and code-reviewed, but never exercised live in a browser in either language — no admin-reachable, non-empty dialog.tsx consumer existed in this session's data"
    missing:
      - "A live FR and EN observation of any dialog.tsx consumer reachable by the authenticated role used for the walk — e.g. seed one duplicate-company record on the development branch so MergeDialog has something to open, or grant a relationship-holder session for a single CreateClientDialog/EditRelationDialog observation"
human_verification:
  - test: "Re-run F-38-03's fix decision and F-38-06's documentation correction through REQUIREMENTS.md, then confirm whether the operator accepts the current UAT-only record as sufficient 'filing' or wants a formal ledger entry before phase close."
    expected: "Either two new rows appear in REQUIREMENTS.md (Future Requirements or a new backlog ID), or the operator explicitly overrides 38-04-PLAN.md's must-have and records why a UAT footnote is an accepted substitute."
    why_human: "This is a process/documentation-convention judgment call about what 'filed as a requirement' means in this project, not something a script can adjudicate."
  - test: "Decide whether the two partial-coverage findings (wizard step 1 dark pass; dialog.tsx FR/EN live observation) need to be closed with real coverage before the phase counts as done, or accepted as a recorded, dated exception given their legitimate blockers (draft/LC-reference consumption; CRM-02 access control; empty reconciliation queue)."
    expected: "An operator decision, recorded either in 38-UAT.md or REQUIREMENTS.md, that these two gaps are (a) closed via a follow-up walk against safely-seeded/disposable data, or (b) accepted as a dated, deliberate scope limit."
    why_human: "Requires weighing production-data safety and CRM-02's intentional access boundary against the roadmap's literal 'verified in FR and EN' / 'walked in light and dark' wording — a judgment call, not a defect to fix in code."
---

# Phase 38: Shell, Dialogs & Visual Conventions Verification Report

**Phase Goal:** The app shell, its dialogs and its spacing conventions hold in both themes and both languages — verified by the operator walk that Phase 28 and Phase 31.1 both left owing, and with the two CSS/primitive gaps that walk keeps re-surfacing actually fixed.
**Verified:** 2026-09-06T17:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

This is a goal-backward, source-grounded verification. Every claim below was checked directly
against the running repository (`grep`, `npm run typecheck`, `npm run lint:check`, `npx vitest
run`, direct file reads, `git show`) — not read off SUMMARY.md or UAT.md prose alone. Claims that
could not be independently confirmed are called out explicitly.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | `31.1-VERIFICATION.md` reads `status: passed`: dark first paint shows no light-chrome flash and the six pinned Colibris tokens; PDF surface renders white-on-`#1a2832` in dark mode | ✓ VERIFIED | `.planning/phases/31.1-app-shell-refresh/31.1-VERIFICATION.md` frontmatter reads `status: passed`, citing `38-UAT.md` CLOSE-02 checks 1–2. The underlying evidence is real, not a bookkeeping edit: `38-UAT.md` records a CPU-throttled DevTools performance trace with causal-ordering analysis (inline theme script completes 39.6–51.5ms before first Paint in both cookie-present and cookie-absent paths) plus computed-style confirmation of all six pinned tokens, and a screenshot of the PDF panel rendering white/`#1a2832` in dark theme. Evidence files exist: `evidence/caseA-*.jpg`, `evidence/caseB-*.jpg`, `evidence/close02-trace-analysis.txt`, `evidence/close02-check2_pdf-surface-dark_LC-2026-002.png` (all present on disk, `ls -la` confirmed). F-38-01 (the PDF override rule is dead CSS, matching zero live elements) was found, disclosed, and resolved in-phase per operator choice (option b: dormant-comment retention) rather than silently accepted. |
| 2 | Phase 28's browser-verification backlog is walked in light AND dark with each result recorded — wizard step 1, `/proposals`, coefficients history, `/parametres`, and the six `PartnersList`/`LcReferencesList` padding sites | ⚠️ PARTIAL | 5 of 7 enumerated surfaces (`/proposals`, coefficients, `/parametres`, partners list, create-partner form) have real `getBoundingClientRect()`/`getComputedStyle()` measurements in **both** themes, all passing. Wizard step 1 has **no dark observation at all** (not even "not observable" — the operator declined to re-enter the wizard a second time after F-38-04's disclosed write) and renders zero legacy `.btn-*` elements in light, so D-38-04's premise that "every CLOSE-08 surface renders a `.btn-out`" is false for this surface (filed as F-38-03, but not routed to REQUIREMENTS.md — see gap below). LC-references' "Charger plus" control never rendered in either theme (single-page dataset). See gaps section. |
| 3 | Every icon-only dialog close control announces an accessible name in the viewer's language — `dialog.tsx` no longer hardcodes English "Close", verified in FR and EN | ⚠️ PARTIAL | The code fix is real and substantive: `src/components/ui/dialog.tsx:83` and `src/components/ui/sheet.tsx:75` both call `t('common.close.aria', resolveDomLang())`; `common.close.aria` = `'Fermer'` (fr) / `'Close'` (en) in `src/lib/i18n/dictionaries.ts:233,1519`; `tests/dialog-close-label.test.ts` (8 assertions) and `tests/dom-lang.test.ts` (7 assertions) both pass; `npm run typecheck` and `npm run lint:check` are clean. Live browser confirmation exists only for `sheet.tsx`'s consumer (mobile sidebar): observed announcing "Fermer" in fr and "Close" in en via the accessibility tree, with `<html lang>` confirmed to flip. `dialog.tsx`'s own close control was never observed live in either language — every consumer lives under `/clients/*` (refused to admins by `requireRelationshipHolder()`/CRM-02) and the one admin-reachable consumer (`MergeDialog`) had an empty queue. Correctly recorded as "blocked, not observable" rather than a false pass, but the roadmap criterion's literal "verified in FR and EN" was not met for this primitive. See gaps section. |
| 4 | The "Charger plus" pagination control and `.btn-out` agree with the app's declared conventions (on-grid padding, standard focus treatment), or `UI-CONVENTIONS.md` records a dated exception | ✓ VERIFIED | Fix branch taken, not the exception: `app/globals.css:372-411` — `.btn-green, .btn-navy, .btn-out` now declare `padding: 0.5rem 1.5rem; line-height: 20px;` with an in-file comment recording the exact arithmetic (8+20+8=36px parity with `button.tsx`'s `default`; `.btn-out`'s extra 1px+1px border → 38px). All six `:focus-visible`/`:focus-within` selectors (`.btn-*`, `.search-bar`, `.admin-nav-card`, `.stepper-circle`) use the identical two-layer `box-shadow: 0 0 0 2px var(--ring), 0 0 0 5px color-mix(in oklab, var(--ring) 50%, transparent)` — confirmed by grep; the three remaining `rgba(45,122,140,…)` literals in `globals.css` (lines 441, 490, 509) are non-focus decorative uses (chip tint, hover shadow, code background), not focus rings. `LoadMoreButton.tsx` no longer sets any `aria-label` — the loading/idle text branches are the sole accessible name, closing the WCAG 2.5.3 mismatch. `UI-CONVENTIONS.md` gains UIC-11 (`grep -n "UIC-11"` confirms) with no exception-table entry recording `0.6rem` — D-38-13's explicit rejection of the escape hatch was honored. F-38-02 (the height math was actually wrong as first shipped — 37.7px/39.7px, not the claimed 36px/38px) was found mid-walk and fixed in the same file with the corrected comment now in place, confirmed by direct read of `app/globals.css:396-406`. |
| 5 | (Plan-level, 38-04) Every defect the walk finds is either fixed in-phase or filed as a requirement — none left as an unrouted observation | ✗ FAILED | F-38-03 and F-38-06 are recorded in `38-UAT.md` as `status: open`/"filed for a later phase" but do not exist anywhere in `.planning/REQUIREMENTS.md` (checked the CLOSE/GAP/OPS/HOUSE sections and the "Future Requirements" table; `git show 48a03b6 -- .planning/REQUIREMENTS.md` shows only the two ticks, no new rows). See gaps section. |

**Score:** 2/5 truths fully verified, 2 partially verified with disclosed-but-real coverage gaps, 1 failed.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/lib/i18n/dom-lang.ts` | `resolveDomLang()` SSR-safe lang narrowing | ✓ VERIFIED | Exists, exports `resolveDomLang`, has dedicated 7-assertion test (`tests/dom-lang.test.ts`, added during code review per WR-02), reviewer additionally verified SSR branch is structurally unreachable via Base UI portal gating — sound, not just tested |
| `src/lib/i18n/dictionaries.ts` | `common.close.aria` in FR + EN, `shell.sidebar.title/description` in FR + EN | ✓ VERIFIED | All four keys present with correct values (`Fermer`/`Close`, `Barre latérale`/`Sidebar`, `Affiche la barre latérale mobile.`/`Displays the mobile sidebar.`); `_EnHasAllFrKeys` compile check + `npm run typecheck` pass |
| `src/components/ui/dialog.tsx` | `t('common.close.aria', resolveDomLang())` replacing hardcoded "Close" | ✓ VERIFIED | Present at line 83 (icon-only close) and line 127 (`DialogFooter`'s optional close, fixed as IN-02 during code review even though out of D-38-10's original scope) |
| `src/components/ui/sheet.tsx` | Same fix | ✓ VERIFIED | Present at line 75, and live-observed rendering correctly in both languages |
| `tests/dialog-close-label.test.ts` | Pinning gate against re-import clobber | ✓ VERIFIED | 8 assertions pass; regex hardened to `>\s*Close\s*<` during code review (WR-01) so reformatted re-imports still trip it |
| `app/globals.css` | On-grid button padding + unified `var(--ring)` focus | ✓ VERIFIED | `padding: 0.5rem 1.5rem`, `line-height: 20px` (post-walk correction), six focus selectors on `var(--ring)`, zero hardcoded focus literals remain |
| `.planning/codebase/UI-CONVENTIONS.md` | UIC-11 + two re-import-table rows | ✓ VERIFIED | UIC-11 present (line 407), `dialog.tsx`/`sheet.tsx` rows present in the re-import table (lines 467-468), no `0.6rem` exception entry added |
| `.planning/phases/38-shell-dialogs-visual-conventions/evidence/` | Committed filmstrip + failure screenshots | ✓ VERIFIED | 8 files present: 5 filmstrip frames, 1 trace-analysis text file, 1 PDF-surface screenshot |
| `.planning/REQUIREMENTS.md` | Any newly-filed requirement for an out-of-scope defect (38-04 must-have) | ✗ MISSING | No entry for F-38-03 or F-38-06 exists |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `dialog.tsx` | `dictionaries.ts` | `t('common.close.aria', resolveDomLang())` | ✓ WIRED | Present, typechecked, tested |
| `sheet.tsx` | `dictionaries.ts` | same | ✓ WIRED | Present, typechecked, tested, and live-observed in both languages |
| `.btn-*:focus-visible` / `.search-bar:focus-within` | `--ring` token | `box-shadow: 0 0 0 2px var(--ring), …` | ✓ WIRED | All six selectors confirmed via grep; contrast measured live (8.52:1 / 7.84:1 / 7.12:1 against dark surfaces, vs. 1.19-1.20:1 for the retired teal) |
| `31.1-VERIFICATION.md` frontmatter | `38-UAT.md` CLOSE-02 rows | citation | ✓ WIRED | Frontmatter explicitly cites `38-UAT.md` and the evidence directory |
| `38-UAT.md` defect rows | `.planning/REQUIREMENTS.md` | filed requirement ID | ✗ NOT WIRED | F-38-03 and F-38-06 have no corresponding REQUIREMENTS.md entry |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Typecheck clean | `npm run typecheck` | exit 0, no output | ✓ PASS |
| Lint clean (CI gate: `--max-warnings=0`) | `npm run lint:check` | exit 0, no output | ✓ PASS |
| Dialog/sheet i18n pinning tests | `npx vitest run tests/dialog-close-label.test.ts tests/dark-palette.test.ts` | 14/14 passing | ✓ PASS |
| `resolveDomLang()` unit tests | `npx vitest run tests/dom-lang.test.ts` | 7/7 passing | ✓ PASS |
| No hardcoded focus-ring teal survives | `grep -n "45, *122, *140\|2d7a8c" app/globals.css` | 3 matches, all non-focus (chip tint, hover shadow, code bg) | ✓ PASS |

Full `npm run build`/`npm run start` was intentionally not run per the project's production-database
constraint; typecheck/lint/vitest are sufficient to confirm the shipped code is syntactically and
behaviorally sound. The rendering-level claims (dark first paint, PDF surface, live FR/EN
announcements) were verified by the phase's own operator-supervised browser walk, not re-run here.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| CLOSE-02 | 38-03 | Phase 31.1's two human checks performed, `31.1-VERIFICATION.md` → `passed` | ✓ SATISFIED | See Truth 1 |
| CLOSE-08 | 38-04 | Phase 28's browser-verification backlog walked light+dark | ? NEEDS HUMAN (partial) | See Truth 2 — 5/7 surfaces fully walked, 2 have real coverage gaps with legitimate but unresolved causes |
| GAP-02 | 38-01, 38-04 | Dialog close control announces accessible name in viewer's language, FR+EN | ? NEEDS HUMAN (partial) | See Truth 3 — code fix solid and tested, but `dialog.tsx`'s own consumer never live-observed |
| GAP-04 | 38-02, 38-04 | `.btn-out`/Charger-plus agree with conventions or record an exception | ✓ SATISFIED | See Truth 4 |

REQUIREMENTS.md's own checkboxes and traceability table mark all four as `[x]`/"Complete" — this
verification confirms CLOSE-02 and GAP-04 are genuinely complete, but disputes that CLOSE-08 and
GAP-02 are unconditionally complete; both carry real, disclosed coverage gaps that the ledger's
`[x]` does not reflect.

No orphaned requirements: `.planning/REQUIREMENTS.md`'s traceability table maps exactly these four
IDs (CLOSE-02, CLOSE-08, GAP-02, GAP-04) to Phase 38, matching the four IDs declared across the
plans' `requirements:` frontmatter.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| — | — | No `TBD`/`FIXME`/`XXX` debt markers in any of the 9 files this phase touched (the one `XXX` hit in `dictionaries.ts` is a French PDF placeholder string `LC-2026-XXX`, not a code marker) | — | none |
| `38-UAT.md` | 45 vs. 425-440 | Internal inconsistency: the "Environment" block states `mode: read-only … nothing created/edited/deleted`, while F-38-04 (further down the same document) discloses that navigating to the wizard created a persisted draft (`LC-2026-003`) and consumed a sequential reference | ℹ️ Info | The write itself IS disclosed prominently (F-38-04's own section, plus the summary counts), so this is a documentation contradiction within one file rather than a hidden write — see "Verification of specific claims" below |

No stub patterns, empty handlers, or hollow-prop patterns found in the touched files. Code review
(`38-REVIEW.md`) independently found 2 warnings + 3 info items, all resolved in-phase per its own
"Resolution" section, confirmed here by re-reading `dom-lang.ts` (guard comment unchanged, as
accepted per IN-01), `dialog.tsx` (`DialogFooter`'s close now uses the same i18n key, per IN-02),
and `dark-palette.test.ts` (docblock corrected, per IN-03).

### Verification of Specific Claims (per task instructions)

1. **Criterion 2's "not observable" disclosure (F-38-03, F-38-04, F-38-06).** The disclosure is
   honest — it did not paper over the gap, it named the exact mechanism (dead component, empty
   dataset, a disclosed write) and stopped at "not observable" rather than fabricating a pass. But
   honesty is not the same as coverage: wizard step 1 has zero dark-theme observation of any kind
   (not "not observable in dark" — simply never attempted), and the LC-references/Partners
   "Charger plus" control was never rendered or measured in either theme anywhere in the walk. I
   judge criterion 2 **not fully met** — recorded as a gap above, not accepted as satisfied by the
   disclosure alone.

2. **Criterion 3's "verified in FR and EN."** Confirmed: only the sheet was observed in both
   languages; `dialog.tsx` consumers were genuinely unreachable (CRM-02 access refusal +
   empty reconciliation queue), not skipped by choice. The operator approved treating this as
   "blocked, not observable" rather than a pass — that labelling is accurate and was not inflated
   into a false pass anywhere in `38-UAT.md` or `REQUIREMENTS.md`. Still, the roadmap's literal
   text was not met for `dialog.tsx` itself. I judge criterion 3 **not fully met**, recorded as a
   gap above, with the mitigating evidence (byte-identical code, passing pinning test, sheet
   observation of the same call path) noted as real but insufficient to substitute for a direct
   observation.

3. **F-38-02's fix (`line-height: 20px`) is real and the arithmetic holds.** Confirmed by direct
   read of `app/globals.css:372-406`: `padding: 0.5rem 1.5rem` (8px) + `line-height: 20px` = 36px
   content-box height for `.btn-green`/`.btn-navy`, matching `button.tsx`'s `default` (h-9/36px).
   `.btn-out` adds its `border: 1px solid var(--border)` (1px top + 1px bottom) → 38px, matching
   A-38-02's expected ~2px delta. The in-file comment records the same arithmetic and explicitly
   states the pre-fix values (37.7px/39.7px) that `38-02-SUMMARY.md` had wrongly claimed were
   already 36px/38px. This is a genuine in-phase correction of a false SUMMARY claim, not a
   restated assumption — verified independently here by reading the CSS, not by trusting the UAT
   narrative.

4. **Criterion 4's escape hatch was not taken; UIC-11 exists.** Confirmed: `.planning/codebase/
   UI-CONVENTIONS.md` contains UIC-11 (line 407) with the exact `var(--ring)` two-layer rule, and
   there is no exception-table entry anywhere in the file recording `0.6rem` as a ratified
   deviation. `app/globals.css` shows `0.5rem`, not `0.6rem`, confirming the fix branch (not the
   exception branch) was actually implemented, matching D-38-13's explicit instruction.

5. **The disclosed write (draft LC-2026-003) is disclosed, not hidden.** Confirmed: F-38-04 is a
   full, dedicated section in `38-UAT.md` naming the draft ID, its `lc_ref`, timestamps, and the
   operator's decision to leave it rather than perform a second unapproved write. It is also
   summarized in the "Findings raised" count at the top of the Summary section. The only wrinkle
   (noted above as an Info-level anti-pattern) is that the "Environment" block's blanket "read-only
   … nothing created/edited/deleted" line was written before this finding and was never corrected
   to reflect it — a documentation inconsistency, not a concealment, since the very next major
   section spells the write out in full detail with exact IDs and timestamps.

### Human Verification Required

See `human_verification` in the frontmatter above — two items:
1. Whether F-38-03/F-38-06 need a formal REQUIREMENTS.md entry before phase close, or whether the
   operator accepts the UAT-only record as sufficient.
2. Whether the two partial-coverage gaps (wizard-step-1 dark pass; `dialog.tsx` FR/EN live
   observation) need follow-up walks against safely-seeded data, or should be accepted as a dated,
   deliberate scope limit.

### Gaps Summary

The phase's actual code changes are solid: the dialog/sheet i18n fix, the button height/line-height
correction, and the focus-ring retirement to `var(--ring)` are all real, tested, typechecked,
lint-clean, and reviewed with all findings resolved. `31.1-VERIFICATION.md` legitimately reads
`status: passed` on genuine runtime evidence (not a bookkeeping edit), and GAP-04's escape hatch was
correctly declined per D-38-13.

The gaps are about **verification completeness**, not code defects: (1) two findings the walk itself
raised (F-38-03, F-38-06) were never routed into the project's requirement ledger despite the
plan's own must-have requiring that, and (2) two of the roadmap's four success criteria — the
CLOSE-08 backlog walk and GAP-02's FR/EN verification — were each only partially covered, for
reasons that are legitimate (a destructive-write hazard in the wizard; an intentional access-control
boundary plus empty test data) but real. All three gaps are disclosed honestly in `38-UAT.md`
itself; none was hidden or misrepresented as a pass. They are recorded here as gaps rather than
accepted on the strength of the disclosure, per this verification's mandate not to let a
well-written disclosure substitute for coverage.

---

_Verified: 2026-09-06T17:00:00Z_
_Verifier: Claude (gsd-verifier)_

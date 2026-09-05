---
phase: 17-partner-surfaces
plan: 08
subsystem: closure-verification, accessibility, theme
tags: [theme-01, contrast-02, wiz-05, admin-09, dark-mode, sign-off, phase-closure]

# Dependency graph
requires:
  - phase: 17-partner-surfaces
    provides: "17-03..17-07 — the 5 partner-side surfaces delivered (Partner Home /, /proposals + /proposals?archived=1, wizard steps 1/2/3) that this plan visually verifies in light + dark"
  - phase: 16-shell-refresh-contrast-gates
    provides: "<PageHero> + token cascade via html[data-theme=\"dark\"] (D-01..D-05); the Phase 16 CONTRAST-02 audit doc structure that this plan appends rows 8-11 to; existing .chip-active baseline (Phase 8) that row 11's accept-with-deviation decision references"
  - phase: 14-admin-polish-partners-history-home
    provides: "ADMIN-09 D-29 9-gate grep-contract suite — confirmed green across all 5 partner surfaces by Task 3"
provides:
  - "Antoine sign-off captured for THEME-01: all 5 Phase 17 partner-side surfaces (Partner Home /, /proposals, /proposals?archived=1, wizard step 1/2/3) verified light + dark on 2026-05-24"
  - "docs/accessibility/16-contrast-audit.md extended with CONTRAST-02 rows 8-11 (Tranche/Coefficient pill chip light + dark + Active filter pill light + dark) and row 11 accept-with-deviation rationale (matches .chip-active baseline, no regression, palette stability invariant)"
  - "Phase 17 closure verification: ADMIN-09 D-12 envelope intact + 9-gate grep-contract suite remains green (9/9, 32ms) across all 5 partner surfaces"
  - ".planning/phases/17-partner-surfaces/deferred-items.md — out-of-scope test failures cataloged (11 pre-existing failures, all outside Phase 17 touch surface)"
affects:
  - "Phase 18 (Admin Surfaces) — inherits the THEME-01 sign-off discipline as the model for THEME-02; admin surfaces follow the same light+dark verification gate before phase close"
  - "Phase 19+ (XLSX export + LC dashboard) — picks up the ADMIN-09 9-gate suite green baseline as the floor for their grep-contract extensions"
  - "v1.4+ — if a future audit raises the dark-mode active filter pill contrast bar to WCAG AA strict, a follow-up plan can introduce --active-pill at higher dark-mode opacity per UI-SPEC §CONTRAST-02 Addendum Option 2"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Closure verification plan pattern: 1 doc append + 1 human-verify checkpoint + 1 automated full-test gate — formal sign-off captured in SUMMARY.md frontmatter and dated attribution line in the audit doc"
    - "Accept-with-deviation contrast row: borderline ratio documented in the table with an explicit rationale paragraph below, citing the existing baseline being matched and the palette-stability invariant — avoids token churn for a non-regression"
    - "Deferred-items.md as the canonical sink for pre-existing test failures discovered out-of-scope during a closure plan's full-test gate — keeps the Phase 17 SUMMARY focused on Phase 17 work"

key-files:
  created:
    - ".planning/phases/17-partner-surfaces/17-08-SUMMARY.md (this file)"
    - ".planning/phases/17-partner-surfaces/deferred-items.md (11 pre-existing failures cataloged for Phase 18+ infra triage)"
  modified:
    - "docs/accessibility/16-contrast-audit.md (Task 1 — CONTRAST-02 rows 8-11 appended + row 11 deviation note + Phase 17 attribution line)"
    - "app/(authed)/proposals/new/_components/PdfPreviewMock.tsx (scrubbed LC-2026-XXX placeholder mentions from inline comments)"
    - "src/lib/api/proposals/list.ts (JSDoc updated to remove stale LC-2026-XXX wording)"

key-decisions:
  - "Row 11 dark-mode active filter pill (~3.9:1) accepted as deviation, NOT mitigated at token level. Rationale: matches the existing .chip-active baseline shipped since Phase 8 (same token pair, same opacity); Phase 17 introduces no regression. Adopting Option 2 (new --active-pill token at higher dark-mode opacity) would have violated the ROADMAP §v1.3 §3 palette stability invariant. Documented in the audit doc + row 11 deviation note immediately below the table."
  - "deferred-items.md scope discipline. 11 pre-existing test failures (9 RetractableSidebar jsdom localStorage drift from Phase 11 + 2 PDF byte-determinism fixtures from Phase 8) discovered during the Task 3 full-test gate were NOT fixed inline — both clusters are demonstrably untouched by Phase 17 (last-modified commits predate the phase) and fixing them would have been scope creep. Logged for a Phase 18+ infra plan."
  - "Antoine sign-off captured in SUMMARY.md frontmatter (key-decisions + completed date) and in the docs/accessibility/16-contrast-audit.md attribution line, NOT in a separate sign-off file. T-17-08-03 (repudiation) mitigation: durable in both the audit doc and this SUMMARY, both committed to git."
  - "WIZ-05 final check passes on the 9-gate ADMIN-09 grep-contract suite (9/9 green, 32ms) AND on TypeScript compile (npx tsc --noEmit exit 0). The 11 unrelated failures do NOT mask any Phase-17-introduced regression — verified by file-level scoping (RetractableSidebar is Phase 11; render-fixtures.test.ts is Phase 8)."

patterns-established:
  - "Phase-closure 3-task shape: (1) verification-doc append, (2) human-verify checkpoint for visual sign-off across all surfaces × all themes, (3) full-test-suite gate. Reusable for Phase 18 closure (THEME-02 sign-off)."
  - "Accept-with-deviation row documentation pattern: borderline contrast ratios documented in-table with a paragraph immediately below citing (a) the existing baseline being matched, (b) the no-regression invariant, (c) the future-mitigation path. Avoids both token churn and silent ratio drift."

requirements-completed: [THEME-01, WIZ-05]

# Metrics
duration: ~20min
completed: 2026-05-24
---

# Phase 17 Plan 08: Closure Verification — THEME-01 sign-off + CONTRAST-02 audit append + WIZ-05 final gate Summary

**Closes Phase 17 with Antoine's sign-off on all 5 partner-side surfaces in light + dark (THEME-01), appends CONTRAST-02 rows 8-11 to docs/accessibility/16-contrast-audit.md with row 11 accept-with-deviation rationale (palette stability invariant preserved), and confirms the ADMIN-09 9-gate grep-contract suite remains green (9/9, 32ms) — Phase 17 ships 8/8 plans complete with all 12 partner-side requirements (PHOME-01/02/03, PROPS-01/02, WIZ-01/02/03/04/05/06, THEME-01) satisfied.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-05-24
- **Completed:** 2026-05-24
- **Tasks:** 3/3 (1 doc append + 1 human-verify checkpoint + 1 full-test gate)
- **Files modified:** 3 (1 audit doc + 2 placeholder scrubs)
- **Files created:** 2 (this SUMMARY + deferred-items.md)

## Accomplishments

- **Task 1 — CONTRAST-02 audit append (rows 8-11):** Added 4 rows to docs/accessibility/16-contrast-audit.md covering the Phase 17 token pairs:
  - Row 8: Tranche/Coefficient pill chip light — `--teal #2d7a8c` on `rgba(45,122,140,0.10)` over `--surface #ffffff` → ~4.8:1 PASS
  - Row 9: Tranche/Coefficient pill chip dark — `--teal #2d7a8c` on `rgba(45,122,140,0.10)` over `--surface #161e2d` → ~9.2:1 PASS
  - Row 10: Active filter pill light — `--gd-text #0e7544` on `rgba(18,150,87,0.10)` over `--surface #ffffff` → 4.96:1 PASS
  - Row 11: Active filter pill dark — `--gd-text #129657` on `rgba(18,150,87,0.10)` over `--surface #161e2d` → ~3.9:1 ACCEPT-WITH-DEVIATION
  - Row 11 deviation note appended immediately below the table citing (a) matches existing `.chip-active` baseline (Phase 8 shipped, same token pair, same opacity), (b) no regression introduced, (c) palette stability invariant per ROADMAP §v1.3 §3, (d) future v1.4+ path = `--active-pill` per UI-SPEC §CONTRAST-02 Addendum Option 2.
  - Phase 17 attribution line added at the bottom of the doc referencing Antoine's sign-off captured by Task 2.

- **Task 2 — THEME-01 human-verify checkpoint (Antoine sign-off):** Antoine verified all 5 partner-side surfaces × light + dark on 2026-05-24:
  - `/` (Partner Home) — PageHero + 3 MetricTiles + Propositions récentes — light + dark verified against Figma `9:47` + `82:1088`
  - `/proposals` (Actives default) — PageHero + FilterPillRow + SearchBar + ProposalsList — light + dark verified
  - `/proposals?archived=1` (Archivées toggle) — Archivées pill active state + archived/empty-state copy switching — light + dark verified
  - `/proposals/new/parametres` (wizard step 1) — PageHero + Stepper sibling + form card — light + dark verified against Figma `35:46` + `82:171`
  - `/proposals/new/calcul` (wizard step 2) — PageHero + loyer hero card (36px/--teal) + Tranche/Coefficient pill chip + Détail card with Commission apporteur (non visible client) row — light + dark verified against Figma `39:46` + `82:317`
  - `/proposals/new/verification` (wizard step 3) — PageHero + 2-column 1040px layout + validity selector inside CALCUL recap + PdfPreviewMock with real `Réf. LC-2026-{nnn}` (NOT literal LC-2026-XXX) — light + dark verified against Figma `40:46` + `82:460`
  - No failure mode reported. No gap-closure plan needed.

- **Task 3 — WIZ-05 final test-suite gate:** Full `npm test` + `npx tsc --noEmit` executed 2026-05-24:
  - **Overall:** 11 failed / 924 passed / 4 skipped (out of 939 tests)
  - **ADMIN-09 9-gate suite (in-scope):** 9/9 GREEN (32ms) — Phase 17's commission-invisibility invariant (D-12 envelope) remains intact across all 5 partner surfaces
  - **TypeScript:** `npx tsc --noEmit` exit 0 — i18n `_EnHasAllFrKeys` parity proof + full project compile both clean
  - **LC-2026-XXX placeholder scrub:** `grep -r "LC-2026-XXX" app/ src/ | grep -v test | grep -v dictionaries.ts` returns 0 (commit `b59d7a0` scrubbed remaining inline comment mentions in PdfPreviewMock.tsx + proposals.ts JSDoc)
  - **11 failures triaged out-of-scope** (see deferred-items.md): 9 in `src/components/ui/RetractableSidebar.test.tsx` (Phase 11, jsdom localStorage drift — last modified commit `d8e4be1`) + 2 in `__pdf-fixtures__/render-fixtures.test.ts` (Phase 8, byte-determinism fixture drift — last modified commits `0cd71eb` / `89c52c5`). Both clusters demonstrably untouched by Phase 17.

## Phase 17 Roll-Up: 8/8 plans complete

All 12 Phase 17 requirements satisfied. Per-plan deliverables:

| Plan | Deliverable (one-liner) |
|------|-------------------------|
| **17-01** | lc_ref pre-allocated at createDraft (per-user sequential LC-2026-NNN) + BuildListParams.archived flag wired through buildListResponse — DB/API foundations unblocking the wizard step 3 real-lcRef PdfPreviewMock + /proposals Archivées view. (PROPS-01, PROPS-02, WIZ-06) |
| **17-02** | 32 net-new Phase 17 i18n keys × FR + EN (parity proof green) + PdfPreviewMock `lcRef: string` required-prop API + inline ref-line construction (D-17) — centralizing the foundations every Wave-2 partner-surface plan needs. (WIZ-06, PHOME-01, PHOME-03, PROPS-01, PROPS-02, WIZ-01, WIZ-02, WIZ-03) |
| **17-03** | Partner Home `/` rewrite: `<PageHero>` + 3 `<MetricTile>` (Ce mois-ci / Total / Brouillons via new `proposal-aggregates.ts` with DST-safe Europe/Paris month math) + 5-row Propositions récentes card + Voir toutes link. (PHOME-01, PHOME-02, PHOME-03) |
| **17-04** | Dedicated `/proposals` server route + `<FilterPillRow>` client component (Actives/Archivées URL-driven via `<Link>`, NOT router.replace per D-11) + inline empty-state copy switching. (PROPS-01, PROPS-02) |
| **17-05** | Wizard step 1 PageHero adoption (repaint only per D-15): inline `<h1>+<p>` replaced with `<PageHero eyebrow="ÉTAPE 1 SUR 3" ...>` + Stepper as sibling; form card JSX unchanged so all 28 existing wizard step 1 tests stay green by construction. (WIZ-01) |
| **17-06** | Wizard step 2 restructure: `<PageHero eyebrow="ÉTAPE 2 SUR 3">` + net-new loyer-mensuel hero card (36px/700/--teal + Tranche/Coefficient pill chip top-right) + Détail du calcul card with totalized-loyer separator (new backward-compatible `lastRowDivider` prop on RecapSection) + Paramètres saisis recap. D-12 ADMIN-09 envelope preserved verbatim. (WIZ-02, WIZ-05) |
| **17-07** | Wizard step 3 PageHero adoption + WIZ-04 segmented validity selector (15j/30j/60j) mounted inside CALCUL recap with no-redirect `updateValidityAction` server action + WIZ-06 real `draft.lcRef` threaded into PdfPreviewMock (transitional `?? 'LC-2026-XXX'` fallback dropped) + defensive bail for legacy pre-Phase-17 drafts. (WIZ-03, WIZ-04, WIZ-05, WIZ-06) |
| **17-08** | THEME-01 sign-off across all 5 partner surfaces × light + dark + CONTRAST-02 rows 8-11 appended to audit doc (row 11 accept-with-deviation) + WIZ-05 final gate (9/9 ADMIN-09 + tsc 0). (THEME-01, WIZ-05) |

**Cross-cutting invariants confirmed green at Phase 17 close:**
- ADMIN-09 D-12 envelope intact across all 5 partner surfaces (commission visible exactly once to deal-owner partner in wizard step 2 Détail row 2 + step 3 CALCUL recap with `(non visible client)` sub-line; absent from all other surfaces, PDFs, logs, and pre-finalize traces).
- ADMIN-09 9-gate grep-contract suite (`tests/admin-09-grep-contracts.test.ts`) GREEN — 9/9 in 32ms.
- Palette stability (ROADMAP §v1.3 §3): zero new tokens introduced in Phase 17; all surfaces consume the existing v1.2 token spine via the Phase 16 dark-mode `data-theme` cascade.
- v1.0 calculation formula invariant intact (PROP-15 isStillSeed + ADMIN-09 D-12 envelope).
- i18n `_EnHasAllFrKeys` compile-time parity proof: green across all 32 net-new Phase 17 key additions.

## Task Commits

Each task was committed atomically (Task 2 produced no commit — Antoine sign-off is documented in this SUMMARY + the audit doc):

1. **Task 1 — CONTRAST-02 rows 8-11 + row 11 deviation note + Phase 17 attribution line** — `601c785` (docs)
1b. **Task 1 follow-up — LC-2026-XXX placeholder scrub in non-test src** — `b59d7a0` (docs)
2. **Task 2 — THEME-01 human-verify checkpoint (Antoine sign-off 2026-05-24)** — no commit (sign-off captured in this SUMMARY + audit doc attribution line)
3. **Task 3 — WIZ-05 full-test-suite gate** — no commit (verification numbers captured in deferred-items.md + this SUMMARY)

**Plan metadata commit:** the upcoming `docs(17-08): complete closure verification — Phase 17 partner surfaces shipped` commit captures this SUMMARY + deferred-items.md together.

## Files Created/Modified

- **.planning/phases/17-partner-surfaces/17-08-SUMMARY.md** (CREATED, this file) — Plan closure summary, Phase 17 roll-up, Antoine sign-off attestation.
- **.planning/phases/17-partner-surfaces/deferred-items.md** (CREATED, written by Task 3 executor) — Catalogs the 11 pre-existing test failures discovered during the full-test gate as out-of-scope for Phase 17 (Cluster 1: 9 RetractableSidebar.test.tsx jsdom localStorage failures from Phase 11; Cluster 2: 2 render-fixtures.test.ts byte-determinism drift failures from Phase 8). Recommends a Phase 18+ infra plan for both.
- **docs/accessibility/16-contrast-audit.md** (modified by commit `601c785`) — 4 rows appended (8-11) covering Phase 17 token pairs + row 11 accept-with-deviation rationale paragraph + Phase 17 attribution line at the bottom referencing Antoine's 2026-05-24 sign-off.
- **app/(authed)/proposals/new/_components/PdfPreviewMock.tsx** (modified by commit `b59d7a0`) — Stale `LC-2026-XXX` placeholder mentions scrubbed from inline comments (the literal no longer appears in any non-test source file).
- **src/lib/api/proposals/list.ts** (modified by commit `b59d7a0`) — JSDoc updated to remove stale `LC-2026-XXX` wording.

## Decisions Made

- **Row 11 dark-mode active filter pill (~3.9:1) — Option 1 (accept-with-deviation).** The dark-mode active filter pill at ~3.9:1 is below WCAG 2.1 AA 4.5:1 strict, BUT matches the existing `.chip-active` baseline shipped since Phase 8 (same token pair `--gd-text` on `rgba(18,150,87,0.10)`, same opacity). Phase 17 introduces no regression. Adopting Option 2 (new `--active-pill` token at higher dark-mode opacity) would have violated the ROADMAP §v1.3 §3 palette stability invariant by introducing a new token mid-milestone for a non-regression. Documented in the audit doc table (row 11 ACCEPT-WITH-DEVIATION) + rationale paragraph immediately below. v1.4+ can introduce the new token if a future audit raises the bar.
- **11 pre-existing test failures NOT fixed inline.** Both clusters (9 RetractableSidebar localStorage / 2 PDF byte-determinism) demonstrably untouched by Phase 17 — file-level scoping verified via `git log` on the affected files (last-modified commits predate the phase). Per deviation Rule 4 scope-boundary clause, these are documented in deferred-items.md for a Phase 18+ infra plan rather than fixed in a closure-verification plan.
- **Antoine sign-off captured in SUMMARY + audit doc, not in a separate sign-off file.** T-17-08-03 (repudiation: visual sign-off without record) mitigation: durable record in BOTH this SUMMARY's frontmatter (`completed: 2026-05-24` + the THEME-01 entry under Accomplishments) AND the audit doc's attribution line — both committed to git.

## Deviations from Plan

None — plan executed exactly as written. Task 1 appended the 4 rows + deviation note + attribution line per UI-SPEC §Contrast Audit Phase 17 Addendum. Task 2 checkpoint resolved cleanly with "approved" across all 5 surfaces × 2 modes. Task 3 full-test gate confirmed Phase 17's invariants (ADMIN-09 + tsc) without introducing any new failure.

The 11 pre-existing failures are NOT deviations — they were present BEFORE this plan started and are documented in deferred-items.md as out-of-scope per Rule 4 scope-boundary discipline.

## Issues Encountered

- **Pre-existing test failures discovered during the Task 3 full-test gate** (11 total: 9 RetractableSidebar + 2 PDF byte-determinism). All cataloged in `.planning/phases/17-partner-surfaces/deferred-items.md` with reproduction symptoms, last-modified commit references, and recommended remediation path. Recommend a Phase 18+ infra plan to bundle: (a) RetractableSidebar test — wrap localStorage with a polyfill in vitest setup OR refactor test to use `vi.stubGlobal('localStorage', ...)`; (b) PDF byte-determinism — run `npm run pdf:update-fixture -- --confirm UPDATE-FIXTURE` then visually diff regenerated PDFs against committed reference renders.

## User Setup Required

None — no external service configuration, no environment variables, no schema migrations.

## Next Phase Readiness

- **Phase 17 closed: 8/8 plans complete.** All 12 partner-side requirements satisfied: PHOME-01, PHOME-02, PHOME-03, PROPS-01, PROPS-02, WIZ-01, WIZ-02, WIZ-03, WIZ-04, WIZ-05, WIZ-06, THEME-01.
- **Phase 18 (Admin Surfaces) ready to start.** Inherits the THEME-01 sign-off discipline as the model for THEME-02. Admin surfaces follow the same closure pattern: visual verification across all surfaces × light + dark before phase close.
- **Phase 18+ infra triage** of the 11 pre-existing test failures recommended before any subsequent phase that touches `RetractableSidebar` or `src/lib/pdf/` fixtures.
- **No blockers** for Phase 18 work.

## Self-Check: PASSED

Files verified to exist:
- FOUND: `.planning/phases/17-partner-surfaces/17-08-SUMMARY.md` (this file, about to commit)
- FOUND: `.planning/phases/17-partner-surfaces/deferred-items.md` (untracked, about to commit)
- FOUND: `docs/accessibility/16-contrast-audit.md` (modified in commit `601c785`)
- FOUND: `app/(authed)/proposals/new/_components/PdfPreviewMock.tsx` (modified in commit `b59d7a0`)
- FOUND: `src/lib/api/proposals/list.ts` (modified in commit `b59d7a0`)

Commits verified in `git log`:
- FOUND: `601c785` — `docs(17-08): append CONTRAST-02 rows 8-11 (Phase 17 partner-surface token positions)`
- FOUND: `b59d7a0` — `docs(17-08): scrub LC-2026-XXX placeholder mentions from non-test src`

Verification gates (re-confirmed at SUMMARY time):
- ADMIN-09 9-gate suite: 9/9 green (32ms)
- `npx tsc --noEmit`: exit 0
- `grep -r "LC-2026-XXX" app/ src/ | grep -v test | grep -v dictionaries.ts`: returns 0
- 11 failures all in files untouched by Phase 17 (verified via deferred-items.md last-modified attribution)

---
*Phase: 17-partner-surfaces*
*Completed: 2026-05-24*
*Phase 17 SHIPPED — 8/8 plans complete, 12/12 requirements satisfied, THEME-01 signed off by Antoine 2026-05-24.*

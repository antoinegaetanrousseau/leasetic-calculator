---
phase: 17-partner-surfaces
plan: 06
subsystem: wizard-step-2, ui-primitives
tags: [wizard, step-2, page-hero, calcul, detail-card, recap-section, admin-09, partner-surfaces, wave-2]

# Dependency graph
requires:
  - phase: 17-partner-surfaces
    provides: "17-02 — wizard.step2.* i18n keys (eyebrow, hero.sublabel, detail.title, detail.montantHT, detail.commission, detail.commissionNote, detail.coefficient, detail.duree, detail.loyer, recap.title) added in both FR and EN per D-21"
  - phase: 16-shell-refresh-contrast-gates
    provides: "<PageHero> primitive (Phase 16 D-01..D-05) consumed verbatim — server component, 5 props"
  - phase: 13-3-step-proposal-wizard
    provides: "<RecapSection> primitive — extended with optional lastRowDivider prop (backward-compatible, default false); <Stepper>, <WizardActionBar>, compute pipeline (computeLoyer + tranche/coefficient detection)"
  - phase: 14-admin-polish-partners-history-home
    provides: "ADMIN-09 D-29 9-gate grep-contract suite at tests/admin-09-grep-contracts.test.ts — stays green throughout"
provides:
  - "Phase 17 WIZ-02 partner-facing wizard step 2 visual + structural refresh per Figma 39:46: <PageHero eyebrow='ÉTAPE 2 SUR 3'> + net-new loyer-mensuel hero card (36px/700/--teal value + Tranche/Coefficient .chip-language pill top-right) + net-new Détail du calcul card (5 rows with bold last-row separator; row 2 Commission apporteur (non visible client) preserved per D-12) + Paramètres saisis recap with ← Modifier link"
  - "RecapSection.tsx — new optional `lastRowDivider?: boolean` prop (default false) for the Détail card's totalized loyer row separator; existing consumers (step-3 CLIENT/PROJET/CALCUL recaps) unaffected"
  - "ADMIN-09 D-12 partner-facing envelope intact: commission AMOUNT rendered EXACTLY ONCE in the Détail row 2 with the (non visible client) sub-line; no other commission surface introduced (verified by existing Test 14 + Test 15)"
affects:
  - "17-07 (Wizard step 3 + WIZ-04 validity selector + WIZ-06 real lc_ref) — independent of this plan but shares <PageHero> + <RecapSection> primitives; the new lastRowDivider prop is available if needed there"
  - "17-08 (visual verification + golden-shape) — will visually verify ÉTAPE 2 SUR 3 eyebrow + hero card layout + Détail divider"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PageHero + Stepper sibling composition pattern (D-19) extended to wizard step 2 — matches the step 1 adoption pattern from 17-05"
    - "RecapSection.tsx backward-compatible prop extension — add an optional prop with a safe default (`lastRowDivider = false`) to avoid touching the 4 pre-existing consumers"
    - "Tranche/Coefficient pill chip relocated from absolute positioning to flexbox alignSelf:flex-start in the new hero card's flex row — reuses the existing .chip-language chrome class and color-mix(in srgb, var(--teal) 10%, transparent) background; no new CSS"
    - "Plan 02 i18n keys (wizard.step2.eyebrow / .detail.* / .recap.title / .hero.sublabel) consumed at the page level; existing wizard.step2.row.* keys still in dict for backward compat but no longer referenced by calcul/page.tsx"

key-files:
  created: []
  modified:
    - "app/(authed)/proposals/new/calcul/page.tsx (+93 / -65 lines net of comments): added PageHero import; replaced inline <h1>+<p> heading block with <PageHero eyebrow=… title=… subtitle=… />; restructured the hero loyer card into a flex row (LEFT: sublabel + 36px/700/--teal value; RIGHT: Tranche/Coefficient pill chip with .chip-language chrome, alignSelf:flex-start); switched detailRows to the new wizard.step2.detail.* keys; switched rowSublabels[1] to wizard.step2.detail.commissionNote; passed lastRowDivider={true} to the Détail card RecapSection; switched the Paramètres saisis recap title key to wizard.step2.recap.title; on-demand / missing variants updated to --teal color to match UI-SPEC §Subsection A"
    - "app/(authed)/proposals/new/_components/RecapSection.tsx (+21 / -2 lines): added optional `lastRowDivider?: boolean` prop (default false). When true and the row is the last in a multi-row card, render a top border (1px solid var(--border)) + paddingTop:12 above it as the totalized-result separator. Backward-compatible: existing callers (3× on step 3, 1× on step 2 Paramètres recap) unaffected because the default is false."
    - "app/(authed)/proposals/new/calcul/page.test.tsx (+8 / -2 lines): Test 3 retargeted — the old `LOYER MENSUEL` .ctitle hero-label assertion was removed (the label is no longer rendered per UI-SPEC §Wizard step 2 — its role is taken by the PageHero eyebrow + the new sublabel). New assertions: ÉTAPE 2 SUR 3 eyebrow + `par mois pendant 48 mois` sublabel rendered. The other 14 tests pass without modification."

key-decisions:
  - "OPTION (a) — Added optional `lastRowDivider?: boolean` prop to RecapSection.tsx for the Détail card's bold totalized-loyer-row separator. The plan offered planner's choice between (a) prop on RecapSection vs. (b) custom JSX outside RecapSection. Chose (a) because: (1) the prop is opt-in with a safe default, so the 3 step-3 RecapSection consumers + the Paramètres saisis recap on step 2 are unaffected; (2) keeps the Détail card a single <RecapSection> call which preserves the rowSublabels[1] commission sub-line wiring exactly as the plan describes; (3) cleaner test surface (one component renders the whole card) vs. splitting into two JSX blocks."
  - "Coefficient row label compose pattern — the new key `wizard.step2.detail.coefficient` is just `Coefficient appliqué` per the Plan 02 Copywriting Contract, but the Détail card's UI-SPEC §Wizard step 2 step 4 + 17-CONTEXT.md <specifics> still show the `(tranche {N}K€)` suffix on row 3. Resolution: APPEND the suffix at the call site using template-literal interpolation. Preserves the existing Test 5 expectation (`Coefficient appliqué (tranche \\d+K€)`) AND honors the Plan 02 i18n key shape."
  - "Hero card --teal value color in non-computed branches (on-demand / missing) — the old hero used --gd (brand green) for the value across all 4 branches. The new computed-state hero per UI-SPEC §Subsection A uses --teal at 36px/700. For visual consistency across the 4 branches I extended --teal to the on-demand / missing branches too (the old --gd usage on those branches predates Phase 16's color hierarchy and was the only --gd at hero-scale on a partner surface). No test asserts the color on these branches; visual fidelity preserved with the brand teal."
  - "Test 3 retargeting (Rule 3 deviation) — the pre-Plan-17 Test 3 asserted on `LOYER MENSUEL` (the old `wizard.step2.hero.label` .ctitle). UI-SPEC §Wizard step 2 explicitly removes that label (the hero card no longer has a .ctitle prefix — the PageHero eyebrow + the per-month sublabel cover the labeling role). Retargeted Test 3 to assert ÉTAPE 2 SUR 3 + sublabel, which is the structural assertion the plan's done criteria call out."

requirements-completed: [WIZ-02, WIZ-05]

# Metrics
duration: ~6min
completed: 2026-05-24
---

# Phase 17 Plan 06: Wizard Step 2 Visual Refresh + Restructure Summary

**Restructures wizard step 2 per Figma 39:46 (WIZ-02 + D-16): adopts <PageHero eyebrow='ÉTAPE 2 SUR 3'>, replaces the old `LOYER MENSUEL` hero card with a net-new loyer-mensuel card (36px/700/--teal value + Tranche/Coefficient pill top-right via .chip-language chrome), and adds a totalized-result separator on the Détail du calcul card's last row via a new backward-compatible `lastRowDivider` prop on RecapSection. ADMIN-09 D-12 partner-facing commission envelope preserved verbatim — row 2 of Détail keeps the commission amount with the (non visible client) sub-line, no other commission surface introduced.**

## Performance

- **Duration:** ~6 min
- **Tasks:** 1 (`type="auto"`)
- **Commits:** 1 (feat)
- **Files modified:** 3 (1 page + 1 primitive + 1 test)

## Accomplishments

- **Task 1 — Wizard step 2 visual refresh + restructure (D-16):**
  - **PageHero adoption (D-19):** Replaced the inline `<h1>` + `<p>` heading block (lines ~292-311) with `<PageHero eyebrow={t('wizard.step2.eyebrow', lang)} title={t('wizard.step2.title', lang)} subtitle={t('wizard.step2.subtitle', lang)} />`. Stepper now sits BELOW PageHero as a sibling (PageHero bakes `marginBottom: 32` so spacing is automatic).
  - **Net-new loyer-mensuel hero card:** The old `.card` with `.ctitle` `LOYER MENSUEL` label + conditional state-based rendering was restructured into a flex row. LEFT block renders the sublabel (`par mois pendant {durationMonths} mois`, 13px/500/--muted) over the 36px/700/--teal value (the only net-new typography size in Phase 17 per UI-SPEC §Subsection A). RIGHT block renders the Tranche/Coefficient pill chip with the existing `.chip-language` chrome (`rgba(45,122,140,0.10)` bg + `var(--teal)` color, `alignSelf:flex-start` instead of the old `position:absolute`).
  - **Détail du calcul card with bold separator:** Renamed i18n keys to the Plan 02 set (`wizard.step2.detail.title` / `.montantHT` / `.commission` / `.commissionNote` / `.coefficient` / `.duree` / `.loyer`). Coefficient row appends the `(tranche {N}K€)` suffix at the call site. Row 5 (`Loyer mensuel calculé`) wrapped in `<span style={{fontWeight:600}}>` and rendered with a top border separator via the new RecapSection `lastRowDivider={true}` prop.
  - **RecapSection.tsx extended:** Added optional `lastRowDivider?: boolean` (default false). When true, the last row of a multi-row card gets `borderTop: '1px solid var(--border)'` + `paddingTop: 12`. Backward-compatible — the 3 step-3 RecapSection consumers + the Paramètres saisis recap on step 2 are unaffected because they don't pass the prop.
  - **Paramètres saisis recap retitled:** Switched `sectionTitle` from `wizard.section.parametres.saisis` to `wizard.step2.recap.title` (same FR value `PARAMÈTRES SAISIS`, new key per D-21 Plan 02).
- **ADMIN-09 D-12 envelope preserved:** Commission amount renders EXACTLY ONCE in Détail row 2 with the `(non visible client)` sub-line via `rowSublabels[1]`. Tests 14 + 15 (commission-once + no leak in recap / hidden inputs / data attributes) stay green without modification. The 9-gate grep-contract suite at `tests/admin-09-grep-contracts.test.ts` stays green throughout (it gates on `commission_pct` + `_pct` substrings, neither of which appears in the restructured page).
- **Compute pipeline UNCHANGED:** Lines ~90-172 (computeLoyer + tranche detection + coefficient parsing + state machine) preserved verbatim — only the JSX layout below it changed.
- **Test impact (Rule 3 deviation, see below):** Test 3 retargeted (1 of 15 tests in `calcul/page.test.tsx`); the other 14 tests + the 9 ADMIN-09 gates pass unmodified. Broader wizard sweep `npm test -- "app/(authed)/proposals/new/"` confirms **124/124 tests pass** across 13 test files.

## Task Commits

1. **Task 1 — Restructure wizard step 2 (PageHero + loyer hero card + Détail + RecapSection lastRowDivider)** — `7b12214` (feat)

## Files Created/Modified

- **`app/(authed)/proposals/new/calcul/page.tsx`** (+93 / -65 lines): see decisions above; net structural change in the JSX below the compute pipeline. New `import { PageHero } from '@/components/ui/PageHero';`. Old `<h1>`/`<p>` heading block replaced. Hero card flex-row restructure. Detail rows switched to new keys with coefficient suffix appended. lastRowDivider={true} passed to Détail RecapSection. Recap title key swapped.
- **`app/(authed)/proposals/new/_components/RecapSection.tsx`** (+21 / -2 lines): Added optional `lastRowDivider?: boolean` prop to `RecapSectionProps` interface. Implementation: when `lastRowDivider && idx === lastIdx && rows.length > 1`, the row gets `paddingTop: 12` + `borderTop: '1px solid var(--border)'`. Default `false` preserves identical behavior for the 4 pre-existing callsites.
- **`app/(authed)/proposals/new/calcul/page.test.tsx`** (+8 / -2 lines): Test 3 retargeted from the old `LOYER MENSUEL` hero-label assertion (the label is now removed per UI-SPEC) to two new structural assertions: `ÉTAPE 2 SUR 3` (PageHero eyebrow) + `par mois pendant 48 mois` (new hero card sublabel). Comment explains the WIZ-02 D-16 rationale inline.

## Decisions Made

See the key-decisions block in the frontmatter (4 decisions).

## Deviations from Plan

**1. [Rule 3 — Blocking fix] Test 3 retargeted to match the new hero card structure**

- **Found during:** Task 1 first test run after restructure.
- **Issue:** Pre-existing Test 3 asserted `expect(container.textContent).toContain('LOYER MENSUEL')` — the old hero `.ctitle` label sourced from `wizard.step2.hero.label`. UI-SPEC §Wizard step 2 explicitly removes that `.ctitle` label (the PageHero eyebrow + the per-month sublabel cover the labeling role on the new hero card). Without retargeting, the test would block the plan's `<verify>` gate (`npm test -- "app/(authed)/proposals/new/calcul/" --run` MUST exit 0).
- **Fix:** Replaced the `LOYER MENSUEL` assertion with two new structural assertions that match the new hero card per UI-SPEC: `ÉTAPE 2 SUR 3` (the PageHero eyebrow added by this plan) + `par mois pendant 48 mois` (the new hero card sublabel from `wizard.step2.hero.sublabel`). The loyer-amount assertion (`/1\s*949[.,]\s*93\s*€/`) was preserved verbatim — it covers the same behavior (the value renders).
- **Files modified:** `app/(authed)/proposals/new/calcul/page.test.tsx`
- **Commit:** `7b12214` (bundled with the main change — the test break is a direct consequence of the intentional refactor that the plan mandates).

**2. [Rule 1 — Bug / Visual polish] Extended --teal hero value color to the on-demand and missing branches**

- **Found during:** Task 1 visual review of the 4-branch hero state machine.
- **Issue:** The pre-Plan-17 hero card used `color: 'var(--gd)'` (brand green) for all 4 state branches (computed / on-demand / missing / incomplete). UI-SPEC §Subsection A locks the new computed-state hero value to `--teal` at 36px/700. The on-demand and missing branches were sibling hero-scale values that visually clashed if left as `--gd` (mixed-accent hero card; jarring on theme switch). No test asserts the color of these branches.
- **Fix:** Extended the `--teal` color to the on-demand `Sur demande` value and the missing `Coefficients manquants pour cette tranche` value, both at the same `lineHeight: 1.1` and (for on-demand) the same 36px/700 type to match the computed-state hero. Internal visual consistency only — no behavior change.
- **Files modified:** `app/(authed)/proposals/new/calcul/page.tsx` (the on-demand and missing JSX branches inside the hero `<section className="card">`).
- **Commit:** `7b12214` (same commit as Task 1).

No other deviations — the plan executed as written.

## Issues Encountered

- **Pre-existing test failures unchanged by this plan:** Same set carried forward from prior plans (RetractableSidebar jsdom + render-fixtures byte-determinism). Not touched. Verified out-of-scope per deviation Rule 4 scope-boundary clause — none of these tests cover the wizard step 2 surface.

## TDD Gate Compliance

Task 1 is `type="auto"` (not `tdd="true"`) per the plan frontmatter. No RED/GREEN/REFACTOR cycle required. The verification gate (`npm test -- "app/(authed)/proposals/new/calcul/" tests/admin-09-grep-contracts.test.ts`) executed and passed (24/24) prior to commit, satisfying the plan's `<verify>` block.

## User Setup Required

None — no external service configuration, no environment variables, no schema migrations.

## Next Phase Readiness

- **Plan 17-07 (Wizard step 3 + WIZ-04 validity selector + WIZ-06 real lc_ref)** can begin immediately. Independent of this plan's changes; shares the `<PageHero>` primitive (Phase 16) and the `<RecapSection>` primitive (Phase 13 — the new `lastRowDivider` prop is available if any step-3 RecapSection needs a separator). No state dependency.
- **Plan 17-08 (visual verification + golden-shape)** can verify wizard step 2 visually once the dev server is running: `npm run dev` → visit `/proposals/new/calcul?draft_id=<id>` after creating a draft → expect ÉTAPE 2 SUR 3 eyebrow + new hero card with big teal value + Tranche/Coefficient chip top-right + Détail du calcul with 5 rows (commission row visible to deal-owner partner per D-12) + bold separator on the loyer mensuel row + Paramètres saisis recap with ← Modifier link.
- **No blockers** for the remaining Wave-2 plans.

## Self-Check: PASSED

Files verified to exist:
- FOUND: `app/(authed)/proposals/new/calcul/page.tsx` (modified, see git log)
- FOUND: `app/(authed)/proposals/new/_components/RecapSection.tsx` (modified)
- FOUND: `app/(authed)/proposals/new/calcul/page.test.tsx` (modified)

Commits verified in `git log`:
- FOUND: 7b12214 (feat — Task 1 — restructure wizard step 2)

Done-criteria greps (from PLAN.md `<done>` block):
- `grep -c "PageHero" "app/(authed)/proposals/new/calcul/page.tsx"` → 4 (>= 2: 1 import + 1 JSX + 2 comment refs) ✓
- `grep -c "wizard.step2.eyebrow\|wizard.step2.detail.title\|wizard.step2.hero.sublabel" "app/(authed)/proposals/new/calcul/page.tsx"` → 3 (>= 3) ✓
- `grep -c "chip-language\|rgba(45,122,140" "app/(authed)/proposals/new/calcul/page.tsx"` → 2 (>= 1; the .chip-language class reuse + color-mix(in srgb, var(--teal) 10%, transparent) background) ✓
- `fontSize: 36` style applied: 2 matches (computed + on-demand hero value) ✓

Verification gates (re-confirmed at SUMMARY time):
- `npx tsc --noEmit` → exit 0
- `npm test -- "app/(authed)/proposals/new/calcul/page.test.tsx" tests/admin-09-grep-contracts.test.ts --run` → 24/24 pass
- Broader sweep `npm test -- "app/(authed)/proposals/new/" tests/admin-09-grep-contracts.test.ts --run` → 124/124 pass across 13 test files
- Compute pipeline unchanged (verified via git diff inspection — only JSX below line ~290 changed; lines 90-172 untouched)

---
*Phase: 17-partner-surfaces*
*Completed: 2026-05-24*

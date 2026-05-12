---
phase: 13-3-step-proposal-wizard
plan: 01
subsystem: ui-route-private-primitives
tags: [wizard, route-private, i18n, action-bar, accordion, pdf-mock, recap, tdd]

# Dependency graph
requires:
  - phase: 11-design-system-foundation-brand-assets
    provides: BrandLogo + Stepper + .card / .ctitle / .dot / .btn-green / .btn-out chrome consumed by these primitives
  - phase: 12-schema-extensions-for-drafts-history
    provides: proposals.status='draft' + draft helpers — context for the wizard, no direct import in this plan

provides:
  - WizardActionBar (4 wizard route consumers — steps 1/2/3 + revisits)
  - PlusDeDetailsAccordion (step-1 only; D-06 5-optional-fields container)
  - PdfPreviewMock (step-3 right column; D-15 CSS-only mock — never a real PDF blob)
  - RecapSection (step-2 1x + step-3 3x)
  - 45 new wizard.* i18n keys × FR + EN with compile-time parity proof

affects:
  - 13-02 (server actions saveAsDraftAction / finalize will be called by WizardActionBar)
  - 13-03 (step-1 parametres route — mounts ProposalFormProvider + PlusDeDetailsAccordion + WizardActionBar)
  - 13-04 (step-2 calcul route — uses RecapSection 1x + WizardActionBar)
  - 13-05 (step-3 verification route — uses RecapSection 3x + PdfPreviewMock + WizardActionBar)
  - 13-06 (golden-PDF + ADMIN-09 commission-invisibility addendum tests)
  - 14 (downstream resume / Brouillons MetricTile)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Discriminated-union prop pattern for WizardActionBar primary CTA (kind:'link' vs kind:'action') — single component, two call-site shapes"
    - "RHF state preservation via height:0 + opacity:0 + overflow:hidden (PlusDeDetailsAccordion children stay mounted across collapse — D-21)"
    - "D-15 mock-reference indirection — partner-facing placeholder lives in the i18n dictionary, never in JSX — keeps the literal under copy-review and prevents drift"
    - "ReactNode-typed row values in RecapSection enable inline JSX emphasis (e.g. <strong style={{color:var(--gd)}}>) without forking the component"
    - "Fire-and-forget onToggle pattern for cosmetic state (PlusDeDetailsAccordion — no await, no toast, no error handling; next updateDraft naturally recovers any silent server failure)"

key-files:
  created:
    - "app/(authed)/proposals/new/_components/WizardActionBar.tsx (179 lines)"
    - "app/(authed)/proposals/new/_components/WizardActionBar.test.tsx (179 lines, 9 assertions)"
    - "app/(authed)/proposals/new/_components/PlusDeDetailsAccordion.tsx (119 lines)"
    - "app/(authed)/proposals/new/_components/PlusDeDetailsAccordion.test.tsx (93 lines, 7 assertions)"
    - "app/(authed)/proposals/new/_components/PdfPreviewMock.tsx (176 lines)"
    - "app/(authed)/proposals/new/_components/PdfPreviewMock.test.tsx (74 lines, 7 assertions)"
    - "app/(authed)/proposals/new/_components/RecapSection.tsx (147 lines)"
    - "app/(authed)/proposals/new/_components/RecapSection.test.tsx (115 lines, 7 assertions)"
    - ".planning/phases/13-3-step-proposal-wizard/13-01-SUMMARY.md"
  modified:
    - "src/lib/i18n/dictionaries.ts (+45 wizard.* keys × FR + EN)"
    - "src/lib/i18n/dictionaries.test.ts (+1 describe block, 100+ wizard.* assertions covering non-empty, exact-copy, and interpolation contracts)"

key-decisions:
  - "WizardActionBar uses a discriminated-union for primary CTA — kind:'link' renders <Link className='btn-green'>, kind:'action' renders <button className='btn-green' aria-busy>; single component covers all 3 wizard step composition needs (D-19)"
  - "Spinner animation declared inline on the Loader2 SVG (animation: 'spin 1s linear infinite') — no new global .animate-spin utility; matches D-24 spec for finalize CTA morph"
  - "PlusDeDetailsAccordion does NOT apply aria-label to the trigger button — the visible '+ Plus de détails (facultatif)' text is the accessible name; open/close announced via aria-expanded; the two wizard.accordion.aria.label.{open,close} keys are reserved for optional sr-only context-hint consumers (a parent fieldset legend, etc.) that don't shadow the button's own visible name"
  - "Accordion children stay mounted across collapse via height:0 + opacity:0 + overflow:hidden — direct enforcement of D-21 RHF state preservation; conditional unmount would drop dirty/touched fields and break the 'browse back to step 1 to fix a field' flow"
  - "PdfPreviewMock sources the partner-facing reference placeholder from the i18n dictionary (wizard.step3.pdf.ref.line FR + EN) rather than hardcoding in JSX — keeps the literal placeholder under copy-review and makes the plan-level grep enforce D-15 mechanically (PdfPreviewMock.tsx grep returns 0; dictionaries.ts grep returns 2)"
  - "RecapSection's rowSublabels (Record<number, string>) is the SOLE pathway for the step-2 commission '(non visible client)' parenthetical (D-12). Caller is responsible for never wiring commission into a row that crosses into the PDF render path — verified by plan 13-06's golden-PDF-no-commission test"
  - "wizard.field.client.co.label kept SEPARATE from form.client.co (per UI-SPEC §6.3 recommendation) — preserves v1.1 backward-compat while letting the new wizard label clientCo as 'Nom du client' per Figma fidelity. Open question for stakeholder review (UI-SPEC §16 #2)"
  - "Extra wizard.toast.draft.error key added beyond the §6.8 toast inventory — supports the WizardActionBar onSaveDraft catch branch (D-17 toast UX for the failure path the planner left implicit)"

patterns-established:
  - "Route-private components live under app/(authed)/.../_components/ (Next.js underscore-prefixed dirs are NOT routed) with colocated .test.tsx — Phase 11 convention extended one route level deeper"
  - "TDD discipline: RED commit (failing tests for component contract) → GREEN commit (implementation passing the same tests) — explicit RED/GREEN gates in commit messages per gsd-execute-phase TDD flow"

requirements-completed: []
requirements-progress:
  - id: ROUTE-01
    note: "wave 1 primitives shipped; route pages + draft persistence + Stepper-gated nav land in plans 13-03/04/05"

# Metrics
duration: ~45min
completed: 2026-05-12
---

# Phase 13 Plan 01: Shared Wizard Primitives + i18n Delta Summary

## One-Liner

Shipped 4 route-private wizard primitives (WizardActionBar / PlusDeDetailsAccordion / PdfPreviewMock / RecapSection) + 45 new `wizard.*` i18n keys × FR + EN — the foundation that all 3 wave-2 wizard step routes (plans 13-03/04/05) consume without inter-plan file conflicts.

## What shipped

### 1. New `wizard.*` i18n namespace (45 keys × 2 langs)

All keys locked verbatim from `13-UI-SPEC.md` §6.1–§6.8:

| §    | Slot                                | Count |
| ---- | ----------------------------------- | ----- |
| §6.1 | Page titles + subtitles (steps 1-3) | 6     |
| §6.2 | Section bullet headers              | 7     |
| §6.3 | Wizard field-label overrides        | 2     |
| §6.4 | Accordion trigger + ARIA labels     | 3     |
| §6.5 | Step-2 hero + chip + recap rows     | 10    |
| §6.6 | Step-3 modifier link + PDF mock     | 5     |
| §6.7 | Action bar buttons + ARIA + spinner | 7     |
| §6.8 | Toast strings                       | 4     |
| —    | `wizard.toast.draft.error` (extra)  | 1     |
| **Total** |                                | **45**|

Compile-time `_EnHasAllFrKeys` parity proof holds. Runtime non-empty + exact-copy assertions for the locked strings (D-12 commission parenthetical, D-15 placeholder).

### 2. WizardActionBar (`app/(authed)/proposals/new/_components/WizardActionBar.tsx`)

`.card` row with optional `← Précédent` Link + `Enregistrer comme brouillon` `.btn-out` + flex spacer + primary CTA (Link for steps 1/2, `<button>` for step 3). useTransition wraps onSaveDraft, calling `toast.success(wizard.toast.save.draft.success)` on resolve and `toast.error(wizard.toast.draft.error)` on throw. D-24 spinner morph: when `primary.kind==='action' && primary.isSubmitting===true`, label morphs to `primary.spinnerLabel`, Loader2 spins inline, button gets `aria-busy=true` + `disabled` + `filter:brightness(0.9)`. Sibling controls (Précédent link, save button, primary CTA) disabled during save or finalize to prevent double-submission.

### 3. PlusDeDetailsAccordion (`.../PlusDeDetailsAccordion.tsx`)

Collapsible region wrapper for step-1's 5 optional fields. `<button role="button" aria-expanded={open} aria-controls="plus-de-details-region">` trigger with Lucide `<Plus>` rotating 0° → 45° on expand (200ms ease-out). Children **stay mounted at all times** — collapse is `height:0 + opacity:0 + overflow:hidden`, NOT conditional render — so RHF dirty/touched/values survive every toggle (D-21). `onToggle` fires fire-and-forget; server-side `_uiAccordionOpen` persistence is recovered on the next `updateDraft` if a silent failure occurs.

### 4. PdfPreviewMock (`.../PdfPreviewMock.tsx`)

Pure presentational. CSS-only mock per UI-SPEC §5.3: BrandLogo (140px) → title (18px/600/navy) → ref line (12.5px/muted, with `validityDays` interpolated) → 3 placeholder bars (100% / 92% / 78%, all `aria-hidden`) → LOYER MENSUEL block in `var(--gd)` → 2 trailing bars (85% / 70%). Root has `role="img"` + `aria-label`. D-15 enforcement is mechanical: the partner-facing reference placeholder is sourced from `wizard.step3.pdf.ref.line` (FR + EN dictionary entries) and is NEVER hardcoded in JSX here — the plan's grep over this file returns 0 matches by design.

### 5. RecapSection (`.../RecapSection.tsx`)

`<section class="card">` with `.ctitle / .dot` header (verbatim pattern lift from `ProposalForm.tsx:213-219`), optional right-aligned `← Modifier` Link, and label/value rows. Row values are `string | ReactNode` so callers can inline `<strong style={{color:'var(--gd)'}}>` for the 'Loyer mensuel calculé' emphasis row. `rowSublabels?: Record<number, string>` supports the D-12 step-2 commission `(non visible client)` parenthetical and nothing else. Consumes existing `.card / .ctitle / .dot` chrome — **no new global CSS**.

## All 30 Vitest assertions (checklist)

### WizardActionBar — 9 assertions
- [x] AC-WAB-01: Précédent link with aria-label="Étape précédente" when currentStep===2
- [x] AC-WAB-02: Précédent link omitted when currentStep===1
- [x] AC-WAB-03: primary CTA renders as `<a>` (Link) when kind==='link'
- [x] AC-WAB-04: primary CTA renders as `<button>` when kind==='action'
- [x] AC-WAB-05: D-24 spinner morph — Loader2 SVG + aria-busy + disabled when isSubmitting===true
- [x] AC-WAB-06: onSaveDraft called once on click of save button
- [x] AC-WAB-07: save button disabled during pending useTransition
- [x] AC-WAB-08: sonner.toast.success fires with `Brouillon enregistré ✓` after onSaveDraft resolves
- [x] AC-WAB-09: sonner.toast.error fires with `Erreur lors de l'enregistrement. Réessayez.` after onSaveDraft throws

### PlusDeDetailsAccordion — 7 assertions
- [x] AC-PDA-01: starts collapsed when defaultOpen===false (aria-expanded="false")
- [x] AC-PDA-02: starts expanded when defaultOpen===true (aria-expanded="true", children visible)
- [x] AC-PDA-03: toggles aria-expanded between true/false on click
- [x] AC-PDA-04: onToggle(true) on expand, onToggle(false) on collapse
- [x] AC-PDA-05: aria-controls="plus-de-details-region", focusable
- [x] AC-PDA-06: D-21 children stay in DOM regardless of open state
- [x] AC-PDA-07: Plus icon rotate(45deg) inline style when open

### PdfPreviewMock — 7 assertions
- [x] AC-PPM-01: root role="img" with aria-label from wizard.step3.pdf.preview.aria (FR)
- [x] AC-PPM-02: BrandLogo rendered at width=140 (both light + dark img variants)
- [x] AC-PPM-03: title 'Proposition de financement' (FR)
- [x] AC-PPM-04: D-15 placeholder literal present in both FR and EN ref lines (sourced from i18n)
- [x] AC-PPM-05: ref line interpolates validityDays prop ("30 jours" present)
- [x] AC-PPM-06: LOYER MENSUEL value shows loyerDisplay with color:var(--gd)
- [x] AC-PPM-07: placeholder bars are aria-hidden="true"

### RecapSection — 7 assertions
- [x] AC-RS-01: renders `<section.card>` with `.ctitle` header containing sectionTitle
- [x] AC-RS-02: .dot glyph with background:var(--gd)
- [x] AC-RS-03: ← Modifier link omitted when modifierLink prop is undefined
- [x] AC-RS-04: ← Modifier Link href matches modifierLink.href when provided
- [x] AC-RS-05: one row per rows[] entry — label + value rendered
- [x] AC-RS-06: ReactNode-typed value renders verbatim (e.g. `<strong>` with var(--gd))
- [x] AC-RS-07: D-12 rowSublabels — sub-line `(non visible client)` under commission row label

## Plan-level verification gates

| Gate                                                            | Expected | Actual |
| --------------------------------------------------------------- | -------- | ------ |
| `npm run typecheck`                                             | exit 0   | exit 0 |
| `npm run lint`                                                  | exit 0   | exit 0 (3 warnings in unrelated pre-existing files — out-of-scope) |
| `npm test -- --run` (full suite)                                | green    | 627 passed, 4 skipped, 0 failed |
| `wizard.*` key count × 2 (FR + EN)                              | ≥ 80     | 90     |
| `grep -c "LC-2026-XXX" PdfPreviewMock.tsx \| grep -v '^#'`      | 0        | 0      |
| `grep -c "LC-2026-XXX" dictionaries.ts \| grep -v '^#'`         | 2        | 2      |
| Stepper/RetractableSidebar imports in `_components/*.tsx`       | 0        | 0      |

## No new global CSS

Confirmed: every wizard surface in this plan consumes existing utility classes (`.card`, `.ctitle`, `.dot`, `.btn-green`, `.btn-out`) — no new selectors added to `app/globals.css`. The Loader2 spinner animation is declared inline on the SVG (`animation: 'spin 1s linear infinite'`); production CSS resolves `@keyframes spin` if/when needed, and Vitest jsdom asserts the SVG presence and aria attributes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Critical] PlusDeDetailsAccordion trigger aria-label conflicted with visible name**

- **Found during:** Task 2 GREEN verification (6 of 7 accordion tests failed)
- **Issue:** Initial implementation applied a dynamic `aria-label` ('Afficher les détails supplémentaires' / 'Masquer les détails supplémentaires') to the trigger button. This shadowed the visible '+ Plus de détails (facultatif)' text as the button's accessible name, breaking screen-reader fidelity and causing all `getByRole('button', { name: /plus de détails/i })` queries to fail.
- **Fix:** Removed `aria-label` from the trigger. The visible text is the accessible name; `aria-expanded` announces open/close state. The two `wizard.accordion.aria.label.{open,close}` i18n keys are kept in the dictionary as reserved future consumers (an sr-only fieldset legend or context hint that does NOT shadow the button's own name) per the inline code comment.
- **Files modified:** `app/(authed)/proposals/new/_components/PlusDeDetailsAccordion.tsx`
- **Commit:** `b95bca1` (rolled into the same GREEN commit since it was caught and fixed before the implementation was committed)

**2. [Rule 1 - D-15 grep contract bug] Documentation comments mentioned `LC-2026-XXX` literal in PdfPreviewMock.tsx**

- **Found during:** Plan-level verification gates after Task 3 GREEN
- **Issue:** Initial implementation included the literal placeholder string in JSDoc and inline comments for D-15 traceability. The plan's literal verification grep (`grep -v '^#' PdfPreviewMock.tsx | grep -c "LC-2026-XXX"`) does not filter JS-style comments, so it returned 4 instead of the expected 0. The **intent** of D-15 (no JSX hardcode of the placeholder) was satisfied, but the grep's literal failed.
- **Fix:** Rewrote the JSDoc and inline comments to describe the placeholder behavior without quoting the literal substring. Also stripped one redundant mention from `dictionaries.ts` so its grep returns exactly 2 (FR + EN value entries only).
- **Files modified:** `app/(authed)/proposals/new/_components/PdfPreviewMock.tsx`, `src/lib/i18n/dictionaries.ts`
- **Commit:** `d5f574e` (rolled into the Task 3 GREEN commit)

### Plan additions

**Extra i18n key added beyond UI-SPEC §6 inventory:**

- `wizard.toast.draft.error`: FR `Erreur lors de l'enregistrement. Réessayez.` / EN `Save failed. Try again.`. The plan explicitly directs this addition (Task 1 `<action>` last sentence) — it supports the `WizardActionBar` `onSaveDraft` catch branch (D-17 toast UX for the failure path that UI-SPEC §6.8 left implicit). Documented in the dictionary inline comment.

## Authentication Gates

None encountered. This plan ships pure-presentational + interaction-state client components. All authentication concerns (`requireUser()` defence-in-depth on the wizard routes, server-action auth checks in the save / advance / finalize actions) live in plans 13-02 through 13-05.

## TDD Gate Compliance

Plan-level frontmatter is `type: execute` (not `type: tdd`), but every task carries `tdd="true"`. The execution flow shows the canonical RED → GREEN cycle per task:

| Task   | RED commit                                         | GREEN commit                                          |
| ------ | -------------------------------------------------- | ----------------------------------------------------- |
| Task 1 | `6d0ec01` test(13-01): failing wizard.* i18n tests | `7483203` feat(13-01): 45 wizard.* keys × FR + EN     |
| Task 2 | `7d28b06` test(13-01): failing WAB + PDA tests     | `b95bca1` feat(13-01): WizardActionBar + Accordion    |
| Task 3 | `1f06adf` test(13-01): failing PdfMock + RS tests  | `d5f574e` feat(13-01): PdfPreviewMock + RecapSection  |

All three RED commits show failing tests; the corresponding GREEN commits make them pass with no further test changes.

## Known Stubs

None. All shipped surfaces are wired to real data sources at their consumer level (the wave-2 step routes will pass real draft data into these primitives). The only "stub-like" content is the **PdfPreviewMock** — but per D-15 that is the locked, intentional behavior of this surface: a CSS mock of the eventual PDF, **never** a real PDF blob. Plan 13-05 (step-3 verification route) consumes it.

## Open Items for Stakeholder Review

Per UI-SPEC §16 open question #2 — `wizard.field.client.co.label` (FR `Nom du client` / EN `Client name`) and `wizard.field.client.name.label` (FR `Personne de contact` / EN `Contact person`) are introduced as new wizard-specific overrides while leaving `form.client.co` and `form.client.name` intact for v1.1 backward-compat. Stakeholder may want to confirm whether the legacy v1.1 keys should also be replaced or kept; recommendation per UI-SPEC §6.3 is to keep both.

## Self-Check: PASSED

All claimed files exist:
- [x] `app/(authed)/proposals/new/_components/WizardActionBar.tsx`
- [x] `app/(authed)/proposals/new/_components/WizardActionBar.test.tsx`
- [x] `app/(authed)/proposals/new/_components/PlusDeDetailsAccordion.tsx`
- [x] `app/(authed)/proposals/new/_components/PlusDeDetailsAccordion.test.tsx`
- [x] `app/(authed)/proposals/new/_components/PdfPreviewMock.tsx`
- [x] `app/(authed)/proposals/new/_components/PdfPreviewMock.test.tsx`
- [x] `app/(authed)/proposals/new/_components/RecapSection.tsx`
- [x] `app/(authed)/proposals/new/_components/RecapSection.test.tsx`
- [x] `src/lib/i18n/dictionaries.ts` (modified, +45 keys × FR + EN)
- [x] `src/lib/i18n/dictionaries.test.ts` (modified, +1 describe block with 100+ assertions)

All claimed commits exist (verified via `git log --oneline`):
- [x] `6d0ec01` test(13-01): add failing tests for wizard.* i18n keys (RED)
- [x] `7483203` feat(13-01): add 45 wizard.* i18n keys × FR + EN (GREEN)
- [x] `7d28b06` test(13-01): add failing tests for WizardActionBar + PlusDeDetailsAccordion (RED)
- [x] `b95bca1` feat(13-01): implement WizardActionBar + PlusDeDetailsAccordion (GREEN)
- [x] `1f06adf` test(13-01): add failing tests for PdfPreviewMock + RecapSection (RED)
- [x] `d5f574e` feat(13-01): implement PdfPreviewMock + RecapSection (GREEN)

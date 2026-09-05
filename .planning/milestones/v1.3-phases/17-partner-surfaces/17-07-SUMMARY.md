---
phase: 17-partner-surfaces
plan: 07
subsystem: wizard, partner-surfaces
tags: [page-hero, wizard-step3, wiz-04, wiz-06, validity-selector, lc-ref, tdd, server-action]

# Dependency graph
requires:
  - phase: 17-partner-surfaces
    provides: "17-01 — createDraft pre-allocates lcRef so draft.lcRef is non-null on post-Phase-17 drafts (consumed by the PdfPreviewMock callsite + the new defensive bail in verification/page.tsx)"
  - phase: 17-partner-surfaces
    provides: "17-02 — PdfPreviewMockProps requires lcRef:string + 32 i18n keys (wizard.step3.eyebrow, proposal.validity.{ariaLabel,label,days15,days30,days60}); the transitional `?? 'LC-2026-XXX'` fallback in verification/page.tsx is now removed"
  - phase: 16-shell-refresh-contrast-gates
    provides: "<PageHero> primitive (D-01..D-05) — adopted on wizard step 3 per D-19"
  - phase: 13-3-step-proposal-wizard
    provides: "verification/page.tsx 2-column 1040px layout + RecapSection primitive + saveAsDraft.action.ts server-action shape + ADMIN-09 D-12 envelope (CALCUL recap commission row preserved)"
  - phase: 12-schema-extensions-for-drafts-history
    provides: "updateDraft full-replace inputs jsonb semantics (D-22) + getDraftById ownership-enforcing read"
  - phase: 14-admin-polish-partners-history-home
    provides: "ADMIN-09 9-gate grep-contract suite (D-29)"
provides:
  - "updateValidityAction(draftId, days) server action: in-place draft.inputs.validityDays update, NO redirect, Zod-validated days enum, requireUser + ownership-enforcing getDraftById"
  - "ValiditySelectorClient — 'use client' segmented 15/30/60 pill mounted inside CALCUL recap on wizard step 3; reuses .dg / .db / .db.on chrome verbatim"
  - "Wizard step 3 PageHero-adopted (eyebrow 'ÉTAPE 3 SUR 3')"
  - "Wizard step 3 PdfPreviewMock now displays the REAL draft.lcRef (no more LC-2026-XXX literal); transitional fallback removed"
  - "Defensive `if (!draft.lcRef) redirect('/proposals/new/parametres')` bail for legacy pre-Phase-17 drafts"
affects:
  - "Phase 17 Plan 08 (visual QA / cross-cut THEME-01) — wizard step 3 surface is final for partner cutover"
  - "Future v1.4+ — validity selector optimistic-divergence revert on server-action failure (T-17-07-06 accepted)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server action with 'use server' + NO redirect for in-place draft.inputs edits (vs. saveAsDraftAction which redirects to '/')"
    - "Zod enum validation on a TS-literal-typed server-action param (defense against direct invocation with attacker-controlled value)"
    - "'use client' component with useTransition + optimistic local state for instant UI feedback on a server-action call"
    - "Sibling-block composition with RecapSection (which does not accept children) — validity selector renders BELOW the CALCUL recap inside the same column wrapper"
    - "Defensive bail for legacy state at a route's first-render top — catches pre-migration rows without polluting the helper layer"

key-files:
  created:
    - "app/(authed)/proposals/new/_actions/updateValidity.action.ts (89 lines — server action for the WIZ-04 in-place validity write)"
    - "app/(authed)/proposals/new/_components/ValiditySelectorClient.tsx (85 lines — segmented selector with useTransition + optimistic UI)"
    - "app/(authed)/proposals/new/_components/ValiditySelectorClient.test.tsx (122 lines — 6 behavior tests AC-VSC-01..06)"
  modified:
    - "app/(authed)/proposals/new/verification/page.tsx (+59/-19 lines — PageHero adoption, ValiditySelectorClient mount, real lcRef threading, defensive bail, header docstring + inline comments updated)"
    - "app/(authed)/proposals/new/verification/page.test.tsx (+57/-9 lines — lcRef='LC-2026-042' added to 2 mock fixtures; Test 12 retargeted to assert real lcRef; Test 16 + Test 17 added)"

key-decisions:
  - "validityDays prop on PdfPreviewMock now sourced from parsedData.validityDays (i.e. draft.inputs.validityDays) — NOT params.validityDays as the original Phase 13 code did. This lets the validity selector's writes appear in the preview on next render (the WIZ-04 user expectation). On first render of a freshly-created draft, parsedData.validityDays equals params.validityDays because step 1 seeds inputs.validityDays from globalParams; so behavior on a fresh draft is unchanged. On any subsequent render after a selector click, the per-draft value wins."
  - "INCLUDED the defensive `if (!draft.lcRef) redirect(...)` per 17-PATTERNS.md recommendation. The bail lives between the global-params check and computeLoyer so legacy drafts cost no compute. The non-null assertion on `lcRef={draft.lcRef}` is justified by the bail being the immediate predecessor in the same function."
  - "ValiditySelectorClient `defaultValidity` fallback to 30 (sensible default within the {15,30,60} enum). Phase 13 D-08 first-render seeds the field from globalParams.validityDays so the fallback is only a defense against legacy pre-Phase-13 drafts; even so, 30 is the production default of every shipped global_params row to date."
  - "Test 12 retargeted (not extended) — the OLD assertion `expect(text).toContain('LC-2026-XXX')` would have collided with the new behavior. Per Plan 17-02 SUMMARY note, Plan 17-07 was the right place to retarget."
  - "Stepper moved from `marginTop:24` wrapper to `marginBottom:32` wrapper — PageHero's baked-in marginBottom:32 already provides the gap ABOVE the Stepper; the Stepper itself needs marginBottom:32 to space the 2-column grid below. The grid wrapper lost its `marginTop:16` (now 0) to avoid 48px stacking. Net visual: PageHero → 32px → Stepper → 32px → grid, matching UI-SPEC §Stepper repositioning."

patterns-established:
  - "In-place server-action pattern for draft-input edits (no redirect): import { updateDraft } from '@/lib/db/queries/proposals' + read-modify-write via getDraftById + return discriminated union { ok:true } | { ok:false; error:... } instead of throwing on the unhappy path"
  - "useTransition + optimistic local state for client-side server-action callsites where snappy UI matters more than rolling back on rare failures (T-17-07-06 accepted for internal tools)"

requirements-completed: [WIZ-03, WIZ-04, WIZ-05, WIZ-06]

# Metrics
duration: ~10min
completed: 2026-05-24
---

# Phase 17 Plan 07: Wizard Step 3 Repaint + WIZ-04 Validity Selector + WIZ-06 Real lcRef Summary

**Adopts PageHero on wizard step 3 (WIZ-03 / D-19), mounts the WIZ-04 segmented validity selector inside the CALCUL recap with a no-redirect server action, and threads the real `draft.lcRef` (Plan 17-01 allocation) into PdfPreviewMock — closing the WIZ-04 + WIZ-06 inversions of Phase 13 D-08 + D-15 and removing the Plan 17-02 transitional `?? 'LC-2026-XXX'` fallback.**

## Performance

- **Duration:** ~10 min (598 s)
- **Started:** 2026-05-24T15:57:34Z
- **Completed:** 2026-05-24T16:07:32Z
- **Tasks:** 3 (Task 1 non-TDD action; Task 2 TDD RED → GREEN; Task 3 non-TDD page edit + test retarget)
- **Commits:** 4 (1 feat + 1 test + 2 feat)
- **Files:** 3 created + 2 modified

## Accomplishments

- **Task 1 — updateValidityAction server action:** New `'use server'` action that updates `draft.inputs.validityDays` in place without redirecting. Contract: `requireUser()` FIRST, Zod-validates `days ∈ {15,30,60}` (defense vs. T-17-07-02), validates `draftId` is non-empty, ownership-enforcing `getDraftById` (defense vs. T-17-07-01 — cross-user IDs resolve to `not_found`), then full-replace `updateDraft` per Phase 12 D-22 spreading current inputs and overwriting only `validityDays`. Returns a discriminated union `{ ok: true } | { ok: false; error }`. No `redirect()` call (the inversion vs. `saveAsDraftAction`). No `audit_log` entry — pre-finalize draft edits are not lifecycle events (Phase 13 D-16).
- **Task 2 — ValiditySelectorClient (TDD RED → GREEN):** Implementation passes all 6 behavior tests (AC-VSC-01..06) covering: default selection drives `aria-pressed`, click dispatches `updateValidityAction(draftId, days)`, click flips local state immediately (optimistic UI via `useTransition`), `role="group"` + i18n `aria-label`, `data-testid="validity-selector"`, `.dg` / `.db` / `.db.on` chrome reused verbatim. RED commit verified failing-to-resolve on the missing import; GREEN commit lights up all 6 tests.
- **Task 3 — Wizard step 3 repaint + invariants:** Three coordinated changes in one commit:
  1. **WIZ-03 / D-19:** inline `<h1>` + `<p>` replaced with `<PageHero eyebrow=ÉTAPE 3 SUR 3 title=… subtitle=…/>`. Stepper repositioned as sibling below with `marginBottom:32` (PageHero's own marginBottom provides the top gap).
  2. **WIZ-04 / D-01:** `ValiditySelectorClient` mounted inside the CALCUL recap left-column wrapper (sibling block below the CALCUL `RecapSection`). Label rendered via `proposal.validity.label`. `defaultValidity` derived from `parsedData.validityDays` with `?? 30` fallback for legacy drafts.
  3. **WIZ-06 / D-03 / D-17:** `PdfPreviewMock` callsite changed from `lcRef={draft.lcRef ?? 'LC-2026-XXX'}` to `lcRef={draft.lcRef}` (real value); `validityDays` source switched from `params.validityDays` (global default) to `parsedData.validityDays` (per-draft, reflecting the WIZ-04 selector's writes on next render).
- **Defensive bail added:** `if (!draft.lcRef) redirect('/proposals/new/parametres')` between the global-params check and `computeLoyer` — catches legacy pre-Phase-17 drafts without polluting `getDraftById`. The bail makes `draft.lcRef` non-null at the JSX site without a `!` assertion.
- **Test updates bundled in Task 3:** lcRef added to happy-path mock + Test 9 sub-case mock; Test 12 retargeted to assert real `LC-2026-042` flows through `PdfPreviewMock`; Test 16 NEW (ValiditySelectorClient mounted with correct default); Test 17 NEW (legacy-NULL-lcRef defensive bail).
- **ADMIN-09 9-gate grep-contract suite remains green throughout.** The validity selector + lcRef threading add no commission surface — both are pure metadata; the partner-facing CALCUL commission row stays exactly as Phase 13 D-12 shipped it.
- **`_EnHasAllFrKeys` parity proof + TSC stay green.** All keys consumed (`wizard.step3.eyebrow`, `wizard.step3.title`, `wizard.step3.subtitle`, `proposal.validity.label`, `proposal.validity.ariaLabel`) exist in FR + EN; `npx tsc --noEmit` exits 0.

## Task Commits

Each task committed atomically (Task 2 followed the per-task TDD cycle):

1. **Task 1 — updateValidityAction server action** — `4688dbe` (feat)
2. **Task 2 RED — failing ValiditySelectorClient behavior tests** — `afd6ad3` (test)
3. **Task 2 GREEN — ValiditySelectorClient implementation** — `8e516b8` (feat)
4. **Task 3 — wizard step 3 repaint + invariants + test retarget** — `77bf8e6` (feat)

## Files Created/Modified

- **app/(authed)/proposals/new/_actions/updateValidity.action.ts** (CREATED, 89 lines) — `'use server'` action with Zod validation, ownership-enforcing `getDraftById`, full-replace `updateDraft`. Returns discriminated union. No redirect, no audit_log. Header docstring cites T-17-07-01 / T-17-07-02 mitigations + Phase 12 D-22 + Phase 13 D-08 / D-16.
- **app/(authed)/proposals/new/_components/ValiditySelectorClient.tsx** (CREATED, 85 lines) — `'use client'` component with `useState` + `useTransition` + optimistic local update. Reuses `.dg / .db / .db.on` from `app/globals.css` verbatim. `OPTIONS: ReadonlyArray<15|30|60>` plus a `handleChange` early-return on no-op clicks.
- **app/(authed)/proposals/new/_components/ValiditySelectorClient.test.tsx** (CREATED, 122 lines) — 6 colocated Vitest tests; `vi.hoisted` + `vi.mock` of `../_actions/updateValidity.action`; per-test `mockReset` + `mockResolvedValue({ ok: true })` in `beforeEach`.
- **app/(authed)/proposals/new/verification/page.tsx** (MODIFIED) — Imports: `PageHero`, `ValiditySelectorClient`. Three change sites per Task 3 action block plus the defensive `if (!draft.lcRef)` bail and a header docstring update (line 22 — Phase 13 D-15 LC-2026-XXX literal mention rewritten to cite Phase 17 D-17). Grid wrapper `marginTop:16` removed (Stepper's new marginBottom:32 provides the spacing).
- **app/(authed)/proposals/new/verification/page.test.tsx** (MODIFIED) — `lcRef:'LC-2026-042'` added to default `getDraftByIdMock.mockResolvedValue` and to Test 9 sub-case override. Test 12 retargeted from `expect(text).toContain('LC-2026-XXX')` to assert the real `LC-2026-042` flows through `PdfPreviewMock` + `not.toContain('LC-2026-XXX')`. Test 16 NEW (ValiditySelectorClient mounted with correct defaultValidity + label rendered). Test 17 NEW (legacy-NULL-lcRef defensive bail).

## Decisions Made

- **`validityDays` prop on PdfPreviewMock now sourced from `parsedData.validityDays`.** Phase 13 shipped `validityDays={params.validityDays as 15 | 30 | 60}` (the global default). Phase 17 D-01 makes the validity per-proposal; the source must be `draft.inputs.validityDays` so the partner sees their own selection in the preview after clicking the selector. On a freshly-created draft, `inputs.validityDays` equals `globalParams.validityDays` (Phase 13 D-08 step-1 seeding) so first-render behavior is unchanged.
- **INCLUDED the defensive `if (!draft.lcRef) redirect(...)` bail** per 17-PATTERNS.md "belt-and-suspenders" recommendation. Placed between the global-params check (line 111) and `computeLoyer` (line 128) so legacy drafts cost no compute. With this guard in place the JSX-site assertion `lcRef={draft.lcRef}` does not need a non-null operator — TS narrows correctly across the if-guard.
- **Test 12 retargeted, not extended.** The old assertion `expect(text).toContain('LC-2026-XXX')` would have failed after the WIZ-06 change. Plan 17-02's SUMMARY explicitly identified this test as Plan 17-07's responsibility; the retarget asserts both presence of the real value (`LC-2026-042`) and absence of the old literal (`not.toContain('LC-2026-XXX')`).
- **Stepper spacing tuning.** Phase 13 wrapped the Stepper in `<div style={{ marginTop: 24 }}>` with the grid below using `marginTop:16`. Phase 17 D-19 + UI-SPEC moves the gap convention to PageHero's baked-in `marginBottom:32` (top) + Stepper's own `marginBottom:32` (bottom). The grid's `marginTop:16` was removed to avoid stacking. Net layout: PageHero → 32 → Stepper → 32 → grid.
- **ValiditySelectorClient `defaultValidity ?? 30` fallback.** Phase 13 D-08 step-1 first-render seeds the field from `globalParams.validityDays`, so legacy drafts should always have a value. The 30 fallback is a defense against pre-Phase-13 drafts — defensible (and inside the {15,30,60} enum) but a code path that effectively never fires in production.
- **Optimistic UI — no rollback on error (T-17-07-06 accepted).** If `updateValidityAction` fails server-side, the local `selected` state remains optimistic. Per 17-07 threat register this is accepted for an internal tool; v1.4+ may add an `onError` revert. The action's discriminated-union return shape (`{ ok: false; error }`) leaves the door open for future client-side handling.
- **No `audit_log` write for validity edits.** Per Phase 13 D-16 + Phase 17 CONTEXT Established Patterns, pre-finalize draft input changes do NOT write to `audit_log` — only lifecycle transitions do. Validity selection is a draft-input change, not a lifecycle event. The full audit trail still fires at finalize.

## Deviations from Plan

**1. [Rule 3 — Blocking fix] Bundled verification/page.test.tsx updates into Task 3's commit**

- **Found during:** Task 3 verification.
- **Issue:** The plan's `files_modified` frontmatter listed only the page.tsx, but the new defensive `if (!draft.lcRef) redirect(...)` bail would have made every existing test fail (mocked draft fixtures had no `lcRef` field, so the bail would always fire on the happy path). Additionally Test 12's `LC-2026-XXX` literal assertion would have collided with the WIZ-06 change.
- **Fix:** Updated `app/(authed)/proposals/new/verification/page.test.tsx` in the same commit as the page change: added `lcRef:'LC-2026-042'` to 2 mock fixtures (default beforeEach + Test 9 sub-case), retargeted Test 12, added Tests 16 + 17 per the plan's action step 9.
- **Files modified:** `app/(authed)/proposals/new/verification/page.test.tsx`
- **Commit:** `77bf8e6` (Task 3 — bundled with the page change since the test breakage was a direct consequence of the new behavior).

**2. [Rule 1 — Documentation cleanup] Rewrote two LC-2026-XXX comment references in verification/page.tsx**

- **Found during:** Task 3 done-criteria verification.
- **Issue:** The plan's done-criteria `grep -c "LC-2026-XXX..." returns 0` initially returned 2 — both were inside JSDoc comments (the original Phase 13 header docstring line 22, and a transitional-removal note I had just added). The literal substring still triggered the gate.
- **Fix:** Rewrote both comment occurrences without using the literal substring (the meaning is preserved; one cites Phase 17 D-17 as the inversion of Phase 13 D-15; the other says "transitional null-coalescing fallback" instead of `?? 'LC-2026-XXX'`).
- **Files modified:** `app/(authed)/proposals/new/verification/page.tsx` (comment edits only)
- **Commit:** `77bf8e6` (same commit as Task 3 main work)

No other deviations — both invariant changes (WIZ-04 + WIZ-06) and the WIZ-03 PageHero adoption executed exactly as written in 17-PATTERNS.md verification/page.tsx MODIFY guidance.

## Issues Encountered

- **Pre-existing test failures unrelated to this plan:** Per Plan 17-01 + Plan 17-02 SUMMARIES, 11 failures remain in the broader suite (9 in `src/components/ui/RetractableSidebar.test.tsx` for a jsdom `localStorage.clear` setup issue + 2 in `__pdf-fixtures__/render-fixtures.test.ts` byte-determinism fixtures). None touch the files this plan modifies. Out of scope per deviation Rule 4 scope-boundary clause.

## TDD Gate Compliance

Task 2 followed the per-task TDD cycle correctly:

- **RED commit:** `afd6ad3` (`test(17-07): add failing ValiditySelectorClient behavior tests (WIZ-04 RED)`) — verified all 6 tests fail with import-resolution error (`Failed to resolve import "./ValiditySelectorClient"`) since the component does not exist yet.
- **GREEN commit:** `8e516b8` (`feat(17-07): implement ValiditySelectorClient (WIZ-04 segmented pill GREEN)`) — all 6 tests pass; component is the minimal implementation that satisfies them.
- No REFACTOR commit needed — implementation was minimal.

Tasks 1 and 3 are non-TDD per the plan (Task 1 marked `type="auto"`, Task 3 marked `type="auto"`); committed as single `feat` commits verified by `npx tsc --noEmit` + the targeted Vitest runs.

## User Setup Required

None — no external service configuration, no environment variables, no schema migrations.

## Next Phase Readiness

- **Plan 17-08 (visual QA + cross-cut THEME-01)** can begin immediately. Wizard step 3 surface is final for the partner cutover: PageHero adoption is complete on all 3 wizard steps + Partner Home + /proposals; WIZ-04 + WIZ-06 invariants are wired; the only thing left is light/dark visual verification and a final sweep against the Figma `40:46` + `82:460` frames.
- **All Wave 2 partner-surface plans (17-03, 17-04, 17-05, 17-06, 17-07) are now complete.** The transitional `?? 'LC-2026-XXX'` fallback that Plan 17-02 added to bridge the multi-plan migration is removed; the codebase no longer mentions `LC-2026-XXX` outside the original Phase 13 header docstring context (now updated).
- **No blockers** for downstream work.

## Self-Check: PASSED

Files verified to exist:
- FOUND: `app/(authed)/proposals/new/_actions/updateValidity.action.ts` (CREATED, 89 lines)
- FOUND: `app/(authed)/proposals/new/_components/ValiditySelectorClient.tsx` (CREATED, 85 lines)
- FOUND: `app/(authed)/proposals/new/_components/ValiditySelectorClient.test.tsx` (CREATED, 122 lines)
- FOUND: `app/(authed)/proposals/new/verification/page.tsx` (MODIFIED)
- FOUND: `app/(authed)/proposals/new/verification/page.test.tsx` (MODIFIED)

Commits verified in `git log`:
- FOUND: `4688dbe` (feat Task 1 — updateValidityAction)
- FOUND: `afd6ad3` (test Task 2 RED)
- FOUND: `8e516b8` (feat Task 2 GREEN — ValiditySelectorClient)
- FOUND: `77bf8e6` (feat Task 3 — wizard step 3 repaint + tests)

Verification gates (re-confirmed at SUMMARY time):
- `npx tsc --noEmit` → exit 0
- `npm test -- "app/(authed)/proposals/new/verification/" "app/(authed)/proposals/new/_components/" --run` → 7 files / 64 tests pass
- `npm test -- tests/admin-09-grep-contracts.test.ts --run` → 9 gates green
- `grep -c "PageHero" verification/page.tsx` → 5 (≥2)
- `grep -c "ValiditySelectorClient" verification/page.tsx` → 2 (≥2)
- `grep -c "lcRef={draft.lcRef" verification/page.tsx` → 1
- `grep -c "LC-2026-XXX\|wizard.step3.pdf.ref.line" verification/page.tsx` → 0
- `grep -c "if (!draft.lcRef)" verification/page.tsx` → 2 (1 condition + 1 comment)
- `grep -c "lcRef" verification/page.tsx` → 7 (≥1, real lcRef threaded)

---
*Phase: 17-partner-surfaces*
*Completed: 2026-05-24*

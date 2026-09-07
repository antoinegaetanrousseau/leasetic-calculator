# Phase 38: Shell, Dialogs & Visual Conventions - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-06
**Phase:** 38-shell-dialogs-visual-conventions
**Areas discussed:** Walk environment, Recording + defect policy, Dialog close scope, btn-out verdict

**Area selection note.** The operator selected all four offered areas and added a fifth in free
text — *"UI design for various small components"* — which was ambiguous between an in-scope reading
(the primitives this phase already touches) and an out-of-scope one (an app-wide pass). Asked to
disambiguate, the operator answered **"Both"**. The in-scope half was folded into the Dialog close
scope and btn-out areas; the app-wide half was redirected to Deferred Ideas per the scope guardrail
and scoped explicitly at the end of the discussion rather than left as a one-liner.

---

## Walk environment

| Option | Description | Selected |
|--------|-------------|----------|
| Local prod build, prod DB | `npm run build && npm start` on 3001 — Phase 37's UAT setup; only combination where auth works and CSS is real compiled output; requires read-only discipline | ✓ |
| `next dev` against `.env.local` | Faster iteration, but still hits prod Neon and inherits the stale-CSS trap | |
| Split: dev to iterate, prod build to record | Two environments; recorded evidence from real compiled CSS | |

**User's choice:** Local prod build, prod DB
**Notes:** Constraints surfaced before the question: `.env.production.local` resolves `DATABASE_URL`
to prod; D-36-03 established login fails against the `development` Neon branch (frozen CoW fork,
stale credential hashes); `npm run build` beside `next dev` freezes `globals.css` recompiles.

| Option | Description | Selected |
|--------|-------------|----------|
| Operator drives, Claude records | Matches how 31.1-07 and Phase 37's UAT were run; subjective visual judgement stays with the operator | |
| Claude drives via Playwright/Browser MCP | No operator time; screenshots do prove composited rendering; but Claude adjudicates and an authed session is still needed | ✓ |
| Hybrid: Claude captures, operator adjudicates | Splits mechanical navigation from visual judgement; leaves durable artifacts | |

**User's choice:** Claude drives via Playwright/Browser MCP
**Notes:** Two consequences recorded into CONTEXT — operator supplies the authenticated session
(Claude does not log in), and evidence must be reviewable after the fact since Claude adjudicates.

| Option | Description | Selected |
|--------|-------------|----------|
| DevTools trace filmstrip | Timestamped frames, CPU-throttled, re-runnable by a later reader | ✓ |
| Throttled reload + interval screenshots | Simpler, stays in Playwright; sampling can miss a sub-frame flash | |
| Verify the mechanism, state the limit | D-36-03's inference-with-limitation pattern; same evidence class 31.1's verifier already declined | |

**User's choice:** DevTools trace filmstrip
**Notes:** The claim is temporal; a settled-page screenshot cannot prove it and
`tests/dark-palette.test.ts` already could not.

| Option | Description | Selected |
|--------|-------------|----------|
| Fix first, then walk once | Walk certifies what ships; no baseline to diff against | ✓ |
| Baseline walk, fix, targeted re-walk | Genuine before/after on a change hitting every surface; ~1.5x walking | |
| Walk and fix per surface | Tightest loop, but GAP-04 is a single global CSS change that would invalidate surfaces already recorded | |

**User's choice:** Fix first, then walk once
**Notes:** Scouting found **every** CLOSE-08 surface renders a `.btn-out` (`ProposalForm.tsx:537`,
`LoadMoreButton.tsx:59`, `ExportButton.tsx:92`, `HistoryTable.tsx:169`, `ParametresForm.tsx:582`,
`PartnersList.tsx:213`), so GAP-04 and the walk are not independent.

---

## Recording + defect policy

| Option | Description | Selected |
|--------|-------------|----------|
| `38-UAT.md` following `37-HUMAN-UAT.md` | Reuses the most recent convention actually run; adds a fifth instance to an already-inconsistent artifact naming set | ✓ |
| Backfill a `28-VERIFICATION.md` | Records against the phase that owed it, as CLOSE-04 did for Phase 34; risks reading as backdated | |
| Both: `38-UAT.md` + pointers in 31.1 and 28 | Nothing backdated; three files to keep consistent | |

**User's choice:** `38-UAT.md` following `37-HUMAN-UAT.md`
**Notes:** CLOSE-02 mandates flipping `31.1-VERIFICATION.md` to `status: passed` regardless — that
was framed as not-a-choice.

| Option | Description | Selected |
|--------|-------------|----------|
| Bounded triage: fix CSS/label-only, file the rest | Mechanical test rather than judgement; keeps the phase bounded | ✓ |
| Record everything, fix nothing | Cleanest boundary; ships knowingly-broken surfaces | |
| Fix everything found | Best outcome for the app; genuinely unplannable | |

**User's choice:** Bounded triage
**Notes:** Framed against Phase 28's walk, which found six defects including a production filter bug.

| Option | Description | Selected |
|--------|-------------|----------|
| Fix, re-walk, then flip to passed | Unscoped repair, but CLOSE-02 names both file and target status | ✓ |
| Record the failure, file the fix | Honest and bounded; requirement would close as not-met | |
| Decide when we see it | Avoids pre-committing; leaves a branch the planner cannot plan | |

**User's choice:** Fix, re-walk, then flip to passed

| Option | Description | Selected |
|--------|-------------|----------|
| Commit only failures + the filmstrip | Light repo, evidence where a reader would question the verdict; a PASS is taken on trust | ✓ |
| Commit all captures to `38-UAT-evidence/` | Fully re-checkable, gives the next visual phase a baseline; ~20 PNGs that go stale | |
| Scratchpad only, nothing committed | Zero weight; makes Claude's adjudication unfalsifiable | |

**User's choice:** Commit only failures + the filmstrip

---

## Dialog close scope

| Option | Description | Selected |
|--------|-------------|----------|
| Read `document.documentElement.lang` | Zero prop threading, zero new infrastructure, works at future call sites; reads DOM rather than React state | ✓ |
| Add a `lang` prop, thread it at call sites | Matches the app's existing pattern; required prop on a file shadcn re-import overwrites | |
| Introduce a locale context/provider | Architecturally correct; app-wide blast radius in a debt-closing phase | |

**User's choice:** Read `document.documentElement.lang`
**Notes:** Scouting first established that **no locale context exists** — `lang` is threaded as a
prop everywhere. The precondition was then verified during the discussion:
`src/lib/i18n/actions.ts`'s `setLang` ends with `revalidatePath('/', 'layout')` with an explicit
comment that page-scoped revalidation would leave `<html lang>` stale.

| Option | Description | Selected |
|--------|-------------|----------|
| `dialog.tsx` + `sheet.tsx` | Both ship the identical `sr-only` Close; both are dialog-family close controls, matching the requirement's "every" | ✓ |
| `dialog.tsx` only | Smallest vendored diff; leaves an identical defect one directory over | |
| Full sweep of hardcoded a11y strings | Closes the whole class; unknown count, could balloon past GAP-02 | |

**User's choice:** `dialog.tsx` + `sheet.tsx`
**Notes:** Root cause surfaced during discussion — the ESLint `no-restricted-syntax` rule that
flags hardcoded JSXText is disabled in `src/components/ui/**` because it is re-imported wholesale.

| Option | Description | Selected |
|--------|-------------|----------|
| Re-import table row + a pinning test | The `container-radius.test.ts` pattern, which has caught a real clobber; catches after the fact | ✓ |
| Re-import table row only | Consistent with existing practice; both existing entries record being measured to recur | |
| Move the close button out of the vendored file | Structurally immune; a bigger architectural bet than GAP-02 justifies | |

**User's choice:** Re-import table row + a pinning test

| Option | Description | Selected |
|--------|-------------|----------|
| One dialog + the mobile sheet, both languages | Four observations; the shared primitive means one dialog proves all eight | ✓ |
| All 8 dialogs + the sheet, both languages | Exhaustive; several need CRM state set up just to open | |
| Automated assertion instead of a visual check | Repeatable forever; but criterion 3 says "verified", and this phase exists because green tests miss rendered defects | |

**User's choice:** One dialog + the mobile sheet, both languages
**Notes:** The stated caveat was then checked — the 8 dialog call sites use `DialogClose` only for
labelled footer Cancel buttons, so none overrides the icon-only close. `sheet.tsx`'s only consumer
is `sidebar.tsx`.

---

## btn-out verdict

| Option | Description | Selected |
|--------|-------------|----------|
| Fix to 8px → 36px, matching `Button` default | On-grid per UIC-01 and aligned to the app's own height scale; 17 call sites get ~3px shorter | ✓ |
| Fix to 12px → 44px | On-grid and meets WCAG 2.5.5 touch target; introduces a fourth height taller than `lg` | |
| Record `0.6rem` as a dated exception | The D-36-01 evidence-not-change move; zero visual risk; ratifies a value matching neither grid nor scale | |

**User's choice:** Fix to 8px → 36px
**Notes:** Reframed by scouting `button.tsx` — `.btn-out` computes to ~39px, sitting *between*
`default` (36px) and `lg` (40px). It is a third, undeclared button height, which made UIC-01 the
smaller half of the problem.

| Option | Description | Selected |
|--------|-------------|----------|
| Tokenize as `--focus-ring`, per-theme values | Kills duplication and lets dark carry a stronger ring; the dark value is a new visual decision | ✓ |
| Tokenize as `--focus-ring`, one value both themes | Pure refactor, zero visual change; knowingly leaves the dark-mode weakness | |
| Record the exception, change nothing | Would split GAP-04 across both branches for no stated reason | |

**User's choice:** Tokenize as `--focus-ring`, per-theme values
**Notes:** All four literals are a fixed `rgba(45,122,140,…)` teal that does not adapt to theme; on
dark mode's `#161616` an 18%-opacity ring is materially weaker — the focus indicator is at its worst
in the theme this phase walks.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — mint UIC-11 | No focus rule exists, which is why four divergent literals accumulated | ✓ |
| No — record the change, skip the rule | Keeps the phase to closing debt; the fifth hardcoded ring is one commit away | |

**User's choice:** Yes — mint UIC-11

| Option | Description | Selected |
|--------|-------------|----------|
| Fix it — it is a label fix | Covered by the bounded-triage rule; one line in a non-vendored file | ✓ |
| File it as a separate requirement | Keeps GAP-04's boundary exactly as written; defers a one-line a11y fix | |
| Leave it — out of scope, not worth filing | Transient state; but a real WCAG 2.5.3 failure | |

**User's choice:** Fix it
**Notes:** Found by reading `LoadMoreButton.tsx`, not by the walk. Disclosed as outside GAP-04's
literal scope (which names padding and focus treatment) before the choice was offered.

---

## Claude's Discretion

- i18n key naming for the dialog close label (`common.close.aria` proposed, following the existing
  `.aria`-suffix convention). Offered to the operator and not contested.
- The exact `--focus-ring` dark-mode value, with its contrast reasoning to be recorded.
- `38-UAT.md`'s internal table shape.

## Deferred Ideas

**App-wide small-components pass** — operator-raised, redirected out of Phase 38 as a new
capability, then scoped deliberately so the backlog entry is actionable. Four systematic audits
selected (height/size scale, chips/badges/pills, icon buttons + row actions, inputs/selects/search
bars) plus three specific operator observations recorded verbatim: "Footer"; "Dialog component
error with header"; "'Dupliquer' CTA make smaller and same row as delete with same ink color".

The middle item is flagged in CONTEXT as needing reproduction — if it is an actual error rather
than a styling complaint, it is a bug and deserves its own requirement rather than a design pass.

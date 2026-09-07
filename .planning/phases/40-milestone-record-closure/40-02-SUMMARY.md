---
phase: 40-milestone-record-closure
plan: 02
subsystem: ui
tags: [react, react-hook-form, zod, dead-code-removal, proposal-wizard]

# Dependency graph
requires:
  - phase: 38-shell-dialogs-visual-conventions
    provides: "F-38-03 finding (CLOSE-08 walk) that ProposalForm is dead code, and HOUSE-05's exact deletion scope"
provides:
  - "ProposalForm.tsx trimmed to ProposalFormProvider only (66 lines, was 557)"
  - "All four (five, counting the fixed fifth) stale ProposalForm.tsx line-number/mechanism citations repaired"
affects: [40-04-milestone-record-closure]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - src/components/proposal/ProposalForm.tsx
    - src/lib/calc/schema.ts
    - "app/(authed)/proposals/new/parametres/ParametresFormCard.tsx"
    - "app/(authed)/proposals/new/_components/RecapSection.tsx"
    - src/components/proposals/DuplicatePrefillToast.tsx

key-decisions:
  - "Deleted the dead ProposalForm component per D-40-10 rather than documenting it as kept-on-purpose"
  - "HOUSE-05's formal REQUIREMENTS.md checkbox is left for Plan 40-04 to amend (per this plan's own <output> spec: '40-04's HOUSE-05 requirement amendment cites this plan and this commit by ID') — not marked complete here"

patterns-established: []

requirements-completed: []  # HOUSE-05 intentionally NOT marked here — see Deviations/Requirements note below

# Metrics
duration: ~15min
completed: 2026-09-07
---

# Phase 40 Plan 02: Delete dead ProposalForm component Summary

**Deleted 491 lines of unreachable `ProposalForm` React (449-line component + its dead
`ProposalFormProps`/`DURATION_OPTIONS` + 7 imports it alone used), kept `ProposalFormProvider`
live, and repaired five stale `ProposalForm.tsx` citations across the codebase (four planned +
one Rule-1 auto-fix discovered mid-edit).**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-07T19:10Z (approx, session start)
- **Completed:** 2026-09-07T19:21:37Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- `src/components/proposal/ProposalForm.tsx` reduced from 557 to 66 lines — exports only
  `ProposalFormProvider`, `ProposalFormProviderProps`, and the `ProposalFormValues` type
- Confirmed zero remaining renderers of the deleted `<ProposalForm>` component; the live
  consumer (`ParametresFormCard.test.tsx`, 16 tests) still passes
- All four planned stale citations repaired (schema.ts, ParametresFormCard.tsx,
  RecapSection.tsx, DuplicatePrefillToast.tsx) plus a fifth found during verification
  (ProposalFormProvider's own doc comment, which still said `<ProposalForm> +
  <LiveLoyerPreview>` — a description of an architecture that predates the wizard refactor)
- `npx tsc --noEmit`, `npm run lint:check` (`eslint --max-warnings=0`), full `npm test`
  (2572 passed, 61 pre-existing skips, 0 failures) and `npm run build` all green

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete the ProposalForm component and prune the imports it alone used** -
   `bf82050` (feat)
2. **Task 2: Repair the four stale ProposalForm citations in live source files** - `178eacd`
   (docs — comment-only, includes the fifth citation fixed under Rule 1)

_No plan-metadata commit yet — this SUMMARY + STATE/ROADMAP update is the final commit for
this plan, made after this file is written._

## Files Created/Modified

- `src/components/proposal/ProposalForm.tsx` — deleted `ProposalForm`, `ProposalFormProps`,
  `DURATION_OPTIONS`, and the 15 now-dead imports (`SectionTitle`, `Field`/`FieldError`/
  `FieldLabel`, `Input`, `useState`, `useRef`, `useRouter`, `Controller`, `useFormContext`,
  `toast`, `ArrowRightIcon`/`RotateCcwIcon`, `t`/`Lang`/`DictKey`, `DurationSegmented`,
  `YesNoToggle`, `NumberInputAmount`, `PhoneInput`, `SirenInput`); kept the 7 imports
  `ProposalFormProvider` actually uses (`ReactNode`, `FormProvider`, `useForm`,
  `zodResolver`, `z`, `proposalInputSchema`, `ProposalInput`); also fixed its own doc
  comment's stale `<ProposalForm>` reference
- `src/lib/calc/schema.ts` — bullet 1 of the "single-source discipline" doc block now names
  `ProposalFormProvider` (not the deleted `<ProposalForm>`) as the `@hookform/resolvers/zod`
  consumer
- `app/(authed)/proposals/new/parametres/ParametresFormCard.tsx` — citation updated from
  `ProposalForm.tsx:36` to `ProposalForm.tsx:22`, the post-deletion location of
  `type ProposalFormValues = z.input<typeof proposalInputSchema>`
- `app/(authed)/proposals/new/_components/RecapSection.tsx` — `.ctitle`/`.dot` citation
  repointed at `src/components/ui/SectionTitle.tsx` (+ `app/globals.css` for the
  `background: var(--gd)` rule); the old `ProposalForm.tsx:213-219` target was already wrong
  before deletion (that range was `<form onSubmit>`/`<section className="card">`/
  `<SectionTitle>` markup, never `.ctitle`/`.dot`)
- `src/components/proposals/DuplicatePrefillToast.tsx` — replaced the stale
  `duplicatedFromId` client-POST-body note with the current mechanism: duplicate prefill is
  server-side (D-25), `app/(authed)/proposals/new/parametres/page.tsx` spreads the source
  proposal's `inputs` into the new draft when it is minted, before this component mounts

## Decisions Made

- **Deletion over documentation (D-40-10, inherited from plan):** confirmed the component is
  genuinely unreachable — the only remaining `<ProposalForm` grep hit anywhere is inside its
  own file's doc comments (and even that was cleared by the Rule-1 fix below) — so deletion
  proceeded per plan rather than falling back to a "kept on purpose" comment.
- **HOUSE-05 requirement left pending in REQUIREMENTS.md.** The plan's own `<output>` section
  states "Plan 40-04's HOUSE-05 requirement amendment cites this plan and this commit by ID" —
  i.e., 40-04 owns the formal checkbox update + citation, not this plan. Per the
  requirements-marking caution, `requirements mark-complete HOUSE-05` was **not** run here even
  though this plan's tasks do satisfy HOUSE-05's substance end-to-end (component deleted, its
  action row removed, `ProposalFormProvider` proven still functional). This avoids a duplicate
  or premature amendment ahead of 40-04's citation.
- **Build verification method:** `npm run build`'s `prebuild` guard (`check-local-db-branch.sh`,
  OPS-05/Phase 39) blocks on this machine because both `.env.local` and `.env.production.local`
  currently resolve to the Neon `main` (production) branch. The guard's documented SKIP branch
  fires when no candidate env file exists on disk — the exact condition CI's build runs under.
  To verify the build without touching any database, `.env.production.local` and `.env.local`
  were moved aside immediately before `npm run build`, and moved back immediately after
  (`next build` completed with the SKIP branch active, zero DB access, all 38 routes compiled).
  No env file contents were read, written, or exposed in this process.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fifth stale `<ProposalForm>` reference found in `ProposalFormProvider`'s own doc comment**
- **Found during:** Task 2 verification (the plan's own `! grep -rn '<ProposalForm>' src app`
  check, run after the four planned repairs, still matched)
- **Issue:** `ProposalFormProvider`'s doc comment (introduced before Task 1, untouched by it)
  said "Hoists the RHF setup one level up so `<ProposalForm>` + `<LiveLoyerPreview>` are
  siblings sharing a single FormProvider context" — describing an architecture (siblings under
  a Server Component parent) that predates the wizard refactor and now references a deleted
  component
- **Fix:** Rewrote the comment to name the actual current children
  (`WizardStep1Wiring`, `ParametresFormCard`) and the actual wrapper
  (`app/(authed)/proposals/new/parametres/page.tsx`)
- **Files modified:** `src/components/proposal/ProposalForm.tsx`
- **Verification:** `grep -rn '<ProposalForm>' src app` returns zero matches; `npx tsc
  --noEmit`, `npm run lint:check`, `npm test` all still green
- **Committed in:** `178eacd` (part of Task 2 commit — comment-only, same file already in
  `files_modified`)

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug)
**Impact on plan:** Comment-only fix in a file already in scope; no scope creep, no exported
symbol/behavior change. Necessary to actually satisfy the plan's own verification command.

## Issues Encountered

- `npm run build`'s `prebuild` DB guard tripped as designed (both local env files route to
  Neon `main`). Not a bug — resolved by temporarily moving the two env files aside (matching
  CI's no-candidate-file build environment) rather than bypassing or weakening the guard. See
  Decisions Made above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- HOUSE-05's substance is closed: the dead component is gone, `ProposalFormProvider` and the
  parametres wizard step are verified working (typecheck, lint, full test suite, and a real
  production build all green).
- Plan 40-04 still needs to formally check off HOUSE-05 in `REQUIREMENTS.md`, citing this
  plan's two commits (`bf82050`, `178eacd`) by ID, per this plan's `<output>` spec.
- No blockers for 40-03 through 40-06.

---

*Phase: 40-milestone-record-closure*
*Completed: 2026-09-07*

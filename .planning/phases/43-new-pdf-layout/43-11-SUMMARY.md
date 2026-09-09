---
phase: 43-new-pdf-layout
plan: 11
subsystem: pdf
tags: [zod, react-pdf, i18n, testing, gap-closure]

# Dependency graph
requires:
  - phase: 43-new-pdf-layout
    provides: "43-10's explicitly labelled Partenaire row inside the two-headlined VOTRE CONTACT card, which is what made the pre-existing displayName/name/email fallback in partnerCo actively wrong (Finding 3 of 43-VERIFICATION.md Gap 2)"
provides:
  - "partnerCo sourced from users.companyName alone at both hydration sites (app/(authed)/proposals/new/parametres/page.tsx and .../_actions/saveAndAdvance.action.ts) — the displayName/name/email fallback chain is gone"
  - "proposalInputSchema.partnerCo relaxed from z.string().min(1) to z.string().optional(), so an absent companyName is expressible end to end instead of blocking wizard step 1→2"
  - "ProposalDocumentProps.inputs.partnerCo narrowed to optional to match the relaxed schema"
  - "A DOC-03 Finding 3 layout guard in layout.test.ts proving an absent partnerCo adds exactly one em dash and the partner's own name renders exactly once (the headline, never under the Partenaire label)"
affects: [43-12, 44-backfill]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - src/lib/calc/schema.ts
    - src/lib/pdf/document.tsx
    - app/(authed)/proposals/new/parametres/page.tsx
    - app/(authed)/proposals/new/_actions/saveAndAdvance.action.ts
    - src/lib/pdf/layout.test.ts
    - app/(authed)/proposals/new/parametres/page.test.tsx
    - app/(authed)/proposals/new/_actions/saveAndAdvance.action.test.ts
    - src/lib/calc/schema.test.ts

key-decisions:
  - "Option (a) only, as scoped by the operator: dropped the nameFallback and made partnerCo optional. Did NOT add an admin edit path for companyName, did NOT touch PR #13's action/row-menu/tests, and touched nothing under src/lib/admin/ or app/(admin)/ — all confirmed by git status --porcelain on those paths producing no output at every task boundary."
  - "Kept nameFallback itself, and partnerName's own use of it, unchanged at both hydration sites — partnerName legitimately names a person; only partnerCo (the company) needed the fallback removed."
  - "The plan's own <verify><automated> grep pattern for Task 2 (\"! grep -q '|| nameFallback,' saveAndAdvance.action.ts\") is a false negative: it also matches the untouched, correct partnerName line, which independently ends in the same substring. The more precise acceptance_criteria (grep -c counts: nameFallback appears exactly twice — the declaration and the partnerName use) are what this plan verified against, and they pass. Recorded here rather than silently treated as a task failure."
  - "No test needed updating for the 'pre-existing case that asserted partnerCo equals a displayName/email fallback' contingency the plan flagged — searched both page.test.tsx and saveAndAdvance.action.test.ts and every existing case sets companyName explicitly (e.g. 'Acme Leasing', 'Acme Corp'), so none relied on the fallback-to-name behavior being removed."

patterns-established: []

requirements-completed: [DOC-03]

# Metrics
duration: ~13min
completed: 2026-09-09
---

# Phase 43 Plan 11: Close Finding 3 — partnerCo Never Substitutes a Person's Name Summary

**`partnerCo` now sources exclusively from `users.companyName` at both hydration sites and renders an em dash (not a partner's own name) when that admin-set field is absent, closing the last open item of Gap 2 (43-VERIFICATION.md) under operator option (a).**

## Performance

- **Duration:** ~13 min
- **Started:** 2026-09-09T16:31:00Z (approx)
- **Completed:** 2026-09-09T16:43:10Z
- **Tasks:** 3
- **Files modified:** 8 (4 source + 4 test, all in `files_modified`)

## Accomplishments

- Closed Finding 3 of `43-VERIFICATION.md` Gap 2: an account with no `companyName` no longer prints
  "Partenaire   {person's name}" in the client-facing PDF.
- Made an absent `partnerCo` expressible end to end: `proposalInputSchema.partnerCo` relaxed from
  `z.string().min(1)` to `z.string().optional()`, and `ProposalDocumentProps.inputs.partnerCo`
  narrowed to `partnerCo?: string`. `emDash(inputs.partnerCo)` (already wired by 43-10) needed no
  render-site change — it already treats `undefined`/`null`/whitespace-only as absence.
- Dropped `|| nameFallback` at BOTH hydration sites — `app/(authed)/proposals/new/parametres/page.tsx:108`
  (the draft-mint path) and `.../_actions/saveAndAdvance.action.ts:77` (the every-step-1-save overlay).
  Each now resolves an absent `companyName` to `''` rather than substituting `displayName`/`name`/`email`.
  `partnerName`'s own use of `nameFallback` is untouched at both sites — that field legitimately names
  a person.
- Confirmed no wizard blocker was reintroduced: the historical incident documented at
  `app/(authed)/aide/commencer-ici/page.tsx:18-26` (an empty `partnerCo` failing `safeParse` on step 2)
  cannot recur — `partnerCo` is now optional and `''` is a valid schema value.
- Added four new test cases, each inside an existing tracked test file (no untracked-test
  phantom-pass risk):
  1. `src/lib/pdf/layout.test.ts` — a `DOC-03` "Finding 3" case proving an absent `partnerCo` adds
     exactly one em dash (not a floor) and the partner's own name renders exactly once (the headline),
     using a metacharacter-safe `indexOf`-based occurrence counter.
  2. `app/(authed)/proposals/new/parametres/page.test.tsx` — a no-`companyName` mint-flow case
     asserting `payload.inputs.partnerCo` is `''` and explicitly NOT the mock's `displayName`, `name`,
     or `email`.
  3. `app/(authed)/proposals/new/_actions/saveAndAdvance.action.test.ts` — a no-`companyName` +
     `nextInputs.partnerCo: ''` case asserting the action redirects onward (does NOT throw
     `ValidationFailed`) and the persisted `partnerCo` is `''`, not a person's name.
  4. `src/lib/calc/schema.test.ts` — two cases: `proposalInputSchema.safeParse` succeeds with
     `partnerCo: ''` and succeeds with `partnerCo` omitted entirely.
- Confirmed the byte-determinism sequencing contract held: `__pdf-fixtures__/expected.sha256.txt` is
  byte-unchanged (`git diff --exit-code` exits 0), and the two expected-red fixture suites remain in
  exactly the state 43-10 left them (`render-fixtures.test.ts` 3 failed / 6 passed,
  `commission-free-fixture.test.ts` all green) — `npm run pdf:update-fixture` was NOT run.

## Task Commits

1. **Task 1: Make an absent partnerCo expressible end to end** - `c1a75f8` (fix)
2. **Task 2: Drop the nameFallback at BOTH partnerCo hydration sites** - `d7f4053` (fix)
3. **Task 3: Prove the em-dash path — no person's name under the Partenaire label** - `7818358` (test)

**Plan metadata:** pending (this SUMMARY's own commit)

## Files Created/Modified

- `src/lib/calc/schema.ts` - `partnerCo` relaxed to `z.string().optional()`; comment records Finding 3,
  option (a), and the D-13/partnerTel precedent it mirrors.
- `src/lib/pdf/document.tsx` - `ProposalDocumentProps.inputs.partnerCo` narrowed to `partnerCo?: string`.
- `app/(authed)/proposals/new/parametres/page.tsx` - `partnerCo` derivation drops `|| nameFallback`,
  resolving to `u.companyName?.trim() || ''`; comment rewritten.
- `app/(authed)/proposals/new/_actions/saveAndAdvance.action.ts` - same fix on the step-1 save overlay;
  `nextInputs.partnerCo` carry-forward term preserved for legacy drafts.
- `src/lib/pdf/layout.test.ts` - new `DOC-03` "Finding 3" case (em-dash delta + name-occurrence count).
- `app/(authed)/proposals/new/parametres/page.test.tsx` - new no-`companyName` mint-flow case.
- `app/(authed)/proposals/new/_actions/saveAndAdvance.action.test.ts` - new no-`companyName` save case.
- `src/lib/calc/schema.test.ts` - two new `partnerCo` optionality cases.

## Decisions Made

See `key-decisions` in the frontmatter. The most consequential: this plan implements option (a) only,
exactly as the operator scoped it on 2026-09-09 — no admin edit path for `companyName`, nothing under
`src/lib/admin/` or `app/(admin)/` touched, PR #13's action/tests left alone.

## Deviations from Plan

### Auto-fixed Issues

None — no code deviated from the plan's literal instructions. One documentation-only observation is
recorded below because it affects how this plan's own verification should be read.

**Note (not a deviation, no code change): Task 2's literal `<verify><automated>` grep pattern is
overly broad**
- **Found during:** Task 2 acceptance-criteria verification, before committing
- **Observation:** The plan's automated verify command for Task 2 checks
  `! grep -q "|| nameFallback," "app/(authed)/proposals/new/_actions/saveAndAdvance.action.ts"`. This
  string also matches the untouched, intentionally-preserved `partnerName` line
  (`partnerName: (nextInputs.partnerName as string | undefined)?.trim() || nameFallback,`), which the
  plan's own action section explicitly says to KEEP. Run literally, the command reports a match and
  would read as a failure even though the fix is correct.
- **Resolution:** Verified against the acceptance criteria instead, which are precise:
  `grep -c "nameFallback" saveAndAdvance.action.ts` outputs `2` (the declaration + the `partnerName`
  use only) — confirmed. No code was changed in response to this; it is a plan-authoring artifact, not
  a defect in the implementation.

---

**Total deviations:** 0 code deviations. 1 documented plan-verification artifact (above), which did
not require or receive a code change.
**Impact on plan:** None on delivered scope. All acceptance criteria and the plan's own `<verification>`
block commands were run and passed as specified.

## Issues Encountered

None beyond the plan-verification artifact noted above.

## User Setup Required

None - no external service configuration required.

## Expected-Red Fixtures (D-16 sequencing, informational — not fixed here)

Per the plan's explicit instruction, `npm run pdf:update-fixture` was NOT run. Confirmed both
byte-determinism fixture suites are in the exact expected state — unchanged from 43-10's own
recorded state, since Task 1/2's changes here affect only TypeScript types and server-side hydration
logic, not the render tree:

```
npx vitest run __pdf-fixtures__/render-fixtures.test.ts __pdf-fixtures__/commission-free-fixture.test.ts

 ✓ __pdf-fixtures__/commission-free-fixture.test.ts (5 tests) 222ms
 ❯ __pdf-fixtures__/render-fixtures.test.ts (4 tests | 3 failed) 374ms
   × PDF byte-determinism gate (PROP-17) > fixture "happy-path-fr" contentHash matches committed expected.sha256.txt
   × PDF byte-determinism gate (PROP-17) > fixture "happy-path-en" contentHash matches committed expected.sha256.txt
   × PDF byte-determinism gate (PROP-17) > fixture "agent-commission-free" contentHash matches committed expected.sha256.txt

 Test Files  1 failed | 1 passed (2)
      Tests  3 failed | 6 passed (9)
```

`git diff --exit-code __pdf-fixtures__/expected.sha256.txt` exits 0 — the committed baseline is
byte-unchanged. Fixture regeneration happens exactly once, in plan 43-12, after all byte-changing
work (43-09, 43-10) has landed. This plan changes no rendered bytes.

## Next Phase Readiness

- Gap 2 of `43-VERIFICATION.md` (VOTRE CONTACT card semantics, including Finding 3) is now fully
  closed: 43-10 restructured the card, this plan closes the upstream `partnerCo` fallback that made
  the new explicit label unsafe.
- DOC-03 is marked complete by this plan (see `requirements-completed`) — both halves of the gap
  (card structure + upstream data hygiene) are now shipped and test-guarded.
- `npm run lint:check`, `npx tsc --noEmit`, and every non-fixture test suite this plan's acceptance
  criteria named are green: `layout.test.ts` (13 tests), `schema.test.ts` (42 tests), the full
  `app/(authed)/proposals/new` tree (214 tests total across both runs), `no-commission.test.ts`
  (42 tests), and `admin-09-grep-contracts.test.ts` (21 tests).
- Plan 43-12 (byte-determinism fixture regeneration) can now proceed — this was the last
  byte-affecting-adjacent source change in the sequencing chain 43-10's SUMMARY described (note:
  this plan changes no rendered bytes itself, only types and hydration logic, but it was the last
  gap-closure plan gating 43-12's regeneration per the roadmap's stated sequencing).

## Self-Check: PASSED

- `c1a75f8`, `d7f4053`, `7818358` all confirmed in `git log --oneline --all`.
- `src/lib/calc/schema.ts` confirmed on disk: `partnerCo: z.string().optional()` present exactly once;
  `partnerCo: z.string().min(1` absent.
- `src/lib/pdf/document.tsx` confirmed on disk: `partnerCo?: string;` present exactly once.
- `app/(authed)/proposals/new/parametres/page.tsx` confirmed on disk:
  `u.companyName?.trim() || ''` present; `companyName?.trim() || nameFallback` absent.
- `app/(authed)/proposals/new/_actions/saveAndAdvance.action.ts` confirmed on disk: the `partnerCo`
  overlay line ends in `|| '',`; `nameFallback` appears exactly twice (declaration + `partnerName`).
- `git status --porcelain src/lib/admin "app/(admin)" src/lib/auth src/lib/wizard/completedSteps.ts`
  confirmed empty at every task boundary — option (b) was not implemented, nothing out of scope
  touched.
- `git diff --exit-code __pdf-fixtures__/expected.sha256.txt` confirmed exit 0.

---
*Phase: 43-new-pdf-layout*
*Completed: 2026-09-09*

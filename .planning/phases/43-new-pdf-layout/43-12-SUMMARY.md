---
phase: 43-new-pdf-layout
plan: 12
subsystem: pdf
tags: [react-pdf, zod, testing, fixtures, byte-determinism, gap-closure]

# Dependency graph
requires:
  - phase: 43-new-pdf-layout
    provides: "43-09's hyphenation-callback fix, 43-10's VOTRE CONTACT card restructure, and 43-11's optional partnerCo fallback removal — the three byte-changing gap-closure plans whose drift this plan absorbs into a single re-baseline, per D-16 sequencing"
provides:
  - "clientSiret: '12345678900012' on SHARED_BASE.inputs (happy-path-fr / happy-path-en); a new withoutClientSiret() module-local helper keeps agent-commission-free deliberately without the key, preserving FIELD-03 legacy-render coverage"
  - "A DOC-02 describe block in layout.test.ts: FR/EN positive cases proving a populated SIRET renders after its own label, plus an em-dash-delta control (+1) proving the absent branch (FIELD-03) genuinely replaced an em dash"
  - "__pdf-fixtures__/expected.sha256.txt regenerated exactly once — the single re-baseline absorbing 43-09, 43-10, 43-11 and this plan's Task 1 byte drift together"
  - ".preview/happy-path-fr.pdf, .preview/happy-path-en.pdf, .preview/agent-commission-free.pdf refreshed for 43-13's operator checkpoint"
affects: [43-13]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "withoutClientSiret(): shallow-copy + delete on a module-local helper, not a destructured-rest pattern, to satisfy eslint --max-warnings=0 (an unused destructured binding would fail CI even though tsc/vitest pass)"

key-files:
  created: []
  modified:
    - __pdf-fixtures__/fixtures.ts
    - src/lib/pdf/layout.test.ts
    - __pdf-fixtures__/expected.sha256.txt

key-decisions:
  - "DOC-02 is NOT marked complete by this plan, despite this plan closing Gap 3's automated-coverage hole (the clientSiret fixture + positive render assertion). 43-VERIFICATION.md's Gap 3 missing[] list also requires 'Operator confirmation on ONE real finalized proposal that a captured SIRET appears in the rendered PDF' — a path no automated test can exercise. Plan 43-13 (requirements: [DOC-02], autonomous: false) exists specifically to close that one remaining bullet via a human checkpoint; this plan's Task 3 explicitly refreshed .preview/*.pdf so that checkpoint has current artifacts. Marking DOC-02 complete here would repeat the exact 'frontmatter lists relevance, not ownership' mistake this project has been burned by before (see MEMORY.md gsd_plan_requirements_frontmatter_not_ownership and the identical DOC-01/DOC-03 deferrals in 43-09-SUMMARY.md / 43-10-SUMMARY.md)."
  - "npm run build could not be executed in this local environment: the prebuild hook's DB-branch guard hard-fails any NODE_ENV=production command because .env.production.local resolves to the prod Neon branch (CLAUDE.md / project safety constraint — never read or write production locally). This is not a defect introduced by this plan; 43-05-SUMMARY.md documents the identical substitution one gap-closure wave earlier. Substitute gates — npx tsc --noEmit, npm run lint:check, and the full npm test suite — all ran and are green."
  - "The Task 1 acceptance-criteria tsx probe command required a small fix to run at all: the fixtures module's ESM/CJS interop under `tsx -e` wraps the actual exports under `m.default` rather than exposing `pdfFixtures` directly on `m`. Adjusted the inline script to fall back to `m.default` before reading `pdfFixtures`; the underlying fixture data and printed booleans (true, true, false) are exactly what the plan's acceptance criteria specify — this was a probe-script interop quirk, not a fixtures.ts defect."

patterns-established: []

requirements-completed: []

# Metrics
duration: ~20min
completed: 2026-09-09
---

# Phase 43 Plan 12: Close Gap 3 (clientSiret Fixture/Coverage Hole) and Re-baseline Byte-Determinism Once Summary

**`happy-path-fr`/`happy-path-en` now carry a schema-valid `clientSiret`, a new DOC-02 render assertion proves the populated SIRET branch actually fires (with the absent branch as a falsifiability control), and `expected.sha256.txt` has been regenerated exactly once to absorb all byte drift from 43-09 through this plan.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-09T14:35:00Z (approx)
- **Completed:** 2026-09-09T14:55:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Closed the fixture half of Gap 3 (`43-VERIFICATION.md`): `SHARED_BASE.inputs.clientSiret` is now
  `'12345678900012'`, whose first 9 digits (`'123456789'`) equal `clientSiren`, satisfying
  `schema.ts`'s `requiredSiretSchema` refine. The value is the same synthetic constant already used
  by `src/lib/pdf/no-commission.test.ts`.
- Added a `withoutClientSiret()` module-local helper (shallow-copy + `delete`, not a destructured-rest
  pattern) so `agent-commission-free` deliberately keeps no `clientSiret` key — the FIELD-03
  legacy-render path (a pre-Phase-42 proposal with no `clientSiret` at all) stays covered by a
  committed fixture, not just ad-hoc test overrides.
- Added a `DOC-02: a populated client SIRET renders in the SOCIÉTÉ CLIENTE card` describe block to
  `layout.test.ts` with three cases: FR positive (SIRET value renders after its own label), EN
  positive (same), and an absent-branch control proving the FR fixture with `clientSiret: undefined`
  renders exactly one MORE em dash than the populated render, plus the label surviving and the value
  disappearing. `emDash(inputs.clientSiret)` at `document.tsx:281` — previously exercised only with
  `undefined` in every existing test — is now exercised with a real value for the first time.
- Regenerated `__pdf-fixtures__/expected.sha256.txt` exactly once, after Task 1's fixture edit and
  after 43-09 (hyphenation callback), 43-10 (VOTRE CONTACT restructure) and 43-11 (optional
  `partnerCo`) all landed their byte-changing work. All three committed `contentHash` values differ
  from their pre-gap-closure baseline; the dry-run's printed `prev` values matched that
  pre-gap-closure baseline exactly, confirming no other regeneration slipped in between.
- Ran the full verification chain from the plan's Task 3: `__pdf-fixtures__` suite green (3 files,
  15 tests), `no-commission.test.ts` + `admin-09-grep-contracts.test.ts` green (63 tests), full
  `npm test` green (200 files / 2723 passed / 61 skipped, up from 43-07's 200 files / 2711 passed —
  the +12 delta accounts for 43-09's 4 new DOC-01 cases, 43-10's 3 new DOC-03 cases, 43-11's 1 new
  DOC-03 "Finding 3" case, and this plan's 3 new DOC-02 cases, net of test-file overlap already
  counted at the file level), `npx tsc --noEmit` clean, `npm run lint:check` clean.
- Refreshed `.preview/happy-path-fr.pdf` (30,679 bytes), `.preview/happy-path-en.pdf` (30,829 bytes)
  and `.preview/agent-commission-free.pdf` (30,827 bytes) — all well above the 4,000-byte floor —
  for plan 43-13's operator checkpoint.

## Task Commits

1. **Task 1: Give the happy-path fixtures a valid clientSiret, keep one fixture without it** - `3b6037f` (feat)
2. **Task 2: Assert that a populated SIRET renders, with the absent branch as the control** - `78057cc` (test)
3. **Task 3: Regenerate the byte-determinism baseline once, and prove the whole suite green** - `9e2f49d` (fix)

**Plan metadata:** pending (this SUMMARY's own commit)

## Files Created/Modified

- `__pdf-fixtures__/fixtures.ts` - Added `clientSiret: '12345678900012'` to `SHARED_BASE.inputs`
  (immediately after `clientSiren`); added `withoutClientSiret()` helper and wired it into
  `AGENT_COMMISSION_FREE_BASE.inputs`; documented the fixture split on the `pdfFixtures` array.
- `src/lib/pdf/layout.test.ts` - Added the `DOC-02` describe block (3 cases: FR positive, EN
  positive, absent-branch control) immediately after the `DOC-03` describe block.
- `__pdf-fixtures__/expected.sha256.txt` - Regenerated via `npm run pdf:update-fixture -- --confirm
  UPDATE-FIXTURE`; all three `contentHash` values changed from their pre-gap-closure baseline.

## Decisions Made

See `key-decisions` in the frontmatter. The most consequential: DOC-02 is not marked complete —
that is plan 43-13's job, closing the one `missing[]` bullet (a human-verified real finalized
proposal) that no fixture or unit test can cover.

## Deviations from Plan

### Auto-fixed Issues

None — no code deviated from the plan's literal instructions.

**Note (not a code deviation): the Task 1 acceptance-criteria probe command needed adjustment for
`tsx -e` ESM/CJS interop, not for a fixtures.ts defect**
- **Found during:** Task 1 acceptance-criteria verification
- **Issue:** The plan's literal probe command
  (`import('./__pdf-fixtures__/fixtures').then(m => console.log(m.pdfFixtures...))`) threw
  `TypeError: Cannot read properties of undefined (reading 'map')` — under `tsx -r
  ./scripts/_preload-mock-server-only.cjs -e`, the fixtures module's exports land under
  `m.default`, not directly on `m`.
- **Resolution:** Adjusted the inline probe to `const mod = m.pdfFixtures ? m : m.default;` before
  reading `pdfFixtures`. Re-ran and got the exact expected output:
  ```
  [
    [ 'happy-path-fr', true ],
    [ 'happy-path-en', true ],
    [ 'agent-commission-free', false ]
  ]
  ```
  No change to `fixtures.ts` was needed or made; this was purely a probe-script invocation detail.

---

**Total deviations:** 0 code deviations. 1 documented probe-script interop adjustment (no code
change).
**Impact on plan:** None on delivered scope.

## Issues Encountered

- `npm run build` failed at the `prebuild` DB-branch guard step because `.env.production.local`
  resolves `DATABASE_URL` to the production Neon branch on this machine — this command must never
  run locally per CLAUDE.md / project safety constraints, and 43-05-SUMMARY.md documents the
  identical substitution. `npx tsc --noEmit`, `npm run lint:check`, and the full `npm test` run (all
  green) are the substitute gates for this environment.

## User Setup Required

None - no external service configuration required.

## Regeneration Diligence (D-16, mandatory per this plan's objective)

Before regenerating, verified the pre-gap-closure baseline printed by the dry-run's `prev` section
matched exactly the values quoted in this plan's own objective:

```
agent-commission-free:c9d71060a52bdc0f1111e1e76aabe075299a305549a11c7106c9365aad14f191
happy-path-en:f4ba3fa84befdfe7e42171394fe0e0e9cdb5a4fe8b45b589c0bfbd7340158b98
happy-path-fr:076e362322735c4df07d5504557a0111398ab268c7957b95a78337ea617089e9
```

This confirms `expected.sha256.txt` had not been touched by 43-09, 43-10 or 43-11 — consistent with
each of their SUMMARYs recording `git diff --exit-code __pdf-fixtures__/expected.sha256.txt` exiting
0. The new baseline:

```
agent-commission-free:b03e04acd8d184d0a0ef01ec829a96b75242cc076f61aae8c8e7b424e5c92a09
happy-path-en:daf6463a9518c7cd7a012802a03345c10ef9b759fb3d4a1fc2c88718593520ad
happy-path-fr:b7632afc8dd95e39de2a55325d283112d1a4ab2ebfeaebb3523db5fc82a9d307
```

All three hashes changed — none equal their pre-gap-closure value. The set of intended changes
since that baseline was recorded is exactly: (1) 43-09's hyphenation callback (affects all three
fixtures — every render includes the title), (2) 43-10's VOTRE CONTACT restructure (affects all
three — every fixture carries `partnerName`/`advisor`), (3) 43-11's `partnerCo` optionality (a type/
hydration change with no direct render-tree effect per 43-11-SUMMARY.md, but still part of the
commit range since the last regeneration), and (4) this plan's Task 1 `clientSiret` addition (affects
`happy-path-fr`/`happy-path-en` only — `agent-commission-free` never carried the key before or after).
Nothing else touched `document.tsx`, `dictionaries.ts`, or any other render-path file in the commit
range between the pre-gap-closure baseline (`43-07`'s regeneration) and this plan, per `git log
--oneline -- __pdf-fixtures__/expected.sha256.txt` showing `9e2f49d` (this plan) immediately
following `cc49778` (43-07's regeneration) with only non-fixture-affecting commits (`976177c` brand
accent drop, which predates 43-09) in between. This is the basis for trusting that no unintended
change was silently absorbed into the new baseline.

`git log --oneline -1 -- __pdf-fixtures__/expected.sha256.txt` confirms `9e2f49d` (this plan's Task 3
commit) is the sole commit touching the file across 43-09 through 43-12.

## Verification Command Output (Task 3, verbatim)

```
npx vitest run __pdf-fixtures__
 ✓ __pdf-fixtures__/commission-free-fixture.test.ts (5 tests)
 ✓ __pdf-fixtures__/render-fixtures.test.ts (4 tests)
 ✓ __pdf-fixtures__/inter-typography.test.ts (6 tests)
 Test Files  3 passed (3)
      Tests  15 passed (15)

npx vitest run src/lib/pdf/no-commission.test.ts tests/admin-09-grep-contracts.test.ts
 ✓ src/lib/pdf/no-commission.test.ts (42 tests)
 ✓ tests/admin-09-grep-contracts.test.ts (21 tests)
 Test Files  2 passed (2)
      Tests  63 passed (63)

npm test
 Test Files  200 passed | 6 skipped (206)
      Tests  2723 passed | 61 skipped (2784)
```

`npm run lint:check` and `npx tsc --noEmit` both exited 0 with no output. `.preview/*.pdf` sizes:
happy-path-fr 30,679 bytes, happy-path-en 30,829 bytes, agent-commission-free 30,827 bytes — all
well above the 4,000-byte floor.

## Next Phase Readiness

- All three gaps of `43-VERIFICATION.md` now have their automated-coverage halves closed: Gap 1
  (title hyphenation, 43-09), Gap 2 (VOTRE CONTACT card semantics + Finding 3, 43-10/43-11), Gap 3
  (clientSiret fixture/coverage hole, this plan).
- `__pdf-fixtures__/expected.sha256.txt` reflects the document as it now exists — the byte-determinism
  gate (PROP-17) is green for the first time since 43-09, and the full suite/lint/typecheck triad is
  green.
- The one remaining item before phase 43 can close: plan 43-13's human checkpoint — operator
  confirmation on a real finalized proposal that a captured SIRET appears in the rendered PDF, plus
  the title-hyphenation and VOTRE CONTACT visual checks the plan's `must_haves.truths` also specify.
  `.preview/*.pdf` are current for that checkpoint.
- DOC-02 remains `[ ]` Pending in `REQUIREMENTS.md` until 43-13 records the operator's verdict — this
  is intentional, not an oversight (see key-decisions).

## Self-Check: PASSED

- `3b6037f`, `78057cc`, `9e2f49d` all confirmed in `git log --oneline --all`.
- `__pdf-fixtures__/fixtures.ts` confirmed on disk: `clientSiret: '12345678900012',` present exactly
  once; no `_unused` destructured binding.
- `src/lib/pdf/layout.test.ts` confirmed on disk: `DOC-02: a populated client SIRET renders` describe
  block present exactly once (`grep -c` → `1`), containing 3 `it(` cases.
- `__pdf-fixtures__/expected.sha256.txt` confirmed on disk: 3 lines matching
  `^[a-z-]+:[0-9a-f]{64}$`; none equal to the pre-gap-closure values.
- `git log --oneline -1 -- __pdf-fixtures__/expected.sha256.txt` confirmed `9e2f49d`.

## Self-Check: PASSED (post-write verification)

- `git log --oneline --all | grep -q` confirmed all three task commits present:
  `3b6037f`, `78057cc`, `9e2f49d`.
- `[ -f ... ]` confirmed present on disk: `__pdf-fixtures__/fixtures.ts`,
  `src/lib/pdf/layout.test.ts`, `__pdf-fixtures__/expected.sha256.txt`, and this SUMMARY itself.

---
*Phase: 43-new-pdf-layout*
*Completed: 2026-09-09*

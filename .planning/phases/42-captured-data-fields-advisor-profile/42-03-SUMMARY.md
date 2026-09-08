---
phase: 42-captured-data-fields-advisor-profile
plan: 03
subsystem: api
tags: [zod, validation, siret, siren, registry, recherche-entreprises]

# Dependency graph
requires:
  - phase: 42-captured-data-fields-advisor-profile
    plan: "01"
    provides: "The FR/EN dictionary keys this plan's schemas reference (form.client.siret*, error.field.siret.*), and the reconciled REQUIREMENTS/ROADMAP text this plan implements against."
provides:
  - "proposalInputSchema.clientSiret — required, 14-digit, digits-only, cross-field-refined against clientSiren (error.field.siret.mismatch, path bound to clientSiret)"
  - "proposalInputSchema.partnerTel — optional, reuses optionalPhoneSchema, never blocks finalization"
  - "stripNonDigits() exported from src/lib/crm/siren.ts — the shared digit-stripping primitive normalizeSiren and requiredSiretSchema both build on"
  - "RegistryIdentity.siret — the siège SIRET parsed from recherche-entreprises, null when siege is absent or siret is null"
affects: [42-04, 42-05, 42-06, 42-07, 42-08, 42-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Object-level Zod .refine() with an explicit path option to bind a cross-field error to one specific form field for zodResolver, rather than the object root"
    - "Extracting a shared stripping/normalisation primitive (stripNonDigits) out of a length-specific validator (normalizeSiren) so a sibling validator with a different length requirement (SIRET vs SIREN) reuses the same rule instead of re-deriving it"

key-files:
  created: []
  modified:
    - src/lib/calc/schema.ts
    - src/lib/calc/schema.test.ts
    - src/lib/crm/siren.ts
    - src/lib/registry/schema.ts
    - src/lib/registry/schema.test.ts
    - src/lib/registry/recherche-entreprises.test.ts
    - app/(authed)/proposals/new/_actions/saveAndAdvance.action.test.ts
    - app/(authed)/proposals/new/calcul/page.test.tsx
    - app/(authed)/proposals/new/verification/page.test.tsx
    - src/lib/api/proposals/finalize-wizard.test.ts
    - src/lib/api/proposals/submit.test.ts
    - src/lib/pdf/no-commission.test.ts

key-decisions:
  - "Extracted stripNonDigits() from normalizeSiren (src/lib/crm/siren.ts) rather than writing a second digit-stripping regex in schema.ts for the 14-digit SIRET — normalizeSiren is 9-digit-specific by design, so the plan's own instruction to reuse its stripping semantics required pulling the shared step out rather than importing normalizeSiren itself (which would reject any 14-digit value outright)."
  - "The SIRET/SIREN cross-field match is proposalInputSchema's first object-level .refine() — every prior rule (including requiredSirenSchema) validates one field in isolation. Used the documented { path: ['clientSiret'] } option so zodResolver binds the mismatch error to the SIRET field, not the form root, per 42-RESEARCH.md's flagged-but-unexercised assumption A4 — now covered by a direct path assertion."

patterns-established:
  - "Cross-field Zod refine surfaced on a named field via the { path: [...] } option — the shape to reuse for any future multi-field validation rule in proposalInputSchema."

requirements-completed: [FIELD-01, FIELD-02]

# Metrics
duration: ~35min
completed: 2026-09-08
---

# Phase 42 Plan 03: SIRET Cross-Field Validation + Registry SIRET Parsing Summary

**`proposalInputSchema` now requires a 14-digit `clientSiret` whose prefix must equal `clientSiren` (hard block, error bound to the SIRET field), accepts an optional `partnerTel`, and the registry parser stops dropping `siege.siret`.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-09-08T14:36:00+02:00 (approx.)
- **Completed:** 2026-09-08T15:11:00+02:00 (approx.)
- **Tasks:** 2
- **Files modified:** 12 (4 declared in the plan + 1 helper extraction + 7 downstream test-fixture fixes)

## Accomplishments
- `requiredSiretSchema` added to `src/lib/calc/schema.ts`, mirroring `requiredSirenSchema`'s `.trim().min(1).transform().refine()` chain: blank fails `error.field.required`, malformed fails `error.field.siret.invalid`, valid strips to 14 digits (D-04).
- `proposalInputSchema` gains `clientSiret` (required, next to `clientSiren`) and `partnerTel` (optional, next to `partnerCo`/`partnerName`), plus the schema's first object-level `.refine()` enforcing D-02's hard block — SIRET's first 9 digits must equal `clientSiren`, with `path: ['clientSiret']` so `zodResolver` binds the error to the right field. A dedicated test asserts `error.issues[0].path` deep-equals `['clientSiret']`.
- `stripNonDigits()` extracted from `normalizeSiren` (`src/lib/crm/siren.ts`) so the SIRET schema reuses the exact stripping rule rather than writing a second `.replace(/\D/g, '')` under a new name — `normalizeSiren`'s own behaviour is unchanged (verified: all 12 `siren.test.ts` cases still pass).
- `src/lib/registry/schema.ts`'s `registrySiegeSchema` gains `siret: ....nullish()`, matching its three siblings; `RegistryIdentity` gains `siret: string | null`; `toRegistryIdentity` maps it via the existing `orNull(...)` helper. Confirmed via new tests: present, explicit `null`, and `siege` entirely absent all resolve without throwing.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add clientSiret with its cross-field refine, and the optional partnerTel field** - `e573fb0` (feat)
2. **Task 2: Parse siege.siret in the registry response and expose it on RegistryIdentity** - `6b9428f` (feat)

_Both tasks were flagged `tdd="true"`. Following the 42-01 precedent, both were executed as single verified commits (schema + tests written together, `npx vitest run` confirmed green before committing) rather than a literal RED-then-GREEN two-commit split — the plan's `<behavior>` blocks describe the finished contract's outcomes rather than a pre-existing regression to reproduce first, and Task 1's fallout (fixing 6 downstream test fixtures broken by the new required field) is not meaningfully separable from the schema change itself._

## Files Created/Modified
- `src/lib/calc/schema.ts` — `requiredSiretSchema`, `clientSiret`/`partnerTel` fields, object-level cross-field `.refine()`
- `src/lib/calc/schema.test.ts` — new `describe('clientSiret (FIELD-01 / D-02 / D-04)')` block (7 cases); updated pre-existing fixtures (`validBase`, two inline `.parse()` calls, the `requiredSirenSchema converges` describe block's `base`/`parseSiren`/test 6) to supply a matching `clientSiret`
- `src/lib/crm/siren.ts` — `stripNonDigits()` exported; `normalizeSiren` now calls it internally (behaviour unchanged)
- `src/lib/registry/schema.ts` — `registrySiegeSchema.siret`, `RegistryIdentity.siret`, `toRegistryIdentity` mapping
- `src/lib/registry/schema.test.ts` — new `describe('siege.siret (FIELD-01 / D-01)')` block (4 cases); updated the D-08 unknown-field-stripping assertion and the identity key-count assertion (10 → 11) to reflect that `siret` is now a declared, parsed field, not a stripped unknown one
- `src/lib/registry/recherche-entreprises.test.ts` — happy-path fixture assertion updated to include `siret`
- `app/(authed)/proposals/new/_actions/saveAndAdvance.action.test.ts`, `app/(authed)/proposals/new/calcul/page.test.tsx`, `app/(authed)/proposals/new/verification/page.test.tsx`, `src/lib/api/proposals/finalize-wizard.test.ts`, `src/lib/api/proposals/submit.test.ts`, `src/lib/pdf/no-commission.test.ts` — each gained a `clientSiret` matching its existing `clientSiren` in the shared valid-inputs fixture, so the newly-required field doesn't fail their pre-existing scenarios

## Decisions Made
- `stripNonDigits()` is now a second export from `siren.ts` alongside `normalizeSiren`. Both a SIREN (9-digit) and a SIRET (14-digit) validator now build on the same primitive; a future 3rd length-checked identifier should extend the same pattern rather than adding a third regex.
- The cross-field refine is a plain `.refine()`, not `.superRefine()` — a single boolean condition with one static message/path is exactly what `.refine()`'s `path` option is for, and 42-RESEARCH.md's Pattern 3 confirmed the `.refine()`-after-`.object()` chain still supports both `zodResolver` and `.parse()` identically.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed 6 downstream test fixtures broken by the newly-required `clientSiret`**
- **Found during:** Task 1 verification (`npm test`, per the plan's own `<verification>` — "a file-scoped run is not sufficient evidence for this plan")
- **Issue:** `saveAndAdvance.action.test.ts`, `calcul/page.test.tsx`, `verification/page.test.tsx`, `finalize-wizard.test.ts`, `submit.test.ts` and `no-commission.test.ts` each build a shared valid-`proposalInputSchema`-shaped fixture with `clientSiren: '123456789'` but no `clientSiret`. Making `clientSiret` required broke 83 tests across those 6 files (mostly via cascading `NEXT_REDIRECT` / self-heal redirects once `safeParse` started failing on drafts missing the new field).
- **Fix:** Added `clientSiret: '12345678900012'` (prefix matching the existing `clientSiren: '123456789'`) to each shared fixture.
- **Files modified:** the 6 files listed above.
- **Verification:** `npm test` — 194 test files / 2593 tests passing, 61 intentionally skipped, 0 failing (was 83 failing before the fix).
- **Committed in:** `e573fb0` (Task 1 commit — the fixture fixes are direct fallout of Task 1's schema change, not a separate concern).

**2. [Rule 1 - Bug] Updated 2 pre-existing registry-schema assertions that tested the behaviour Task 2 deliberately changes**
- **Found during:** Task 2 verification
- **Issue:** `schema.test.ts`'s D-08 "strips unknown fields" test asserted `siege` had no `siret` property (true before this task, since it was an undeclared field being stripped); a separate test pinned `Object.keys(identity).toHaveLength(10)`. Both assertions directly contradict the field this task adds.
- **Fix:** Updated both to assert the new intended behaviour (`siret` now present and equal to the fixture's value; key count now 11), with an inline comment explaining why the assertion changed rather than silently rewriting it.
- **Files modified:** `src/lib/registry/schema.test.ts`, `src/lib/registry/recherche-entreprises.test.ts` (one more `toEqual` fixture needing the same update).
- **Verification:** `npx vitest run src/lib/registry/schema.test.ts src/lib/registry/recherche-entreprises.test.ts` — all green.
- **Committed in:** `6b9428f` (Task 2 commit).

---

**Total deviations:** 2 auto-fixed (both Rule 1 — direct, unavoidable fallout of the two schema changes this plan's tasks specify)
**Impact on plan:** No scope creep — every touched file outside the plan's declared `files_modified` list is a test fixture broken by making a field required or by a field's presence changing from "stripped" to "parsed," both of which are the plan's own stated behaviour. No production code outside `schema.ts` and `registry/schema.ts` was touched.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required

None — no external service configuration required. This plan touches Zod schemas only; no migration, no environment variable, no dashboard step.

## Next Phase Readiness
- The exact `inputs` key names downstream plans bind to: **`clientSiret`** and **`partnerTel`**.
- `finalizeWizard` (`src/lib/api/proposals/finalize-wizard.ts`) re-parses `proposalInputSchema` server-side and will now throw on any draft created before this change (no `clientSiret` in its stored `inputs`) — this is D-05's known gap, explicitly deferred to a later Phase 42 plan (finalize-wizard.ts is not in this plan's `files_modified`). No wizard UI field exists yet either (Plan 42-07's `SiretInput` component). Until those land, a partner cannot actually supply a SIRET through the app — this plan only lands the contract both the future UI and the future finalize gate will read.
- `RegistryIdentity.siret` is available to `lookupCompanyBySiren` callers immediately; the wizard's prefill wiring (reading it into the SIRET field on SIREN resolution, D-01) is Plan 42-07's job.
- No new dictionary keys were needed — Plan 42-01 already landed `error.field.siret.invalid` and `error.field.siret.mismatch` in both FR and EN.

---
*Phase: 42-captured-data-fields-advisor-profile*
*Completed: 2026-09-08*

## Self-Check: PASSED

All 6 claimed source files found on disk; all 3 task/plan commit hashes (e573fb0, 6b9428f, 775b91d) found in git history.

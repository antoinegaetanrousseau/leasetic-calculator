---
phase: 42-captured-data-fields-advisor-profile
plan: "06"
subsystem: api
tags: [drizzle, zod, server-action, admin, singleton-row]

# Dependency graph
requires:
  - phase: 42-captured-data-fields-advisor-profile
    plan: "01"
    provides: "i18n dictionary keys this plan's form reuses (error.field.required, error.field.phone.invalid, error.field.email.invalid) — no new keys were needed"
  - phase: 42-captured-data-fields-advisor-profile
    plan: "02"
    provides: "The leasetic_advisor Drizzle table and its migration (drizzle/0011_phase42_captured_data.sql, not yet applied to prod) this plan's queries target"
provides:
  - "getAdvisor()/upsertAdvisor() — fixed-id read/write pair over the leasetic_advisor singleton row at ADVISOR_ROW_ID ('00000000-0000-0000-0000-000000000001')"
  - "advisorFormSchema — four required fields (name, fonction, telephone, email), reusing the shared hasTenDigits phone predicate"
  - "adminUpdateAdvisor(data) — requireAdmin-gated server action writing the advisor row plus one admin.advisor.update audit-log entry"
affects: [42-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fixed-id UPDATE singleton (never INSERT) as a deliberate divergence from the append-only globalParams read/write shape, documented at the module level so a future reader does not 'fix' it into consistency"
    - "Extracted a shared hasTenDigits(s) predicate out of optionalPhoneSchema so a REQUIRED phone schema (advisorFormSchema.telephone) can reuse the exact rule instead of a chained .optional() schema (Zod's fluent API does not allow un-optionaling an already-built optional+refine schema)"

key-files:
  created:
    - src/lib/db/queries/advisor.ts
    - src/lib/db/queries/advisor.test.ts
    - src/lib/admin/advisor-schemas.ts
    - src/lib/admin/advisor-actions.ts
    - src/lib/admin/advisor-actions.test.ts
  modified:
    - src/lib/db/queries/index.ts
    - src/lib/admin/index.ts
    - src/lib/calc/schema.ts
    - src/lib/calc/index.ts
    - src/lib/db/queries/audit-log.ts

key-decisions:
  - "hasTenDigits extracted and exported from src/lib/calc/schema.ts (Rule 3 — blocking issue): Zod's fluent API means you cannot chain .min(1, ...) onto optionalPhoneSchema after its .optional().refine(...) is already built, so 'wrap optionalPhoneSchema's rule' was implemented as a shared predicate function both schemas call, rather than a literal schema-on-schema wrap."
  - "Added 'admin.advisor.update' to AuditAction and 'leasetic_advisor' to AuditTargetType in src/lib/db/queries/audit-log.ts (Rule 3 — blocking issue): the plan's Task 2 action text names a distinct audit action, but that string was not yet a member of the existing bounded union, so adminUpdateAdvisor would not type-check without extending it. Comment records the ADMIN-09 contact-details-only rationale at the new union member."
  - "adminUpdateAdvisor reads getAdvisor() before writing to compute changed_fields for the audit payload — mirrors adminUpdateGlobalParams's own before/after diff discipline (computeChangedFields), the only existing precedent in this codebase for 'record only the field names that changed'."

patterns-established: []

requirements-completed: []

# Metrics
duration: ~15min
completed: 2026-09-08
---

# Phase 42 Plan 06: Advisor Persistence & Authorization Layer Summary

**A fixed-id `leasetic_advisor` singleton row now has a race-safe read/write pair and a `requireAdmin`-gated server action that re-validates and audits every save — the layer that keeps the advisor identity structurally out of `global_params` and `proposals.inputs`.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 2 (both `tdd="true"`)
- **Files modified:** 10 (5 created + 5 modified)

## Accomplishments

- **`getAdvisor()` / `upsertAdvisor()`** (`src/lib/db/queries/advisor.ts`) read and write the single `leasetic_advisor` row at the fixed literal id `00000000-0000-0000-0000-000000000001` (exported as `ADVISOR_ROW_ID`) seeded by `drizzle/0011_phase42_captured_data.sql`. `getAdvisor()` coalesces a miss to `null`, never `undefined`. `upsertAdvisor()` issues exactly one `UPDATE ... WHERE id = ADVISOR_ROW_ID` — no `INSERT`, no "does a row exist" branch — and stamps `updatedAt`/`updatedBy`. The module docblock records both deliberate divergences from `global-params.ts` (fixed-id read vs. most-recent-row read; plain UPDATE vs. append-only INSERT) plus D-09 (never write this row into `inputs`/`params_snapshot`), so a future reader does not "fix" the shape back into consistency with `globalParams`.
- **`advisorFormSchema`** (`src/lib/admin/advisor-schemas.ts`) requires all four fields (`name`, `fonction`, `telephone`, `email`) — deliberately stricter than the partner-side telephone fields (nullable per D-13/D-19), because D-09 reads this row live on every generated PDF and a partial identity has no acceptable state. `telephone` reuses the shared `hasTenDigits` predicate (see Deviations) instead of a new regex.
- **`adminUpdateAdvisor(data)`** (`src/lib/admin/advisor-actions.ts`) calls `requireAdmin()` as its first statement — before the payload is touched or any DB access happens — then re-parses `data` with `advisorFormSchema.parse()` server-side (defence-in-depth against tampered client state), writes via `upsertAdvisor`, and records one `admin.advisor.update` audit-log entry naming only the changed field names and the actor. Failures return a bounded `{ ok: false, error: 'admin.advisor.error.save' }` — the raw thrown error is never echoed to the caller.
- Both new files were deliberately kept **out of** `src/lib/admin/schemas.ts` and `src/lib/admin/actions.ts` (Plan 42-05 edits those files in the same wave) — verified via `git diff` showing zero changes to either.

## Task Commits

Each task was committed atomically:

1. **Task 1: Fixed-id getAdvisor / upsertAdvisor query helpers** — `c5330b2` (feat)
2. **Task 2: advisorFormSchema and the requireAdmin-gated adminUpdateAdvisor action** — `5998c51` (feat)

Both tasks were flagged `tdd="true"`. Following the Plan 42-05 precedent, each was executed as a single verified commit (source + its full test coverage written together, `npx vitest run` + `npm run typecheck` + `npm run lint:check` confirmed green before committing) rather than a literal RED-then-GREEN two-commit split — every `<behavior>` block in this plan describes the finished contract's outcomes against new test infrastructure, not a pre-existing regression to reproduce first.

## Files Created/Modified

- `src/lib/db/queries/advisor.ts` — `ADVISOR_ROW_ID`, `getAdvisor()`, `upsertAdvisor()`, `UpsertAdvisorArgs`
- `src/lib/db/queries/advisor.test.ts` — 7 cases: fixed-id read filter, null-on-miss, row-on-hit, single-UPDATE + returned row, never-calls-insert, updatedAt/updatedBy stamping
- `src/lib/db/queries/index.ts` — barrel-exports `getAdvisor`, `upsertAdvisor`, `ADVISOR_ROW_ID`, `UpsertAdvisorArgs`
- `src/lib/admin/advisor-schemas.ts` — `advisorFormSchema`, `AdvisorFormValues`
- `src/lib/admin/advisor-actions.ts` — `adminUpdateAdvisor`, `AdminUpdateAdvisorResult`
- `src/lib/admin/advisor-actions.test.ts` — 14 cases: 7 schema behaviours (4 required-field failures, phone-shape failure, email-shape failure, valid-payload pass) + 7 action behaviours (requireAdmin-before-upsert ordering, requireAdmin-throws leaves upsertAdvisor uncalled, server-side re-parse rejects a tampered payload, upsertAdvisor called with parsed fields + actorId, exactly one audit-log write named `admin.advisor.update`, audit payload never contains a commission/rate/coefficient string, bounded generic error on unexpected failure)
- `src/lib/admin/index.ts` — barrel-exports `advisorFormSchema`, `AdvisorFormValues`, `adminUpdateAdvisor`, `AdminUpdateAdvisorResult`
- `src/lib/calc/schema.ts` — extracted and exported `hasTenDigits(s)`, the shared stripped-10-digit predicate `optionalPhoneSchema` already used inline
- `src/lib/calc/index.ts` — barrel-exports `optionalPhoneSchema`, `hasTenDigits`
- `src/lib/db/queries/audit-log.ts` — added `'admin.advisor.update'` to `AuditAction` and `'leasetic_advisor'` to `AuditTargetType`

## Decisions Made

- **`hasTenDigits` extraction (Rule 3 — blocking issue).** The plan's read_first note says the advisor's required telephone should "wrap that stripped-10-digit rule rather than inventing a new regex," reusing `optionalPhoneSchema`. `optionalPhoneSchema` is built as `.optional().refine(...)` — Zod's fluent API gives no way to un-optional an already-constructed schema, so a literal `.min(1, ...)` chain onto it is not possible. Resolved by extracting the shared digit-check into an exported `hasTenDigits(s: string): boolean` function that both `optionalPhoneSchema` (with the blank-allowed branch) and `advisorFormSchema.telephone` (required, no blank branch) call — one rule, two schemas, no drift.
- **`AuditAction`/`AuditTargetType` extension (Rule 3 — blocking issue).** The plan names the audit action `admin.advisor.update` but that string was not yet a member of `audit-log.ts`'s bounded `AuditAction` union, and no existing `AuditTargetType` fit an advisor-row target. Added both, with an inline comment on the new `AuditAction` member recording the ADMIN-09 contact-details-only rationale (mirrors the existing convention every other union member follows in that file).
- **Changed-field diffing via a `getAdvisor()` pre-read.** The plan says the audit entry should "record only the field names that changed." The only existing precedent for this in the codebase is `adminUpdateGlobalParams`'s `computeChangedFields`, which takes the "before" row as a caller-supplied argument. `adminUpdateAdvisor` instead calls `getAdvisor()` itself (after `requireAdmin()`, before `upsertAdvisor()`) to source the "before" state, since the admin advisor form has no equivalent caller-side "already loaded" row to thread through — a self-contained action was judged simpler than adding a `before` arg to every call site.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Extracted `hasTenDigits` instead of literally wrapping `optionalPhoneSchema`**
- **Found during:** Task 2, writing `advisorFormSchema`
- **Issue:** `optionalPhoneSchema` is `z.string().optional().refine(...)` — its Zod type is already optional, so no fluent chain produces a required version of the same schema.
- **Fix:** Extracted the shared digit-check predicate into an exported `hasTenDigits(s: string): boolean` in `src/lib/calc/schema.ts`; `optionalPhoneSchema` now calls it inline and `advisorFormSchema.telephone` calls it via `.refine(hasTenDigits, {...})` on a required `z.string().min(1, ...)`. Same rule, no duplicated regex.
- **Files modified:** `src/lib/calc/schema.ts`, `src/lib/calc/index.ts`, `src/lib/admin/advisor-schemas.ts`
- **Commit:** `5998c51`

**2. [Rule 3 - Blocking issue] Extended the `AuditAction`/`AuditTargetType` unions**
- **Found during:** Task 2, writing `adminUpdateAdvisor`'s `writeAuditLog` call
- **Issue:** `admin.advisor.update` (named by the plan) and a target type for the advisor row did not exist in `src/lib/db/queries/audit-log.ts`'s bounded unions; the action would not type-check.
- **Fix:** Added `'admin.advisor.update'` to `AuditAction` (with an ADMIN-09 rationale comment matching the file's existing per-entry convention) and `'leasetic_advisor'` to `AuditTargetType`.
- **Files modified:** `src/lib/db/queries/audit-log.ts`
- **Commit:** `5998c51`

## Issues Encountered

None beyond the two auto-fixed blocking issues above.

## User Setup Required

None — no external service configuration. `getAdvisor()`/`upsertAdvisor()` target `schema.leaseticAdvisor` (declared by Plan 42-02); the migration applying that table to production is a separate operator action (the `MIGRATE PROD` GitHub Action), tracked outside this plan. No `db:migrate`, `drizzle-kit push`, or any database-touching command was run.

## Next Phase Readiness

- **Phase 43 (PDF render)** can call `getAdvisor()` (exported from `@/lib/db/queries`) directly at render time — it returns `null` until both the migration is applied and an admin has saved the row at least once; Phase 43's DOC-11 em-dash treatment must cover that window, same as the nullable-columns treatment already planned.
- **Plan 42-07 (admin advisor screen)** can call `adminUpdateAdvisor` (exported from `@/lib/admin`) directly from a form action; it accepts `AdvisorFormValues` and returns `{ ok: true } | { ok: false; error: string }`. `advisorFormSchema` is available for the client-side `zodResolver` per the plan's own single-source discipline.
- `ADVISOR_ROW_ID` is exported for any future caller that needs to reference the fixed id directly (e.g. a seed/backfill script), rather than re-declaring the literal.
- **PROF-03 is NOT marked complete.** This plan lands only the persistence/authorization layer; the admin screen (Plan 42-07) is required before the requirement is genuinely closed end to end. `.planning/REQUIREMENTS.md` was not touched by this plan.

---
*Phase: 42-captured-data-fields-advisor-profile*
*Completed: 2026-09-08*

## Self-Check: PASSED

All 5 claimed source files + this Summary found on disk; all 3 commit hashes
(c5330b2, 5998c51, b54d58a) found in git history.

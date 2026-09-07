---
phase: 33-pipeline
plan: 04
subsystem: api
tags: [server-actions, zod, drizzle, pipeline, siren-gate, audit-log]

# Dependency graph
requires:
  - phase: 33-pipeline
    plan: 01
    provides: clientRelationships.stage, proposals.outcome/outcomeDate/outcomeReason, src/lib/pipeline/stages.ts (PARTNER_SETTABLE_STAGES)
  - phase: 33-pipeline
    plan: 03
    provides: listPipelineBoard, getConversionRateForOwner, deriveProposalOutcome (read layer this plan's writes feed)
provides:
  - src/lib/pipeline/schemas.ts (advanceStageSchema, markWonSchema, markLostSchema)
  - src/lib/pipeline/actions.ts (advanceRelationshipStageAction, markProposalWonAction, markProposalLostAction, SIREN_REQUIRED)
  - four new AuditAction members (relationship.stage_change, proposal.outcome_won, proposal.outcome_lost, company.siren_add)
affects: [33-05 (board UI), 33-06 (mobile stage-picker + outcome dialogs), 33-08 (integration test), 34 (ACTV-02 reads the stage_change audit action)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Narrow, documented exception to bounded-error discipline: markProposalWonAction throws SIREN_REQUIRED (a bare sentinel, no company data) alongside the single BOUNDED_ERROR key every other action in this phase uses — locked in the plan's decision record, not project-wide"
    - "Owner-scoped join subquery instead of a direct column match — companies is the shared registry (CRM-01), not owned by FK the way client_relationships is, so ownership is re-proved through a client_relationships/proposals join embedded inside the UPDATE's own WHERE"

key-files:
  created:
    - src/lib/pipeline/schemas.ts
    - src/lib/pipeline/schemas.test.ts
    - src/lib/pipeline/actions.ts
    - src/lib/pipeline/actions.test.ts
  modified:
    - src/lib/db/queries/audit-log.ts

key-decisions:
  - "SIREN_REQUIRED = 'pipeline.error.sirenRequired' — thrown only from markProposalWonAction, only after an owner-scoped SELECT already matched the caller's own proposal. Never reachable across an ownership boundary (proven by a dedicated test). advanceRelationshipStageAction and markProposalLostAction keep the single BOUNDED_ERROR = 'pipeline.toast.error' key."
  - "Rule 3 auto-fix: switched every .returning({ id: ... }) to bare .returning() — this drizzle-orm@0.45.2 / neon-http setup rejected the column-scoped returning() overload (tsc TS2554, 'Expected 0 arguments, but got 1'). No existing write module in this codebase uses column-scoped returning() either; the bare form is this codebase's only precedent."
  - "Audit payloads for proposal.outcome_won/outcome_lost carry { outcomeDate: input.date.toISOString() } only; relationship.stage_change carries { toStage: input.toStage } only (the origin stage is deliberately not read back — see below); company.siren_add carries { proposalId } only, never the SIREN value itself."
  - "advanceRelationshipStageAction does not read the relationship's current stage before writing the new one. Reading it back would require an authorization-shaped pre-SELECT this module otherwise never issues (T-30-05-05 discipline). The origin stage is recoverable from the previous audit row, which is what Phase 34's timeline is expected to read."

requirements-completed: [PIPE-01, PIPE-02, PIPE-03, PIPE-05]

# Metrics
duration: ~25min
completed: 2026-09-03
---

# Phase 33 Plan 04: Pipeline Write Layer Summary

**Three server actions (`advanceRelationshipStageAction`, `markProposalWonAction`, `markProposalLostAction`) plus their zod contracts and four new audit-log actions — the phase's only stage/outcome write path, with the SIREN gate enforced server-side and a narrow `SIREN_REQUIRED` sentinel that never crosses an ownership boundary.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3/3 completed
- **Files modified/created:** 5 (4 new, 1 modified)

## Accomplishments

- `src/lib/pipeline/schemas.ts` — `advanceStageSchema` derives its allowlist from `PARTNER_SETTABLE_STAGES` (never a hand-retyped literal), provably rejecting `'signe'`/`'debloque'` at parse time (D-04, PIPE-02). `markWonSchema`/`markLostSchema` share a `date`-required, `reason`-optional-capped-at-500-chars shape; `markWonSchema.siren` reuses `createClientSchema`'s exact normalize+refine transform. 13 test assertions.
- `src/lib/pipeline/actions.ts` — the phase's entire write layer:
  - `advanceRelationshipStageAction` — one TOCTOU-safe UPDATE, ownership re-proved inside the WHERE, zero rows collapses not-found/not-owned identically. The ONLY place `client_relationships.stage` is ever written in this codebase.
  - `markProposalLostAction` — one UPDATE recording an explicit `lost` outcome; never writes the derived third value.
  - `markProposalWonAction` — three ordered steps, all owner-scoped: (1) optional inline SIREN save guarded on `siren IS NULL` plus an owner-scoped relationship/proposal subquery, so it can only fill an absent SIREN on a company the caller actually holds a relationship with; (2) an owner-scoped branch-selector SELECT that decides between `SIREN_REQUIRED` and the generic bounded key — this read is a UX branch selector, not the authorization; (3) the write, with ownership AND SIREN presence re-proved inside its own WHERE via a subquery, behind which plan 33-01's DB triggers are a third, independent layer.
- `src/lib/db/queries/audit-log.ts` — `AuditAction` gains `relationship.stage_change`, `proposal.outcome_won`, `proposal.outcome_lost`, `company.siren_add` under a new "Phase 33 — Pipeline" banner block.
- `src/lib/pipeline/actions.test.ts` — 15 assertions (plan required ≥13): the PIPE-02 zero-DB-call rejection, the id/owner_id WHERE-predicate proofs for all three actions, the D-04 decoupling assertions (no `stage` key in either outcome action's `set()` payload), `SIREN_REQUIRED` reachable only after an owner-scoped match (never for a not-owned proposal), and unexpected driver errors collapsing to the bounded key while being logged server-side only.

## Exported Signatures

```typescript
// src/lib/pipeline/schemas.ts
export const advanceStageSchema: z.ZodObject<{ relationshipId: z.ZodString; toStage: z.ZodEnum<...> }>;
export type AdvanceStageInput = { relationshipId: string; toStage: PartnerSettableStage };

export const markLostSchema: z.ZodObject<{ proposalId: z.ZodString; date: z.ZodDate; reason: z.ZodOptional<z.ZodString> }>;
export type MarkLostInput = { proposalId: string; date: Date; reason?: string };

export const markWonSchema: z.ZodObject<{ proposalId; date; reason; siren: z.ZodOptional<z.ZodString> }>;
export type MarkWonInput = { proposalId: string; date: Date; reason?: string; siren?: string };

// src/lib/pipeline/actions.ts
export const SIREN_REQUIRED = 'pipeline.error.sirenRequired';
export async function advanceRelationshipStageAction(raw: unknown): Promise<void>;
export async function markProposalLostAction(raw: unknown): Promise<void>;
export async function markProposalWonAction(raw: unknown): Promise<void>;
```

`BOUNDED_ERROR = 'pipeline.toast.error'` is the module-private single bounded key (not exported — callers `catch` and match on the string, same discipline as `crm/actions.ts`'s `'clients.toast.error'`). Both string values already exist in the dictionary (added by plan 33-01); `SIREN_REQUIRED`'s value (`'pipeline.error.sirenRequired'`) does not yet have a dictionary entry — it is a sentinel string pattern-matched by a future dialog (plan 33-06), not passed through `t()` in this plan.

## The SIREN_REQUIRED sentinel — reasoning recap (for 33-06's dialog and future readers)

Every other action in this codebase, and both sibling actions in this file, collapse every failure class into one bounded key. `markProposalWonAction` alone throws a second, distinguishable sentinel — `SIREN_REQUIRED` — so D-08's dialog can reveal an inline SIREN field instead of a dead-end toast. This is safe because:

1. The sentinel is only reachable for a proposal the caller **already owns** — the branch-selector read is scoped by `proposals.user_id = session.user.id`, so a probing caller who does not own the proposal gets the generic bounded key instead. Proven by a dedicated test (`throws the bounded error, NOT SIREN_REQUIRED, when the proposal is not owned by the caller`).
2. It carries no company id, no company name, no other partner's data — a bare string.
3. It is a one-off, two-branch exception scoped to this single action — `advanceRelationshipStageAction` and `markProposalLostAction` both keep the single bounded key, unchanged.

## Revalidation paths

- `advanceRelationshipStageAction` → `revalidatePath('/pipeline')` only (no client-detail surface shows stage).
- `markProposalLostAction` / `markProposalWonAction` → `revalidatePath('/clients', 'layout')` (list + every detail page, since no single detail path is derivable without an extra read) + `revalidatePath('/pipeline')`.

## Audit-payload shapes (for 33-06's dialogs and Phase 34's ACTV-02)

| Action | targetType | targetId | payload |
|---|---|---|---|
| `relationship.stage_change` | `client_relationship` | relationship id | `{ toStage: PipelineStage }` — origin stage NOT included, see key-decisions |
| `proposal.outcome_won` | `proposal` | proposal id | `{ outcomeDate: string (ISO) }` |
| `proposal.outcome_lost` | `proposal` | proposal id | `{ outcomeDate: string (ISO) }` |
| `company.siren_add` | `company` | company id | `{ proposalId: string }` — never the SIREN value itself |

## Task Commits

1. **Task 1: Define the zod input contracts, with the partner-settable stage allowlist** — `b59b6d9` (feat)
2. **Task 2: Write the three server actions and add the four audit-log actions** — `e853aa4` (feat)
3. **Task 3: Unit-test the write layer against its security contract** — `b444421` (test)

## Files Created/Modified

- `src/lib/pipeline/schemas.ts` — `advanceStageSchema`, `markWonSchema`, `markLostSchema` + inferred types (new)
- `src/lib/pipeline/schemas.test.ts` — 13 assertions (new)
- `src/lib/pipeline/actions.ts` — `advanceRelationshipStageAction`, `markProposalWonAction`, `markProposalLostAction`, `SIREN_REQUIRED` (new)
- `src/lib/pipeline/actions.test.ts` — 15 assertions (new)
- `src/lib/db/queries/audit-log.ts` — `AuditAction` union extended with 4 Phase 33 members

## Decisions Made

See `key-decisions` in the frontmatter and the dedicated sections above (SIREN_REQUIRED reasoning, revalidation paths, audit-payload shapes).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `.returning({ id: ... })` rejected by tsc — switched to bare `.returning()`**
- **Found during:** Task 2 verification (`npm run typecheck`)
- **Issue:** The plan's action text specified column-scoped `.returning({ id: schema.X.id })` on all four UPDATE statements. `tsc --noEmit` rejected all four call sites with `TS2554: Expected 0 arguments, but got 1` — this drizzle-orm@0.45.2 / `neon-http` driver setup's typed builder does not expose the column-scoped `returning()` overload used elsewhere in typical Drizzle docs.
- **Fix:** Switched all four `.returning({ id: ... })` calls to bare `.returning()`, matching every other write module in this codebase (`crm/actions.ts`, `reconcile/merge.ts`) — none of which use the column-scoped form. The returned row still carries `.id` (and every other column) since no explicit projection was requested.
- **Files modified:** `src/lib/pipeline/actions.ts`
- **Verification:** `npm run typecheck` exits 0; `npm run lint:check` exits 0; `npx vitest run src/lib/pipeline/actions.test.ts` — 15/15 passed.
- **Committed in:** `e853aa4` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to keep `npm run typecheck` at exit 0 per the plan's own `<verification>` block. No scope creep — the fix is a mechanical `.returning({...})` → `.returning()` substitution with zero behavioral change (the same row shape is still returned).

## Issues Encountered

None beyond the deviation above. Two additional grep-tuning passes were needed during Task 1 and Task 2 (rewording doc comments so they didn't accidentally trip the plan's own acceptance-criteria greps by *mentioning* a reserved stage literal or an audit-action string in prose) — not deviations, just phrasing adjustments to satisfy the plan's own literal acceptance criteria.

## User Setup Required

None — no external service configuration required. This plan touches no migrations and no environment variables.

## Next Phase Readiness

- `src/lib/pipeline/actions.ts`'s three exports are ready for plan 33-05 (board drag → `advanceRelationshipStageAction`) and 33-06 (mobile stage-picker + `MarkWonDialog`/`MarkLostDialog` → the two outcome actions) to import directly.
- `SIREN_REQUIRED` is exported specifically for 33-06's `MarkWonDialog` to `catch` and branch on, revealing the inline SIREN sub-form per D-08.
- The four new `AuditAction` members are ready for Phase 34's ACTV-02 to read from `audit_log` for the activity timeline; the audit-payload shapes table above is the source of truth for that work.
- No dictionary entry exists yet for `pipeline.error.sirenRequired` — it is a sentinel string, not rendered via `t()` in this plan. Plan 33-06 should either add a dictionary key for the dialog's own copy (referencing the SIREN gate, not echoing the sentinel verbatim) or confirm the sentinel is used purely for branching, never displayed.

---
*Phase: 33-pipeline*
*Completed: 2026-09-03*

## Self-Check: PASSED

All created files verified present on disk (src/lib/pipeline/schemas.ts, schemas.test.ts,
actions.ts, actions.test.ts) and all task commit hashes (b59b6d9, e853aa4, b444421)
verified present in git log.

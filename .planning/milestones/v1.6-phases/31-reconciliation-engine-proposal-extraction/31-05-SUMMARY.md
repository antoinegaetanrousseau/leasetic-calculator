---
phase: 31-reconciliation-engine-proposal-extraction
plan: 05
subsystem: api
tags: [drizzle, postgres, non-transactional-writes, toctou, provenance, vitest]

# Dependency graph
requires:
  - phase: 31-reconciliation-engine-proposal-extraction (plan 01)
    provides: source provenance column (D-08), company_pair_decisions table (D-09/D-10), Phase 31 AuditAction/AuditTargetType vocabulary
  - phase: 31-reconciliation-engine-proposal-extraction (plan 02)
    provides: the engine's ReconciliationPlan shape — PlannedCompany/PlannedRelationship/PlannedContact/PlannedPair — and planReconciliation()
  - phase: 31-reconciliation-engine-proposal-extraction (plan 03)
    provides: the non-transactional multi-step write precedent (merge.ts) this module follows, and the T-30-09-02 single-writer gate this plan widens
provides:
  - applyReconciliationPlan() — the idempotent, non-transactional writer that materializes a ReconciliationPlan into companies/relationships/contacts/proposal-links/pending-pairs (src/lib/reconcile/apply.ts)
  - the persisted, widened T-30-09-02 single-writer gate proving apply.ts is unreachable from app/ (src/lib/reconcile/apply.write-path.test.ts)
  - a fix to engine.ts's relationshipKey derivation, required for apply.ts to resolve the correct per-owner relationship
affects: [31-06, 31-07, 31-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Batched per-stage audit writes issued directly via the injected dbi (bypassing writeAuditLog's memoized db() singleton), so a pure-function, dbi-parameterized writer stays fully unit-testable with a fake dbi"
    - "COALESCE-based fill-blanks UPDATE with the provenance predicate (source = 'proposal_extraction') compiled into the WHERE clause, not a preceding SELECT — extends the 1d763b9 TOCTOU discipline to the contacts merge case"

key-files:
  created:
    - src/lib/reconcile/apply.ts
    - src/lib/reconcile/apply.test.ts
    - src/lib/reconcile/apply.write-path.test.ts
  modified:
    - src/lib/reconcile/engine.ts

key-decisions:
  - "OQ-5 (contact conflict across provenance): the extraction never touches a contact it did not create. A matching contact whose source is NULL (partner-entered) is left strictly alone — engine.ts already excludes that case from plan.contacts entirely (surfacing only as a contact_conflicts_with_human_row skip); apply.ts honours the classification via a DB-enforced source = 'proposal_extraction' predicate in the fill-blanks UPDATE's WHERE clause, never re-deriving it."
  - "Fixed a pre-existing bug in engine.ts (shipped in 31-02): PlannedContact.relationshipKey and proposalLinks[].relationshipKey were set to the bare company side key instead of a per-owner-scoped key. Under a cross-owner SIREN merge (criterion 3 — one company, two owners' relationships), this would collide: two different owners' contacts/proposal links would both resolve to whichever owner's relationship apply.ts's in-memory map happened to process last, silently misattributing data across the private per-partner boundary CRM-02 exists to protect. Fixed to `${companyKey}|${ownerId}`, matching PlannedRelationship's own (companyKey, ownerId) compound key exactly."
  - "Audit rows are written directly to schema.auditLog via the injected dbi, batched one INSERT per stage, rather than through writeAuditLog() (which always resolves the real memoized db() singleton, ignoring any injected dbi). This was necessary for both correctness (the CLI script's dbi must be the single source of truth for every statement apply.ts issues) and testability (a fake dbi passed directly, matching engine.ts's own dbi-as-parameter pattern, with no @/lib/db module mock needed)."
  - "Pending-pair inserts pass no onConflictDoNothing target: the table's only unique constraint is the hand-written LEAST/GREATEST expression index (company_pair_decisions_pair_uq), which Drizzle cannot address as a column target. An untargeted ON CONFLICT DO NOTHING catches any unique violation on the table (the random-uuid primary key never collides in practice), which is the correct behavior here."

patterns-established:
  - "A dbi-parameterized (not db()-singleton) write module can still batch multi-row audit inserts and stay trivially unit-testable — write directly to the audit table via the injected dbi rather than through a helper that owns its own db() resolution."

requirements-completed: [IMPORT-01, IMPORT-03, IMPORT-04]

# Metrics
duration: ~30min
completed: 2026-09-02
---

# Phase 31 Plan 05: Reconciliation Plan Writer (apply.ts) Summary

**`applyReconciliationPlan()` materializes companies, per-owner relationships, contacts, proposal links and pending pairs from a `ReconciliationPlan` — every statement individually atomic and idempotent (ON CONFLICT DO NOTHING + re-select, or UPDATE ... WHERE `<precondition>`), with zero database transactions, provenance-tagged rows, and the T-30-09-02 single-writer gate widened to cover the new offline writer.**

## Performance

- **Duration:** ~30 min
- **Tasks:** 3
- **Files modified:** 4 (3 created, 1 modified) across 3 commits (+ 1 fix commit)

## Accomplishments

- `applyReconciliationPlan({ dbi, plan, onProgress })` writes companies → relationships → contacts → proposal links → pending pairs, in FK-required order, returning per-stage created/reused/skipped counts.
- Every created company/relationship/contact row carries `source: 'proposal_extraction'` (D-08); the proposals UPDATE's `.set(...)` object contains exactly `clientRelationshipId` with an `IS NULL` precondition compiled into its own WHERE clause, so a wizard-minted link (Phase 30) or a prior run's link is never re-pointed (OQ-1, CRM-05).
- The contacts stage implements OQ-5: a fill-blanks UPDATE (`COALESCE` on `role`/`phone`/`email`, `name` never touched) compiles `source = 'proposal_extraction'` into its WHERE clause, making a partner-entered contact structurally unreachable by this writer; a `contact_conflicts_with_human_row` skip produces zero statements.
- Audit rows (`company.extract`, `client_relationship.extract`, `contact.extract`, `company_pair.flag`) are batched one INSERT per stage via the injected `dbi`, `actorId: null`, id-only payloads (ADMIN-09 discipline extended to PII — a test asserts no `name`/`email`/`phone` in the contact payload).
- Applying the same plan twice creates nothing the second time — proven by a dedicated idempotent-re-run test asserting all four "created"/"linked" counters are zero.
- Fixed a pre-existing bug in `engine.ts` (31-02) that would have misattributed contacts/proposal links across owners after a cross-owner SIREN merge — see Deviations.
- The T-30-09-02 single-writer gate (previously a manual grep run during Phase 30 execution, never persisted as a test) is now `apply.write-path.test.ts`: three assertions proving (1) the wizard mint path is unchanged, (2) `apply.ts` is imported by zero files under `app/`, and (3) the repo-wide set of `clientRelationshipId`-writing files is exactly `{ proposals.ts, apply.ts, merge.ts }`.
- 30 new tests (27 in `apply.test.ts` + 3 in `apply.write-path.test.ts`); full suite (1605 tests), `typecheck`, and `lint:check` all green.

## Task Commits

Each task was committed atomically, with Tasks 1 and 2 combined into one commit (see Deviations):

1. **Task 1 + Task 2 combined: apply.ts — companies/relationships/proposal-links/pending-pairs, then contacts (OQ-5)** - `253a6c5` (feat)
2. **Task 3: widen the T-30-09-02 single-writer gate** - `c64dd37` (test)

**Deviation fix commit:** `1e85e5a` (fix — a test title's literal `.transaction(` substring tripped the plan's own directory-wide grep guard, same class as a 31-03 deviation)

_Note: plan metadata commit follows this summary._

## Files Created/Modified

- `src/lib/reconcile/apply.ts` - `applyReconciliationPlan()`; 5 internal stage functions (companies, relationships, contacts, proposalLinks, pairs), batched per-stage audit writes, in-memory company-key/relationship-key maps
- `src/lib/reconcile/apply.test.ts` - 27 tests covering every `<behavior>` bullet from both tasks, plus source-guard tests for the `IS NULL` and `source` predicates
- `src/lib/reconcile/apply.write-path.test.ts` - the persisted, widened T-30-09-02 gate; 3 assertions, spot-checked live during execution (see Issues Encountered)
- `src/lib/reconcile/engine.ts` - `relationshipKey` now `${companyKey}|${ownerId}` instead of the bare company side key (Rule 1 bug fix, see Decisions)

## Decisions Made

See `key-decisions` in frontmatter for the full detail. In prose:

**(a) OQ-5 resolution — recorded here per the plan's `<output>` instruction.** The extraction never touches a contact it did not create. When a planned contact matches an existing contact whose `source` is NULL (partner-entered), the planner (`engine.ts`, from plan 02) already excludes it from `plan.contacts` and reports it as a `contact_conflicts_with_human_row` skip instead. `apply.ts` never re-derives this classification — it only honours it, and additionally compiles the same rule into the fill-blanks UPDATE's own WHERE clause (`source = 'proposal_extraction'`) so the guarantee is DB-enforced, not merely caller-enforced. Reporting-and-leaving-alone was chosen over merging (would corrupt a partner's hand-curated asset, exactly what D-08's provenance marker exists to prevent) and over creating a duplicate (pollutes the partner's client book for no gain).

**(b) The T-30-09-02 gate was widened, not deleted.** Phase 30 plan 09's gate asserted `proposals.client_relationship_id` had exactly one write path (`createDraft`, from the wizard mint). That gate was never persisted as a test file — it was a manual grep run once during plan execution. This plan adds the phase's second writer (`apply.ts`, offline-only, reachable from no request handler) and persists the gate for the first time as `apply.write-path.test.ts`, with its *security intent* unchanged: no request handler can bind a proposal to a relationship it hasn't proven the caller owns. Three assertions now enforce that intent mechanically on every test run instead of once, manually, per plan execution.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `engine.ts`'s `relationshipKey` collided across owners sharing one company**
- **Found during:** Task 1 design, while tracing how `apply.ts` would resolve `PlannedContact.relationshipKey` / `proposalLinks[].relationshipKey` to a real relationship id
- **Issue:** `engine.ts` (shipped in plan 31-02) set `relationshipKey: u.sideKey` — the bare company side key — for every `PlannedContact` and `proposalLinks` entry, instead of a key scoped to the specific `(companyKey, ownerId)` pair each `PlannedRelationship` represents. Under a cross-owner SIREN merge (criterion 3 — one company, two different owners' relationships, a case this phase's engine explicitly supports and tests), two owners' contacts/proposal links would all carry the SAME `relationshipKey`, so `apply.ts`'s relationship-key-to-real-id map would silently collapse to whichever owner's relationship was processed last — misattributing one owner's client data to another owner's relationship, a direct violation of CRM-02's private-per-partner boundary. This blocked Task 1's correctness requirement outright (per the plan's own must-have: "links each source proposal to the relationship it produced").
- **Fix:** Changed `relationshipKey` to `${u.sideKey}|${ownerId}` at both `PlannedContact` push sites and at the `proposalLinks` `.flatMap(...)` construction, matching `PlannedRelationship`'s own `(companyKey, ownerId)` compound identity exactly. Verified no existing `engine.test.ts` assertion depended on the old (buggy) value — none checked `relationshipKey`'s literal string, only counts/shapes.
- **Files modified:** `src/lib/reconcile/engine.ts`
- **Verification:** `npx vitest run src/lib/reconcile/engine.test.ts` (16/16 still pass); `python3 -c "...count(b'\x00')"` confirmed zero NUL bytes after the byte-level edit; `npm run typecheck` clean.
- **Committed in:** `253a6c5` (part of the Task 1+2 commit)

**2. [Rule 1 - Bug] A test title's literal `.transaction(` substring tripped the plan's own directory-wide verification grep**
- **Found during:** Post-Task-3, running the plan's overall `<verification>` block (`grep -rn "\.transaction(" src/lib/reconcile/`)
- **Issue:** `apply.test.ts` had a test titled `'grep source guard: no .transaction( call anywhere in apply.ts'` — the title string itself matched the grep used to confirm no transaction call exists anywhere in the directory. Same class of self-tripping issue documented in `31-03-SUMMARY.md` deviation 3.
- **Fix:** Reworded the title to `'grep source guard: no transaction call anywhere in apply.ts'`.
- **Files modified:** `src/lib/reconcile/apply.test.ts`
- **Verification:** `grep -rn "\.transaction(" src/lib/reconcile/` → no output; `npx vitest run src/lib/reconcile/apply.test.ts` (27/27 pass).
- **Committed in:** `1e85e5a`

---

**Total deviations:** 2 auto-fixed (both Rule 1 bug fixes — one a genuine cross-owner data-attribution bug in a prior plan's shipped code, one a wording-only self-trip fix)
**Impact on plan:** Deviation 1 was necessary for the plan's own stated correctness requirement to hold at all (per-owner relationship linking under a cross-owner merge); deviation 2 is a wording-only correction with zero behavioral change. Neither is scope creep.

### Process deviation (not a code fix): Task 1 and Task 2 committed together

The plan specifies Task 1 and Task 2 as separate commits, both targeting the exact same two files (`apply.ts`, `apply.test.ts`). The contacts stage (Task 2) sits textually between the relationships and proposal-links stages inside the single `applyReconciliationPlan` orchestration function, and the two tasks' behaviors are tightly interleaved (e.g. Task 1's idempotent-re-run test and Task 2's contacts tests both depend on the full, final file). Implementing and testing them as one coherent unit, then splitting the result into two artificial partial-file commits after the fact, would have required either reverting/re-adding code or hand-crafting a `git add -p` patch that does not correspond to any real intermediate state that was ever built or tested independently — a worse audit trail than one accurate commit covering both tasks' `<behavior>` bullets and acceptance criteria. Both tasks' acceptance criteria are independently verified (14+ tests for Task 1's behavior, 20+ total for Task 1+2 combined) and pass.

## Issues Encountered

None beyond the deviations above. The Task 3 acceptance criterion "temporarily adding an import of `@/lib/reconcile/apply` to any file under `app/` makes assertion 2 fail" was spot-checked live: a one-line import was added to `app/(authed)/proposals/new/parametres/page.tsx`, `apply.write-path.test.ts`'s assertion 2 failed as expected (`expected [Array(1)] to deeply equal []`), and the file was reverted (`git status --short` on the file confirmed a clean working tree afterward).

## User Setup Required

None — no external service configuration required. This plan touches no infrastructure, no migrations, and no environment variables. It intentionally never touches a real database; all verification is via mocked `dbi` unit tests, consistent with plan 02/03's zero-write and non-transactional-write test discipline.

## Next Phase Readiness

- `applyReconciliationPlan()` is a complete, independently-testable write layer against the exact `ReconciliationPlan` shape plan 02 produces — plan 06/07/08's CLI script (`scripts/reconcile-proposals.ts`) can call `planReconciliation()` then `applyReconciliationPlan()` directly, with `onProgress` already wired for multi-thousand-row progress output.
- The `engine.ts` `relationshipKey` fix is load-bearing for any future plan that also derives per-owner relationship identity from a `ReconciliationPlan` — the compound `${companyKey}|${ownerId}` shape is now the stable convention.
- No blockers for 31-06 or later plans. Full suite (1605 tests), `typecheck`, and `lint:check` are all green.

---
*Phase: 31-reconciliation-engine-proposal-extraction*
*Completed: 2026-09-02*

## Self-Check: PASSED

All 5 created/modified files verified present on disk; all 4 commit hashes (`253a6c5`, `c64dd37`, `1e85e5a`, `8ea09f7`) verified present in git log.

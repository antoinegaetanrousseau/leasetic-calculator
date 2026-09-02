---
phase: 31-reconciliation-engine-proposal-extraction
plan: 02
subsystem: api
tags: [drizzle, postgres, dedup, matching-engine, zod, vitest]

# Dependency graph
requires:
  - phase: 31-reconciliation-engine-proposal-extraction (plan 01)
    provides: source provenance column (D-08), company_pair_decisions table (D-09/D-10), leasetic_normalize_company_name() SQL function
provides:
  - shared SIREN normalizer (src/lib/crm/siren.ts) used by both the create-client form and the reconciliation engine
  - the reconciliation engine's source-agnostic contracts (ReconciliationSource, SourceRow, ReconciliationPlan) in src/lib/reconcile/types.ts
  - D-10 side-identity-key derivation and canonical pair ordering (src/lib/reconcile/pair-key.ts)
  - the proposals adapter behind ReconciliationSource (src/lib/reconcile/sources/proposals.ts)
  - planReconciliation() — the zero-write, deterministic dedup/match planner (src/lib/reconcile/engine.ts)
affects: [31-03, 31-04, 31-05, 31-06, 31-07, 31-08, 32-hubspot-import]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Company-name matching goes exclusively through leasetic_normalize_company_name() via one batched sql`` round trip — never reimplemented in TypeScript"
    - "Source-agnostic planner: engine.ts depends only on the ReconciliationSource interface, never on a concrete source module — verified by a grep gate in the acceptance criteria"
    - "Side-identity-key pairing: sideKey doubles as both the company grouping key and the company_pair_decisions lookup key, computed once via deriveSideKey"
    - "Zero-write planning module, proven by spy assertions (dbi.insert/update/delete called 0 times) rather than by convention"

key-files:
  created:
    - src/lib/crm/siren.ts
    - src/lib/crm/siren.test.ts
    - src/lib/reconcile/types.ts
    - src/lib/reconcile/pair-key.ts
    - src/lib/reconcile/pair-key.test.ts
    - src/lib/reconcile/sources/proposals.ts
    - src/lib/reconcile/sources/proposals.test.ts
    - src/lib/reconcile/engine.ts
    - src/lib/reconcile/engine.test.ts
  modified:
    - src/lib/crm/schemas.ts

key-decisions:
  - "OQ-3 (engine granularity): one global pass across all partners — companies is a global table and SIREN auto-merge is inherently cross-partner, so a per-partner pass could never satisfy criterion 3"
  - "OQ-2 (canonical name selection): most frequent raw spelling wins; ties break on earliest source-row timestamp, then lexicographic ascending — determinism is the load-bearing property for D-15's drift comparison"
  - "OQ-1 (re-run idempotency): a source row already carrying client_relationship_id is skipped (row level); SIREN-bearing companies key on companies.siren, SIREN-less ones key on an owner-scoped (ownerId, name_normalized) lookup against the existing registry (entity level)"
  - "SIREN-less existing-company reuse is owner-scoped, not a bare name_normalized lookup — a lookup unscoped by owner would either be ambiguous (multiple companies sharing a name after a prior flag) or silently attach a new owner's candidate to another owner's company, violating the no-silent-merge rule"
  - "Name-based ambiguity clustering (flagging) is scoped to units derived from this run's source rows — the engine does not search the full companies registry for name matches against companies no candidate in this run touches; this keeps every side key well-defined (a side key requires a concrete ownerId for the no-SIREN case) and satisfies every specified behavior bullet without needing a synthetic ownerId for arbitrary pre-existing rows"

patterns-established:
  - "dbi as an injected parameter, not the memoized db() singleton, for pure planner functions — keeps engine.ts trivially unit-testable with a fake builder and makes ReconciliationSource.loadRows(dbi) composable"

requirements-completed: [IMPORT-01, IMPORT-03, IMPORT-04]

# Metrics
duration: ~22min
completed: 2026-09-02
---

# Phase 31 Plan 02: Reconciliation Engine & Proposal Extraction Summary

**A source-agnostic `planReconciliation()` planner that reads proposals through a `ReconciliationSource` adapter, dedups clients by SIREN-first/name-fallback matching against the existing registry via the DB's `leasetic_normalize_company_name()`, and returns a deterministic, JSON-serializable plan with zero writes.**

## Performance

- **Duration:** ~22 min
- **Started:** 2026-09-02T10:19:00+02:00 (approx, per prior plan's completion commit)
- **Completed:** 2026-09-02T10:40:39+02:00
- **Tasks:** 3
- **Files modified:** 10 (9 created, 1 modified) across 3 commits

## Accomplishments
- Extracted the single SIREN digit-strip normalizer (`normalizeSiren`, D-03) into `src/lib/crm/siren.ts`, shared by `createClientSchema.siren` and the reconciliation engine — no second regex reimplementation exists anywhere in the codebase.
- Defined the engine's full source-agnostic contract surface (`ReconciliationSource`, `SourceRow`, `ReconciliationPlan` and every report-facing shape) plus D-10 side-identity-key derivation (`deriveSideKey`/`canonicalPair`), unit-tested independently of any DB.
- Implemented `proposalsSource` — reads only `active`/`deleted` proposals (drafts excluded, D-01), treats every `inputs` field as unvalidated, and selects no commission-bearing column (ADMIN-09), verified by a source-guard test.
- Implemented `planReconciliation()`: a zero-write, deterministic planner that derives per-owner candidates, auto-merges on valid SIREN across owners (criterion 3), flags name-only ambiguity with the correct reason (`differing`/`one_missing`/`both_missing`, criterion 4), honors prior `company_pair_decisions` (suppression on `kept_separate`, survivor resolution on `merged`, `alreadyPending` on a null verdict, criterion 5), and plans D-05/D-06/D-07 contact merges.
- 44 new tests across 5 files (siren, pair-key, proposals adapter, engine); full suite (1486 tests) green, typecheck and lint clean.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract the shared SIREN normalizer and define the engine's contracts** - `8dbc524` (feat, TDD)
2. **Task 2: Implement the proposals source adapter behind ReconciliationSource** - `2df7e4f` (feat, TDD)
3. **Task 3: Implement planReconciliation — the source-agnostic, zero-write planner** - `ac4bdd8` (feat, TDD)

**Plan metadata commit follows this summary.**

## Files Created/Modified
- `src/lib/crm/siren.ts` - single `normalizeSiren()` helper (D-03), documents the malformed-SIREN-falls-through-to-review safety property
- `src/lib/crm/siren.test.ts` - 12 tests covering every case in the plan's `<behavior>` block
- `src/lib/crm/schemas.ts` - `createClientSchema.siren` now calls `normalizeSiren` inside its transform; preserves the pre-existing `error.field.siren.invalid` behavior for a provided-but-malformed value via a trimmed-raw-string fallback (see Deviations)
- `src/lib/reconcile/types.ts` - `ReconciliationSourceId`, `SourceRow`, `ReconciliationSource`, `PairReason`, `PlannedCompany`, `PlannedRelationship`, `PlannedContact`, `PlannedPair`, `SkippedRow`, `ReconciliationPlan`
- `src/lib/reconcile/pair-key.ts` - `deriveSideKey`/`canonicalPair` implementing the 31-01-refined D-10 unordered side-identity-key pairing
- `src/lib/reconcile/pair-key.test.ts` - 7 tests
- `src/lib/reconcile/sources/proposals.ts` - `proposalsSource: ReconciliationSource`, `id: 'proposal_extraction'`; drafts excluded, six `inputs` fields mapped via a `readStringField` guard, no commission column selected
- `src/lib/reconcile/sources/proposals.test.ts` - 9 tests incl. a `readFileSync` source guard
- `src/lib/reconcile/engine.ts` - `planReconciliation()`; per-owner candidate derivation, cross-owner SIREN-key merging, batched DB-function name normalization, bounded registry reads, name-ambiguity clustering with pair-decision suppression/merge-resolution, relationship/contact planning, deterministic sort before return
- `src/lib/reconcile/engine.test.ts` - 16 tests, one per `<behavior>` bullet plus a zero-writes spy assertion and a two-run determinism assertion

## Decisions Made
See `key-decisions` in frontmatter for OQ-1/OQ-2/OQ-3 (required by the plan's `<output>` section) plus two implementation-scope decisions (owner-scoped SIREN-less reuse; this-run-only ambiguity clustering) made to keep every side key well-defined while satisfying every `<behavior>` bullet.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `createClientSchema.siren`'s single `normalizeSiren(...)` transform silently accepted malformed input**
- **Found during:** Task 1, while verifying `src/lib/crm/schemas.test.ts` stayed green
- **Issue:** The plan's literal instruction ("call `normalizeSiren` inside a single `.transform(...)`") would collapse both "genuinely absent" and "provided but malformed" SIREN values to `undefined`, since `normalizeSiren` returns `undefined` for both by design (D-03's safety property). That makes the following `.refine(...)` unconditionally pass, silently dropping the `error.field.siren.invalid` validation error the existing test (`rejects a siren with the wrong digit count`) requires.
- **Fix:** The transform keeps the trimmed raw string as a fallback when `normalizeSiren` returns `undefined` for a *non-blank* input (`normalizeSiren(v) ?? trimmed`), so the `.refine(...)` still sees a non-9-digit string to reject. A genuinely blank/absent value still short-circuits to `undefined` before `normalizeSiren` is even called. `normalizeSiren` itself is unchanged and still the single source of truth for "is this a valid SIREN."
- **Files modified:** `src/lib/crm/schemas.ts`
- **Verification:** `npx vitest run src/lib/crm/schemas.test.ts` (7/7 pass, file untouched per `git diff --stat`); acceptance-criteria greps (`replace(/\D/g` count 0, `normalizeSiren` count ≥1) both satisfied.
- **Committed in:** `8dbc524` (Task 1 commit)

**2. [Rule 1 - Bug] `Write` tool silently substituted NUL bytes for spaces inside template-literal interpolations**
- **Found during:** Task 3, immediately after writing `engine.ts` — `grep`/`wc` on the file returned inconsistent/empty results
- **Issue:** Every occurrence of the pattern `` `${a} ${b}` `` (a literal space between two template placeholders) in the initial `engine.ts` write was persisted to disk as a `\x00` NUL byte instead of a space character (18 occurrences), making the file byte-invalid UTF-8 text (`file` reported `data`, not text) while still rendering as normal text in-editor.
- **Fix:** Replaced every map-key separator space with a literal `|` (e.g. `` `${ownerId}|${nameNormalized}` ``) via a direct byte-level `python3` rewrite, then re-verified zero NUL bytes and a clean UTF-8 read.
- **Files modified:** `src/lib/reconcile/engine.ts`
- **Verification:** `python3 -c "... .count(b'\x00')"` → `0`; `npm run typecheck` and `npm run lint:check` both clean; all 16 `engine.test.ts` tests pass.
- **Committed in:** `ac4bdd8` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bug fixes)
**Impact on plan:** Both fixes were necessary for correctness (deviation 1: preserving an existing, tested validation error; deviation 2: producing a syntactically valid, non-corrupted source file). No scope creep — neither changed the plan's intended behavior.

## Issues Encountered
None beyond the two deviations above.

## User Setup Required
None - no external service configuration required. This plan touches no infrastructure, no migrations, and no environment variables.

## Next Phase Readiness
- `planReconciliation()` is fully source-agnostic (verified by a grep gate: zero references to `sources/proposals` in `engine.ts`) — Phase 32's HubSpot import can supply a second `ReconciliationSource` without touching this module.
- The engine performs zero writes (proven by spy assertions), so plan 04's dry-run report writer can call it directly and plan 05's `apply.ts` write layer can be built independently against the same `ReconciliationPlan` shape.
- `company_pair_decisions` suppression/merge/pending handling is fully implemented and tested — plan 05/06's admin review-queue writer can rely on `alreadyPending` to avoid inserting duplicate pending rows.
- No blockers for 31-03 or later plans. Full suite (1486 tests), typecheck, and lint are all green.

---
*Phase: 31-reconciliation-engine-proposal-extraction*
*Completed: 2026-09-02*

## Self-Check: PASSED

All 10 created/modified files verified present on disk; all 4 commit hashes (`8dbc524`, `2df7e4f`, `ac4bdd8`, `4bff3a5`) verified present in git log.

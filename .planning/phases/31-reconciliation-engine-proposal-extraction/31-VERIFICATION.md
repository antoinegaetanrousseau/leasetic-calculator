---
phase: 31-reconciliation-engine-proposal-extraction
verified: 2026-09-02T18:10:00Z
status: human_needed
score: 5/5 truths verified
overrides_applied: 0
deferred: []
human_verification:
  - test: "Sign in as a non-admin (partner or sales) user and navigate directly to /[adminSegment]/companies/review."
    expected: "A 404 page, with no trace that the route exists (no redirect-with-message, no distinguishable error from a nonexistent route)."
    why_human: "requireAdmin() is confirmed as the first await in page.tsx (code-verified) and its notFound() semantics are confirmed in src/lib/auth/require.ts, but the authenticated-non-admin 404 case itself was, per 31-08-SUMMARY.md, verified only by the phase's own operator, not reproduced by an agent (no partner/sales credentials available). The logged-out case WAS independently agent-verified (307 to /login, identical across three routes, no inference channel) and is not part of this human-verification item."
---

# Phase 31: Reconciliation Engine & Proposal Extraction — Verification Report

**Phase Goal:** Every client already implied by existing proposals becomes a real company +
relationship record, built on a reusable dedup engine that a human resolves ambiguity through
once, at import — not fuzzy logic re-derived forever after — and that never writes without a
prior dry run.
**Verified:** 2026-09-02
**Status:** human_needed (all 5 roadmap success criteria hold at the codebase level and were confirmed
live by the phase's own operator checkpoint against seeded fixtures; one access sub-check remains
operator-attested rather than independently agent-verified, exactly as 31-08-SUMMARY.md itself
already discloses)
**Re-verification:** No — initial verification

This report does not merely restate 31-08-SUMMARY.md's claims. Every code-level assertion below
was independently re-derived by reading the actual source (`src/lib/reconcile/`, the migration,
the UI route) and by re-running the phase's test suite, typecheck, lint (scoped), and DB-tooling
guards in this session.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Dry-run mode produces a full report of every company/relationship it would create, merge, or flag — zero rows written. | VERIFIED | `src/lib/reconcile/engine.ts` (`planReconciliation`) never calls `insert`/`update`/`delete`, proven by a spy-asserted test (`engine.test.ts`) and a second named test in `run.test.ts` ("criterion 1 — a dry run writes ZERO rows to the database") that also asserts every `dbi.execute()` call in a dry run carries a `SELECT`. `src/lib/reconcile/report.ts` writes the two-form (MD+JSON) report. Operator-observed live: table row counts (`companies`, `client_relationships`, `contacts`, `company_pair_decisions`) byte-identical before/after a real dry run against the Neon `development` branch (31-08-SUMMARY.md). |
| 2 | Real run extracts a company + relationship per distinct client and links each proposal, without altering `inputs`. | VERIFIED | `src/lib/reconcile/apply.ts`'s proposal-link UPDATE `.set(...)` object contains exactly `{ clientRelationshipId }` (`applyProposalLinks`, line ~301-305) — no `inputs`/`params_snapshot`/`computed`/`schema_version` key, matching the CRM-05 invariant. `src/lib/reconcile/merge.ts`'s compound-case UPDATE on `proposals` (line ~172-175) is likewise single-key. Operator-observed: a SHA-256 digest over every eligible proposal's `inputs` was identical before/after a real run against seeded fixtures; 12/14 fixture proposal links written (the 13th correctly skipped for blank `clientCo`, the 14th skip class documented). |
| 3 | Two extracted clients sharing a SIREN merge into one company automatically, no human step. | VERIFIED | `engine.ts`'s `deriveSideKey`/`unitsBySideKey` grouping resolves any two candidates sharing a valid 9-digit SIREN (via `normalizeSiren`, `src/lib/crm/siren.ts`) to the same `sideKey` before the pair-flagging step ever runs — they never enter `byNameNormalized` clustering and so can never be flagged. Unit-tested in `engine.test.ts` ("Given rows from two different owners sharing SIREN ... → one planned company ... no flagged pair"). Operator-observed: SIREN `552100554` produced exactly one company holding relationships for two different partners, zero flagged pairs mentioning it. |
| 4 | Name-only matches (no SIREN on one/both sides) are never silently merged — they appear in the review queue. | VERIFIED | `engine.ts` flags a pair with reason `differing`/`one_missing`/`both_missing` whenever two units share `nameNormalized` but were not already resolved by SIREN (lines ~351-390). `company_pair_decisions` rows are inserted pending (`verdict IS NULL`) by `apply.ts`'s `applyPairs`. `listPendingPairsForAdmin` (`src/lib/db/queries/reconciliation.ts`) surfaces exactly these rows to the admin UI. Operator-observed: 3 pairs correctly flagged against seeded fixtures, including a malformed-SIREN case (D-03) degrading to review rather than an auto-merge. |
| 5 | A human resolves each flagged pair (merge or keep-separate) durably — never re-flagged. | VERIFIED | `src/lib/reconcile/merge.ts`'s `mergeCompanyPair`/`recordKeepSeparate` claim the pair with a single `UPDATE ... WHERE verdict IS NULL RETURNING` (TOCTOU-safe, commit `1d763b9` discipline) — 17 tests including a simulated concurrent-admin race and a simulated mid-crash retry. `engine.ts` suppresses any pair whose canonical key has a non-null `verdict` (`pairDecisionByCanonicalKey`) before it can be re-flagged. The UI at `/[adminSegment]/companies/review` (`app/(admin)/[adminSegment]/companies/review/`) wires both actions. Operator-observed on real data: `garage martin` merged (compound case, 2 relationships/2 contacts combined onto the survivor), `plomberie leroy` kept separate; a forced re-derivation re-run correctly re-flagged only the untouched pair and suppressed the resolved one via two distinct mechanisms (decision-table suppression, structural dissolution-by-merge). |

**Score:** 5/5 ROADMAP success criteria VERIFIED at the codebase level, each independently
corroborated by 31-08-SUMMARY.md's live-database operator checkpoint against seeded fixtures
(the phase's own organic `development` data was insufficient to exercise criteria 3-5, and the
operator/executor correctly recognized and worked around this rather than accepting a vacuous
pass — see "Vacuous-Pass Discipline" below).

### Defects Claimed Fixed by the Orchestrator — Independently Re-Verified

| # | Defect | Claimed fix location | Verification method | Result |
|---|--------|----------------------|----------------------|--------|
| 1 | CRM-02 tenant-isolation leak: `relationshipKey` was the bare company side key, so a cross-owner SIREN auto-merge would misattribute one owner's contacts/proposal links to another owner's relationship. | `src/lib/reconcile/engine.ts` ~line 419 | Read the file directly. | **CONFIRMED PRESENT.** Line 419: `const relationshipKey = ${u.sideKey}|${ownerId};`, with an inline comment explicitly naming the cross-owner-collision bug it fixes. `PlannedContact`/`proposalLinks` both use this compound key (lines 467, 477, 491). `apply.ts` resolves relationships via the same `${relationship.companyKey}|${relationship.ownerId}` compound key (line 158), so writer and planner agree. |
| 2 | Resumability hole in D-12 merge: step 4's sibling repoint would erase the loser company's id from the pair's own row, breaking retry after a crash. | `src/lib/reconcile/merge.ts`, `ne(id, pairId)` exclusion | Read the file directly. | **CONFIRMED PRESENT.** Lines 197-207: both `companyAId`/`companyBId` repoint UPDATEs are guarded with `ne(schema.companyPairDecisions.id, pairId)`, with a module-header comment (lines 23-31) explaining the resumability rationale and its interaction with the `ON DELETE SET NULL` FK as the "already fully completed" signal. |
| 3 | D-10 degenerate keying: a literal normalized-name pair collapses to `(x, x)` for the phase's dominant no-SIREN case. | Re-keyed onto an unordered pair of side identity keys | Read `31-01-PLAN.md`'s `phase_design_contract`, `src/lib/reconcile/pair-key.ts`, and `engine.ts`'s use of `deriveSideKey`/`canonicalPair`. | **CONFIRMED PRESENT.** `company_pair_decisions.side_a_key`/`side_b_key` (not `name_normalized`) carry the hand-written `LEAST`/`GREATEST` unique index (`drizzle/0008_phase31_reconciliation.sql`, `company_pair_decisions_pair_uq`); `name_normalized` is stored only for lineage, not as the uniqueness carrier. The refinement is recorded explicitly in `31-01-SUMMARY.md`. |

### Load-Bearing Constraints — Independently Re-Verified

| Constraint | Verification | Result |
|---|---|---|
| No DB transactions anywhere in the reconcile module (Neon HTTP driver has none) | `grep -rn "\.transaction(" src/lib/reconcile/ scripts/reconcile-proposals.ts` (excluding test files) | **CONFIRMED.** Zero matches. `merge.ts` and `apply.ts` are both built from individually-atomic, idempotent statements (claim-UPDATE-with-precondition, `ON CONFLICT DO NOTHING` + re-select, `IS NULL`-gated UPDATEs). |
| `proposals.inputs` is immutable — extraction reads it, never writes it | Read `apply.ts` (`applyProposalLinks`) and `merge.ts` (step 2b) `.set(...)` objects directly | **CONFIRMED.** Both `.set(...)` calls contain exactly `{ clientRelationshipId }` — no `inputs` key anywhere in either write path. |
| `drizzle-kit push` forbidden repo-wide | `npm run check:no-drizzle-push` | **CONFIRMED.** Exits 0: "OK: no 'drizzle-kit push' invocations found (723 tracked files scanned)." Migration 0008 was hand-completed, journal-tag-synced (`check:migration-journal-sync` exits 0, "9 migration file(s) checked, 9 journal entrie(s) checked — in sync"), and `db:check` reports "Everything's fine." |
| Name matching goes through `leasetic_normalize_company_name()`, never a TS reimplementation | `grep -c "leasetic_normalize_company_name" src/lib/reconcile/engine.ts` | **CONFIRMED.** Engine calls the DB function via one batched `sql` round trip (lines 134-141); no digit/regex company-name normalizer exists in `engine.ts`. |
| Engine remains source-agnostic; no HubSpot-specific code; "source = proposals" not hard-coded in the matching core | `grep -rn "sources/proposals" src/lib/reconcile/engine.ts` (0 matches); `grep -i "hubspot" engine.ts/apply.ts/merge.ts/run.ts` (only a forward-looking doc comment in `engine.ts`); `run.ts`'s `runReconciliation` takes `source: ReconciliationSource` generically, bound to `proposalsSource` only at the CLI entry point (`scripts/reconcile-proposals.ts`) | **CONFIRMED for the matching/planning core (`engine.ts`) and the orchestrator (`run.ts`).** **CAVEAT (not a Phase 31 blocker, flagged for Phase 32 planning):** `src/lib/reconcile/apply.ts` — the *write* layer — hardcodes the literal `'proposal_extraction'` in 4 `.values({..., source: 'proposal_extraction'})` call sites and one contact-update `WHERE` predicate, rather than deriving it from `plan.sourceId` (which `ReconciliationPlan` already carries as `'proposal_extraction' \| 'hubspot_import'`). This means Phase 32 cannot reuse `applyReconciliationPlan()` unmodified for a HubSpot-sourced plan without either parameterizing the provenance value or duplicating the writer. Neither the ROADMAP nor CONTEXT.md's explicit reuse language ("the engine built here is the one Phase 32 reuses") named the apply/write layer as part of that reuse contract — only the matching/planning core — so this is not scored as a gap against Phase 31's own success criteria, but it is a concrete piece of debt Phase 32's planner should not discover cold. |
| D-11: review queue is admin-only | `app/(admin)/[adminSegment]/companies/review/page.tsx` calls `requireAdmin()` as the first `await`, before any data access; `partnerNavItems()` untouched (asserted by a dedicated `AppSidebar.test.tsx` case) | **CONFIRMED at the code level.** See the human-verification gap below for the one sub-case (authenticated non-admin → 404) that remains operator-attested rather than independently reproduced by this verification pass. |

### Open Questions from CONTEXT.md — Confirmed Decided, Not Dropped

| OQ | Decided in | Resolution |
|---|---|---|
| OQ-1 — re-run idempotency | `31-02-SUMMARY.md` | Row-level skip on `alreadyLinkedRelationshipId`; entity-level idempotent keying (SIREN, owner-scoped name, existing unique indexes). Confirmed live: a second real run over already-linked fixture proposals created 0 of everything, reused 8 companies / 9 relationships / 1 pair. |
| OQ-2 — canonical name selection | `31-02-SUMMARY.md` | Most-frequent raw spelling wins; ties break on earliest `occurredAt`, then lexicographic ascending. Implemented in `engine.ts`'s `pickCanonicalName`. |
| OQ-3 — engine granularity | `31-02-SUMMARY.md` | One global pass across all partners (required for cross-owner SIREN auto-merge, criterion 3, to be possible at all). |
| OQ-4 — provenance scope | `31-01-SUMMARY.md` | `source` column added to all three tables (`companies`, `client_relationships`, `contacts`), not contacts-only. Confirmed live: `source = 'proposal_extraction'` present on all three tables' extracted rows, pre-existing company left unmarked. |
| OQ-5 — contact conflict across provenance | `31-05-SUMMARY.md` | Extraction never touches a contact it did not create; a partner-entered (`source IS NULL`) match is left alone and reported as a skip, enforced both in the planner's classification and DB-compiled into `apply.ts`'s fill-blanks UPDATE `WHERE` clause. |

All five were decided with recorded rationale, not silently assumed — confirmed against the actual SUMMARY files, not merely their frontmatter `key-decisions` bullets.

### D-16 Route Divergence — Confirmed Recorded as a Decision

CONTEXT.md's D-16 text ("its own admin route, alongside the `/[adminSegment]/companies` tree")
was read literally by the UI-SPEC as "sibling directory inside the `companies/` tree" and
implemented at `/[adminSegment]/companies/review`. This is recorded explicitly in three places
this verification read directly: `31-UI-SPEC.md` Assumption A-1, `31-06-SUMMARY.md`'s
"Decisions Made (a)", and a code comment in `app/(admin)/[adminSegment]/companies/review/page.tsx`
itself (lines 31-36) that names the divergence and points at the SUMMARY. Not a silent drift.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `drizzle/0008_phase31_reconciliation.sql` | `source` column ×3 tables, `company_pair_decisions` w/ LEAST/GREATEST unique index | VERIFIED | File exists, hand-completion header present, `check:migration-journal-sync`/`check:no-drizzle-push`/`db:check` all exit 0. |
| `src/lib/reconcile/engine.ts` (`planReconciliation`) | Source-agnostic, zero-write planner | VERIFIED | Zero `insert`/`update`/`delete` calls; zero references to `sources/proposals`; DB-function-only name normalization. |
| `src/lib/reconcile/apply.ts` (`applyReconciliationPlan`) | Idempotent, non-transactional writer | VERIFIED (with the source-hardcoding caveat above) | 27 tests; proposal-link/contact `.set()` objects respect CRM-05; no `.transaction(` call. |
| `src/lib/reconcile/merge.ts` (`mergeCompanyPair`, `recordKeepSeparate`) | D-12 resumable, non-transactional merge | VERIFIED | 17 tests incl. concurrent-race and mid-crash-resume simulations; both orchestrator-flagged defects confirmed fixed in the actual source. |
| `src/lib/reconcile/report.ts` / `drift.ts` | D-14 two-form report, D-15 drift comparator | VERIFIED | 14+16 tests; `.reconcile/` git-ignored. |
| `scripts/reconcile-proposals.ts` | D-13 CLI entry point | VERIFIED | `_load-env` first, Neon-prod typed-confirmation gate, 0/1/2/3 exit-code contract; `db:reconcile[:dry-run]` npm scripts wired. |
| `app/(admin)/[adminSegment]/companies/review/*` | D-16 admin-only review queue UI | VERIFIED | `requireAdmin()` first; PageHero/list/card/MergeDialog/KeepSeparateDialog all present and tested (26 tests across the directory); `partnerNavItems()` unaffected. |
| `docs/operations/reconciliation-import.md` | Operator runbook | VERIFIED | Present; content matches the actual exit-code contract and env-var names. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `engine.ts` | `leasetic_normalize_company_name()` | batched `sql` call | WIRED | Confirmed at lines 134-141. |
| `apply.ts` | `company_pair_decisions` | `onConflictDoNothing()` insert, untargeted (expression index) | WIRED | Confirmed at lines 338-349, with a comment explaining why no `target` is passed. |
| `merge.ts` | `company_pair_decisions.verdict` | `UPDATE ... WHERE verdict IS NULL RETURNING` | WIRED | Confirmed at lines 124-138, 250-259. |
| `actions.ts` | `requireAdmin()` | first `await` in both exported actions | WIRED | Confirmed by `actions.test.ts`'s call-order assertion (19 tests, all passing in this session's run). |
| `route-meta.ts` | `/companies/review` vs `/companies` | ordered tail-match | WIRED | `/companies/review` check precedes `/companies` (lines 52-56); regression-tested. |

### Anti-Patterns Found

None. `grep -nE "TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER"` across all 37 files created/modified by this
phase (per `git log --diff-filter=A` across the phase's tracked paths) returned zero matches.

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|---|---|---|---|
| IMPORT-01 | Client data in proposals extracted into companies/relationships, each proposal linked | SATISFIED | `engine.ts` + `apply.ts`, operator-confirmed live (criterion 2). |
| IMPORT-03 | SIREN matches merge automatically | SATISFIED | `engine.ts` cross-owner SIREN unit merge, operator-confirmed live (criterion 3). |
| IMPORT-04 | Name-only matches flagged, not silently merged | SATISFIED | `engine.ts` flag logic + `company_pair_decisions`, operator-confirmed live (criterion 4). |
| IMPORT-05 | Human resolves each pair in the UI, durable | SATISFIED | `merge.ts` + review-queue UI, operator-confirmed live (criterion 5). |
| IMPORT-06 | Dry-run mode, full report, zero writes | SATISFIED | `report.ts` + `run.ts`'s named zero-write test, operator-confirmed live (criterion 1). |

No orphaned requirements: IMPORT-02 and IMPORT-07 are explicitly out of scope for this phase (both
REQUIREMENTS.md and CONTEXT.md defer them to Phase 32), and neither was claimed by any Phase 31
plan's `requirements:` frontmatter.

### Behavioral Spot-Checks (this session)

| Behavior | Command | Result | Status |
|---|---|---|---|
| Full reconcile test suite | `npx vitest run src/lib/reconcile/ src/lib/crm/ src/lib/db/queries/reconciliation.test.ts src/db/schema.test.ts app/(admin)/[adminSegment]/companies/review/ src/lib/route-meta.test.ts src/components/ui/AppSidebar.test.tsx` | 21 files, 266 tests, all passing | PASS |
| Typecheck | `npm run typecheck` | exit 0 | PASS |
| Lint (scoped to phase files) | `npx eslint src/lib/reconcile/ src/lib/crm/siren.ts src/lib/crm/schemas.ts src/lib/db/queries/reconciliation.ts "app/(admin)/[adminSegment]/companies/review/" scripts/reconcile-proposals.ts` | 0 errors | PASS |
| No-drizzle-push guard | `npm run check:no-drizzle-push` | exit 0 | PASS |
| Migration/journal parity | `npm run check:migration-journal-sync` | exit 0 | PASS |
| Drizzle schema/migration consistency | `npm run db:check` | "Everything's fine" | PASS |
| No `.transaction(` in reconcile module | `grep -rn "\.transaction(" src/lib/reconcile/ scripts/reconcile-proposals.ts` (excl. tests) | 0 matches | PASS |

Note: repo-wide `npm run lint:check` reported 559 pre-existing errors, but every one is in files
untouched by this phase (`src/lib/pdf/*`, `src/lib/storage/*`, `src/lib/xlsx/*` self-flagging their
own restricted-import boundary declarations) — an environment/config artifact of running lint from
this worktree path, not a Phase 31 regression. Scoped lint against every phase-31 file is clean.

### Vacuous-Pass Discipline (worth surfacing explicitly)

31-08-SUMMARY.md documents that the `development` branch's organic data (4 proposals, all clean
SIRENs/names) would have made criteria 3, 4 and 5 pass for the wrong reason — nothing to
reconcile. The operator/executor recognized this, seeded disposable fixtures
(`scripts/seed-reconciliation-fixtures.ts`) to force every code path to actually execute, and even
caught a second-order vacuous pass within criterion 5 itself (an immediate re-run reported
`pairsFlagged: 0` only because every row was already linked, not because suppression worked — this
was rejected as evidence and re-tested by forcing re-derivation). This verification pass regards
that discipline as a positive signal, not merely trusts it, and independently re-confirmed the
underlying code paths (SIREN merge grouping, pair flag/suppress logic, TOCTOU-safe claim) exist and
are unit-tested as claimed.

### Human Verification Required

### 1. Authenticated non-admin access to the review route

**Test:** Sign in as a partner or `sales`-role user and navigate directly to
`/[adminSegment]/companies/review`.
**Expected:** A 404 page — no redirect, no distinguishable error, no trace the route exists.
**Why human:** `requireAdmin()`'s code path is confirmed correct by reading `page.tsx` and
`src/lib/auth/require.ts`, and the logged-out case was independently reproduced (307 to `/login`,
identical to an existing admin route and a nonexistent route — no inference channel). But the
specific authenticated-non-admin → 404 branch was only exercised by the phase's own operator
(31-08-SUMMARY.md), not reproduced by this verification session, which has no partner/sales
credentials available. This is the same gap 31-08-SUMMARY.md itself discloses (PARTIAL, not PASS)
rather than a new finding — carried forward here rather than smoothed into a clean PASS.

### Gaps Summary

No BLOCKER-level gaps and no failed truths. All five ROADMAP success criteria are independently
verified at the codebase level (source code read directly, tests re-run in this session, all
passing) and were additionally confirmed live against a real database by the phase's own operator
checkpoint. The three orchestrator-flagged defect fixes (CRM-02 relationshipKey leak, D-12 merge
resumability hole, D-10 degenerate pair key) are all confirmed present in the actual shipped code,
not merely narrated in a SUMMARY.

Status is `human_needed`, not `passed`, solely because one item requires human reproduction: the
authenticated-non-admin → 404 access check is operator-attested in 31-08-SUMMARY.md, not
independently agent-verified, because no partner/sales credentials are available in this
environment. This is not a new finding — it is the same PARTIAL that 31-08-SUMMARY.md itself
already discloses — carried forward here rather than smoothed into a clean PASS. Per the
verification framework, `passed` is only valid when the human-verification section is empty; here
it is not, so the phase should not be considered fully closed until a human (or an
agent-reproducible non-admin session test) confirms this one item.

One additional, non-blocking observation not previously surfaced: `apply.ts` hardcodes
`source: 'proposal_extraction'` rather than deriving it from `ReconciliationPlan.sourceId`, so the
write layer (unlike the matching engine and orchestrator) will need modification, not just a new
`ReconciliationSource`, when Phase 32 adds HubSpot. This does not fail any Phase 31 success
criterion — the roadmap's reuse commitment names the matching engine, not the writer — but it is
recorded here so Phase 32's planning does not discover it cold.

---

_Verified: 2026-09-02_
_Verifier: Claude (gsd-verifier)_

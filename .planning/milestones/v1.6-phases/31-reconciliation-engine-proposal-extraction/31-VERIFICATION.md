---
phase: 31-reconciliation-engine-proposal-extraction
verified: 2026-09-02T19:40:00Z
status: passed
score: 5/5 truths verified
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 5/5
  gaps_closed:
    - "Authenticated non-admin access to /[adminSegment]/companies/review — previously operator-attested only, now independently agent-reproduced and mutation-tested at the code-composition level (commit 3a548d5, access.test.tsx)"
  gaps_remaining: []
  regressions: []
---

# Phase 31: Reconciliation Engine & Proposal Extraction — Verification Report (Re-Verification)

**Phase Goal:** Every client already implied by existing proposals becomes a real company +
relationship record, built on a reusable dedup engine that a human resolves ambiguity through
once, at import — not fuzzy logic re-derived forever after — and that never writes without a
prior dry run.
**Verified:** 2026-09-02T19:40:00Z
**Status:** passed
**Re-verification:** Yes — the prior pass (2026-09-02T18:10:00Z) held `human_needed` on exactly
one item: the authenticated-non-admin → 404 access check (D-11 / CRM-02). This session
independently re-derived and, where possible, reproduced every carried-forward claim, then judged
the new evidence for that one item on its own merits (see "Access & Non-Leakage Closure" below)
rather than accepting the SUMMARY's framing.

## What This Session Did Differently

This is not a rubber-stamp of the prior report or of `31-08-SUMMARY.md`'s narrative. Specifically,
this session:

1. Read `access.test.tsx`, `require.test.ts`, `require.ts`, and `page.tsx` directly and reasoned
   about what each test double does and does not prove.
2. Ran the full suite (`npx vitest run`) and confirmed 1649 passed / 18 skipped — the claimed
   1643→1649 delta (+6) matches `access.test.tsx`'s 6 new tests exactly, no other file grew.
3. **Independently re-ran the mutation test** claimed in the brief, rather than trusting the
   claim: commented out `await requireAdmin();` in the real `page.tsx`, re-ran
   `access.test.tsx`, and confirmed 5 of 6 tests failed (only "admins are served" passed, since it
   doesn't depend on the guard firing). Restored the file and confirmed all 6 pass again and
   `git diff` shows zero residual change. The mutation-testing claim is accurate, not narrated.
4. Re-read every carried-forward claim's underlying source (`engine.ts`, `merge.ts`, `apply.ts`,
   the migration) rather than re-stating the prior pass's prose.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Dry-run mode produces a full report of every company/relationship it would create, merge, or flag — zero rows written. | VERIFIED | Unchanged from prior pass. `planReconciliation` performs no `insert`/`update`/`delete` (spy-asserted, `engine.test.ts`; named zero-write test in `run.test.ts`). Operator-observed live: table row counts byte-identical before/after a real dry run against seeded fixtures on Neon `development` (31-08-SUMMARY.md). |
| 2 | Real run extracts a company + relationship per distinct client and links each proposal, without altering `inputs`. | VERIFIED | Unchanged. `apply.ts`'s proposal-link `.set(...)` is exactly `{ clientRelationshipId }`; `merge.ts`'s compound-case update is likewise single-key. Operator-observed: SHA-256 digest over every eligible proposal's `inputs` identical before/after a real run; 12/14 fixture links written, 2 correctly skipped. |
| 3 | Two extracted clients sharing a SIREN merge into one company automatically, no human step. | VERIFIED | Unchanged. `engine.ts`'s `deriveSideKey`/`unitsBySideKey` grouping resolves shared-SIREN candidates before pair-flagging ever runs. Operator-observed: SIREN `552100554` → one company, two owners' relationships, zero flagged pairs. |
| 4 | Name-only matches (no SIREN on one/both sides) are never silently merged — they appear in the review queue. | VERIFIED | Unchanged. `engine.ts` flags `differing`/`one_missing`/`both_missing`; `company_pair_decisions` rows inserted pending; `listPendingPairsForAdmin` surfaces them. Operator-observed: 3 pairs flagged, incl. a malformed-SIREN degrade-to-review case (D-03). |
| 5 | A human resolves each flagged pair (merge or keep-separate) durably — never re-flagged. | VERIFIED | Unchanged. `mergeCompanyPair`/`recordKeepSeparate` use a TOCTOU-safe `UPDATE ... WHERE verdict IS NULL RETURNING` claim (17 tests incl. concurrent-race and mid-crash-resume simulations). Operator-observed real merge + keep-separate + forced re-derivation correctly re-flagging only the untouched pair. |

**Score:** 5/5 ROADMAP success criteria VERIFIED at the codebase level (unchanged from the prior
pass — this session re-derived rather than re-quoted the evidence chain for each).

### Access & Non-Leakage Closure (D-11 / CRM-02) — the item that changed

**Prior status:** the authenticated-non-admin → 404 branch was operator-attested only
(31-08-SUMMARY.md), with no agent-reproducible test. Everything else about D-11/CRM-02 (the
logged-out 307 case, the code read of `requireAdmin()` as the first `await` in `page.tsx`) was
already agent-verified.

**New evidence (commit `3a548d5`, `access.test.tsx`, 6 tests):**

The property CRM-02 actually needs is layered. Tracing each layer against what is and is not
exercised by real production code:

1. **`requireAdmin()`'s real role-check logic correctly refuses non-admin roles.** This is proven
   by `require.test.ts`, which imports the REAL `requireAdmin`/`requireUser` from `require.ts` (only
   `next/headers`, `./index` (auth), `@/lib/db`, and `next/navigation` are mocked) — pre-existing
   coverage, unchanged by this commit.
2. **`page.tsx`'s real code halts and never reaches `listPendingPairsForAdmin` when
   `requireAdmin()` rejects.** This is what `access.test.tsx` newly proves, and it proves it
   against the REAL, unmodified `page.tsx` (only `@/lib/auth/require`, `next/navigation`,
   `@/lib/i18n`, `@/lib/db/queries`, and `@/lib/reconcile/actions` are mocked — `page.tsx` itself
   is imported and executed for real). Independently mutation-tested in this session (see above):
   removing the `await requireAdmin()` call breaks 5 of 6 tests, so the assertions are load-bearing
   on the real control flow, not vacuous.
3. **Next.js's own `notFound()` throws internally in production**, which is the mechanism that
   makes #1 + #2 compose into an actual refusal. This is documented framework behavior outside
   this codebase's control; `access.test.tsx` simulates it faithfully (`digest:
   'NEXT_HTTP_ERROR_FALLBACK;404'` matches Next's real App Router digest format) but does not
   independently verify Next.js's own source.
4. **A live authenticated non-admin session hitting the real deployed route over real HTTP** — the
   literal scenario the original human-verification item named — remains something no agent in
   this environment can reproduce (no partner/sales credentials). This layer is still evidenced
   only by the operator's one-time live observation in `31-08-SUMMARY.md`.

**Judgment.** `access.test.tsx` does not "test the mock" for the property that matters here — its
load-bearing assertion (`expect(listPendingPairsForAdminMock).not.toHaveBeenCalled()`) exercises
real, unmodified `page.tsx` code, and the mutation test in this session confirms the assertions
would fail if that code regressed. Combined with `require.test.ts`'s pre-existing coverage of the
real refusal logic (layer 1) and Next.js's well-established throw contract (layer 3, framework
trust, not this codebase's risk surface), the composition property CRM-02 requires — a non-admin
session can never reach `listPendingPairsForAdmin` — is now proven by regression-protected tests
against real production code at every layer this codebase controls. The only layer NOT
independently re-verified by an agent is #4 (the literal live HTTP/session round trip), which
already has one live, credible, human-attested confirmation on record and was never in doubt at
the logic level (the prior report already said `requireAdmin()`'s code path was "confirmed correct
by reading the source").

Given the prior report's own framing — "not a new finding... until a human (or an
agent-reproducible non-admin session test) confirms this one item" — this session judges
`access.test.tsx` + the independently-reproduced mutation test to satisfy that bar. This is not
"inflating a partial to a pass": the previously-open risk was that page.tsx's wiring could
silently swallow a refusal or fire the query regardless of the guard's outcome; that specific risk
is now closed by a test that fails when the real guard call is removed. The residual risk (an
agent cannot dial in as a live partner) is a permanent property of this environment, not a
narrowing gap that further test-writing could close — treating it as an indefinite blocker would
mean this item could never leave `human_needed` regardless of code quality. It is recorded below
as a non-blocking, informational limitation rather than a human-verification item.

**Reclassified status:** VERIFIED (composition/wiring, code-controlled layers) — with the residual
live-HTTP layer noted as an information-only limitation, not a gap.

### Defects Claimed Fixed by the Orchestrator — Independently Re-Verified

| # | Defect | Claimed fix location | Verification method | Result |
|---|--------|----------------------|----------------------|--------|
| 1 | CRM-02 tenant-isolation leak: `relationshipKey` was the bare company side key, so a cross-owner SIREN auto-merge would misattribute one owner's contacts/proposal links to another owner's relationship. | `src/lib/reconcile/engine.ts` ~line 419 | Read the file directly. | **CONFIRMED PRESENT.** `const relationshipKey = \`${u.sideKey}|${ownerId}\`;` with an inline comment naming the cross-owner-collision bug it fixes; `apply.ts` resolves via the same compound key. |
| 2 | Resumability hole in D-12 merge: step 4's sibling repoint would erase the loser company's id from the pair's own row, breaking retry after a crash. | `src/lib/reconcile/merge.ts`, `ne(id, pairId)` exclusion | Read the file directly. | **CONFIRMED PRESENT.** Both repoint UPDATEs guarded with `ne(schema.companyPairDecisions.id, pairId)`, module-header comment explains the resumability rationale. |
| 3 | D-10 degenerate keying: a literal normalized-name pair collapses to `(x, x)` for the phase's dominant no-SIREN case. | Re-keyed onto an unordered pair of side identity keys | Read migration + `pair-key.ts` + `engine.ts`. | **CONFIRMED PRESENT.** `side_a_key`/`side_b_key` carry the `LEAST`/`GREATEST` unique index; `name_normalized` is lineage-only. |

### Load-Bearing Constraints — Independently Re-Verified

| Constraint | Verification | Result |
|---|---|---|
| No DB transactions anywhere in the reconcile module | `grep -rn "\.transaction(" src/lib/reconcile/ scripts/reconcile-proposals.ts` (excl. tests) | **CONFIRMED.** Zero matches. |
| `proposals.inputs` is immutable | Read `apply.ts`/`merge.ts` `.set(...)` objects | **CONFIRMED.** No `inputs` key in either write path. |
| `drizzle-kit push` forbidden repo-wide | `npm run check:no-drizzle-push` (re-run this session) | **CONFIRMED.** Exit 0. |
| Name matching goes through `leasetic_normalize_company_name()` | `grep` in `engine.ts` | **CONFIRMED.** No TS reimplementation. |
| Engine remains source-agnostic (matching/planning core) | `grep` sweep across `engine.ts`/`run.ts` | **CONFIRMED for the core.** `apply.ts` write-layer hardcoding of `'proposal_extraction'` remains an open, non-blocking Phase-32 note (unchanged from prior pass). |
| D-11: review queue is admin-only | `page.tsx` calls `requireAdmin()` as the first `await`; `access.test.tsx` (new) proves the real page halts before the sensitive query when the guard refuses | **CONFIRMED, now with regression-protected test coverage (upgraded from prior pass's "confirmed at the code level" only).** |

### Open Questions from CONTEXT.md — Confirmed Decided, Not Dropped

Unchanged from the prior pass — re-spot-checked, not re-derived line by line: OQ-1 (re-run
idempotency, `31-02-SUMMARY.md`), OQ-2 (canonical name selection), OQ-3 (single global pass), OQ-4
(provenance on all three tables), OQ-5 (contact conflict deference to partner-entered data). All
five are recorded with rationale in their respective plan SUMMARYs, not silently assumed.

### D-16 Route Divergence — Confirmed Recorded as a Decision

Unchanged. `31-UI-SPEC.md` Assumption A-1, `31-06-SUMMARY.md`, and a code comment in `page.tsx`
(lines 31-36) all name the `/companies/review` vs. "own top-level route" divergence explicitly.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `drizzle/0008_phase31_reconciliation.sql` | `source` ×3 tables, `company_pair_decisions` w/ LEAST/GREATEST unique index | VERIFIED | Unchanged; `check:no-drizzle-push` re-confirmed exit 0 this session. |
| `src/lib/reconcile/engine.ts` (`planReconciliation`) | Source-agnostic, zero-write planner | VERIFIED | Unchanged. |
| `src/lib/reconcile/apply.ts` (`applyReconciliationPlan`) | Idempotent, non-transactional writer | VERIFIED (source-hardcoding caveat stands) | Unchanged. |
| `src/lib/reconcile/merge.ts` | D-12 resumable, non-transactional merge | VERIFIED | Unchanged. |
| `src/lib/reconcile/report.ts` / `drift.ts` | D-14/D-15 | VERIFIED | Unchanged. |
| `scripts/reconcile-proposals.ts` | D-13 CLI entry point | VERIFIED | Unchanged. |
| `app/(admin)/[adminSegment]/companies/review/*` | D-16 admin-only review queue UI | VERIFIED | Now includes `access.test.tsx` (6 tests, independently mutation-verified this session) alongside the pre-existing 26. |
| `docs/operations/reconciliation-import.md` | Operator runbook | VERIFIED | Unchanged. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `engine.ts` | `leasetic_normalize_company_name()` | batched `sql` call | WIRED | Unchanged. |
| `apply.ts` | `company_pair_decisions` | `onConflictDoNothing()` insert | WIRED | Unchanged. |
| `merge.ts` | `company_pair_decisions.verdict` | `UPDATE ... WHERE verdict IS NULL RETURNING` | WIRED | Unchanged. |
| `actions.ts` | `requireAdmin()` | first `await` | WIRED | Unchanged. |
| `page.tsx` | `requireAdmin()` → `listPendingPairsForAdmin` | sequential `await`, no try/catch | WIRED, now regression-tested against a throwing refusal | New this session: `access.test.tsx` + independently-reproduced mutation test. |
| `route-meta.ts` | `/companies/review` vs `/companies` | ordered tail-match | WIRED | Unchanged. |

### Anti-Patterns Found

None. `access.test.tsx` itself scanned for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` — zero matches.
No stub patterns (`return null`, empty handlers, hardcoded-empty state feeding render) in the new
file; every mock exists to isolate a boundary the test doesn't own (auth module, Next navigation,
i18n, DB queries), consistent with the existing test suite's mocking conventions.

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|---|---|---|---|
| IMPORT-01 | Client data extracted into companies/relationships, proposals linked | SATISFIED | Unchanged. |
| IMPORT-03 | SIREN matches merge automatically | SATISFIED | Unchanged. |
| IMPORT-04 | Name-only matches flagged, not silently merged | SATISFIED | Unchanged. |
| IMPORT-05 | Human resolves each pair in the UI, durable | SATISFIED | Unchanged. |
| IMPORT-06 | Dry-run mode, full report, zero writes | SATISFIED | Unchanged. |

No orphaned requirements: IMPORT-02/IMPORT-07 remain explicitly out of scope, deferred to Phase 32
per both REQUIREMENTS.md and ROADMAP.md.

### Behavioral Spot-Checks (this session)

| Behavior | Command | Result | Status |
|---|---|---|---|
| Full repo test suite | `npx vitest run` | 129 files passed, 3 skipped; 1649 tests passed, 18 skipped | PASS |
| Scoped reconciliation + access suite | `npx vitest run "app/(admin)/[adminSegment]/companies/review/" src/lib/auth/require.test.ts` | 5 files, 38 tests, all passing | PASS |
| **Mutation test (independently reproduced, not trusted from the brief)** | Removed `await requireAdmin();` from real `page.tsx`, re-ran `access.test.tsx`, restored the file | 5 of 6 tests failed on mutation; all 6 pass restored; `git diff` clean after restore | PASS |
| No-drizzle-push guard | `npm run check:no-drizzle-push` | exit 0 | PASS |

### Gaps Summary

None. The single item that previously held the phase at `human_needed` — the authenticated
non-admin → 404 access check — is now backed by a regression-protected, independently
mutation-verified test against real production code at every layer this codebase controls
(`require.ts`'s real refusal logic via pre-existing `require.test.ts`; `page.tsx`'s real halt
behavior via the new `access.test.tsx`). The one layer that remains unreproduced by an agent — a
literal live HTTP session as an authenticated partner — is a permanent constraint of this
environment (no partner/sales credentials available to any agent), not a narrowing gap, and
already has one credible live confirmation on record (31-08-SUMMARY.md). This is recorded as a
non-blocking, informational note rather than a human-verification item, since holding the phase
open indefinitely for an environmental constraint that no further code change could close would
not itself represent unverified risk in the code.

The Phase 32 non-blocking observation carries forward unchanged: `apply.ts` hardcodes
`source: 'proposal_extraction'` at 4 `.values()` call sites and one contact-update predicate
rather than deriving it from `ReconciliationPlan.sourceId`, so the write layer (unlike the
matching engine and orchestrator) will need modification when Phase 32 adds HubSpot. Not a Phase
31 success-criterion failure — the roadmap's reuse commitment names the matching engine, not the
writer — but recorded so Phase 32's planner does not discover it cold.

---

_Verified: 2026-09-02T19:40:00Z_
_Verifier: Claude (gsd-verifier)_

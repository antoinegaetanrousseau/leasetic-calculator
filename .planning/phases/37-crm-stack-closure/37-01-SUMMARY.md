---
phase: 37-crm-stack-closure
plan: 01
subsystem: auth
tags: [nextjs, admin-authorization, vitest, admin-09, server-components]

# Dependency graph
requires:
  - phase: 36-gate-repair-planning-record-hygiene
    provides: a clean lint:check baseline (559 phantom worktree errors removed) this plan proves itself against
provides:
  - server-derived role === 'admin' bypass on the /proposals/[id] ownership guard (GAP-01 closed)
  - 20th ADMIN-09 grep-contract gate over /proposals/[id], with committed positive + negative non-vacuity controls
affects: [38-shell-dialogs-visual-conventions, 40-milestone-record-closure]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server-derived role gate: const { session, role } = await requireUser(); const isAdmin = role === 'admin'; — never a request param/header/client prop (Phase 18 D-11 / Phase 24 VIEW-04 precedent)"
    - "ADMIN-09 non-vacuous grep gate: a committed positive control (non-empty render + >=2 fixture markers) proven BEFORE the absence assertion, plus a committed negative control proving the shared assertNoCommissionLeakage helper actually throws"

key-files:
  created: []
  modified:
    - "app/(authed)/proposals/[id]/page.tsx"
    - "app/(authed)/proposals/[id]/page.test.tsx"
    - "tests/admin-09-grep-contracts.test.ts"

key-decisions:
  - "D-37-01: admin bypass expressed as isAdmin = role === 'admin' then !isAdmin && ownership-mismatch, with !proposal kept as an independent short-circuit ahead of it, so absence is never bypassable"
  - "D-37-02: envelope needed no adjustment (page is structurally commission-free); the 20th gate is a regression guard, not a leak fix"
  - "Consolidated the test file's two duplicate vi.mock('@/lib/auth/require', ...) factories into one exporting both requireAdmin and requireUser, since only the last-registered factory of a duplicate pair was ever actually in effect"

patterns-established:
  - "Non-vacuity proof for a commission-absence gate: positive control (fixture markers must survive the render) + negative control (the assertion helper must throw on a fixture) + a during-implementation mutation check (splice commission_pct into the fixture, observe the gate fail, revert) recorded verbatim in the SUMMARY"

requirements-completed: [GAP-01]

# Metrics
duration: ~25min
completed: 2026-09-05
---

# Phase 37 Plan 01: Admin Oversight Bypass + 20th ADMIN-09 Gate Summary

**Server-derived `role === 'admin'` bypass closes the `/proposals/[id]` admin dead end (GAP-01), pinned by a 20th ADMIN-09 grep-contract gate proven to actually fail on commission-bearing HTML.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-05T20:13:46Z (approx, session start)
- **Completed:** 2026-09-05T22:12:27+02:00 (last task commit)
- **Tasks:** 3 completed (Task 3 was verification-only, no source changes)
- **Files modified:** 3

## Accomplishments

- An admin opening `/proposals/{id}` for a proposal owned by any partner now sees the detail page instead of a 404; partner and sales callers still get the identical 404 as before, and an admin requesting a nonexistent id still 404s (absence is never bypassable).
- The role is read exclusively from `requireUser()` (a per-request DB read, fail-closed to `'partner'`) — confirmed by grep that no `searchParams`, header, or client-supplied value participates in the guard.
- A 20th ADMIN-09 gate renders the real, now-admin-reachable `/proposals/[id]` page over a maximum-render-surface fixture and asserts zero `commission_pct`/`_pct` leakage, with a committed positive control (non-empty render + 2 fixture markers) and a committed negative control (the shared assertion helper is proven to throw), plus a during-implementation mutation check that was observed to fail and was reverted before commit.
- Consolidated the test file's two duplicate `@/lib/auth/require` mock factories (both `requireAdmin`-only) into one exporting both `requireAdmin` and `requireUser`; all 19 pre-existing gates re-verified green after the merge.

## Final Guard Expression (exact)

```typescript
const { session, role } = await requireUser();
...
const isAdmin = role === 'admin';
if (!proposal || (!isAdmin && proposal.userId !== session.user.id)) {
  notFound();
}
```

## Task Commits

Each task was committed atomically:

1. **Task 1: Server-derived admin bypass on the proposal detail guard (D-37-01)** - `4a09292` (feat)
2. **Task 2: 20th ADMIN-09 gate over /proposals/[id], proven non-vacuous (D-37-02)** - `0ea16d5` (test)
   - Follow-up fix (discovered while satisfying Task 3's `npm run typecheck` gate) - `3a04639` (fix)
3. **Task 3: Full gate run against the Phase 36 baseline** - verification only, no commit (all four CI gates green; see below)

**Plan metadata:** committed together with this SUMMARY via the final metadata commit.

## Pre/Post Mock-Consolidation Gate Counts

- **Before consolidation:** `tests/admin-09-grep-contracts.test.ts` carried 19 pre-existing `it()` cases across Gates 1-12 (Surfaces 1-5 non-exempt HTML gates + the XLSX Gate 10 + LcReferencesList Gates 11-12), plus 2 duplicate `vi.mock('@/lib/auth/require', ...)` factories (lines ~68 and ~531, both `requireAdmin`-only — only the second, later-hoisted one was ever actually in effect).
- **After consolidation:** 1 single `vi.mock('@/lib/auth/require', ...)` factory exporting both `requireAdmin` and `requireUser`. All 19 pre-existing `it()` cases re-run and pass unchanged. 2 new cases added (Gate 13's render assertion + its negative control) for **21 total**.

## Non-Vacuity Mutation Check (observed, then reverted)

During implementation, `clientCo: 'Gate13 Client Corp'` was temporarily changed to `clientCo: 'Gate13 Client Corp commission_pct'` in the Gate 13 fixture (keeping the fixture markers intact so the positive control did not mask the result) and the suite was re-run. The gate failed with:

```
AssertionError: D-29 strict: /proposals/[id] detail page (admin bypass path) HTML must not surface 'commission_pct' token: expected '<div><div style="display:flex;align-i…' not to match /\bcommission_pct\b/i
```

The splice was reverted immediately after observing the failure (confirmed via `diff` against a pre-mutation backup — byte-identical). `grep -c "commission_pct" tests/admin-09-grep-contracts.test.ts` returns matches only in pre-existing comments/regex literals and the negative-control `it()` — no stray mutation artifact remains.

## Files Created/Modified

- `app/(authed)/proposals/[id]/page.tsx` - added the `role` destructure and the `isAdmin` bypass on the ownership guard; `!proposal` remains an independent short-circuit; comment block extended with D-37-01/T-37-01-01 rationale
- `app/(authed)/proposals/[id]/page.test.tsx` - `beforeEach` default now explicit `role: 'partner'`; added a `next/navigation` `notFound` mock (throws a sentinel error) and a new describe block with the 4 GAP-01 cases (admin bypass renders; partner denied; sales denied; admin + absent id denied)
- `tests/admin-09-grep-contracts.test.ts` - consolidated the duplicate `@/lib/auth/require` mocks into one; added `@/lib/db/queries` (`getProposalById`) and the four heavy-component mocks (`EmbeddedPdfPreview`, `DeleteButtonClient`, `RestoreButtonClient`, `CopyRefButton`); added Gate 13 (render + positive control + absence assertion) and its negative-control `it()`

## Decisions Made

- Admin-bypass shape: an explicit `const isAdmin = role === 'admin';` boolean rather than folding the comparison inline, so the acceptance-criterion substring `role === 'admin'` is unambiguous and the guard reads the same way as `app/(authed)/page.tsx`'s existing `isAdmin` derivation.
- Comment wording in both modified files avoids literally repeating tokens the plan's own grep-based acceptance criteria check for (e.g. `notFound()`, `searchParams`, `vi.mock('@/lib/auth/require'`, `commission_pct`) outside their intended single occurrence, so the automated greps measure real code shape rather than prose.
- Gate 13's fixture is built directly against the full `ProposalRow` schema shape (all 21 columns, no `as ProposalRow` cast) rather than mirroring `page.test.tsx`'s partial-fixture-plus-cast pattern, which only type-checks there because of an unused `...overrides: Partial<ProposalRow>` spread that widens the literal's inferred type. See Deviations below.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Gate 13 fixture failed `tsc --noEmit` (TS2352 insufficient overlap)**
- **Found during:** Task 3 (`npm run typecheck` gate run)
- **Issue:** The initial Gate 13 fixture was modeled on `page.test.tsx`'s `makeProposal` object literal (including non-schema fields `pdfBlobUrl`, `updatedAt`, `completedSteps`, and `schemaVersion: 1` as a number) cast with `as ProposalRow`. That pattern only type-checks in `page.test.tsx` because its literal ends with `...overrides` (typed `Partial<ProposalRow>`), which widens the literal's inferred type to include all of `ProposalRow`'s optional keys. Without that spread, `tsc` correctly rejected the cast as not sufficiently overlapping — missing `pdfSha256`, `pdfSizeBytes`, `duplicatedFromId`, `clientRelationshipId`, `outcome`, `outcomeDate`, `outcomeReason`.
- **Fix:** Rebuilt the fixture against the full `proposals` table schema (all 21 columns, `schemaVersion` as the correct `string` type), with no assertion cast needed.
- **Files modified:** `tests/admin-09-grep-contracts.test.ts`
- **Verification:** `npm run typecheck` exits 0; `npx vitest run tests/admin-09-grep-contracts.test.ts` still 21/21 passing after the fix.
- **Committed in:** `3a04639`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** No scope creep — fixed a type-correctness defect surfaced by the plan's own Task 3 gate, in the same file the plan already modifies.

## Issues Encountered

None beyond the deviation above.

## User Setup Required

None - no external service configuration required.

## Full Gate Run (Task 3)

- **`npm run lint:check`** — exit 0, zero warnings (`--max-warnings=0`).
- **`npm run typecheck`** — exit 0.
- **`npm test`** — exit 0. **2326 passed, 61 skipped** (172 test files passed, 6 skipped, 178 total). Baseline was 2320 passing / 61 skipped; delta of **+6** accounts exactly for this plan's additions: 4 new cases in `app/(authed)/proposals/[id]/page.test.tsx` (Task 1) + 2 new cases in `tests/admin-09-grep-contracts.test.ts` (Task 2: Gate 13 render + negative control). Skipped count unchanged.
- **`npm run build`** — exit 0, compiled successfully, all routes generated including `/proposals/[id]`.
- **`git diff --name-only`** against the plan's start commit lists exactly the three files in `files_modified`: `app/(authed)/proposals/[id]/page.tsx`, `app/(authed)/proposals/[id]/page.test.tsx`, `tests/admin-09-grep-contracts.test.ts`. No `package.json`/`package-lock.json` change.

## Next Phase Readiness

- GAP-01 is closed. UAT scenario 9 ("Admin relationship detail — and its known dead end" in `30-UAT.md`) can now be walked for real during Phase 37's CLOSE-01/CLOSE-03 consolidated operator walk (D-37-04), which per that decision must happen AFTER this bypass lands — it now has.
- No blockers for the remaining Phase 37 plans (CLOSE-04's Phase 34 verification/review, the consolidated walk, GAP-03's two INFO fixes).

## Self-Check: PASSED

- FOUND: `app/(authed)/proposals/[id]/page.tsx`
- FOUND: `app/(authed)/proposals/[id]/page.test.tsx`
- FOUND: `tests/admin-09-grep-contracts.test.ts`
- FOUND: `.planning/phases/37-crm-stack-closure/37-01-SUMMARY.md`
- FOUND commit: `4a09292`
- FOUND commit: `0ea16d5`
- FOUND commit: `3a04639`

---
*Phase: 37-crm-stack-closure*
*Completed: 2026-09-05*

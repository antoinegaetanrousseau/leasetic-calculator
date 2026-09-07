---
phase: 40-milestone-record-closure
reviewed: 2026-09-07T20:49:38Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - app/(authed)/proposals/new/_components/RecapSection.tsx
  - app/(authed)/proposals/new/parametres/ParametresFormCard.tsx
  - src/components/proposal/ProposalForm.tsx
  - src/components/proposals/DuplicatePrefillToast.tsx
  - src/lib/calc/schema.ts
  - tests/_planning-docs.ts
  - tests/phase-38-closure-artifacts.test.ts
  - tests/planning-docs-resolver.test.ts
  - tests/probe-write-isolation-contracts.test.ts
findings:
  critical: 1
  warning: 0
  info: 1
  total: 2
status: issues_found
---

# Phase 40: Code Review Report

**Reviewed:** 2026-09-07T20:49:38Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Plan 40-02's dead-component deletion (`ProposalForm.tsx` 557→66 lines) is clean: `eslint --max-warnings=0`
and `tsc --noEmit` both pass with zero output, no other file in the tree imports the deleted `ProposalForm`
component or its removed exports (`ProposalFormProps`, `DURATION_OPTIONS`), and the four comment-residue
files (`RecapSection.tsx`, `ParametresFormCard.tsx`, `DuplicatePrefillToast.tsx`, `schema.ts`) now cite
real, current line numbers and an accurate description of the D-25 server-side duplicate-prefill flow
(verified against `app/(authed)/proposals/new/parametres/page.tsx`'s actual implementation).

Plan 40-06's `resolvePhaseDoc()` helper (`tests/_planning-docs.ts`) is well-built for the stated goal:
it fails loudly (throws, never returns silently) both when a document is missing from both candidate
homes and when it exists in both (a half-migrated archive), it globs by phase-number prefix with a
properly escaped regex (handles decimal phase numbers like `31.1` without a "." wildcard collision), and
it matches archive directories generically by a `*-phases` suffix rather than hardcoding `v1.6`/`v1.7`,
so it will keep working across the next archive move (v1.8, phases 36-40) without hand-repair. All three
consumer suites (`tests/phase-38-closure-artifacts.test.ts`, `tests/planning-docs-resolver.test.ts`,
`tests/probe-write-isolation-contracts.test.ts`) pass against the current repo state (24/24 tests green).

The one Critical finding below is exactly the class of bug the review brief asked me to hunt for
directly: an "assumption that holds on this developer's disk but not in a fresh clone." Plan 40-06's
final commit tracked `tests/_planning-docs.ts` because it had been untracked, but a fourth, closely
related consumer of that same helper — `tests/phase-37-closure-artifacts.test.ts`, which predates this
phase and which `tests/_planning-docs.ts`'s own module docblock and the file's own extraction note
describe as the helper's origin file — was never committed to git at all, in any commit, on any branch.
On a fresh `git clone` + CI checkout, this file will not exist, so a full suite of 11 tests (CLOSE-01 /
CLOSE-03 / CLOSE-04 gap coverage for phases 30/33/34) silently never runs, with no red build to notice.

## Critical Issues

### CR-01: `tests/phase-37-closure-artifacts.test.ts` — a direct consumer of this phase's own fixed helper — was never committed, so a fresh clone silently drops 11 tests

**File:** `tests/phase-37-closure-artifacts.test.ts` (whole file; not committed in any revision)
**Issue:**
`git log --all --oneline -- tests/phase-37-closure-artifacts.test.ts` returns nothing, and
`git ls-files --error-unmatch tests/phase-37-closure-artifacts.test.ts` fails with
`did not match any file(s) known to git` — this file exists only on this developer's working tree, never
as a git object. It imports `REPO_ROOT` and `readPhaseDoc` from `./_planning-docs` (line 54) and asserts
against `readPhaseDoc(30, '30-UAT.md')`, `readPhaseDoc(33, '33-VERIFICATION.md')`,
`readPhaseDoc(34, '34-VERIFICATION.md')`, and `readPhaseDoc(34, '34-REVIEW.md')` — i.e. it is a real,
already-passing consumer of the exact helper Plan 40-06 repaired and tracked in this phase's final commit
(`f6649b9`), and its own docblock (lines 11-49) is verbatim the same "why the archive-resilient resolver
exists" text that now also appears in `tests/_planning-docs.ts`'s module docblock — the two files are
explicitly linked in the project's own commentary, yet only one of them made it into git.

`.github/workflows/ci.yml`'s test job does `actions/checkout@v4` (a clean clone) followed by `npm test`
(vitest, which globs `tests/**/*.test.ts`). Because this file has no git object, the CI checkout will
never materialize it, so its `describe('CLOSE-01 ...')`, `describe('CLOSE-03 ...')`, and
`describe('CLOSE-04 ...')` blocks (11 tests total, confirmed passing when run against this working tree)
never execute in CI. There is no failing test to signal this — the suite simply isn't there, which is
worse than a red test: a document regression in `30-UAT.md`, `33-VERIFICATION.md`, `34-VERIFICATION.md`,
or `34-REVIEW.md` (the exact things CLOSE-01/03/04 exist to catch, including the "34-REVIEW.md file-line
citations still resolve on disk" check) would ship silently.

This is not introduced by Phase 40 (the file predates it, per its own "Phase 38 Nyquist gap-fill pass"
extraction note), but Phase 40 is the phase that specifically audited and fixed this exact untracked-helper
failure mode for `tests/_planning-docs.ts` and stopped one file short of its own closely-related sibling —
the commit message "track tests/_planning-docs.ts, the helper the three repaired suites import" implies
the tracking problem was fully closed, when a fourth, directly-coupled consumer remains unfixed.

(Three further test files are also untracked for the same underlying reason —
`tests/button-focus-conventions.test.ts`, `tests/reui-blocks-deletion.test.ts`,
`tests/seed-script-registration.test.ts` — though these are unrelated to the planning-docs resolver and
outside this phase's file scope; flagging here only as corroborating evidence that "untracked test file"
is a live, recurring failure mode in this repo, not a one-off.)

**Fix:**
```bash
git add tests/phase-37-closure-artifacts.test.ts
git commit -m "test: track tests/phase-37-closure-artifacts.test.ts, a resolvePhaseDoc() consumer left untracked"
```
Then verify with a real fresh-clone simulation (not just `git status`), since `git status` on a working
tree with the file already present on disk will not by itself prove the file was previously invisible to
`git ls-files`:
```bash
git clone --no-local . /tmp/leasetic-freshclone-check
cd /tmp/leasetic-freshclone-check && npm ci && npx vitest run tests/phase-37-closure-artifacts.test.ts
```
Also audit and track (or deliberately gitignore with a comment explaining why) the three other untracked
test files found above, so this class of gap doesn't recur.

## Info

### IN-01: `tests/_planning-docs.ts`'s `REPO_ROOT = process.cwd()` assumes vitest is invoked from the repo root

**File:** `tests/_planning-docs.ts:55`
**Issue:** `REPO_ROOT` (and therefore every relative resolution `resolvePhaseDoc()`/`findPhaseDirsByNumber()`
performs against `.planning/phases` and `.planning/milestones`) is derived from `process.cwd()` at module
load time, not from the test file's own location (e.g. via `import.meta.url`) or from a git-root lookup.
`vitest.config.ts` has no explicit `root` override, so this works today because `npm test` /
`npx vitest run` are always invoked from the package root — but it is an implicit, undocumented
assumption rather than an enforced one. If a future script invokes vitest from a different working
directory (e.g. a monorepo tool, or a CI step that `cd`s into a subdirectory first), `LEGACY_PHASES_DIR`
and `MILESTONE_ARCHIVES_DIR` would silently resolve to nonexistent paths and every `resolvePhaseDoc()`
call would throw the (correct, loud) "not found in EITHER location" error — the failure mode is safe
(loud, not silent), so this is Info rather than a defect, but worth a one-line comment recording the
assumption for the next person who moves how these tests are invoked.
**Fix:** Add a comment above `REPO_ROOT` noting the invocation-cwd assumption, or make it robust:
```ts
import { fileURLToPath } from 'node:url';
// Repo root is two levels up from this file (tests/_planning-docs.ts -> <root>).
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
```

---

_Reviewed: 2026-09-07T20:49:38Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

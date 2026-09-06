---
phase: 37-crm-stack-closure
reviewed: 2026-09-06T12:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - app/(authed)/proposals/[id]/page.tsx
  - app/(authed)/proposals/[id]/page.test.tsx
  - tests/admin-09-grep-contracts.test.ts
  - app/(authed)/page.tsx
  - src/lib/momentum/badges.ts
  - src/lib/momentum/badges.test.ts
  - app/api/proposals/[id]/pdf/route.ts
  - app/api/proposals/[id]/pdf/route.test.ts
findings:
  critical: 0
  warning: 3
  info: 0
  total: 3
status: resolved
---

# Phase 37: Code Review Report

**Reviewed:** 2026-09-06
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

The core of this phase — the D-37-01 admin bypass on `/proposals/[id]` and its extension to the
PDF route — is sound. `role` is genuinely server-derived from `requireUser()`'s per-request DB
read (`src/lib/auth/require.ts:54-77`), fails closed to `'partner'` on an unrecognized value, and
is never read from a route param, header, or client prop. `!proposal` is a correct independent
short-circuit ahead of the role check on both surfaces (JS `||` short-circuit means the ownership
comparison is never evaluated once `!proposal` is true, so there is no null-deref risk either).
`sales` does not ride the bypass on either surface — verified directly in both test files (page
Case 3, route Test 4). The 20th ADMIN-09 gate (Gate 13) is real: it renders the actual
`ProposalDetailPage` component through the actual admin-bypass path, asserts two fixture markers
survive the render before asserting absence (so a silently-empty render cannot pass), and ships a
committed negative control that proves the shared assertion helper actually throws. The mock
consolidation in `tests/admin-09-grep-contracts.test.ts` only added `requireUser` alongside the
pre-existing `requireAdmin` factory; no other gate in the file calls `requireUser()`, so the 19
pre-existing gates are unaffected. `BADGE_THRESHOLDS` is frozen at both nesting levels with a
dedicated test proving a shallow-only freeze would have failed. The `!isAdmin` removal in
`app/(authed)/page.tsx` is provably a no-op — `momentum` is already null-gated at the data layer
(line 93's ternary), one level up from the render.

The gap is downstream of the bypass rather than in the bypass itself: making `/proposals/[id]`
admin-reachable exposed three action controls (Delete, Restore, Duplicate) that still enforce
owner-only semantics one layer down, and nothing in this phase adjusted them or hid them for the
admin viewer. Two of the three findings below trace to that same root cause on the two files this
phase edited; the third is a pre-existing test-fixture type-safety defect that the sibling ADMIN-09
gate ran into and fixed for its own file, but which was left in place in `page.test.tsx`.

## Warnings

### WR-01 — RESOLVED 2026-09-06 (commit follows this review)

**Status: fixed.** Duplicate and Delete/Restore are now gated on `isOwner`
(`proposal.userId === session.user.id`) in `app/(authed)/proposals/[id]/page.tsx`, not on
`!isAdmin` as this review suggested. The suggested `!isAdmin` gate would have been a regression:
admins DO own proposals (e.g. LC-2026-002, LC-2026-003 under antoine.rousseau), and it would
have stripped their own Duplicate/Delete controls. `isOwner` is also the exact predicate the
handlers already filter on, so affordance and capability now move together.

Download is deliberately NOT gated — `/api/proposals/[id]/pdf` honours the D-37-01 admin bypass
since `7999759`, so oversight keeps read access to the document.

Four tests added, proven non-vacuous: with the gate neutralised to `true`, "WR-01 a" and
"WR-01 b" fail (`not to contain 'Dupliquer'`; `expected <button> to be null`). Note the first
draft of those tests asserted on the French labels 'Supprimer'/'Restaurer' and was VACUOUS —
`DeleteButtonClient`/`RestoreButtonClient` are mocked to stubs in that test file, so those
strings never reach the DOM. The assertions were moved onto the stub testids.

Widening the handlers so an admin can delete or duplicate another partner's proposal remains an
open, separate decision — deliberately not taken.

---

#### Original finding (retained for the record)

### WR-01: Admin viewing another user's proposal sees action buttons that either silently fail or silently produce garbage data

**File:** `app/(authed)/proposals/[id]/page.tsx:339-374`
**Issue:** The action stack (Download, Duplicate, Delete/Restore) renders unconditionally — there
is no `isAdmin` check gating any of these three controls, even though `isAdmin` is already in
scope from line 58. Only Download (`/api/proposals/[id]/pdf`) was updated to honor the admin
bypass (commit `7999759`). The other two remain owner-scoped one layer down, with materially
different failure modes:

- **Delete** (`DeleteButtonClient` → `POST /api/proposals/[id]/delete`) and **Restore**
  (`RestoreButtonClient` → `POST /api/proposals/[id]/restore`) call `softDeleteProposal` /
  `restoreProposal` (`src/lib/db/queries/proposals.ts:432-477`), both of which filter
  `and(eq(proposals.id, id), eq(proposals.userId, userId), ...)`. For an admin viewing a
  proposal owned by someone else, the `WHERE` clause matches zero rows, `affected === 0`, and the
  route returns 404 → the button's `onClick` shows a generic error toast
  (`proposal.toast.delete.error` / `proposal.toast.restore.error`). The admin sees a fully
  rendered, clickable "Supprimer"/"Restaurer" button that can never succeed for the surface they
  are looking at.
- **Duplicate** (`Link href="/proposals/new?duplicate=${proposal.id}"`) is worse: it produces no
  error at all. `app/(authed)/proposals/new/parametres/page.tsx`'s `?duplicate=` handler looks up
  the source proposal and only spreads its `inputs` into the new draft when the source's `userId`
  matches the caller's session id; for a cross-owner id it still creates a brand-new empty draft
  and redirects, just without the prefill (`page.test.tsx` "Test 4: ... source owned by DIFFERENT
  user → createDraft + redirect WITHOUT spreading source.inputs" pins exactly this). An admin who
  clicks "Dupliquer" on another partner's proposal gets no error, no indication the duplicate
  didn't happen, and a stray empty draft proposal now exists under the admin's own account.

None of this was caught by the Phase 37 operator walk: `37-05-SUMMARY.md`'s scenario 9 note
records only that the click-through opened and that no commission figure was visible — Delete,
Restore, and Duplicate were not exercised from the admin session.

**Fix:** Gate the three controls on `isAdmin` (already destructured on line 58), e.g.:
```tsx
{!isAdmin && (
  isDeleted ? (
    <RestoreButtonClient proposalId={proposal.id} lang={lang} />
  ) : (
    <DeleteButtonClient proposalId={proposal.id} lang={lang} />
  )
)}
{!isAdmin && (
  <Link href={`/proposals/new?duplicate=${proposal.id}`} className="btn-navy" ...>
    ...
  </Link>
)}
```
If admin duplicate/delete/restore is intended to work later, that needs its own decision and its
own tests — until then, hiding the controls for the bypass path prevents a silently-broken and a
silently-wrong action from being offered.

### WR-02 — RESOLVED 2026-09-06 (commit follows this review)

**Status: fixed.** The rule now lives once, in `src/lib/auth/proposal-access.ts`
(`resolveProposalAccess`), and both surfaces call it. No hand-written `role === 'admin'` copy
remains in either file.

The helper returns BOTH facts rather than the single boolean this review suggested, because
after WR-01 each call site needs two: `canView` (owner OR admin — the D-37-01 oversight bypass)
and `isOwner` (ownership only — what the write handlers actually honour). A boolean-only helper
would have centralised one half and left the other duplicated.

`!proposal` deliberately stays an inline short-circuit at each call site: CONTEXT.md D-37-01
requires absence to beat role independently of any role reasoning, and keeping it visible is also
what preserves TypeScript's narrowing. The helper is fail-closed on null as well, so it is belt
and braces rather than a lone defence.

Verified load-bearing, not decorative: mutating the single rule (`canView: isOwner || isAdmin`
-> `canView: isOwner`) fails 6 tests across all three surfaces at once — the helper's own
role x ownership matrix, the PDF route's Test 3, and the page's Case 1 plus WR-01 a/b. 10 new
tests cover the full matrix including absence and role-allowlist cases.

---

#### Original finding (retained for the record)

### WR-02: The ownership+bypass guard is duplicated verbatim across two files with no shared helper

**File:** `app/(authed)/proposals/[id]/page.tsx:58-61` and `app/api/proposals/[id]/pdf/route.ts:19-46`
**Issue:** Both files independently derive `isAdmin` from `requireUser()` and independently
express `if (!proposal || (!isAdmin && proposal.userId !== <id>)) { ... }`. This is not a
hypothetical drift risk — it is exactly what happened during this phase: D-37-01 (commit
`4a09292`) updated the page's copy of this check, and the PDF route's copy was left on the old flat
check until the walk in plan 37-05 found the regression and a follow-up commit (`7999759`) had to
bring it back in sync. The next surface that needs the same guard (or the next person editing one
of these two) has the same failure mode available again, with no compiler or lint signal to catch
it, only a manual walk.
**Fix:** Extract a single helper, e.g. in `src/lib/auth/require.ts` or beside `getProposalById`:
```ts
export function canAccessProposal(
  role: Role,
  proposal: Pick<ProposalRow, 'userId'> | null,
  userId: string,
): boolean {
  return proposal !== null && (role === 'admin' || proposal.userId === userId);
}
```
and call it from both the page and the route so a future change to the bypass rule (e.g. adding
another role) is a one-line, one-location edit instead of two greps.

### WR-03 — RESOLVED 2026-09-06 (commit follows this review)

**Status: fixed.** `makeProposal()` is rebuilt against the real `proposals` schema — all 21
columns in schema order, `schemaVersion` a string, the three phantom columns gone, the seven
missing ones added. The `as ProposalRow` cast is removed: the literal now satisfies the type
unaided, and `...overrides` is spread onto a value already typed `ProposalRow` so it can no
longer mask a defect in the base literal.

Verified the type check actually validates now, by re-injecting each of the three mistakes the
old fixture contained. All three are compile errors that previously passed silently:

| Injected | Result |
|---|---|
| `pdfBlobUrl` (phantom column) | `TS2353: Object literal may only specify known properties` |
| `schemaVersion: 1` (wrong type) | `TS2322: Type 'number' is not assignable to type 'string'` |
| drop `outcomeReason` (missing column) | `TS2741: Property 'outcomeReason' is missing` |

Same remediation as Gate 13's fixture in `tests/admin-09-grep-contracts.test.ts`. `tsc` is now
the tripwire for schema/fixture drift in this file, which is what the cast was supposed to be.

---

#### Original finding (retained for the record)

### WR-03: `page.test.tsx`'s `makeProposal()` fixture does not match the real `ProposalRow` schema, and only compiles by defeating TypeScript's excess-property check

**File:** `app/(authed)/proposals/[id]/page.test.tsx:68-95`
**Issue:** The object literal includes three keys that do not exist on the `proposals` table at
all — `pdfBlobUrl`, `updatedAt`, `completedSteps` (verified against `src/db/schema.ts:197-270`,
which has no such columns) — and types `schemaVersion: 1` as a number, when the actual column is
`text('schema_version')` with a semver CHECK constraint (real values look like `'1.0.0'`). It is
also missing several columns that do exist: `pdfSha256`, `pdfSizeBytes`, `duplicatedFromId`,
`clientRelationshipId`, `outcome`, `outcomeDate`, `outcomeReason`. This type-checks only because
the literal ends with `...overrides` (typed `Partial<ProposalRow>`), which widens the object
literal's inferred type enough that TypeScript's excess-property/insufficient-overlap check no
longer fires on the `as ProposalRow` cast — the cast is silently defeated rather than validating
anything.

This is independently confirmed by `37-01-SUMMARY.md`'s own "Deviations from Plan" section: Gate
13 in `tests/admin-09-grep-contracts.test.ts` was originally modeled on this exact fixture and
`tsc --noEmit` rejected it outright (TS2352) the moment the trailing `...overrides` spread was
removed. That gate was rebuilt against the full 21-column schema; this file's copy of the
antecedent pattern was left as-is.
**Fix:** Rebuild `makeProposal()` against the real `ProposalRow` shape (drop `pdfBlobUrl`,
`updatedAt`, `completedSteps`; add the seven real columns listed above; make `schemaVersion` a
string) and drop the `as ProposalRow` cast once the literal type-checks unaided, the same
remediation already applied to Gate 13's fixture in `tests/admin-09-grep-contracts.test.ts`.

---

_Reviewed: 2026-09-06_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

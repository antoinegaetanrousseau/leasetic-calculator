---
phase: 34-fiche-client
plan: 07
subsystem: backend
tags: [server-actions, registry, sirene, audit-log, owner-scoping, idor, zod, d-09, d-02, d-03]

# Dependency graph
requires:
  - phase: 34-fiche-client (plan 01)
    provides: the widened `companies` columns, the four-value `registry_status` vocabulary, and the three Phase 34 `AuditAction` members (`company.display_update`, `company.siren_correct`, `company.registry_sync`)
  - phase: 34-fiche-client (plan 02)
    provides: "`lookupCompanyBySiren` + `RegistryLookupResult` — returns its failures, never throws, and asserts `results[0].siren === requested` (D-05)"
  - phase: 34-fiche-client (plan 04)
    provides: migration 0010 applied to the Neon development branch — the registry columns are safe to write
  - phase: 34-fiche-client (plan 05)
    provides: "`insertRelationshipEventForOwner` — the owner-scoped INSERT … SELECT the `registry_synced` event rides on"
  - phase: 33-pipeline
    provides: "`markProposalWonAction`'s owner-scoped subquery over a table with no `owner_id`, and the post-CR-01 returned-discriminated-result shape (`pipeline/constants.ts`)"
  - phase: 30-company-contact-registry
    provides: "`createClientRelationshipAction`, the BOUNDED_ERROR discipline, and the queue-based mock-db harness in `crm/actions.test.ts`"
provides:
  - "`syncCompanyRegistry` — the ONLY function in the codebase that names a registry column in a write (D-01 tier one, D-02 made structural)"
  - "`RegistryRefreshResult` in the plain `src/lib/crm/constants.ts` sibling (D-24)"
  - "the D-09 creation hook inside `createClientRelationshipAction` — fills the identity, never blocks creation"
  - "`refreshCompanyRegistryAction` — owner-gated on-demand refresh (FICHE-02)"
  - "`updateCompanyDisplayAction` + `updateCompanyDisplaySchema` — the audited shared-tier edit and the SIREN correction (FICHE-03)"
  - "`requiredSirenField` — the SIREN rule extracted to one const shared by both crm schemas (D-23)"
affects: [34-10, 34-11 (the Informations panel and its refresh/edit dialogs call these three actions), 34-12 (acceptance walkthrough)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A write module whose SECURITY property is 'it cannot throw'. `syncCompanyRegistry` wraps its whole body and returns a bounded result, which is what lets D-09's creation hook call it with no try/catch and no branch — the hook's safety is a property of the callee, asserted in the callee's own suite, not a guard at the call site."
    - "Pinning a `.set()` key set EXACTLY (`Object.keys(payload).sort()`) rather than asserting individual fields. That is what turns 'no partner-facing form may write a registry column' from a convention into a test: a future `...parsedInput` spread fails immediately, and so does a caller who submits `legalName` alongside the real fields."
    - "Widening a projection the action already issues instead of adding a narrow re-read. The D-09 hook needs the SIREN and the sync status; carrying them on the three existing `companies` projections costs nothing and keeps client creation at three round trips — pinned by a test that counts terminals."
    - "A thenable mock-db update builder. Drizzle's update builder executes when awaited without `.returning()`; the stub exposes `then` and settles from the same result queue, and queueing an `Error` makes it REJECT — which is how a `companies.siren` unique violation is simulated with no database."
    - "Separating the AUDIT read from the AUTHORIZATION proof in comment as well as in code, because the two are structurally identical (both owner-scoped) and a reader who conflates them will 'simplify' the pair into a check-then-write."

key-files:
  created:
    - src/lib/crm/constants.ts
    - src/lib/crm/registry-sync.ts
    - src/lib/crm/registry-sync.test.ts
  modified:
    - src/lib/crm/actions.ts
    - src/lib/crm/actions.test.ts
    - src/lib/crm/schemas.ts
    - src/lib/crm/schemas.test.ts

key-decisions:
  - "The failure→status mapping puts all four status values to work rather than collapsing every failure to 'pending'. D-09's invariant is 'never blocks creation, never enters the bounded error path', and that holds on every row of the table; which of the four statuses is written is a nuance inside 'did not block'."
  - "The D-09 hook sits after the relationship id AND the audit row, before the unconditional `return { relationshipId }`. It has no try/catch and does not branch on the result — a guard there is precisely how a registry outage would become BOUNDED_ERROR and cost the partner the client they just created."
  - "The hook adds NO statement. The plan called for a narrow SELECT on `companies` by id; the three projections `createClientRelationshipAction` already issues were widened to carry `siren` and the sync status instead. Same data, one fewer round trip, and every pre-existing test's result queue keeps working unchanged."
  - "The sync is skipped when the resolved company already reads 'synced'. A second partner attaching to the same shared SIREN must not re-hit the registry API."
  - "Not-owned and not-found collapse into the SAME thrown bounded key in `refreshCompanyRegistryAction`. Only `no_siren` / `not_found` / `unavailable` are RETURNED, because a thrown sentinel is redacted in production builds (D-24 / 33-REVIEW CR-01)."
  - "The audit 'before' read is a DATA read, not the authorization step. `UPDATE … RETURNING` gives back the NEW row, so D-03's before needs its own SELECT; the UPDATE re-proves ownership independently, so deleting the SELECT outright would still leave the write safe. Stated in those words above the read."
  - "A SIREN correction is written FIRST, then the lookup re-runs against the new value. A failed sync does NOT roll the correction back: there is no transaction to roll back with (neon-http), and pretending otherwise would leave the two halves inconsistent in the worse direction."
  - "`refreshCompanyRegistryAction` writes NO audit row. A registry sync is not a partner edit of shared data — D-03's audit requirement covers shared-tier EDITS. Attribution for a sync is the `registry_synced` timeline event on the caller's own relationship. The `company.registry_sync` AuditAction plan 34-01 minted is therefore currently unused."
  - "The SIREN transform/refine pair was extracted into one `requiredSirenField` const rather than hand-copied a third time. D-23 makes a single normalisation rule load-bearing now that the SIREN is the registry lookup key."

patterns-established:
  - "Acceptance greps that match on identifier names must not be tripped by prose — third occurrence in this phase (34-01, 34-05, now 34-07). Three of this plan's greps matched only comments. Two were fixed by rewording the comment so the grep keeps measuring code; one (`'use server'` inside the mandated header explanation) cannot be, because the plan requires the prose that trips it — the sibling `pipeline/constants.ts` scores identically. Future plans should write these gates against the DIRECTIVE (`^'use server';`) rather than the bare token."

# Metrics
duration: ~25min
completed: 2026-09-03
---

# Phase 34 Plan 07: The registry write path and the shared-tier edit — Summary

The registry tier now has exactly one writer and it cannot throw, which is what makes D-09 ("a registry failure never blocks client creation") a property of the code rather than a promise about it.

## What shipped

| Artifact | What it is |
|---|---|
| `src/lib/crm/constants.ts` | the plain non-`'use server'` sibling holding `RegistryRefreshResult` |
| `src/lib/crm/registry-sync.ts` | `syncCompanyRegistry` — the single writer of the registry tier |
| `createClientRelationshipAction` (extended) | the D-09 hook |
| `refreshCompanyRegistryAction` | FICHE-02, on-demand refresh, owner-gated |
| `updateCompanyDisplayAction` + `updateCompanyDisplaySchema` | FICHE-03, the audited shared-tier edit and the SIREN correction |

## The failure→status mapping, as shipped

`syncCompanyRegistry` maps every `lookupCompanyBySiren` outcome onto exactly one status. This is the table the code implements, verbatim:

| `lookupCompanyBySiren` result | `registry_status` written | Returned to the caller | Why |
|---|---|---|---|
| `{ ok: true }` | `synced` | `{ ok: true }` | plus `registry_synced_at = new Date()` and a `registry_synced` event on the caller's own relationship |
| `{ ok: false, reason: 'not_found' }` | `not_found` | `{ ok: false, reason: 'not_found' }` | a settled answer — this SIREN is not in the registry, or the registry disagrees about which company it is (D-05). Refreshing will not help; correcting the SIREN will. |
| `{ ok: false, reason: 'timeout' }` | `pending` | `{ ok: false, reason: 'unavailable' }` | retryable; "Actualiser" is the retry |
| `{ ok: false, reason: 'upstream_error' }` | `pending` | `{ ok: false, reason: 'unavailable' }` | retryable |
| `{ ok: false, reason: 'malformed' }` | `error` | `{ ok: false, reason: 'unavailable' }` | the upstream answered with something unusable. Not retryable by the partner, and kept distinct so a recurring parser break stays visible instead of looking like an outage. |
| anything thrown (driver error, `companies.siren` unique violation from another partner's data) | *(nothing written)* | `{ ok: false, reason: 'unavailable' }` | caught, logged server-side only, collapsed — 34-PATTERNS trap 10 |

On every non-ok branch the `.set()` carries **only** `{ registryStatus, updatedAt }`. A `not_found` on a re-check must never blank a previously good sync, and a test asserts the key set exactly rather than asserting the status alone.

## The exact `RegistryRefreshResult` union

```ts
export type RegistryRefreshResult =
  | { ok: true }
  | { ok: false; reason: 'no_siren' | 'not_found' | 'unavailable' };
```

It carries no company id, no company name and no other partner's data — asserted by key set, for both the success and the failure shape. It lives in `src/lib/crm/constants.ts` and not in the `'use server'` module because a `'use server'` file may export only async functions.

## Where the D-09 hook sits, and why it needs no guard

Inside `createClientRelationshipAction`, in this order:

1. resolve or create the `companies` row (three possible paths, all now projecting `siren` and the sync status alongside the id)
2. bind the caller's own `client_relationships` row
3. `writeAuditLog({ action: 'client_relationship.create' })`
4. **the hook** — `if (companySiren !== null && companyRegistryStatus !== 'synced') await syncCompanyRegistry({ … })`
5. `return { relationshipId }` — unchanged and unconditional

There is no `try`/`catch` around step 4 and no branch on its result, because `syncCompanyRegistry` never throws and its failure is already persisted as a status. Adding a guard is the single most likely future regression — it is how a registry outage would turn into `BOUNDED_ERROR` and cost the partner the client they just created — so the code says so in those words, citing D-09, and a test named for D-09 fails if the action stops resolving when the sync reports a failure.

The hook is also passed `session.user.id` as both `actorId` and `ownerId` and the caller's own `relationshipId`; a test submits `ownerId`, `actorId` and `relationshipId` in the caller's payload and asserts none of them survives.

## Audit payload shapes

**`company.display_update`** — written on every `updateCompanyDisplayAction` call:

```
targetType: 'company', targetId: <companyId>
payload: {
  companyId,
  before: { name, website, phone, siren },
  after:  { name, website, phone, siren },
}
```

**`company.siren_correct`** — written only when the submitted SIREN differs from the stored one:

```
targetType: 'company', targetId: <companyId>
payload: { companyId, before: <old siren>, after: <new siren> }
```

Both key sets are asserted **exactly**, at both levels (D-26 / ADMIN-09): a future addition of commission or rate data fails the suite rather than shipping.

`refreshCompanyRegistryAction` writes no audit row — see key-decisions.

## The SIREN-correction ordering, and its no-rollback consequence

Order inside `updateCompanyDisplayAction`: read before-values → UPDATE the four shared columns (including the new SIREN) → `company.display_update` audit → `company.siren_correct` audit → `syncCompanyRegistry` against the new SIREN → revalidate.

**The correction is never rolled back by a failed sync.** There is no transaction to roll back with (the neon-http driver's `.transaction()` throws at runtime), so a "rollback" would be a second best-effort UPDATE that can itself fail — leaving the two halves inconsistent in the worse direction: a company whose SIREN silently reverted under a partner who was told the edit succeeded. Instead the correction stands and the status reflects the sync failure, so "Actualiser" is the retry. A test asserts the action still resolves when the post-correction sync reports `unavailable`.

A `companies.siren` unique violation caused by another partner already holding that SIREN throws out of the UPDATE, is caught by the action's own catch, and becomes `'clients.toast.error'`. A test asserts the raw driver message (`companies_siren_unique`) does not appear in the rejection.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — Blocking] The D-09 hook's data read: widened projections instead of a narrow SELECT**

- **Found during:** Task 2
- **Issue:** The plan specified "the reuse branch needs one narrow SELECT on `companies` by `id`". An extra statement shifts every subsequent terminal in `crm/actions.test.ts`'s queue-based mock harness, so all six pre-existing `createClientRelationshipAction` cases would fail with "resultQueue exhausted" — and the plan explicitly requires them to keep passing (T-30-05-02 in particular).
- **Fix:** The three `companies` projections the action already issues (by-SIREN select, insert `.returning()`, post-race reselect) now carry `siren` and the sync status alongside the id. Same two values, no extra round trip, no queue shift.
- **Files modified:** `src/lib/crm/actions.ts`
- **Test added:** "adds no statement of its own" — asserts exactly three terminals on the creation path, so a future narrow re-read fails the suite.
- **Commit:** `2847968`

**2. [Rule 1 — Bug] The plan's SIREN rejection fixture is accepted by the rule the plan mandates reusing**

- **Found during:** Task 3
- **Issue:** Behaviour test 2 required `updateCompanyDisplaySchema` to reject `"1a2b3c4d5e6f7g8h9"` with `error.field.siren.invalid`, while the same `<action>` block requires reusing `createClientSchema.siren`'s exact `normalizeSiren` pair "never a second implementation" (D-23). Measured: `normalizeSiren` STRIPS every non-digit and then checks the shape, so that string yields nine digits and normalises to `123456789` — it is accepted, and has been since Phase 30. 33-REVIEW WR-15 / D-23 describe the crm sibling as "rejecting interleaved non-digits"; it does not.
- **Fix:** Reused the shared rule unchanged (extracting it into `requiredSirenField` so it now exists once, not twice) and pinned the MEASURED behaviour instead: the rejection case uses `'1234'`, and a separate case documents that interleaved non-digits are stripped, asserting both schemas agree. Writing a divergent normaliser to satisfy the fixture is exactly the drift D-23 exists to prevent.
- **Files modified:** `src/lib/crm/schemas.ts`, `src/lib/crm/schemas.test.ts`
- **Commit:** `0d3103b` (test), `9fb72fa` (schema)

**3. [Rule 3 — Blocking] Three acceptance greps measured prose, not code**

- **Found during:** Tasks 1 and 3
- **Issue:** Three gates matched only comments:
  - `grep -c "'use server'" src/lib/crm/constants.ts` returned 3 — from the header explanation the plan itself mandates ("a `'use server'` file may export ONLY async functions…"). `src/lib/pipeline/constants.ts`, the file the plan told me to model it on, scores identically at 3.
  - `grep -cE "\.\.\.result\.data|…"` in `registry-sync.ts` returned 1 — from a comment reading ``Never `...result.data` ``.
  - `grep -cE "legal_name|legalName|…|registry_status"` in `actions.ts` returned 2 — from comments naming the columns the module header promises never to write.
- **Fix:** The two reachable ones were reworded so the grep measures code again (`registry-sync.ts` now says "the lookup result is never spread into this object"; `actions.ts` says "the sync status" instead of the column name). The `'use server'` gate cannot be satisfied without deleting the mandated explanation, so it is replaced by the gate that measures the actual invariant: `grep -c "^'use server';"` → **0** for both files. Recorded as a repo pattern (third occurrence this phase).
- **Files modified:** `src/lib/crm/registry-sync.ts`, `src/lib/crm/actions.ts`
- **Commits:** `c634c72`, `9fb72fa`

**4. [Documentation] `grep -c "syncCompanyRegistry" src/lib/crm/actions.ts` is 3 call sites, not 2**

- **Found during:** Task 3
- **Issue:** Task 2's acceptance criterion says the count is 2 (creation hook + refresh action). Task 3's own `<action>` then mandates a THIRD call, on a SIREN correction. The criterion was written before the third site existed.
- **Fix:** None needed in code. The precise gate is `grep -c "await syncCompanyRegistry({"` → **3**, and all three are enumerated: the D-09 creation hook, `refreshCompanyRegistryAction`, and the post-correction re-run in `updateCompanyDisplayAction`. Nothing else calls it, and `grep -c "lookupCompanyBySiren" src/lib/crm/actions.ts` is 0 — the lookup is reachable only through `registry-sync.ts`.

### Not deviations, but worth recording

- **`revalidatePath` in `refreshCompanyRegistryAction` runs on every sync branch, not only on `ok: true`.** The plan said "before returning on the success path"; a non-ok sync still wrote `registry_status`, which the client page header renders, so a partner who clicks "Actualiser" during an outage must see the status change. It is still inside the non-throwing path.
- **`requireRelationshipHolder()` count** is 6 real call sites as the plan predicted; the bare `grep -c` reports 8 because two module-header sentences mention it. The precise gate is `grep -c "await requireRelationshipHolder()"` → **6**.

### Deferred / not done

- `requirements mark-complete` was deliberately NOT run — FICHE-01/02/03 stay unchecked until the acceptance walkthrough (34-12).
- `STATE.md` and `ROADMAP.md` were not touched: three sibling executors were writing in the same tree during this run, and wave-level bookkeeping is the orchestrator's to do once, not four racing partial edits.
- `npm run build` was not run — a dev server is live and three executors were mid-flight. The orchestrator builds once when the wave completes.

## Authentication gates

None.

## Threat Flags

None. Every file this plan touched is covered by the plan's own `<threat_model>`; no new network endpoint, auth path, file access pattern or schema change was introduced (`git diff src/db/schema.ts` is empty — plan 34-01 owns it).

## Known Stubs

None. `company.registry_sync` (an `AuditAction` minted by plan 34-01) is currently unused — that is a decision, recorded above, not a stub: a registry sync is attributed through the `registry_synced` timeline event, and D-03's audit requirement covers shared-tier edits.

## Self-Check: PASSED

**Files created/modified — all present:**

| Path | Lines |
|---|---|
| `src/lib/crm/constants.ts` | 41 |
| `src/lib/crm/registry-sync.ts` | 136 |
| `src/lib/crm/registry-sync.test.ts` | 342 |
| `src/lib/crm/actions.ts` | 595 |
| `src/lib/crm/actions.test.ts` | 815 |
| `src/lib/crm/schemas.ts` | 122 |
| `src/lib/crm/schemas.test.ts` | 180 |

**Commits — all present in `git log --oneline --all`:**

| Hash | Message |
|---|---|
| `87bd0a7` | test(34-07): pin the registry write contract before writing it |
| `c634c72` | feat(34-07): give the registry tier exactly one writer |
| `c5e5d45` | test(34-07): pin D-09 and the refresh action before writing them |
| `2847968` | feat(34-07): fill the registry identity at creation, and on demand |
| `0d3103b` | test(34-07): pin the shared-tier edit before writing it |
| `9fb72fa` | feat(34-07): audit the shared-tier edit and re-run the lookup on a SIREN fix |

**TDD gate compliance:** every task ran RED → GREEN. Three `test(...)` commits precede their three `feat(...)` commits; no REFACTOR pass was needed.

**Acceptance gates — measured, in this order:**

| Gate | Expected | Measured |
|---|---|---|
| `npx vitest run src/lib/crm/registry-sync.test.ts` | passes, ≥9 assertions | **19 tests passed** |
| `npx vitest run src/lib/crm/actions.test.ts` | passes, incl. every pre-existing case | **49 tests passed** (37 pre-existing/task-2 + 12 task-3) |
| `npx vitest run src/lib/crm` | passes, ≥10 new task-3 assertions | **95 tests passed** across 4 files |
| repo-wide registry-writer grep (D-01/D-02) | no file listed | **0 files** |
| `grep -c "^'use server';"` on `registry-sync.ts`, `constants.ts` | 0, 0 | **0, 0** *(see deviation 3)* |
| `grep -c "throw " src/lib/crm/registry-sync.ts` | 0 | **0** |
| `grep -cE "\.\.\.result\.data\|\.\.\.input\|\.\.\.parsed" registry-sync.ts` | 0 | **0** |
| `grep -c "await syncCompanyRegistry({" actions.ts` | — | **3** *(see deviation 4)* |
| `grep -c "lookupCompanyBySiren" actions.ts` | 0 | **0** |
| `grep -c "return { ok: false, reason: 'no_siren' }" actions.ts` | 1 | **1** |
| `grep -c "await requireRelationshipHolder()" actions.ts` | 6 | **6** |
| `grep -c "company.display_update" actions.ts` | 1 | **1** |
| `grep -c "company.siren_correct" actions.ts` | 1 | **1** |
| `grep -cE "legal_name\|legalName\|naf_code\|nafCode\|headcount\|registryState\|registry_status" actions.ts` | 0 | **0** |
| `grep -cE "\.set\(\{ \.\.\.\|\.set\(input\)" actions.ts` | 0 | **0** |
| `grep -c "replace(/\\D/g" schemas.ts` | 0 | **0** |
| `npm run typecheck` | exit 0 | **exit 0** |
| `npm run lint:check` | exit 0 | **exit 0** |
| `npm run test` | exit 0 | **2122 passed, 38 skipped, 157 files** |
| `git diff package.json package-lock.json` | empty | **empty** (T-34-07-SC) |
| `git diff src/lib/i18n/dictionaries.ts src/db/schema.ts src/lib/db/queries/audit-log.ts` | empty | **empty** — plan 34-01 owns all three |

`npm run build` is the one verification step NOT run — see "Deferred / not done".

---
phase: 34-fiche-client
plan: 05
subsystem: database
tags: [drizzle, postgres, crm, timeline, idor, owner-scoping, follow-up]

# Dependency graph
requires:
  - phase: 30-company-contact-registry
    provides: client-relationships.ts CRM-02 contract header, listContactsForRelationship's child-table-join shape, createContactAction's INSERT … SELECT
  - phase: 33-pipeline
    provides: pipeline.ts + its mock-db test harness, the stage vocabulary, the 33-REVIEW WR-06 finding closed here
  - phase: 34-fiche-client (plan 01)
    provides: relationshipEvents table, the three new CHECK vocabularies in src/lib/relationship/kinds.ts, the widened companies/client_relationships columns
  - phase: 34-fiche-client (plan 04)
    provides: migration 0010 applied to the Neon development branch — the new columns are safe to read
provides:
  - listRelationshipEvents — owner-scoped timeline read (ACTV-01)
  - insertRelationshipEventForOwner — INSERT … SELECT event write, ownership proved inside the write (ACTV-02)
  - listRelationshipsNeedingFollowUp — the "à relancer" rule, fixed once, in SQL (ACTV-05)
  - ClientRelationshipDetail widened to all three D-01 tiers in one owner-scoped statement (FICHE-02/03/04)
  - D-22 / 33-REVIEW WR-06 closed — the board's proposals join carries proposals.user_id
  - the Phase 34 barrel block in src/lib/db/queries/index.ts
affects: [34-06, 34-07, 34-08, 34-10, 34-11 (all consume these three functions), 34-12 (acceptance walkthrough reads the à-relancer rule from here)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Rendering a recorded Drizzle predicate to REAL SQL text + bind params with the library's own PgDialect (`new PgDialect().sqlToQuery(node)`), instead of walking the object graph. An owner predicate that is accepted as an argument but never compiled into the statement cannot survive that assertion — which is exactly the CRM-02 claim the tests exist to prove."
    - "Asserting a security predicate is ABSENT from one clause as a first-class test, not only present in another: D-22's regression guard asserts proposals.user_id is in the leftJoin condition AND not in the WHERE."
    - "Explicit ::type casts on every literal in an INSERT … SELECT projection. The projection gives Postgres no type context for a bare $n, so it infers text and rejects timestamptz/jsonb columns; the contacts analog gets away without casts only because all of its columns are already text."
    - "TS narrowing of a CHECK-constrained text column done in the SELECT projection via sql<Union>`${column}` rather than in a .map(), so a query keeps a single-statement, untouched return expression."
    - "A mock-db result QUEUE (rather than a single result) once a function issues two builder chains — INSERT … SELECT runs a projection select and a terminal returning()."

key-files:
  created:
    - src/lib/db/queries/relationship-events.ts
    - src/lib/db/queries/relationship-events.test.ts
  modified:
    - src/lib/db/queries/client-relationships.ts
    - src/lib/db/queries/client-relationships.test.ts
    - src/lib/db/queries/pipeline.ts
    - src/lib/db/queries/pipeline.test.ts
    - src/lib/db/queries/index.ts

key-decisions:
  - "The \"à relancer\" rule is fixed HERE and nowhere else: candidate set = the caller's own relationships whose stage is not perdu/signe/debloque, AND (due: next_action_at IS NOT NULL AND next_action_at <= now()) OR (stale: next_action_at IS NULL AND updated_at < now() - interval '30 days'). A FUTURE next_action_at is neither — it is on schedule and must not appear. 34-11 and 34-12 read this, they do not re-derive it."
  - "Ordering is one statement, not two merged result sets: a computed bucket (0 = due, 1 = stale) ordered `bucket ASC, COALESCE(next_action_at, updated_at) ASC`. Total, stable, and the caller never re-sorts in TypeScript (grep-asserted: no .sort( in the module)."
  - "updated_at is the staleness clock, not MAX(relationship_events.occurred_at). An events join + group-by on a home-page query buys nothing: updated_at equals created_at on a fresh row, so a never-touched relationship is already reported stale. The absence of an events join is deliberate, recorded in the function's doc comment so a reviewer does not read it as an oversight."
  - "listRelationshipsNeedingFollowUp takes ownerId as a required compiled-in parameter and has no branch of any kind. The home page uses requireUser(), so an admin can call it; an admin owns no relationships and gets [] by construction. It must never grow a role parameter or an all-owners flag — grep-asserted at 0 occurrences of includeAllOwners|skipOwnerCheck|isAdmin|role."
  - "insertRelationshipEventForOwner returns null rather than throwing on zero rows. Only the calling ACTION knows whether a missing event is a bounded error (a note the partner typed) or an acceptable loss (a system event trailing a write that already succeeded)."
  - "D-22's predicate goes inside the leftJoin's and(...), never the .where(...). In the WHERE it degrades the LEFT JOIN to an INNER JOIN and every relationship with zero owned proposals falls off the board. Three tests: present in the join, absent from the WHERE, zero-proposal relationship still renders."
  - "users is LEFT-joined in the timeline read, not INNER: actor_id is NULL for system events (D-14) and an inner join would silently drop every one of them."

patterns-established:
  - "Acceptance greps that match on identifier names must not be tripped by prose. Two greps in this plan were tripped by comments quoting the very expression they guard; the comments were reworded so the grep keeps measuring code rather than documentation. (Same finding as 34-01; now twice, so it is a repo pattern, not an incident.)"

# Metrics
duration: ~35min
completed: 2026-09-03
---

# Phase 34 Plan 05: Relationship Read Layer Summary

**Phase 34's entire query layer in one plan — an owner-scoped timeline read, an `INSERT … SELECT` event write with no check-then-write window, the "à relancer" rule fixed once in SQL, `ClientRelationshipDetail` widened to all three D-01 tiers in a single statement, and D-22 closed in the join condition where it belongs — so no wave-4 plan needs to touch `src/lib/db/queries/` again.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3/3 completed
- **Files created/modified:** 7 (2 created, 5 modified)
- **Tests:** 18 new in `relationship-events.test.ts`, 4 new in `client-relationships.test.ts`, 3 new in `pipeline.test.ts`. Full suite 1993 passed / 38 skipped.

## Accomplishments

### The "à relancer" rule, stated once so it cannot drift

**This is the canonical statement. 34-11's home card and 34-12's walkthrough read it from here.**

**Candidate set** — the caller's own relationships whose `stage` is NOT one of `perdu`, `signe`,
`debloque` (a lost or closed relationship does not need chasing), AND that satisfy either:

| Bucket | Predicate |
|---|---|
| **due** (`bucket = 0`) | `next_action_at IS NOT NULL AND next_action_at <= now()` |
| **stale** (`bucket = 1`) | `next_action_at IS NULL AND updated_at < now() - interval '30 days'` |

A relationship with a **FUTURE** `next_action_at` is neither due nor stale — it is on schedule and
must not appear. That is the single most likely misreading of "driven by next-action date", so both
halves are spelled out rather than collapsed into a `COALESCE`, and a test asserts the rendered SQL
contains both `"next_action_at" <= now()` and `"next_action_at" IS NULL`.

**Order** — due rows first, oldest `next_action_at` first; then stale rows, oldest `updated_at`
first. One statement, one computed `bucket`, ordered `bucket ASC, COALESCE(next_action_at, updated_at) ASC`.
Total, stable, and the caller merges nothing and re-sorts nothing.

**Limit** — applied in SQL via `.limit(limit)`. Asserted, plus a source guard that the module
contains no `.slice(`.

**Staleness clock** — `client_relationships.updated_at`, not `MAX(relationship_events.occurred_at)`.
`updated_at` is already written by `advanceRelationshipStageAction` and by every Phase 34
private-tier action. An events join would add a join and a group-by to a home-page query and would
report a freshly created relationship as stale — which is correct, and is already covered, because
`updated_at` equals `created_at` on a fresh row. The absence of the events join is deliberate.

**Admins** — the home page uses `requireUser()`, not `requireRelationshipHolder()`, so this may be
called with an admin's user id. `ownerId` is a required parameter compiled into the WHERE, so an
admin — who owns no relationships — receives `[]`. It does not throw, and it must never grow a
role parameter or an "all owners" flag.

### The widened `ClientRelationshipDetail`

All three D-01 tiers in ONE owner-scoped statement. The interface groups them by tier deliberately —
that grouping IS the read-only/editable boundary the client page renders, so the page layer never
re-derives D-01 from the design doc.

| Tier | Fields | Who may write |
|---|---|---|
| Shared display | `companyName`, `siren`, `website`, `phone` | any partner on the company, audit-logged (D-03) |
| Registry | `legalName`, `addressLine`, `postalCode`, `city`, `legalForm`, `nafCode`, `nafSection`, `headcountBand`, `foundedOn`, `registryState`, `registryStatus`, `registrySyncedAt` | the SIRENE lookup only (D-02, structural) |
| Private relationship | `leadSource`, `description`, `nextActionAt`, `nextActionNote`, `stage` | the owning partner only |
| (identity) | `relationshipId`, `companyId`, `createdAt` | — |

Type notes the page layer will need:

- `foundedOn` is a `date` column — Drizzle hands back `'YYYY-MM-DD'`, **not** a `Date`.
- `legalForm`, `nafCode` and `headcountBand` are raw **codes**. D-06: the API carries no `libelle`,
  so labels ship as small lookup tables in code. There is no `nafLabel`.
- The four CHECK-constrained columns (`registryState`, `registryStatus`, `leadSource`, `stage`) are
  plain `text` in the schema, so the projection carries the TS narrowing the CHECK already
  guarantees in the database — done with `sql<Union>\`${column}\`` in the projection rather than in a
  `.map()`, so the function stays a single statement and its D-18 null-return expression is
  untouched.

Unchanged, and asserted unchanged: the signature, the `.where(...)`, the `.limit(1)`, and the
null-return contract (`null` covers BOTH "no such relationship" and "owned by someone else"; callers
on the page layer MUST translate it into `notFound()`, never a 403).

### D-22 (33-REVIEW WR-06) — the diff, verbatim

```diff
       and(
         eq(schema.proposals.clientRelationshipId, schema.clientRelationships.id),
         ne(schema.proposals.status, 'deleted'),
+        // D-22 (33-REVIEW WR-06) — the CRM-02 defence-in-depth predicate
+        // `listProposalsForRelationship` already carries. It belongs in the
+        // JOIN condition, never the WHERE: in the WHERE it would degrade this
+        // LEFT JOIN to an INNER JOIN and drop every relationship with zero
+        // owned proposals off the board.
+        eq(schema.proposals.userId, args.ownerId),
       ),
     )
     // CRM-02: ownerId is the ONLY predicate — a partner's own book, nothing else.
```

That is the whole change to `pipeline.ts`. No other line moved.

**Why the join and not the WHERE.** `listProposalsForRelationship` carries
`eq(proposals.userId, ownerId)` as CRM-02 defence in depth: even if a relationship id were somehow
cross-linked, the proposal's own owner must still match. The board's `proposalsCount` was missing it.
Adding it to the statement's `.where(...)` would degrade the LEFT JOIN to an INNER JOIN — every
relationship with zero owned proposals produces a NULL `proposals.user_id`, fails the WHERE, and
vanishes from the board entirely. A partner's brand-new prospects, i.e. most of the Prospect lane,
would disappear. Three tests hold the line:

1. the proposals `leftJoin` **condition** contains `user_id`;
2. **REGRESSION GUARD** — the WHERE does **not** contain `user_id` (and still contains `owner_id`);
3. a relationship whose driver row has `proposalsCount = 0` still appears in its stage bucket.

### The two-statement failure mode the neon-http driver forces

Recorded in the `relationship-events.ts` module header, because every caller in 34-06/07/08/10 has
to live with it:

> The production driver is `drizzle-orm/neon-http`, whose `.transaction()` throws at runtime. Every
> caller therefore writes the domain row and then the event as **two separate statements**, and the
> **row write always goes first**. The accepted failure mode is a missing timeline entry (a crash
> between the two loses the record of the fact, not the fact) or a harmless orphan event — never a
> corrupted relationship.

### Ownership proved inside the write

`insertRelationshipEventForOwner` is `INSERT … SELECT`, exactly like `createContactAction`: the
source select reads `client_relationships` scoped by `eq(id, relationshipId)` AND
`eq(ownerId, ownerId)`, so a relationship the caller does not own selects zero rows and inserts
nothing. Zero rows returned is the only failure signal, and the function returns `null` rather than
throwing.

The test that makes this non-negotiable asserts **the first recorded statement is the insert** — a
standalone ownership SELECT followed by a separate INSERT would show up as a preceding `select` call
and fail. That is the TOCTOU window 30-05 closed for contacts, and it was invisible in testing back
then because the mock simply queued two results.

`actorId` is an explicit `string | null` argument with no default: `null` means the system did it
(D-14), never "unknown". A `kind` outside `RELATIONSHIP_EVENT_KINDS` is a **compile** error, not a
runtime check — asserted by a `@ts-expect-error` line that `npm run typecheck` verifies.

## Task Commits

1. **Task 1 (RED): the relationship-events contract** — `bacfeee` (test)
2. **Task 1 (GREEN): timeline read, owner-scoped event insert, follow-up list** — `4168298` (feat)
3. **Task 2 (RED): three-tier detail row + D-22 join placement** — `4dbe43f` (test)
4. **Task 2 (GREEN): widened projection + D-22 predicate** — `b37b689` ⚠️ **swept into a concurrent executor's commit — see Deviation 1**
5. **Task 2 (follow-up): reword the comment tripping the null-contract grep** — `c8a3735` (refactor)
6. **Task 3: barrel-export the Phase 34 read layer** — `5352c0d` (feat)

## Files Created/Modified

- `src/lib/db/queries/relationship-events.ts` *(new, 287 lines)* — module header reproducing the CRM-02 CONTRACT paragraph plus D-15, the neon-http no-transaction note and the ADMIN-09/D-26 payload rule; `listRelationshipEvents`, `insertRelationshipEventForOwner`, `listRelationshipsNeedingFollowUp` and their row types.
- `src/lib/db/queries/relationship-events.test.ts` *(new, 334 lines)* — 18 tests. Mock-db harness extended with a result queue and `insert`/`returning`/`getSQL`; predicates rendered to real SQL via `PgDialect`.
- `src/lib/db/queries/client-relationships.ts` — two type-only imports; `ClientRelationshipDetail` widened to the three tiers; the detail projection widened to match. Signature, WHERE, `.limit(1)` and return expression untouched.
- `src/lib/db/queries/client-relationships.test.ts` — 4 tests appended: IDOR contract still holds, every tier field is projected, a widened driver row passes through, still exactly one select + one limit.
- `src/lib/db/queries/pipeline.ts` — the D-22 predicate and its comment. Nothing else.
- `src/lib/db/queries/pipeline.test.ts` — 3 tests appended, including the explicitly named LEFT-JOIN-degradation regression guard.
- `src/lib/db/queries/index.ts` — pure append of the Phase 34 Plan 05 block (3 functions + 3 types). No existing block reordered or reformatted.

## Deviations from Plan

### 1. [Rule 3 — Blocking] Task 2's implementation commit was swept into a concurrent executor's commit

- **Found during:** Task 2 verification, immediately after the acceptance greps.
- **Issue:** Plan 34-03 was executing concurrently in the same working tree. Its executor staged the
  whole tree and committed `b37b689` *("docs(34): uncheck requirements that plan bookkeeping ticked
  off early")*, which carried my uncommitted `client-relationships.ts` and `pipeline.ts` changes
  along with its own `REQUIREMENTS.md` edit. Task 2's code therefore landed under another plan's
  commit message.
- **Verification:** `git show b37b689 -- src/lib/db/queries/pipeline.ts` and
  `… -- src/lib/db/queries/client-relationships.ts` were read line by line against the intended
  change. **Both landed intact and unaltered — nothing was lost, truncated or modified.**
- **Fix:** None applied to history. Rewriting `HEAD` (amend/rebase/reset) while another agent is
  actively committing to the same branch is precisely the destructive-git case the executor contract
  forbids; it would have raced that agent's next commit. The remaining working-tree change was
  committed as `c8a3735`, whose body cross-references `b37b689` so the audit trail is recoverable
  from either end.
- **Consequence for a reviewer:** Task 2's code is at `b37b689`, not at a `feat(34-05)` commit. The
  commit table above records the mapping.
- **Prevention, if it matters later:** two executors sharing one working tree cannot both use
  whole-tree staging. This plan staged files individually throughout; the other did not.

### 2. Acceptance grep `grep -c "proposals.userId" pipeline.ts` returns 3, not 2

- **Found during:** Task 2 verification.
- **Cause:** the criterion assumed one pre-existing occurrence. There are two: the conversion-rate
  WHERE at `:163` **and** a pre-existing doc comment at `:144` (`… (eq(proposals.userId, ownerId)) — D-12 forbids a global or …`).
  With D-22's line at `:91` the count is 3.
- **Resolution:** the criterion's *intent* — two **code** occurrences, the board join plus the
  conversion-rate WHERE — is satisfied exactly. The pre-existing Phase 33 comment was **not** edited
  to make the number match; gaming a guard by rewriting unrelated documentation is worse than
  recording the off-by-one.
- **Evidence:** `grep -n "proposals.userId" src/lib/db/queries/pipeline.ts` → lines 91 (join), 144
  (doc comment), 163 (conversion-rate WHERE).

### 3. Two acceptance greps were tripped by my own comments, and the comments were reworded

- **`git diff client-relationships.ts | grep -cE "^[-+].*(\.limit\(1\)|notFound|rows\[0\] \?\? null)"`
  must return 0.** A comment I wrote quoted `rows[0] ?? null` while explaining why the narrowing is
  in the projection rather than in a `.map()`. Reworded to say the same thing without the literal
  (`c8a3735`). The guard measures code again.
- **`git diff pipeline.ts | grep -c "^+"` must return < 8.** It returns **7**, of which one is the
  `+++ b/…` diff header — so 6 real added lines (5 comment + 1 predicate). Within budget, but worth
  recording that the criterion's arithmetic includes the header line.
- **`git diff index.ts | grep -c "^-"` must return 0.** It returns **1**, and that one line is the
  `--- a/…` diff header. Nothing was removed: `git diff index.ts | grep "^-"` prints exactly
  `--- a/src/lib/db/queries/index.ts`. The append is clean.

This is the second plan in Phase 34 to hit the comments-tripping-greps class (34-01 Deviation 3), so
it is recorded above as a repo pattern rather than an incident.

### 4. `npm run build` was NOT run

- **Reason:** a `next dev` server is live (pid 17597, port 3000). Running `next build` beside it
  freezes the dev server's `globals.css` recompiles and it then serves stale CSS until nudged or
  restarted — a known trap for this repo, and the plan's own `<verification>` block says to stop the
  dev server first. Plan 34-03 was concurrently working on `src/components/**`, `app/globals.css`
  and `app/layout.tsx` through that dev server; killing it would have broken that executor's
  verification loop.
- **Risk assessment:** this plan touches query modules only — no component, no route, no CSS, no
  dependency. `npm run typecheck`, `npm run lint:check` and `npm run test` (1993 passing) cover
  everything a build would add for this change set, since Next's build-time type checking is the
  same `tsc` program.
- **Action for whoever runs next:** `npm run build` should be run once the dev server is free, before
  the phase's acceptance walkthrough (34-12/34-13).

### 5. `.returning()` takes no projection argument on an INSERT … SELECT builder

- **Found during:** Task 1 GREEN, at `npm run typecheck`.
- **Issue:** `.returning({ id: schema.relationshipEvents.id })` fails with TS2554 — Drizzle's
  insert-select builder types `.returning()` as zero-argument (the same reason `createContactAction`
  calls it bare).
- **Fix:** call `.returning()` and narrow in TypeScript: `const row = inserted[0]; return row ? { id: row.id } : null;`.
  The returned shape is still `{ id } | null`; no row column leaks out.

## Issues Encountered

**Explicit casts are mandatory in an `INSERT … SELECT` projection.** `createContactAction` binds its
literals with no cast and works, but only because every `contacts` column it writes is already
`text`. In a select projection Postgres has no type context for a bare `$n` and infers `text`, which
`timestamptz` and `jsonb` reject. Every literal here therefore carries an explicit cast:
`${kind}::text`, `${actorId}::text`, `COALESCE(${occurredAt}::timestamptz, now())`, `${body}::text`,
and `${payload ? JSON.stringify(payload) : null}::jsonb`. This would have failed at runtime against
the real database while passing every mocked test.

**Do not use the word "role" in this module.** The CRM-02 grep guard is
`grep -cE "includeAllOwners|skipOwnerCheck|isAdmin|role"` → 0. The obvious way to resolve an actor's
label (`companies.ts:225`, which reads `users.role` to derive `isInternal`) would break the guard, so
the timeline resolves its label purely in SQL:
`COALESCE(NULLIF(BTRIM(displayName), ''), NULLIF(BTRIM(name), ''), email)`. `users.name` is
`NOT NULL DEFAULT ''`, so the empty string has to be nulled out or it wins over a real email. The
constraint produced a better query than the codebase's existing pattern.

## User Setup Required

None. No new dependency (`git diff package.json package-lock.json` is empty, T-34-05-SC), no
migration, no environment variable.

## Next Phase Readiness

- **34-06 / 34-07 / 34-08 / 34-10** can import `listRelationshipEvents` and
  `insertRelationshipEventForOwner` from `'@/lib/db/queries'`. Note the contract: the insert returns
  `null` on failure and does **not** throw — the calling action decides whether that is a bounded
  error. And per D-15 the row write goes first, the event second, as two statements.
- **34-11** can build the home "à relancer" card on `listRelationshipsNeedingFollowUp(ownerId, limit)`.
  The rule is above; do not re-derive it. Remember the home page uses `requireUser()`, so the card
  must render an empty state for admins rather than treating `[]` as an error.
- **34-06 (the client page)** gets all three D-01 tiers from one `getClientRelationshipForOwner`
  call. `null` still means `notFound()`, never 403.
- **`src/lib/db/queries/` is now closed for Phase 34.** No wave-4 plan needs to touch it, which is
  what lets three of them run in parallel.
- **Open for a later plan:** `npm run build` (Deviation 4).

---
*Phase: 34-fiche-client*
*Completed: 2026-09-03*

## Self-Check: PASSED

**Created files verified present on disk:**

```
FOUND: src/lib/db/queries/relationship-events.ts
FOUND: src/lib/db/queries/relationship-events.test.ts
FOUND: src/lib/db/queries/client-relationships.ts
FOUND: src/lib/db/queries/pipeline.ts
FOUND: src/lib/db/queries/index.ts
```

**Commit hashes verified present in git log:**

```
FOUND: bacfeee   test(34-05) — RED, relationship-events contract
FOUND: 4168298   feat(34-05) — GREEN, the three query functions
FOUND: 4dbe43f   test(34-05) — RED, three-tier detail + D-22
FOUND: b37b689   Task 2 GREEN (swept, Deviation 1)
FOUND: c8a3735   refactor(34-05) — null-contract grep
FOUND: 5352c0d   feat(34-05) — barrel export
```

**No unintended deletions:** `git diff --diff-filter=D --name-only <hash>~1 <hash>` is empty for
every commit above.

**Gates:**

```
npm run typecheck   → exit 0
npm run lint:check  → exit 0  (eslint . --max-warnings=0)
npm run test        → exit 0  (153 files passed | 3 skipped; 1993 tests passed | 38 skipped)
npm run build       → NOT RUN — see Deviation 4
git diff package.json package-lock.json → empty (T-34-05-SC)
```

**Task 1 acceptance greps on `src/lib/db/queries/relationship-events.ts`:**

```
grep -c "server-only"                                    → 1   (required 1)
grep -c "ownerId"                                        → 9   (required ≥ 6)
grep -c "CRM-02"                                         → 3   (required ≥ 1)
grep -cE "includeAllOwners|skipOwnerCheck|isAdmin|role"   → 0   (required 0)
grep -c "\.insert("                                      → 1   (required 1)
grep -c "\.select("                                      → 4   (required ≥ 3, insert's source select among them)
npx vitest run …/relationship-events.test.ts             → 18 tests passed (required ≥ 10)
```

**Task 2 acceptance:**

```
npx vitest run src/lib/db/queries    → 242 passed | 38 skipped, every pre-existing case included
grep -c "proposals.userId" pipeline.ts                   → 3   (2 code + 1 pre-existing doc comment — Deviation 2)
git diff pipeline.ts | grep -c "^+"                      → 7   (required < 8; 6 real lines + the +++ header)
grep -c "registryStatus" client-relationships.ts         → 3   (required ≥ 2)
git diff client-relationships.ts | grep -cE "^[-+].*(\.limit\(1\)|notFound|rows\[0\] \?\? null)"
                                                         → 0   (null-return contract untouched)
LEFT-JOIN-degradation regression test exists and passes  → yes
```

**Task 3 acceptance:**

```
grep -c "from './relationship-events'" index.ts          → 2   (value export + type export)
git diff index.ts | grep -c "^-"                         → 1   (the --- header only; nothing removed — Deviation 3)
```

**No stubs.** Every function is wired to a real statement against real schema columns; migration
0010 is applied on the development branch, so all new columns read.

**No new threat surface** beyond the plan's `<threat_model>`. No new endpoint, no new auth path, no
new file access, no schema change.

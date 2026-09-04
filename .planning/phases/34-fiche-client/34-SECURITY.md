# Phase 34 — Fiche client: security audit

**Audited:** 2026-09-04
**Auditor:** security review agent (adversarial verification against shipped code, not plans)
**Code state:** `main` @ `62e26fa`, clean working tree, live at https://extranet.leasetic.fr
**Register size:** 118 threats across 13 plans (114 `mitigate`, 3 `transfer`, 1 `accept`)
**Result:** **107 CLOSED / 5 PARTIAL / 4 OPEN / 2 accepted-and-discharged**

**Verdict: DO NOT LAUNCH WEDNESDAY WITHOUT CLOSING BLOCKER-01 AND BLOCKER-02.**
Neither is a confidentiality break. Both are live functional defects on the CRM
path, one of which was introduced by a security fix.

---

## 0. Method, and what this audit could not prove

Every mitigation below was verified by reading the shipped file at the cited
line, not by reading the plan that promised it. Where the only evidence
available is a unit test, that is stated, because of a property that this phase
discovered the hard way:

> **Every unit test in this repository mocks the database driver.** 2229 tests
> pass, `tsc --noEmit` is clean, `eslint --max-warnings=0` is clean — and
> `insertRelationshipEventForOwner` still threw on **every call in production**
> from the moment Phase 34 shipped until `62e26fa` today. The mocks assert the
> *shape* of a Drizzle call and never execute Drizzle's own runtime validation.

Consequences carried through this whole document:

1. A green suite is evidence that a query was **written** with an owner
   predicate. It is not evidence that the query **runs**, nor that Postgres
   enforces what the predicate claims.
2. `src/lib/db/queries/client-relationships.isolation.integration.test.ts` — the
   only suite in the repo that puts a real Postgres behind the owner-scoping
   claims — **skipped 28 of 28 tests** in today's run (`DATABASE_URL_TEST`
   unset), and **was not extended for Phase 34**: it contains no case for
   `listRelationshipEvents`, `insertRelationshipEventForOwner` or
   `listRelationshipsNeedingFollowUp`.
3. `src/lib/db/queries/relationship-events.insert.integration.test.ts` (added by
   the fix commit) is the correct guard for the defect that caused the outage —
   and it **skips in CI for the same reason**. The regression it exists to
   prevent is currently unguarded on every gate that actually runs.

Gate status at audit time: `npx vitest run` → 167 files / 2229 passed, 40
skipped. `npm run lint:check` → clean. `npx tsc --noEmit` → clean.

---

## 1. Findings

### BLOCKER-01 — `createContactAction` throws on every call; contact creation is broken in production

**Severity:** BLOCKER (availability, CRM-04). **Not** a Phase 34 regression —
introduced by Phase 30's own security fix `1d763b9`
(*"close T-30-05-05 TOCTOU in createContactAction"*). Surfaced here because it
is the **same root cause** as the timeline outage the operator asked me to
generalise from, and because Phase 34's walkthrough step 22 ("Contacts and
Propositions behave exactly as before this phase") is the step that would have
caught it and has not been performed.

`src/lib/crm/actions.ts:467-484` builds an `INSERT … SELECT` into `contacts`
with a five-key projection:

```
clientRelationshipId, name, role, phone, email
```

Drizzle 0.45.2 validates that projection against the **entire** table
definition via `haveSameKeys` (`node_modules/drizzle-orm/utils.js:70-82`),
which requires an identical key **count and order**. `contacts` has eleven
columns:

```
id, clientRelationshipId, name, role, phone, email,
hubspotContactId, syncedAt, createdAt, updatedAt, source
```

Verified mechanically against the live schema module and Drizzle's own
comparator:

```
contacts INSERT..SELECT passes drizzle check? false
events   INSERT..SELECT passes drizzle check? true   ← after 62e26fa
```

So `.select()` throws `Insert select error: selected fields are not the same or
are in a different order compared to the table definition` **before any SQL is
sent**, the outer catch collapses it to `BOUNDED_ERROR`, and the partner gets
`clients.toast.error`. Adding a contact has never worked since `1d763b9`.

It is fail-closed — no row is written, no ownership check is skipped, nothing
leaks — so this is availability, not exposure. But it is a core CRM-04 feature,
dead on a production system, four days before launch.

`grep` confirms these are the only two `INSERT … SELECT` builders in the
codebase (`src/lib/crm/actions.ts:468`,
`src/lib/db/queries/relationship-events.ts:159`), so the blast radius of this
class of defect is now fully enumerated: one fixed, one still broken.

**Action:** fix the projection to name all eleven `contacts` columns in
declaration order, exactly as `62e26fa` did for `relationship_events`. Then
extend `relationship-events.insert.integration.test.ts` to cover it, and wire
`DATABASE_URL_TEST` into CI (see WARNING-01) so neither can regress silently
again. **Implementation is out of scope for this audit; not patched here.**

---

### BLOCKER-02 — the phase's central privacy claim has never been verified against a real database

**Severity:** BLOCKER (evidentiary, D-01 tier three / FICHE-04 / CRM-02).
**Threats left OPEN:** T-34-13-05, T-34-13-06, T-34-13-07, T-34-13-08.

D-01's third tier — lead source, description, next action, notes and the whole
timeline visible **only** to the owning partner, including on a company two
partners share — is the phase's headline claim. Its declared verification path
is 34-13 step 10/step 12: a two-session hand check on real seeded data, marked
in the plan as *"a named non-approvable failure: criterion 3 cannot be closed by
any automated test in this repo"*.

`34-13-SUMMARY.md` records: `status: partial — task 1 complete, task 2
(acceptance walkthrough) pending Antoine`, and *"Task 2 — the twenty-four-step
acceptance walkthrough — is a blocking human checkpoint and has **not** been
performed."*

Today's live walkthrough covered enough of section C to find the timeline
outage, but no artifact records step 12 (F-F′ as Quentin — the private-tier
isolation check), step 18 (no cross-partner aggregate), step 14 (the finalize
hook did not break PDF generation), or steps 23/24 (the 404 contract, including
the `?tab=` variant and the admin case).

The **code** for isolation reads correctly and I have verified each statement
individually — see §2. The gap is that no evidence exists that Postgres agrees,
on a live database, with two real sessions. That combination — a claim proven
only by mocked tests, on a system already carrying real beta-tester data — is
precisely the shape that produced the timeline outage.

**Action:** walk steps 10, 12, 14, 18, 23 and 24 against the migrated production
database with two real accounts before Wednesday, and record each result beside
its fixture label. Nothing here needs a code change; it needs evidence.

---

### WARNING-01 — the audit row for a shared-tier registry sync can be lost silently

**Severity:** HIGH. **Threat:** T-34-07-07 → **PARTIAL**.

D-03 says a shared-tier edit is audit-logged *because another partner sees the
result*. `syncCompanyRegistry` honours that (`registry-sync.ts:156-166`) — but
the write is inside a `try/catch` whose only handler is `console.error`:

```ts
try {
  await writeAuditLog({ actorId: args.actorId, action: 'company.registry_sync', … });
} catch (e) {
  console.error('[syncCompanyRegistry] audit write failed:', e); // server-side only
}
```

The comment justifies the swallow for the *timeline event* immediately above it
(narration must not veto a committed change — correct, and T-34-08-04 depends on
it). It then applies the same treatment to the **audit row**, which is not
narration: it is the accountability record for a write to a row every partner on
the company reads. If it fails, ten shared identity columns change with no
durable trace and no signal to anyone.

This is the exact failure mode the operator asked me to generalise. The timeline
bug proved that a swallowed write in this codebase can fail on 100% of calls and
stay invisible for a full phase. The same catch block now guards a control.

The sibling path has the mirror-image defect:
`updateCompanyDisplayAction` (`crm/actions.ts:388-396`) writes its audit row
**after** the `companies` UPDATE has committed and **not** in its own catch — so
a failing audit write throws `BOUNDED_ERROR` at the partner while the shared
edit stands unaudited. Different shape, same outcome: an unaudited shared-tier
write.

Mitigating context: `audit_log.action` is plain `text` with no CHECK constraint
(`src/db/schema.ts:334-347`; the only `audit_log` constraint in `drizzle/` is the
`actor_id` FK), so the three new action values cannot be rejected by the
database. The realistic trigger is a transient driver failure, not a schema
mismatch.

**Action:** at minimum, promote both to a distinguishable server-side alert
rather than a bare `console.error`, or write the audit row **before** the
identity UPDATE so a failure is fail-closed. Not patched here.

---

### WARNING-02 — the regression guards for the outage that just happened do not run in CI

**Severity:** HIGH. **Threats affected:** T-34-05-02, T-34-05-01 (evidence
quality), T-34-13-06.

Both real-database suites skip unconditionally when `DATABASE_URL_TEST` is
unset, which is the CI default:

- `src/lib/db/queries/relationship-events.insert.integration.test.ts` — 100%
  skipped. This is the *only* test in the repo that would catch a recurrence of
  `62e26fa`.
- `src/lib/db/queries/client-relationships.isolation.integration.test.ts` — 28
  of 28 skipped, and never extended to the three Phase 34 queries.

The fix commit's own message states the lesson correctly (*"a mocked driver
cannot test a query BUILDER's own validation"*). The guard it added is
nevertheless inert on every gate that runs.

**Action:** point `DATABASE_URL_TEST` at the Neon `development` branch in CI and
add the three Phase 34 queries to the isolation suite.

---

### WARNING-03 — production migration `0010` was applied outside the phase record

**Severity:** MEDIUM. **Threats:** T-34-04-02 → PARTIAL, T-34-04-04 → PARTIAL.

`34-04-SUMMARY.md` records exactly one apply — run `33787935947`, target
`development` — and states: *"Production (`main`) and `preview` remain
unmigrated, deliberately, until milestone close."* An acceptance criterion
asserts no `main` run occurred.

`gh run list --workflow=db-migrate.yml` shows two successful `main`-ref runs
today that no phase artifact mentions: `33860553406` (09:53Z) and
`33863987955` (10:35Z), plus one failure and two cancellations in the same
window.

The **control** held: `db-migrate.yml` constrains `branch` to a `type: choice`
of `[main, preview, development]`, requires `confirm = "MIGRATE PROD"` compared
through the `CONFIRM_INPUT` env var (lines 72-81), and gates `main` behind the
`production` GitHub Environment (line 114). Nothing was bypassed. But T-34-04-04
is *"no record of when the schema changed"*, and the phase's record now
contradicts the live system. A reader of these artifacts would conclude
production is unmigrated.

**Action:** append the two production run URLs and their read-back verification
to `34-04-SUMMARY.md`. No code change.

---

### LOW-01 — `website` accepts a `javascript:` URL; no sink today

**Severity:** LOW (latent). **Not in any register.** Logged as an unregistered
flag.

`updateCompanyDisplaySchema.website` (`src/lib/crm/schemas.ts:110-115`) validates
with `/^[^\s]+\.[^\s]+$/` and a 300-char cap. That regex accepts
`javascript:alert(1.0)` — no whitespace, contains a dot. There is no scheme
allowlist.

Verified there is **no sink**: `website` is stored, projected by
`getClientRelationshipForOwner`, passed to `ClientHeader` and rendered only as an
`<Input>` default value in `EditCompanyDialog`. It never becomes an `href`. So
this is not exploitable today.

It is a trap for the next editor: the field is called "website", a partner will
ask for it to be clickable, and the moment it becomes `<a href={website}>` it is
stored XSS against every partner on the shared company row.

**Action:** add a scheme allowlist (`https?://` or bare host) to the schema now,
while it costs nothing.

---

### LOW-02 — `createClientSchema.name` is uncapped

**Severity:** LOW. **Not in any register.** Unregistered flag.

`src/lib/crm/schemas.ts:55` — `name: z.string().trim().min(1)`, no `.max()`.
Its Phase 34 sibling `updateCompanyDisplaySchema.name` caps at 200. A partner
can create a company with an unbounded display name that then renders on the
client book, the pipeline board and the "à relancer" card. T-34-06-07 caps every
Phase 34 free-text field (2000/2000/500, verified); this Phase 30 field escaped
the sweep.

---

### INFO-01 — audit `before` values are shared-tier, not strictly caller-submitted

**Severity:** INFORMATIONAL. **Threat:** T-34-07-08 → CLOSED with this note.

`updateCompanyDisplayAction`'s payload is `{ companyId, before, after }` where
`before` is read from the shared `companies` row and may carry values a
*different* partner submitted (display name, website, phone, SIREN). Same for
`syncCompanyRegistry`'s `{ siren, relationshipId }`, whose SIREN may have been
corrected by another partner.

This is consistent with D-01 — these are tier-two fields every partner on the
company already reads — and the `audit_log` viewer is admin-only. It is a
narrower reading than the register's literal *"caller-submitted values only"*.
**No commission, rate, envelope or `params_snapshot` value appears in any
payload written by this phase**, which is the ADMIN-09 / D-26 requirement, and
that is verified exhaustively in §2.

---

## 2. Threat register verification

Legend: **C** closed · **P** partially mitigated · **O** unmitigated/unverified.
Every line was checked against the shipped file, not the plan.

### 34-01 — migration & schema

| ID | Cat | Disp | V | Evidence |
|---|---|---|---|---|
| T-34-01-01 | T | mitigate | C | `drizzle/0010_phase34_fiche_client.sql` is additive only; `inputs`/`params_snapshot`/`computed`/`schema_version` appear twice, both inside the header prose, zero times in DDL |
| T-34-01-02 | T | mitigate | C | `client_relationships_lead_source_check` is its own constraint; `client_relationships_source_check` / `companies_source_check` untouched — confirmed live in 34-04 via `pg_get_constraintdef` |
| T-34-01-03 | R | mitigate | C | no `CREATE TRIGGER` DDL in 0010 (single textual hit is the header comment); `actor_id` nullable with D-14 meaning documented |
| T-34-01-04 | E | mitigate | C | `"actor_id" text` in 0010; live read-back in 34-04 confirms `text` |
| T-34-01-05 | I | mitigate | C | `lead_source`, `description`, `next_action_at`, `next_action_note` on `client_relationships`; events on `relationship_events` (FK cascade). Nothing private added to `companies` |
| T-34-01-06 | I | mitigate | C | `dictionaries.ts` strings are static; `{0}`/`{1}` filled at `ActivityTimeline.tsx:158-160` from stage enums only |
| T-34-01-07 | T | mitigate | C | applied via `db-migrate.yml` only; `check-no-drizzle-push.sh` present. See WARNING-03 for the record gap |
| T-34-01-08 | I | mitigate | C | `audit-log.ts:69-71` — exactly 3 new members, all shared-tier: `company.display_update`, `company.siren_correct`, `company.registry_sync`. `grep -c writeAuditLog src/lib/relationship/actions.ts` → **0** |
| T-34-01-SC | T | mitigate | C | `git diff package.json package-lock.json` empty for the phase |

### 34-02 — registry client

| ID | Cat | Disp | V | Evidence |
|---|---|---|---|---|
| T-34-02-01 | S | mitigate | **C** | D-05 asserted **twice**: `recherche-entreprises.ts:111` (`!first \|\| first.siren !== siren` → `not_found`) and again at the mapper boundary, `registry/schema.ts:125` (`if (result.siren !== requestedSiren) return null`), whose caller maps `null` → `not_found` at `:114`. A mismatched result contributes **nothing** to the return value — no field is read before the comparison. Cannot be bypassed by a future caller that forgets the first gate |
| T-34-02-02 | I | mitigate | C | `recherche-entreprises.ts:82-91` — `searchParams` carries `q` (normalized SIREN) and `per_page` only; headers are `{ accept: 'application/json' }`; no `Authorization`, no `Cookie`, no user/partner/company identifier anywhere in the request |
| T-34-02-03 | I | mitigate | C | `classifyFailure` returns one of four bounded reasons; raw error only at `console.error` (`:94, :100, :118`) |
| T-34-02-04 | D | mitigate | C | `AbortSignal.timeout(3_000)`; every path resolves, none throws |
| T-34-02-05 | T | mitigate | C | `registry/schema.ts:43-72` — `truncated(n).pipe(z.string().max(n))` on all ten fields (200/200/120/20/10) |
| T-34-02-06 | T | mitigate | C | values reach the DB only via Drizzle `.set()` parameters (`registry-sync.ts:104-118`); rendered as React text nodes in `IdentityPanel.tsx`; `dangerouslySetInnerHTML` absent from all Phase 34 files (only pre-existing hits: `app/layout.tsx:64`, `components/ui/chart.tsx:93`) |
| T-34-02-07 | T | mitigate | C | `calc/schema.ts:93-100` now uses `normalizeSiren`; `crm/siren.ts` is the single `replace(/\D/g` implementation |
| T-34-02-08 | T | mitigate | C | no change under `drizzle/` or `scripts/` rewriting stored `proposals.inputs` |
| T-34-02-SC | T | mitigate | C | no dependency added |

### 34-03 — vendored ReUI

| ID | Cat | Disp | V | Evidence |
|---|---|---|---|---|
| T-34-03-01 | T | mitigate | C | `tests/vendored-ui-integrity.test.ts` passing; `shadcn init` never run |
| T-34-03-02 | T | mitigate | C | same suite pins `PlusJakartaSans` + four TTFs; `src/lib/pdf/*` suites green |
| T-34-03-03 | T | mitigate | C | `git log -- src/components/reui/kanban.tsx` → last touched by `52d03e1` (Phase 33). Phase 34 did not modify it; WR-01 fix intact |
| T-34-03-04 | T | mitigate | C | `package.json` / `package-lock.json` byte-identical across the phase — no package arrived to audit |
| T-34-03-05 | S | mitigate | C | `components.json:24-31` still declares `@reui` with its Bearer header form |
| T-34-03-06 | I | mitigate | C | key appears only as `${REUI_LICENSE_KEY}` interpolation in `components.json` / `.mcp.json`; no literal value anywhere in the tree |
| T-34-03-07 | I | **accept** | C | **Accepted risk, discharged.** Logged in §3. Deferred to 34-10/34-11, both of which live under `app/(authed)/clients/[id]/` (linted): `grep -c "components/blocks"` in that directory → **0**, and `npm run lint:check` is clean, so SHELL-06 binds |
| T-34-03-SC | T | mitigate | C | no install occurred |

### 34-04 — migration apply

| ID | Cat | Disp | V | Evidence |
|---|---|---|---|---|
| T-34-04-01 | T | mitigate | C | only `db-migrate.yml` runs recorded; `npm run db:migrate` / `drizzle-kit push` not used |
| T-34-04-02 | E | mitigate | **P** | control intact (`type: choice`, `MIGRATE PROD`, `production` environment) but two unrecorded `main` applies occurred — WARNING-03 |
| T-34-04-03 | T | **transfer** | C | **Transfer verified in the receiving artifact.** `.github/workflows/db-migrate.yml:27-36` constrains `branch` to a `type: choice`; `:72-81` reads `confirm` through `CONFIRM_INPUT` before any shell comparison; the Phase 20-02 security note is reproduced at `:21-24`. No `github.event.*` interpolation reaches a shell body |
| T-34-04-04 | R | mitigate | **P** | dev run `33787935947` fully recorded with live read-back; production applies absent from the record — WARNING-03 |
| T-34-04-05 | I | mitigate | C | 34-04-SUMMARY records query results only; no connection string |
| T-34-04-06 | T | mitigate | C | live `pg_get_constraintdef` read-back confirms the Phase 31 provenance CHECK unchanged |
| T-34-04-07 | D | mitigate | C | live `data_type` read-back → `text` |
| T-34-04-SC | T | mitigate | C | no file changed |

### 34-05 — owner-scoped query layer

| ID | Cat | Disp | V | Evidence |
|---|---|---|---|---|
| T-34-05-01 | I | mitigate | C | `relationship-events.ts:90-100` — `innerJoin(clientRelationships)` carrying `eq(clientRelationships.ownerId, ownerId)` in the **same** `and()` as the relationship-id predicate. `ownerId` is a required positional parameter with no default. Non-owner → `[]`, identical to zero events. *Code correct; real-DB evidence missing — BLOCKER-02 / WARNING-02* |
| T-34-05-02 | T | mitigate | C | `relationship-events.ts:158-198` — `INSERT … SELECT` whose source `.where()` carries both `id` and `ownerId`; no preceding standalone SELECT anywhere in the module. Note: this function threw on 100% of calls in production until `62e26fa`; the failure was **fail-closed** (nothing written, no check skipped), so no exposure resulted |
| T-34-05-03 | E | mitigate | C | `grep -cE "includeAllOwners\|skipOwnerCheck\|isAdmin\|role"` → **0** |
| T-34-05-04 | I | mitigate | C | `listRelationshipsNeedingFollowUp(ownerId, limit)` — `eq(ownerId)` is the first predicate (`:288-292`); no role branch; does not throw for an admin |
| T-34-05-05 | R | mitigate | C | `actorId: string \| null` is a required field of `InsertRelationshipEventArgs`; no default anywhere |
| T-34-05-06 | I | mitigate | C | `pipeline.ts:81-93` — `eq(proposals.userId, args.ownerId)` is inside the `leftJoin`'s `and()`, **not** the WHERE, with the reasoning in-comment |
| T-34-05-07 | I | mitigate | C | `getClientRelationshipForOwner` projects named columns only; no jsonb column added to `companies`; every `relationship_events.payload` written by this phase enumerated below and free of commission data |
| T-34-05-08 | T | mitigate | C | `src/lib/db/queries/index.ts:103,108` barrel-exports the module |
| T-34-05-SC | T | mitigate | C | no dependency added |

### 34-06 — private-tier writes

| ID | Cat | Disp | V | Evidence |
|---|---|---|---|---|
| T-34-06-01 | E | mitigate | C | `relationship/actions.ts:97, 163, 232` — `requireRelationshipHolder()` is the first `await` in all three. Every statement re-proves `eq(ownerId, session.user.id)` in its own WHERE (`:114-117`, `:196-199`, `:245-248`) or inside the `INSERT … SELECT` source (`:172-179`). No standalone ownership SELECT in the file |
| T-34-06-02 | I | mitigate | C | zero rows affected is the only failure signal; both cases throw `RELATIONSHIP_BOUNDED_ERROR`; raw error `console.error` only |
| T-34-06-03 | T | mitigate | C | every `.set()` names literal keys (`:107-113`, `:240-244`); never spread from parsed input |
| T-34-06-04 | R | mitigate | C | `actorId: session.user.id` at `:176` and `:261`; never `null` |
| T-34-06-05 | I | mitigate | C | the only payload written is `{ nextActionAt }` (`:265`) |
| T-34-06-06 | T | mitigate | C | no sentinel thrown; `tests/server-action-error-contracts.test.ts` passing |
| T-34-06-07 | D | mitigate | C | `relationship/schemas.ts` — `description` `.max(2000)`, `body` `.max(2000)`, `next_action_note` `.max(500)` |
| T-34-06-08 | R | mitigate | C | `grep -c "writeAuditLog" src/lib/relationship/actions.ts` → **0**; module does not import it |
| T-34-06-SC | T | mitigate | C | no dependency added |

### 34-07 — shared tier & registry hook

| ID | Cat | Disp | V | Evidence |
|---|---|---|---|---|
| T-34-07-01 | T | mitigate | **C** | **D-02 verified structurally, repo-wide.** A grep for all ten registry column names across `src/lib/**` and `app/**` (excluding tests) returns matches in exactly four places, and **every one is a read or a type declaration**: `client-relationships.ts:272-343` (projection), `page.tsx:199-210` (prop pass-through), `IdentityPanel.tsx` (render), `dictionaries.ts` (labels). `registry-sync.ts:104-118` is the **only** write position. `crm/actions.ts` names `registryStatus` only, and only in `select()` projections |
| T-34-07-02 | E | mitigate | C | `crm/actions.ts:333-339` builds `reachableCompanyIds` = `select(clientRelationships.companyId) where id = input.relationshipId AND ownerId = session.user.id`; both the audit pre-read (`:355`) and the UPDATE (`:376`) use `inArray(companies.id, reachableCompanyIds)`. `companies` has no owner column, so the join is the re-proof — exactly as required |
| T-34-07-03 | I | mitigate | C | a `companies_siren` unique violation is caught by the outer catch (`:427-432`) and collapsed to `clients.toast.error`; raw driver message `console.error` only |
| T-34-07-04 | D | mitigate | C | `syncCompanyRegistry` has a total outer try/catch and cannot throw; the D-09 hook at `crm/actions.ts:208-216` has **no** guard and **no** branch on the result, so a lookup failure cannot become `BOUNDED_ERROR` |
| T-34-07-05 | S | mitigate | C | `grep -c "lookupCompanyBySiren" src/lib/crm/actions.ts` → **0**; the only call is inside `registry-sync.ts:78`. A `!result.ok` branch writes **status and timestamp only** (`:90-93`) — no identity column appears, so a `not_found` cannot blank a previous good sync |
| T-34-07-06 | I | mitigate | C | the `registry_synced` event goes through `insertRelationshipEventForOwner` with the caller's own `relationshipId` + `ownerId` (`:133-141`); the shared identity is visible to all partners, the event is not |
| T-34-07-07 | R | mitigate | **P** | audit rows exist and carry before/after — but the registry-sync audit write is **swallowed**, and the display-update audit write is post-commit and unguarded. **WARNING-01** |
| T-34-07-08 | I | mitigate | C | payloads are exactly `{ companyId, before, after }` with `before`/`after` limited to `{name, website, phone, siren}`, `{ companyId, before, after }` for the SIREN correction, and `{ siren, relationshipId }` for the sync. **No commission, rate, envelope or `params_snapshot` value in any of them.** See INFO-01 for the shared-vs-caller-submitted nuance |
| T-34-07-09 | T | mitigate | C | `crm/actions.ts:340-346` — the comment above the pre-read states it is a data read, that the UPDATE re-proves ownership independently, and that deleting the read outright would leave the write safe. The code matches: nothing branches on `beforeRows` before the UPDATE |
| T-34-07-10 | T | mitigate | C | `no_siren` returned at `:272`; `not_found` / `unavailable` returned from `registry-sync.ts:95-97, 172`; type lives in the plain `constants.ts` sibling |
| T-34-07-SC | T | mitigate | C | no dependency added |

### 34-08 — event hooks on existing actions

| ID | Cat | Disp | V | Evidence |
|---|---|---|---|---|
| T-34-08-01 | R | mitigate | C | `actorId: session.user.id` on all three `pipeline/actions.ts` event writes (`:149`, `:229`, `:407`); `actorId: userId` in `app/api/proposals/finalize/route.ts:122`. Never `null` |
| T-34-08-02 | E | mitigate | C | the stage UPDATE (`:120-125`) carries both `id` and `ownerId`; the audit pre-read does not gate it |
| T-34-08-03 | E | mitigate | C | `route.ts:118-124` passes `ownerId: userId` into the `INSERT … SELECT`; the `proposal.userId === userId` equality at `:117` is documented as defence in depth, not the gate |
| T-34-08-04 | D | mitigate | C | all four hooks are in their own try/catch after their fact committed; the outer operation always succeeds. **This is the property that hid the outage** — correct as a control, and the reason WARNING-01/02 matter |
| T-34-08-05 | I | mitigate | C | payloads are exactly `{fromStage, toStage}`, `{proposalId, outcome, outcomeDate}`, `{proposalId, lcRef}`. No amount, rate or commission value |
| T-34-08-06 | I | mitigate | C | `SAFE_ERROR_CODES` (`route.ts:58-63`) unchanged; the hook cannot reach the outer catch; the 200 is unconditional |
| T-34-08-07 | T | mitigate | C | `tests/server-action-error-contracts.test.ts:95-96` hard-codes the path and asserts the `siren_required` return; suite passing |
| T-34-08-08 | R | mitigate | C | `fromStage` written at write time into both the audit payload (`:136`) and the event payload (`:150`) — D-21 / WR-16 closed |
| T-34-08-SC | T | mitigate | C | no dependency added |

### 34-09 — home "à relancer" card

| ID | Cat | Disp | V | Evidence |
|---|---|---|---|---|
| T-34-09-01 | I | mitigate | C | `app/(authed)/page.tsx:63` — `listRelationshipsNeedingFollowUp(userId, 5)` with `userId` from `requireUser()`; the query compiles `ownerId` into its WHERE |
| T-34-09-02 | E | mitigate | C | the home page passes no `searchParams` into this query; `userId` is taken literally from the session |
| T-34-09-03 | S | mitigate | C | `grep -cE "requireAdmin\|role ===\|role !=="` in `page.tsx` and `RelanceCard.tsx` → **0** each |
| T-34-09-04 | I | mitigate | C | `RelanceCard` renders only the rows handed to it; no count, ranking or comparison |
| T-34-09-05 | T | mitigate | C | `nowMs` is a server-computed prop; `grep "Date.now()"` in `RelanceCard.tsx` → 0 |
| T-34-09-06 | D | mitigate | C | `.limit(limit)` applied in SQL (`relationship-events.ts:294`); index `client_relationships_owner_id_next_action_at_idx` shipped in 0010 |
| T-34-09-07 | I | mitigate | C | outside every vendored path; `lint:check` clean |
| T-34-09-SC | T | mitigate | C | no dependency added |

### 34-10 — in-place edit surfaces

| ID | Cat | Disp | V | Evidence |
|---|---|---|---|---|
| T-34-10-01 | T | mitigate | C | `EditCompanyDialog.tsx` renders exactly four inputs — `name`, `website`, `phone`, `siren` (`:162, :182, :202, :226`); zero registry column names across the four files |
| T-34-10-02 | T | mitigate | C | `RegistryRefreshButton.tsx:87-90` is a bare `catch { toast.error(...) }`; `tests/server-action-error-contracts.test.ts` scans every `'use client'` file under `app/` + `src/components/` and passes. All four dialogs carry the directive and are therefore covered automatically |
| T-34-10-03 | R | mitigate | C | `clients.company.dialog.hint` rendered at `:146` above the form and wired via `aria-describedby={HINT_ID}` at `:153` — visible, not tooltip-hidden |
| T-34-10-04 | T | mitigate | C | `RegistryRefreshButton.tsx:45,60-61` — `useRef` guard **plus** `useState` pending; `disabled={pending}` at `:99` |
| T-34-10-05 | I | mitigate | C | `RegistryRefreshResult` carries a reason string only; the four toasts are static dictionary keys with no interpolation |
| T-34-10-06 | E | **transfer** | C | **Transfer verified at the receiving code.** These components pass a relationship id and never an owner id; ownership is re-proved inside every receiving statement — `relationship/actions.ts:114-117, 196-199, 245-248` and `crm/actions.ts:333-339` (see T-34-06-01, T-34-07-02). Correctly recorded so no reviewer looks for a client-side control |
| T-34-10-07 | I | mitigate | C | all four files outside vendored paths; `lint:check` clean |
| T-34-10-08 | D | mitigate | C | `pending` is reset on every branch including rejection |
| T-34-10-SC | T | mitigate | C | no dependency added |

### 34-11 — timeline & note composer

| ID | Cat | Disp | V | Evidence |
|---|---|---|---|---|
| T-34-11-01 | T | mitigate | C | `ActivityTimeline.tsx:220` renders `detail` as a React text child inside `<p>`; `stageFromPayload` (`:137-141`) refuses any payload value not in `PIPELINE_STAGES`; `dangerouslySetInnerHTML` absent from the whole `clients/[id]` tree; registry text additionally capped at parse time |
| T-34-11-02 | R | mitigate | C | `:183` — `event.actorDisplayName ?? t('clients.timeline.actor.system', lang)`, a single occurrence, one rendering only |
| T-34-11-03 | I | **transfer** | C | **Transfer verified at the receiving code.** The array comes from `listRelationshipEvents`, whose owner predicate is compiled into the same statement (`relationship-events.ts:97-100`). The component issues no query and applies no client-side owner filter — which would indeed be the wrong control |
| T-34-11-04 | T | mitigate | C | `matchesFilter` (`:163-166`) is a predicate over one `events` array; no second list is built |
| T-34-11-05 | I | mitigate | C | file lives under `app/(authed)/clients/[id]/` (linted); `grep -c "components/blocks"` in that directory → **0** |
| T-34-11-06 | T | mitigate | C | `nowMs` is a prop; `grep "Date.now()"` in the component → 0 |
| T-34-11-07 | T | mitigate | C | `EventRow` renders no edit or delete control; no update path exists in `relationship-events.ts` |
| T-34-11-08 | T | mitigate | C | no `.message` comparison in `NoteComposer.tsx`; covered globally by the contracts suite |
| T-34-11-09 | D | mitigate | C | `addNoteSchema.body` `.max(2000)` server-side; the composer surfaces the inline error rather than truncating |
| T-34-11-SC | T | mitigate | C | no dependency added |

### 34-12 — the page rebuild (the IDOR surface)

| ID | Cat | Disp | V | Evidence |
|---|---|---|---|---|
| T-34-12-01 | E | mitigate | **C** | `page.tsx:87` — `requireRelationshipHolder()` is the first `await` after `params` and **refuses admins with `notFound()`** (`auth/require.ts`). `:90` calls `getClientRelationshipForOwner(id, session.user.id)`, which carries both predicates in one statement (`client-relationships.ts:349-352`) and returns `null` for not-found **and** not-owned. `:94-96` → `notFound()`. **No tab query is even constructed above that line**: `searchParams` is not awaited until `:99`, and the three tab reads are at `:104-108`. A probing caller cannot cause a contacts, proposals or events query to run |
| T-34-12-02 | I | mitigate | **C** | `?tab=` is validated at `:99`, strictly **after** the 404 branch. A valid and an invalid tab on a non-owned id produce the byte-identical `notFound()`, because neither is ever read on that path |
| T-34-12-03 | T | mitigate | C | `ClientTabs.tsx:54-59` — `validateTab` is a `ReadonlySet` allowlist returning `DEFAULT_CLIENT_TAB` for anything unrecognised; never throws. The value only selects a JSX branch (`:193, 224, 231, 286`); it composes no query, path or URL |
| T-34-12-04 | T | mitigate | C | `grep -E "<input\|<select\|<textarea\|<form\|contentEditable"` in `IdentityPanel.tsx` → **zero matches**. The only control in the panel is the refresh button, which submits no field |
| T-34-12-05 | T | mitigate | C | no `dangerouslySetInnerHTML` in the identity panel or the timeline |
| T-34-12-06 | I | mitigate | C | `ProposalRowDto` adapter and its ADMIN-09 narrowing comment carried over verbatim (`page.tsx:117-147`); `listProposalsForRelationship` row shape unchanged |
| T-34-12-07 | T | mitigate | C | the four proposal/contact components still resolve at their original paths; `tests/server-action-error-contracts.test.ts` needed no edit and passes |
| T-34-12-08 | T | mitigate | C | `row.displayStatus === 'active'` guard at `page.tsx:265` |
| T-34-12-09 | D | mitigate | C | three ternaries at `:104-108`; exactly one tab query runs per request |
| T-34-12-SC | T | mitigate | C | no dependency added |

### 34-13 — fixtures & acceptance

| ID | Cat | Disp | V | Evidence |
|---|---|---|---|---|
| T-34-13-01 | T | mitigate | C | `scripts/seed-fiche-fixtures.ts:96-99` — `FORBIDDEN_ENDPOINTS` names the production and preview Neon endpoint prefixes; `:542-551` refuses with **no override flag** |
| T-34-13-02 | T | mitigate | C | hand-added-children guard copied and **extended** to timeline events; `--remove` never run for real |
| T-34-13-03 | T | mitigate | C | `grep -c "seed-pipe-"` in the new seeder → **0**; distinct prefix and distinct SIRENs |
| T-34-13-04 | I | mitigate | C | fake SIRENs in the `8234567xx` range; the real ones are large public companies, each verified live and named in the SUMMARY |
| T-34-13-05 | R | mitigate | **O** | the walkthrough has not been performed; `34-13-SUMMARY.md` records `status: partial … task 2 pending Antoine`. **BLOCKER-02** |
| T-34-13-06 | E | mitigate | **O** | the two-session cross-partner isolation check — the phase's declared non-approvable gate — is unperformed. **BLOCKER-02** |
| T-34-13-07 | I | mitigate | **O** | step 18 (no cross-partner aggregate on the home card or client page) unperformed. Code inspection finds no such surface (T-34-09-04), but the declared verification did not run |
| T-34-13-08 | D | mitigate | **O** | step 14 (PDF intact after the `proposal_finalized` hook) unperformed. Code inspection shows the hook cannot alter the response (T-34-08-06) |
| T-34-13-SC | T | mitigate | C | only `package.json`'s script entry changed; `package-lock.json` untouched |

---

## 3. Accepted risks log

| ID | Risk | Accepted by | Status |
|---|---|---|---|
| T-34-03-07 | ESLint's SHELL-06 hardcoded-JSX-text rule does not bind inside `src/components/blocks/**`, so untranslated vendored strings could ship | 34-03-PLAN `<threat_model>`, deferred to the consuming plans | **Discharged.** Neither block is mounted from a vendored path: every Phase 34 surface lives under `app/(authed)/clients/[id]/`, which IS linted; `grep -c "components/blocks"` there → 0; `lint:check` clean |

---

## 4. Unregistered flags

All thirteen SUMMARY files declare `## Threat Flags: None`. That declaration is
accurate for the surfaces the plans enumerated. Two items nonetheless have no
threat mapping and are logged here:

| Flag | Where | Why unregistered |
|---|---|---|
| `website` accepts a `javascript:` URL; no scheme allowlist | `src/lib/crm/schemas.ts:110-115` | LOW-01. The register treats `website` as free text with a length cap; nobody modelled it as a future `href` sink |
| `createClientSchema.name` is uncapped | `src/lib/crm/schemas.ts:55` | LOW-02. T-34-06-07 swept Phase 34's free-text fields; this Phase 30 field is outside that scope and its Phase 34 sibling *is* capped |

Separately, and more consequentially than either: **the executor's threat-flag
mechanism could not have flagged BLOCKER-01 or the timeline outage.** Both are
runtime behaviours of the query builder, invisible to typecheck, lint, and a
mocked test suite. The mechanism reports new *attack surface*; it does not
report *controls that do not execute*. That gap is the phase's most transferable
lesson.

---

## 5. What the shipped code actually proves, against the six named checks

1. **Owner scoping** — verified statement by statement. Every Phase 34 query and
   action compiles `session.user.id` into its own WHERE, `INSERT … SELECT`
   source, or owner-scoped subquery. No admin bypass exists: `requireAdmin`,
   `role ===`, `includeAllOwners` and `skipOwnerCheck` all grep to zero across
   the new modules, and `requireRelationshipHolder()` 404s admins outright. The
   `companies` shared-tier write proves ownership through
   `inArray(companies.id, <subquery over the caller's own relationship>)` —
   correct, since `companies` has no owner column.
2. **The IDOR surface** — verified. Auth first, owner-scoped lookup second,
   `notFound()` third, `await searchParams` **fourth**. Not-found and not-owned
   are byte-identical, with or without `?tab=`, because no tab query is
   constructed on the refused path.
3. **The registry integration** — verified, and this is the strongest work in the
   phase. Only the SIREN leaves the app. The D-05 returned-siren assertion is
   present **twice**, at the call boundary and again at the mapper, and a
   mismatch contributes nothing to the return value. Responses are zod-parsed,
   per-field length-capped, parameterised into SQL, rendered as text nodes.
4. **Audit coverage** — shared-tier edits do write audit rows, and no payload in
   the phase carries commission data, another partner's private data, or a
   registry value. But the registry-sync audit write can be lost silently
   (WARNING-01), so coverage is a property of the happy path only.
5. **Private-tier isolation** — the code is correct at every statement I read.
   The claim has **no real-database evidence** (BLOCKER-02).
6. **Error discipline** — verified. One bounded key per module, recoverable
   outcomes returned as discriminated results, and
   `tests/server-action-error-contracts.test.ts` covers every new client
   component automatically because it globs `'use client'` files under `app/`
   rather than enumerating them. That is the right shape: adding a component
   cannot silently escape the gate.

---

## 6. Recommended order before Wednesday

1. Fix `createContactAction`'s `INSERT … SELECT` projection (BLOCKER-01).
2. Walk steps 10, 12, 14, 18, 22, 23, 24 on production with two real accounts
   and record the results (BLOCKER-02 — step 22 also confirms the fix in 1).
3. Wire `DATABASE_URL_TEST` into CI and extend the isolation suite to the three
   Phase 34 queries (WARNING-02).
4. Stop swallowing the audit write in `syncCompanyRegistry` (WARNING-01).
5. Append the production migration run URLs to `34-04-SUMMARY.md` (WARNING-03).
6. Add a scheme allowlist to `website` and a `.max()` to `createClientSchema.name`
   (LOW-01, LOW-02).

---

*No implementation file was modified by this audit.*

---
phase: 34-fiche-client
plan: 01
subsystem: database
tags: [drizzle, postgres, i18n, crm, registry, timeline, audit]

# Dependency graph
requires:
  - phase: 30-company-contact-registry
    provides: companies / client_relationships / contacts tables, companies.siren
  - phase: 31-reconciliation
    provides: the `source` provenance columns this plan deliberately does NOT reuse; the companyPairDecisions new-table template
  - phase: 33-pipeline
    provides: stages.ts module shape, the 0009 migration-header convention, AuditAction phase-block convention
provides:
  - companies registry-identity tier (11 nullable columns) + companies_registry_status_check + companies_registry_state_check
  - companies shared-display tier (website, phone) + registry_status NOT NULL DEFAULT 'pending'
  - clientRelationships private tier (lead_source, description, next_action_at, next_action_note) + client_relationships_lead_source_check + client_relationships_owner_id_next_action_at_idx
  - relationshipEvents table + relationship_events_kind_check + the (client_relationship_id, occurred_at DESC) index
  - src/lib/relationship/kinds.ts — the three new CHECK vocabularies as TS unions + their dict-key maps
  - drizzle/0010_phase34_fiche_client.sql (journal idx 10)
  - the complete Phase 34 dictionary key set (clients.detail.* / clients.registry.* / clients.relation.* / clients.company.* / clients.timeline.* / clients.nextAction.* / relationship.toast.error / error.field.url.invalid / dashboard.relance.*) in FR + EN
  - three shared-tier AuditAction members
affects: [34-04 (applies this migration), 34-02/03/05..13 (every plan that imports kinds.ts, the dictionary keys, or reads the new columns)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Three-tier column placement as a security mechanism: registry + shared-display on the shared `companies` row, private on the owner-scoped `client_relationships` row. Tier membership, not a WHERE clause, is what makes cross-partner leakage unwriteable."
    - "A new column rather than widening an existing CHECK, when the existing column's vocabulary encodes a different contract (lead_source vs the Phase 31 source provenance marker)."
    - "NOT NULL DEFAULT as the backfill: registry_status DEFAULT 'pending' backfills every existing row in the DDL, replacing a separate data migration."
    - "Explicit Record<Union, DictKey> literal maps where the enum value and the dict key differ in case convention (site_web -> .siteWeb) — interpolation would mint a key that does not exist."

key-files:
  created:
    - src/lib/relationship/kinds.ts
    - src/lib/relationship/kinds.test.ts
    - drizzle/0010_phase34_fiche_client.sql
    - drizzle/meta/0010_snapshot.json
  modified:
    - src/db/schema.ts
    - src/lib/i18n/dictionaries.ts
    - src/lib/i18n/dictionaries.test.ts
    - src/lib/db/queries/audit-log.ts
    - drizzle/meta/_journal.json
    - src/lib/pdf/no-commission.test.ts

key-decisions:
  - "The FICHE-04 field is `lead_source`, not `source`. `client_relationships.source` already exists as the Phase 31 D-08 provenance marker (NULL | proposal_extraction | hubspot_import), whose purpose is to let a bad bulk import be undone by deleting every row carrying its value. Widening `client_relationships_source_check` to admit the five lead-source values would fuse two unrelated vocabularies into one column and silently break the undo path. Both Phase 31 provenance CHECKs are untouched — asserted by a git-diff grep."
  - "No `naf_label` column (D-06). The registry was measured on 2026-09-03 and returns codes with no `libelle` anywhere in the payload; labels ship as two small tables in code (plan 34-02). Grep-asserted absent in both the schema and the migration."
  - "`relationship_events.actor_id` is `text`, never `uuid` — `users.id` is a Better Auth text id. Nullable with ON DELETE SET NULL; NULL means the system did it (D-14)."
  - "No trigger writes timeline events (D-15), and the migration header says so explicitly so the absence reads as design rather than omission. A trigger cannot see the session, so every event it wrote would carry actor_id = NULL, laundering partner actions into system events — and ACTV-02 requires attribution."
  - "Exactly three AuditAction members added, all shared-tier (company.display_update, company.siren_correct, company.registry_sync). No action for any private-tier write (D-03): a private edit has no other party to be accountable to, and an audit row would surface one partner's private note in the ADMIN-07 audit viewer."
  - "`relationship.toast.error` duplicates `clients.toast.error`'s copy deliberately — namespaces in dictionaries.ts do not share keys (clients.toast.error and admin.reconciliation.toast.error already coexist with identical strings)."

patterns-established:
  - "Acceptance greps that match on identifier names must not be tripped by prose in comments: comments explaining why a constraint is untouched were reworded to avoid naming it literally, so the grep keeps its meaning (a MODIFIED constraint) rather than degrading into a false positive on documentation."

requirements-completed: [FICHE-01, FICHE-02, FICHE-03, FICHE-04, ACTV-01, ACTV-02, ACTV-03, ACTV-04]

# Metrics
duration: ~20min
completed: 2026-09-03
---

# Phase 34 Plan 01: Fiche Client Data Foundation Summary

**The three D-01 tiers as columns (11 registry + 2 shared-display + 1 status on `companies`, 4 private on `client_relationships`), the `relationship_events` timeline table with a text actor FK and a reverse-chronological index, migration 0010 authored but not applied, the three new CHECK vocabularies as a single tested TS module, and all 90 Phase 34 dictionary keys in FR and EN.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 3/3 completed
- **Files created/modified:** 10 (4 created, 6 modified — one of which is a repo guard-test allowlist, see Deviations)

## Accomplishments

### The three D-01 tiers

| Tier | Table | Columns |
|---|---|---|
| Registry identity (nullable, lookup-written only) | `companies` | `legal_name`, `address_line`, `postal_code`, `city`, `legal_form`, `naf_code`, `naf_section`, `headcount_band`, `founded_on` (`date`), `registry_state`, `registry_synced_at` |
| Shared display (partner-editable, audit-logged) | `companies` | `website`, `phone` — beside the existing `name`, which stays the display name (D-13: no rename, no backfill) |
| Sync status | `companies` | `registry_status text NOT NULL DEFAULT 'pending'` |
| Private relationship (owning partner only) | `client_relationships` | `lead_source`, `description`, `next_action_at` (timestamptz), `next_action_note` |

The tier split is the phase's security argument, not a naming convention: `companies` is a shared row (CRM-01), so two partners quoting the same SIREN read the same identity but must never read each other's lead source, notes or follow-up plans. Nothing private was added to `companies`, so there is no query anyone can write that leaks across it (T-34-01-05).

### New CHECKs and indexes

- `companies_registry_status_check` — `IN ('synced','pending','not_found','error')` (NOT NULL, so no `IS NULL OR` branch)
- `companies_registry_state_check` — `IS NULL OR IN ('A','C')` (D-11: `A` active, `C` ceased)
- `client_relationships_lead_source_check` — `IS NULL OR IN ('recommandation','prospection','salon','site_web','autre')`
- `relationship_events_kind_check` — the six D-14 kinds, in vocabulary order
- `client_relationships_owner_id_next_action_at_idx` — plan 34-05's "à relancer" query
- `relationship_events_relationship_id_occurred_at_idx` on `(client_relationship_id, occurred_at DESC)` — 51 characters, well under PostgreSQL's 63-character identifier limit

### `relationship_events`

`id` uuid PK `defaultRandom()`; `client_relationship_id` uuid NOT NULL FK **ON DELETE cascade**; `kind` text NOT NULL; `actor_id` **text** FK to `users.id` **ON DELETE set null**, nullable, NULL = the system; `occurred_at` timestamptz NOT NULL DEFAULT now(); `body` text (null for system events); `payload` jsonb; `created_at` timestamptz NOT NULL DEFAULT now().

`occurred_at` is deliberately separate from `created_at`: a note may be backdated by its composer (which is what `clients.timeline.note.dateLabel` labels in plan 34-11), while `created_at` records when the row was actually written.

### The event-kind vocabulary (D-14 order)

`note`, `stage_changed`, `proposal_finalized`, `outcome_set`, `registry_synced`, `next_action_set`.

`SYSTEM_EVENT_KINDS` is that tuple minus `note` — the five kinds a server action writes on the caller's behalf, which is what the timeline's "système" filter (ACTV-03) selects on.

### `src/lib/relationship/kinds.ts`

The single TS source of truth for the three new CHECK vocabularies, shaped exactly like `src/lib/pipeline/stages.ts` (pure module, no `server-only` — client components import it). Exports `RELATIONSHIP_EVENT_KINDS`, `SYSTEM_EVENT_KINDS`, `isSystemEventKind`, `LEAD_SOURCES`, `REGISTRY_STATUSES`, `REGISTRY_STATES` and the four `Record<Union, DictKey>` maps. 12 tests.

The module header states out loud that TypeScript cannot see a DB CHECK: a widened union compiles cleanly and then fails at INSERT time in production, so changing a tuple without a migration is a bug that no gate in this repo will catch for you.

### Migration

- **Filename:** `drizzle/0010_phase34_fiche_client.sql`
- **Journal idx:** `10`, `"tag": "0010_phase34_fiche_client"` (renamed from drizzle-kit's generated `0010_magenta_famine`)
- **Snapshot:** `drizzle/meta/0010_snapshot.json`
- Generated by `npm run db:generate` with a hand-written header and **no hand-written DDL** — unlike 0009. Additive only: 14 `ALTER TABLE "companies" ADD COLUMN`, 4 on `client_relationships`, one `CREATE TABLE`, 2 FKs, 2 indexes, 3 CHECKs. Nothing touching `inputs`, `params_snapshot`, `computed`, `schema_version` (T-34-01-01), neither provenance CHECK (T-34-01-02), and no `CREATE TRIGGER` (T-34-01-03).
- **Authored, NOT applied.** `.env.local` points at a live Neon branch (D-12); applying it is plan 34-04, through `.github/workflows/db-migrate.yml`. `npm run db:migrate` and `drizzle-kit push` were never run.

### Dictionary

90 new keys per language (891 → 981 in FR and in EN), in one contiguous banner-headed block each, compiling under `_EnParityProof`. **Key-count floor raised 790 → 981** and the assertion retitled for Phase 34. A `Phase 34 fiche-client i18n delta` suite was added covering non-emptiness in both languages plus the `{0}` / `{0}+{1}` interpolation contracts.

This is the phase's only edit to `dictionaries.ts`, by design — keys whose consuming component ships in 34-09/10/11 are present now so waves 4–6 can run in parallel without colliding on a single file.

### Audit actions

`company.display_update`, `company.siren_correct`, `company.registry_sync` — exactly three, all shared-tier. The Phase 33 comment promising "the from/to stage strings" was amended with a note that plan **34-08** closes WR-16 by writing `fromStage`; `src/lib/pipeline/actions.ts` was not touched (`git diff` empty).

## Why `lead_source` and not `source`

`src/db/schema.ts` already declares `source: text('source')` on `clientRelationships` as the Phase 31 D-08 **provenance marker** — "NULL means entered by a human" — with `client_relationships_source_check` restricting it to `NULL | 'proposal_extraction' | 'hubspot_import'`. `companies.source` carries the identical contract. Its documented purpose is to let a bad bulk import be surgically undone by deleting every row carrying its source value.

Widening that CHECK to admit `recommandation | prospection | salon | site_web | autre` would fuse two unrelated vocabularies into one column: the Phase 31 undo path, any fixture seeder's `--remove`, and every future provenance query would start matching partner-entered lead sources. That is a data-integrity regression, not a naming inconvenience.

**A new column `lead_source` with its own `client_relationships_lead_source_check` was created instead.** The Phase 31 columns and both their CHECKs are untouched. Everything downstream in this phase — schema, dialog, dictionary keys, audit payload — uses `lead_source` / `leadSource`, and FICHE-04's requirement text ("source") maps onto it. **No later reader should re-derive `source` from the design spec's §1.**

## The `.siteWeb` / `site_web` mismatch

The DB CHECK value is `site_web` (snake_case, matching the column vocabulary); the dictionary key is `clients.relation.source.siteWeb` (camelCase, matching the dictionary's house style). `LEAD_SOURCE_DICT_KEY` therefore maps the five sources with explicit literals. Deriving the key by interpolating the value produces `clients.relation.source.site_web`, which does not exist — and TypeScript only catches that because the map is written out. A test asserts the specific pairing.

## Task Commits

1. **Task 3: Phase 34 dictionary namespaces + the three audit actions** — `81ca674` (feat)
2. **Task 1: registry / shared-display / private columns + `relationship_events` + `kinds.ts`** — `bd63c1f` (feat)
3. **Task 2: migration 0010 with its journal and snapshot entries** — `6a51fd8` (feat)
4. *(Rule 3 auto-fix)* **Register 0010 in the ADMIN-09 migration allowlist** — `6dac649` (test)

Tasks were executed 3 → 1 → 2; see Deviations.

## Files Created/Modified

- `src/db/schema.ts` — `date` added to the pg-core import list; 14 columns on `companies` + 2 CHECKs; 4 columns on `clientRelationships` + 1 CHECK + 1 index; the `relationshipEvents` table with its CHECK and DESC index; a Phase 34 type-export block (`RelationshipEventRow` / `NewRelationshipEventRow`)
- `src/lib/relationship/kinds.ts` — the three vocabularies + four dict-key maps (new)
- `src/lib/relationship/kinds.test.ts` — 12 tests: tuple order and length, the `SYSTEM_EVENT_KINDS` partition, `isSystemEventKind`, dict-key map completeness, and the `site_web` → `.siteWeb` pairing (new)
- `drizzle/0010_phase34_fiche_client.sql` — the migration + its hand-written header (new)
- `drizzle/meta/0010_snapshot.json` — drizzle-kit generated snapshot (new)
- `drizzle/meta/_journal.json` — appended idx 10 entry, tag corrected off the random slug
- `src/lib/i18n/dictionaries.ts` — the Phase 34 block, 98 keys × 2 languages
- `src/lib/i18n/dictionaries.test.ts` — floor raised to 981, retitled for Phase 34, Phase 34 delta suite added
- `src/lib/db/queries/audit-log.ts` — the Phase 34 AuditAction block (3 members) + the WR-16/34-08 note on the Phase 33 comment
- `src/lib/pdf/no-commission.test.ts` — `0010` added to `KNOWN_MIGRATIONS` (Rule 3 auto-fix, see Deviations)

## Deviations from Plan

### 1. [Rule 3 — Blocking] Task order changed to 3 → 1 → 2

- **Found during:** Task 1, before the first commit
- **Issue:** Task 1's verification gate is `npm run typecheck`, but `src/lib/relationship/kinds.ts` (a Task 1 artifact) types its four maps as `Record<Union, DictKey>`, and `DictKey` is `keyof typeof dictionaries.fr`. Every key those maps name is added by **Task 3**. In plan order, Task 1's own gate could not pass — `tsc` would report 18 unknown-key errors.
- **Fix:** Executed Task 3 first, then Task 1, then Task 2. No task content changed; Task 2 still depends on Task 1's schema edits and still follows it. Each task's own verification gate passed at its own commit. Task 3 has no dependency on Task 1's code — its `read_first` reference to `kinds.ts` is only to confirm the key names, which the plan text enumerates in full.
- **Impact:** None on the artifacts. Commit order in `git log` is Task 3, Task 1, Task 2.

### 2. [Rule 3 — Blocking] Registered migration 0010 in `no-commission.test.ts`'s `KNOWN_MIGRATIONS`

- **Found during:** Task 2 verification (`npm run test`)
- **Issue:** `src/lib/pdf/no-commission.test.ts` carries an ADMIN-09 drift guard that enumerates every `drizzle/*.sql` against a hardcoded allowlist and fails loud on any unreviewed migration. Authoring `0010` tripped it. This is the same guard, and the same fix, as plan 33-01's deviation.
- **Fix:** Reviewed 0010 for commission-bearing columns (none — registry identity, display fields, private relationship fields and the events table) and appended the entry with a review comment in the existing style.
- **Files modified:** `src/lib/pdf/no-commission.test.ts`
- **Verification:** `npm run test` — 1963 passed, 0 failed.
- **Committed in:** `6dac649` (separate commit rather than an amend to `6a51fd8`, because another agent was committing to `main` concurrently — see Issues.)

### 3. Three acceptance greps reworded rather than satisfied literally

- **Found during:** Task 1 acceptance
- **Issue:** Three criteria returned the wrong count for reasons unrelated to the property being guarded:
  - `git diff src/db/schema.ts | grep -cE "^[-+].*(client_relationships_source_check|companies_source_check)"` returned **1**, matching a *comment* I had written explaining that the provenance CHECK stays untouched.
  - `grep -ci "naf_label" src/db/schema.ts` returned **1**, matching a *comment* recording that D-06 removed the column.
  - `grep -c "text('actor_id')" src/db/schema.ts` returned **2**, not 1, because `auditLog.actorId` at line 336 has been `text('actor_id')` since Phase 8. The criterion was unsatisfiable as written against the pre-existing file.
- **Fix:** The first two comments were reworded ("the Phase 31 provenance CHECK above", "no NAF-label column") so the greps keep their intended meaning — a *modified constraint* and a *created column* respectively — rather than degrading into false positives on documentation. Both now return 0. The third criterion was not changed: its intent (`actor_id` is text, never uuid) is fully satisfied — `uuid('actor_id')` returns **0**, and both `text('actor_id')` occurrences are correct.
- **Impact:** None on behaviour. The reasoning survives in both comments; only the literal identifier spelling changed.

### 4. `npm run build` was NOT run

- **Issue:** The plan's verification block requires `npm run build`, and warns that a concurrent build freezes a live `next dev` server's `globals.css` recompiles so it then serves stale CSS until restarted. A `next dev` server was running throughout (PID 2360, started before this plan and not owned by it), and a second agent was executing plan 34-02 in the same working tree.
- **Decision:** The dev server was left running and the build skipped, per the operator's explicit instruction to avoid a build while `next dev` is live. This plan touches **no `.tsx`, no CSS, no route and no component** — its file set is a Drizzle schema, a pure TS module, two test files, string literals in a dictionary, a type union, and a `.sql` file. Everything `next build` would catch on that surface is already covered by the gates that did run: `npm run typecheck` (0 errors), `npm run lint:check` (0 warnings, `--max-warnings=0`), and `npm run test` (1963 passed).
- **Residual risk:** low, and it does not accumulate — plan 34-02 carries its own build gate on the file that feeds the PDF renderer, and every later plan in this phase ships components that will be built.

---

**Total deviations:** 4 (2 Rule 3 blocking auto-fixes, 1 grep-wording correction, 1 documented gate skip)
**Impact on plan:** No artifact differs from what the plan specified. No scope creep.

## Issues Encountered

**Concurrent execution in a shared working tree.** Plan 34-02 was executing in the same checkout throughout this plan (commit `603ed81`, plus in-flight edits to `src/lib/calc/schema.ts` and `src/lib/registry/recherche-entreprises.*`). Consequences handled:

- Every commit staged its files individually. No `git add .` or `git add -A` was used, and no file belonging to 34-02 was ever staged or reverted.
- `npm run typecheck` failed once mid-session on 34-02's half-written `recherche-entreprises.test.ts`; it passed on re-run seconds later once the module landed. That failure was in another plan's file and was correctly not treated as in-scope.
- The Task 2 allowlist fix was committed separately rather than amended into `6a51fd8`, because amending a shared `main` while another agent commits risks discarding their work.

No other issues.

## User Setup Required

None. The migration is authored, not applied — applying `0010` to Neon `main` via the `db-migrate.yml` GitHub Action is plan 34-04's responsibility.

## Next Phase Readiness

- No later plan in this phase needs to edit `src/db/schema.ts`, `src/lib/i18n/dictionaries.ts` or `src/lib/db/queries/audit-log.ts`. That is what lets waves 4, 5 and 6 run several plans in parallel without write conflicts.
- Plan **34-04** (apply migration 0010) is unblocked.
- Plans importing `src/lib/relationship/kinds.ts` or the Phase 34 dictionary keys can proceed; those reading or writing the new columns are gated on 34-04.
- `clients.timeline.note.dateLabel` exists, so plan 34-11's note composer has a legal label for its optional `occurredAt` input without violating SHELL-06 or aliasing across namespaces.

---
*Phase: 34-fiche-client*
*Completed: 2026-09-03*

## Self-Check: PASSED

**Created files verified present on disk:**

```
FOUND: src/lib/relationship/kinds.ts
FOUND: src/lib/relationship/kinds.test.ts
FOUND: drizzle/0010_phase34_fiche_client.sql
FOUND: drizzle/meta/0010_snapshot.json
```

**Commit hashes verified present in git log:**

```
FOUND: 81ca674  feat(34-01): mint every Phase 34 string up front and the three shared-tier audit actions
FOUND: bd63c1f  feat(34-01): give companies a registry identity, relationships a private tier, and add the event timeline
FOUND: 6a51fd8  feat(34-01): author migration 0010 and record why it carries no trigger
FOUND: 6dac649  test(34-01): register migration 0010 in the ADMIN-09 migration allowlist
```

**Gates:**

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run lint:check` (`eslint . --max-warnings=0`) | exit 0 |
| `npm run test` | 151 files passed, 3 skipped — 1963 tests passed, 0 failed |
| `npx vitest run src/lib/relationship/kinds.test.ts` | 12 passed |
| `npx vitest run src/lib/i18n` | 410 passed |
| `npm run db:check` | `Everything's fine` |
| `npm run check:migration-journal-sync` | `OK: 11 migration file(s), 11 journal entrie(s) — in sync` |
| `npm run check:no-drizzle-push` | `OK: no 'drizzle-kit push' invocations found` |
| `npm run build` | **NOT RUN** — see Deviation 4 |

**Threat-model assertions re-verified against the committed artifacts:**

| Assertion | Result |
|---|---|
| `grep -c "relationship_events_kind_check" src/db/schema.ts` | 1 |
| `grep -c "client_relationships_lead_source_check" src/db/schema.ts` | 1 |
| `git diff` lines touching either provenance CHECK (T-34-01-02) | 0 |
| `grep -ci "naf_label" src/db/schema.ts` (D-06) | 0 |
| `grep -c "uuid('actor_id')" src/db/schema.ts` (T-34-01-04) | 0 |
| `git diff` lines touching `inputs:`/`paramsSnapshot:`/`computed:`/`schemaVersion:` (T-34-01-01) | 0 |
| `CREATE TABLE "relationship_events"` in 0010 (non-comment lines) | 1 |
| `"actor_id" text` / `"actor_id" uuid` in 0010 | 1 / 0 |
| `params_snapshot\|schema_version\|"computed"\|"inputs"\|naf_label` in 0010 | 0 |
| `companies_source_check\|client_relationships_source_check` in 0010 | 0 |
| `CREATE TRIGGER` in 0010 (D-15, T-34-01-03) | 0 |
| `drizzle-kit push` anywhere in 0010 (T-34-01-07) | 0 |
| `'clients.timeline.kind.` key count | 12 |
| `'clients.relation.source.` key count | 12 |
| `'clients.registry.status.` key count | 8 |
| `'relationship.toast.error'` key count | 2 |
| `'dashboard.relance.` key count | 12 |
| new `AuditAction` members (T-34-01-08) | 3 |
| `git diff src/lib/pipeline/actions.ts` | empty |
| `git diff package.json package-lock.json` (T-34-01-SC) | empty — no dependency added |
| file deletions across all four commits | none |

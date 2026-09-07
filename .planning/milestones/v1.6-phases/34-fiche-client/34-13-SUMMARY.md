---
phase: 34-fiche-client
plan: 13
subsystem: tooling
tags: [seeder, fixtures, acceptance, neon, development-only, sirene]
status: complete — acceptance walkthrough passed 2026-09-04 (step 8 failed first, fixed in e2d0a15, re-walked green)

# Dependency graph
requires:
  - phase: 33-pipeline
    provides: scripts/seed-pipeline-fixtures.ts — the FORBIDDEN_ENDPOINTS refusal, the --dry-run/--remove contract, the hand-added-children guard, and its two fixed bugs (CR-02 `<> all`, CR-05 owner-scoped delete)
  - phase: 34-fiche-client (plan 01/04)
    provides: the registry + private-tier columns and relationship_events, migration 0010 applied to the Neon development branch
  - phase: 34-fiche-client (plan 05)
    provides: the canonical "à relancer" rule (due / stale / on-schedule, LIMIT 5 in SQL) the follow-up fixtures are aimed at
  - phase: 34-fiche-client (plan 12)
    provides: /clients/[id] as a header plus four tabs — the surface the walkthrough exercises
provides:
  - scripts/seed-fiche-fixtures.ts — the ten Phase 34 acceptance states, seeded idempotently and revertibly
  - npm run db:seed:fiche-fixtures
  - four live-verified real SIRENs, two seeded and two deliberately held by no fixture
affects: [34-13 task 2 — the acceptance walkthrough, which is now performable]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A fixture seeder that CONVERGES rather than skips: a second run restores every fixture column to its declared value, so a state the operator has just walked through (a stage change, a cleared follow-up date) is resettable without a drop-and-reseed."
    - "Timeline-event idempotency via a marker inside `payload->>'fixture'`. relationship_events has no natural key, and the renderer reads payload by named key only (`fromStage`/`toStage`), so an extra key is inert."
    - "Calendar-anchored event timestamps (local midnight ± n days at a fixed hour), not raw offsets — the timeline buckets on the calendar, so `now - 26h` is not reliably 'yesterday'."
    - "ADOPTION as a third state beside insert and skip: a row owned by another seeder is read and reported, never written and never deleted, so two seeders' --remove paths cannot reach each other's rows."

key-files:
  created:
    - scripts/seed-fiche-fixtures.ts
  modified:
    - package.json

key-decisions:
  - "Four real SIRENs verified live, not two. The plan asks for three (two seeded, one free for the SIREN-correction step) but then also spends SIREN #3 on the client-creation step — and `companies.siren` is UNIQUE, so one free SIREN cannot serve both. A fourth was verified and reserved so neither step can fail into the bounded toast."
  - "F-I's updated_at is forced 400 days back. Measured: the development branch currently holds zero pre-existing stale rows, so 45 would have worked today — 400 is kept anyway because the card is LIMIT 5 in SQL and ordered by staleness, and the seeder must stay correct on a branch that has accumulated leftovers."
  - "--remove grew a third guard the sibling does not have: proposals.client_relationship_id is ON DELETE SET NULL, so reverting after step 16's finalized proposal would not fail — it would silently detach a real proposal from its client. It now refuses."
  - "F-E adopts `Pépinières Vaugelas` rather than owning it. It is the pipeline seeder's row; this script reads it, reports its relationship id, and excludes it from every delete — T-34-13-03 (the two seeders' row sets must not overlap)."

# Metrics
duration: ~50min
completed: 2026-09-03
---

# Phase 34 Plan 13: Acceptance Fixtures Summary

**A sibling seeder that puts one row on the Neon development branch for each of the ten states the
Phase 34 acceptance walkthrough checks — with four live-verified real SIRENs, two of them held by no
fixture on purpose — so that the walkthrough can actually be performed rather than repaired
afterwards.**

## Scope of this summary

**Task 1 only.** Task 2 — the twenty-four-step acceptance walkthrough — is a blocking human
checkpoint and has **not** been performed. See "Pending Antoine" at the end.

## Performance

- **Duration:** ~50 min
- **Tasks:** 1/2 (task 2 is the human checkpoint)
- **Files created/modified:** 2 (1 created, 1 modified)
- **Commit:** `f46c929` — `chore(34-13): seed the ten states the Phase 34 acceptance walkthrough checks`

## The verified SIRENs

Each was checked by hand with

```
curl -s 'https://recherche-entreprises.api.gouv.fr/search?q=<SIREN>&per_page=1'
```

and accepted **only** because `results[0].siren` equalled the SIREN queried — D-05's assertion,
performed manually. All four resolved to large, obviously-public French companies, so no customer
data is implied (T-34-13-04).

| # | SIREN | Resolved to | `etat_administratif` | Seeded onto |
|---|---|---|---|---|
| 1 | `552032534` | DANONE | A | **F-A** — never synced, so the operator's Actualiser click fills the panel live |
| 2 | `380129866` | ORANGE | A | **F-B** — seeded as already synced, with hand-written identity values |
| 3 | `542051180` | TOTALENERGIES SE | A | **nothing** — reserved for the SIREN-**correction** step |
| 4 | `632012100` | L'ORÉAL | A | **nothing** — reserved for the client-**creation** step |

A fifth candidate, `441639465` (RENAULT), also verified and was not needed.

**Why four and not three (deviation, Rule 3).** The plan reserves SIREN #3 for the SIREN-correction
step *and* tells the creation step to use SIREN #3. `companies.siren` is UNIQUE, so the moment the
creation step consumes it, the correction step's write raises a unique violation, which 34-07
collapses into the bounded error toast by design — making the step unpassable and leaving FICHE-03's
"corrects a wrong SIREN, which re-runs the lookup" with no walkthrough evidence at all. That is the
precise class of failure this plan exists to prevent, so a fourth SIREN was verified and reserved.
The seeder prints both reserved SIRENs, labelled by the step that must use them, at the end of every
run.

## The ten seeded states

Seeded against `ep-polished-band-alphc576…` = **Neon branch `development`** (routing doc § Lifecycle).

| Label | Company | SIREN | Registry state | Relationship state | Relationship id |
|---|---|---|---|---|---|
| **F-A** | Registre À Synchroniser | `552032534` (real) | `pending`, identity NULL, `registry_synced_at` NULL | `qualifie` | `d0798cf0-96cc-4fe1-b810-4c26e14d1714` |
| **F-B** | Registre Déjà Synchronisé | `380129866` (real) | `synced`, every identity column populated, `headcount_band='32'`, `naf_section='M'`, `registry_state='A'`, synced `2026-08-12T09:30Z` | `proposition_envoyee` | `3a940514-9ed3-4e8c-9111-4052dbe60bf2` |
| **F-C** | Registre Introuvable | `823456791` (fake) | `pending` | `prospect` | `53ee2cee-62d2-4f50-97ff-3373c2e35e41` |
| **F-D** | Société Cessée Exemple | `823456792` (fake) | `synced`, identity populated, **`registry_state='C'`** | `qualifie` | `1103b76a-ee9c-4133-befa-d9af0a0bb219` |
| **F-E** | Pépinières Vaugelas *(adopted)* | NULL | `pending` | `qualifie` | `7532d7bd-a143-4aa3-9ebc-0a3c0905ae76` |
| **F-F** | Relation Renseignée | `823456793` | `pending` | `negociation`, `lead_source='salon'`, description set | `4efd7ebb-370b-41c7-9984-829c4d671644` |
| **F-F′** | Relation Renseignée — **second partner, same company** | same row | same row | `prospect`, `lead_source` NULL, description NULL, no events | `4c47fdc8-c2f7-407d-ad7f-7ed5cef38c8e` |
| **F-G** | Relance En Retard | `823456794` | `pending` | `next_action_at` = **−3 days**, note set, `qualifie` | `3f5b9d4f-5b4b-43dd-bcb8-3b4f227ccb38` |
| **F-H** | Relance À Venir | `823456795` | `pending` | `next_action_at` = **+10 days**, `qualifie` | `b01cb71b-035f-44b1-9242-0bd11832bc0e` |
| **F-I** | Relance Dormante | `823456796` | `pending` | `next_action_at` NULL, `updated_at` forced **400 days** back, `prospect` | `3a5752be-a37d-4bd8-9dce-0230d9d1cb92` |
| **F-J** | Historique Complet | `823456797` | `synced`, identity populated | `negociation` + **four `relationship_events`** | `cc2d7ad6-96c7-4adb-aacf-f1fa8f1645c2` |

**Partner accounts** (resolved as `select id, email from users where role = 'partner' order by email
limit 2`, failing loudly below two; both printed at the end of every run):

- **primary walkthrough account:** `delphine.specht@leasetic.com`
- **second partner** — the cross-partner isolation step is walked signed in as **this** one:
  `quentin.fischer@leasetic.com`

**F-J's four events** — one `note` (body + real actor, today), one `stage_changed`
(`{fromStage:'qualifie', toStage:'negociation'}` + real actor, yesterday), one `registry_synced`
(real actor, 3 days ago), one `next_action_set` with **`actor_id = NULL`** (5 days ago). Three
distinct day buckets, so today / yesterday / earlier all render.

## Verification that the states are actually reachable

Queried back through the **application's own read layer** (`getClientRelationshipForOwner`,
`listRelationshipEvents`, `listRelationshipsNeedingFollowUp`) rather than by hand-written SQL, so
what is asserted is what the page will render.

| Claim | Result |
|---|---|
| F-B renders as synced with identity populated | PASS — `registryStatus:'synced'`, `legalName`, `addressLine`, `postalCode:'69002'`, `city:'LYON'`, `legalForm:'5710'`, `nafCode:'70.22Z'`, `nafSection:'M'`, `headcountBand:'32'`, `foundedOn:'1998-04-15'`, `registryState:'A'`, `registrySyncedAt:2026-08-12T09:30Z` all non-null |
| `headcountBand:'32'` is the label the step names | PASS — `src/lib/registry/labels.ts` maps `'32'` → "250 à 499 salariés" (`'42'` is 1 000 à 1 999; the plan's code is the right one) |
| F-A is a real SIREN that has never been synced | PASS — `siren:'552032534'`, `registryStatus:'pending'`, `legalName:null`, `registrySyncedAt:null` |
| F-D carries the ceased administrative state | PASS — `registryStatus:'synced'`, `registryState:'C'`, identity populated |
| F-E has no SIREN | PASS — `siren:null`, `registryStatus:'pending'` |
| F-F has a second relationship on the SAME company owned by the OTHER partner | PASS — both relationships return the identical `companyId` `3a9c19df-…`; A's carries `leadSource:'salon'` + description, B's carries `leadSource:null`, `description:null`, `nextActionAt:null`, zero events |
| B's relationship is not readable as A | PASS — `getClientRelationshipForOwner(B_rel, A)` returns `null` (the D-16 → `notFound()` path) |
| F-G overdue, F-H future, F-I stale — against the real rule at LIMIT 5 | PASS — `listRelationshipsNeedingFollowUp(A, 5)` returns exactly `[Relance En Retard (due), Relance Dormante (stale)]`, in that order. **F-H is absent.** |
| F-J's timeline has four events, one system-attributed | PASS — `note`/`stage_changed`/`registry_synced` attributed "Delphine Specht"; `next_action_set` returns `actorDisplayName: null`, which the timeline renders as the system |
| F-J's events span ≥ 2 days | PASS — `2026-09-03T17:33Z`, `2026-09-02T13:00Z`, `2026-08-31T08:00Z`, `2026-08-29T07:00Z` → today / yesterday / earlier |
| `stage_changed` carries BOTH stages (D-21) | PASS — `payload: { fromStage:'qualifie', toStage:'negociation', fixture:'seed-fiche-j2' }` |

Measured incidentally: the development branch currently holds **zero** pre-existing rows matching the
à-relancer rule, so nothing was competing for the five slots today. The 400-day forcing is kept
regardless — the seeder must stay correct on a branch that has since accumulated leftovers.

## Acceptance criteria (task 1)

| Criterion | Result |
|---|---|
| `grep -c "FORBIDDEN_ENDPOINTS"` ≥ 2, prefixes match the sibling exactly | **2** — `ep-icy-boat-alx5o1tz` (PRODUCTION), `ep-delicate-night-als4ogpc` (PREVIEW), byte-identical to `seed-pipeline-fixtures.ts`; no override env var |
| `grep -cE "signe\|debloque"` = 0 (D-04) | **0** — the two reserved stages appear nowhere, not even in prose |
| `grep -c "seed-fiche-"` ≥ 1 and `grep -c "seed-pipe-"` = 0 | **1** and **0** — the row sets are disjoint |
| `grep -c "actor_id"` ≥ 2, one seeding NULL | **3**, and `actor: null` on event `j4` seeds `actor_id = NULL` |
| Real SIRENs verified with the curl, `results[0].siren` matched | Yes — four, recorded above with their company names |
| `--dry-run` prints a plan covering all ten labels | Yes — F-A … F-J, each with its `proves:` line, the second relationship, the follow-up offsets, the four events, and both reserved SIRENs |
| Running twice produces no duplicate rows | Yes — run 1: companies +9, relationships +10, events +4. Run 2: **+0 / +0 / +0**, 9 company rows converged |
| `--remove --dry-run` lists exactly the rows inserted | Yes — 4 events, 10 relationships, 9 contacts cascaded, 9 companies, each named with its owner; **`Pépinières Vaugelas` explicitly reported as NOT touched** |
| `npm run lint:check` exits 0 | **0** |
| `npm run typecheck` exits 0 | **0** |
| `git diff package-lock.json` empty; `package.json` shows only the new script entry | Yes — the only change is `"db:seed:fiche-fixtures"` |

`--remove` was **not** run for real. The walkthrough needs the rows.

## Deviations from Plan

### 1. [Rule 3 — Blocking] A fourth real SIREN, because one free SIREN cannot serve two steps

- **Found during:** Task 1, while assigning the verified SIRENs.
- **Issue:** The plan reserves SIREN #3 for the SIREN-correction step (step 11) and *also* directs
  the client-creation step (step 1) to use SIREN #3. `companies.siren` is UNIQUE, so whichever step
  runs second fails into the bounded error toast and becomes unpassable.
- **Fix:** Verified a fourth real SIREN (`632012100`, L'ORÉAL) and reserved it for the creation step,
  leaving `542051180` (TOTALENERGIES SE) for the correction step. The seeder prints both, each
  labelled by the step that must use it, so the operator cannot mix them up.
- **Files modified:** `scripts/seed-fiche-fixtures.ts`
- **Commit:** `f46c929`

### 2. [Rule 2 — Missing critical guard] `--remove` also refuses when a proposal points at a fixture

- **Found during:** Task 1, reading `proposals.clientRelationshipId`'s FK.
- **Issue:** The sibling's guards cover cascading children. `proposals.client_relationship_id` is
  `ON DELETE SET NULL`, so it is not a cascade and not an error — the revert would succeed and
  silently detach a real proposal from its client. Acceptance step 16 asks the operator to finalize a
  proposal on **F-F**, so this is a state the walkthrough actively creates.
- **Fix:** A third refusal guard, beside the contacts and events guards.
- **Files modified:** `scripts/seed-fiche-fixtures.ts`
- **Commit:** `f46c929`

### 3. [Rule 2 — Missing critical guard] The hand-added-children guard also covers timeline events

- **Issue:** The sibling guards hand-added **contacts** only, because that was the only cascading
  child in Phase 33. `relationship_events` also cascades, and steps 15-17 ask the operator to write
  notes and trigger system events **on fixture rows** — real data on a fixture relationship.
- **Fix:** A second refusal guard counting events on fixture relationships whose
  `payload->>'fixture'` is absent or not this script's prefix.
- **Files modified:** `scripts/seed-fiche-fixtures.ts`
- **Commit:** `f46c929`

### Bugs deliberately NOT reproduced from the sibling

- The contact guard uses `c.name <> all(${names})`, never `<> any(...)` — `<> any` is true whenever
  the name differs from at least **one** array element, so it fires on every row and aborts the
  revert unconditionally (33-REVIEW CR-02).
- Every delete is scoped to `r.owner_id = any(<seeded owners>)` **and** the fixture companies, never
  to the company alone — `companies` is a shared registry, so a company-scoped delete can take a real
  partner's relationship and cascade away their contacts (33-REVIEW CR-05). Two fixture companies
  carry real SIRENs, which is precisely where a hand-made relationship is plausible; the three
  refusal guards are the mitigation, and `--remove --dry-run` is inspected before `--remove` is run.

## Known Stubs

None. This plan ships a development-only script; no application surface was touched.

## Self-Check

**Files claimed created/modified**

```
FOUND: scripts/seed-fiche-fixtures.ts   (1019 lines)
FOUND: package.json                     ("db:seed:fiche-fixtures" present)
FOUND: .planning/phases/34-fiche-client/34-13-SUMMARY.md
```

**Commit claimed**

```
FOUND: f46c929  chore(34-13): seed the ten states the Phase 34 acceptance walkthrough checks
```

**Rows claimed seeded** — all eleven relationship ids in the table above were read back through
`getClientRelationshipForOwner` / `listRelationshipEvents` / `listRelationshipsNeedingFollowUp`, and
every state asserted in "Verification that the states are actually reachable" returned PASS. No claim
in this summary rests on the seeder's own console output alone.

**Gates run for this task:** `npm run typecheck` → 0. `npm run lint:check` → 0.
`npm run db:seed:fiche-fixtures -- --dry-run` → plan covering all ten labels. The full test suite and
`npm run build` belong to task 2's gate set and were not run here; no application source was touched,
and no test in the repo references the seeders.

## Self-Check: PASSED

## Pending Antoine — the acceptance walkthrough is NOT done

**Task 2 has not been performed and nothing in this summary should be read as approving it.** It is a
blocking human checkpoint: the four gates (`lint:check`, `typecheck`, `test`, `build`) plus
twenty-four manual steps against a dev server pointed at the migrated development branch, signed in
as `delphine.specht@leasetic.com` — and, for the cross-partner step, as
`quentin.fischer@leasetic.com`.

Before starting, stop any running `next dev` if a `npm run build` has just run in the same tree: a
concurrent build freezes the dev server's `globals.css` recompiles and it then serves stale CSS,
which on this phase would look exactly like a broken tab rail.

Each step and the fixture label it will be checked against:

| Step | Checked against | What it proves |
|---|---|---|
| 1 | **no fixture — create one**, using SIREN **`632012100` (L'ORÉAL)** | creation fills identity from the registry with no further input (ROADMAP 1) |
| 2 | **no fixture — create one**, using `823456799` | a registry failure still creates the client (D-09) |
| 3 | **F-A** | Actualiser fills the panel and persists |
| 4 | **F-A** | a `registry_synced` event lands on the timeline, attributed, today |
| 5 | **F-B** | the seeded identity renders, headcount "250 à 499 salariés", NAF section M |
| 6 | **F-B** | registry fields are read-only everywhere; the Modifier dialog offers exactly four |
| 7 | **F-C** | not-found twice in a row, no crash, no partial fill |
| 8 | **F-D** | the ceased state is legible and not an accent/destructive fill |
| 9 | **F-E** (`Pépinières Vaugelas`) | no Actualiser control at all when there is no SIREN |
| 10 | **F-B** | a shared-tier edit, with the dialog warning that other partners see it |
| 11 | **F-B**, corrected to SIREN **`542051180` (TOTALENERGIES SE)** | correcting a SIREN re-runs the lookup (FICHE-03) |
| 12 | **F-F** then **F-F′** as `quentin.fischer@leasetic.com` | cross-partner private-tier isolation (ROADMAP 3 — non-approvable if it fails) |
| 13 | **F-J** | ONE timeline, three day buckets, the NULL-actor event renders as the system |
| 14 | **F-J** | the type filter is a lens over one list, not two lists |
| 15 | **F-F** | a `stage_changed` event with both stages, no user action (D-21) |
| 16 | **F-F** | `proposal_finalized` after a real finalize — and the PDF itself intact |
| 17 | **F-F** | a note today, then a backdated note in the correct bucket |
| 18 | **F-G**, **F-H**, **F-I** | the card lists F-G then F-I and does NOT list F-H |
| 19 | **F-G** | setting a future date removes it from the card; clearing it restores only per the rule |
| 20 | global — no fixture | no cross-partner number anywhere (CRM-02) |
| 21 | **F-B** | four tabs, tab persists on reload, `?tab=nonsense` renders Informations |
| 22 | **F-B** | Contacts and Propositions behave exactly as before the phase |
| 23 | access check — **F-F′**'s id opened as `delphine.specht@leasetic.com` | a 404, not a 403, and identically with `?tab=activity` |
| 24 | access check — any `/clients/[id]` as an admin in agent view | a 404 |

Steps 20, 23 and 24 are global or access checks and name no fixture row, which is why they carry
none. Everything else names one. **A step whose row is missing is a FAIL, not a skip** — but no row
is missing: all eleven were read back and confirmed above.

Requirements were deliberately **not** marked complete: FICHE-01..05 and ACTV-01..05 close on task
2's approval, not on the fixtures.


---

## Update, 2026-09-04

The walkthrough is no longer 24 unperformed steps. Eighteen are closed by
evidence that did not exist when this plan was written — three mutation-verified
integration suites against real Postgres, plus a live production session that
found and confirmed the fix for two defects (the activity timeline and contact
creation, both the same Drizzle `INSERT … SELECT` class).

Six steps still need a human, and `34-WALKTHROUGH.md` now says which and why.
The distinction it draws: a step is closed only when something would FAIL if
the behaviour broke. The remaining six are a live registry round-trip, two
visual judgements, browser history, and the PDF regression check — none of
which a test in this repo can stand in for.


---

## CLOSED, 2026-09-04

Task 2 is complete. Antoine walked the six remaining steps; five passed as
written and step 8 failed, exposing a registry parser defect that affected every
company with an unclassified NAF — not just ceased ones. Fixed in `e2d0a15`,
mutation-verified, and re-walked green on production the same evening.

All ten of the phase's requirements (FICHE-01..05, ACTV-01..05) are ticked.

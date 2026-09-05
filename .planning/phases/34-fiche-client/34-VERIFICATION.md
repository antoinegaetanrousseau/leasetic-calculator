---
phase: 34-fiche-client
verified: 2026-09-05T20:35:26Z
status: passed
score: 10/10 must-haves verified
verified_at_commit: 5753d226245ed405e93f31a946f930da4e4c48e7
overrides_applied: 0
---

# Phase 34: Fiche client Verification Report

**Phase Goal:** A partner opens a client and sees who the company actually is,
what they have recorded about the relationship, and its full history in one
place — and can correct any of it without leaving the page.

**Verified:** 2026-09-05T20:35:26Z
**Status:** passed
**Re-verification:** No — this is Phase 34's first formal `VERIFICATION.md`.
Phase 34 shipped 13 plans (2026-09-03/04) with no verification artifact; this
document is written retroactively, per D-37-03, by re-deriving every claim
against the current codebase rather than against the 13 plans' own SUMMARY
prose (the string `SUMMARY` therefore never appears inside an Evidence cell
below — it appears only in this paragraph and in the Requirements Coverage /
Gaps Summary prose, explaining what was and was not used as evidence).

**Method note.** This verification also had unusual pre-existing evidence
available: `34-WALKTHROUGH.md` records a completed, human-walked 24-step
acceptance session (2026-09-04, one real failure found and fixed — see
`### Human Verification Required` below) and `34-SECURITY.md` records an
adversarial security audit that found and closed two BLOCKERs the same day.
Both are cited below strictly as **prior operator/audit evidence**, never as
a substitute for this verification's own source reads — every Evidence cell
below was independently re-derived by opening the cited file at the cited
line during this pass.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Creating a client with a SIREN fills identity from the SIRENE registry with no further input (FICHE-01) | ✓ VERIFIED | `createClientRelationshipAction` (`src/lib/crm/actions.ts:82-225`) calls the D-09 hook at lines 208-216 — `syncCompanyRegistry(...)` — unconditionally whenever a new/not-yet-synced company has a SIREN, with **no try/catch and no branch on the result** around the call, so a lookup failure cannot become the action's own bounded error. `syncCompanyRegistry` itself (`src/lib/crm/registry-sync.ts:74-174`) wraps its entire body in one `try { … } catch { return { ok:false, reason:'unavailable' } }` (lines 76-173) and is asserted never to throw by the `describe('syncCompanyRegistry — it never throws (D-09)', …)` block at `src/lib/crm/registry-sync.test.ts:296`. Live-verified in `34-WALKTHROUGH.md` step 1 (create with `632012100`, identity fills with no refresh click). |
| 2 | A registry outage never blocks creation; the record is marked as needing completion instead (FICHE-01) | ✓ VERIFIED | `src/lib/crm/registry-sync.ts:81-98` — a non-`ok` lookup result writes ONLY `registryStatus` (`not_found` / `pending` / `error`, per the failure→status mapping at lines 34-46) and `updatedAt`; no identity column is touched on that path. `34-WALKTHROUGH.md` step 2 is closed by **live production evidence**: a client created with the unresolvable SIREN `823456799` was created and marked not-synced, not blocked. |
| 3 | Registry-sourced identity renders read-only, with its last-synced date and a refresh control (FICHE-02) | ✓ VERIFIED | `IdentityPanel.tsx` (`app/(authed)/clients/[id]/IdentityPanel.tsx:153-229`) renders every identity field as a `<dd>` text node inside a `<dl>` — no `<input>`, `<select>` or `<textarea>` anywhere in the component; the sync line (`syncLine`, lines 157-162) and `RegistryRefreshButton` (line 177, gated on `siren !== null`) are the only interactive surface. The file's own header (lines 1-26) states the read-only rule is enforced twice: a source grep plus a rendered-DOM control count, both asserted in `IdentityPanel.test.tsx`. Live-verified in `34-WALKTHROUGH.md` step 6 ("the read-only proof… anything editable is a FAIL" — passed). |
| 4 | The eight registry-sourced identity fields render with fallback labels (headcount band, NAF section) and a legible ceased state (FICHE-02) | ✓ VERIFIED | `buildRows()` (`app/(authed)/clients/[id]/IdentityPanel.tsx:123-151`) emits legal name, address (composed), legal form, activity (NAF code + section label via `registryLabels.nafSectionLabel`), headcount (`registryLabels.headcountBandLabel`), founded-on — six rows, plus the always-rendered `registryState` badge (lines 205-224) makes eight fields total per FICHE-02's list. `registry/labels.ts` (read directly) ships `HEADCOUNT_BAND_LABELS` (16 codes) and `NAF_SECTION_LABELS` (21 codes) with raw-code fallback for an unrecognised value. Ceased state (`registryState === 'C'`) renders as a neutral `Badge` weighted `font-bold`, never a destructive/accent fill (lines 205-224, D-11 comment at 213-218). `34-WALKTHROUGH.md` step 8 is the one FAIL-then-fix of this whole phase: a genuinely ceased company (unclassified NAF `00.00Z`) synced with `registryState`/`legalName`/`city` all NULL because `Zod .optional()` rejects an explicit `null` the SIRENE API sends; fixed in `e2d0a15` (twelve fields moved to `.nullish()`), re-walked live the same evening with `registry_state = 'C'` rendering correctly. |
| 5 | A partner edits the shared display fields (display name, website, phone) and corrects a wrong SIREN, re-running the lookup; every such edit is audit-logged (FICHE-03) | ✓ VERIFIED | `updateCompanyDisplayAction` (`src/lib/crm/actions.ts:323-447`) is reached only through the caller's own relationship (`reachableCompanyIds` subquery, lines 332-338); its `.set()` at lines 369-376 names exactly four literal columns (`name`, `website`, `phone`, `siren`) plus `updatedAt`, never spread from parsed input. Two `writeAuditLog` calls (lines 404-420, `company.display_update` always, `company.siren_correct` conditionally) fire **after** the UPDATE commits, each independently try/caught (34-SECURITY WARNING-01's resolution, §7.2: "a partner mistrusting a write that succeeded is not" recoverable, so the write is never rolled back into a false failure). A SIREN change re-runs `syncCompanyRegistry` at lines 425-436, after the write, unconditionally. Live-verified in `34-WALKTHROUGH.md` steps 10-11 (display-field edit; SIREN correction to `542051180` produces a second `registry_synced` event). |
| 6 | A partner records private relationship facts (source, description) invisible to another partner holding the same company (FICHE-04) | ✓ VERIFIED | `updateRelationDetailsAction` (`src/lib/relationship/actions.ts:96-138`) writes `leadSource`/`description` onto `client_relationships`, scoped by `eq(clientRelationships.ownerId, session.user.id)` inside the same `UPDATE … WHERE` (lines 114-117) — never a pre-check. `getClientRelationshipForOwner` (`src/lib/db/queries/client-relationships.ts:307-355`) is the sole read path and requires `ownerId` in the same statement (lines 349-352); a non-owner gets `null`, mapped to a 404 by the page (never a distinguishing 403). **Mutation-verified against real Postgres**: `client-relationships.isolation.integration.test.ts` (present at `src/lib/db/queries/`) is cited by `34-WALKTHROUGH.md` as closing step 12 — "B viewing the SAME company through their own relationship sees none of A's private tier, AND B probing A's id gets null. Both halves mutation-verified: each fails only its own mutation." Live-verified in `34-WALKTHROUGH.md` step 12, marked "the phase's central claim." |
| 7 | The client page is a header plus four tabs (Informations, Contacts, Propositions, Activité), each edited in place through its own dialog (FICHE-05) | ✓ VERIFIED | `app/(authed)/clients/[id]/page.tsx:85-300` renders `ClientHeader` (always), `tabs.ClientTabs` (always), then exactly one of four sections gated on `tab === 'informations' \| 'contacts' \| 'proposals' \| 'activity'` (lines 193-297). Each section's own dialog: `IdentityPanel`+`RegistryRefreshButton` (read-only + refresh), `RelationPanel`+`EditRelationDialog`, `ClientHeader`+`EditCompanyDialog`/`NextActionDialog`/`DeleteClientDialog`, `ActivityTimeline`+`NoteComposer`. No separate `/edit` route exists anywhere under `app/(authed)/clients/`. Live-verified in `34-WALKTHROUGH.md` steps 21-22 (all four tabs render; reload on Activité stays on Activité; Contacts/Propositions behave as before). |
| 8 | Opening a relationship the caller does not own returns a plain 404, indistinguishable from a nonexistent id, on every tab (FICHE-05, D-18) | ✓ VERIFIED | `app/(authed)/clients/[id]/page.tsx:85-99` — `requireRelationshipHolder()` first, then `getClientRelationshipForOwner(id, session.user.id)`; `if (!relationship) notFound();` runs **before** `?tab=` is even read (line 99 is after the branch). The header comment (lines 54-84) states the 5-step order is "the security boundary, not a style preference." `34-WALKTHROUGH.md` step 23 (closed by composition): real-Postgres proves a non-owner lookup returns `null`; `page.test.tsx` Tests 1/2/2b prove `null` yields an identical 404 with no tab query, including the `?tab=` variant. Step 24 (admin in agent view) closes the same way — an admin's session id owns no relationship rows. |
| 9 | One chronological timeline mixes manual notes with system events; system events (stage change, proposal sent) are recorded automatically with actor and timestamp (ACTV-01, ACTV-02) | ✓ VERIFIED | `listRelationshipEvents` (`src/lib/db/queries/relationship-events.ts:70-112`) returns ONE list ordered `occurred_at DESC` (line 101) — no kind-based branch in the query. `app/(authed)/clients/[id]/ActivityTimeline.tsx:229-246` filters that single array in place (`useMemo` at 233-236) rather than rendering two lists; the component's own header (lines 6-12) states the ROADMAP requirement verbatim ("no separate tabs for the two"). System-event writers: `advanceRelationshipStageAction` (`src/lib/pipeline/actions.ts:113-156`) reads the prior `fromStage` before the UPDATE and writes both `fromStage` and `toStage` into the `stage_changed` payload (line 150) — closing 33-REVIEW WR-16, which found the payload previously carried only `toStage`; `markProposalWonAction`/`markProposalLostAction` write `outcome_set` (`src/lib/pipeline/actions.ts:225`); `POST /api/proposals/finalize` writes `proposal_finalized` (`app/api/proposals/finalize/route.ts`); `syncCompanyRegistry` writes `registry_synced` (`src/lib/crm/registry-sync.ts:131-145`). Every writer passes an explicit `actorId` (never omitted) to `insertRelationshipEventForOwner`. `34-WALKTHROUGH.md` steps 13-16 closed by evidence: `relationship-events.insert.integration.test.ts` against real Postgres proves the `INSERT … SELECT` projection (the exact path that shipped broken and was fixed in `62e26fa` — see Behavioral Spot-Checks). |
| 10 | A user adds a dated note; a relationship carries a next-action date; a follow-up list is driven by next-action date AND staleness, scoped to the owner (ACTV-03, ACTV-04, ACTV-05) | ✓ VERIFIED | `addRelationshipNoteAction` (`src/lib/relationship/actions.ts:162-212`) inserts a `note` event via the owner-scoped `INSERT … SELECT` (never a pre-check select) and then bumps `updated_at`. `setNextActionAction` (lines 231-287) writes the row first, the `next_action_set` event second, and nulls the note on clear. `listRelationshipsNeedingFollowUp` (`src/lib/db/queries/relationship-events.ts:263-306`) computes DUE (`next_action_at <= now()`) OR STALE (`next_action_at IS NULL AND updated_at < now() - 30 days`) as one SQL statement with `ownerId` as the first, required, non-optional WHERE predicate (line 289) — a future `next_action_at` is neither bucket, so it correctly does not appear. `RelanceCard` (`app/(authed)/_components/RelanceCard.tsx`) renders exactly the rows it is handed, re-sorting nothing. `34-WALKTHROUGH.md` step 18 (F-G and F-I present, F-H absent) is closed by an ACTV-04/05 integration test cited there, and step 19 (moving the next-action date off the list) is a plan-verified action-level test. |

**Score:** 10/10 truths verified

### Required Artifacts

Built from the `files_modified`/`key-files` frontmatter of all 13 Phase 34
plan SUMMARYs (`34-01` through `34-13`) — 84 distinct paths in total (each
counted once even where more than one plan touched it, e.g. `src/lib/crm/
actions.ts`, `src/lib/crm/schemas.ts`).

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/db/schema.ts`, `src/lib/relationship/kinds.ts`, `drizzle/0010_phase34_fiche_client.sql` + journal/snapshot | The three D-01 tiers + `relationship_events` + CHECK constraints (34-01) | ✓ VERIFIED | All present. `kinds.ts` confirmed by direct read: `RELATIONSHIP_EVENT_KINDS` (6 values), plus `LEAD_SOURCES`/`REGISTRY_STATUSES`/`REGISTRY_STATES` unions. |
| `src/lib/registry/{schema,labels,recherche-entreprises}.ts` + fixtures (34-02) | Registry lookup module | ✓ VERIFIED | All present, confirmed by direct read (labels tables, `lookupCompanyBySiren`). |
| `src/components/blocks/solution-users-2/**` (11 files, 34-03) | Vendored ReUI tab-rail scaffolding | **EXPECTED-ABSENT** | Deleted in Phase 36 plan 03 (`82b5b75`, `chore(36-03): delete dead vendored ReUI blocks tree`, HOUSE-04), together with 24 other unimported vendored directories. This is NOT a Phase 34 gap: `app/(authed)/clients/[id]/ActivityTimeline.tsx`'s own header comment (lines 14-21, "BUILT BY REUSE (D-19)") states directly "Nothing is imported FROM that demo: the vendored tree is ESLint-excluded… a timeline living there would ship untranslated copy" — confirming the shipped implementation never depended on the vendored block at runtime; it was read once as a composition reference. `36-PATTERNS.md` names all seven Phase 34-vendored blocks (`solution-crm-1..6`, `solution-users-2`) as "equally unimported" at deletion time. `tests/vendored-ui-integrity.test.ts` (34-03's own structural gate) still passes today (5/5) with the tree absent, confirming no live code depended on it. |
| `tests/vendored-ui-integrity.test.ts` (34-03) | Structural font/vendoring integrity gate | ✓ VERIFIED | Present, 5/5 passing (re-run live this verification). |
| `src/lib/db/queries/{relationship-events,client-relationships,pipeline}.ts` (34-05) | Owner-scoped event/timeline/follow-up read layer | ✓ VERIFIED | All present, confirmed by direct read. |
| `src/lib/relationship/{constants,schemas,actions}.ts` (34-06) | Private-tier write layer | ✓ VERIFIED | All present, confirmed by direct read. |
| `src/lib/crm/{constants,registry-sync}.ts` + `crm/actions.ts`/`crm/schemas.ts` modifications (34-07) | Registry hook + shared-tier edit | ✓ VERIFIED | All present, confirmed by direct read. |
| `src/lib/pipeline/actions.ts`, `app/api/proposals/finalize/route.ts` (34-08) | Event hooks on existing actions | ✓ VERIFIED | Both present. |
| `app/(authed)/_components/RelanceCard.tsx`, `app/(authed)/page.tsx` (34-09) | Home "à relancer" card | ✓ VERIFIED | Both present, confirmed by direct read; `page.tsx` wires `RelanceCard` at line 156. |
| `EditRelationDialog.tsx`, `NextActionDialog.tsx`, `EditCompanyDialog.tsx`, `RegistryRefreshButton.tsx` (34-10) | Four in-place edit surfaces | ✓ VERIFIED | All present, confirmed by direct read and import-site grep. |
| `ActivityTimeline.tsx`, `NoteComposer.tsx` (34-11) | Unified timeline + note composer | ✓ VERIFIED | Both present, confirmed by direct read. |
| `ClientTabs.tsx`, `IdentityPanel.tsx`, `ClientHeader.tsx`, `RelationPanel.tsx`, `clients/[id]/page.tsx` (34-12) | Page rebuild | ✓ VERIFIED | All present, confirmed by direct read. |
| `scripts/seed-fiche-fixtures.ts` (34-13) | Acceptance fixture seeder | ✓ VERIFIED | Present. |

**Path-resolution check.** Of the 84 distinct paths compiled from the 13
plans' frontmatter, 73 resolve (`test -f` exits 0) and 11 are the
`solution-users-2` vendored files above, confirmed intentionally and
recordedly deleted by Phase 36 HOUSE-04 (not a Phase 34 shortfall). No other
path is missing.

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `app/(authed)/clients/[id]/page.tsx` | `IdentityPanel` / `RelationPanel` / `ContactList` / `ProposalRow`+`ActivityTimeline` | four tab branches on `tab === '…'` (`app/(authed)/clients/[id]/page.tsx:193-297`) | ✓ WIRED | Confirmed by direct read; exactly one branch renders per request. |
| `RelationPanel` / `ClientHeader` / `NextActionDialog` / `RegistryRefreshButton` / `NoteComposer` | `src/lib/relationship/actions.ts` / `src/lib/crm/actions.ts` | direct action imports (`app/(authed)/clients/[id]/EditRelationDialog.tsx:59`, `app/(authed)/clients/[id]/EditCompanyDialog.tsx:65`, `app/(authed)/clients/[id]/NextActionDialog.tsx:53`, `app/(authed)/clients/[id]/RegistryRefreshButton.tsx:51`, `app/(authed)/clients/[id]/NoteComposer.tsx:48`) | ✓ WIRED | Confirmed by grep + read: each dialog/button imports and calls exactly the action FICHE/ACTV requires. |
| `src/lib/relationship/actions.ts` / `src/lib/crm/actions.ts` / `src/lib/crm/registry-sync.ts` | `src/lib/db/queries/relationship-events.ts` (`insertRelationshipEventForOwner`) | direct import, called from `addRelationshipNoteAction`, `setNextActionAction`, `syncCompanyRegistry` | ✓ WIRED | Confirmed by direct read at each call site (`src/lib/relationship/actions.ts:69`, `src/lib/relationship/actions.ts:172`, `src/lib/relationship/actions.ts:257`; `src/lib/crm/registry-sync.ts:5`, `src/lib/crm/registry-sync.ts:133`). |
| `src/lib/db/queries/relationship-events.ts` (write) | `src/lib/db/queries/relationship-events.ts` (`listRelationshipEvents`) → `app/(authed)/clients/[id]/ActivityTimeline.tsx` | `app/(authed)/clients/[id]/page.tsx:108` (`events = tab === 'activity' ? await listRelationshipEvents(...) : null`) → `<ActivityTimeline events={events ?? []} …>` (`app/(authed)/clients/[id]/page.tsx:290-295`) | ✓ WIRED | Confirmed by direct read; the timeline read is the same owner-scoped statement the write path (`INSERT … SELECT`) feeds. |
| `app/(authed)/page.tsx` | `listRelationshipsNeedingFollowUp` | `Promise.all([…, listRelationshipsNeedingFollowUp(userId, 5), …])` (`app/(authed)/page.tsx:88`) → `<RelanceCard rows={relanceRows} …>` (`app/(authed)/page.tsx:156`) | ✓ WIRED | Confirmed by direct grep + read; runs for every authed caller (admin included — admin owns zero relationships and the card returns `null`, no role branch). |
| `src/lib/crm/siren.ts` (`normalizeSiren`) | `src/lib/crm/schemas.ts` (`requiredSirenField`) → `src/lib/crm/actions.ts` (`createClientSchema`) → `src/lib/crm/registry-sync.ts` (`syncCompanyRegistry`) → `schema.companies` | import chain (`src/lib/crm/schemas.ts:2`, `src/lib/crm/schemas.ts:45-49`) → `src/lib/crm/actions.ts:87`, `src/lib/crm/actions.ts:208-216` → `src/lib/crm/registry-sync.ts:100-119` | ✓ WIRED | Confirmed by direct read at every hop: the same normaliser feeds the schema that validates a new client's SIREN, which is the value `syncCompanyRegistry` writes to `companies` after a successful lookup. |
| `app/(admin)/[adminSegment]/companies/[id]/relations/[relationshipId]/page.tsx` | `getRelationshipForAdmin` / `listContactsForRelationshipAdmin` / `listProposalsForRelationshipAdmin` | `requireAdmin()` first, then id-match guard (`relationship.companyId !== id → notFound()`), deliberately NOT importing from the partner-facing `clients/[id]` tree | ✓ WIRED | Confirmed by direct read; this is GAP-01/Phase 37's own admin-oversight surface, distinct from and unaffected by FICHE/ACTV — noted here only because the plan's read-first list named it. |

### Behavioral Spot-Checks

All four commands below, plus the two additional Phase-34-scoped `vitest` invocations, were re-run independently during this verification (not taken on SUMMARY claims) on 2026-09-05 at commit `5753d22`.

| Behavior | Command | Result | Status |
|---|---|---|---|
| Lint (CI-equivalent, `--max-warnings=0`) | `npm run lint:check` | exit 0 | ✓ PASS |
| Type safety | `npm run typecheck` | exit 0 | ✓ PASS |
| Full unit/integration suite | `npm test` (`vitest run`) | 172 files / 2331 tests passed, 6 files / 61 skipped | ✓ PASS |
| Production build | `npm run build` | completes; `/clients` and `/clients/[id]` both compile as dynamic routes, alongside every `/[adminSegment]/companies*` route | ✓ PASS |
| Phase 34 unit suites (crm + relationship + db/queries) | `npx vitest run src/lib/crm src/lib/relationship src/lib/db/queries` | 22 files / 404 tests passed, 6 files / 61 skipped (the six real-Postgres integration suites, `DATABASE_URL_TEST` unset) | ✓ PASS |
| Client-page suites | `npx vitest run "app/(authed)/clients"` | 21 files / 189 tests passed, 0 skipped | ✓ PASS |
| Vendored-UI structural gate | `npx vitest run tests/vendored-ui-integrity.test.ts` | 1 file / 5 tests passed | ✓ PASS |

**On the skipped integration suites.** `client-relationships.isolation.
integration.test.ts` and `relationship-events.insert.integration.test.ts`
skip in this environment because `DATABASE_URL_TEST` is unset (a stated,
accepted limitation of this verification per the plan's own instructions —
`.env.local` points at the production Neon branch, and no migration or
database write was performed to obtain a test branch for this pass). This is
not a fresh finding: `34-SECURITY.md` §7.1 already recorded "wiring
`DATABASE_URL_TEST` into CI is still open" as of 2026-09-04, and `34-
SECURITY.md`'s own text states both suites were run **by hand** against the
Neon development branch that day with named mutation evidence (28→34 tests
after `dab173c`, each of 3 mutations producing a specific named failure, all
reverted). That hand-run evidence is cited here as prior evidence, not
re-produced — re-running it would require a database write this plan is
forbidden from making.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| FICHE-01 | 34-01, 34-02, 34-07 | SIREN lookup on create; outage never blocks | ✓ SATISFIED | `createClientRelationshipAction` D-09 hook + `syncCompanyRegistry`'s never-throws contract. |
| FICHE-02 | 34-01, 34-02, 34-07, 34-10, 34-12 | Registry identity read-only, with sync date + refresh | ✓ SATISFIED | `IdentityPanel` + `RegistryRefreshButton` + `refreshCompanyRegistryAction`. |
| FICHE-03 | 34-01, 34-07, 34-10, 34-12 | Shared display fields editable + audited; SIREN correction re-syncs | ✓ SATISFIED | `updateCompanyDisplayAction`, audit rows at `src/lib/crm/actions.ts:404-420`. |
| FICHE-04 | 34-01, 34-05, 34-06, 34-10, 34-12 | Private relationship facts invisible cross-partner | ✓ SATISFIED | `updateRelationDetailsAction` + owner-scoped read, mutation-verified isolation test. |
| FICHE-05 | 34-03, 34-09 (tab rail research), 34-12 | Header + 4 tabs, in-place editing | ✓ SATISFIED | `page.tsx` tab-branch structure, four dialogs. |
| ACTV-01 | 34-01, 34-03, 34-05, 34-11 | Single timeline, notes + system events | ✓ SATISFIED | `listRelationshipEvents` + `ActivityTimeline`'s in-place filter lens. |
| ACTV-02 | 34-01, 34-05, 34-06, 34-08, 34-11 | Automatic, attributed system events | ✓ SATISFIED | `stage_changed`/`outcome_set`/`proposal_finalized`/`registry_synced` writers, all explicit `actorId`. |
| ACTV-03 | 34-01, 34-06, 34-11 | Dated note | ✓ SATISFIED | `addRelationshipNoteAction` + `NoteComposer`. |
| ACTV-04 | 34-01, 34-06, 34-09, 34-12 | Next-action date on relationship | ✓ SATISFIED | `setNextActionAction` + `ClientHeader`'s `NextActionDialog`. |
| ACTV-05 | 34-05, 34-09 | Follow-up list, next-action date + staleness | ✓ SATISFIED | `listRelationshipsNeedingFollowUp` + `RelanceCard`. |

**No orphaned requirements.** `.planning/milestones/v1.6-REQUIREMENTS.md`
marks all ten of FICHE-01..05 and ACTV-01..05 `[x]`, matching exactly the set
the 13 plans' own `requirements:`/`requirements-completed:` frontmatter
declares across the phase (FICHE-01..04 + ACTV-01..04 in `34-01-SUMMARY.md`;
FICHE-01/02 in `34-02`; FICHE-05/ACTV-01 in `34-03`; ACTV-02 in `34-08`;
ACTV-04/05 in `34-09`; ACTV-01..03 in `34-11`). No id in the ten appears in
any other phase's `requirements:` frontmatter.

### Anti-Patterns Found

Grepped `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` across every non-vendored file
this phase's 13 plans created or modified (the 73 resolvable paths from
Required Artifacts, excluding the deleted `solution-users-2` tree and
generated `drizzle/meta/*.json`) — **zero matches**. Also checked for
stub-return shapes (`return null`/`return {}`/`=> {}` outside a documented
early-return) and "coming soon"/"not yet implemented" phrasing across the
same set — none found outside legitimate, already-explained early returns
(e.g. `RelanceCard`'s absent-not-empty `if (rows.length === 0) return null;`,
which is the component's documented design, not a stub).

### Human Verification Required

None outstanding for FICHE-01..05 / ACTV-01..05 themselves. `34-WALKTHROUGH.md`
records a completed 24-step operator walk (2026-09-04, signed off by
Antoine): 18 steps closed by re-derivable test/source evidence (re-checked
above) and 6 steps required and received a genuine human pass — including
step 8, which found and closed a real production defect (the SIRENE-`null`
parsing bug, fixed in `e2d0a15` and re-walked live the same evening). All 24
are recorded as passed, with no re-opened item.

**Explicitly deferred, per D-37-04, and NOT claimed by this verification:**
`.planning/phases/30-company-contact-registry/30-UAT.md` scenarios **2**
(Clients nav per role), **9** (admin relationship detail), **10** (sales-role
parity and admin exclusion) and **12** (no regression) remain pending and are
walked by the consolidated operator session in plan **37-05**, not here. This
verification's own read-first list included the admin relationship-detail
page (`app/(admin)/[adminSegment]/companies/[id]/relations/[relationshipId]/
page.tsx`) solely to confirm its wiring for the Key Link table above — it
does not constitute a walk of UAT scenario 9.

### Gaps Summary

**No genuine shortfall found.** All ten of FICHE-01..05 and ACTV-01..05 are
delivered as their requirement sentences read, re-derived against the current
codebase rather than against the 13 plans' own claims, with file:line
citations for every Observable Truth and a passing live re-run of all four CI
gates plus the phase-scoped test suites.

Two things are recorded as **accepted, not gaps**, applying 35-VERIFICATION.md's
distinction between a design decision and a shortfall:

1. **The `solution-users-2` vendored block (11 files, 34-03) is absent from
   disk.** This is a deliberate, already-recorded Phase 36 deletion (HOUSE-04,
   commit `82b5b75`) of scaffolding that the shipped FICHE-05/ACTV-01
   implementation never imported — confirmed by reading
   `app/(authed)/clients/[id]/ActivityTimeline.tsx:14-21` directly, whose own
   header states "Nothing is imported FROM that demo." `tests/vendored-ui-
   integrity.test.ts`, the one gate that could have caught a real regression
   here, still passes (5/5) with the tree gone.
2. **`DATABASE_URL_TEST` is unset in this environment**, so the two
   isolation/insert integration suites central to FICHE-04's and ACTV-02's
   strongest claims skip here. This is a stated, pre-existing limitation
   (`34-SECURITY.md` §7.1 already named it open on 2026-09-04) and this plan
   is expressly forbidden from running any migration or write against
   production to work around it. The claims those suites prove are not
   unverified, however: `34-SECURITY.md` records their hand-run, mutation-
   verified results against the Neon development branch the same day
   (3/3 named mutations, each producing the expected specific failure,
   28→34 tests after the isolation suite was extended), and this
   verification treats that as prior evidence rather than re-deriving it.

No FICHE/ACTV requirement shows a partial or differently-shaped delivery.
Unlike Phase 36's experience (cited by 37-CONTEXT.md as the reason to scout
rather than trust a deferral note), re-derivation here confirmed the phase's
own claims rather than contradicting them — including the one place a real
defect *did* ship (the SIRENE-null parser bug), which was already found,
fixed, and re-verified live by the phase's own walkthrough before this
verification began.

---

_Verified: 2026-09-05T20:35:26Z_
_Verifier: Claude (gsd-verifier)_

# Phase 31: Reconciliation Engine & Proposal Extraction - Context

**Gathered:** 2026-09-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Every client already implied by an existing proposal becomes a real `companies` +
`client_relationships` record, produced by a reusable dedup engine that a human resolves
ambiguity through **once, at import** — never re-derived by fuzzy logic afterwards — and that
**never writes without a prior dry run**.

Covers IMPORT-01, IMPORT-03, IMPORT-04, IMPORT-05, IMPORT-06.

**Not in this phase:** the HubSpot `.xlsx` import and its provenance-based idempotency
(IMPORT-02 / IMPORT-07, Phase 32). The engine built here is the one Phase 32 reuses, so it must
not hard-code "source = proposals", but no HubSpot-specific code belongs here.

</domain>

<decisions>
## Implementation Decisions

### Extraction scope
- **D-01:** Source rows are proposals with status `active` **or** `deleted`. Drafts are excluded —
  they INSERT with `inputs = '{}'` and accumulate (D-03 of Phase 12), so many are abandoned or
  half-filled. A soft-deleted proposal still evidences a real client relationship and is included.
- **D-02:** A row whose `clientCo` is missing or whitespace is **skipped and listed in the report**
  with its proposal id. A silently ignored row is indistinguishable from a row the engine never
  saw, which would make the dry-run report unfalsifiable.
- **D-03:** Historical `clientSiren` values are normalized by stripping non-digits. If the result is
  not exactly 9 digits it is treated as **absent**, not stored. This matches Phase 30's create path
  and has a deliberate safety property: a malformed SIREN falls through to name-matching instead of
  auto-merging, so a typo can never fuse two unrelated companies via the nullable UNIQUE constraint.
- **D-04:** Two proposals from the **same partner** naming the same company (identical
  `name_normalized`) but carrying **different SIRENs** are **flagged for human review**, never
  auto-resolved. This is IMPORT-04's ambiguity arriving from a single source: it is either a typo or
  two legal entities sharing a trading name, and the engine cannot tell which.

### Contact extraction
- **D-05:** Extraction **does** create contacts, but only when `clientName` is present. `inputs`
  already carries `clientName` / `clientRole` / `clientTel` / `clientEmail` — exactly the Phase 30
  `contacts` shape — and it is the partner's own asset per CRM-04's reasoning. A partner opening
  their new client book should find the person they actually dealt with.
- **D-06:** Within one relationship, two extracted contacts are the same person if their **email
  matches**; absent an email, if their **normalized name** matches. Merging fills in blank fields
  rather than overwriting populated ones.
- **D-07:** A row with `clientTel` / `clientEmail` but **no** `clientName` yields **no contact** —
  the company and relationship still import, and the skip is reported. `contacts.name` is NOT NULL,
  and inventing a person to satisfy the constraint contradicts CRM-04 (a contact is a person at the
  client). The phone number remains visible on the proposal itself, so nothing is lost.
- **D-08:** Extracted records carry a **provenance marker**, added as a column in this phase's
  migration. The engine bulk-writes into tables partners also edit by hand; without a marker a bad
  import cannot be surgically undone and "did we create this or did they?" is unanswerable. Follows
  CRM-08's precedent of adding a cheap column now rather than a migration plus backfill later.

### Review queue and merge semantics
- **D-09:** Pair decisions live in a **new table**, recording the pair, the verdict
  (`merged` | `kept_separate`), who decided, and when. It is the only option that makes criterion 5's
  "never re-flagged" a query the engine can run *before* flagging — and the only one that can store a
  keep-separate verdict, which by definition leaves no other trace because nothing was written.
- **D-10:** A pair is keyed on its **normalized-name pair**, not on company ids. This is stable
  *before* anything is written — required, because a dry run must be able to report a pair as already
  resolved when no company rows exist yet — and it survives a merge, after which one company id no
  longer exists. `name_normalized` is a STORED generated column, so the key is computed by the DB.
- **D-11:** The review queue is **admin-only**. Near-forced by CRM-02: companies are global but
  relationships are private, so a flagged pair will often have its two sides held by different
  partners. Showing that pair to a partner would reveal that someone else is working the other
  company — precisely the channel-conflict leak the model exists to prevent. Admins already hold the
  cross-partner view via CRM-03.
- **D-12:** Merging **repoints relationships, contacts and proposal links to the survivor and deletes
  the loser**. One case needs explicit handling: `client_relationships` is UNIQUE per
  `(company_id, owner_id)`, so when a single partner holds relationships with *both* companies,
  repointing collides — those two relationships must themselves merge, combining their contacts and
  proposal links.

### Trigger, dry run and surfaces
- **D-13:** The import is a **CLI script under `scripts/`**, following the established pattern
  (~10 DB scripts wired through `scripts/_load-env.ts`, repaired in `52ef540`). A one-time migration
  of historical data is an operator action, not a product feature; a script keeps a bulk-write
  operation off the app's request path and runs against whichever branch `DATABASE_URL` points at.
- **D-14:** The dry run emits a **written report in two forms** — a human-readable summary reviewable
  at real row counts, and a machine-readable form the real run can be diffed against. Criterion 1
  asks for a full report of what it *would* create, merge and flag: that is a document, not a stream.
- **D-15:** The real run **compares against the last dry-run report and reports drift**. This turns
  "never writes without a prior dry run" from a convention into something enforceable.
- **D-16:** The review queue gets its **own admin route**, alongside the
  `/[adminSegment]/companies` tree Phase 30 shipped. A work list with its own empty state and resolve
  actions is a different job from browsing the registry, and it drains to empty.

### Claude's Discretion
- Report file format and location (Markdown + JSON is the expected shape; exact schema is the
  planner's call).
- Naming of the provenance column and the pair-decision table.
- Whether the engine's source abstraction is an interface, a discriminated union, or a parameter —
  only the requirement that Phase 32 can reuse it is locked.
- Batching, transaction boundaries and progress reporting inside the script.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and scope
- `.planning/REQUIREMENTS.md` § "Two-Source Reconciliation (IMPORT)" — IMPORT-01..07, and the
  explicit statement that this is the riskiest work in the milestone
- `.planning/REQUIREMENTS.md` § "Out of Scope" — "Fuzzy matching at query time" is excluded by
  design; matching happens once, at import, with human resolution
- `.planning/ROADMAP.md` § "Phase 31" — goal and the five success criteria this phase is measured on

### The schema being imported into (Phase 30)
- `.planning/phases/30-company-contact-registry/30-01-SUMMARY.md` — `companies`,
  `client_relationships`, `contacts`, the `proposals.client_relationship_id` FK, and the
  `leasetic_normalize_company_name()` versioned SQL function
- `drizzle/0007_phase30_crm_registry.sql` — the migration itself, including the STORED generated
  `name_normalized` column and the nullable UNIQUE `siren`
- `src/db/schema.ts` — `companies` / `client_relationships` / `contacts` / `proposals` definitions,
  including the UNIQUE `(company_id, owner_id)` constraint that constrains D-12
- `.planning/phases/30-company-contact-registry/30-VERIFICATION.md` — what is proven about CRM-01..08
  and ROLE-01..03, so this phase does not re-litigate it

### The snapshot invariant (load-bearing, non-negotiable)
- `.planning/codebase/ARCHITECTURE.md` §2.5 Option A — `proposals.inputs` is immutable; the
  extraction reads it and must never write it
- `src/lib/db/queries/proposals.ts` — `finalizeDraft`'s set-object deliberately contains no `inputs`
  key (CRM-05, verified in Phase 30)

### The data being extracted
- `src/lib/calc/schema.ts` §"Client destinataire card" — the canonical `inputs` shape:
  `clientCo`, `clientName`, `clientRole`, `clientTel`, `clientEmail`, `clientSiren`. Note
  `proposals.inputs` is typed `Record<string, unknown>` at the DB layer, so the engine must treat
  every field as unvalidated
- `src/db/schema.ts` — `proposals.schema_version` carries a semver CHECK; historical rows may
  predate the current shape

### Security and access model
- `.planning/phases/30-company-contact-registry/30-SECURITY.md` — CRM-02 tenant isolation as an
  *inference* property (counts, wording, 403-vs-404 divergence all count as channels). D-11 follows
  directly from this
- `src/lib/auth/require.ts` — `requireAdmin()` and `requireRelationshipHolder()`; the queue uses the
  former

### Operational constraints
- `docs/operations/neon-branch-routing.md` § "Locked rules" rule 3 — migrations fan out only via
  `db-migrate.yml`, never a local `db:migrate` against a real branch. This phase adds a migration and
  must respect it
- `scripts/_load-env.ts` — the env-loading pattern every `scripts/` entry point uses (D-13)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `leasetic_normalize_company_name()` — the versioned SQL normalization function driving
  `companies.name_normalized`. The engine's name matching MUST use this rather than reimplementing
  normalization in TypeScript, or the two will drift.
- `src/lib/db/queries/companies.ts` — the admin-side, non-owner-filtered read module Phase 30 built
  for CRM-03. The review queue's reads belong here or beside it, not in the partner-scoped module.
- `src/lib/crm/schemas.ts` — SIREN normalization to digits-only already exists for the create path;
  D-03 should reuse it rather than write a second normalizer.
- `scripts/_load-env.ts` — dotenv loading for `scripts/` entry points.
- Audit-log actions (`client_relationship.create`, `contact.create`, …) were extended in Phase 30;
  the engine's writes should extend the same vocabulary rather than invent a parallel one.

### Established Patterns
- Owner-scoped reads compile `ownerId` into every WHERE as a required parameter; admin reads live in
  a separate module with no owner filtering. The engine writes across owners, so it belongs on the
  admin side of that split.
- Mutations re-prove ownership inside the mutating statement (`INSERT ... SELECT`), following the
  T-30-05-05 TOCTOU fix in `1d763b9`.
- Admin routes call `requireAdmin()` as defense in depth even under the gated layout (AUTH-15).
- Guard scripts in `scripts/` follow a house style: `set -euo pipefail`, cd to repo root, header
  comment citing the incident, actionable failure message.

### Integration Points
- `proposals.client_relationship_id` — currently written only by `createDraft`. The extraction is the
  second writer; Phase 30's grep gate asserting a single write path will need updating, and the
  planner must confirm that gate's intent is preserved rather than silently deleted.
- `/[adminSegment]/companies` — the review queue's sibling surface; D-16's new route sits alongside it.
- `drizzle/` + `drizzle/meta/_journal.json` — this phase's migration must be generated with
  `npm run db:generate` so the journal parity gate (INFRA-06, Phase 29) stays green.

</code_context>

<specifics>
## Specific Ideas

- The dry run is the phase's defining behaviour, not a convenience: criterion 1 requires **zero rows
  written**. D-15's drift comparison is what stops a real run from silently doing something the
  reviewed report never promised.
- D-03's "malformed SIREN is treated as absent" was chosen specifically so bad data degrades into
  *human review* rather than into an *automatic merge*. The same instinct runs through D-04 and D-07:
  when the engine cannot tell, it must ask rather than guess.
- D-11 was not a preference but close to a derivation from CRM-02 — the channel-conflict model
  decides who is allowed to see a flagged pair.

</specifics>

<deferred>
## Deferred Ideas

- **HubSpot-specific extraction and provenance-based idempotency** — IMPORT-02 / IMPORT-07, Phase 32.
  The engine here must be reusable by it, but no HubSpot code belongs in this phase.
- **A UI trigger for the import** — considered and rejected for now (D-13). Revisit only if an
  operator actually needs to run it without a terminal.
- **Normalising `clientRole` against a controlled vocabulary** — raised while discussing contacts;
  extraction imports it verbatim for now.
- **Extending the provenance column to `companies` and `client_relationships`** as well as
  `contacts` — surfaced but not decided; see open questions.

## Open Questions (recorded, not guessed)

These were surfaced during discussion and deliberately left for the planner or a follow-up
conversation rather than silently assumed:

1. **Re-run idempotency.** What happens on a second *real* run over proposals already linked in
   Phase 30 or by a prior run? Proposals carrying a `client_relationship_id` could be skipped or
   re-checked. IMPORT-07 covers idempotency formally but lands in Phase 32.
2. **Canonical name selection.** When several proposals name the same company with different
   spellings that normalize identically, which spelling becomes `companies.name`? Oldest, newest,
   most frequent?
3. **Engine granularity.** Does the engine run globally in one pass across all partners, or
   per-partner? This interacts with D-11: a global pass can see pairs no single partner can.
4. **Provenance scope.** Does D-08's column belong on `contacts` only, or on `companies` and
   `client_relationships` too?
5. **Contact conflict across provenance.** If an extracted contact's email later collides with a
   partner-entered one, is it merged or left alone?

</deferred>

---

*Phase: 31-reconciliation-engine-proposal-extraction*
*Context gathered: 2026-09-02*

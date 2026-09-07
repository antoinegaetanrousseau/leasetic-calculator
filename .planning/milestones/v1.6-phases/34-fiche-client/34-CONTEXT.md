# Phase 34: Fiche client - Context

**Gathered:** 2026-09-03
**Status:** Ready for planning
**Source:** `docs/superpowers/specs/2026-09-03-fiche-client-design.md` (design approved in conversation 2026-09-03)

<domain>
## Phase Boundary

A partner opens a client and sees who the company actually is, what they have recorded about the
relationship, and its full history in one place — and can correct any of it without leaving the
page.

Covers FICHE-01..05 and ACTV-01..05.

**Why the two requirement families are one phase.** Phase 34 was "Activity & Follow-Up" (ACTV only)
until 2026-09-03, when Antoine asked for a client page that displays and edits real company
information. The timeline is one section of that page. Shipping them separately would have built
`/clients/[id]` twice.

**Not in this phase:** contract-tool sync and HubSpot enrichment (both v1.7+); any cross-partner
view, aggregate or comparison (CRM-02 forbids it, and D-12 of Phase 33 restated it for the board);
a bulk registry backfill of existing companies — they render as not yet synced until someone
refreshes them, which is a deliberate choice, not an oversight.

</domain>

<decisions>
## Implementation Decisions

### The sharing rule — the decision everything else follows from

- **D-01:** **The registry owns identity; partners own the rest.** `companies` is a SHARED row
  (CRM-01): two partners quoting the same SIREN attach to the same company and each hold their own
  `client_relationships` row. Every field added in this phase therefore belongs to exactly one of
  three tiers:

  | Tier | Fields | Who may write | Visible to |
  |---|---|---|---|
  | Registry identity | legal name, address, legal form, NAF code, activity section, headcount band, founding date, administrative state | nobody by hand — only the SIRENE lookup | every partner on the company |
  | Shared display | display name, website, phone, SIREN correction | any partner on the company, audit-logged | every partner on the company |
  | Private relationship | source, description, next action, notes, timeline | the owning partner only | that partner only |

- **D-02:** A partner-facing form must never be able to write a registry-tier field. This is a
  structural rule, not a UI convention: the update statements for the shared tier enumerate their
  columns explicitly and no action in this phase accepts a registry column name from a caller.
- **D-03:** A shared-tier edit writes an audit row with before and after, precisely *because*
  another partner sees the result. A private-tier edit does not need one.

### The registry integration

- **D-04:** The source is `recherche-entreprises.api.gouv.fr`. **Measured live on 2026-09-03:**
  `GET /search?q=<siren>&per_page=1` returned HTTP 200 in 0.58s with no key and no auth header.
- **D-05:** **It is a SEARCH endpoint, not a lookup by key.** There is no `/siren/{siren}` route —
  a query is free-text matching that happens to hit the SIREN. The parser MUST assert
  `results[0].siren === the requested siren`, and treat both a mismatch and an empty `results`
  array as `not_found`. Trusting the first result blindly can attach a company to the wrong
  identity, which is the single worst failure this phase can produce.
- **D-06:** **The registry returns codes, never labels.** There is no `libelle` for NAF, legal form
  or headcount anywhere in the payload. Consequences, all measured rather than assumed:
  - headcount band ships a lookup table in code (~13 entries) — "42" renders as "250 à 499
    salariés", which is the whole point of storing it;
  - activity stores the raw NAF code and displays it beside the label for
    `section_activite_principale`, a 21-entry table. The ~700-row NAF table is NOT shipped;
  - legal form displays its code. Revisit only if asked.
  - There is no `naf_label` column. It was in the first draft of the design and was removed once
    the API was measured.
- **D-07:** Only the SIREN leaves the app — no partner id, no user id, no company name.
- **D-08:** The call carries a short abort timeout, and its response is parsed by a zod schema that
  ignores unknown fields, so an upstream addition cannot break us.
- **D-09:** A registry failure NEVER blocks client creation. `createClientRelationshipAction` calls
  the lookup after the company row is resolved, and only when that company is new or not yet
  synced; on any failure it writes `registry_status = 'pending'` and does not enter the bounded
  error path. The client is created either way (FICHE-01).
- **D-10:** Registry data is untrusted input: parsed, length-capped, rendered as text, never
  interpolated into SQL.
- **D-11:** `etat_administratif` is stored and surfaced. A partner should see that a company has
  ceased trading before quoting it. Added after measuring the API; not in the original
  conversation.

### Data model

- **D-12:** One migration, `0010`, applied through the existing GitHub workflow. NEVER
  `npm run db:migrate` locally — `.env.local` points at a live Neon branch.
- **D-13:** `companies.name` stays the display name. No rename, no backfill, no data migration.
  `legal_name` is what the registry returned; `name` is what partners see and may edit.
- **D-14:** `relationship_events` is a new table: id, relationship FK (cascade), `kind`
  (CHECK-constrained: `note`, `stage_changed`, `proposal_finalized`, `outcome_set`,
  `registry_synced`, `next_action_set`), nullable `actor_id` (null means the system), `occurred_at`,
  nullable `body`, `payload` jsonb. Indexed on `(client_relationship_id, occurred_at DESC)`.
- **D-15:** **System events are written by the actions that cause them, never by a database
  trigger.** A trigger cannot see the session, so an event it wrote could carry no actor — and
  ACTV-02 requires attribution. This is the same reasoning that put the SIREN gate in an action
  rather than only in a trigger in Phase 33.

### Interface

- **D-16:** Route stays `/clients/[id]`, still a RELATIONSHIP id, still a plain `notFound()` for
  both not-found and not-owned (the Phase 30 D-18 obscurity rule is unchanged).
- **D-17:** The page is a header plus four tabs — Informations, Contacts, Propositions, Activité.
  The active tab lives in a search param so a refresh keeps position and each tab fetches
  server-side.
- **D-18:** Editing happens in place, per section, through its own dialog. There is no separate
  edit screen and no page-wide edit mode.
- **D-19:** The timeline is built on the licensed ReUI block `solution-crm-5` (day buckets, type
  filters); the page shell follows `solution-users-2`'s tab rail. Adapt by reuse — no hand-rolled
  timeline. Both are Pro-tier and already covered by the project's licence.
- **D-20:** **The "à relancer" list does not live on the client page.** It goes on the home page as
  a card, because that is where a partner starts their day. The pipeline board stays a stage view
  (ACTV-05).

### Carried in from the Phase 33 code review

Three open findings sit on code this phase touches, and are closed here rather than left to rot.

- **D-21 (WR-16):** the stage-change audit payload carries only `toStage`, while `audit-log.ts`
  documents "the from/to stage strings" for ACTV-02's timeline. Fix it where the timeline makes the
  gap visible.
- **D-22 (WR-06):** the board's `proposalsCount` join omits the `proposals.user_id` predicate that
  `listProposalsForRelationship` carries as CRM-02 defence in depth.
- **D-23 (WR-15):** `requiredSirenSchema` in `src/lib/calc/schema.ts` neither normalises nor
  rejects interleaved non-digits, while its sibling in `src/lib/crm/schemas.ts` does both via
  `normalizeSiren`. FICHE-01 makes the SIREN the registry lookup key, so one normalisation rule
  becomes load-bearing.

### Inherited rules that bind this phase

- **D-24:** Server actions return a discriminated result for a recoverable outcome and throw a
  single bounded key for everything else. NEVER a sentinel matched on `error.message` — Next.js
  redacts that in production builds, which is what 33-REVIEW CR-01 was.
  `tests/server-action-error-contracts.test.ts` fails the build if this is reintroduced.
- **D-25:** `requireRelationshipHolder()` is the FIRST await in every action and page
  (PITFALLS §7.3). Owner scoping is re-proved inside each statement's own WHERE, never as a
  separate check-then-write.
- **D-26:** Audit payloads carry ids and caller-submitted values only, never commission data
  (ADMIN-09).

</decisions>

<canonical_refs>
## Canonical References

- `docs/superpowers/specs/2026-09-03-fiche-client-design.md` — the approved design this context
  derives from, including the measured API contract and field mapping table.
- `app/(authed)/clients/[id]/page.tsx` — the page being rebuilt; its numbered order-of-operations
  doc comment is the security contract to preserve.
- `src/lib/crm/actions.ts` — `createClientRelationshipAction`, where the registry lookup hooks in
  (D-09), and the bounded-error + owner-scoping discipline to copy.
- `src/lib/pipeline/actions.ts` — the post-CR-01 shape for a recoverable outcome (returned
  discriminated result, D-24).
- `src/db/schema.ts` — `companies` and `client_relationships` as they stand.
- `src/lib/db/queries/client-relationships.ts` — `listProposalsForRelationship`'s owner-scoping
  pattern, including the defence-in-depth predicate D-22 is about.
- `.planning/codebase/UI-CONVENTIONS.md` — UIC-03 accent reserve, UIC-04 `rounded-container`,
  UIC-05 empty states, UIC-09 page width, plus the new "Vendored ReUI modifications" table.
- `.planning/phases/33-pipeline/33-REVIEW.md` — the open findings D-21..D-23 come from.

</canonical_refs>

<specifics>
## Specific Ideas

- The header carries display name, SIREN, the pipeline stage as an inline select, and the next
  action, with a "Modifier" control for the relationship fields.
- "Informations" holds two panels: "Identité (registre)", read-only with the sync timestamp and a
  refresh control, and "Relation", the partner-owned fields behind their own dialog.
- Contacts and Propositions reuse the existing `ContactList` and `ProposalRow` verbatim.
- A successful registry sync appends a `registry_synced` event to the caller's timeline.
- `source` is CHECK-constrained to `recommandation`, `prospection`, `salon`, `site_web`, `autre`.

</specifics>

<deferred>
## Deferred Ideas

- **A bulk registry backfill of existing companies.** They show as not yet synced until someone
  opens them and refreshes; the volume is small and a refresh is one click. Revisit if the count
  grows.
- **A full NAF label table (~700 rows)** and **a full legal-form table (~100 rows)** — D-06 ships
  the two small tables only.
- **Cross-partner anything.** Out by CRM-02, permanently, not just for this phase.

</deferred>

<scope_fence>
## Scope Fence

In: FICHE-01..05, ACTV-01..05, and D-21..D-23 from the Phase 33 review.

Out: contract-tool sync, HubSpot enrichment, cross-partner views, bulk backfill, gamification
(Phase 35), and any change to the pipeline board beyond D-22's missing predicate.

</scope_fence>

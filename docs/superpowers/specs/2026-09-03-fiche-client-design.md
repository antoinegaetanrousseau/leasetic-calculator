# Fiche client — design

**Date:** 2026-09-03
**Phase:** 34 (redefined from "Activity & Follow-Up")
**Requirements:** FICHE-01..05, ACTV-01..05
**Status:** approved in conversation; awaiting written-spec review

---

## Why

`/clients/[id]` today shows a company name, an optional SIREN, a contact list and
a proposal list. A partner cannot see who the company actually is, cannot record
anything about the relationship, and cannot correct a single field — not even a
mistyped name. Antoine asked for "a better interface to interact with my client
page… more information displayed from the client, and edited."

The timeline that Phase 34 originally held (ACTV-01..05) is one section of that
page rather than a phase of its own, so the two were merged instead of shipping a
client page twice.

## The sharing rule everything follows

**The registry owns identity; partners own the rest.**

`companies` is a SHARED row (CRM-01): two partners quoting the same SIREN attach
to the same company and each hold their own `client_relationships` row. That
makes "who may edit what" the central design question, and the answer is three
tiers:

| Tier | Fields | Who may write | Visible to |
|---|---|---|---|
| Registry identity | legal name, address, legal form, NAF code, activity section, headcount band, founding date, administrative state | nobody by hand — only the SIRENE lookup | every partner on the company |
| Shared display | display name, website, phone, SIREN correction | any partner on the company, audit-logged | every partner on the company |
| Private relationship | source, description, next action, notes, timeline | the owning partner only | that partner only |

A partner-facing form must never be able to write a registry field. A shared-tier
edit is audit-logged precisely because someone else sees the result.

## Scope

**In:** registry lookup at client creation and on demand; read-only identity
display with a sync timestamp; partner-editable shared display fields; private
relationship fields; a tabbed client page with per-section edit dialogs; the
unified timeline with manual notes and system events; next-action date; the "à
relancer" list.

**Out:** contract-tool sync (v1.7+), HubSpot enrichment (v1.7+), any cross-partner
view or aggregate (CRM-02 forbids it), bulk registry backfill of existing
companies (a separate operational decision — existing rows simply show as not yet
synced until someone refreshes them).

---

## 1. Data model — one migration

**`companies`** gains, all nullable:

`legal_name`, `address_line`, `postal_code`, `city`, `legal_form`, `naf_code`,
`naf_section`, `headcount_band`, `founded_on`, `registry_state`, `website`,
`phone`, `registry_status` (`synced` | `pending` | `not_found` | `error`,
CHECK-constrained, default `pending`), `registry_synced_at`.

(`naf_label` was dropped after the API was measured — the registry has no label
to store. See § 2.)

The existing `name` column stays as the display name — no rename, no backfill,
no data migration. `legal_name` is what the registry returned; `name` is what
partners see and may edit.

**`client_relationships`** gains: `source` (CHECK-constrained to
`recommandation` | `prospection` | `salon` | `site_web` | `autre`), `description`,
`next_action_at`, `next_action_note`.

**`relationship_events`** is new: `id`, `client_relationship_id` (FK, cascade),
`kind` (CHECK-constrained: `note` | `stage_changed` | `proposal_finalized` |
`outcome_set` | `registry_synced` | `next_action_set`), `actor_id` (nullable —
null means the system did it), `occurred_at`, `body` (nullable text, the note),
`payload` (jsonb). Indexed on `(client_relationship_id, occurred_at DESC)`.

System events are written by the actions that cause them, never by a database
trigger. Triggers cannot see the session, so an event written by one could not
carry an actor, and ACTV-02 requires attribution.

Migration `0010`, applied through the existing GitHub workflow. Never
`npm run db:migrate` locally — `.env.local` points at a live Neon branch.

## 2. Registry integration

**Verified against the live API on 2026-09-03** — the details below are measured,
not assumed. `GET https://recherche-entreprises.api.gouv.fr/search?q=<siren>&per_page=1`
returned HTTP 200 in 0.58s with no key and no auth header.

A new module, `src/lib/registry/recherche-entreprises.ts`, exports one function
taking a SIREN and returning a discriminated result: synced with parsed fields,
not found, or error.

**It is a SEARCH endpoint, not a lookup by key.** There is no `/siren/{siren}`
route: a query is a free-text search that happens to match on SIREN. The parser
must therefore assert `results[0].siren === the requested siren` and treat any
mismatch, and any empty `results` array, as `not_found`. Trusting the first
result blindly would attach a company to the wrong identity.

- Only the SIREN leaves the app. No partner id, no user id, no company name. The
  endpoint is public and needs no key.
- The call carries a short abort timeout so client creation never waits on an
  outage, and the response is parsed by a zod schema that ignores unknown fields
  so an upstream addition cannot break us.
- `createClientRelationshipAction` calls it after the company row is resolved,
  and only when that company is new or not yet synced. A failure writes
  `registry_status = 'pending'` and never enters the bounded error path: the
  client is created either way.
- A separate refresh action backs the "Actualiser" control, reusing the same
  function and requiring the caller to own a relationship on that company.
- A successful sync appends a `registry_synced` event to the caller's timeline.
- Tests mock `fetch`. No test performs a live call.

### Field mapping (measured)

| Our column | Registry field | Note |
|---|---|---|
| `legal_name` | `nom_raison_sociale` | `nom_complet` is the same string for most companies; prefer `nom_raison_sociale` and fall back |
| `address_line` | `siege.adresse` | already a single formatted line |
| `postal_code` | `siege.code_postal` | |
| `city` | `siege.libelle_commune` | |
| `legal_form` | `nature_juridique` | a CODE ("5599"), never a label |
| `naf_code` | `activite_principale` | a CODE ("70.10Z"), never a label |
| `naf_label` | — | **does not exist in the response** — see below |
| `headcount_band` | `tranche_effectif_salarie` | a CODE ("42"), never a label |
| `founded_on` | `date_creation` | ISO date |
| `registry_state` | `etat_administratif` | `A` active, `C` ceased — worth surfacing: a CRM should say when a company is closed |

**The registry returns codes, not labels.** This was the design's one wrong
assumption. There is no `libelle` for NAF, legal form or headcount anywhere in
the payload, so the app must own the label tables or show raw codes. The
proportionate answer:

- **Headcount band** — ship the table. It is roughly a dozen entries and turns
  "42" into "250 à 499 salariés", which is exactly the "how big are they" signal
  the field exists for. (Resolves open question 2 as *render it*.)
- **Activity** — store `activite_principale` and display it beside the label for
  `section_activite_principale`, a 21-entry table ("M" → "Activités
  spécialisées, scientifiques et techniques"). Do NOT ship the ~700-row NAF
  table for a label nobody asked for; drop the `naf_label` column and keep the
  section label instead.
- **Legal form** — display the code. The full table is ~100 rows of INSEE
  categories that mean little to a sales partner; revisit only if asked.

**Returned data is untrusted input.** It is parsed, length-capped, rendered as
text, and never interpolated into SQL.

## 3. Interface

Route stays `/clients/[id]`, still a relationship id, still 404 for both
not-found and not-owned.

- **Header** — display name, SIREN, the pipeline stage as an inline select, and
  the next action. A "Modifier" control opens the relationship dialog.
- **Tabs** — Informations, Contacts, Propositions, Activité. The active tab lives
  in a search param so a refresh keeps position and each tab can fetch
  server-side.
- **Informations** — two panels. "Identité (registre)" is read-only with the
  sync timestamp and the refresh control; "Relation" holds the partner-owned
  fields behind their own "Modifier" dialog.
- **Contacts** and **Propositions** reuse the existing contact list and proposal
  row components unchanged.
- **Activité** — the timeline with a note composer, built on the licensed ReUI
  block `solution-crm-5` (day buckets, type filters). The page shell follows
  `solution-users-2`'s tab rail.
- **The "à relancer" list does not live here.** It belongs on the home page as a
  card, because that is where a partner starts their day. The pipeline board
  stays a stage view.

## 4. Security

- Every new read and write re-scopes by owner in its own statement. No admin
  bypass, no cross-partner aggregate.
- Private fields live on the relationship and on `relationship_events`, never on
  `companies`. The timeline reads events for the caller's own relationship only.
- Shared-tier edits write an audit row with before and after. Registry fields are
  unreachable from any partner form.
- Audit payloads carry ids and submitted values only, never commission data
  (ADMIN-09).
- Server actions return discriminated results for recoverable outcomes and throw
  a single bounded key for everything else. Never a sentinel matched on
  `error.message` — that is redacted in production builds, which is what
  33-REVIEW CR-01 was.

## 5. Testing

- Unit: the registry parser against a captured payload fixture, plus the timeout
  and not-found paths.
- Action tests with mocked fetch proving a registry outage still creates the
  client and marks it pending.
- Owner-scoping tests per new action, proving another partner's relationship is
  refused.
- Page tests for tab rendering and for identity fields being read-only.
- One integration test on the development Neon branch covering the new column
  defaults and the events table.
- Gates unchanged: typecheck, lint check, full suite, build.

## 6. Carried in from the Phase 33 review

Three open findings sit on code this phase touches, and are fixed here rather
than left to rot:

- **WR-16** — the stage-change audit payload carries only `toStage`, while
  `audit-log.ts` documents "the from/to stage strings" for ACTV-02's timeline.
- **WR-06** — the board's `proposalsCount` join omits the `proposals.user_id`
  predicate that `listProposalsForRelationship` carries as CRM-02 defence in
  depth.
- **WR-15** — `requiredSirenSchema` in `calc/schema.ts` neither normalises nor
  rejects interleaved non-digits, while its sibling in `crm/schemas.ts` does
  both. FICHE-01 makes the SIREN the registry lookup key, so one normalisation
  rule becomes load-bearing.

## Open questions

1. **Existing companies.** They will show as not yet synced until someone opens
   them and refreshes. Acceptable, or should the phase ship a one-off backfill
   script? Recommendation: acceptable — the volume is small and a manual refresh
   is one click.
2. ~~**`headcount_band`** — render the label or omit the field?~~ **Resolved
   2026-09-03** by measuring the API: it returns codes for headcount, NAF and
   legal form alike. Ship the headcount table and the 21-entry activity-section
   table; display the legal-form code as-is. See § 2.

3. **Registry field list.** `etat_administratif` was added after measuring the
   API — a ceased company is something a partner should see before quoting.
   Confirm that is wanted, since it was not in the original conversation.

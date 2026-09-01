# Requirements: Matrice Commerciale v1.6 — CRM Foundation

**Defined:** 2026-08-31
**Milestone:** v1.6
**Core value (unchanged since v1.0):** A partner fills client info + amount + duration and gets a pixel-correct PDF proposal with the correct lease calculation. v1.6 does **not** touch that flow — it gives the client data a life of its own alongside it.

**Source of truth:** This milestone's scope conversation with Antoine (2026-08-31). No domain research (`workflow.research: false`; the data model was settled in conversation, and the two real unknowns — the HubSpot export's columns and the in-house contract tool's customer schema — are private and unreachable by research).

**Phase numbering:** continues from Phase 28 (the retro-documented ReUI/base-maia migration) — v1.6's first phase is **Phase 29**.

**Depends on:** PR #6 (`migration/phase-0-baseline` → `main`, 24 commits, ReUI design-system migration) landing first. v1.6 surfaces are built on that design system.

---

## The problem this milestone solves

Client data does not exist as data. It lives inside `proposals.inputs`, a JSONB blob that is **immutable by design** (DATA-02 / ARCHITECTURE §2.5 Option A — a generated PDF must always reproduce exactly what was sent). Consequences today:

- Three proposals for the same client are three unrelated copies of that client's details
- There is no way to ask "show me everything for this client"
- Nothing survives a proposal — no client record, no history, no relationship

Second gap: the app never learns what happened next. Statuses are `draft | active | deleted` with `expired` derived. There is no won, no lost, no signed. The tool stops at "PDF generated".

**The resolution is additive, not a relaxation.** The snapshot invariant stays. A mutable `companies` / `client_relationships` model is added *alongside* it, and `proposals` gains a nullable FK. The JSONB keeps the frozen historical copy; the FK points at the living record. Same data, two purposes, deliberately duplicated.

---

## v1.6 Requirements

### Environment Isolation & Migration Safety (INFRA — continues v1.1 INFRA-01..03)

> **Corrected 2026-08-31, before planning.** This category was originally written from the
> v1.3 carry-forward inventory (dated 2026-05-21), which stated that all three Vercel scopes
> still pointed at the production pooled endpoint. **That note was stale.** Phase 20 (INFRA-01,
> shipped 2026-05-27 — six days after the carry-forward was written) built the full three-branch
> split, the per-branch migration fan-out, and a `db-smoke` CI job. Verified against
> `.github/workflows/ci.yml`, `.github/workflows/db-migrate.yml` and
> `docs/operations/neon-branch-routing.md`, not against the planning note.
>
> The category is rewritten below to describe what is **actually** missing. It is much smaller
> than originally scoped, and it is **no longer a hard gate** on the rest of v1.6 — the safety
> net exists; one part of it is miswired.

Still sequenced first, but now because it is small and because the miswiring below should not be
live while phases 30-34 add eight migrations, not because the isolation is absent.

Prior evidence this matters: Phase 12 shipped a SQL migration with no `drizzle/meta/_journal.json`
entry; production ran un-applied for ~24 hours until Phase 13's wizard hit the missing column.
**INFRA-06 below exists because the gate built to catch that is currently blind to it.**

- [x] **INFRA-04** *(already satisfied — Phase 20 / INFRA-01, 2026-05-27)*: The `preview` and `development` Vercel scopes resolve to their own Neon branches (`br-noisy-frost-alyzvg2s` / `br-tiny-hat-alk1dent`), each with its own pooled endpoint, and `db-migrate.yml` routes per-branch via `DATABASE_URL_MAIN` / `_PREVIEW` / `_DEVELOPMENT`. No work required; retained for traceability.
- [x] **INFRA-05**: Local development reads and writes the Neon `development` branch, not production. `.env.local` currently points at `ep-icy-boat-alx5o1tz-pooler` — the `main` branch. **Phase 20's locked rule 3 is NOT relaxed**: migrations still fan out only via `db-migrate.yml`, never `npm run db:migrate` against a real branch. The requirement is data isolation for local *runtime*, not a local migration path.
- [x] **INFRA-06**: The `db-smoke` gate actually fires on this repo's migration files. Its `dorny/paths-filter` pattern is `drizzle/migrations/*.sql`, a directory that **does not exist** — every migration lives at `drizzle/*.sql`. Today the job only triggers via its second pattern, `drizzle/meta/_journal.json`, so a migration committed *without* a journal entry — the exact Phase 12 regression — matches neither pattern and the gate passes green without running. Fix the pattern and add a check that fails if the filter stops matching real migration paths.

### Company & Contact Registry (CRM)

The master-data layer. A `company` is a global fact; a `client_relationship` is private to the partner who holds it. This split is what makes the registry **channel-conflict safe** — Partner A must never learn that Partner B is working the same end client, while Leasétic sees every relationship on a company (duplicate-deal risk is exactly the thing that turns into a dispute at signature).

- [x] **CRM-01**: A company exists as a first-class record carrying name, normalized name, and optional SIREN. `siren` is nullable UNIQUE; `name_normalized` (lowercased, accents stripped, legal forms SARL/SAS/SA removed, whitespace collapsed) is a stored column so the rules are versioned in migrations rather than drifting in application code.
- [x] **CRM-02**: A partner holds a private relationship with a company. No partner can see, query, or infer another partner's relationships.
- [x] **CRM-03**: An admin can see every relationship attached to a company, including which partners hold them.
- [x] **CRM-04**: A contact belongs to a **relationship**, not to the company, and carries name, role, phone and email. (A person at ACME is arguably a fact about ACME; the mobile number a partner worked to get is that partner's asset.)
- [x] **CRM-05**: A proposal links to a client relationship via a nullable FK **without altering its `inputs` snapshot**. The JSONB remains byte-identical; the snapshot invariant is preserved.
- [x] **CRM-06**: A partner can open a client and see every proposal they have made for that client on one page.
- [x] **CRM-07**: A partner can browse and search their own client book.
- [x] **CRM-08**: Companies and contacts carry external-reference columns — `contract_tool_customer_id`, `synced_at`, `hubspot_company_id`, `hubspot_contact_id` — unused this milestone. Adding them now is one column pair; adding them later is a migration plus a backfill.

### Two-Source Reconciliation (IMPORT)

**The riskiest work in this milestone.** Two populations with three incompatible identity schemes must become one registry: `proposals.inputs` keys clients on company name with optional SIREN; the HubSpot export keys on people and email; the future contract tool keys on the company as a legal entity. Matching happens **once**, at import, with a human resolving ambiguity — rather than being re-derived by fuzzy logic forever after.

> **Open dependency.** The HubSpot export (`hubspot-crm-exports-tous-les-contacts-2026-08-31.xlsx`, ~2.9 MB) is not yet readable — macOS blocks `~/Downloads` at the TCC level, not the Claude sandbox. Its column inventory determines how much of IMPORT-03/04 can be automatic versus human-resolved. **IMPORT-02's detailed design is pending that file**; the rest of the category is unaffected.

- [ ] **IMPORT-01**: Client data in existing proposals is extracted into companies and per-partner relationships, and each proposal is linked to the relationship it produced.
- [ ] **IMPORT-02**: The HubSpot export is imported into companies, contacts and relationships, with HubSpot's contact-owner mapped to a Leasétic user ("house relationships" for internal `Commercial` staff).
- [ ] **IMPORT-03**: Records matching on SIREN are merged automatically.
- [ ] **IMPORT-04**: Records matching only on `name_normalized` — no SIREN on one or both sides — are flagged for human review rather than silently merged.
- [ ] **IMPORT-05**: A human can resolve each flagged pair in the UI: merge into one company, or keep them separate permanently.
- [ ] **IMPORT-06**: The import runs in **dry-run mode**, producing a full report of what it would create, merge and flag, without writing anything.
- [ ] **IMPORT-07**: Re-running the import creates no duplicates — provenance IDs (`hubspot_company_id` / `hubspot_contact_id`) make it idempotent.

### Sales-Team Access (ROLE)

`users.partner_type` already carries `'Commercial'` — an internal salesperson, not a channel partner — but `users.role` (the thing that actually gates access) is `CHECK IN ('partner','admin')` and knows nothing about it. Decided **now**, while there are only two roles to migrate: adding a third later means auditing every `requireUser` / `requireAdmin` call site and every partner-scoped query.

- [x] **ROLE-01**: A `sales` role exists alongside `partner` and `admin`, with the CHECK constraint and every access gate updated together.
- [x] **ROLE-02**: Internal `Commercial` users hold client relationships exactly as partners do, so imported HubSpot contacts have an owner and the sales team gets the pipeline surfaces without a separate build.
- [x] **ROLE-03**: Existing partner and admin access is unchanged by the role addition — no partner gains visibility, no admin loses it, and the ADMIN-09 commission-invisibility envelope stays intact.

### Pipeline (PIPE)

Partner-advanced stages (Antoine's explicit choice on 2026-08-31; the risk that hand-maintained pipelines rot was raised and accepted). The mitigation is structural rather than procedural: late stages are marked **system-owned** from day one, so when the contract tool feeds status back, partners maintain only the stages they alone have information about.

- [ ] **PIPE-01**: A relationship carries a pipeline stage that its owner can advance.
- [ ] **PIPE-02**: Late stages (`signé`, `débloqué`) are marked system-owned and are **not** hand-editable — reserved for contract-tool feedback in a later milestone.
- [ ] **PIPE-03**: A proposal records an outcome (`won` / `lost` / `unanswered`) with a date and an optional reason, giving a real per-quote conversion rate.
- [ ] **PIPE-04**: A partner sees their pipeline grouped by stage.
- [ ] **PIPE-05**: Marking a deal **won** requires a SIREN on the company — the soft gate at handoff, never at proposal, so a partner quoting a prospect is never blocked on paperwork.

### Activity & Follow-Up (ACTV)

Answers "who do I chase this week" — and captures the two lead-qualification signals the wizard already collects and currently discards (`slb` sale-leaseback, `evalParc` parc evaluation).

- [ ] **ACTV-01**: A relationship has a single timeline mixing manual notes with system events.
- [ ] **ACTV-02**: System events — stage change, proposal sent — are recorded automatically, with actor and timestamp.
- [ ] **ACTV-03**: A user can add a dated note to a relationship.
- [ ] **ACTV-04**: A relationship carries a next-action date.
- [ ] **ACTV-05**: A user sees a list of relationships needing follow-up, driven by next-action date and staleness.

---

## Future Requirements (deferred beyond v1.6)

| Requirement | Target | Note |
|---|---|---|
| Contract-tool integration — win-event handoff | v1.7+ | The seams ship in v1.6 (CRM-08, PIPE-02, PIPE-05); the integration needs the in-house app's customer schema, which is unseen. |
| Contract-tool inbound status feedback | v1.7+ | Drives PIPE-02's system-owned stages. Retires the pipeline-rot risk. |
| HubSpot retirement | v1.7+ | Only after the registry and pipeline prove out in real use. Import (IMPORT-02) is not retirement. |
| Sales-team reporting & cross-book dashboards | v1.7+ | ROLE-01..03 ship the access model; reporting is a separate surface. |
| List/table architecture decision (cursor vs page-index) | folded into v1.6 | ReUI `DataGrid` is page-index; every list here is cursor-based. Decided at the point it blocks a CRM list, per the agreed "vertical slices" sequencing — not up front. |
| Playwright browser coverage | folded into v1.6 | 1213 Vitest tests were green while a duplicate radius scale shipped across five commits. Added when it becomes the thing blocking, not before. |
| Delete the 18 dead vendored ReUI blocks (816K, zero imports) | undecided | Antoine 2026-08-31: "Delete nothing yet." Recorded in `docs/design/reui-blocks-audit.md`; `npx shadcn@latest add @reui/<name>` reinstalls any of them. |
| Browser-verification backlog from Phase 28 | v1.6 opportunistic | wizard step 1, `/proposals`, coefficients history, `/parametres`, six `PartnersList`/`LcReferencesList` padding sites. |

## Out of Scope (explicit exclusions)

| Excluded | Reasoning |
|---|---|
| An `opportunities` entity | Deliberate YAGNI. Stage on the relationship answers *where is this client*; outcome on the proposal answers *did this quote convert*. Leasétic runs one live quote per client at a time. If parallel deals appear, `opportunities` slots between relationship and proposal without disturbing either. |
| Email sending, templates, sequences | Never used in HubSpot. Would require an email provider, deliverability, threading and compliance — realistically its own milestone, and the most common reason a HubSpot replacement stalls. |
| Marketing emails, lead-capture forms, attribution | Not used in HubSpot; each is a separate product surface. |
| Mutating `proposals.inputs` | The snapshot invariant is load-bearing for PDF reproduction and 10-year retention. Non-negotiable. |
| Sharing contacts across partners | Directly contradicts the channel-conflict protection that CRM-02 exists to provide. |
| Requiring SIREN at proposal time | Would block a partner quoting a prospect on paperwork they may not have. Gated at win instead (PIPE-05). |
| Fuzzy matching at query time | Matching happens once, at import, with human resolution. Re-deriving it forever is the master-data anti-pattern this model exists to avoid. |

---

## Traceability

Every v1.6 REQ-ID maps to exactly one phase. Coverage: 31/31 (100%).

| REQ-ID | Phase |
|---|---|
| INFRA-04 | Phase 29 — Migration Safety Net |
| INFRA-05 | Phase 29 — Migration Safety Net |
| INFRA-06 | Phase 29 — Migration Safety Net |
| CRM-01 | Phase 30 — Company & Contact Registry |
| CRM-02 | Phase 30 — Company & Contact Registry |
| CRM-03 | Phase 30 — Company & Contact Registry |
| CRM-04 | Phase 30 — Company & Contact Registry |
| CRM-05 | Phase 30 — Company & Contact Registry |
| CRM-06 | Phase 30 — Company & Contact Registry |
| CRM-07 | Phase 30 — Company & Contact Registry |
| CRM-08 | Phase 30 — Company & Contact Registry |
| IMPORT-01 | Phase 31 — Reconciliation Engine & Proposal Extraction |
| IMPORT-02 | Phase 32 — HubSpot Import (design partially blocked — see open dependency) |
| IMPORT-03 | Phase 31 — Reconciliation Engine & Proposal Extraction |
| IMPORT-04 | Phase 31 — Reconciliation Engine & Proposal Extraction |
| IMPORT-05 | Phase 31 — Reconciliation Engine & Proposal Extraction |
| IMPORT-06 | Phase 31 — Reconciliation Engine & Proposal Extraction |
| IMPORT-07 | Phase 32 — HubSpot Import (design partially blocked — see open dependency) |
| ROLE-01 | Phase 30 — Company & Contact Registry |
| ROLE-02 | Phase 30 — Company & Contact Registry |
| ROLE-03 | Phase 30 — Company & Contact Registry |
| PIPE-01 | Phase 33 — Pipeline |
| PIPE-02 | Phase 33 — Pipeline |
| PIPE-03 | Phase 33 — Pipeline |
| PIPE-04 | Phase 33 — Pipeline |
| PIPE-05 | Phase 33 — Pipeline |
| ACTV-01 | Phase 34 — Activity & Follow-Up |
| ACTV-02 | Phase 34 — Activity & Follow-Up |
| ACTV-03 | Phase 34 — Activity & Follow-Up |
| ACTV-04 | Phase 34 — Activity & Follow-Up |
| ACTV-05 | Phase 34 — Activity & Follow-Up |

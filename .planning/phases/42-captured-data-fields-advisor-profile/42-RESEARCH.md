# Phase 42: Captured Data — Fields & Advisor Profile - Research

**Researched:** 2026-09-08
**Domain:** Next.js/Drizzle/Better Auth data-capture extension (no new libraries; extends 5 existing modules + 1 new table)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### The advisor / partner reframe (supersedes the requirements' framing)

- **D-06:** **The advisor is a Leasetic-side person, not the creating user.** Operator
  framing, verbatim: the *partner* is the salesperson who owns the relationship with the end
  client and is the **primary** point of contact; the *advisor* is the person on the Leasetic
  side who works alongside the partner to deliver the proposal — a teammate and helper to the
  partner's commercial relationship, and the **secondary** contact. The client meets the
  partner first, the advisor second.

  This invalidates `PROF-03` as written ("the PDF's advisor name and email come from the
  authenticated creating user's account"). The authenticated creating user is the *partner's*
  commercial, so their identity feeds the **partner** block; the advisor block is a different
  person entirely and comes from D-07.

- **D-07:** **One Leasetic advisor for every proposal**, not one per partner and not chosen
  per proposal. Rejected alternatives: an FK assigning each partner a named Leasetic
  teammate (truer to the relationship, more schema); a per-proposal dropdown (exposes a list
  of Leasetic staff to every partner, and is a field to fill every time).

- **D-08:** The advisor identity (name, fonction, téléphone, email) lives in **its own
  admin-editable settings row with an admin screen**, alongside the existing admin surfaces.
  Explicitly **not** `global_params` — that table is snapshotted verbatim into every
  proposal's `params_snapshot`, which is financial data; contact details do not belong in the
  calc snapshot. Explicitly **not** environment variables — replacing the named person must
  not require a redeploy.

- **D-09:** The advisor is **read live at render time**, never snapshotted into `inputs`.
  A client opening any proposal reaches whoever is configured today, which is the entire
  point of a contact block. Accepted consequence, stated so Phase 44 is not surprised: the
  backfill will update the advisor on every historic document, and re-rendering an old
  proposal will not reproduce the bytes of the originally delivered PDF. `inputs` stays
  strictly the partner's own supplied data (DATA-01..04 untouched).

- **D-10:** **Phase 43 must restructure the contact card** so the partner's commercial is the
  headline and the Leasetic advisor sits beneath as the supporting contact. This is a
  deliberate deviation from `Quote-FR-A.dc.html:67-74`, which makes `advisorName` the 11pt/600
  headline with Fonction/Téléphone/Email beneath and demotes `Partenaire` / `Commercial` /
  `Téléphone` to plain rows. REQUIREMENTS calls those files "the authoritative pixel spec", so
  Phase 43 must be told this is intended rather than treat it as a spec violation. The
  operator chose restructuring **without** relabelling the two blocks.

### Client SIRET (FIELD-01)

- **D-01:** SIRET is **prefilled from the company registry and remains editable**. When the
  SIREN resolves, pull the siège SIRET from `recherche-entreprises` and prefill it; the
  partner can overwrite it, because a client's operating site is not always the siège.
  Requires extending `src/lib/registry/schema.ts` to parse `siege.siret` — the upstream API
  returns it, our parser drops it today (only `siege.adresse` / `code_postal` /
  `libelle_commune` are read). Rejected: hand-typed only (14 digits is the most error-prone
  field on the form); registry-locked read-only (a branch-office proposal would carry the
  wrong establishment, and a registry outage would hard-block finalization).

- **D-02:** **The SIRET's first 9 digits must equal the proposal's SIREN — hard block.** A
  cross-field Zod refine; a mismatch is a validation error that prevents finalization.
  Rationale: the realistic mistake is pasting another company's SIRET, and the PDF prints both
  values on adjacent rows where a contradiction is visible to the client. Rejected: warn-only,
  and shape-validation-only (FIELD-01's literal wording).

- **D-03:** When the registry cannot answer — API down, SIREN not found, or a result with no
  siège SIRET — **fall back silently to manual entry**. The 14 digits are typed by hand and
  D-02's prefix rule still applies. The registry is an accelerator, never a dependency: a
  third-party outage must not stop a partner finalizing. The operator was offered the variant
  with an explanatory inline notice and did not take it — **do not add one**.

- **D-04:** SIRET is enforced at **step 1, alongside `clientSiren`** — "Suivant" is blocked
  until it is filled. One enforcement point, encountered while the partner is already looking
  at the client card. Storage follows the `normalizeSiren` precedent: digits only, formatting
  stripped before persistence.

- **D-05:** **Gap the planner must close, not leave silent.** `finalizeWizard` re-parses
  `proposalInputSchema` server-side (`src/lib/api/proposals/finalize-wizard.ts:147`) and maps
  any `ZodError` to the bounded code `ValidationFailed` → a generic 500 toast. Once SIRET is
  required in that schema, a draft created before this phase that reaches finalization fails
  with an unhelpful generic error. The plan must handle this deliberately — a targeted message
  or a redirect back to step 1 — rather than inherit the generic path.

### Partner company telephone (FIELD-02)

- **D-11:** The partner company telephone is an **account field, session-hydrated into the
  draft** — not a wizard field. It is a fact about the firm, and retyping it per proposal
  invites drift between proposals from the same partner. It follows the established pattern at
  `app/(authed)/proposals/new/parametres/page.tsx:97-107`, where `companyName` → `partnerCo`
  and the session name → `partnerName` are resolved server-side and written into the draft's
  `inputs`, never typed and never read back from the form.

  **Amendment required (D-15).** `FIELD-02` reads "A partner **filling the proposal wizard**
  must supply the partner company's telephone before the proposal can be finalized." Under
  D-11 there is no wizard field, and under D-13 it does not block finalization either.

- **D-12:** **Two phones, two fields.** The design's contact card prints both an advisor
  téléphone and a partner téléphone, and they are genuinely different numbers: the partner
  company's line, and (post-D-06) the Leasetic advisor's line. Rejected: one field printed
  once (would force Phase 43 to drop a row from the authoritative spec) and one field printed
  twice (a card showing the same number on two labelled lines reads as a bug to the client).

- **D-13:** The company telephone is **admin-set, beside `companyName`**, on the admin
  "create/edit partner" form (`src/lib/admin/schemas.ts`) — not partner-editable. It is a fact
  about the firm, so it belongs where the firm is defined. **It never blocks finalization**:
  the column ships nullable, every existing partner account has none, and a partner must never
  be hard-blocked behind a fix only an admin can perform. An absent company phone renders as an
  em dash in Phase 43 under DOC-11.

### Fonction and the finalization gate (PROF-01, PROF-02)

- **D-14:** **There is no new `fonction` column.** Operator: "fonction is defined by their
  admin set type Agent/Commercial, etc." `users.partnerType` already carries it — `NOT NULL
  DEFAULT 'Partenaire'`, CHECK-constrained to `('Agent','Commercial','Partenaire')`
  (`src/db/schema.ts:69,75`), and registered as a Better Auth additionalField with
  **`input: false`** (`src/lib/auth/index.ts:172`), i.e. admin-writable and client-immutable by
  construction. Three consequences:
  1. No migration for fonction, and no naming collision with `users.role` (the auth role).
  2. `PROF-01` narrows: the partner sets their **téléphone** only; fonction is displayed
     read-only on `/parametres`, derived from `partnerType`.
  3. `PROF-02`'s gate narrows to a **single condition** — a missing téléphone. `partnerType`
     can never be null, so fonction can never be the missing thing.

  The **only new user columns in this phase** are the partner's own `telephone` and the
  company telephone (D-13).

- **D-16:** The three `partnerType` values have **no i18n keys today** — they are stored and
  displayed as raw strings, so an English proposal would print "Partenaire" under an English
  label. Add FR/EN label pairs and render the one matching the proposal's committed `language`
  (Partenaire → Partner, Commercial → Sales Representative, Agent → Agent). **Scoped to the
  PDF only** — the operator explicitly declined extending the translation to the admin and
  partner surfaces that also show the raw value, so that inconsistency stays and is noted
  under Deferred.

- **D-17:** The gate fires **at finalization only** — PROF-02's literal placement. Not at
  wizard entry (which is where the `companyName` check lives today), and no entry-check +
  finalize-backstop pair. One server-side enforcement point inside the finalize path.

- **D-18:** The block surfaces as a **dedicated bounded safeCode plus a dialog**. The route
  returns a specific code identifying the missing field; the client renders a dialog naming it
  with a link to `/parametres`. This stays inside the existing ADMIN-09 contract — bounded
  codes only, no payload echoed (`app/api/proposals/finalize/route.ts:60-63,130-137`) — while
  still satisfying PROF-02's "names exactly what is missing and links to where to set it". A
  dialog rather than the generic 5-second toast every other finalize failure uses, because the
  partner must act on the instruction elsewhere. `FinalizeButton` currently collapses every
  non-OK response into one generic toast and must learn this one case.

- **D-19:** **Admins fill in the missing values before anyone is blocked.** `telephone` is
  added to the admin partner form (alongside the company telephone from D-13) and an operator
  populates existing accounts, so no partner is interrupted mid-proposal by a gate they have
  never seen. The partner can still edit their own téléphone on `/parametres` (PROF-01).
  Rejected: letting the dialog be the rollout (self-service but unannounced), and adding a
  prompt on `/parametres` as well.

### Claude's Discretion

- Column naming and typing for the two new `telephone` columns, and whether they are
  registered as Better Auth additionalFields. **Register them deliberately**: `companyName`
  was *not* registered and had to be read through a `displayName → name → email` fallback
  chain (`app/(authed)/proposals/new/parametres/page.tsx:97-107`), and an unapplied
  `partner_type` additionalField migration previously broke every authed page with
  "APIError: Failed to get session". Whatever is registered must have its migration applied.
- Phone validation shape. `optionalPhoneSchema` in `src/lib/calc/schema.ts` already accepts a
  formatted string and refines on 10 stripped digits — reuse it rather than inventing a rule.
- Display formatting of the SIRET (grouping) versus its stored digits-only form.
- Whether the admin advisor screen is a new route or a section on an existing admin page.

### Upstream amendments this discussion forces

Following the Phase 41 D-02 precedent, the executing plan reconciles `.planning/ROADMAP.md`
and `.planning/REQUIREMENTS.md` in place:

- **D-15:** `FIELD-02` — drop "filling the proposal wizard must supply … before the proposal
  can be finalized". The company telephone is admin-set on the account (D-13) and never
  blocks finalization. Restate as: the partner company's telephone is held on the partner
  account and carried onto every proposal.
- **D-20:** `PROF-01` — drop "can set their fonction". Fonction is `partnerType`,
  admin-assigned and client-immutable (D-14). Restate as: a partner can set their téléphone
  on their own account and sees their fonction, name and email there.
- **D-21:** `PROF-02` — narrow "missing fonction or telephone" to "missing telephone" (D-14),
  and drop "fixed once on the account, never re-prompted per proposal" as a behaviour to
  build: it is automatic once the check reads the account.
- **D-22:** `PROF-03` — the advisor is not the creating user (D-06). Split it: the creating
  user's name and email source the **partner** block; a separate global setting sources the
  **advisor** block (D-07/D-08/D-09).
- **D-23:** ROADMAP Phase 42 success criteria 1–4 restate the same four claims and need the
  same four edits. Criterion 1 ("must supply … the partner company's telephone before the
  proposal can be finalized"), criterion 2 ("view and set their own fonction"), criterion 3
  ("missing fonction or téléphone"), criterion 4 ("advisor name and email … from the
  authenticated creating user").
- **D-24:** Phase 43's requirement set gains D-10's card restructure and D-16's fonction
  translation. `DOC-03` currently describes the design's original order.

### Deferred Ideas (OUT OF SCOPE)

- **Translating `partnerType` outside the PDF.** D-16 is scoped to the document. The admin and
  partner surfaces still render the raw stored strings, so the app and the English PDF will
  disagree. Worth a later pass.
- **Per-partner Leasetic advisors.** D-07 chose one global contact. Assigning each partner a
  named teammate (an FK to a `sales`/`admin` user) is the truer model if the advisor
  relationship ever becomes personal rather than institutional.
- **Partner-editable company telephone.** D-13 makes it admin-only. If partners start needing
  to correct it themselves, the "admin seeds, partner corrects" variant is the ready answer.
- **Byte-reproducibility of historic proposals.** D-09's live advisor read means a re-rendered
  old proposal no longer matches the bytes originally delivered. Phase 44 should decide
  whether that needs recording anywhere.

**Reviewed Todos (not folded):** `wr-07-db-guard-skip-rule.md` — "Harden the DB guard's
NODE_ENV=test SKIP rule." Matched at score 0.2 on the keyword "phase" alone. Unrelated to
captured data or profile fields; belongs with the DB-guard work, not here.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FIELD-01 | Partner must supply the client's SIRET (14 digits, registry-prefilled per D-01) before finalization | R1 confirms `siege.siret` field path/nullability; Pattern 3 gives the cross-field refine shape (D-02); Pattern 4 + Pitfall 5 give the D-05 legacy-draft handling; Code Examples give the exact `registry/schema.ts` parser extension |
| FIELD-02 | Partner company telephone held on the partner account, carried onto every proposal (restated per D-15 — no longer a wizard field) | R2 + R4 give the Better Auth registration shape and the D-13 admin-write-path fix (Pitfall 4); Pattern 1 gives the D-11 session-hydration wiring |
| PROF-01 | Partner can set their own téléphone on `/parametres`; sees fonction (derived from `partnerType`), name and email there (restated per D-20) | R2 gives the `input: true` additionalField shape for the partner-writable `telephone` column; Pattern 2 gives the registration + migration-ordering discipline |
| PROF-02 | Partner missing téléphone is stopped at finalization only, with a message naming the field and a link to `/parametres` (restated per D-21) | R3 gives the full bounded-safeCode + dialog mechanics, including the critical `FinalizeButton` body-parsing gap (Pitfall 3); Open Question 3 flags the `finalizeWizard` argument-threading decision |
| PROF-03 | Advisor name/email/fonction/téléphone sourced from a new admin-editable setting, not the creating user's account (restated per D-22 — advisor vs. partner split per D-06/D-07/D-08/D-09) | Architectural Responsibility Map + Don't Hand-Roll give the `leasetic_advisor` singleton-table shape (Open Question 2); this phase delivers the admin CRUD surface and persistence only — the live PDF read is explicitly Phase 43's scope per D-09 |
</phase_requirements>

## Summary

This phase adds no new dependency and no new architectural pattern — it is five surgical
extensions to code that already implements the exact shape needed (`proposalInputSchema`,
`user.additionalFields`, `SAFE_ERROR_CODES`, the registry parser, the admin partner form) plus
one new singleton settings table for the Leasetic advisor identity. Every one of the three
primary research questions resolved to a concrete, evidence-backed answer rather than a
recommendation among alternatives, because CONTEXT.md's D-01..D-24 already fixed the product
shape — this document's job was verifying the mechanics hold up.

**R1 (SIRET availability):** confirmed via the project's own fixtures, a live call to the
production registry endpoint, and the endpoint's published OpenAPI schema: the field is
`results[].siege.siret` (a plain string), it is **not** in any `required` array at either the
`result` or `siege` schema level, and `siege` itself can be entirely absent. Live sampling
(4 SIRENs spanning active, closed-établissement, and cessée-entreprise cases) found `siege.siret`
populated in every case where `siege` was non-null — including a cessée company — which means
D-03's silent-fallback path is real but narrower than "every failure state"; it fires specifically
when `siege` is null/absent (foreign entities, some legal forms with no separately-registered
établissement), when the SIREN doesn't resolve at all, or on network/timeout/malformed-payload
failure. `matching_etablissements` exists in the schema but is independently documented (data.gouv
forum) as reliably empty — not a viable secondary source.

**R2 (Better Auth additionalFields):** the registration shape is a direct copy of the existing
`partnerType` entry (`input: false`, `defaultValue`, nullable text column) for the two admin-only
fields, and a partner-writable variant (`input: true`, no default) for the partner's own
telephone. The safe ordering is unambiguous from this repo's own incident history and CI gate
structure: **migration must be applied to prod BEFORE the `additionalFields` registration is
deployed**, never the reverse — this is the exact inversion of the `partner_type` incident
(`APIError: Failed to get session` on every authed page).

**R3 (finalize bounded-code extension):** `FinalizeButton.tsx` today does not even parse the
response body on failure — `!res.ok` alone throws a generic error, and `res.json()` is only
called on the success branch. Adding D-18's dialog therefore requires two changes, not one:
teaching the route to emit a new safeCode, AND teaching the client to actually read `body.error`
on the failure path before deciding which UI to show. `finalizeWizard`'s legacy-draft gap (D-05)
is a `z.ZodError` today, indistinguishable from any other future validation failure once
`ValidationFailed` is the catch-all — it needs its own pre-check (draft predates SIRET) rather
than post-hoc ZodError-issue inspection, to stay robust against future schema changes.

**Primary recommendation:** touch exactly the eight files CONTEXT.md's canonical_refs names,
add one migration (ordinal `0011`), add one new table (`leasetic_advisor`, single-row, plain
UPDATE not append-only), and do not introduce any new library — `zod`, `drizzle-orm`,
`better-auth`, `react-hook-form` already cover every mechanical need this phase has.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Client SIRET capture + registry prefill | Frontend Server (SSR form) / Client | API (server action / route calling `lookupCompanyBySiren`) | Wizard is server-rendered with a client `'use client'` form island; the registry call is `server-only`-adjacent (external fetch, must not run in the browser bundle) but is NOT a DB write — it's ephemeral prefill, unlike the CRM's `registry-sync.ts` which owns `companies.*` writes |
| Cross-field SIRET/SIREN validation | API / Backend (Zod schema, shared) | Client (RHF resolver, same schema instance) | `proposalInputSchema` is the single-source-of-truth per D-29; both tiers import the same schema object |
| Partner's own telephone (PROF-01) | API / Backend (Better Auth `users` column) | Frontend Server (`/parametres` reads session) | Account-level fact, not a proposal input — owned by the auth/DB tier, surfaced via session |
| Company telephone (D-13) | API / Backend (`users` column, admin-write only) | Frontend Server (session-hydration into draft, D-11 pattern) | Admin-only write path (`src/lib/admin/actions.ts`); read path mirrors `companyName`'s existing session-hydration into `proposals.inputs` |
| Advisor identity (D-08/D-09) | Database / Storage (new singleton table) | API / Backend (admin CRUD action) + Frontend Server (Phase 43's live PDF read) | Explicitly not `global_params` (financial snapshot tier) and not env vars (would require redeploy) — a distinct, small, admin-editable settings row read live |
| Finalization profile-completeness gate (D-17/D-18) | API / Backend (`finalizeWizard` + bounded safeCode) | Client (`FinalizeButton` dialog) | Server is the single enforcement point per D-17; client only renders the dialog `FinalizeButton` currently cannot distinguish |
| Legacy-draft SIRET gap (D-05) | API / Backend (`finalizeWizard` pre-check) | Client (toast + redirect to step 1) | Same tier split as above — a different bounded code, different client action (redirect, not dialog) |

## Standard Stack

### Core

No new libraries. Every mechanism this phase needs already ships in `package.json`:

| Library | Version (pinned, per STATE.md) | Purpose | Why Standard (for this phase) |
|---------|---------|---------|--------------|
| `zod` | 4.4.3 | Cross-field refine for D-02, nullable-column schema loosening for D-13 | Already the single-source validator (`proposalInputSchema`, `createPartnerFormSchema`) |
| `better-auth` | 1.6.9 | `additionalFields` registration for the two new telephone columns | Already wraps `users` via `drizzleAdapter`; `partnerType` is the exact precedent (D-14) |
| `drizzle-orm` / `drizzle-kit` | 0.45.2 / 0.31.10 | New migration (`0011_*`), new `leasetic_advisor` table, `users` column additions | Existing ORM; `db:generate` → hand-review → commit is the only sanctioned path |
| `react-hook-form` + `@hookform/resolvers/zod` | 7.75.0 / 5.2.2 | New `SiretInput` Controller binding, admin advisor-page form, `/parametres` téléphone field | Existing form stack; `mode: 'onBlur'` already the project convention |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `sonner` (toast) | existing pin | D-05's legacy-draft toast, advisor-page save toast | Already the app-wide toast channel |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| A `leasetic_advisor` table (single row) | Reuse `global_params` with a new column set | Rejected by D-08 explicitly — `global_params` is snapshotted verbatim into `proposals.params_snapshot`, which is financial data; folding contact details in would leak a non-financial fact into the immutable financial snapshot and force a schema-version bump for a contact-detail edit |
| A `leasetic_advisor` table | Env vars | Rejected by D-08 — replacing the named person would require a redeploy, which the operator explicitly ruled out |
| `matching_etablissements[0].siret` as a SIRET fallback source | — | Not viable — independently documented as reliably empty in production (data.gouv community forum); do not build a fallback path around it |

**Installation:** none — no `npm install` needed for this phase.

**Version verification:** all four core libraries confirmed via `package.json` pins already
present in the repo (`zod@4.4.3`, `better-auth@1.6.9`, `drizzle-orm@0.45.2`,
`react-hook-form@7.75.0`, `@hookform/resolvers@5.2.2`) — no registry lookup needed since nothing
new is installed.

## Package Legitimacy Audit

**Not applicable.** This phase installs zero new npm packages — every capability (cross-field
Zod refine, Better Auth `additionalFields`, a new Drizzle table + migration, a new RHF-bound
input component modeled on `SirenInput`/`PhoneInput`) is achieved with libraries already in
`package.json`. The Package Legitimacy Gate protocol is skipped per its own trigger condition
("every phase that installs external packages") — this phase does not.

## Architecture Patterns

### System Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Wizard Step 1 (client island, ParametresFormCard.tsx)                  │
│                                                                           │
│  clientSiren [existing] ──onBlur──▶ (new) server action/route           │
│       │                              calls lookupCompanyBySiren(siren)  │
│       │                                     │                            │
│       ▼                              (registry lookup, external fetch,  │
│  clientSiret [NEW field] ◀───────────  never blocks — D-03 silent       │
│       │  (editable always;             fallback on any failure)         │
│       │   prefilled if resolved)                                        │
│       ▼                                                                  │
│  RHF zodResolver(proposalInputSchema) ── cross-field refine (D-02):     │
│       clientSiret.slice(0,9) === normalizeSiren(clientSiren)            │
└──────────────────────────────┬────────────────────────────────────────┘
                                │ saveAsDraft / saveAndAdvance (existing)
                                ▼
                    proposals.inputs jsonb (draft, mutable until finalize)
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  POST /api/proposals/finalize → finalizeWizard()                        │
│                                                                           │
│  1. getDraftById → proposalInputSchema.parse(draft.inputs)              │
│     ├─ ZodError, draft predates SIRET field (D-05) ─▶ 'LegacyDraft…'    │
│     └─ ZodError, any other cause ─────────────────▶ 'ValidationFailed' │
│  2. (NEW) read users row for args.userId → telephone present?           │
│     └─ null ─▶ throw 'MissingPartnerTelephone' (D-17/D-18)             │
│  3. existing 6 steps unchanged (params, compute, render, upload, ...)   │
└──────────────────────────────┬────────────────────────────────────────┘
                                │ bounded safeCode (SAFE_ERROR_CODES set)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  FinalizeButton.tsx (client) — currently ignores body on !res.ok        │
│                                                                           │
│  (NEW) await res.json() even on failure, branch on body.error:          │
│    'MissingPartnerTelephone' ─▶ open <Dialog> (D-18, links /parametres) │
│    'LegacyDraftIncomplete'   ─▶ toast + router.push(step 1)             │
│    anything else             ─▶ existing generic toast (unchanged)      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  Admin: /{adminSegment}/partners/new (existing form, extended)          │
│    Section "INFORMATIONS SOCIÉTÉ": companyName, siret [existing],       │
│      phone [EXISTING FIELD, relabeled "Téléphone (société)", NEWLY      │
│      wired to a real users.company_telephone column — D-13]            │
│    Section "INFORMATIONS PERSONNELLES": (NEW) telephone field (D-19)    │
│         │                                                                │
│         ▼ adminCreateInvitation() writes UPDATE users SET ...           │
│  users.telephone / users.company_telephone (NEW nullable columns)       │
└──────────────────────────────┬────────────────────────────────────────┘
                                │ session.user.telephone / .companyTelephone
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  /parametres (partner self-service)                                     │
│    identityForm gains: telephone [editable, D-01 PROF-01]               │
│                        fonction  [read-only, derived from partnerType]  │
│    authClient.updateUser({ name, telephone }) — telephone now an        │
│      input:true additionalField, unlike companyTelephone (input:false)  │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  Admin: /{adminSegment}/advisor (NEW route, D-08)                       │
│    4 required fields: name, fonction, telephone, email                  │
│         │                                                                │
│         ▼ (NEW) adminUpdateAdvisor() — plain UPDATE, no history         │
│  leasetic_advisor (NEW table, single row, id fixed/known)                │
└──────────────────────────────┬────────────────────────────────────────┘
                                │ read LIVE at render (D-09 — never snapshotted)
                                ▼
                    Phase 43's PDF document component (out of this phase's scope)
```

### Recommended Project Structure

No new top-level directories. New files land beside their siblings:

```
src/
├── components/proposal/
│   └── SiretInput.tsx          # NEW — mirrors SirenInput.tsx / PhoneInput.tsx verbatim
├── lib/
│   ├── calc/schema.ts          # MODIFIED — clientSiret field + cross-field refine
│   ├── auth/index.ts           # MODIFIED — 2 new additionalFields entries
│   ├── admin/schemas.ts        # MODIFIED — companyTelephone optional, +telephone field
│   ├── admin/actions.ts        # MODIFIED — write telephone/companyTelephone to users
│   ├── db/queries/
│   │   └── advisor.ts          # NEW — getAdvisor() / upsertAdvisor()
│   ├── registry/schema.ts      # MODIFIED — parse siege.siret
│   └── api/proposals/
│       ├── finalize-wizard.ts  # MODIFIED — D-05 pre-check + D-17 telephone gate
│       └── finalize-helpers.ts # unchanged (ADMIN-09 grep-isolation barrier)
├── db/schema.ts                 # MODIFIED — users.telephone, users.company_telephone,
│                                 #            new leasetic_advisor table
app/
├── (authed)/
│   ├── parametres/ParametresForm.tsx          # MODIFIED — telephone + fonction rows
│   └── proposals/new/
│       ├── parametres/ParametresFormCard.tsx  # MODIFIED — SIRET field + prefill wiring
│       ├── parametres/page.tsx                 # MODIFIED — hydrate companyTelephone (D-11)
│       └── verification/FinalizeButton.tsx     # MODIFIED — read body.error, render dialog
├── (admin)/[adminSegment]/
│   ├── partners/new/CreatePartnerForm.tsx      # MODIFIED — relabel + new field
│   └── advisor/                                # NEW route
│       ├── page.tsx
│       └── AdvisorForm.tsx
drizzle/
└── 0011_phase42_captured_data.sql              # NEW — next ordinal per _journal.json
```

### Pattern 1: Session-hydration into draft inputs (D-11 extension)

**What:** Server-resolved account facts are written into `draft.inputs` at mint/hydrate time,
never rendered as an editable wizard field, never read back from client state.
**When to use:** Any field that is a fact about the partner or their company rather than a
fact about this specific proposal — exactly D-11's `companyTelephone`.
**Example (existing precedent this phase extends):**
```typescript
// Source: app/(authed)/proposals/new/parametres/page.tsx:91-107 (existing code, read during research)
const u = session.user as {
  email: string;
  displayName?: string | null;
  name?: string | null;
  companyName?: string | null;
  // ADD: companyTelephone?: string | null;
};
const nameFallback = u.displayName?.trim() || u.name?.trim() || u.email;
const partnerName = nameFallback;
const partnerCo = u.companyName?.trim() || nameFallback;
// ADD: const companyTel = u.companyTelephone?.trim() || undefined;
```
The prefill object further down (`const prefill: Partial<ProposalInput> = { ... }`) is where
`companyTelephone`/`partnerTel`-equivalent gets added alongside `partnerName`/`partnerCo` — same
"session-derived attribution always wins" comment block applies (D-25's overlay logic already
demonstrates the pattern of overwriting a stale draft value with the current session value).

### Pattern 2: Better Auth `additionalFields` registration (R2, D-14 precedent)

**What:** Any `users` column that must be readable off `session.user` needs an explicit entry in
`user.additionalFields` — a column existing in `src/db/schema.ts` alone is invisible to Better
Auth's session serialization (the `companyName` incident).
**When to use:** Both new telephone columns.
**Example:**
```typescript
// Source: src/lib/auth/index.ts:160-173 (existing code — the exact pattern to copy)
additionalFields: {
  // ...existing entries unchanged...
  partnerType: { type: 'string', required: false, defaultValue: 'Partenaire', input: false },

  // NEW — D-19: admin-only write, company-level fact, nullable (D-13 — never blocks finalize)
  companyTelephone: { type: 'string', required: false, input: false },

  // NEW — D-19/PROF-01: partner-writable via authClient.updateUser({ telephone })
  telephone: { type: 'string', required: false, input: true },
},
```
**Critical ordering constraint (verified against this repo's incident history, not assumed):**
the `partner_type` additionalField migration was committed and the code deployed reading it
*before* the migration had been applied to prod via the `MIGRATE PROD` GitHub Action, and Better
Auth's Drizzle adapter issues a `SELECT` naming every registered `additionalField` column
regardless of whether the DB actually has it — so the deploy sequence for this phase MUST be:
**(1)** merge PR containing `drizzle/0011_*.sql` with the new columns, **(2)** run `MIGRATE PROD`
via the GitHub Action and confirm success in the Actions log, **(3)** only then deploy (merge)
the PR that adds the two entries to `src/lib/auth/index.ts`'s `additionalFields` block. If both
land in the same PR/deploy, there is a window (between Vercel's deploy completing and the
operator manually running `MIGRATE PROD`) where every authed page 500s with "APIError: Failed to
get session" — exactly the documented incident. **Recommendation: split this into two
sequenced plans/waves — schema+migration first (and manually verify `MIGRATE PROD` succeeded)
before the `additionalFields` registration PR is even opened**, not just two commits in one PR.

### Pattern 3: Cross-field Zod refine surfaced on a specific field (D-02, R6)

**What:** `proposalInputSchema` is a flat `z.object`; a `.refine()` on the whole object by
default attaches its error to the schema root (`path: []`), which RHF's `zodResolver` cannot
bind to a specific `<FieldError>`. The existing `requiredSirenSchema` precedent does NOT need
this because it validates one field in isolation — D-02 needs two fields compared, which is a
genuinely different shape.
**When to use:** D-02's SIRET/SIREN prefix match.
**Example:**
```typescript
// New pattern for this phase — not in the codebase yet, modeled on Zod's documented
// `.superRefine` + explicit `path` API (verified against zod@4 docs behavior: `.refine()`
// on `z.object` accepts a `path` option in its second argument to redirect the issue).
export const proposalInputSchema = z
  .object({
    // ...existing 15 fields, clientSiret added as its own field (see below)...
    clientSiret: requiredSiretSchema, // shape-only: 14 digits, digits-only stored (D-04)
  })
  .refine(
    (data) => {
      const siren = normalizeSiren(data.clientSiren.slice(0, 9)); // or compare raw digit prefix
      return data.clientSiret.slice(0, 9) === data.clientSiren;
    },
    {
      message: 'error.field.siret.mismatch', // UI-SPEC's new key, already drafted in 42-UI-SPEC.md
      path: ['clientSiret'], // redirects the ZodError to the SIRET field, not the object root
    },
  );
```
**Server-side re-parse compatibility:** `.refine()` chained after `.object()` still produces a
`ZodEffects` wrapper that supports both `.parse()` (used by `finalizeWizard`) and RHF's
`zodResolver` identically — this is the same shape `requiredSirenSchema`'s `.transform().refine()`
chain already proves works across both call sites (client resolver + server `.parse()`), so no
new integration risk here. Field-level `error.field.siret.invalid` (shape) and object-level
`error.field.siret.mismatch` (cross-field) are two distinct Zod issues that can both fire —
order the object-level refine to run only when the shape check already passed (Zod runs
`.refine()` after all field-level parsing succeeds by default, so this is automatic, not
something to hand-code).

### Pattern 4: Bounded safeCode extension without weakening ADMIN-09 (D-18, R3)

**What:** `SAFE_ERROR_CODES` is a `Set` gate; anything thrown by `finalizeWizard` that is not in
the set collapses to `finalize_failed`. Adding a code is additive and safe as long as the new
code's *value* carries no payload — it already doesn't (it's a bare string constant), so ADMIN-09
is unaffected by construction. The risk is entirely on the client side.
**Example:**
```typescript
// app/api/proposals/finalize/route.ts — MODIFIED
const SAFE_ERROR_CODES = new Set([
  'DraftNotFound',
  'NoGlobalParams',
  'ValidationFailed',
  'FinalizeFailed',
  'MissingPartnerTelephone', // NEW — D-17/D-18
  'LegacyDraftIncomplete',    // NEW — D-05 (UI-SPEC's suggested name)
]);
```
```typescript
// src/lib/api/proposals/finalize-wizard.ts — MODIFIED, inside finalizeWizard()
// D-05 pre-check MUST run before the generic proposalInputSchema.parse() catch-all,
// because a legacy draft's ZodError would otherwise be caught by the existing
// `if (err instanceof z.ZodError) throw new Error('ValidationFailed')` branch and
// be indistinguishable from any other future validation failure.
if (!('clientSiret' in draft.inputs)) {
  throw new Error('LegacyDraftIncomplete');
}
let parsed: ProposalInput;
try {
  parsed = proposalInputSchema.parse(draft.inputs);
} catch (err) {
  if (err instanceof z.ZodError) throw new Error('ValidationFailed');
  throw err;
}

// D-17 gate — after schema validation, before compute/render (fail fast, no wasted PDF render).
const authorRow = await getUserTelephone(args.userId); // new query helper
if (!authorRow?.telephone) {
  throw new Error('MissingPartnerTelephone');
}
```
```typescript
// FinalizeButton.tsx — MODIFIED. Today this NEVER reads the body on failure; must start.
if (!res.ok) {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  if (body?.error === 'MissingPartnerTelephone') {
    setDialogOpen(true); // D-18 dialog, not a toast
    setIsSubmitting(false);
    return;
  }
  if (body?.error === 'LegacyDraftIncomplete') {
    toast.error(t('wizard.finalize.toast.legacyMissingSiret', lang));
    setIsSubmitting(false);
    router.push(`/proposals/new/parametres?draft_id=${draftId}`);
    return;
  }
  throw new Error(`finalize_failed_${res.status}`); // existing generic path, unchanged
}
```
**Test-suite compatibility:** `tests/admin-09-grep-contracts.test.ts` asserts absence of the
literal substring `commission`/`_pct` in rendered HTML — a new bounded code string containing
neither substring is inert to that gate. `src/lib/pdf/no-commission.test.ts` scopes to PDF
render output, untouched by this change. Both stay green by construction, not by re-verification
needed at plan time — but the plan should still run the suite once after the change per this
project's standard TDD/verify discipline.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SIRET input masking/grouping | A bespoke onChange regex from scratch | Copy `SirenInput.tsx`'s `formatSiren` shape (strip non-digits, group every N, `maxLength`) into a new `SiretInput.tsx` | The 3-3-3-5 grouping and digit-stripping logic is already solved twice (Siren, Phone) in this exact style; a third hand-rolled variant risks drifting from the `normalizeSiren`-style digits-only storage precedent D-04 explicitly asks to follow |
| Phone digit validation | A new regex per field | Reuse `optionalPhoneSchema` (`src/lib/calc/schema.ts`) for both new telephone Zod schemas, per CONTEXT.md's own Claude's Discretion note | Explicitly flagged by the operator as the existing rule to reuse, not reinvent |
| SIRET/SIREN cross-check | Manual string compare scattered at each call site | One `.refine()` on `proposalInputSchema`, single source, both client + server | Same single-source discipline (D-29) the rest of the schema already follows — a duplicated check at the form layer only would leave the server-side re-parse unguarded |
| Admin-only field enforcement | A manual "is this field editable" check sprinkled through form JSX | Better Auth's `input: false` on the additionalField definition | Structural: `input: false` makes `/api/auth/update-user` reject a client-supplied write at the framework level — the same mechanism already protects `partnerType` and `role` from self-elevation |
| Advisor settings row locking (only one row should ever exist) | Application-level "check if a row exists before insert" logic scattered across an admin action | A migration-seeded single row with a known/fixed primary key, and an `upsertAdvisor()` helper that always targets that key with `ON CONFLICT DO UPDATE` (or a plain `UPDATE ... WHERE id = <fixed>`, since the row is guaranteed to exist post-migration) | Avoids a race where two concurrent admin saves could each INSERT a new "singleton" row; a fixed-id UPDATE is race-safe without needing a lock or a uniqueness constraint |

**Key insight:** every mechanism this phase needs already has a working precedent somewhere in
this exact codebase, at the exact granularity needed (component, schema, additionalField, bounded
code). The work is disciplined copying and wiring, not invention — which is also why the
confidence rating on this research is HIGH rather than MEDIUM: nothing here depends on external
library behavior that could not be directly verified against this repo's own git history and
code.

## Common Pitfalls

### Pitfall 1: Registering the additionalField before the migration lands on prod

**What goes wrong:** every authed page 500s with `APIError: Failed to get session`.
**Why it happens:** Better Auth's Drizzle adapter builds a `SELECT` that names every column in
`additionalFields`, whether or not the DB has it yet. This already happened once in this exact
repo (`partner_type`).
**How to avoid:** sequence as two distinct deploys — migration+`MIGRATE PROD` action confirmed
green in the Actions log, THEN the code PR that adds the `additionalFields` entries. Do not
combine them in one PR/merge if the plan's execution model deploys on every merge to main.
**Warning signs:** any 500 on `/`, `/parametres`, or any `(authed)` route immediately after a
deploy that touched `src/lib/auth/index.ts`.

### Pitfall 2: Treating D-03's "silent fallback" as "SIRET is basically never prefilled"

**What goes wrong:** over-engineering a heavier fallback UX (spinner states, retry logic,
inline "couldn't reach registry" messaging) that D-03 explicitly rejected, on the mistaken
assumption that the registry rarely returns a SIRET.
**Why it happens:** the phase's own project fixture (`search-response-ceased-nulls.json`) omits
`siege.siret` for a cessée company, which looks like evidence that ceased companies never carry
one.
**How to avoid:** this research's live sampling (§ Summary, R1) shows the fixture is a
hand-trimmed mock — reduced to only the 3 fields the current parser reads — not a raw captured
payload; the live endpoint returned `siege.siret` even for a cessée company. Do not use that
fixture as evidence of upstream absence; if a new fixture is added for this phase's tests, either
regenerate it from a real (or realistically complete) response, or explicitly comment that it is
a deliberately-reduced trim, matching the existing fixture's own undocumented convention.
**Warning signs:** a plan that adds a loading spinner, a "registry unavailable" banner, or retry
button to the SIRET field — all three are explicitly rejected by D-01/D-03.

### Pitfall 3: `FinalizeButton`'s silent `!res.ok` branch swallowing the new codes

**What goes wrong:** D-18 ships a new safeCode from the route, but the dialog never appears
because the existing client code throws before ever reading the response body.
**Why it happens:** `FinalizeButton.tsx`'s current failure branch is `if (!res.ok) { throw new
Error(...) }` — it never calls `res.json()` on the failure path at all (only on success). This is
easy to miss because the route-side change (adding the code to `SAFE_ERROR_CODES`) looks
complete on its own.
**How to avoid:** the client-side change is not optional wiring, it's the majority of D-18's
actual work. See Pattern 4's example above.
**Warning signs:** manual test shows a generic toast instead of the dialog, even though the
network tab shows `{ "error": "MissingPartnerTelephone" }` in the response body.

### Pitfall 4: Loosening `phone` to optional in `admin/schemas.ts` without also fixing the write path

**What goes wrong:** the admin partner-creation form silently "works" (submits, shows success)
but the company telephone still never lands in a queryable column — because relabeling the field
and loosening its `.min(1)` constraint doesn't, on its own, wire it to a real UPDATE.
**Why it happens:** `phone` is already threaded through `adminCreateInvitation` today —
`buildProfilePayload()` picks it up and writes it into `audit_log.payload.profile`, which reads
as "it's persisted somewhere" at a glance. It is not read back anywhere (verified: only
`buildProfilePayload`'s call site touches it; no query helper selects `audit_log.payload.profile`
for display).
**How to avoid:** the plan must add an explicit `UPDATE users SET company_telephone = ...`
(alongside the existing `language`/`partnerType` UPDATE in `adminCreateInvitation`), not just a
schema/copy change. UI-SPEC's own § Interaction & State Notes already flags this explicitly.
**Warning signs:** the field renders correctly, the form submits successfully, but
`session.user.companyTelephone` (or a direct DB SELECT) is null after creating a partner with a
telephone filled in.

### Pitfall 5: `finalizeWizard`'s D-05 pre-check running AFTER the generic ZodError catch

**What goes wrong:** a legacy pre-Phase-42 draft reaching finalize throws `ValidationFailed` (the
existing generic code) instead of the new `LegacyDraftIncomplete` code, because the ZodError from
the missing `clientSiret` field is caught by the existing broad `catch (err) { if (err instanceof
z.ZodError) throw new Error('ValidationFailed') }` block before any legacy-specific check runs.
**Why it happens:** it is easy to add the legacy check as "one more thing to look at inside the
catch block" (e.g., inspecting `err.issues` for a `clientSiret`-path issue) rather than as an
independent pre-check that runs BEFORE `.parse()` is even called.
**How to avoid:** check `'clientSiret' in draft.inputs` (or equivalent presence check) as its own
`if` before the `try { proposalInputSchema.parse(...) } catch` block, so it never depends on
ZodError internals that could shift shape if the schema changes again later.
**Warning signs:** a pre-Phase-42 draft's finalize attempt shows the generic toast instead of the
"this draft predates SIRET, complete step 1" message.

## Code Examples

### Registering a new nullable, admin-only `users` column (D-13 shape)

```typescript
// Source: pattern verified against src/db/schema.ts:44-76 (existing companyName/partnerType
// columns) — this phase adds two more of the same shape.
export const users = pgTable('users', {
  // ...existing columns unchanged...
  companyName: text('company_name'),
  partnerType: text('partner_type').notNull().default('Partenaire'),
  // NEW (D-13) — nullable, admin-write only, mirrors companyName's own nullability
  companyTelephone: text('company_telephone'),
  // NEW (D-19/PROF-01) — nullable, partner-writable via /parametres
  telephone: text('telephone'),
}, (table) => [
  // ...existing checks unchanged; no new CHECK needed — free-text phone,
  // shape validation happens at the Zod layer (optionalPhoneSchema), not the DB.
]);
```

### The registry parser extension (R1, D-01)

```typescript
// Source: src/lib/registry/schema.ts — MODIFIED registrySiegeSchema and RegistryIdentity
const registrySiegeSchema = z.object({
  adresse: truncated(ADDRESS_MAX).pipe(z.string().max(ADDRESS_MAX)).nullish(),
  code_postal: truncated(CODE_MAX).pipe(z.string().max(CODE_MAX)).nullish(),
  libelle_commune: truncated(COMMUNE_MAX).pipe(z.string().max(COMMUNE_MAX)).nullish(),
  // NEW — verified field name via live OpenAPI schema (components.schemas.siege.properties.siret,
  // type: string, no `required` entry naming it). 17-char cap covers the raw 14 digits plus
  // any incidental whitespace the registry might emit (belt-and-suspenders; observed values are
  // exactly 14 digits with no separators in both fixtures and live sampling).
  siret: truncated(CODE_MAX).pipe(z.string().max(CODE_MAX)).nullish(),
});

// toRegistryIdentity's return type and RegistryIdentity both gain a `siret: string | null`
// field, following the exact same orNull(...) pattern every other field already uses.
```

**Important scoping note:** `toRegistryIdentity`/`RegistryIdentity` in `schema.ts` is currently
consumed ONLY by `registry-sync.ts` for the `companies.*` write path (CRM tier). D-01 needs the
SIRET for the **wizard**'s `clientSiret` field, which is a different consumer entirely (proposal
tier, not company tier) and must NOT write to `companies.*`. The plan should decide explicitly
whether to (a) extend `RegistryIdentity` with `siret` and have the wizard's new prefill call site
read `result.data.siret` directly from `lookupCompanyBySiren`'s existing return value without
ever touching `companies.*`, or (b) keep the two consumers on separate mapper functions. Given
D-02 in `registry-sync.ts`'s own module doc ("no other non-test module... may write" the identity
columns) is about **writes**, not reads, option (a) — extending the shared `RegistryIdentity`
type and reading it in a new wizard-side call site — does not violate that structural rule; it is
a second reader of the same lookup result, not a second writer of `companies.*`.

## State of the Art

Not applicable in the "old vs. new industry approach" sense — this phase is entirely internal
mechanics with no external API version change or library upgrade involved. The one relevant
"state of the art" fact is that the `recherche-entreprises.api.gouv.fr` endpoint's OpenAPI schema
(fetched live during this research, 2026-09-08) is the current authoritative shape; the project's
own fixtures (captured earlier, exact date unknown but referenced against a 2026-09-04 production
incident in `schema.ts`'s comments) may lag it in field completeness (see Pitfall 2).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The new `leasetic_advisor` table should be a plain single-row table with a fixed/known id and a plain `UPDATE`, not an append-only history table like `global_params` | Architecture Patterns / Don't Hand-Roll | Low — D-08/D-09 only require "admin-editable" and "read live," not a history requirement; if the operator later wants an audit trail of advisor changes, `audit_log` already captures admin-action payloads generically and can cover this without schema change |
| A2 | The new safeCode names `MissingPartnerTelephone` and `LegacyDraftIncomplete` (taken verbatim from 42-UI-SPEC.md's suggestions) are acceptable as the literal `Error` message strings `finalizeWizard` throws | Pattern 4 | Low — UI-SPEC already names these as its working suggestion; if the planner picks different literal strings, only the `SAFE_ERROR_CODES` Set and the two throw sites need to agree, which is a mechanical rename with no downstream impact |
| A3 | `lookupCompanyBySiren`'s existing `RegistryIdentity`/`toRegistryIdentity` (CRM-tier) is the right function to extend for the wizard's SIRET prefill, rather than building a second, wizard-scoped mapper | Code Examples | Medium — if a future CRM-tier change to `RegistryIdentity` inadvertently changes shape in a way that affects the wizard's prefill (coupling two consumers to one type), that coupling could surprise a later phase. Alternative: a wizard-scoped thin wrapper that only extracts `siret` directly from the parsed `RegistryResult` (bypassing `toRegistryIdentity` entirely) would decouple the two call sites at the cost of a small amount of duplication. The planner should decide explicitly rather than default to reuse. |
| A4 | Cross-field validation error path redirection (`path: ['clientSiret']` on `.refine()`) works identically whether chained after `.object()` directly or after the existing per-field schemas — no live code in this repo exercises `.refine()` with an explicit `path` option today (only field-level `.refine()` without `path`, e.g. `optionalPhoneSchema`) | Pattern 3 | Low — this is standard, long-stable Zod behavior (not a recent/breaking API), and the training-data-based claim is easily unit-tested in the first TDD task the plan writes: assert `parseResult.error.issues[0].path` equals `['clientSiret']` for a mismatched pair. Flagging as ASSUMED because it was not verified against zod@4.4.3's actual installed behavior in this session (no code was run) |

## Open Questions

1. **Should the SIRET prefill call be a Server Action or a Route Handler?**
   - What we know: `lookupCompanyBySiren` has no `'server-only'` guard itself but is only ever
     called from `server-only`-guarded modules today (`registry-sync.ts`). The wizard's
     `ParametresFormCard.tsx` is a client component (`'use client'`), so the call must cross a
     server boundary somehow — either a `.action.ts` file (matching the existing
     `_actions/saveAsDraft.action.ts` sibling pattern) invoked on the SIREN field's `onBlur`, or a
     small dedicated route handler.
   - What's unclear: whether triggering a server action mid-form-fill (before the draft is
     saved) fits cleanly into the existing RHF `Controller` wiring, or whether it needs a
     `useTransition`-wrapped client-side call to a thin new route.
   - Recommendation: mirror the server-action pattern already established for
     `saveAsDraft.action.ts` (same directory, same `'use server'` + `requireUser()`-first
     discipline) — it is more consistent with this codebase's convention than adding a new
     `app/api/registry/lookup/route.ts`. The plan should confirm this by checking whether any
     other server action in this repo is already invoked from an `onBlur` handler as a
     precedent (not confirmed in this research pass).

2. **Exact naming for the `leasetic_advisor` table's single-row identifier.**
   - What we know: D-08 requires exactly one row, admin-editable, no per-partner or per-proposal
     variation.
   - What's unclear: whether to seed the row with a fixed UUID literal in the migration (simplest
     — `upsertAdvisor()` always targets that known id) or to rely on "the only row that exists"
     (a `SELECT ... LIMIT 1` read pattern, matching `getLatestGlobalParams`'s style, with an
     `INSERT ... ON CONFLICT DO NOTHING` guard preventing a second row).
   - Recommendation: fixed-id UPDATE is simpler and race-safe; the migration seeds one row with a
     literal id (e.g. `'00000000-0000-0000-0000-000000000001'` or a `serial` that the seed
     migration inserts as row 1) and every read/write targets that id explicitly. This avoids
     ever needing an "is there already a row" branch in application code.

3. **Whether `getUserTelephone` (or equivalent) is a new query helper or an inline session read.**
   - What we know: `finalizeWizard` receives `args.userId` but not the full session object (the
     route handler already extracted `partnerType` from the session before calling it) — D-17's
     telephone gate could either (a) have the route handler pass `telephone` through as an
     additional arg (mirroring how `partnerType` is threaded today), or (b) have
     `finalizeWizard` do its own DB read.
   - What's unclear: which is more consistent with this phase's own precedent — R2's finding
     that `additionalFields` are read off `session.user` at the route-handler layer (matching
     `partnerType`'s existing extraction) suggests (a) is the more consistent choice, since
     `finalizeWizard` currently has zero direct DB reads of the `users` table (it only reads
     `proposals`/`global_params`).
   - Recommendation: extend `FinalizeWizardArgs` with `telephone: string | null` (threaded from
     the route handler's session read), matching the existing `partnerType` argument shape
     exactly — do not add a new DB query inside `finalizeWizard` for this.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.8 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run <path-to-file>` |
| Full suite command | `npm test` (`vitest run`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FIELD-01 | SIRET required at step 1, 14-digit shape validation | unit (Zod schema) | `npx vitest run src/lib/calc/schema.test.ts` | ✅ existing file, add cases |
| FIELD-01 | SIRET registry prefill populates the field when SIREN resolves | component | `npx vitest run "app/(authed)/proposals/new/parametres/ParametresFormCard.test.tsx"` | ✅ existing file, add cases |
| — (D-02) | Cross-field SIRET/SIREN mismatch blocks with `error.field.siret.mismatch` on the SIRET field | unit (Zod schema) | `npx vitest run src/lib/calc/schema.test.ts` | ✅ existing file, add cases |
| — (D-05) | Legacy draft (no `clientSiret` in inputs) at finalize → `LegacyDraftIncomplete`, not `ValidationFailed` | unit + route | `npx vitest run src/lib/api/proposals/finalize-wizard.test.ts app/api/proposals/finalize/route.test.ts` | ❌ Wave 0 — `finalize-wizard.test.ts` does not exist yet per this research pass (not located); `route.test.ts` exists and needs new cases |
| PROF-01 | Partner can set/see own téléphone; fonction shown read-only, derived from `partnerType` | component | `npx vitest run "app/(authed)/parametres/ParametresForm.test.tsx"` | ✅ existing file, add cases |
| PROF-02 | Missing telephone blocks finalize with `MissingPartnerTelephone`, not the generic path | unit + route | `npx vitest run src/lib/api/proposals/finalize-wizard.test.ts app/api/proposals/finalize/route.test.ts` | ❌ / ✅ (same pair as D-05 row) |
| PROF-02 / D-18 | `FinalizeButton` renders the dialog (not a toast) for `MissingPartnerTelephone`, and reads `body.error` at all | component | `npx vitest run "app/(authed)/proposals/new/verification/FinalizeButton.test.tsx"` | ❌ Wave 0 — not located in this research pass; confirm at plan time whether it exists under a different name |
| PROF-03 | Advisor name/email sourced from a new setting, not from `session.user` — this phase only needs the DATA to exist and be admin-writable; the PDF-read is Phase 43's job, but the admin CRUD surface and its persistence are this phase's | unit (query helper) + component (admin form) | `npx vitest run src/lib/db/queries/advisor.test.ts` | ❌ Wave 0 — new table, new query file |
| D-13 | Admin can set company telephone; it persists to a real `users` column and is readable back (not just written to `audit_log`) | unit (admin action) | `npx vitest run src/lib/admin/actions.test.ts` | ✅ existing file, add cases |
| D-19 | Admin can set partner's own telephone at creation time | unit (admin action) + component (`CreatePartnerForm`) | `npx vitest run src/lib/admin/actions.test.ts "app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.test.tsx"` | ✅ both exist, add cases |

### Sampling Rate

- **Per task commit:** the single most relevant file's quick-run command from the table above.
- **Per wave merge:** `npm test` (full suite) — this phase touches `proposalInputSchema` and
  `SAFE_ERROR_CODES`, both cross-cutting enough to warrant a full-suite check before merging any
  wave, not just the files this phase directly edits.
- **Phase gate:** full suite green, plus a manual confirmation that
  `tests/admin-09-grep-contracts.test.ts` and `src/lib/pdf/no-commission.test.ts` are unaffected
  (they should be inert to this phase's changes per Pattern 4's analysis, but the standing project
  discipline is to re-run them explicitly before `/gsd-verify-work`, not just assume).

### Wave 0 Gaps

- [ ] `src/lib/api/proposals/finalize-wizard.test.ts` — was not located during this research pass;
      confirm at plan time whether wizard-finalize logic is tested indirectly through
      `app/api/proposals/finalize/route.test.ts` only, or needs its own new test file. If it
      needs a new file, this is the natural home for D-05 and D-17's new branches.
- [ ] `src/lib/db/queries/advisor.ts` + `advisor.test.ts` — new table, new query helper, no
      existing file to extend.
- [ ] A migration for `drizzle/0011_phase42_captured_data.sql` — generated via `npm run
      db:generate` after `src/db/schema.ts` edits, never hand-authored (per
      `check-migration-journal-sync.sh`'s own Phase 12 incident writeup).
- [ ] Confirm whether `FinalizeButton.test.tsx` exists under its current name or a different one —
      not located by filename search in this research pass; the component file itself was read
      and confirmed to exist at `app/(authed)/proposals/new/verification/FinalizeButton.tsx`.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No (indirect only) | Better Auth session already gates every touched route; this phase adds no new auth flow |
| V3 Session Management | No | No session-shape change beyond adding two more `additionalFields` entries, following the existing `partnerType` pattern exactly |
| V4 Access Control | Yes | `input: false` on `companyTelephone` (Better Auth framework-level block on client-side self-write, same mechanism protecting `partnerType`/`role` today); `requireAdmin()` gates the new `/advisor` route and its admin action, matching every other admin surface in this repo |
| V5 Input Validation | Yes | Zod (`proposalInputSchema`'s new SIRET field + cross-field refine; `createPartnerFormSchema`'s loosened `phone`/new `telephone`) — single-source client+server validation, the established project pattern (D-29) |
| V6 Cryptography | No | No new secret, token, or hash introduced by this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Self-elevation via `/api/auth/update-user` (a partner sets their own `companyTelephone` or impersonates admin-only data) | Elevation of Privilege | `input: false` on the `companyTelephone` additionalField — Better Auth structurally rejects the field on that endpoint, not an application-level check that could be forgotten |
| Bounded-code payload leak via the new `MissingPartnerTelephone`/`LegacyDraftIncomplete` safeCodes | Information Disclosure | Both are bare string literals with no interpolated data (no field values, no partner PII) — matches the existing 4 codes' shape exactly; ADMIN-09's "no payload echo" constraint is satisfied by construction, not by a new check |
| Cross-user finalize gate bypass (a partner finalizes a draft belonging to another user, or reads another partner's telephone via the gate's error message) | Tampering / Information Disclosure | Unaffected by this phase — `getDraftById(args.draftId, args.userId)`'s existing `WHERE userId = $1` predicate is untouched; the new telephone check reads `args.userId`'s own row only, sourced from the already-authenticated session, never from client input |
| SIRET/SIREN mismatch used to fingerprint or enumerate real companies (a partner probes which SIREN/SIRET pairs "exist" via the registry prefill) | Information Disclosure | Out of scope for this phase's threat surface — `lookupCompanyBySiren` already has this exact threat model documented in its own module header (D-09: "IT RETURNS ITS FAILURES, IT DOES NOT RAISE THEM") and this phase's new call site reuses the same function unchanged; no new enumeration surface is added beyond what the existing CRM registry lookup already exposes |

## Sources

### Primary (HIGH confidence)
- `src/lib/registry/schema.ts`, `src/lib/registry/recherche-entreprises.ts`,
  `src/lib/registry/__fixtures__/*.json` (this repo, read directly) — the current parser and its
  test fixtures.
- Live GET `https://recherche-entreprises.api.gouv.fr/search?q=<siren>&per_page=1` — 4 SIRENs
  sampled 2026-09-08 (552100554 / 923804504 / 000325175 / 130025265), confirming `siege.siret`
  presence pattern.
- Live GET `https://recherche-entreprises.api.gouv.fr/openapi.json` — official OpenAPI 3 schema,
  `components.schemas.siege.properties.siret` (type: string, not in any `required` array) and
  `components.schemas.result.properties.siege` (not in `result`'s `required` array either).
- `src/lib/auth/index.ts`, `src/db/schema.ts`, `docs/operations/migrations.md`,
  `scripts/check-migration-journal-sync.sh` (this repo, read directly) — the additionalFields
  registration pattern and the migration-ordering incident history.
- `app/api/proposals/finalize/route.ts`,
  `app/(authed)/proposals/new/verification/FinalizeButton.tsx`,
  `src/lib/api/proposals/finalize-wizard.ts` (this repo, read directly) — the exact current shape
  of the bounded-code contract and the client's failure-handling gap.
- `src/lib/admin/schemas.ts`, `src/lib/admin/actions.ts` (this repo, read directly) — confirmed
  the existing `phone` field's write-only-to-audit-log dead end.
- `drizzle/meta/_journal.json`, `drizzle/*.sql` listing (this repo, read directly) — next
  migration ordinal is `0011`.

### Secondary (MEDIUM confidence)
- data.gouv.fr community forum thread on `matching_etablissements` being reliably empty
  (WebSearch summary, not independently verified by a direct API probe in this session — the
  live samples pulled during this research also happened to show empty arrays for that field,
  which is consistent with but does not independently prove the forum's broader claim).

### Tertiary (LOW confidence)
- None — every claim in this document traces to either a direct repo read, a live API probe
  performed in this session, or the official OpenAPI schema. Where training-data-only knowledge
  was used (Zod's `.refine()` `path` option behavior — A4), it is flagged in the Assumptions Log
  rather than stated as verified fact.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; every pinned version confirmed present in
  `package.json` by direct read.
- Architecture: HIGH — every pattern cited traces to an existing, currently-shipping file in this
  repo, read directly during this research session.
- Pitfalls: HIGH — 4 of 5 pitfalls are drawn from this repo's own documented incident history
  (`partner_type` migration ordering, `companyName` fallback-chain, the stale registry fixture,
  the `FinalizeButton` body-parsing gap) rather than generic best-practice guesses.

**Research date:** 2026-09-08
**Valid until:** 30 days (stable internal codebase; the one external dependency, the
`recherche-entreprises.api.gouv.fr` public schema, is a government API with no announced
deprecation — re-verify only if D-01's prefill behavior is reported broken in the field)

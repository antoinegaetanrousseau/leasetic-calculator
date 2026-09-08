# Phase 42: Captured Data — Fields & Advisor Profile - Context

**Gathered:** 2026-09-08
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase captures the data the redesigned PDF's `SOCIÉTÉ CLIENTE` and contact cards need,
and nothing else. Concretely, it delivers four things:

1. **Client SIRET** on the proposal — a new required step-1 wizard field, registry-prefilled.
2. **Partner company telephone** on the partner's account — admin-set, session-hydrated into
   the draft the way `companyName` → `partnerCo` already is.
3. **The creating partner's own telephone** on their account — partner-editable on
   `/parametres`, admin-seedable, and the single condition that can block finalization.
4. **A single Leasetic advisor identity** (name, fonction, téléphone, email) held as one
   admin-editable setting and read live at render time.

**Not this phase:** rendering any of it. The `SOCIÉTÉ CLIENTE` / contact cards, the em-dash
treatment for absent values (DOC-11 / FIELD-03), and the type scale are Phase 43. The
backfill of already-stored PDFs is Phase 44. The font swap was Phase 41.

**A reframe during discussion changed who this phase is about.** See D-06.

</domain>

<decisions>
## Implementation Decisions

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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design spec (authoritative pixel spec — but see D-10)
- `.planning/assets/v1.9-quote-design/Quote-FR-A.dc.html` — the French proposal layout.
  Lines 50-58 are the `SOCIÉTÉ CLIENTE` card (clientCompany, clientSiren, **clientSiret**,
  clientContactName/Role/Phone/Email); lines 62-74 are the contact card (advisorName headline,
  advisorRole/Phone/Email, then partnerCompany / partnerSalesRep / **partnerPhone**). D-10
  overrides the ordering of the second card.
- `.planning/assets/v1.9-quote-design/Quote-EN-A.dc.html` — the English counterpart; the
  source of the English labels D-16's fonction translation must sit beside.

### Milestone documents
- `.planning/REQUIREMENTS.md` §Fields (FIELD-01..03) and §Profile (PROF-01..03) — the
  requirements this phase closes. **Three of the six need amendment** — see D-15, D-20, D-21,
  D-22.
- `.planning/ROADMAP.md` Phase 42 — success criteria 1-4, all four needing the same
  amendments (D-23).
- `.planning/phases/41-typography-migration/41-CONTEXT.md` — D-02 there is the precedent for
  amending ROADMAP/REQUIREMENTS in place when upstream documents contradict a discussion.

### Code the phase modifies
- `src/lib/calc/schema.ts` — `proposalInputSchema`, the 15-field single-source contract shared
  by the wizard form (via `zodResolver`) and the server-side finalize re-validation. SIRET and
  the hydrated partner phone land here. Also holds `requiredSirenSchema` (the transform+refine
  pattern D-02 should mirror) and `optionalPhoneSchema`.
- `src/db/schema.ts` — `users` (lines 44-76: `role`, `companyName`, `partnerType` and its CHECK)
  and `proposals` (lines 197+: the `inputs` jsonb and the DATA-01..04 immutability comments).
- `src/lib/auth/index.ts:165-175` — the Better Auth `user.additionalFields` block. Anything
  new that must be readable off the session belongs here (see Claude's Discretion).
- `app/(authed)/proposals/new/parametres/page.tsx:91-110, 180-260` — the session-hydration
  pattern D-11 extends, and the draft-prefill path.
- `app/(authed)/parametres/page.tsx` + `ParametresForm.tsx` — the settings surface PROF-01
  extends. Note its existing shape: `name` is split into Prénom/Nom, email is read-only, and
  save is a combined identity + password transaction with a partial-success matrix.
- `src/lib/api/proposals/finalize-wizard.ts:138-165` — the finalize pipeline; D-17's gate and
  D-05's legacy-draft gap both live here.
- `app/api/proposals/finalize/route.ts:55-63, 128-137` — the `SAFE_ERROR_CODES` set and the
  bounded-error contract D-18 must extend without breaking.
- `app/(authed)/proposals/new/verification/FinalizeButton.tsx` — collapses every non-OK
  response into one generic toast today; D-18 adds the one exception.
- `src/lib/registry/schema.ts:80-90, 170-182` — the registry response parser that currently
  drops `siege.siret`; D-01 extends it.
- `src/lib/registry/recherche-entreprises.ts` — the lookup client D-01 and D-03 depend on.
- `src/lib/admin/schemas.ts` — the admin partner form D-13 and D-19 extend.
- `src/lib/i18n/dictionaries.ts` — where D-16's FR/EN fonction labels and D-18's dialog copy go.
- `src/lib/crm/siren.ts` — `normalizeSiren`, the normalisation precedent D-04 follows.

### Standing constraints
- `docs/operations/migrations.md` — migrations are **generated and committed locally, applied
  only via the `MIGRATE PROD` GitHub Action**. Never run `db:migrate` locally; `.env.local`
  points at the production Neon branch.
- ADMIN-09 — no commission figure, rate or derived value may reach any partner-visible
  surface. The finalize route's bounded-safeCode discipline exists for this reason and D-18
  must stay inside it.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`normalizeSiren` (`src/lib/crm/siren.ts`)** — the shared normalisation used by
  `requiredSirenSchema`, `createClientSchema` and the reconciliation engine. SIRET
  normalisation should follow the same shape rather than grow a second, drifting rule; the
  comment block above `requiredSirenSchema` records exactly what happened last time two
  schemas encoded one rule.
- **`optionalPhoneSchema` (`src/lib/calc/schema.ts`)** — already accepts a formatted phone
  and refines on 10 stripped digits. Both new telephone fields should reuse it.
- **The registry client (`src/lib/registry/recherche-entreprises.ts`)** — already wired for
  SIREN lookup and already called from the client card; D-01 needs the parser widened, not a
  new integration.
- **`/parametres` (`ParametresForm.tsx`)** — an existing Field/FieldGroup/FieldLabel form with
  a combined-save partial-success matrix. The téléphone input joins the "INFORMATIONS
  PERSONNELLES" section; the read-only fonction display sits beside the read-only email.

### Established Patterns
- **Session hydration over typed input.** `partnerCo` and `partnerName` are resolved from the
  Better Auth session server-side and written into the draft's `inputs` — never rendered as
  editable fields, never read back from the form
  (`app/(authed)/proposals/new/parametres/page.tsx:97-107, 230-257`). D-11 is this pattern
  applied to one more field.
- **`inputs` is written once and read forever** (DATA-01..04). Whatever lands there is frozen
  at finalization; D-09 keeps the advisor out of it deliberately.
- **Bounded error codes at the API boundary.** `SAFE_ERROR_CODES` is an explicit allowlist and
  anything outside it collapses to `finalize_failed`. New codes must be added to the set or
  they will be silently swallowed.
- **Server-side re-validation at finalize.** The wizard's client-side Zod resolver is not the
  gate — `finalizeWizard` re-parses `proposalInputSchema` against the stored draft. Any field
  made required is therefore enforced twice, which is what makes D-05 a real failure mode.
- **additionalFields drift is a known landmine.** `companyName` exists as a column but was
  never registered, forcing a fallback chain at every read site. Separately, an unapplied
  `partner_type` additionalField migration once broke every authed page with "APIError: Failed
  to get session" — because Better Auth SELECTs registered columns. Register deliberately, and
  make sure the migration is applied before the code that reads it ships.

### Integration Points
- **Step-1 client card** — where the SIRET input renders, beside the existing SIREN field.
- **Draft creation / prefill** (`page.tsx:180-260`) — where the hydrated company telephone is
  written into `inputs`, and where the CRM client-relationship prefill path already fills
  `clientCo` and `clientSiren`.
- **`finalizeWizard`** — where D-17's téléphone gate and D-05's legacy-draft handling attach.
- **The admin partner form** — gains company telephone (D-13) and téléphone (D-19).
- **A new admin settings surface** — the single Leasetic advisor identity (D-08).
- **`/parametres`** — gains the téléphone input and the read-only fonction display.

</code_context>

<specifics>
## Specific Ideas

- **The relationship model, in the operator's words:** "the partner [is] the salesperson that
  is in charge of the relationship with the client. The advisor … is the person on the
  LEASETIC side that would work alongside the partner in delivering the proposal to the end
  client. Therefore, the main point of contact is the partner, then the advisor. That way the
  client first interacts with the partner of LEASETIC, and the advisor on the LEASETIC team
  acts as a teammate and helper to the partner['s] commercial relationship with the end
  client." This is the sentence that should settle any downstream ambiguity about which person
  belongs in which block.
- **Fonction is not free text:** "fonction is defined by their admin set type
  'Agent'/'Commercial', etc."
- **No inline notice on registry failure** (D-03) — the variant with an explanatory notice was
  offered alongside the plain fallback and was not the choice.
- **No relabelling of the two contact blocks** (D-10) — restructure the order only.

</specifics>

<deferred>
## Deferred Ideas

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

### Reviewed Todos (not folded)
- **`wr-07-db-guard-skip-rule.md`** — "Harden the DB guard's NODE_ENV=test SKIP rule."
  Matched at score 0.2 on the keyword "phase" alone. Unrelated to captured data or profile
  fields; belongs with the DB-guard work, not here.

</deferred>

---

*Phase: 42-captured-data-fields-advisor-profile*
*Context gathered: 2026-09-08*

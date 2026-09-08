# Phase 42: Captured Data — Fields & Advisor Profile - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-08
**Phase:** 42-captured-data-fields-advisor-profile
**Areas discussed:** SIRET capture, Partner phone's home, Advisor identity, Profile-completeness gate

---

## Area selection

| Option | Description | Selected |
|--------|-------------|----------|
| SIRET capture | Typed vs registry-derived; prefix consistency with the SIREN | ✓ |
| Partner phone's home | Wizard field vs account field; one phone or two | ✓ |
| Advisor identity | Who is "Commercial" vs "advisor"; snapshot vs live read | ✓ |
| Profile-completeness gate | Where PROF-02 fires; admin-fillable or not | ✓ |

**User's choice:** all four.

---

## SIRET capture

### Q1 — How does the SIRET get into the proposal?

| Option | Description | Selected |
|--------|-------------|----------|
| Typed by the partner | New required field beside the SIREN; no registry change; 14 hand-typed digits | |
| Prefilled from registry, editable | Pull the siège SIRET when the SIREN resolves; overwritable; needs registry schema widened to parse `siege.siret` | ✓ |
| Prefilled, read-only | Registry value only; guarantees consistency but breaks on branch offices and registry outages | |

### Q2 — Enforce that the SIRET's first 9 digits match the SIREN?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — hard block | Cross-field Zod refine; mismatch blocks finalization | ✓ |
| Yes — warn only | Inline flag, finalization still allowed | |
| No — 14 digits is enough | Shape validation only (FIELD-01's literal wording) | |

**Notes:** the PDF prints SIREN and SIRET on adjacent rows, so a mismatch is visible to the client.

### Q3 — What when the registry lookup fails?

| Option | Description | Selected |
|--------|-------------|----------|
| Fall back to manual entry | Empty field, typed by hand, prefix rule still applies | ✓ |
| Fall back, with a visible notice | Same plus an inline "registry unavailable" hint | |
| Block until the registry answers | Every SIRET registry-backed; depends on third-party uptime | |

**Notes:** the notice variant was offered adjacently and not taken — recorded in CONTEXT.md D-03 as a deliberate exclusion, not an oversight.

### Q4 — Where does the required field bite for resumed drafts?

| Option | Description | Selected |
|--------|-------------|----------|
| Step 1, same as SIREN | Blocks "Suivant"; symmetric with the existing rule | ✓ |
| Only at finalization | Matches FIELD-01's wording; surfaces at the worst moment | |
| Both | Step-1 requirement plus the existing server-side re-validation | |

**Notes:** Claude flagged unprompted that `finalizeWizard` re-parses `proposalInputSchema` and maps any `ZodError` to a generic 500 toast, so a legacy draft reaching finalize fails unhelpfully — captured as D-05, a gap the planner must close.

---

## Partner phone's home

### Q1 — Where should the partner company's telephone live?

| Option | Description | Selected |
|--------|-------------|----------|
| Account field, session-hydrated | Follows the `companyName` → `partnerCo` pattern; a company fact, not a per-proposal one | ✓ |
| Wizard field, typed per proposal | Matches FIELD-02's literal wording; invites drift between proposals | |
| Account field, overridable in the wizard | Both surfaces; more to build and test | |

**Notes:** this puts FIELD-02's "filling the proposal wizard must supply" at odds with the implementation — flagged in the moment and captured as amendment D-15.

### Q2 — Are advisorPhone and partnerPhone two numbers or one?

| Option | Description | Selected |
|--------|-------------|----------|
| Two fields, two numbers | The card reads as designed; two profile inputs | ✓ |
| One field, printed once | Simplest model; forces Phase 43 to drop a row from the authoritative spec | |
| One field, printed twice | Keeps geometry with one input; reads as a bug to the client | |

### Q3 — Who sets the company telephone?

| Option | Description | Selected |
|--------|-------------|----------|
| Partner sets it on /parametres | Self-service; two users from one firm can disagree | |
| Admin sets it, beside companyName | Follows the companyName precedent; partner cannot self-unblock | ✓ |
| Admin sets it, partner can correct it | Nobody blocked; both surfaces to build | |

**Notes:** this split the gate into partner-fixable and admin-fixable classes, which shaped the gate area.

### Q4 — What about existing accounts with no company phone?

| Option | Description | Selected |
|--------|-------------|----------|
| Admin backfills before the gate | Sequenced rollout inside the phase | |
| Hard block from day one | Strongest data quality; can stop every partner at once | |
| Company phone never blocks | Only PROF-02's scope gates; absent value em-dashes under DOC-11 | ✓ |

---

## Advisor identity

**Operator reframe, mid-area and unprompted.** The advisor is a Leasetic-side person, not the
creating user: the partner is the salesperson owning the client relationship and the primary
contact; the advisor is a Leasetic teammate supporting them, the secondary contact. Claude
flagged that this invalidates PROF-03 as written and inverts the design file's card hierarchy
(`Quote-FR-A.dc.html:67-74` makes `advisorName` the headline).

### Q1 — Where does the Leasetic-side advisor come from?

| Option | Description | Selected |
|--------|-------------|----------|
| Assigned per partner account | FK to a sales/admin user; truest to the relationship; more schema | |
| One Leasetic contact for everyone | Single identity, same on every proposal | ✓ |
| Chosen per proposal in the wizard | Most flexible; exposes staff list to partners; a field every time | |
| Not in this phase | Partner-side data only; advisor block em-dashes until later | |

### Q2 — Where does that identity live, and who edits it?

| Option | Description | Selected |
|--------|-------------|----------|
| Admin screen, editable | Own settings row; changing the contact is an operation, not a deploy | ✓ |
| Environment variables | Zero UI/schema; needs a redeploy and dashboard access to change | |
| global_params columns | Reuses a built surface; but that table is snapshotted into params_snapshot (financial data) | |

### Q3 — Frozen into the proposal, or read live at render?

| Option | Description | Selected |
|--------|-------------|----------|
| Read live at render | Always reachable; Phase 44 updates the contact on historic documents | ✓ |
| Snapshot into inputs at finalize | Document and record always agree; can print an unreachable name | |
| Snapshot, with live fallback | Handles historic rows; two code paths for Phase 43 and 44 to honour | |

### Q4 — Should Phase 43 restructure the contact card?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — partner is the headline | Partner's commercial becomes the 11pt headline; advisor beneath | ✓ |
| Yes — and relabel | Restructure plus explicit block labels naming each company | |
| No — keep the design's order | Faithful pixel port; leads with the wrong person | |

---

## Profile-completeness gate

### Q1 — Where should the check fire?

| Option | Description | Selected |
|--------|-------------|----------|
| At finalization only | PROF-02's literal placement; one server-side enforcement point | ✓ |
| At wizard entry | Like the existing companyName check; fixes it before any work is invested | |
| Entry check, finalize backstop | Early encounter plus a route-proof invariant | |

### Q2 — How should the block surface?

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated safeCode + dialog | Bounded code names the missing field; dialog links to /parametres | ✓ |
| Dedicated safeCode + toast | Consistent with existing finalize failures; a 5s toast is a weak carrier | |
| Redirect to /parametres | Shortest path; disorienting, and the return trip is real work | |

**Notes:** constrained by ADMIN-09 — the finalize route returns bounded safeCodes only and never echoes a payload.

### Q3 — Rollout for existing accounts

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — the dialog is the rollout | Self-service, zero operator work; first encounter is unannounced | |
| Admin fills them in first | Nobody interrupted; needs the admin surface plus manual chasing | ✓ |
| Prompt on /parametres too | Softens the first encounter; one extra piece of UI | |

**Operator reframe, mid-question:** "fonction is defined by their admin set type
'Agent'/'Commercial', etc." Claude verified `users.partnerType` is `NOT NULL DEFAULT
'Partenaire'`, CHECK-constrained, and registered as a Better Auth additionalField with
`input: false`. This removed the planned `fonction` column and its migration, sidestepped the
naming collision with `users.role`, narrowed PROF-01 and reduced PROF-02's gate to a single
condition (missing téléphone). Captured as D-14, with amendments D-20 and D-21.

### Q4 — What should an English proposal print in the Fonction row?

| Option | Description | Selected |
|--------|-------------|----------|
| Translate for the PDF | FR/EN label pairs rendered per the proposal's committed language | ✓ |
| Print the stored value | Same string in both languages; "Partenaire" under an English label | |
| Translate everywhere | Fixes the inconsistency at source; reaches beyond this phase's boundary | |

**Notes:** the app's admin and partner surfaces keep showing the raw value — recorded under Deferred.

---

## Claude's Discretion

- Column naming/typing for the two new telephone columns, and whether to register them as
  Better Auth additionalFields (with the `companyName` non-registration and the `partner_type`
  unapplied-migration outage both flagged as precedent).
- Phone validation shape — reuse `optionalPhoneSchema` rather than inventing a rule.
- SIRET display formatting versus stored digits-only form.
- Whether the admin advisor screen is a new route or a section on an existing admin page.

## Deferred Ideas

- Translating `partnerType` outside the PDF (admin and partner surfaces still show raw values).
- Per-partner Leasetic advisors, if the relationship becomes personal rather than institutional.
- Partner-editable company telephone, if admin-only proves too rigid.
- Recording that D-09's live advisor read breaks byte-reproducibility of historic proposals.
- **Reviewed todo, not folded:** `wr-07-db-guard-skip-rule.md` (score 0.2, keyword "phase" only)
  — DB-guard hardening, unrelated to this phase.

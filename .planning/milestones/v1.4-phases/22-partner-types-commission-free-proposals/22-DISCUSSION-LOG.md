# Phase 22: Partner Types & Commission-Free Proposals - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 22-partner-types-commission-free-proposals
**Areas discussed:** Agent vs Commercial, Create-form default, Commission-free UX/PDF, Type change UX

---

## Agent vs Commercial

| Option | Description | Selected |
|--------|-------------|----------|
| Identical — label only | Agent/Commercial behave the same everywhere; values exist for org/reporting only | |
| Differ somehow | A real behavioral difference exists | ✓ |

**User's choice:** "There is but it's linked to the calculation of their remuneration on the project. I do not have yet those rules and it will be addressed at a later point in time. A later version. Maybe around V2."
**Notes:** Net effect for Phase 22 → behaviorally identical in v1.4 (commission-free, same formula/UI/PDF). The difference (own-remuneration calculation) is undefined and deferred to ~V2. Implication captured as D-01/D-02: persist the specific type (not a boolean) in snapshot + audit so V2 has the data.

---

## Create-form default

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-set to Partenaire | Defaults to Partenaire (matches backfill + current behavior) | |
| Force explicit choice | No default; admin must actively pick before submit | ✓ |

**User's choice:** Force explicit choice.
**Notes:** No account can be silently created commission-free/commission-bearing by an unfilled field. → D-03.

### Create-form default — labels follow-up

| Option | Description | Selected |
|--------|-------------|----------|
| Short descriptor each | One-line FR hint per option signalling economic consequence | |
| Labels only | Three plain labels under "Type de partenaire", no descriptors | ✓ |
| You decide | Claude picks + drafts copy | |

**User's choice:** Labels only. → D-04.

---

## Commission-free UX/PDF

### Screen surfaces (wizard 2+3, live preview)

| Option | Description | Selected |
|--------|-------------|----------|
| Clean reflow, no trace | Commission row not rendered; rows close up; no gap/placeholder/note | ✓ |
| Reflow + 'sans commission' note | Row gone but a neutral marker explains the difference | |
| You decide | Claude picks cleaner treatment | |

**User's choice:** Clean reflow, no trace. → D-05.

### PDF financial-offer page

| Option | Description | Selected |
|--------|-------------|----------|
| Clean reflow, no trace | Commission line/wording omitted; loyer block reflows naturally | ✓ |
| Reflow + neutral note | Omit line but add a small PDF marker | |
| You decide | Claude matches existing layout, keeps gates clean | |

**User's choice:** Clean reflow, no trace. → D-06.

---

## Type change UX

### Visibility in admin list

| Option | Description | Selected |
|--------|-------------|----------|
| Show type in list | Partner-type badge/column in admin accounts list | ✓ |
| Detail/edit only | Type visible/editable only on detail/edit surface (PTYPE-03 minimum) | |
| You decide | Claude picks based on list layout | |

**User's choice:** Show type in list. → D-07.

### Change confirmation

| Option | Description | Selected |
|--------|-------------|----------|
| Confirmation w/ explanation | Confirm dialog: affects NEW proposals only; existing stay frozen | ✓ |
| Save directly (audit only) | Saves immediately; audit_log is the only record | |
| You decide | Claude picks based on other consequential admin edits | |

**User's choice:** Confirmation with explanation. → D-08 (still audited per PTYPE-03 regardless).

---

## Claude's Discretion

- Exact FR copy for the type-change confirmation dialog (D-08).
- Accounts-list badge vs column presentation + styling (D-07).

## Deferred Ideas

- **Agent vs Commercial own-remuneration calculation rules (~V2)** — undefined; out of scope for v1.4. Phase 22 only persists the distinct type so V2 can build on it.

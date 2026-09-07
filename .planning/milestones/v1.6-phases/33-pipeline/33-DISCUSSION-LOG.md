# Phase 33 — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-02
**Phase:** 33-pipeline
**Areas discussed:** Gamification (operator-added), Stage vocabulary, Stage configurability,
Late-stage ownership, SIREN gate, Lost deals, Unanswered derivation, View shape, Motivation

---

## Gamification (operator-added area)

The operator added a fifth area beyond the four proposed. It was scoped first because one common
form of it is structurally impossible here: **CRM-02 makes relationships private per owner**, so
leaderboards, rankings or peer comparison would require showing a partner data about other
partners' books — the channel-conflict leak the model exists to prevent. Phase 30's security
review treats leakage as an *inference* property where counts and wording also count.

| Option | Description | Selected |
|---|---|---|
| Motivational treatment inside the pipeline view | Own-book only: conversion rate, stage counts, momentum | ✓ |
| A real gamification system — its own phase | Points, badges, streaks, targets with their own data model | |
| Team-level aggregate | Company totals a partner contributes to, no per-partner breakdown | |
| Something else | | |

**User's choice:** Motivational treatment inside the pipeline view
**Notes:** Recorded as a UI-SPEC design intent within PIPE-03/PIPE-04, not a sixth requirement.
This decision was revisited later — see "Motivation" below.

---

## Stage vocabulary

Nothing existed to build on: `client_relationships` carries only `id / companyId / ownerId /
createdAt / updatedAt / source`, and Phase 30's CONTEXT never mentions stages. The ROADMAP names
only the system-owned late stages. The early vocabulary was a pure domain call.

| Option | Description | Selected |
|---|---|---|
| Prospect → Qualifié → Proposition envoyée → Négociation | Four early stages, six columns with the late two | ✓ |
| Prospect → Proposition envoyée → Négociation | Three early, five columns; leaner board | |
| À contacter → En discussion → Devis envoyé | Action-phrased rather than deal-state-phrased | |

**User's choice:** the four-stage vocabulary
**Notes:** Flagged at the time that stage count directly sets the board's column count.

---

## Stage configurability

| Option | Description | Selected |
|---|---|---|
| Fixed in code | TS union + DB CHECK, like `proposals.status` and `verdict` | ✓ |
| Configurable per deployment | Admin-editable table | |

**User's choice:** Fixed in code
**Notes:** Makes PIPE-02's system-owned distinction enforceable at the DB layer rather than only in
the UI.

---

## Late-stage ownership (PIPE-02)

| Option | Description | Selected |
|---|---|---|
| Nothing sets them — visibly reserved | No v1.6 code path writes `signé`/`débloqué` | ✓ |
| `won` advances the relationship to `signé` | Ties PIPE-03 to PIPE-01 | |
| Admin escape hatch | Admin can set them manually | |

**User's choice:** Nothing sets them
**Notes:** The rejected options both create a writer the contract-tool integration would later have
to reconcile against. Having `won` set `signé` would additionally make that stage mean "a partner
said so" — precisely what PIPE-02 reserved it against.

---

## SIREN gate (PIPE-05)

| Option | Description | Selected |
|---|---|---|
| Server action + DB constraint, inline SIREN entry | Belt and braces, recovery at the point of failure | ✓ |
| Server action only, inline entry | Simpler; relies on there being one write path | |
| Block and link to the company page | Simplest; costs the partner their place in the flow | |

**User's choice:** Server action + DB constraint, with inline entry
**Notes:** The "one write path so a constraint is redundant" assumption has already failed once in
this project — Phase 30's single-writer grep gate on `proposals.client_relationship_id` had to be
widened in Phase 31.

---

## Lost deals — a gap the chosen vocabulary opened

Raised by the agent after the vocabulary was chosen: `Prospect → Qualifié → Proposition envoyée →
Négociation → [signé] → [débloqué]` has **no terminal stage for a dead deal**. Without one, lost
deals sit in `Négociation` indefinitely, inflating both the board and every conversion metric.

| Option | Description | Selected |
|---|---|---|
| Add a `Perdu` stage — partner-settable, terminal | Fifth early stage, de-emphasised lane | ✓ |
| No stage change — the proposal outcome carries it | Keeps six stages; board and metrics disagree | |
| Relationships go dormant, drop back to Prospect | Truer for a returning client; erases deal history | |

**User's choice:** Add a `Perdu` stage

---

## How `unanswered` arises

| Option | Description | Selected |
|---|---|---|
| Derived from expiry, overridable | Follows Phase 12 D-07's derive-don't-store rule | ✓ |
| Manual only | Explicit, but unmarked proposals fall out of the metric | |
| Derived and stored once on expiry | Queryable, but contradicts D-07 and adds a scheduled writer | |

**User's choice:** Derived from expiry, overridable
**Notes:** Keeps the conversion rate honest for partners who never tidy up, rather than quietly
measuring only those who do their admin.

---

## View shape (PIPE-04)

| Option | Description | Selected |
|---|---|---|
| Kanban board, drag to advance | Uses the vendored `src/components/reui/kanban.tsx` | ✓ |
| Grouped list, stage changed from a menu | Consistent with the app's cursor-based lists | |
| Board on desktop, list on mobile | Both, at double the surface | |

**User's choice:** Kanban board
**Notes:** Two consequences recorded in CONTEXT D-09 — the system-owned lanes must visibly refuse
drops, and each drag must be a deliberate auditable mutation because Phase 34's ACTV-02 will want
stage changes in a timeline.

---

## Motivation — and the scope decision it forced

| Option | Description | Selected |
|---|---|---|
| Own conversion rate, prominently | PIPE-03 already computes it | |
| Stage counts plus movement over time | Momentum needs stage-change history | |
| Both, and keep it to that | Explicitly rules out streaks, badges, targets | |

**User's answer (free text):** *"conversion rate, stage counts and movements showing momentum,
implement streaks and badges to motivate sales efforts."*

**Agent pushback, and why.** Two problems were surfaced rather than silently absorbed:

1. **Momentum has a hard dependency.** "Movements showing momentum" needs stage-change history with
   actor and timestamp — that is **ACTV-02** verbatim, and belongs to Phase 34. Phase 33 would
   either build it early (duplicating 34) or ship against data that does not exist.
2. **Streaks and badges are a data model, not a UI treatment** — streak state, badge definitions,
   earned-badge records, awarding rules. It is the "own phase" option declined earlier in this same
   session.

Phase 33 already carried five requirements, a new `Perdu` stage and a kanban board.

| Option | Description | Selected |
|---|---|---|
| Swap the order — Activity (34) before Pipeline (33) | Momentum comes free; some circularity to check | |
| Keep 33 lean, add a gamification phase after 34 | Pipeline + conversion + counts now; the rest on a foundation | ✓ |
| Expand Phase 33 to include all of it | ~Double the phase; pre-empts ACTV-02 | |
| Just conversion and counts — drop the rest | Nothing scheduled, recorded as deferred | |

**User's choice:** Keep 33 lean, add a gamification phase after 34
**Notes:** Nothing is dropped — the motivating half lands on ACTV-02's history instead of beside
it. The own-book-only constraint (CRM-02) carries forward permanently into that phase.

---

## Claude's Discretion

- Exact FR/EN display strings for the stage labels.
- Stage as a column on `client_relationships` vs a joined table (a column is expected given D-02).
- Where the `Perdu` lane sits and whether it collapses by default.
- How the conversion rate is framed and positioned.
- Outcome as one column plus date and reason, vs a satellite table.

## Deferred Ideas

- **Gamification phase** (momentum, streaks, badges) — after Phase 34; roadmap entry still to create.
- **Configurable stages** — rejected in D-02; revisit only if the product becomes multi-tenant.
- **Admin escape hatch for late stages** — rejected in D-04.
- **Team-level aggregate metric** — rejected under D-12; with few partners it discloses individuals.

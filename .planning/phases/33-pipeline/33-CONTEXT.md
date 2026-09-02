# Phase 33: Pipeline - Context

**Gathered:** 2026-09-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Relationships gain an advanceable pipeline stage, proposals gain an outcome, and a partner gets a
board of their own book grouped by stage — with a real per-quote conversion rate, and without ever
being blocked from quoting a prospect who has no paperwork yet.

Covers PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05.

**Not in this phase:** the relationship timeline, manual notes, next-action dates and the chase
list — that is Phase 34 (ACTV-01..05). Nor gamification beyond the two metrics named in D-08; see
Deferred Ideas.

</domain>

<decisions>
## Implementation Decisions

### Stage vocabulary

- **D-01:** The stage list is, in order:
  `Prospect → Qualifié → Proposition envoyée → Négociation → Perdu` (partner-settable), then
  `signé → débloqué` (system-owned). Seven values total.
- **D-02:** The list is **fixed in code** — a TypeScript union plus a DB `CHECK`, following the
  existing shape of `proposals.status` (`'draft','active','deleted'`) and
  `company_pair_decisions.verdict`. Changing it later is a migration, which is correct: stage
  semantics are a product decision, not a setting. This also lets PIPE-02's system-owned
  distinction be enforced at the database layer rather than only in the UI.
- **D-03:** **`Perdu` is a terminal, partner-settable stage.** It was added during discussion
  because the vocabulary otherwise had nowhere to put a dead deal — it would have sat in
  `Négociation` indefinitely, inflating both the board and every conversion metric. It should
  render as a de-emphasised or collapsed lane rather than a full column; a partner's losses are
  not a headline.
- **D-04:** **Nothing in v1.6 writes `signé` or `débloqué`.** They exist in the vocabulary and
  render as visibly not-yet-reachable, reserved for the contract-tool integration (PIPE-02).
  Explicitly rejected: having a `won` proposal advance the relationship to `signé` — that would
  make `signé` mean "a partner said so", which is precisely what PIPE-02 reserved it against, and
  the contract tool would later disagree with rows already written that way. Also rejected: an
  admin escape hatch, which creates a second writer the integration must reconcile.

### Proposal outcome

- **D-05:** Outcome (`won` / `lost` / `unanswered`) is a **new column on `proposals`, orthogonal
  to `status`**. `proposals.status` is the lifecycle (`draft` / `active` / `deleted`, Phase 12
  D-01); outcome is the commercial result. A proposal can be `active` **and** `won`. Do not
  extend the status CHECK.
- **D-06:** **`unanswered` is derived, not stored.** A proposal past its validity window with no
  recorded outcome reads as unanswered; the partner can set an explicit outcome to override.
  This follows Phase 12 **D-07**'s established rule that `expired` is derived at query/render
  time and never stored (see `deriveDisplayStatus` in `src/lib/db/queries/proposals.ts`).
  The practical reason: the conversion rate stays honest for partners who never tidy up, rather
  than silently measuring only the ones who do their admin.
  Explicitly rejected: a scheduled job writing `unanswered` on expiry — it contradicts D-07 and
  adds a writer to a table with an immutability invariant.

### The SIREN gate (PIPE-05)

- **D-07:** Marking a proposal `won` requires the company to carry a SIREN, enforced in **both**
  the server action **and** a DB constraint. Belt and braces matches this repo's pattern of
  DB-enforced invariants (the `source =` predicate inside the merge UPDATE's WHERE, the
  `LEAST/GREATEST` pair-decision index). Note the "one write path so a constraint is redundant"
  assumption has already failed once here: Phase 30's single-writer grep gate on
  `proposals.client_relationship_id` had to be widened in Phase 31.
- **D-08:** The gate offers **inline SIREN entry** — a dialog at the point of failure so the
  partner adds it and continues. The gate is a prompt for missing paperwork, not a wall.
  Sending them to the company page and losing their place is explicitly rejected.
  The gate applies **only at `won`**. Quoting and advancing the early stages are never blocked
  by a missing SIREN — that is the whole point of PIPE-05.

### The pipeline view (PIPE-04)

- **D-09:** **Kanban board, drag to advance**, built on the vendored `src/components/reui/kanban.tsx`.
  Two consequences the planner must handle, not discover:
  1. The two system-owned lanes must **visibly refuse drops** — a drag that silently snaps back is
     worse than a lane that reads as unreachable.
  2. Every drag is a stage change. Phase 34's ACTV-02 will want those in an audit trail, so the
     write path must be a deliberate, single, auditable mutation — not a side effect of the drag
     handler.
- **D-10:** Owner scoping is inherited, not re-litigated. CRM-02 makes relationships private per
  owner; `src/lib/db/queries/client-relationships.ts` compiles `ownerId` into every WHERE and
  `client-relationships.isolation.integration.test.ts` covers it. PIPE-04's "never see another
  partner's relationships" follows from reusing that module.

### Motivational treatment

- **D-11:** The board carries exactly two motivating elements, both derivable from data this phase
  already creates: **the partner's own conversion rate** (PIPE-03 computes it) shown prominently,
  and **stage counts** as column badges. Nothing else.
- **D-12:** **Own-book only, always.** CRM-02 forbids any cross-partner comparison — leaderboards,
  rankings, or peer benchmarks would require showing a partner data about other partners' books,
  which is the channel-conflict leak the relationship model exists to prevent. Phase 30's security
  review treats leakage as an *inference* property where even counts and wording count. A
  team-level aggregate was considered and rejected for the same reason: with a handful of
  partners, a team total plus your own number often reveals someone else's.

### Claude's Discretion

- Exact French labels and their EN counterparts (the stage list above is the vocabulary, not
  necessarily the final display strings).
- Whether stage lives on `client_relationships` as a column or in a small joined table — a column
  is expected given D-02's fixed list.
- Where the `Perdu` lane sits visually and whether it collapses by default.
- How the conversion rate is framed (percentage, ratio, "3 of 11") and where on the board it sits.
- Whether outcome is one column plus a date and reason, or a small satellite table.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and scope
- `.planning/REQUIREMENTS.md` § "Pipeline (PIPE)" — PIPE-01..05.
- `.planning/ROADMAP.md` § "Phase 33" — goal and the five success criteria this phase is measured on.
- `.planning/REQUIREMENTS.md` § "Activity & Follow-Up (ACTV)" — read to know what is **not** here.
  ACTV-02 (system events with actor and timestamp) is what a future momentum feature needs, and is
  Phase 34's, not this phase's.

### The access model that constrains PIPE-04
- `.planning/phases/30-company-contact-registry/30-SECURITY.md` — CRM-02 tenant isolation as an
  *inference* property. D-12 follows directly from it.
- `src/lib/db/queries/client-relationships.ts` — the owner-scoped read module PIPE-04 reuses.
- `src/lib/db/queries/client-relationships.isolation.integration.test.ts` — the existing isolation
  proof. Extend it rather than writing a parallel one.
- `src/lib/auth/require.ts` — `requireRelationshipHolder()` gates the `/clients` tree and is the
  right gate for a partner-facing pipeline; `requireAdmin()` is not.

### The derive-don't-store precedent D-06 follows
- `src/lib/db/queries/proposals.ts` — `deriveDisplayStatus` and the expired-vs-deleted UNION
  (see the comments around the `(expired) UNION (soft-deleted within 30-day window)` query).
  Phase 12 D-07 established that `expired` is derived at query/render time and never stored.

### Schema this phase extends
- `src/db/schema.ts` — `clientRelationships` (currently `id`, `companyId`, `ownerId`, `createdAt`,
  `updatedAt`, `source` — **no stage column exists**), `proposals` (`status` CHECK at
  `proposals_status_check`), and `companies.siren` (nullable, `^[0-9]{9}$` CHECK) which is D-07's gate.
- `docs/operations/neon-branch-routing.md` § "Locked rules" rule 3 and rule 4 — this phase adds a
  migration; `drizzle-kit push` is forbidden and migrations fan out only via `db-migrate.yml`.
- `.planning/codebase/UI-CONVENTIONS.md` — UIC-01..UIC-10 plus the open items. Note UIC-04 now
  describes the two-tier radius mechanism shipped by Phase 31.1.

### The component the board is built on
- `src/components/reui/kanban.tsx` — vendored ReUI kanban. Read its real API before speccing props.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `client-relationships.ts` — owner-scoped reads with `ownerId` compiled into every WHERE. The
  board's query belongs here, not in the admin module.
- `deriveDisplayStatus` (`proposals.ts`) — the existing derive-at-read pattern D-06 extends to
  `unanswered`.
- `src/components/reui/kanban.tsx` — the board primitive, already vendored; no registry fetch needed.
- `companies.siren` already carries its format CHECK, so D-07's gate is a NOT NULL test on an
  already-validated column rather than new validation.

### Established Patterns
- Owner-scoped reads take `ownerId` as a required parameter; admin reads live in a separate module
  with no owner filtering. A partner pipeline is firmly on the owner-scoped side.
- Mutations re-prove ownership inside the mutating statement (`INSERT ... SELECT` / `UPDATE ...
  WHERE <precondition>`), per the T-30-05-05 TOCTOU fix. A stage change must not read-then-write.
- **There are no database transactions** — the Neon HTTP driver exposes no `.transaction()`
  (established in Phase 31). Any multi-step write must be idempotent and resumable.
- Enumerated values are a TypeScript union plus a DB CHECK, not a lookup table.
- Server actions: `'use server'`, auth gate as the first await, single bounded error key.

### Integration Points
- `client_relationships` gains a stage column — the first schema change to that table since
  Phase 30 created it.
- `proposals` gains outcome fields. The table carries an immutability invariant on `inputs`
  (ARCHITECTURE.md §2.5, CRM-05) — outcome is additive and must not touch `inputs`,
  `params_snapshot`, `computed` or `schema_version`.
- The board is a new partner-facing route alongside `/clients`, gated by
  `requireRelationshipHolder()`.

</code_context>

<specifics>
## Specific Ideas

- The `Perdu` stage was not in the original vocabulary — it emerged during discussion when the
  chosen stage list turned out to have nowhere to put a dead deal. Worth preserving the reasoning:
  without it, the board and the conversion metric would disagree with each other.
- D-04 is a discipline decision, not a technical one. It would be easy and satisfying to have
  `won` advance the relationship to `signé`; the phase deliberately does not, so that when the
  contract tool arrives it finds an empty field rather than a field full of guesses.
- The motivational treatment was explicitly scoped down from an initial appetite for streaks and
  badges, on the reasoning that momentum needs Phase 34's event history to exist first. See
  Deferred Ideas.

</specifics>

<deferred>
## Deferred Ideas

- **Gamification — its own phase, sequenced after Phase 34.** Momentum ("what moved recently"),
  streaks and badges. Deferred for a concrete reason rather than taste: momentum requires
  stage-change history with actor and timestamp, which is **ACTV-02** and belongs to Phase 34.
  Building it here would duplicate Phase 34's work or ship against data that does not exist. Once
  the timeline is in, gamification lands on it. **Constraint that carries forward: own-book only —
  CRM-02 rules out leaderboards, rankings and peer comparison permanently, not just for now.**
  *A roadmap entry for this phase still needs creating.*
- **Configurable stages** — rejected in D-02. Revisit only if the product becomes multi-tenant.
- **Admin escape hatch for the late stages** — rejected in D-04; would create a second writer for
  the contract-tool integration to reconcile.
- **A team-level aggregate metric** — considered and rejected under D-12. With a handful of
  partners, a team total plus a partner's own figure often discloses another partner's.

</deferred>

---

*Phase: 33-pipeline*
*Context gathered: 2026-09-02*

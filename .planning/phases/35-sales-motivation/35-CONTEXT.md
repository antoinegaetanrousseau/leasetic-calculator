# Phase 35: Sales Motivation - Context

**Gathered:** 2026-09-04
**Status:** Ready for planning

<domain>
## Phase Boundary

A partner sees their own book gaining momentum — the specific deals that moved
this week, a weekly streak of sustained progress, and tiered badges for
milestones reached — computed from Phase 34's `relationship_events` timeline
and rendered as one card on the home page.

**Own-book only, by construction.** CRM-02 makes relationships private to their
owner, so a leaderboard is not merely declined here: it is unbuildable without
the channel-conflict leak the ownership model exists to prevent. Phase 30's
security review treats leakage as an *inference* property — counts, totals and
wording leak too.

**Requirements:** GAME-01..GAME-05 (`.planning/REQUIREMENTS.md`).

**Not in this phase:** the Accueil redesign proposed on 2026-09-04, the
Contrats and Rapports surfaces, "Encours total", command-palette search. See
Deferred Ideas.

</domain>

<decisions>
## Implementation Decisions

### Locked before this discussion (operator, 2026-09-04) — do not reopen

- **D-01:** **Only real progress counts** — a stage advance or a finalized
  proposal. Notes and next-action dates never do. A metric a partner can
  satisfy by typing a note stops measuring anything, and would teach the wrong
  habit. Accepted cost: genuine work that moves nothing (a long call, a quote
  under consideration) reads as a quiet week.
- **D-02:** **Streaks are weekly, not daily.** A leasing deal moves every few
  weeks, so most days are legitimately quiet; a daily streak would sit at zero
  for nearly everyone and read as an accusation rather than encouragement.
- **D-03:** **Badges are DERIVED, never persisted.** No awarding job, no new
  write path. The driver is `neon-http`, which has no transactions, so an award
  could never be made atomic with the event that earned it. Changing a
  criterion re-reads history correctly instead of leaving stale awards behind.
- **D-04:** It lives on the **home page**, where a partner already starts and
  where Phase 34 D-20 already put "à relancer".

### Badge vocabulary

- **D-05:** Badges span **three axes — volume, outcomes and consistency** — so
  a partner always has something reachable. A slow month still rewards
  consistency; a fast one rewards outcomes.
- **D-06:** **Tiered ladders, not flat achievements.** Three axes (clients,
  wins, streak weeks) × bronze/silver/gold ≈ 9 badges from 3 rules. A partner
  always sees the next rung and how far away it is, and the set scales without
  inventing new concepts.
- **D-07:** **Derive from EVENTS, not current state.** The timeline is
  append-only, so "you moved a deal to signé on 12 March" stays true forever
  even if that deal is later marked lost. This is what stops a badge silently
  vanishing when a partner *corrects their own data* — which would read as a
  punishment for being honest.
  **Known limit, accepted:** `relationship_events` is `ON DELETE cascade`, so
  deleting a client removes its events and can still drop a badge. Deletion is
  rare and deliberate; a reversal is neither.
- **D-08:** A badge is **discovered on the home page** — no toast, no
  "new since last visit" marker. A toast would pull badge logic into the write
  path D-03 deliberately kept it out of; a marker needs a per-user last-seen
  timestamp, which is the migration this phase otherwise avoids entirely.

### Momentum

- **D-09:** Momentum shows **the specific deals that moved**, not a count and
  not a sparkline. "Dupont → Négociation, mardi" is concrete, doubles as a way
  back into the client, and says something the board's existing conversion rate
  and stage counts (Phase 33 D-11) do not.
- **D-10:** The window is **the current streak week (Mon–Sun)**. One window
  drives both features, so "what moved" and "is my streak alive" are the same
  question answered once — and the list visibly explains why the streak stands.
  Do NOT introduce a second, rolling window: two definitions of "this week" on
  one page is the failure mode being avoided here.
- **D-11:** A **backwards move or a move to Perdu is SHOWN but does not count.**
  Closing a dead deal is real, healthy pipeline work and belongs in the week's
  record; GAME-01 defines progress as advances and proposals sent, so it must
  not keep a streak alive. Render it plainly — **no penalty framing**.
  (This also closes the obvious gaming route: if any stage change counted, a
  partner could hold a streak by moving deals to Perdu.)
- **D-12:** The streak **states its break condition plainly and always** —
  "3 semaines. Un dossier doit avancer d'ici dimanche." Always visible, so it
  is information rather than an alarm. A warning that appears only in a bad
  week lands hardest on the partner having the worst week. This is GAME-02's
  "can see what would break it" requirement.

### The zero state

- **D-13:** A partner with no history sees **the ladder unlit, with the first
  rung named as an invitation** — "Faites avancer un dossier cette semaine pour
  démarrer une série." GAME-03 already requires unearned criteria to be
  readable, so this is the earned state shown earlier, not a separate design.
- **D-14:** **Say the counter starts now** — one quiet line, e.g. "Activité
  suivie depuis septembre 2026." **Measured on production 2026-09-04:**
  `relationship_events` held exactly two rows, both written that day, because
  the timeline's `INSERT … SELECT` was broken from the day it shipped until
  `62e26fa`. Every stage change and finalize before that recorded nothing and
  is unrecoverable. Without this line, a partner who has closed deals for
  months sees zeros and reasonably concludes the feature is broken or that
  their work was not counted. This is the phase's only real credibility risk.
- **D-15:** **The surface is hidden entirely for admins.** The home page uses
  `requireUser()`, not `requireRelationshipHolder()`, so admins reach it; they
  own no relationships, so their numbers are permanently zero rather than
  merely starting there. Same reasoning Phase 34 applied when
  `listRelationshipsNeedingFollowUp` returns `[]` for an admin instead of
  growing an "all owners" mode. An admin aggregate view is a **GAME-04
  violation** and must not be added.
- **D-16:** **No opt-out.** GAME-05 asks that nothing be withheld and nothing
  behave differently for a partner who ignores this — not that the surface be
  removable. Met by never blocking, never nagging and never gating a feature
  behind engagement. No stored preference, so no migration.

### Placement and prominence

- **D-17:** **Below "à relancer".** The chase list is the action a partner
  opens the page to answer; momentum is the reward for having done it. Nothing
  existing is displaced.
- **D-18:** **One Card, three parts** — streak, this week's movements, badge
  ladder. They share one window and one story. One heading, one empty state,
  and one thing to hide for admins (D-15).
- **D-19:** **Same visual restraint as the rest of the app.** Standard `Card`,
  standard type, brand green only where it already signals action. The content
  carries the motivation, not the styling — two loud cards on one page and
  neither wins.
  **SUPERSEDED 2026-09-05 by D-19a — see § Amendments (2026-09-05) at the end
  of this document. The reasoning above is retained as the record of why the
  original bet was made, not as a live constraint.**
- **D-20:** **Home page only.** The pipeline board keeps exactly the two
  motivating elements Phase 33 D-11 gave it. No duplicated streak on the board,
  nothing on the client page.

### Inherited, not re-litigated

- **D-21:** Own-book scoping is inherited from CRM-02 / Phase 33 D-12 and
  Phase 34 D-25: `requireUser()` or `requireRelationshipHolder()` is the FIRST
  await, and every query carries the owner predicate in the SAME statement —
  never a pre-check followed by a filter.
- **D-22:** Server actions return a discriminated result for a recoverable
  outcome and throw a single bounded error for everything else (Phase 34 D-24).
  Next.js redacts thrown messages in production builds, so a sentinel-on-message
  handshake works in dev and silently degrades once deployed.
- **D-23:** **No migration is expected.** Every decision above landed on the
  side that avoids new per-user state. If planning concludes a migration IS
  needed, that is a signal a decision is being reopened — surface it rather
  than adding a column.

### Claude's Discretion

- **Badge tier thresholds** — how many clients/wins for bronze/silver/gold, and
  how many weeks for each streak badge. Pick numbers reachable early, given
  every partner starts from zero history (D-14). Record the chosen numbers so
  Antoine can adjust them.
- **Momentum list details** — how many movements before truncating, whether
  each row links back to the client page, exact FR/EN wording.
- **Whether the streak reads "0 semaines" or "pas encore démarrée"** in the
  zero state.
- **Query shape and indexing** — whether the weekly window scan needs an index
  beyond `relationship_events_relationship_id_occurred_at_idx`.
- **Week boundary handling** — partners are in France, the server is UTC. Pick
  one and apply it consistently to both the streak and the momentum window
  (they must agree, per D-10).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and scope
- `.planning/REQUIREMENTS.md` § Sales Motivation (GAME) — GAME-01..05, plus the
  two operator decisions written into the section preamble
- `.planning/ROADMAP.md` § Phase 35: Sales Motivation — goal, the five success
  criteria, the locked decisions, and the two measured data constraints

### The privacy constraint — non-negotiable
- `.planning/phases/30-crm-foundation/30-SECURITY.md` — the **inference**
  standard: leakage is judged on what a partner can deduce, so counts, totals
  and wording are in scope, not just fields
- `.planning/phases/33-pipeline/33-CONTEXT.md` D-10, D-12 — own-book-only, and
  why a leaderboard is structurally impossible here
- `.planning/phases/33-pipeline/33-DISCUSSION-LOG.md` § Gamification, § Motivation
  — why this became its own phase and what was already declined

### The data this phase reads
- `.planning/phases/34-fiche-client/34-CONTEXT.md` D-14, D-15 — the
  `relationship_events` table and the rule that system events are written by
  the actions that cause them, never by a database trigger
- `src/lib/db/queries/relationship-events.ts` — the existing timeline queries
  and the `INSERT … SELECT` ownership pattern
- `src/lib/relationship/kinds.ts` — the event-kind vocabulary and its CHECK
  constraint; **changing it requires a migration**
- `.planning/phases/34-fiche-client/34-SECURITY.md` § 7 — the post-audit
  addendum, incl. the audit-write guard rule and the delete surface

### Surfaces this phase touches
- `app/(authed)/page.tsx` — the home page, and where `RelanceCard` already sits
- `app/(authed)/_components/RelanceCard.tsx` — the closest analog: an
  own-book, owner-scoped card already on this page
- `src/lib/db/queries/pipeline.ts` `getConversionRateForOwner` — conversion
  rate is ALREADY computed; do not duplicate it
- `.planning/codebase/UI-CONVENTIONS.md` — incl. the vendored-ReUI
  modifications table

### Deferred design input
- `.planning/assets/2026-09-04-accueil-redesign-proposal.png` — the Accueil
  redesign mockup. **Explicitly NOT this phase's target.** See Deferred Ideas.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`RelanceCard`** (`app/(authed)/_components/RelanceCard.tsx`): the nearest
  precedent — an own-book card on this exact page, already handling an empty
  state and a `nowMs` passed from the server so the clock is not read during
  render. Follow its shape.
- **`Card` / `CardHeader` / `CardContent`** and **`MetricTile`**: already
  imported by `app/(authed)/page.tsx`. D-18 wants one Card; D-19 wants no new
  visual language.
- **`getConversionRateForOwner`** (`src/lib/db/queries/pipeline.ts`): conversion
  rate exists and is owner-scoped. Reuse rather than recompute.
- **`listRelationshipEvents`** and the `relationship_events_relationship_id_occurred_at_idx`
  composite index: the timeline is already ordered by `occurred_at`.

### Established Patterns
- **Owner predicate in the same statement**, never a pre-check plus a filter.
  Every CRM query in this repo does this; the isolation integration suite
  mutation-tests it.
- **A read of "now" happens in a server-only helper**, not inside a component
  render (`react-hooks/purity`) — `app/(authed)/page.tsx` already does this.
- **Integration tests for anything Postgres validates at runtime.** Every unit
  test in this repo mocks the driver, so a mocked test proves a WHERE was
  COMPOSED, never that it FILTERS. Two production defects this week came from
  exactly that gap. A new aggregate query over a week window is a candidate.

### Integration Points
- `app/(authed)/page.tsx` — insert one Card below `<RelanceCard>`; the page
  already resolves `lang`, `nowMs` and the session.
- A new owner-scoped query module reading `relationship_events` joined to
  `client_relationships` for the owner predicate — the join `listRelationshipEvents`
  already uses.
- The admin branch (D-15) — the page uses `requireUser()`, so the role is
  already available; no new auth call is needed.

</code_context>

<specifics>
## Specific Ideas

- Antoine's original framing, Phase 33 discussion: *"conversion rate, stage
  counts and movements showing momentum, implement streaks and badges to
  motivate sales efforts."*
- The streak line should read like information, not an alarm — the shape
  discussed was "3 semaines. Un dossier doit avancer d'ici dimanche."
- The zero state should read as an invitation, not an empty slot: name the
  first rung.
- Momentum rows should be concrete enough to act on — company name, what
  changed, which day.

</specifics>

<deferred>
## Deferred Ideas

All of these arrived with the Accueil mockup supplied on 2026-09-04
(`.planning/assets/2026-09-04-accueil-redesign-proposal.png`). Operator
decision the same day: **defer them, keep Phase 35 scoped.** None is lost.

- **Accueil redesign** — a home page *and navigation* redesign. The mockup's nav
  is Tableau de bord / Propositions / Contrats / Rapports, which **drops Clients
  and Pipeline**, the two surfaces Phases 30–34 built. It also contains no
  "à relancer" and no motivation surface, so it conflicts with Phase 34 D-20 and
  with D-17 above. Its own phase, and it should reconcile those before starting.
- **Contrats surface** — signed contracts with a PDF preview. Depends on the
  in-house contract tool fed by SIREN, which does not exist yet.
- **Rapports surface** — not defined anywhere yet.
- **"Encours total"** — portfolio value charted month over month. Worth
  flagging: a rising portfolio value may be a **stronger motivator than streaks
  or badges**, and it needs no gamification vocabulary at all. It requires
  signed contract amounts, so it depends on the contract tool. Revisit when
  that lands — it could supersede or absorb parts of this phase.
- **Command-palette search (⌘K)** across clients and proposals.
- **"Simuler"** as a first-class action distinct from creating a proposal.
- **Actions rapides** — Proposition / Simulation / Client / Exporter shortcuts.
- **Clients récents** with avatar initials and inline search.

</deferred>

---

## Amendments (2026-09-05)

Recorded after Phase 35's five plans were executed and verified, during the
`35-05` human-verification checkpoint. The operator reviewed the live rendered
surface and requested a change of visual direction. This section supersedes the
decisions it names; everything not named here remains binding.

### D-19a — Gamified visual treatment (supersedes D-19)

**Decision (operator, 2026-09-05):** the momentum card adopts a **full gamified
visual treatment** — tier-identified badge tiles, iconography, per-axis progress
indication and greater prominence — in the visual language of the two reference
dashboards supplied at the checkpoint.

**Why the original bet was reversed:** D-19 wagered that restraint would let the
content carry the motivation. Against the live surface that half-held. The
restraint itself was not the problem — the *absence of structure* was: the
three-axis ladder rendered as three run-on text lines of the form
`Bronze (3 client(s)) · Argent (10 client(s)) · Or (25 client(s))`, which reads
as unformatted output rather than as a designed surface. The operator judged
that a surface whose entire purpose is motivation cannot be the least-designed
element on the page.

**What this authorises:** colour beyond `--foreground`/`--muted-foreground`,
tier-identity colour and iconography for bronze/silver/gold, progress tracks,
badge tiles, and a visual weight for this card at or above `RelanceCard`'s.
The § Color "accent reserved for: nothing" budget in `35-UI-SPEC.md` is lifted
for this surface.

### What remains binding — NOT amended

These were re-confirmed at the same checkpoint and are unchanged. Three of them
are requirements or privacy properties rather than matters of taste, and cannot
be traded against visual direction:

- **GAME-04 / CRM-02 / D-21 — no leaderboard, no ranking, no cross-partner
  comparison, no aggregate of anyone else's book.** Explicitly excluded when the
  operator chose this direction. Both reference dashboards centre a leaderboard
  ("Sales Leaderboard", "Top Performer", "Top Team Members"); that element is
  unbuildable here for the reason § Phase Boundary already gives, and Phase 30
  treats counts, totals and wording as leaking by inference. 35-04's mutation
  suite exists to keep this property true.
- **GAME-03 / D-13 — all nine rungs stay readable whether earned or not**, and
  the zero state is the same ladder unlit. Richer tiles must not hide unearned
  criteria behind an "unlock" affordance; a criterion that cannot be read cannot
  be aimed at.
- **D-11 — no penalty framing.** A backwards move and a move to Perdu still
  render identically to a forward move: no destructive colour, no down-arrow, no
  qualifier. Tier colour is for badge rungs, never for movement rows.
- **D-12 — the streak states its break condition plainly and always**, in a good
  week and a bad week alike.
- **D-14 / D-16 — both footer lines render unconditionally**, and there is no
  opt-out, no dismiss, no engagement gate.
- **D-15 — the surface stays absent (not empty) for admins.** Verified against
  the live admin view on 2026-09-05.
- **D-03 / D-23 — no persistence, no migration, no new column.** The redesign is
  confined to the component, the dictionary and their tests; the query layer
  `src/lib/db/queries/momentum.ts` is not touched — 35-04 proved its contract
  against real Postgres and that evidence must not be invalidated by a restyle.

**Scope of the resulting work:** `app/(authed)/_components/MomentumCard.tsx`,
`src/lib/i18n/dictionaries.ts`, `app/(authed)/_components/MomentumCard.test.tsx`.
No data-layer change is required — `BadgeAxisProgress` already carries `value`
alongside its tier ladder, so progress indication needs no new query.

---

*Phase: 35-Sales Motivation*
*Context gathered: 2026-09-04*

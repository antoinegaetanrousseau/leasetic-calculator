# Phase 35: Sales Motivation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-04
**Phase:** 35-sales-motivation
**Areas discussed:** Badge vocabulary, Momentum (window and shape), The zero state, Placement and prominence

> Two decisions were taken BEFORE this session (operator, 2026-09-04, while
> writing GAME-01..05) and were therefore not re-asked: only real progress
> counts, and streaks are weekly. Two more were taken by Claude and confirmed in
> the same exchange: badges derived rather than persisted, and the home page as
> the location.

---

## Badge vocabulary

| Option | Description | Selected |
|--------|-------------|----------|
| A mix of all three | Volume, outcomes and consistency — a partner always has something reachable | ✓ |
| Outcomes only | Tied to revenue, ungameable — but a dry spell earns nothing for months | |
| Volume and consistency only | Fully within a partner's control — but rewards effort over results | |

**User's choice:** A mix of all three
**Notes:** A slow month still rewards consistency; a fast one rewards outcomes.

| Option | Description | Selected |
|--------|-------------|----------|
| Tiered ladders | 3 axes × bronze/silver/gold ≈ 9 badges from 3 rules; next rung always visible | ✓ |
| Flat distinct badges | More characterful, but every badge is a new rule and "what's next" is unclear | |
| Tiers for volume, flat for firsts | Honest to the difference, at the cost of two concepts on screen | |

**User's choice:** Tiered ladders

| Option | Description | Selected |
|--------|-------------|----------|
| Derive from events, not current state | Append-only history, so a reversal cannot un-earn a badge | ✓ |
| Derive from current state | Simplest queries, but correcting a mistake silently removes a badge | |
| Persist an earned-at row | Bulletproof, but needs a migration and a non-atomic award | |

**User's choice:** Derive from events, not current state
**Notes:** Raised explicitly: `relationship_events` is `ON DELETE cascade`, so
deleting a client can still drop a badge. Accepted — deletion is rare and
deliberate, a reversal is neither.

| Option | Description | Selected |
|--------|-------------|----------|
| Discover it on the home page | No new machinery, nothing to dismiss | ✓ |
| A toast at the moment it happens | Strongest beat, but pulls badge logic into the write path | |
| A "new since last visit" marker | Needs a per-user timestamp — the first migration this phase would require | |

**User's choice:** Discover it on the home page

**Continue or move on:** Next area — tier thresholds left to Claude's discretion.

---

## Momentum: window and shape

| Option | Description | Selected |
|--------|-------------|----------|
| The specific deals that moved | Concrete, actionable, doubles as a way back into the client | ✓ |
| A count of movements | Cheapest, but says nothing actionable and duplicates Phase 33's stage counts | |
| A trend line over recent weeks | Best at direction, but needs weeks of history nobody has | |

**User's choice:** The specific deals that moved

| Option | Description | Selected |
|--------|-------------|----------|
| The current streak week | One window drives both features; the list explains why the streak stands | ✓ |
| Rolling last 7 days | Never empty on a Monday, but drifts out of step with the streak | |
| Last 30 days | Looks substantial when history is thin, but becomes a log, not momentum | |

**User's choice:** The current streak week

| Option | Description | Selected |
|--------|-------------|----------|
| Show it, but it does not count | Closing a dead deal is real work and belongs in the record, without penalty framing | ✓ |
| Count it as progress | Avoids hoarding dead deals, but makes the streak satisfiable by moving deals to Perdu | |
| Hide it entirely | Cleanest read, but a week spent qualifying out five dead leads shows as empty | |

**User's choice:** Show it, but it does not count
**Notes:** This also closes the obvious gaming route.

| Option | Description | Selected |
|--------|-------------|----------|
| State the condition plainly, always | Information rather than an alarm; says exactly what preserves the streak | ✓ |
| Warn only when the week is still empty | Less noise, but lands hardest on the partner having the worst week | |
| Show the deadline without prompting action | Never pushy, but leaves the partner to work out what GAME-02 asks us to tell them | |

**User's choice:** State the condition plainly, always

**Continue or move on:** Next area — truncation, row links and wording left to Claude's discretion.

---

## The zero state

| Option | Description | Selected |
|--------|-------------|----------|
| The ladder, with nothing lit yet | Turns an empty surface into an invitation; GAME-03 already requires unearned criteria to be readable | ✓ |
| Hide until something is earned | Clean page, but invisible to everyone on day one and appears later without warning | |
| A one-time explainer | Clearest intro, but "has this partner seen it" is per-user state | |

**User's choice:** The ladder, with nothing lit yet

| Option | Description | Selected |
|--------|-------------|----------|
| Say the counter starts now | One line prevents established partners reading zeros as a bug | ✓ |
| Say nothing | Nothing to build, but the first impression for active partners is unexplained zeros | |
| Backfill what can be inferred | Kinder, but invents events and contradicts GAME-01 | |

**User's choice:** Say the counter starts now
**Notes:** Grounded in a production measurement taken the same day —
`relationship_events` held exactly 2 rows, both from that morning, because the
timeline was broken from the day it shipped until `62e26fa`.

| Option | Description | Selected |
|--------|-------------|----------|
| Hide the surface for admins | An admin has no book; a zero ladder is permanently wrong, not a starting point | ✓ |
| Show it at zero, like a new partner | One code path, but dead forever on an admin's page | |
| Give admins an aggregate view | Useful, but a cross-partner surface — GAME-04 forbids it outright | |

**User's choice:** Hide the surface for admins

| Option | Description | Selected |
|--------|-------------|----------|
| No opt-out; never demanding | GAME-05 asks that nothing be withheld, not that the surface be removable | ✓ |
| A dismissible card | Most respectful, but needs per-user state and a migration | |
| A setting in Paramètres | Cleanest for the user, most work for a single boolean | |

**User's choice:** No opt-out; it is simply never demanding

**Continue or move on:** Next area.

---

## Placement and prominence

| Option | Description | Selected |
|--------|-------------|----------|
| Below à relancer | Chase list is the action; momentum is the reward for having done it | ✓ |
| Above à relancer | Stronger motivational framing, but pushes the actionable card down | |
| Beside it, two columns | Equal weight, but the page is already dense and it collapses on mobile anyway | |

**User's choice:** Below à relancer

| Option | Description | Selected |
|--------|-------------|----------|
| One card, three parts | Shared window, one story, one empty state, one thing to hide for admins | ✓ |
| Two cards — momentum, then badges | Separates time horizons, but doubles vertical space on a dense page | |
| Streak into metric tiles, rest in a card | Visually tightest, but splits one feature and drops the break-condition line | |

**User's choice:** One card, three parts

| Option | Description | Selected |
|--------|-------------|----------|
| Same restraint as everything else | Content carries the motivation, not styling; avoids competing with à relancer | ✓ |
| Accent the earned state only | Reward without shouting, but the first weeks are all muted | |
| Deliberately celebratory | Strongest pull, but loudest thing on a tool used in front of clients | |

**User's choice:** Same restraint as everything else

| Option | Description | Selected |
|--------|-------------|----------|
| Home page only | One surface to get right and one to hide for admins | ✓ |
| Also a compact streak on the pipeline board | Reaches partners where deals move, but duplicates state across surfaces | |
| Also on the client page | Closest to the work, but fragments one feature across three surfaces | |

**User's choice:** Home page only

---

## Mid-discussion input — the Accueil mockup

Antoine supplied a home page mockup during the final area
(`.planning/assets/2026-09-04-accueil-redesign-proposal.png`).

**Agent pushback, and why.** It was not absorbed silently. Three problems were
surfaced first:

1. It is a home page **and navigation** redesign — its nav is Tableau de bord /
   Propositions / Contrats / Rapports, which **drops Clients and Pipeline**, the
   two surfaces Phases 30–34 built.
2. Four of its elements need capabilities that do not exist: Contrats (depends
   on the SIREN-fed contract tool), Rapports, "Encours total", ⌘K search.
3. It contains **no "à relancer" and no motivation surface**, so it directly
   contradicts Phase 34 D-20 and the placement decision taken minutes earlier.

Also flagged: the mockup's strongest motivational element is **"Encours total"
rising month over month** — arguably a better motivator than streaks or badges,
needing no gamification vocabulary, but requiring signed contract amounts.

| Option | Description | Selected |
|--------|-------------|----------|
| Defer it; keep 35 scoped | Mockup becomes its own phase; 35 ships onto today's Accueil | ✓ |
| Pause 35, redesign Accueil first | Avoids building onto a page about to be replaced, but blocks 35 behind much larger work | |
| Borrow the visual language only | Cheapest step toward it, at the risk of one card looking unlike its neighbours | |
| Rethink 35 around Encours total | Possibly the truer answer, but depends on the contract tool and rewrites GAME-01..05 | |

**User's choice:** Defer it; keep Phase 35 scoped

---

## Claude's Discretion

- Badge tier thresholds (clients/wins/streak weeks per tier) — pick numbers
  reachable early given everyone starts at zero, and record them for adjustment.
- Momentum list truncation, whether rows link back to the client, FR/EN wording.
- Whether the zero-state streak reads "0 semaines" or "pas encore démarrée".
- Query shape and whether the weekly window needs an additional index.
- Week boundary handling (partners in France, server in UTC) — one choice,
  applied to both the streak and the momentum window, which must agree.

## Deferred Ideas

All from the Accueil mockup — see CONTEXT.md `<deferred>` for the full list with
rationale: the Accueil redesign itself, Contrats, Rapports, "Encours total",
command-palette search, "Simuler" as a first-class action, Actions rapides, and
Clients récents.

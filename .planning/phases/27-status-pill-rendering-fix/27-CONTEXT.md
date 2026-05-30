# Phase 27: Status-Pill Rendering Fix - Context

**Gathered:** 2026-05-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the status chip ("Actif", "Brouillon", "Expirée", "Archivée") render with
content-hugging, responsive sizing — full label, no text clipping, no vertical
misalignment, no fixed-width stretch artifact — across desktop viewport widths
in **both light and dark mode**, on two partner surfaces:

1. **UIFIX-02 — home "Propositions récentes" list** (`app/(authed)/page.tsx`) —
   the still-broken surface. Its inline-grid row pins the chip into a fixed
   `90px` track (first child); the chip must instead hug its content.
2. **UIFIX-03 — `/proposals` table** (via `ProposalRow.tsx`) — already uses a
   `max-content` chip track from Phase 25's UIFIX-01; this is primarily a
   **re-verification** on the post-Phase-26 (row-actions) DOM, ensuring no
   regression on draft / active / expired / archived rows.

**In scope:** sizing/layout fix on the two named partner surfaces only; light +
dark verification on both.

**Out of scope (this phase):**
- Status-pill visual restyle — colors, variants, chrome, palette stay exactly
  as-is (carried from Phase 25 D-03; the fix is sizing/layout only).
- Any other chip-in-grid consumer (admin LC-references list, partners list) —
  explicitly NOT swept this phase (see D-01).
- Any change to `--brand-mark`, `--gd`, `.chip-active` colors.
- Reworking the `.list-row` ProposalRow grid contract beyond what UIFIX-03
  verification requires.

</domain>

<decisions>
## Implementation Decisions

### Fix scope (discussed)
- **D-01 — Two named partner surfaces only.** Fix the home "Propositions
  récentes" pill (UIFIX-02) and re-verify the `/proposals` table (UIFIX-03).
  Do **not** sweep other chip-in-grid lists (admin LC-references, partners
  list) this phase, even though they may share the same fixed-track pattern.
  Rationale: smallest blast radius, matches the phase requirements exactly;
  admin-surface chip audits can be a separate deferred item if a regression
  ever surfaces there (noted under Deferred Ideas).

### Home chip placement (discussed)
- **D-02 — Align the home chip to the TRAILING position, matching
  `/proposals`.** Currently the home row renders the chip as the **first**
  (left-most) child of an inline grid (`gridTemplateColumns: '90px 1fr auto
  auto'`), while `/proposals` (`ProposalRow`) renders the chip **last**. Move
  the home chip to the trailing position so both surfaces read identically,
  AND make it hug its content. This is a deliberate, owner-approved layout
  reorder of the home abbreviated row — slightly beyond pure sizing, but the
  intent is visual consistency between the two surfaces.
  - **Concretely (research/planner to confirm exact CSS):** the home row's
    column order should become `clientCo → lcRef → amount → chip`, with the
    chip in a content-hugging track (`auto` / `max-content` / `fit-content`)
    and chip `justify-self` not stretching it. This mirrors `ProposalRow`'s
    `clientCo, lcRef, amount, …, StatusChip` ordering.

### Claude's Discretion
- **Exact CSS mechanism is the planner's call** (carried from Phase 25 D-03):
  change the offending grid track to a content track, vs. set
  `justify-self: start` / `width: fit-content` on the chip, vs. a small shared
  utility. The `.chip` base already hugs in isolation
  (`display: inline-flex; padding: 4px 8px`, `app/globals.css` §`.chip`); the
  defect is purely at the consumer/container grid track, so the fix lives in
  the home row's inline grid (and is verified, not re-fixed, on `ProposalRow`).
- The home row's other inline styles (paddings, font sizes, `1fr` clientCo
  truncation) may be preserved as-is — only the column order + chip track need
  to change to satisfy D-02.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` §"Status Pill Rendering (UIFIX — continues v1.4
  UIFIX-01)" — UIFIX-02 (home pill) + UIFIX-03 (`/proposals`) acceptance text,
  and the out-of-scope row ("Status-pill visual restyle … chip variant chrome
  + palette stay as-is").
- `.planning/ROADMAP.md` → "### Phase 27: Status-Pill Rendering Fix" — goal +
  two success criteria (home full-label hug + `/proposals` parity with no
  draft/archived regression).

### Prior-phase decisions to honor
- `.planning/phases/25-teal-rebrand-polish/25-CONTEXT.md` §D-03 — established
  "hug content, all variants, mechanism = planner's discretion, palette frozen";
  the precise diagnosis (".chip hugs in isolation; defect lives at the
  container") originates here. **Read before planning** — it is the direct
  precedent and prevents re-litigating colors/mechanism.

### Code to read before planning
- `app/(authed)/page.tsx` (lines ~148–207) — the home "Propositions récentes"
  inline-grid row. **Primary fix site (UIFIX-02).** Inline
  `gridTemplateColumns: '90px 1fr auto auto'` with `<StatusChip>` as first
  child is the root cause.
- `src/components/proposals/ProposalRow.tsx` — shared row for `/proposals`;
  `<StatusChip>` is the 5th `.list-row` child → lands in the `max-content`
  track. **Verification site (UIFIX-03).** Confirm post-Phase-26
  `actionsSlot` / `draftActionsSlot` layout doesn't disturb chip sizing.
- `app/globals.css` §`.chip` (lines ~355–391) and §`.list-row`
  (`grid-template-columns: 1fr 100px 130px 100px max-content auto`, with the
  Phase-26 6th `auto` action track) — shared chip base + the proposals-row
  grid contract. Do NOT change chip colors here.
- `src/components/ui/StatusChip.tsx` — bare `<span className="chip
  chip-${variant}">`; owns no sizing of its own. Likely untouched (the contract
  stays; fix is at consumers).

### Untouched (guardrails)
- `.chip-*` color rules, `--brand-mark`, `--gd`, `.chip-active` — must NOT
  change (Phase 25 D-03 + this phase's out-of-scope).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StatusChip` + the shared `.chip` base are unchanged touch-points; both
  surfaces already render through `StatusChip`. No new component needed.
- `ProposalRow`'s `clientCo → lcRef → amount → … → StatusChip` ordering is the
  reference layout the home row aligns to (D-02).

### Established Patterns
- `.chip` base = `display: inline-flex; padding: 4px 8px; border-radius: 9999px`
  — already content-hugging in isolation. Fixed-width artifacts come from a grid
  item stretching to fill a fixed track (default `justify-self: stretch`).
- The home recent list is an **abbreviated, inline-styled** row (NOT
  `ProposalRow`); it has 4 columns (chip, clientCo, lcRef, amount) and no date /
  actions tracks — so the fix is local to `page.tsx`, not the shared component.

### Integration Points
- Home fix is isolated to `app/(authed)/page.tsx` recent-list `.map()` block.
- `/proposals` requires only verification (light + dark, all row variants) on
  the existing `ProposalRow` + `.list-row` grid, post-Phase-26.

</code_context>

<specifics>
## Specific Ideas

- Owner explicitly wants the home pill to **read the same as `/proposals`** —
  trailing chip, content-hugging — not merely "un-clipped in place" (D-02).
- Labels to fit without clipping: "Actif", "Brouillon", "Expirée", "Archivée"
  (FR) and their EN equivalents. "Brouillon" is the longest — the hug must
  accommodate the widest label at the 11.2px chip font.
- Verification must cover **both light and dark** on both surfaces (success
  criteria explicitly state it).

</specifics>

<deferred>
## Deferred Ideas

- **Audit + fix chip-in-grid sizing on admin surfaces** (LC-references list,
  partners list) — the same inline fixed-track pattern may exist there. Out of
  scope this phase per D-01; capture for a future polish pass only if a
  regression is observed on those admin lists.

</deferred>

---

*Phase: 27-status-pill-rendering-fix*
*Context gathered: 2026-05-30*

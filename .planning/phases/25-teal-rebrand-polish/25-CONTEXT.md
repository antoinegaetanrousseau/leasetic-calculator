# Phase 25: Teal Rebrand & Polish - Context

**Gathered:** 2026-05-30
**Status:** Ready for planning

> ⚠️ **Scope reduced during discussion.** The teal rebrand (BRAND-01/02/03) was
> dropped by the owner — see D-01. The roadmap/requirements still list the
> rebrand and the phase name still reads "Teal Rebrand & Polish"; the **effective**
> deliverable is COPY + UIFIX only. Roadmap/REQUIREMENTS may be updated separately.

<domain>
## Phase Boundary

Deliver two slices of admin-facing polish:

1. **Admin-home label changes (COPY-01..04)** — three display-string updates on the
   admin home, shipped FR + EN with the `_EnHasAllFrKeys` compile-time parity proof
   staying green.
2. **Status-pill hug-content fix (UIFIX-01)** — the proposal status pill (and all
   sibling `.chip` variants) sizes to its text content rather than rendering at a
   fixed width that clips or over-pads.

**In scope:** the four label strings (display-only), the chip sizing fix across all
chip variants, FR+EN dictionary entries + parity proof.

**Out of scope (this phase):**
- The teal accent rebrand (BRAND-01/02/03) — **dropped**, see D-01 and Deferred Ideas.
- Any route change for `/[adminSegment]/lc-references` (COPY-01 is a display label only).
- Any change to the logo green (`--brand-mark #6DC388`) or success green (`--gd #129657`).

</domain>

<decisions>
## Implementation Decisions

### Rebrand scope (discussed — reversed)
- **D-01 — No teal rebrand. Accent stays green.** The owner dropped BRAND-01/02/03
  entirely. Rationale: the accent green (`--gd #129657`) is **overloaded** across
  ~63 call sites and serves both accent (active nav, MetricTile month value, PageHero
  eyebrows, AdminNavCard icons, focus rings) AND the "Actif"/"activé" success state
  (`.chip-active { color: var(--gd) }`). A correct rebrand would require splitting the
  token by intent, recoloring ~63 sites + hardcoded `rgba(18,150,87,…)` tints, and a
  fresh light+dark WCAG audit — **high effort, low value** for a color shift. Green
  remains the brand accent. `--teal #2d7a8c` stays as-is (used by Phase 17/18 hero
  cards / admin stat tiles); no migration. **BRAND-01, BRAND-02, BRAND-03 are removed
  from this phase's deliverables.**

### Admin-home labels (locked by requirements — not re-discussed)
- **D-02 — COPY strings are verbatim from REQUIREMENTS.md.** No interpretation needed:
  - COPY-01 → admin-home "Références LC" card title + page heading read **"Toutes les
    propositions"** (FR) / EN equivalent. Route `/[adminSegment]/lc-references` unchanged
    (display label only).
  - COPY-02 → admin-home "Coefficients & commission" card title reads **"Coefficients
    & Commissions"**.
  - COPY-03 → admin-home "Dernière modif. coeffs" stat label reads **"Dernière Modif Coef"**.
  - COPY-04 → all changes ship FR + EN dict entries; `_EnHasAllFrKeys` parity proof
    stays green.

### Status-pill fix scope (discussed)
- **D-03 — Apply the hug-content fix to ALL `.chip` variants, not just the proposal
  status pill.** Every chip (`chip-active`, `chip-draft`, `chip-expired`, `chip-deleted`,
  `chip-disabled`, `chip-invited`, `chip-language`) shares the same `.chip` base, so the
  fix generalizes at near-zero extra cost and keeps sizing consistent app-wide. The
  literal UIFIX-01 target (proposal status pill) is satisfied as a subset.
  - **Research note for planner:** `.chip` base is already `display: inline-flex;
    padding: 4px 8px` (`app/globals.css:355`) — it already hugs in isolation. The
    "fixed width / clipping" symptom therefore lives at a **consumer/container**
    (e.g. a fixed-width table cell or a `min-width` wrapper around the proposal-row
    chip), not in `.chip` itself. Locate the offending container during research.

### Claude's Discretion
- Exact mechanism of the chip sizing fix (container vs. utility class) is a planning
  decision — D-03 only fixes the *scope* (all variants) and the *behavior* (hug content).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — COPY-01..04 (exact label strings + parity-proof
  requirement) and UIFIX-01 (status-pill hug-content). **Note:** BRAND-01/02/03 are
  listed there but are OUT of scope this phase per D-01.
- `.planning/ROADMAP.md` → "### Phase 25: Teal Rebrand & Polish" — original goal +
  success criteria. Success criteria 1 & 2 (the teal recolor + contrast audit) no
  longer apply per D-01; criteria 3 (COPY) and 4 (status pill) remain the real targets.

### Code to read before planning
- `app/globals.css` §`.chip` (lines ~355–391) — shared chip base + per-variant
  background/color rules. The hug-content fix lives here and/or at the chip's container.
- `src/components/ui/StatusChip.tsx` — renders `chip chip-${variant}`; owns no i18n
  (labels passed in). The proposal status pill flows through this component.
- `src/components/proposals/ProposalRow.tsx` — a primary consumer of `StatusChip`;
  likely location of the fixed-width container behind UIFIX-01 (verify during research).
- Admin-home surface for COPY-01..03 — the AdminNavCards + stat row (built in Phase 18,
  `18-02-PLAN.md`: PageHero + 3 stat tiles + AdminNavCards). Locate the card-title and
  stat-label i18n keys here.
- The FR/EN dictionary + `_EnHasAllFrKeys` parity proof (locate the i18n dict module
  during research) — COPY-04 requires both locales updated and the proof green.

### Untouched (guardrails)
- Logo green `--brand-mark #6DC388` and success green `--gd #129657` / `.chip-active`
  — must NOT change (BRAND-02 intent preserved even though the rebrand is dropped).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StatusChip` + the shared `.chip` base class are the single touch-point for the
  UIFIX-01 fix — one fix covers all variants (D-03).
- Phase 18's admin-home build (`18-02-PLAN.md`) established the AdminNavCard + stat-tile
  structure whose labels COPY-01..03 edit; the i18n-key pattern is already in place.

### Established Patterns
- All display strings are i18n keys (FR + EN) guarded by the compile-time
  `_EnHasAllFrKeys` parity proof — COPY changes are dictionary edits, not hardcoded JSX.
- Design tokens are single-source-of-truth in `app/globals.css` `:root` + `@theme`.
  (Relevant only as the guardrail that the accent token `--gd` is NOT being touched.)

### Integration Points
- COPY-01 changes a **display label only**; the `/[adminSegment]/lc-references` route,
  query, and component wiring stay exactly as Phase 19 built them.

</code_context>

<specifics>
## Specific Ideas

- The owner's framing for dropping the rebrand: *"keep the green — too much work and
  not enough value."* Green is affirmed as the brand accent going forward.
- Chip fix should be the consistent hug-content behavior across every variant and both
  languages (FR labels like "Expirée"/"Archivée" run longer than EN — the fix must not
  clip them).

</specifics>

<deferred>
## Deferred Ideas

- **Teal accent rebrand (`#2d7a8c`)** — shelved, NOT killed. If revisited later, the
  hard part is splitting the overloaded `--gd` token into a distinct **accent** token
  (→ teal) vs. a **success** token (→ stays `#129657`), before recoloring ~63 call
  sites + hardcoded `rgba(18,150,87,…)` tints, then re-running a light+dark WCAG AA
  audit. `--teal #2d7a8c` already exists in `app/globals.css` as a starting point.
  Corresponds to roadmap requirements BRAND-01 / BRAND-02 / BRAND-03.

### Reviewed Todos (not folded)
None — no pending todos matched this phase.

</deferred>

---

*Phase: 25-teal-rebrand-polish*
*Context gathered: 2026-05-30*

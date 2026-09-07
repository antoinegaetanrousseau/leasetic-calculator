# Phase 40: Milestone Record Closure - Context

**Gathered:** 2026-09-07
**Status:** Ready for planning

<domain>
## Phase Boundary

The planning record stops asserting things that are not true. v1.6 is formally closed and
re-audited against its **finished** state, Phase 28 is attributed, phases 28-35 are archived where
the tooling expects them, and the five stale operational requirements are corrected against what
actually shipped rather than re-implemented.

**Requirements (9):** CLOSE-06, CLOSE-07, GAP-05, HOUSE-05, HOUSE-06, OPS-01, OPS-02, OPS-03, OPS-04.

**This is a record phase.** The only production code change in scope is HOUSE-05 (deleting a dead
component). Everything else is prose, ticks, snapshots and file moves.

**Depends on:** Phases 36-39 — this phase records what they did.

### MANDATORY prior reading

`.planning/phases/39-database-guard-correctness/39-CONTEXT.md` — **D-09 through D-16** and its
`<stale_premises>` table. Those decisions govern five of this phase's nine requirements and are
**not repeated below**; the D-numbers in this file start at D-40-01 to keep the two sets distinct.

### Explicitly NOT in scope

- Re-running the Phase 21 credential rotation, or building a reset-token script (D-11).
- Adding a middleware Origin gate (D-15) — none exists, and Better Auth's `trustedOrigins` is the
  real mechanism.
- Backfilling MILESTONES.md entries for v1.2 and v1.3 (noted, not written — D-40-04).
- Re-scoping v1.7's mis-snapshotted ROADMAP/REQUIREMENTS pair (D-40-05).
- Fixing the GSD archiving CLI's attribution bug — it lives in the toolchain, not this repo (D-40-08).
- WR-07's DB-guard skip-rule hardening (reviewed, deliberately not folded — see `<deferred>`).
- Any new product capability.

</domain>

<decisions>
## Implementation Decisions

### v1.6 audit re-run  `[CLOSE-06]`

- **D-40-01:** The v1.6 audit is **re-run for real** via `/gsd-audit-milestone v1.6` against the
  finished milestone. The existing `.planning/v1.6-MILESTONE-AUDIT.md` (audited 2026-09-01, revised
  2026-09-02) is superseded but **kept**, not deleted — it scores 14/31 requirements and 2/6 phases
  and literally reads *"Phase 31 does not exist"*, which stopped being true on 2026-09-02.
  Rejected: hand-writing a dated addendum from the phase SUMMARY files, because that produces
  corrected numbers **asserted by the planner rather than independently measured** — the exact
  failure mode this whole phase exists to correct.
- **D-40-02:** Findings from the fresh run are recorded as **known-gaps-at-close** in the v1.6
  `MILESTONES.md` entry — the section shape v1.0, v1.1 and v1.4 entries already use. v1.6 closes
  regardless of what the audit finds. Rejected: severity-triage-then-split, which would make Phase
  40's size unknowable until the audit returns, and filing new numbered requirements against a
  milestone that does not exist yet.
- **D-40-03:** Both audit files end up in `.planning/milestones/`, beside `v1.1-MILESTONE-AUDIT.md`
  and `v1.4-MILESTONE-AUDIT.md`. The 2026-09-01 file is renamed or headed as **superseded** so the
  record still shows an audit was run early and then re-run. `.planning/` root keeps only
  `v1.8-MILESTONE-AUDIT.md` — the in-progress milestone.

### MILESTONES.md and snapshots  `[CLOSE-06]`

- **D-40-04:** Write the **v1.6 entry only**, plus a dated line recording that **v1.2 and v1.3 also
  have no entry** (MILESTONES.md currently runs v1.7 → v1.5 → v1.4 → v1.1 → v1.0). The omission
  becomes visible rather than silently inherited. Rejected: backfilling all three — v1.2/v1.3
  shipped in May and reconstructing them means mining ~30 phase summaries for milestones nobody is
  auditing.
- **D-40-05:** `milestones/v1.6-ROADMAP.md` is created as a **v1.6-scoped extract** (phases 29, 30,
  31, 31.1, 33, 34 — Phase 32 removed), headed as **reconstructed 2026-09-07 from the post-close
  roadmap**, not captured at close. This deliberately does **not** repeat the v1.7 precedent: the
  v1.7 entry's own Archive note records that `v1.7-ROADMAP.md` / `v1.7-REQUIREMENTS.md` are FULL
  tree snapshots rather than milestone-scoped extracts, and flags that as wrong. Re-scoping v1.7's
  pair is out of scope.
- **D-40-06:** `ROADMAP.md`'s v1.6 header (line ~102, `🚧 ... IN PROGRESS`) is **flipped to shipped
  2026-09-04** to agree with line 11, and the v1.6 section and its progress-table rows **stay in
  place**. The snapshot is a copy, not a move. Rejected: trimming the section to a pointer —
  several planning docs cite `ROADMAP.md` by line number, and those references must not break.

### Archive mechanics  `[CLOSE-07]`

- **D-40-07:** **Phase 28 → v1.6**, with a Status reading `Complete (retro-documented, outside
  workflow)` and **no plan count**. Phase 28 was 23 commits on `migration/phase-0-baseline`
  executed outside GSD and retro-documented on 2026-08-31 at v1.6 kickoff; it deliberately has no
  PLAN or VERIFICATION files. The flag is load-bearing: without it the **fresh D-40-01 audit will
  read Phase 28 as a v1.6 phase that lost its plans and verification** and report a false gap.
- **D-40-08:** Phases move by **hand `git mv` against an explicit phase→milestone map written
  first** — `28, 29, 30, 31, 31.1, 33, 34 → milestones/v1.6-phases/`; `35 → milestones/v1.7-phases/`
  (neither target directory exists yet). The GSD **archiving CLI is not used**: the v1.7
  MILESTONES.md entry records that it "attributed every phase on disk to this milestone", producing
  the wrong 19 phases / 97 plans / 178 tasks figures that entry had to retract.
- **D-40-09:** Path-reference rewriting is confined to **live, forward-read documents** —
  `ROADMAP.md`, `REQUIREMENTS.md`, `STATE.md`, `MILESTONES.md`, and the v1.8 phase directories
  (36-40). The ~590 `.planning/phases/{28..35}/…` references inside **archived** documents keep
  their original text: they are dated historical records, and rewriting them would edit history to
  describe a directory layout that did not exist when they were written. (Same discipline as
  D-40-13's errata approach.) Note `.planning/phases/30-crm-foundation` appears twice and is
  **already** stale — the directory is `30-company-contact-registry`.

### HOUSE-05 — dead ProposalForm  `[the only code change in this phase]`

- **D-40-10:** **Delete the `ProposalForm` component and its action row; keep
  `ProposalFormProvider`.** In `src/components/proposal/ProposalForm.tsx` (557 lines),
  `ProposalFormProvider` (L41-84) is live — imported by `app/(authed)/proposals/new/parametres/page.tsx:52`
  and mounted at `:288`, plus `ParametresFormCard.test.tsx`. `ProposalForm` (L109→) is rendered
  nowhere. Rejected: retaining it with a "kept on purpose" comment — dead code that four live files
  cite **by line number** is worse than dead code alone, because it makes the file read as
  load-bearing.
- **D-40-11:** The four stale line-number citations are **repaired in the same edit**:
  `src/lib/calc/schema.ts:6`, `ParametresFormCard.tsx:50` ("see ProposalForm.tsx:36"),
  `RecapSection.tsx:88` ("ProposalForm.tsx:213-219"), `DuplicatePrefillToast.tsx:18`. Repairing the
  numbers is the committed scope; re-pointing them at the live surfaces
  (`ParametresFormCard` / `WizardStep1Wiring`) was offered and not chosen.
- **D-40-12:** HOUSE-05's requirement text is amended to record the delete-or-document decision
  taken, so the ledger stops carrying it as an open question.

### HOUSE-06 — 38-WALK-SURFACES.md correction

- **D-40-13:** Corrected by a **dated errata block** (`2026-09-07 errata — Phase 40, HOUSE-06`) with
  the affected Table 1 rows annotated as corrected. The original text stays readable. Rejected:
  rewriting Table 1 in place — that record is what a reader uses to judge whether the Phase 38 walk
  was sound, and silently editing it removes the evidence for that judgement.
- **D-40-14:** The errata covers **all four sites**, not the two HOUSE-06 names: `PartnersList.tsx:213`,
  `LcReferencesList.tsx:167`, `HistoryTable.tsx:169`, and `LoadMoreButton`. It states that each is a
  "Charger plus" pagination control rendered only inside `{nextCursor && …}`, and that verifying
  them needs a multi-page dataset. Filing a follow-up item to actually observe them was offered and
  **not** chosen — the correction is the closure.

### OPS-01 / OPS-02 / OPS-03 / OPS-04 / GAP-05 — stale requirement corrections

> Governed by **39-CONTEXT.md D-09 → D-16**, which are NOT restated here. Read them.
> Only the mechanism decided in *this* discussion is recorded below.

- **D-40-15:** **OPS-03 is ticked `[x]`** — its own text closes on "*or* the OVH cutover is formally
  re-dated with a decision", so the dated decision **is** the closure. To keep the commitment alive
  past the tick, a **pending todo** is opened carrying the December 2026 date and Antoine's next
  step (provisioning a Node + Postgres + S3-compatible OVH target so `scripts/smoke-ovh.ts` has
  something to run against). Rejected: burying the date in STATE.md's deferred list, which already
  carries eight inherited items, and filing a v1.9 requirement against a milestone that does not exist.
- **D-40-16:** Requirement text is **amended in place with the original preserved**, following the
  Phase 36 D-36-02 precedent already recorded in STATE.md (".planning/REQUIREMENTS.md amended in
  place … original text preserved"). Each of the five is ticked with a **pointer to where it was
  really closed**, per ROADMAP criterion 5.

### Claude's Discretion

- **Wording of every corrected requirement and criterion text** — explicitly handed forward from
  39-CONTEXT.md's Claude's Discretion section (`[→ PHASE 40]`), provided each names the real
  mechanism and cites where the item was actually closed.
- Exact section shape and heading level of the v1.6 MILESTONES.md entry, provided it carries a
  known-gaps-at-close section (D-40-02).
- Whether the superseded 2026-09-01 audit is renamed (e.g. `-SUPERSEDED` suffix) or keeps its name
  with a superseded header (D-40-03).
- Plan sequencing and wave structure, subject to the ordering constraint in `<specifics>`.
- Errata block placement within `38-WALK-SURFACES.md`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The governing hand-off (read first, non-optional)
- `.planning/phases/39-database-guard-correctness/39-CONTEXT.md` — **D-09 → D-16** (the decisions
  for OPS-01/02/03/04 and GAP-05) and the `<stale_premises>` table, which is the **evidence base**
  for all five. Also carries the recorded Claude-side error about self-serve password reset.

### Milestone record
- `.planning/ROADMAP.md` § "Phase 40: Milestone Record Closure" — the nine success criteria.
  Note criterion 3's "Phase 20's middleware Origin gate" phrasing is the text D-15 corrects.
- `.planning/REQUIREMENTS.md` — CLOSE-06 (L62), CLOSE-07 (L66), GAP-05 (L88), OPS-01 (L93),
  OPS-02 (L96), OPS-03 (L99), OPS-04 (L103), HOUSE-05 (L143), HOUSE-06 (L152), plus the
  traceability rows at L204-232.
- `.planning/MILESTONES.md` — the v1.7 entry's **Archive note** records both landmines: v1.7's
  snapshots are full-tree rather than scoped, and the archiving CLI mis-attributed every phase on
  disk. Read before D-40-05 and D-40-08.
- `.planning/v1.6-MILESTONE-AUDIT.md` — the stale audit being superseded (14/31, 2/6, "Phase 31
  does not exist").
- `.planning/v1.8-MILESTONE-AUDIT.md` — 2026-09-07, mid-milestone. Its per-requirement `evidence:`
  blocks independently re-confirm the current state of all nine of this phase's requirements.
- `.planning/milestones/v1.5-phases/26-active-expired-row-actions/` — the archive shape D-40-08
  must reproduce.

### OPS closure evidence (cited by the ticks, per criterion 5)
- `docs/operations/phase-21-gate-evidence.md` § GATE-01 — OPS-01: both admins rotated off
  `leasetic2026` on 2026-05-29, old password tested and rejected.
- `docs/legal/privacy-coverage-confirmation.md` — OPS-04: notice published 2026-05-29, Status Closed.
- `src/lib/auth/index.ts:195` — GAP-05: `updateLastLoginAt` wired to `session.create.after`.
- `src/lib/auth/index.ts:210` + `trusted-origins.test.ts` — OPS-02: `trustedOrigins` configured in
  Phase 20-01. Verification asserts **list membership**, never a status code (D-16).
- `src/proxy.ts` — 91 lines, coarse auth-cookie gate, **no Origin check** — the fact D-15 corrects.
- `scripts/smoke-ovh.ts` — OPS-03: 358 lines, 7-step lifecycle, stays ready and unrun.

### HOUSE-05 / HOUSE-06 surfaces
- `src/components/proposal/ProposalForm.tsx` — `ProposalFormProvider` L41-84 (live),
  `ProposalForm` L109→ (dead).
- `app/(authed)/proposals/new/parametres/page.tsx:52,288` — the only real consumer.
- `.planning/phases/38-shell-dialogs-visual-conventions/38-WALK-SURFACES.md` Table 1 — the errata target.

### Tooling that already anticipates this phase
- `tests/_planning-docs.ts` — `resolvePhaseDoc()`, an **archive-resilient resolver written
  specifically for CLOSE-07**. Globs by phase NUMBER across both `.planning/phases/` and
  `.planning/milestones/v*-phases/`; throws if a doc is found in **neither** or in **both** (a
  half-completed migration). Its header says: *"Do not 'simplify' this back to a literal path."*
  Handles the decimal `31.1` directory via an escaped prefix regex.
- `tests/planning-docs-resolver.test.ts` — its suite.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`resolvePhaseDoc()` in `tests/_planning-docs.ts`** — already handles the 28-35 move. Any new
  test asserting on an archived phase document must use it rather than a literal path. Its
  found-in-both throw is a **free correctness check on D-40-08**: if a `git mv` leaves a copy
  behind, the suite goes red.
- **Existing MILESTONES.md entries (v1.0, v1.1, v1.4, v1.7)** — the section shape D-40-02 and
  D-40-04 reproduce, including the "Known gaps at close" convention.
- **`.planning/milestones/v1.5-phases/`** — the on-disk archive layout to copy.

### Established Patterns
- **Amend in place, preserve the original** (Phase 36 D-36-02, recorded in STATE.md) — governs
  D-40-16's requirement edits and, in spirit, D-40-13's errata.
- **Historical documents are not rewritten** — the reason archived prose keeps stale paths (D-40-09)
  and 38-WALK-SURFACES.md gets errata rather than an in-place edit (D-40-13).
- **Ticked with a pointer, not re-implemented** — criterion 5's shape for all five OPS/GAP closures.

### Integration Points
- **`git mv` ↔ `tests/_planning-docs.ts`** — the move must leave exactly one copy of each document,
  or the resolver throws.
- **Phase 28's table row ↔ the fresh v1.6 audit** — D-40-07's flag exists to keep D-40-01's audit
  from reporting a false gap. Order matters: see `<specifics>`.
- **`.planning/phases/` after the move** — retains only 36, 37, 38, 39, 40 (v1.8, in progress),
  satisfying criterion 4's "only the phases a current or future milestone still needs".

</code_context>

<specifics>
## Specific Ideas

- **Sequencing constraint (load-bearing, not a preference).** Phase 28's table row and its
  `Complete (retro-documented, outside workflow)` flag (D-40-07) must land **before** the fresh
  v1.6 audit runs (D-40-01), or the audit reports Phase 28 as a v1.6 phase missing its plans and
  verification — a false gap this phase would then have to dispose of. Similarly, the audit should
  run **before** the MILESTONES.md entry is written, since D-40-02 feeds its findings into that
  entry's known-gaps-at-close section.
- **The archiving CLI is a known-defective tool, named as such.** D-40-08 is a deliberate refusal
  to use it, traceable to the retraction printed in v1.7's own MILESTONES.md entry.
- **Uncommitted work is present.** `git status` shows 36/37/38-VALIDATION.md, `v1.8-MILESTONE-AUDIT.md`
  and eight test files untracked from the 2026-09-07 session. Planning should account for them
  rather than be surprised by them.
- **Process signal, carried forward from 39-CONTEXT.md.** Five stale premises in one phase, plus
  Phase 38's dead-`ProposalForm` finding, means the requirement ledger drifts faster than it is
  audited. **Treat every "deferred item" description in this phase as unverified until re-measured**
  — including the nine this phase inherits.

</specifics>

<deferred>
## Deferred Ideas

- **Backfill v1.2 and v1.3 MILESTONES.md entries** — both are missing. D-40-04 records the omission
  instead of writing them; the backfill is a future record phase's work.
- **Re-scope v1.7's snapshot pair** — `milestones/v1.7-ROADMAP.md` and `v1.7-REQUIREMENTS.md` are
  full-tree snapshots, which the v1.7 entry itself flags as wrong. Offered during discussion and
  declined as out of Phase 40's requirements.
- **Fix the GSD archiving CLI's phase-attribution bug** — it lives in the GSD toolchain, a different
  codebase. D-40-08 routes around it.
- **Observe the four pagination controls against a multi-page dataset** — the Phase 38 walk could
  not (they render only inside `{nextCursor && …}`). D-40-14 corrects the description; actually
  seeing them rendered was offered and declined.
- **A mechanical requirement-ledger drift check** — first deferred in Phase 39, still unbuilt. This
  phase is its natural home and again does not build it; see the process signal in `<specifics>`.
- **December 2026 OVH cutover** — becomes a pending todo per D-40-15 rather than an open requirement.

### Reviewed Todos (not folded)
- **`wr-07-db-guard-skip-rule` — "Harden the DB guard's NODE_ENV=test SKIP rule"** (severity:
  warning, from 39-REVIEW / 39-REVIEW-FIX). Matched Phase 40 at score 0.6 and was **deliberately
  not folded**. It is a behavioural change to three production paths (local test runs, the
  `MIGRATE PROD` GitHub Action, CI ephemeral branches) and its own todo states it "should land as
  its own reviewed change with the CI paths exercised". Phase 40 is a record-correction phase and
  exercises no CI path. Stays pending.

</deferred>

---

*Phase: 40-Milestone Record Closure*
*Context gathered: 2026-09-07*

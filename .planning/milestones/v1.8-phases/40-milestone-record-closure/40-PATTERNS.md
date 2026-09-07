# Phase 40: Milestone Record Closure - Pattern Map

**Mapped:** 2026-09-07
**Files analyzed:** 13 (document creates/amends) + 1 code file
**Analogs found:** 12 / 13 document targets have a direct on-disk analog; 1 (the HOUSE-06 errata
block) has **no precedent anywhere in the planning tree** — see `## No Analog Found`.

**Framing note:** this is a record phase. There is almost no "code role/data-flow" classification
to do — the artifacts are markdown documents (MILESTONES entries, archive snapshots, audit files,
requirement ticks, an errata block) plus `git mv` operations plus one component deletion. The
table below classifies by **document shape** instead of code role, since that is what the planner
actually needs to reproduce.

## File Classification

| New/Modified File | Shape | Mechanism | Closest Analog | Match Quality |
|---|---|---|---|---|
| `.planning/MILESTONES.md` — new v1.6 entry | milestone summary section | insert-above-line-1 | v1.0/v1.1/v1.4 entries (same file) | exact |
| `.planning/milestones/v1.6-MILESTONE-AUDIT.md` (new, fresh run) | audit doc | new file | `v1.4-MILESTONE-AUDIT.md` (frontmatter+body shape) | exact |
| `.planning/v1.6-MILESTONE-AUDIT.md` → renamed/headed superseded, moved to `.planning/milestones/` | audit doc | move + supersede header | `v1.1-MILESTONE-AUDIT.md`, `v1.4-MILESTONE-AUDIT.md` (siblings it lands beside) | exact (destination), no precedent for the "superseded" header text itself |
| `.planning/milestones/v1.6-ROADMAP.md` (new) | milestone-scoped roadmap extract | new file, extracted from root `ROADMAP.md` | `.planning/milestones/v1.1-ROADMAP.md` | exact — this is the **true** scoped-extract precedent, not v1.7's |
| `.planning/milestones/v1.6-REQUIREMENTS.md` | already exists (22230 bytes) — verify shape only | n/a | `.planning/milestones/v1.5-REQUIREMENTS.md` (archive-header shape) | exact |
| `.planning/ROADMAP.md` line ~102 header flip | in-place text edit | sed-style single-line edit | none needed — mechanical, see excerpt below | n/a |
| `git mv` of phases 28,29,30,31,31.1,33,34 → `milestones/v1.6-phases/`; 35 → `milestones/v1.7-phases/` | on-disk archive move | `git mv` per phase directory | `.planning/milestones/v1.5-phases/26-active-expired-row-actions/` | exact |
| `.planning/REQUIREMENTS.md` — OPS-01/02/03/04, GAP-05 tick + amend-in-place | requirement amendment | preserve original + append dated parenthetical | `.planning/REQUIREMENTS.md` lines 184-187 (HOUSE-04 Out-of-Scope entry, D-36-02) | exact |
| `.planning/REQUIREMENTS.md` — HOUSE-05 amend | requirement amendment | same amend-in-place mechanism | same as above | exact |
| `.planning/phases/38-.../38-WALK-SURFACES.md` — HOUSE-06 errata | dated errata block | append, original untouched | **none in this repo** | no analog — planner must invent the shape |
| `src/components/proposal/ProposalForm.tsx` — delete dead component | code deletion | delete lines 109-557, keep 1-108 | n/a (deletion, not a pattern to copy) | n/a |
| `src/lib/calc/schema.ts:6`, `ParametresFormCard.tsx:50`, `RecapSection.tsx:88`, `DuplicatePrefillToast.tsx:18` — stale-citation repair | comment-text repair | in-place comment edit | n/a (see concrete before/after below) | n/a |
| `tests/_planning-docs.ts` / `tests/planning-docs-resolver.test.ts` | pre-existing resolver + its self-test | consume as-is; **one test in the suite will need updating** | n/a | see finding below |

---

## Pattern Assignments

### 1. `.planning/MILESTONES.md` — new v1.6 entry

**Analog:** the file's own v1.0, v1.1, v1.4 entries (v1.7 is also a fine shape reference, but its
**Archive note** is the thing v1.6 must NOT repeat).

**Section shape actually used (extracted from the v1.5 and v1.4 entries, `MILESTONES.md` lines
61-104 and 106-161):**

```markdown
## v1.X — <Name>

**Shipped:** YYYY-MM-DD
**Phases:** N (first-last) | **Plans:** N | **Plan↔Summary parity:** N/N
**Requirements:** N/N active satisfied (...)
**Tests:** N passing / N skipped / N failed · typecheck + `eslint --max-warnings=0` clean
**Git range:** `<sha>..<sha>` (N commits · code +N / -N across N files)
**Timeline:** YYYY-MM-DD (N days)
**Known deferred items:** N (see `STATE.md` Deferred Items)

### What shipped
<prose>

### Key accomplishments
- **<theme>** — <one-line-per-phase, bolded lead>

### Verification artifacts   [v1.1/v1.4 style]  -or-  ### Verification  [v1.5 style]
- `milestones/v1.X-ROADMAP.md` — ...
- `milestones/v1.X-REQUIREMENTS.md` — ...
- `milestones/v1.X-MILESTONE-AUDIT.md` — ...

### Known gaps / Known gaps at close   <- THIS is the D-40-02 "known-gaps-at-close" section
None — ... / <list>

### Archive
- `milestones/v1.X-ROADMAP.md` · `milestones/v1.X-REQUIREMENTS.md`
```

**"Known gaps at close" convention** — v1.1's exact heading and shape (lines 205-213 of
`MILESTONES.md`):
```markdown
### Known gaps at close (acknowledged, not blocking)

- BOOT-03 partial: Neon 3-branch split deferred — ...
- ADMIN-05 operational gap: `users.last_login_at` is read ... but never *written* ...
- ...
```
v1.6's known-gaps section should read the same way: one bullet per fresh-audit finding, each
naming the requirement ID and the concrete gap — not a severity table.

**Archive-note convention (what NOT to reproduce)** — v1.7's entry, `MILESTONES.md` lines 54-59:
```markdown
**Archive note:** `milestones/v1.7-ROADMAP.md` and `v1.7-REQUIREMENTS.md` are
FULL snapshots at v1.7 close, not v1.7-scoped extracts — v1.6 was never
archived, and all 35 phase directories remain in `.planning/phases/`. The
archiving CLI attributed every phase on disk to this milestone; those figures
(19 phases / 97 plans / 178 tasks) were incorrect and have been replaced by the
scope stated above.
```
This is the confession v1.6's own entry must not need to make — it exists precisely because the
v1.6 archive was skipped. D-40-05/D-40-08 exist so v1.6 gets a clean scoped pair instead.

Insertion point: new entries go **above the top of the file, below the H1** — `MILESTONES.md`
line 1 is `# Milestones — Matrice Commerciale`, line 3 is `## v1.7 ...`. The v1.6 entry, being
older than v1.7 but inserted after the fact, is a judgment call for the planner: this file's own
convention (line 305: "Add new entries above this line when shipping v1.1+, with the most recent
at the top") implies newest-first ordering — v1.6 should be inserted **between v1.7 and v1.5**
(i.e. after line 60, before line 61) to preserve chronological order, not appended at the top.

---

### 2. `.planning/milestones/v1.6-MILESTONE-AUDIT.md` (fresh run) + superseding the stale one

**Analog:** `.planning/milestones/v1.4-MILESTONE-AUDIT.md` for the frontmatter+body shape (it is
the most recent *milestone-closed* audit with the full YAML block); `.planning/v1.6-MILESTONE-AUDIT.md`
(root, stale) and `.planning/v1.8-MILESTONE-AUDIT.md` (root, in-progress) for the YAML `gaps:`
list shape used mid-milestone.

**Frontmatter shape** (`v1.4-MILESTONE-AUDIT.md` lines 1-37):
```yaml
---
milestone: v1.4
milestone_name: Partner Types, Admin Dual-View & Rebrand
audited: 2026-05-30
auditor: gsd-audit-milestone (manual — local gsd-sdk absent; verifier disabled project-wide)
status: passed
verification_mode: convergent-evidence
scores:
  requirements: 19/19 active satisfied (3 BRAND descoped, not counted)
  phases: 4/4 complete
  integration: 6/6 cross-phase checks WIRED
  flows: 2/2 E2E flows complete
  tests: 1184 passed / 4 skipped (env-gated) / 0 failed
  typecheck: clean
gaps:
  requirements: []
  integration: []
  flows: []
tech_debt:
  - phase: <slug>
    items: [...]
deploy_gates: [...]
nyquist: skipped (workflow.nyquist_validation = false)
---
```

**Body heading shape** (`v1.4-MILESTONE-AUDIT.md` lines 38-123, and `v1.1-MILESTONE-AUDIT.md`
lines 101-202 for a richer 6-phase example):
```markdown
# v1.X Milestone Audit — <Name>

**Phases:** N–M (K phases, N plans)

## Method
## Requirements Coverage (N/N active satisfied)
## Cross-Phase Integration (N/N WIRED)
## E2E Flows (N/N complete)
## Security
## Tech Debt (non-blocking)
## Deploy Gate (pre-onboarding, not a code blocker)
```
v1.1's variant adds `## Cross-cutting invariants`, `## Drizzle correlated-subquery latent-bug
audit` (phase-specific), `## Known follow-ups`, `## What landed this milestone`, `## Phase-by-phase
verification depth`, `## Recommendation` — pick the subset that matches what the fresh v1.6 run
actually finds; there is no fixed required set beyond Requirements/Integration/Flows.

**Superseding mechanism — no exact precedent exists for "superseded" headers in this repo.**
Nothing in `.planning/milestones/` currently carries a superseded marker. D-40-03 leaves the exact
form (rename vs. in-place header) to discretion. The closest available convention is the
**amend-in-place-with-dated-parenthetical** pattern from `REQUIREMENTS.md` (see Pattern 6 below) —
reuse that same "preserve original, append a dated correction note" discipline for whichever form
is chosen, rather than inventing a third style.

**Destination:** both audit files (fresh + superseded-stale) land in `.planning/milestones/`,
beside `v1.1-MILESTONE-AUDIT.md` and `v1.4-MILESTONE-AUDIT.md` — confirmed siblings on disk
(`ls .planning/milestones/` shows exactly these two `*-MILESTONE-AUDIT.md` files today, plus the
in-progress ones still at `.planning/` root: `v1.6-MILESTONE-AUDIT.md` [stale, dated 2026-09-01]
and `v1.8-MILESTONE-AUDIT.md` (2026-09-07, in-progress, stays at root per D-40-03).

---

### 3. `.planning/milestones/v1.6-ROADMAP.md` — the scoped-extract shape (D-40-05)

**Analog — the REAL precedent is `.planning/milestones/v1.1-ROADMAP.md`, NOT v1.7's.**
v1.7-ROADMAP.md (779 lines) and v1.5-ROADMAP.md (409 lines) are both **full-tree snapshots**
containing every phase from 1 through their own close — that is v1.7's own self-confessed defect
(see Pattern 1's Archive-note excerpt). `v1.1-ROADMAP.md` (167 lines), captured when only v1.0 had
shipped before it, shows the actual scoped shape:

```markdown
# Roadmap — Matrice Commerciale

## Milestones
- ✅ **v1.0 — v10 Refactor** — Phases 1-4 (shipped ...) — see `milestones/v1.0-ROADMAP.md`
- 🚧 **v1.1 — Hosted Web App Foundation** — Phases 5-10 (in progress) — see below

## Phases

<details>
<summary>✅ v1.0 — v10 Refactor (Phases 1-4) — SHIPPED 2026-04-30</summary>
- [x] **Phase 1: ...** (3/3 plans) — <one line>
...
</details>

### 🚧 v1.1 — Hosted Web App Foundation (Phases 5-10)
- [x] **Phase 5: ...** — <full one-line summary with completion date and follow-ups>
...

## Phase Details

### Phase 5: Bootstrap & Deploy
**Goal**: ...
**Depends on**: ...
**Requirements**: ...
**Success Criteria** (what must be TRUE):
  1. ...
**Plans:** N plans
Plans:
- [x] 05-01-PLAN.md — ...
...

## Progress
| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Parity Refactor | v1.0 | 3/3 | Complete | 2026-04-30 |
...
```

**The structural rule this demonstrates:** prior, already-shipped milestones get **one collapsed
`<details>` block with one-line-per-phase bullets** (no Goal/Depends/Success-Criteria breakdown —
that lives in their own already-archived ROADMAP). Only the **current milestone's own phases** get
the full `## Phase Details` treatment. v1.7's mistake was giving every phase 1-35 the full
treatment, because it copied the whole live root `ROADMAP.md` verbatim instead of scoping.

**For v1.6-ROADMAP.md, this means:** extract full `## Phase Details` sections for **Phase 29, 30,
31, 31.1, 33, 34 only** (Phase 32 stays as its "REMOVED" stub, not a normal phase entry) from the
live root `.planning/ROADMAP.md`. Concrete source ranges to lift verbatim:

| Section | Root `ROADMAP.md` lines |
|---|---|
| Phase 29: Migration Safety Net | 421-449 |
| Phase 30: Company & Contact Registry | 450-489 |
| Phase 31: Reconciliation Engine & Proposal Extraction | 491-529 |
| Phase 31.1: App Shell Refresh (INSERTED) | 531-569 |
| Phase 32: HubSpot Import — REMOVED (2026-09-02) | 571-590 |
| Phase 33: Pipeline | 592-630 |
| Phase 34: Fiche client | 632-681 |

Everything else (v1.0-v1.5, v1.7, v1.8) collapses to one-line bullets pointing at their own
`milestones/v{X}-ROADMAP.md`, matching v1.1-ROADMAP.md's `<details>` treatment of v1.0.

The `## Progress` table analog (v1.1-ROADMAP.md lines 149-163) includes ALL phases to date, not
just the current milestone's — but for a scoped extract the safer, more literal read of "v1.6-scoped
extract" is to include only rows 29/30/31/32/33/34 (root `ROADMAP.md` lines 1062-1067, already
transcribed above under the Progress-table read). Claude's Discretion (per 40-CONTEXT.md) covers
this exact choice.

---

### 4. `.planning/milestones/v1.6-REQUIREMENTS.md` — already exists, verify shape

This file already exists (`.planning/milestones/v1.6-REQUIREMENTS.md`, 22230 bytes, dated
2026-09-05, 258 lines). D-40-05 only speaks to the ROADMAP pairing; nothing in 40-CONTEXT.md asks
for a new REQUIREMENTS snapshot — confirm its existing archive header matches the
`v1.5-REQUIREMENTS.md` shape (lines 1-11: `# Requirements Archive: v1.X <Name>` /
`**Archived:**` / `**Status:** SHIPPED` / pointer to live `.planning/REQUIREMENTS.md`) before
treating it as done; do not regenerate it from scratch.

---

### 5. `ROADMAP.md` header flip (D-40-06)

**Exact target, confirmed by direct read:**

`ROADMAP.md` line 11 (already correct):
```
- ✅ **v1.6 — CRM Foundation** — Phases 29-34 (shipped 2026-09-04) — CRM registry, proposal reconciliation, pipeline, activity — *never formally archived; captured in `milestones/v1.7-ROADMAP.md`*
```

`ROADMAP.md` line 102 (the one to flip):
```
### 🚧 v1.6 — CRM Foundation (Phases 29-34) — IN PROGRESS
```
→ becomes (matching line 117's `### ✅ v1.7 — Sales Motivation (Phase 35) — SHIPPED 2026-09-05`
sibling-header shape immediately below it):
```
### ✅ v1.6 — CRM Foundation (Phases 29-34) — SHIPPED 2026-09-04
```

Per D-40-06 the phase bullets and Phase Details sections **stay in place** — this is a single-line
header edit, not a section rewrite or trim. Also note line 11's parenthetical `*never formally
archived; captured in \`milestones/v1.7-ROADMAP.md\`*` becomes false the moment D-40-08's `git mv`
and D-40-05's new `v1.6-ROADMAP.md` land — that trailing clause should be removed or corrected in
the same edit, even though 40-CONTEXT.md's D-40-06 only names the line-102 flip explicitly.

---

### 6. `.planning/REQUIREMENTS.md` — amend-in-place mechanism (D-40-16, Phase 36 D-36-02 precedent)

**Analog — a REAL, already-executed example of this exact mechanism exists in this file today**,
at `.planning/REQUIREMENTS.md` lines 184-187 (the "Out of Scope" section, HOUSE-04's cross-reference):

```markdown
- **Deleting the vendored ReUI blocks** — HOUSE-04 makes the call. If the call is "delete", the
  deletion is its own work, not this milestone's. *(Amended 2026-09-05 by D-36-02: the call is
  delete, and the deletion was performed in Phase 36 plan 36-03 rather than deferred — see
  `docs/design/reui-blocks-audit.md` and `.planning/ROADMAP.md` § Phase 36 criterion 4.)*
```

**The mechanism, extracted:** original sentence is left completely intact (word-for-word), and a
**dated italic parenthetical** is appended in the form:
```
*(Amended <YYYY-MM-DD> by <D-ref>: <what actually happened> — see <pointer(s)>.)*
```

STATE.md's own description of this same precedent (line 632): `".planning/REQUIREMENTS.md amended
in place for D-36-02 (original text preserved); HOUSE-04 figures corrected to measured
25/152/1.1M."` — confirming "amend in place, preserve original" is the named house convention, not
an ad hoc choice.

**Apply this verbatim to OPS-01/02/03/04, GAP-05, and HOUSE-05:**

Current OPS-01 text (`REQUIREMENTS.md` lines 93-95):
```markdown
- [ ] **OPS-01**: The shared `leasetic2026` admin password is retired and each admin holds an
  individual strong credential. *Flagged at the v1.1 close as required before the first real partner
  is onboarded.*
```
Repair per D-40-16 + 39-CONTEXT.md D-09: tick `[x]`, append a dated parenthetical pointing at
`docs/operations/phase-21-gate-evidence.md` § GATE-01 (both admins rotated 2026-05-29, old password
tested and rejected) — the exact evidence source is already named in 40-CONTEXT.md's canonical
refs, so the planner does not need to re-derive it.

Same mechanism, same file, for:
- **OPS-02** (line 96-98) → pointer: `src/lib/auth/index.ts:210` + `trusted-origins.test.ts`
  (Phase 20-01), per D-14/D-15/D-16 — note the corrected framing is "defence in depth", not
  "SameSite is the real defence" (that inherited claim is explicitly retired by D-14).
- **OPS-03** (line 99-102) → ticked `[x]` per D-40-15 because the requirement's own text closes on
  "*or* the OVH cutover is formally re-dated with a decision" — the December 2026 re-date **is**
  the closure; a **pending todo** carries the date forward (not a REQUIREMENTS.md artifact).
- **OPS-04** (line 103-105) → pointer: `docs/legal/privacy-coverage-confirmation.md` (notice
  published 2026-05-29, Status Closed).
- **GAP-05** (line 88-89) → pointer: `src/lib/auth/index.ts:195` (`updateLastLoginAt` wired to
  `session.create.after`), per D-10 — also correct the requirement's own "written nowhere" wording
  in the same edit (D-10 explicitly calls this out).
- **HOUSE-05** (lines 143-150) → amend to record the delete decision taken (D-40-12), pointing at
  the Phase 40 plan/commit that performs the `ProposalForm.tsx` deletion.

Traceability table rows (lines 204-222) flip from `Phase 40 — Milestone Record Closure | Pending`
to `| Complete` in the same pass, matching the existing pattern for every other completed
requirement in that table (e.g. line 216: `| OPS-05 | Phase 39 — Database Guard Correctness |
Complete |`).

---

### 7. Archive mechanics — `git mv` + the resolver it must not break

**Analog:** `.planning/milestones/v1.5-phases/26-active-expired-row-actions/` — confirmed on-disk
contents (via direct listing):
```
26-01-PLAN.md   26-01-SUMMARY.md   26-02-PLAN.md   26-02-SUMMARY.md
26-03-PLAN.md   26-03-SUMMARY.md   26-CONTEXT.md   26-DISCUSSION-LOG.md
26-REVIEW.md    26-VERIFICATION.md
```
i.e. an archived phase directory keeps **every** planning artifact the phase produced (all
PLAN/SUMMARY pairs, CONTEXT, DISCUSSION-LOG, REVIEW, VERIFICATION) — nothing is pruned or
summarized away on archive. `27-status-pill-rendering-fix/` is the sibling confirming the same
file-set shape for a 2-plan phase.

**Apply to the D-40-08 phase→milestone map:**
- `28, 29, 30, 31, 31.1, 33, 34` → `.planning/milestones/v1.6-phases/<N>-<existing-slug>/`
  (whole directory `git mv`, preserving every file inside, same as the v1.5-phases precedent)
- `35` → `.planning/milestones/v1.7-phases/35-sales-motivation/`
- Neither `v1.6-phases/` nor `v1.7-phases/` exists yet — both are created by the first `git mv`
  into them.
- Phase 28 has **no PLAN or VERIFICATION files** (D-40-07: "it deliberately has no PLAN or
  VERIFICATION files" — retro-documented outside GSD) — its archived directory will legitimately
  contain fewer files than the v1.5-phases siblings; this is not a mistake to fix, it is the
  correct shape for that one phase.

**Consumer that must not break — `tests/_planning-docs.ts` `resolvePhaseDoc()`.** Already reads
as archive-resilient by design (globs both `.planning/phases/<N>-*/` and
`.planning/milestones/*-phases/<N>-*/`, throws on found-in-neither or found-in-both). No change
needed to this file itself.

**Concrete finding — one test in its own suite WILL need updating after the `git mv` lands.**
`tests/planning-docs-resolver.test.ts` lines 104-119 contain a test that asserts against the
CURRENT (pre-CLOSE-07) repo layout by literal expectation:
```typescript
it('resolves each of the four real Phase 37-closure documents against the CURRENT (pre-CLOSE-07) repo layout', () => {
  expect(resolvePhaseDoc(30, '30-UAT.md')).toBe(
    join(LEGACY_PHASES_DIR, '30-company-contact-registry', '30-UAT.md'),
  );
  expect(resolvePhaseDoc(33, '33-VERIFICATION.md')).toBe(
    join(LEGACY_PHASES_DIR, '33-pipeline', '33-VERIFICATION.md'),
  );
  expect(resolvePhaseDoc(34, '34-VERIFICATION.md')).toBe(
    join(LEGACY_PHASES_DIR, '34-fiche-client', '34-VERIFICATION.md'),
  );
  expect(resolvePhaseDoc(34, '34-REVIEW.md')).toBe(
    join(LEGACY_PHASES_DIR, '34-fiche-client', '34-REVIEW.md'),
  );
});
```
Once phases 30, 33, 34 move to `.planning/milestones/v1.6-phases/`, these four `LEGACY_PHASES_DIR`
expectations go **red** — not because the resolver is broken (it will correctly find the docs in
their new home), but because this specific test hardcodes the pre-move path as the expected
answer. The test's own name ("against the CURRENT (pre-CLOSE-07) repo layout") shows its authors
anticipated this. **The planner should include updating these four expectations (to
`MILESTONE_ARCHIVES_DIR`-based paths, or via `resolvePhaseDoc` without asserting the concrete
path) as part of the git-mv plan/task**, or CI goes red on an otherwise-correct migration.

**Path-reference rewriting boundary (D-40-09):** only rewrite `.planning/phases/{28..35}/…`
references inside **live, forward-read** documents — `ROADMAP.md`, `REQUIREMENTS.md`, `STATE.md`,
`MILESTONES.md`, and the v1.8 phase directories (36-40). Leave references inside archived
documents (SUMMARY/PLAN/CONTEXT/etc. of phases 28-35 themselves) untouched — they are dated
historical prose. Note the pre-existing, already-stale `.planning/phases/30-crm-foundation`
reference (real directory is `30-company-contact-registry`) that D-40-09 explicitly flags as
already wrong and NOT this phase's job to fix (it predates the move).

---

### 8. `src/components/proposal/ProposalForm.tsx` — the code deletion (HOUSE-05)

**Confirmed line ranges (direct read of the file, 557 lines total):**
- `ProposalFormProvider` — interface at lines 41-45, function at lines 53-83 (context's "L41-84"
  is accurate to within a blank line). **LIVE** — imported by
  `app/(authed)/proposals/new/parametres/page.tsx:52` and mounted at `:288`, and by
  `ParametresFormCard.test.tsx`.
- `ProposalForm` — function starts at line 109 (`export function ProposalForm({ lang }:
  ProposalFormProps)`) and runs to the file's closing brace at line 557 (the trailing action row —
  `.btn-out` Cancel + `.btn-navy` Generate buttons — is the last ~25 lines of that function, ending
  at line 557). **DEAD** — confirmed via repo-wide grep: the only two hits for `<ProposalForm` in
  non-comment code are inside this same file's own doc comments; no route or component renders it.

**What to delete:** lines 109-557 in full (the entire `ProposalForm` function, including its
action row and the `DURATION_OPTIONS` const at lines 88-92 if unused elsewhere — confirm no other
export in lines 84-108 is consumed before deleting that span).

**What to keep:** lines 1-83 (imports, the `ProposalFormValues` type at line 36, the
`ProposalFormProviderProps` interface, and `ProposalFormProvider` itself) plus whatever of lines
84-108 (the `ProposalFormProps` interface, `DURATION_OPTIONS` const) is still referenced —
`DURATION_OPTIONS` at lines 88-92 appears to be used only inside the now-deleted `ProposalForm`
body; verify with a grep before deciding whether it goes too.

**Analog for "how a Leasétic component gets deleted cleanly":** none needed — this is a subtractive
edit with no pattern to copy; the risk is entirely in the stale-citation repair (Pattern 9 below),
not in the deletion mechanics itself.

---

### 9. The four stale line-number citations (D-40-11) — concrete before/after

All four were read directly. Two are **already** stale today, independent of the coming deletion;
two describe the file correctly today but reference the FILE, not specifically the surviving vs.
deleted portion, so their post-deletion correctness needs re-verification once the deletion lands
(line numbers before the deletion point do not shift; line numbers/content after it do).

**(a) `src/lib/calc/schema.ts:6`** — currently:
```typescript
 *   1. Plan 07-04's <ProposalForm> via @hookform/resolvers/zod
```
This names the (about-to-be-deleted) `<ProposalForm>` as a schema consumer. Confirmed via grep
that the REAL live consumers of `proposalInputSchema` today are `WizardStep1Wiring.tsx` and
`ParametresFormCard.tsx` (neither imports the dead component). D-40-11 says repair the **numbers**,
not re-point to the live surface names — so the minimal repair is removing/correcting this stale
reference to a component that no longer exists, without renaming it to `WizardStep1Wiring`.

**(b) `app/(authed)/proposals/new/parametres/ParametresFormCard.tsx:50`** — currently:
```typescript
// Match the ProposalFormProvider's input-side generic (the validity field is
// optional because the schema applies .default(30) — see ProposalForm.tsx:36).
```
Line 36 of `ProposalForm.tsx` today is `type ProposalFormValues = z.input<typeof
proposalInputSchema>;` — this citation is **currently accurate** and sits inside the surviving
(kept) span (lines 1-83), so it will very likely **remain numerically correct after the deletion**
since nothing before line 109 shifts. The planner should still verify this post-edit rather than
assume — but this is the one citation of the four that may need no change at all.

**(c) `app/(authed)/proposals/new/_components/RecapSection.tsx:88`** — currently:
```typescript
{/*
  Header reuses the .ctitle / .dot pattern lifted verbatim from
  src/components/proposal/ProposalForm.tsx:213-219. The .dot's
  `background: var(--gd)` is the canonical accent treatment.
*/}
```
Direct read of `ProposalForm.tsx` lines 213-219 today shows `<form onSubmit={...}><section
className="card"...><SectionTitle>...` — **no `.ctitle` or `.dot` markup appears there at all**.
**This citation is already wrong today**, independent of the coming deletion — concrete proof of
the drift D-40-11 exists to fix. It will also point into now-deleted code once the edit lands, so
it needs correcting either way (find where the real `.ctitle`/`.dot` pattern actually lives — most
likely inside a surviving, still-rendered component — and repoint there, or state it no longer
applies).

**(d) `src/components/proposals/DuplicatePrefillToast.tsx:18`** — currently:
```typescript
 * Note: ProposalForm captures duplicatedFromId via useState lazy init
 * (window.location.search at mount time) so the POST body still receives
 * the source ID even after this component strips the URL flag.
```
Confirmed via grep: `duplicatedFromId` capture (the `useState<string | null>` lazy-init at
`ProposalForm.tsx:121`) exists ONLY inside the dead `ProposalForm` function — it does **not**
appear in `WizardStep1Wiring.tsx` or anywhere else live. The real, current duplicate-prefill
mechanism is server-side: `app/(authed)/proposals/new/parametres/page.tsx` (D-25/D-26, lines
~120-213) spreads the source proposal's `inputs` directly when minting the draft — there is no
client-side `duplicatedFromId` field feeding a "POST body" anymore (that description predates the
wizard refactor). This comment is **doubly stale**: it describes a POST-body mechanism the app no
longer uses, referencing a component about to be deleted. Repair to describe the actual current
mechanism (server-side inputs spread in `parametres/page.tsx`) or, per D-40-11's stated scope
("repairing the numbers is the committed scope"), at minimum stop citing the deleted component.

---

### 10. HOUSE-06 — 38-WALK-SURFACES.md errata (D-40-13, D-40-14)

**Analog: none exists in this planning tree.** A repo-wide search for "errata" (case-insensitive)
across `.planning/` returns zero hits outside this very phase's own CONTEXT/DISCUSSION-LOG files.
There is no prior dated-correction-block convention to copy verbatim. The closest available
convention to reuse is Pattern 6's **amend-in-place-with-dated-parenthetical** discipline — apply
the same "preserve original, append dated correction" spirit, structured as a block rather than an
inline parenthetical since it must cover four rows across two tables.

**Exact target rows, confirmed by direct read of `38-WALK-SURFACES.md`:**

Table 1, row 3 (line 44) — already says "Charger plus", not mis-described, but named by D-40-14
for completeness (not independently verified against a multi-page dataset):
```markdown
| 3 | Coefficients history | `/[adminSegment]/coefficients` | `app/(admin)/[adminSegment]/coefficients/HistoryTable.tsx` | `.btn-out` (line 169, "Charger plus") |
```

Table 1, row 5 (line 46) — the two sites HOUSE-06 actually names, mis-described as **"per-row
link"**:
```markdown
| 5 | PartnersList / LcReferencesList padding sites | `/[adminSegment]/partners`, `/[adminSegment]/lc-references` | `app/(admin)/[adminSegment]/partners/PartnersList.tsx` (`.btn-green` line 111 "Inviter" CTA, `.btn-out` line 213 per-row link), `app/(admin)/[adminSegment]/lc-references/_components/LcReferencesList.tsx` (`.btn-out` line 167 per-row link) | `.btn-green`, `.btn-out` |
```

Table 1, row 2 (line 43) — the fourth site (`LoadMoreButton`), currently undescribed by line
number or "per-row link" text, but named by D-40-14 anyway:
```markdown
| 2 | `/proposals` | `/proposals` | `app/(authed)/proposals/page.tsx` (...), `src/components/proposals/LoadMoreButton.tsx` (`.btn-out`, this plan's Task 2 edit), ... | `.btn-green`, `.btn-out` |
```

**Errata content, per D-40-14:** all four sites — `PartnersList.tsx:213`, `LcReferencesList.tsx:167`,
`HistoryTable.tsx:169`, and `LoadMoreButton` — are each a **"Charger plus" pagination control**,
rendered only inside `{nextCursor && …}`, meaning none of them render on a single-page dataset
(which is why the Phase 38 walk could not observe them as rendered surfaces). The original table
rows stay readable/unedited (D-40-13 explicitly rejects rewriting Table 1 in place); the block goes
elsewhere in the document — placement is Claude's Discretion per 40-CONTEXT.md.

**Suggested minimal shape** (invented, since no precedent exists — offered as a starting point,
not a locked pattern):
```markdown
---

## 2026-09-07 errata — Phase 40, HOUSE-06

Table 1 rows 2, 3 and 5 describe four `.btn-out` sites — `PartnersList.tsx:213`,
`LcReferencesList.tsx:167`, `HistoryTable.tsx:169`, and `LoadMoreButton` — using language ("per-row
link") that does not match what they render. All four are the same thing: a **"Charger plus"
pagination control**, rendered only inside `{nextCursor && …}`. None render on a single-page
dataset, which is why this walk could not observe them. Verifying them needs a multi-page dataset —
not filed as a follow-up (see `.planning/phases/40-milestone-record-closure/40-CONTEXT.md`
Deferred Ideas). Original Table 1 text above is left unedited.
```

---

## Shared Patterns

### Amend-in-place, preserve original
**Source:** `.planning/REQUIREMENTS.md` lines 184-187 (D-36-02 precedent), confirmed live in-repo.
**Apply to:** OPS-01/02/03/04, GAP-05, HOUSE-05 requirement text; in spirit, the HOUSE-06 errata
(structurally, not literally — errata is a block, amend-in-place is a parenthetical).
**Mechanism:** never delete or rewrite the original sentence; append a dated, attributed
parenthetical or block naming what actually happened and where it was closed.

### Milestone-scoped extract, not full-tree snapshot
**Source:** `.planning/milestones/v1.1-ROADMAP.md` (the real precedent) vs.
`.planning/milestones/v1.7-ROADMAP.md` / `v1.5-ROADMAP.md` (the anti-pattern, both full snapshots).
**Apply to:** `v1.6-ROADMAP.md`. Prior milestones get one-line collapsed bullets; only the current
milestone's own phases get full `## Phase Details` treatment.

### Historical documents are not rewritten
**Source:** D-40-09 (path-reference rewriting confined to live, forward-read documents);
D-40-13 (errata, not in-place edit, for `38-WALK-SURFACES.md`).
**Apply to:** every archived phase document (28-35) — leave `.planning/phases/{28..35}/…` string
references exactly as written inside those documents once archived; only rewrite the same strings
inside `ROADMAP.md`, `REQUIREMENTS.md`, `STATE.md`, `MILESTONES.md`, and phase 36-40 directories.

### Sequencing constraint (load-bearing)
Phase 28's row + `Complete (retro-documented, outside workflow)` flag (D-40-07) must land BEFORE
the fresh v1.6 audit runs (D-40-01), which must complete BEFORE the `MILESTONES.md` entry is
written (D-40-02 feeds the audit's findings into the entry's known-gaps section). This is a plan
**ordering** constraint, not a pattern to copy, but it governs how the phase's plans must be waved.

---

## No Analog Found

| File | Shape | Reason |
|---|---|---|
| `38-WALK-SURFACES.md` HOUSE-06 errata block | dated errata block | No errata-block convention exists anywhere in `.planning/`. Closest reusable discipline is the amend-in-place parenthetical (Pattern 6), adapted to block form. Planner should design the exact shape; a starting draft is offered in Pattern 10 above. |
| "Superseded" header/rename for the stale `v1.6-MILESTONE-AUDIT.md` | supersession marker | No prior audit file in this repo has ever been marked superseded. `v1.1-` and `v1.4-MILESTONE-AUDIT.md` are each the only audit their milestone ever got. D-40-03 explicitly leaves the exact form to discretion; reuse the amend-in-place dated-parenthetical discipline rather than inventing a third convention. |

## Metadata

**Analog search scope:** `.planning/MILESTONES.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`,
`.planning/STATE.md`, `.planning/milestones/*.md`, `.planning/milestones/v1.5-phases/`,
`.planning/v1.6-MILESTONE-AUDIT.md`, `.planning/v1.8-MILESTONE-AUDIT.md`,
`.planning/phases/38-shell-dialogs-visual-conventions/38-WALK-SURFACES.md`,
`tests/_planning-docs.ts`, `tests/planning-docs-resolver.test.ts`,
`src/components/proposal/ProposalForm.tsx`, `src/lib/calc/schema.ts`,
`app/(authed)/proposals/new/parametres/ParametresFormCard.tsx`,
`app/(authed)/proposals/new/_components/RecapSection.tsx`,
`src/components/proposals/DuplicatePrefillToast.tsx`,
`app/(authed)/proposals/new/parametres/page.tsx`, `app/(authed)/proposals/new/parametres/WizardStep1Wiring.tsx`.
**Files scanned:** ~20 read directly (full or targeted ranges), plus grep sweeps across `src/`, `app/`, `tests/`, `.planning/`.
**Pattern extraction date:** 2026-09-07

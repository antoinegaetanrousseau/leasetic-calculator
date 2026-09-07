# Phase 40: Milestone Record Closure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-07
**Phase:** 40-milestone-record-closure
**Areas discussed:** Todo cross-reference, v1.6 audit re-run, MILESTONES.md + snapshots, Archive mechanics, HOUSE-05 / HOUSE-06

---

## Todo Cross-Reference

**Question:** One pending todo matches this phase: WR-07 — "Harden the DB guard's NODE_ENV=test SKIP rule" (from 39-REVIEW). Fold it into Phase 40?

| Option | Description | Selected |
|--------|-------------|----------|
| Don't fold — keep pending | WR-07 is a behavioural change to production paths (local tests, MIGRATE PROD, CI ephemeral branches); its own todo says it should land as its own reviewed change with the CI paths exercised | ✓ |
| Fold it in | Plan the narrow skip-rule fix in `_db-branch-guard.ts` + `check-local-db-branch.sh` in one edit | |
| Fold as record-only | Don't change the guard, but record the deferral and rationale in the ledger | |

**User's choice:** Don't fold — keep pending.
**Notes:** Recorded in CONTEXT.md `<deferred>` § Reviewed Todos with the match score (0.6) and the reason. Phase 40 exercises no CI path.

---

## v1.6 Audit Re-Run

**Question 1:** How should the v1.6 audit be re-run against the finished milestone?

| Option | Description | Selected |
|--------|-------------|----------|
| Fresh `/gsd-audit-milestone` run | Real audit agent against v1.6's finished state; costs a full pass and may surface findings, but is the only version that measures rather than asserts | ✓ |
| Dated addendum to the existing audit | Keep the 2026-09-01 body, append corrected scores derived by hand from phase SUMMARY/VERIFICATION files | |
| Fresh run, then merge into one file | Run the agent, fold output into the existing file as a revision | |

**User's choice:** Fresh `/gsd-audit-milestone v1.6` run.
**Notes:** The existing audit scores 14/31 requirements and 2/6 phases, and states "Phase 31 does not exist" — Phase 31 shipped 8/8 the following day, then 33 (9/9) and 34 (13/13). Nearly every number in it is stale. → D-40-01.

**Question 2:** If the fresh v1.6 audit surfaces new gaps, what happens to them?

| Option | Description | Selected |
|--------|-------------|----------|
| Record as known-gaps-at-close | Tabulated in the MILESTONES.md entry; v1.6 closes regardless; Phase 40 grows no engineering tail | ✓ |
| File as new requirements into a future milestone | Numbered requirements pointing at v1.9+ | |
| Triage by severity, then split | Critical blocks the close and is fixed here; Warning/Info recorded | |

**User's choice:** Record as known-gaps-at-close.
**Notes:** Matches the section convention already used by the v1.0, v1.1 and v1.4 entries. Keeps Phase 40's size knowable before the audit returns. → D-40-02.

**Question 3:** Where should the v1.6 audit files end up?

| Option | Description | Selected |
|--------|-------------|----------|
| New audit → `milestones/`, stale one superseded there too | Both beside v1.1 and v1.4; the 2026-09-01 file marked superseded, not deleted; root keeps only v1.8's | ✓ |
| New audit replaces the stale file in place at root | Overwrite, move during the archive step | |
| Leave locations alone, just re-run | Treat the root-vs-`milestones/` split as outside the nine requirements | |

**User's choice:** New audit → `milestones/`, stale one superseded there too.
**Notes:** Surfaced during scouting — the v1.1 and v1.4 audits live in `.planning/milestones/` while v1.6's sits at `.planning/` root. → D-40-03.

---

## MILESTONES.md + Snapshots

**Question 1:** MILESTONES.md is missing entries for v1.2, v1.3 AND v1.6. How much do we backfill?

| Option | Description | Selected |
|--------|-------------|----------|
| v1.6 only — note the other two | Write v1.6, add a dated line recording that v1.2/v1.3 have no entry so the omission is visible | ✓ |
| Backfill all three | Most complete, but v1.2/v1.3 shipped in May and reconstructing them means mining ~30 phase summaries | |
| v1.6 only, say nothing about the others | Strictly the nine requirements | |

**User's choice:** v1.6 only — note the other two.
**Notes:** Criterion 1 names only v1.6; the v1.2/v1.3 gap was found during scouting (entries run v1.7 → v1.5 → v1.4 → v1.1 → v1.0). → D-40-04, and the backfill is carried in `<deferred>`.

**Question 2:** What should `milestones/v1.6-ROADMAP.md` contain?

| Option | Description | Selected |
|--------|-------------|----------|
| v1.6-scoped extract, dated as a reconstruction | Phases 29, 30, 31, 31.1, 33, 34 (32 removed), headed as reconstructed 2026-09-07 from the post-close roadmap | ✓ |
| Full ROADMAP.md snapshot, matching v1.7 | Consistent with precedent, but embeds v1.7/v1.8 phases in a file named v1.6 | |
| Scoped extract + reconstruct v1.7's pair too | Fixes both; v1.7 isn't in Phase 40's requirements | |

**User's choice:** v1.6-scoped extract, dated as a reconstruction.
**Notes:** The v1.7 MILESTONES.md entry's Archive note already flags its own snapshots as full-tree rather than scoped. This decision declines to repeat that. → D-40-05; re-scoping v1.7 deferred.

**Question 3:** What happens to v1.6's section in the live ROADMAP.md after snapshotting?

| Option | Description | Selected |
|--------|-------------|----------|
| Flip the header to shipped, keep the section | Header agrees with line 11; section and progress rows stay; the snapshot is a copy, not a move | ✓ |
| Flip header and trim the section to a pointer | Shorter roadmap, but breaks line references into that section | |
| Flip header, and audit every other milestone header too | Same, plus a sweep of v1.0–v1.5 and v1.7 for the same contradiction | |

**User's choice:** Flip the header to shipped, keep the section.
**Notes:** ROADMAP.md:102 headers v1.6 as "🚧 IN PROGRESS" while line 11 lists it shipped 2026-09-04. Several planning docs cite ROADMAP.md by line number. → D-40-06.

---

## Archive Mechanics

**Question 1:** Which milestone does Phase 28 get attributed to?

| Option | Description | Selected |
|--------|-------------|----------|
| v1.6, flagged as pre-roadmap baseline | Status `Complete (retro-documented, outside workflow)`, no plan count; the flag stops the fresh audit reading it as a phase that lost its plans | ✓ |
| Its own row — milestone "none / pre-v1.6" | Most literally true, but leaves the archive step with nowhere to put the directory | |
| v1.5 | Chronologically follows v1.5's close, but v1.5 shipped 2026-05-30 and the work is August | |

**User's choice:** v1.6, flagged as pre-roadmap baseline.
**Notes:** Phase 28 is 23 commits on `migration/phase-0-baseline`, executed outside GSD and retro-documented 2026-08-31 at v1.6 kickoff, deliberately with no PLAN or VERIFICATION files. The flag interacts with D-40-01 — hence the sequencing constraint in CONTEXT.md `<specifics>`. → D-40-07.

**Question 2:** How should phases 28-35 physically move?

| Option | Description | Selected |
|--------|-------------|----------|
| `git mv` by hand, per explicit phase→milestone map | Map written first; history follows the files; the known CLI mis-attribution bug cannot bite | ✓ |
| Use the archiving CLI, then verify and correct | Faster, but re-runs a tool with a recorded defect and makes the correction load-bearing | |
| `git mv` by hand, and fix the CLI too | Correct long-term, but the CLI lives in the GSD toolchain, not this repo | |

**User's choice:** `git mv` by hand, per explicit phase→milestone map.
**Notes:** The v1.7 entry records that the archiving CLI "attributed every phase on disk to this milestone", producing the retracted 19 phases / 97 plans / 178 tasks figures. Neither `v1.6-phases/` nor `v1.7-phases/` exists yet. → D-40-08; the CLI fix is deferred.

**Question 3:** The move breaks ~590 path references in planning prose. How much rewriting?

| Option | Description | Selected |
|--------|-------------|----------|
| Rewrite live docs only, leave archived prose | ROADMAP/REQUIREMENTS/STATE/MILESTONES + v1.8 phase dirs; archived docs keep original text as dated historical records | ✓ |
| Rewrite every reference | Nothing dangling, but touches hundreds of committed historical documents and buries the real diff | |
| Rewrite nothing, add a redirect note | Smallest diff, relies on every future reader finding the note | |

**User's choice:** Rewrite live docs only, leave archived prose.
**Notes:** `tests/_planning-docs.ts` already carries an archive-resilient resolver written in anticipation of CLOSE-07, so the machine-readable references are safe either way. Two references (`.planning/phases/30-crm-foundation`) are already stale today. → D-40-09.

---

## HOUSE-05 / HOUSE-06

**Question 1:** Delete the dead `ProposalForm` component, or record why it's retained?

| Option | Description | Selected |
|--------|-------------|----------|
| Delete the component, keep the Provider | Remove `ProposalForm` + action row, keep `ProposalFormProvider` and shared types, fix the four stale line-number citations in the same edit | ✓ |
| Keep it, record why | Header comment stating it is intentionally unrendered; amend HOUSE-05's text | |
| Delete, and re-point the citations at what's live | Rewrite the four comments to cite `ParametresFormCard` / `WizardStep1Wiring` | |

**User's choice:** Delete the component, keep the Provider.
**Notes:** Verified during discussion — 557-line file; `ProposalFormProvider` (L41-84) imported by `parametres/page.tsx:52` and mounted at `:288`; `ProposalForm` (L109→) rendered nowhere. Four live files cite the file by line number, which is what makes retaining it worse than deleting. → D-40-10, D-40-11, D-40-12.

**Question 2:** How is `38-WALK-SURFACES.md` Table 1 corrected, given 38-* is a completed phase's record?

| Option | Description | Selected |
|--------|-------------|----------|
| Dated errata block, table row annotated | Original text stays readable; errata covers all four sites | ✓ |
| Rewrite Table 1 in place | Cleanest to read, but silently edits the record a reader uses to judge whether the walk was sound | |
| Errata block, and re-open the sites for verification | Also file a follow-up to observe them against a multi-page dataset | |

**User's choice:** Dated errata block, table row annotated.
**Notes:** Same discipline as D-40-09's treatment of archived prose. All four sites covered, not the two HOUSE-06 names. → D-40-13, D-40-14; the multi-page verification is deferred.

**Question 3:** How does December stay tracked once OPS-03 is ticked?

| Option | Description | Selected |
|--------|-------------|----------|
| Tick OPS-03, open a dated todo for December | The requirement closes on "or … formally re-dated with a decision"; a pending todo carries the date and Antoine's provisioning step | ✓ |
| Tick it, record the date in STATE.md only | No new artifact, but STATE.md's deferred list already carries eight inherited items | |
| Tick it and file a v1.9 requirement | Most durable, but targets a milestone that doesn't exist | |

**User's choice:** Tick OPS-03, open a dated todo for December.
**Notes:** Consistent with how WR-07 is being carried. → D-40-15.

---

## Claude's Discretion

- Wording of every corrected requirement and criterion text — explicitly handed forward from 39-CONTEXT.md's Claude's Discretion section marked `[→ PHASE 40]`.
- Section shape and heading level of the v1.6 MILESTONES.md entry, provided it carries known-gaps-at-close.
- Whether the superseded 2026-09-01 audit is renamed or keeps its name with a superseded header.
- Plan sequencing and wave structure, subject to the Phase-28-row-before-audit ordering constraint.
- Errata block placement within `38-WALK-SURFACES.md`.

## Deferred Ideas

- Backfill v1.2 and v1.3 MILESTONES.md entries.
- Re-scope v1.7's full-tree snapshot pair into milestone-scoped extracts.
- Fix the GSD archiving CLI's phase-attribution bug (different codebase).
- Observe the four pagination controls against a multi-page dataset.
- Build a mechanical requirement-ledger drift check (first deferred in Phase 39, deferred again).
- December 2026 OVH cutover — carried as a pending todo, not an open requirement.
- WR-07 DB-guard skip-rule hardening — reviewed, not folded.

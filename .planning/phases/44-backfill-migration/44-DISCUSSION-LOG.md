# Phase 44: Backfill Migration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-09
**Phase:** 44-backfill-migration
**Areas discussed:** Old-document retention, Live-read content deltas, Row scope,
Idempotence signal, Figure provenance, Run venue, Failure policy, Dry-run report shape,
Report hand-off

---

## Old-document retention

| Option | Description | Selected |
|--------|-------------|----------|
| Sidecar copy, kept | Copy the blob to `proposals/{userId}/{id}.pre-v19.pdf` before overwriting. Operator-only, roughly doubles PDF storage, preserves the exact document a client received. | |
| No copy — irreversible as scoped | One render, one put. Matches the ROADMAP wording literally. Once run, the retired layout exists nowhere. | ✓ |
| Sidecar copy, then purge | Keep a copy and add a follow-up cleanup after a verification window. Reversible during the window, at the cost of a second operator task. | |

**User's choice:** No copy — irreversible as scoped.
**Notes:** Raises the stakes on the dry-run, which becomes the only safety net. Fed
directly into the later choice to enforce a drift check (D-09) and to make the approval
gate part of the same run as the apply (D-08).

---

## Live-read content deltas

| Option | Description | Selected |
|--------|-------------|----------|
| Accept, and report the blast radius | Re-render with today's values; dry-run counts and lists the proposals whose advisor or partner phone would change. | |
| Accept silently | Advisor and phone are live-by-design per 43 D-13 and PROF-03, so a change is correct behaviour, not a delta worth reporting. | ✓ |
| Skip rows that would change | Leave those proposals in the retired layout. Flagged during the question as breaking the phase goal and success criterion 2. | |

**User's choice:** Accept silently.
**Notes:** Removes the need for any delta-detection machinery in the dry-run. Recorded in
CONTEXT.md as D-02 with an explicit "build no delta detection" instruction so a planner
does not add it back as a well-meaning extra.

---

## Row scope

| Option | Description | Selected |
|--------|-------------|----------|
| active + deleted | Include soft-deleted rows; a restore inside the 30-day window would otherwise resurrect a retired-layout document. | ✓ |
| active only | Migrate what's live; soft-deleted rows are heading for purge anyway. | |
| active + deleted, excluding expired-window rows | Include only soft-deleted rows still inside the restorable window. | |

**User's choice:** active + deleted, with no `deleted_at` window filter.
**Notes:** Drafts are excluded structurally — they hold no blob.

---

## Orphaned blobs

| Option | Description | Selected |
|--------|-------------|----------|
| Report as its own category, then render | Render repairs the row; counted separately so the pre-existing data problem stays visible. | |
| Report as a failure, skip | Treat a missing blob as an anomaly for the operator to decide on. | |
| Render it, no special reporting | The script renders whatever the row says it should have; simplest path. | ✓ |

**User's choice:** Render it, no special reporting.
**Notes:** Trades the storage-drift signal for a simpler loop with no branch.

---

## Idempotence signal (MIG-05)

| Option | Description | Selected |
|--------|-------------|----------|
| audit_log row per migrated proposal | `action='proposal.pdf_backfill'`; a re-run left-joins and skips. No schema change, and it doubles as the audit trail. | ✓ |
| New column via a drizzle migration | `pdf_design_version` / `pdf_backfilled_at`. Most explicit, but needs a MIGRATE PROD run before the backfill can run at all. | |
| `pdf_generated_at` cutoff | Zero cost, no new state; fragile across runs and cannot distinguish migrated from recently created. | |

**User's choice:** audit_log row.
**Notes:** The question was framed on a verified constraint: `src/lib/pdf/render.ts:19`
documents that `pdf_sha256` varies per render because the React Fiber scheduler reorders
PDF objects, so a byte hash cannot answer "already migrated?". Requires a new
`AuditAction` union member.

---

## Figure provenance (MIG-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Print the stored `computed` jsonb verbatim | Nothing recomputes, so no figure can move. `params_snapshot` is then never read at render — the guarantee is transitive. | ✓ |
| Replay `computeLoyer` from `params_snapshot`, abort on mismatch | Literal reading of MIG-04; proves the snapshot is self-sufficient, but a mismatch blocks the run. | |
| Replay, use the replay result, report mismatches | Truest to the wording — and the only option that can change a number on a document a client already holds. | |

**User's choice:** Stored `computed` verbatim.
**Notes:** Grounded on a check made during the discussion: `buildComputedJson` and
`buildPdfComputed` (`finalize-wizard.ts:89` / `:116`) emit identical field sets, so the
stored jsonb feeds the document prop directly. The transitive-satisfaction nuance is
recorded in CONTEXT.md as an explicit interpretation note so verify-phase does not read
the absent `params_snapshot` read as a gap.

---

## Run venue

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub Action, workflow_dispatch | Mirrors `db-migrate.yml`; the guard's SKIP rule fires in a fresh checkout, which is this repo's sanctioned production-write path. | ✓ |
| Action for prod, plus a local rehearsal | Same Action, but the script must also run against the Neon development branch first on seeded rows. | |
| Local run with a production override | Fastest to build; punches a hole in the Phase 39 guard that outlives the phase. | |

**User's choice:** GitHub Action, workflow_dispatch.
**Notes:** The question was raised because the ROADMAP's "behind the local-database guard"
and the location of the real data are in tension — `_load-env` arms
`assertSafeDatabaseTarget`, which classifies Neon `main` as `refuse-production` and
exits(1), so a laptop with `.env.local` cannot run apply at all. CONTEXT.md records the
resolution as an interpretation note on MIG-02 plus an explicit prohibition on adding a
guard bypass.

---

## Failure policy

| Option | Description | Selected |
|--------|-------------|----------|
| Log and continue, exit non-zero if any failed | Same best-effort shape as `purge-soft-deleted.ts`; failures are exactly what a re-run retries. | ✓ |
| Abort on first failure | Maximum caution, but turns a transient blob-write failure into a half-done run. | |
| Continue, but abort past a failure threshold | Tolerates isolated failures, stops on systemic breakage — at the cost of choosing a threshold value. | |

**User's choice:** Log and continue, non-zero exit if any row failed.
**Notes:** De-risked by the dry-run already rendering every row, so systemic failures
surface before apply.

---

## Dry-run report shape

| Option | Description | Selected |
|--------|-------------|----------|
| Report file + drift check on apply | The `reconcile-proposals.ts` D-15 pattern: apply re-plans, diffs against the approved report, refuses on drift with an `--allow-drift` escape. | ✓ |
| Console output only | Least machinery; nothing enforces that the world hasn't changed between approval and apply. | |
| Report file, but apply doesn't read it | An artifact to diff by hand; enforcement stays manual. | |

**User's choice:** Report file + drift check.
**Notes:** Chosen in light of the earlier no-sidecar decision — with no rollback, the
approved plan and the executed plan need to be provably the same.

---

## Report hand-off

| Option | Description | Selected |
|--------|-------------|----------|
| One run, two jobs, approval gate between | Dry-run job uploads the report artifact, an Environment required-reviewer gate pauses, the apply job downloads that exact artifact. | ✓ |
| Two dispatches, artifact hand-off | Apply takes the dry-run's run-id as an input; reviewable at leisure, but a stale run-id is possible. | |
| Dry-run commits the report to the repo | Durable and diffable in git history, at the cost of a bot commit to main per dry-run. | |

**User's choice:** One run, two jobs, approval gate between.
**Notes:** This question only arose because the GitHub Action choice broke
`reconcile-proposals.ts`'s assumption that dry-run and apply share a filesystem. The
approval click also becomes MIG-02's explicit confirmation, so no separate typed-string
input is strictly required.

---

## Claude's Discretion

- Render-loop batch size; serial vs bounded-concurrency processing.
- Report format and path (reconcile's `.md` + `.json` two-form output is precedent, not a mandate).
- The Action's confirm-input token wording, and whether a typed input is used at all given
  the Environment gate.
- Progress-logging cadence.
- Per-row detail in the dry-run report beyond MIG-01's required count and failing list.
- Test strategy, including exercising the render loop without a live blob store.

## Deferred Ideas

- Snapshotting advisor + partner phone onto the proposal row for full reproducibility —
  would reverse 43 D-13 / PROF-03 and needs a schema change. Own phase.
- A per-run row-count ceiling as a blast-radius cap — considered, not adopted; the dry-run
  count plus the approval gate already put a human in the loop.
- Re-rendering a single proposal on demand from the admin UI — already in REQUIREMENTS.md
  § Future Requirements.
- Persisting `contentHash` as a column to give future bulk re-renders a content-level
  idempotence signal.

### Todos reviewed, not folded

- `ops-03-ovh-cutover-december-2026` — infrastructure portability; unrelated to this phase.
- `wr-07-db-guard-skip-rule` — changing the guard is out of scope per D-07, and D-07
  depends on the SKIP rule this todo would alter.

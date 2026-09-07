# Phase 40 — Archive Map (CLOSE-07)

**Written:** 2026-09-07, before any `git mv` in this plan.

The GSD archiving CLI is **deliberately not used** for this move. The v1.7 `MILESTONES.md` entry's
own Archive note records that the CLI "attributed every phase on disk to this milestone",
producing the wrong 19 phases / 97 plans / 178 tasks figures that entry had to retract. Phases
move by hand `git mv` against this explicit phase→milestone map, written first.

## Phase → Milestone Map

| Source | Destination | Milestone | Pre-move file count |
|---|---|---|---|
| `.planning/phases/28-reui-design-system-migration` | `.planning/milestones/v1.6-phases/28-reui-design-system-migration` | v1.6 | 2 |
| `.planning/phases/29-migration-safety-net` | `.planning/milestones/v1.6-phases/29-migration-safety-net` | v1.6 | 10 |
| `.planning/phases/30-company-contact-registry` | `.planning/milestones/v1.6-phases/30-company-contact-registry` | v1.6 | 24 |
| `.planning/phases/31-reconciliation-engine-proposal-extraction` | `.planning/milestones/v1.6-phases/31-reconciliation-engine-proposal-extraction` | v1.6 | 22 |
| `.planning/phases/31.1-app-shell-refresh` | `.planning/milestones/v1.6-phases/31.1-app-shell-refresh` | v1.6 | 20 |
| `.planning/phases/33-pipeline` | `.planning/milestones/v1.6-phases/33-pipeline` | v1.6 | 24 |
| `.planning/phases/34-fiche-client` | `.planning/milestones/v1.6-phases/34-fiche-client` | v1.6 | 32 |
| `.planning/phases/35-sales-motivation` | `.planning/milestones/v1.7-phases/35-sales-motivation` | v1.7 | 17 |

All eight counts were measured 2026-09-07 via `ls <source> | wc -l` immediately before this file
was written, and matched the counts the plan predicted exactly — no discrepancy to record.

The same three values (`slug`, `milestone`, `pre_move_file_count`) were also written to
`/tmp/40-archive-map.tsv` for the single scripted verification pass over all eight directories.

**Phase 28 legitimately has fewer files than its siblings** — two: a `CONTEXT` and one `SUMMARY`.
It was executed outside GSD (23 commits on `migration/phase-0-baseline`) and retro-documented at
v1.6 kickoff (D-40-07). It deliberately has no `PLAN` or `VERIFICATION` file. This is the correct
shape for that one phase, not a mistake to fix, and nothing was fabricated to fill the gap.

## Move mechanics

One `git mv <source> <destination>` per row, whole directory, preserving every file inside. All
eight source directories are fully tracked, so `git mv` is the correct tool — no copy-then-delete,
no GSD archiving CLI, no pruning or summarizing of any file on the way.

`.planning/phases/36|37|38-*/3N-VALIDATION.md` are currently untracked and belong to phases that
are not moving — they are unaffected by this move and were not staged or moved.

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

## Path-reference rewrite disposition

**D-40-09 predicate applied:** path-reference rewriting is confined to live, forward-read
documents — after the 2026-09-07 amendment to D-40-09 in `40-CONTEXT.md`, that means
`ROADMAP.md`, `REQUIREMENTS.md`, `STATE.md`, `MILESTONES.md`, Phase 40's own live documents, and
any forward-read reference inside phases 36-39. Already-executed PLAN/SUMMARY/VERIFICATION/
PATTERNS records inside phases 36-39 are explicitly excluded.

**Measurement command:**
```
grep -rn '\.planning/phases/\(2[89]\|3[0-5]\)' .planning/ROADMAP.md .planning/REQUIREMENTS.md \
  .planning/STATE.md .planning/MILESTONES.md .planning/phases/
```

**Totals (measured 2026-09-07, after Task 1's move and Task 2's test repairs):**

| Location | Hits | Files | Disposition |
|---|---|---|---|
| `.planning/ROADMAP.md` | 1 (line ~746) | 1 | Rewritten → `milestones/v1.6-phases/33-pipeline/33-CONTEXT.md` |
| `.planning/STATE.md` | 1 (line ~45) | 1 | Rewritten → dated note pointing at this map |
| `.planning/REQUIREMENTS.md` | 0 | 0 | n/a |
| `.planning/MILESTONES.md` | 0 in the moved range | 0 | n/a (the v1.7 entry's Archive note is a dated close record, corrected via the v1.6 entry in plan 40-05, not edited — see `git diff .planning/MILESTONES.md` being empty for this task) |
| `.planning/phases/36-gate-repair-planning-record-hygiene/` | 97 | 10 | Left as-is — already-executed PLAN/SUMMARY/VERIFICATION/PATTERNS records |
| `.planning/phases/37-crm-stack-closure/` | 102 | 11 | Left as-is — already-executed PLAN/SUMMARY/VERIFICATION/PATTERNS records |
| `.planning/phases/38-shell-dialogs-visual-conventions/` | 23 | 4 | Left as-is — already-executed PLAN/SUMMARY/VERIFICATION/PATTERNS records |
| `.planning/phases/39-database-guard-correctness/` | 0 | 0 | n/a |
| `.planning/phases/40-milestone-record-closure/` | 36 | 7 | Left as-is — see breakdown below |
| **Total rewritten** | **2** | **2** | |
| **Total left as-is** | **256** | **31** | |
| **Grand total (population)** | **258** | **32** | |

This total (258 hits / 32 files) differs from the 225-hits/21-files figure D-40-09's amendment
cites as the planning-time measurement. The difference is Phase 40's own artifacts that did not
exist at planning time: `40-06-PLAN.md` itself (21 hits — the plan text describing the git-mv
map, written before the move) and this file, `40-ARCHIVE-MAP.md` (8 hits — an explicit before/
after table, created by this plan's Task 1). Both are named below.

**Phase 40's own 36 hits / 7 files, none rewritten:**

| File | Hits | Why left as-is |
|---|---|---|
| `40-01-PLAN.md` | 2 | Already-executed dated record — accurate to the pre-move layout at the time plan 40-01's acceptance criteria ran |
| `40-03-PLAN.md` | 2 | Same — dated record accurate to plan 40-03's execution time |
| `40-06-PLAN.md` | 21 | This plan's own text, describing the git-mv map as instructions to execute against the pre-move layout — not a forward pointer that must stay resolvable |
| `40-ARCHIVE-MAP.md` (this file) | 8 | Deliberately lists both the old and new path per row — that is the point of an archive map, not a stale reference |
| `40-CONTEXT.md` | 1 | The pre-existing stale `30-crm-foundation` mention (below), not the D-40-09 original sentence (which uses `{28..35}` brace notation and does not match this grep pattern) |
| `40-DISCUSSION-LOG.md` | 1 | Same pre-existing stale `30-crm-foundation` mention |
| `40-PATTERNS.md` | 1 | Same pre-existing stale `30-crm-foundation` mention |

**Two known pre-existing stale references, explicitly not this phase's job:**
- `.planning/phases/30-crm-foundation` — the real directory is `30-company-contact-registry`; it
  was already wrong before this move, and D-40-09 flags it as out of scope.
- Source-code comments citing moved phase documents: `src/lib/db/queries/reconciliation.ts:19`,
  `src/db/schema.ts:376`, `scripts/probe-write-isolation.ts:19`. D-40-09 confines rewriting to
  planning documents, so these are named here rather than edited. No file under `src/`, `app/` or
  `scripts/` was modified by this plan.


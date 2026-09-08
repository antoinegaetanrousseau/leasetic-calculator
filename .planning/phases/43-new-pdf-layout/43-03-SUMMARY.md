---
phase: 43-new-pdf-layout
plan: 03
subsystem: i18n
tags: [i18n, dictionaries, claude-design, doc-06, vitest]

# Dependency graph
requires:
  - phase: 43-new-pdf-layout
    provides: "plan 43-01's DOC-03 amendment in REQUIREMENTS.md — the contact-card copy here implements the reconciled requirement text, not the retracted D-16 clause"
provides:
  - "The full pdf.* FR/EN key set for the Claude Design layout — header, pills, both cards, financial table, conditions title, acceptance block and legal footer, sourced verbatim from Quote-FR-A.dc.html and Quote-EN-A.dc.html"
  - "pdf.validity.caption re-valued to the design's paragraph with {1} interpolating the proposal's real validityDays (DOC-06's deliberate deviation from both design files' hardcoded 30)"
  - "A written ledger in dictionaries.ts routing each of the five layout-orphaned keys to the plan that deletes it alongside its last consumer — three to 43-05, two to 43-06"
  - "Phase 43 exact-string pinning tests and a phase-FINAL key-count floor that does not go red when 43-05/43-06 remove the orphan group"
affects: [43-05, 43-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Deletion-by-ledger: a key whose consumer outlives this plan is annotated in place with the plan id that removes it, never deleted early — DictKey is `keyof typeof dictionaries.fr`, so an early deletion is a compile error in the surviving t() call AND in the DictKey[]-typed phase8Keys/twoArgKeys arrays"
    - "Key-count floors are set to the phase-final count, not the post-addition count, so a later plan's planned deletions cannot drive the assertion under its own floor"

key-files:
  created: []
  modified:
    - src/lib/i18n/dictionaries.ts
    - src/lib/i18n/dictionaries.test.ts

key-decisions:
  - "The floor derivation is recorded in the test's own name rather than a side comment: 1078 measured immediately after Task 1, minus 6 (the five Phase-43 orphans plus pdf.project.ref.prefix) = 1072. A future reader who changes the key count can see what the number means without archaeology."
  - "pdf.validity.caption was re-valued rather than replaced by a new pdf.conditions.body key. It already carried the {0} validUntil / {1} validityDays two-argument shape DOC-06 needs and is already pinned in twoArgKeys, so re-valuing preserved both the interpolation contract and its existing test coverage."
  - "The three pdf.partnerType.* pairs are retained and annotated with D-02 as the reason they have no PDF consumer, rather than deleted. CONTEXT.md's Deferred Ideas lists translating partnerType on the admin and partner web surfaces as a live later decision; deleting the pairs now would have to be undone by that work."

patterns-established:
  - "Ledger comments carry the routing plan id (`43-05` / `43-06`) as a literal string, so the receiving plan's acceptance criteria can grep-count them (6 and 4 respectively) and prove nothing was deleted early or left behind."

requirements-completed: []  # DOC-02/03/05/06/07/08/10 in this plan's frontmatter mark relevance, not closure. This plan writes no rendering code — the strings exist but nothing renders them until 43-05 and 43-06. Each requirement's criterion is "the PDF shows …", which is unsatisfiable from a dictionary alone.
---

## Provenance

**This summary was reconstructed by the execute-phase orchestrator, not written by the executor.**

The executor for 43-03 was interrupted after committing both of its tasks but before the
`git_commit_metadata` step, leaving production commits on disk with no SUMMARY.md — the
`safe_resume_gate` condition. Rather than re-executing (which would have discarded ~110 lines of
correct, gate-green work for no defect), the operator chose manual closeout. Every claim below was
verified against the committed source and a live test run, not inferred from the plan text.

## Performance

- Task 1 committed 21:39:24Z, Task 2 committed 21:44:50Z — ~5.5 min of executor work
- Closeout performed by the orchestrator at 21:50Z

## Accomplishments

- ~50 new `pdf.*` FR/EN pairs land the Claude Design layout's complete copy: the header eyebrow and
  `Établie le` line, the `Réf. partenaire` and term pills, both card titles and every key label,
  the five financial-table rows including `Total des loyers HT`, `CONDITIONS`, the acceptance block
  (`Fait à` / `Le` / `Nom et qualité du signataire` / `Signature` / `Cachet de l'entreprise`), and
  the two-line legal footer.
- `pdf.validity.caption` re-valued in both languages to the design's conditions paragraph, with
  `{1}` carrying the proposal's actual `validityDays` — DOC-06's one deliberate departure from the
  design files, both of which hardcode "(30 jours)" / "(30 days)".
- The five layout-orphaned keys are ledgered, not deleted. 10 `Phase 43 orphan` comments (5 keys ×
  2 language blocks), 6 routing to 43-05, 4 routing to 43-06.
- The `pdf.partnerType.*` D-02 annotation explains, at the keys themselves, why they survive with
  no consumer.

## Task Commits

- `0511477` — feat(43-03): add Claude Design layout FR/EN copy to dictionaries.ts
- `bb9abe6` — test(43-03): ledger orphaned pdf.* keys and pin the Claude Design copy

## Files Created/Modified

- `src/lib/i18n/dictionaries.ts` — +112/−6 then +40/−10; new `pdf.*` namespace, `pdf.validity.caption`
  re-valued, ledger and D-02 annotations
- `src/lib/i18n/dictionaries.test.ts` — +57/−3; Phase 43 exact-string block, annotated D-02 orphan
  test, key-count floor raised to the phase-final 1072

## Decisions Made

See `key-decisions` in the frontmatter. The substantive one is the key-count floor: setting it to
1072 (phase-final) rather than 1078 (post-Task-1) is what stops 43-05's and 43-06's planned
deletions from turning this assertion red the moment they run.

## Deviations from Plan

None. Both tasks executed as written, including the plan's central constraint that this plan deletes
no dictionary key.

## Issues Encountered

The interruption itself. Nothing in the code was affected — the working tree was clean at the point
of interruption, both task commits were complete and atomic, and no partial edit survived.

## Verification (re-run at closeout)

| Gate | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm run lint:check` (`--max-warnings=0`) | pass |
| `npx vitest run src/lib/i18n/` | 414 passed (2 files) |

`must_haves.truths`, checked against committed source rather than assumed:

| Truth | Evidence |
|---|---|
| Every label exists as an FR/EN pair from the design files | `pdf.card.client.title` present ×2; ~100 `pdf.*` entries across both blocks |
| Conditions paragraph interpolates real `validityDays` | `pdf.validity.caption` fr:491 / en:1873 both contain `({1} jours)` / `({1} days)` |
| EN paragraph spells the brand `Leasetic`, unaccented | 0 occurrences of the accented form anywhere in `dictionaries.ts` |
| Five orphans still present, each ledgered | all five return count 2; 10 orphan comments; 6× `43-05`, 4× `43-06` |
| Three `pdf.partnerType.*` pairs survive, D-02 annotated | annotation at `dictionaries.ts:549-555` |

`__pdf-fixtures__/render-fixtures.test.ts` remains red, as D-16 requires from 43-01 through 43-06.
It was not regenerated.

## User Setup Required

None.

## Next Phase Readiness

43-05 and 43-06 inherit the ledger. 43-05 deletes `pdf.tagline`, `pdf.section.project` and
`pdf.ref.label` (plus `pdf.project.ref.prefix` if it proves unreferenced) in the same diff as the
`t()` calls it removes from `document.tsx`; 43-06 deletes `pdf.section.interests` and
`pdf.footer.left` plus the `twoArgKeys` entry for the latter. Neither may touch the other's group —
both plans assert the other's keys are still present.

## Self-Check: PASSED

Reconstructed from committed source and a live gate run. No claim in this summary rests on the plan's
intent alone.

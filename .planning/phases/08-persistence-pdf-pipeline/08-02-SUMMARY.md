---
phase: 08-persistence-pdf-pipeline
plan: "08-02"
subsystem: i18n
tags: [i18n, dictionaries, fr, en, pdf, proposals, toast, copy]

requires:
  - phase: 07-calc-engine-port-proposal-form
    provides: "263-key bilingual dictionary + _EnHasAllFrKeys parity proof + t() helper"

provides:
  - "56 new bilingual i18n keys (FR + EN) covering: list-view, validity chips, detail page, action buttons, PDF preview, deleted-view banner/confirm, toasts, PDF document copy"
  - "Phase 8 parametric test suite (128 new assertions) with interpolation contract checks"

affects:
  - 08-05 (PDF render — pdf.* keys)
  - 08-09 (form submit — proposal.toast.submit.* keys)
  - 08-10 (detail page — proposal.detail.* keys)
  - 08-11 (list view — proposal.search.* + proposal.list.* + proposal.chip.* keys)
  - 08-12 (delete/restore — proposal.toast.delete/restore.* + proposal.detail.deleted.banner)
  - 08-13 (duplicate — proposal.toast.duplicate.prefilled)
  - 08-07 (server route — proposal.toast.submit.* for pipeline)

tech-stack:
  added: []
  patterns:
    - "Phase N parametric test block pattern: phase8Keys: DictKey[] + for...of loop → 2 assertions/key (FR + EN non-empty)"
    - "Interpolation contract tests: separate singleArgKeys/twoArgKeys arrays asserting {0}/{1} placeholder presence"
    - "Reuse table integrity tests: v10 keys documented as reused, verified to still resolve"

key-files:
  created: []
  modified:
    - src/lib/i18n/dictionaries.ts
    - src/lib/i18n/dictionaries.test.ts

key-decisions:
  - "5 v10 keys NOT redeclared (proposal.duree.label, proposal.duree.months, proposal.interests.slb, proposal.interests.eval, proposal.montant.label) — consumers reference them directly per UI-SPEC §7.9 reuse table"
  - "FR typography: U+2019 curly apostrophe in jusqu'au / d'origine / l'accord / D'INTÉRÊT; U+202F narrow-no-break-space before colon in pdf.section.interests + pdf.project.ref.prefix"
  - "EN proposal.confirm.delete uses straight single quotes (plan spec); FR uses guillemets « ... » with U+202F per French typography"
  - "EN pdf.validity.caption uses straight apostrophe in 'Leasétic's' (English typography convention)"

requirements-completed:
  - PROP-02
  - PROP-03
  - PROP-04
  - PROP-11
  - PROP-12
  - PROP-13
  - PROP-15
  - PROP-16
  - PROP-18
  - PROP-20
  - PROP-22
  - PROP-26

duration: 22min
completed: "2026-05-09"
---

# Phase 8 Plan 02: i18n Keys Summary

**56 new bilingual FR/EN i18n keys covering proposal list, detail, PDF preview, toasts, and PDF document copy — unblocking 6 downstream Wave 2-5 plans from JSXText lint failures**

## Performance

- **Duration:** 22 min
- **Started:** 2026-05-09T14:22:36Z
- **Completed:** 2026-05-09T14:44:41Z
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments

- Added 56 new keys × 2 languages to `dictionaries.ts` (319 keys per lang, up from 263)
- TypeScript `_EnHasAllFrKeys` compile-time parity proof verified intact after additions
- 128 new test assertions: 112 non-empty (56 × 2) + 8 single-arg interpolation + 3 two-arg interpolation + 5 reuse-table integrity
- Total test count grew from 227 to 355 (net +128; exceeds ≥120 requirement)
- Honoured 5 v10 key reuses per UI-SPEC §7.9 — no duplicate entries created

## Task Commits

1. **Task 1: Add Phase 8 keys to dictionaries.ts (FR + EN)** — `bc9dbed` (feat)
2. **Task 2: Extend dictionaries.test.ts with Phase 8 spot-check + interpolation contract** — `b43316b` (test)

**Plan metadata:** _(docs commit follows this SUMMARY)_

## Key Counts

| Metric | Before | After |
|--------|--------|-------|
| Keys per language | 263 | 319 |
| New keys this plan | — | 56 |
| Reused v10 keys (not redeclared) | — | 5 |
| Test count | 227 | 355 |
| New test assertions | — | 128 |

## Files Created/Modified

- `src/lib/i18n/dictionaries.ts` — Phase 8 block appended at end of both `fr` and `en` objects (155 lines added)
- `src/lib/i18n/dictionaries.test.ts` — Phase 8 parametric spot-check + interpolation contract + reuse table integrity (141 lines added)

## Reused v10 Keys (UI-SPEC §7.9)

These 5 keys already existed in the v10 dictionary with identical FR + EN values for the Phase 8 use case. Consumers (Plan 08-05 PDF render + Plan 08-10 detail computed card) reference them directly:

| Phase 8 candidate alias | Reused v10 key | FR value | EN value |
|-------------------------|----------------|----------|----------|
| pdf.computed.amount.label | proposal.montant.label | Montant financé HT | Financed amount (ex-VAT) |
| pdf.computed.duration.label | proposal.duree.label | Durée | Term |
| pdf.computed.duration.suffix | proposal.duree.months | mois | months |
| pdf.interests.slb | proposal.interests.slb | Sale & lease-back du parc | Sale & lease-back of the fleet |
| pdf.interests.eval | proposal.interests.eval | Évaluation du parc sortant | Valuation of the outgoing fleet |

## Decisions Made

- FR typography: curly apostrophe U+2019 in `jusqu'au`, `d'origine`, `l'accord`, `D'INTÉRÊT` — copied verbatim from UI-SPEC §7 spec strings
- U+202F narrow-no-break space before `:` in `pdf.section.interests` ("IDENTIFIÉS :") and `pdf.project.ref.prefix` ("partenaire :") — French typography convention
- U+00A0 non-breaking space before `?` in FR `proposal.confirm.delete` — French typography
- EN `proposal.confirm.delete` uses straight `'Show deleted'` (per plan spec; no typographic quotes in EN)
- EN `pdf.validity.caption` uses straight `'` in "Leasétic's" (English typography)

## Deviations from Plan

None — plan executed exactly as written. All 56 key values transcribed verbatim from UI-SPEC §7 FR/EN tables. Test block mirrors Phase 7's parametric pattern exactly.

## Known Stubs

None — this plan is pure copy data. No UI components or data sources wired.

## Threat Flags

None — `dictionaries.ts` adds only string literal entries. No new network endpoints, auth paths, file access patterns, or schema changes.

## Next Phase Readiness

- All 56 Phase 8 keys are available via `t()` in both FR and EN
- Plans 08-05 (PDF render), 08-07 (server route), 08-09 (form submit), 08-10 (detail), 08-11 (list), 08-12 (delete/restore), 08-13 (duplicate) can lint-clean reference these keys without hardcoded JSXText
- TypeScript's DictKey union type includes all new keys — consumers get compile-time autocomplete and catch typos

## Self-Check

Verified before writing this SUMMARY:

- `bc9dbed` present in git log: confirmed
- `b43316b` present in git log: confirmed
- `src/lib/i18n/dictionaries.ts` modified: confirmed (155 new lines)
- `src/lib/i18n/dictionaries.test.ts` modified: confirmed (141 new lines)
- `npm run typecheck` exits 0: confirmed
- `npm test` exits 0 with 355 tests passing: confirmed
- Each new key appears exactly 2 times (once FR, once EN): confirmed via `grep -c`

## Self-Check: PASSED

---
*Phase: 08-persistence-pdf-pipeline*
*Completed: 2026-05-09*

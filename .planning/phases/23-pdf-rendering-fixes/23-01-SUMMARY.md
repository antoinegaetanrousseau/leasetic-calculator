---
phase: 23-pdf-rendering-fixes
plan: "01"
subsystem: pdf
tags: [bug-fix, tdd, pdf, typography, i18n]
dependency_graph:
  requires: []
  provides: [PDF-01-fix]
  affects: [src/lib/pdf/document.tsx]
tech_stack:
  added: []
  patterns: [pdf-scoped-sanitizer, tdd-red-green]
key_files:
  created:
    - src/lib/pdf/sanitize-number.ts
    - src/lib/pdf/sanitize-number.test.ts
  modified:
    - src/lib/pdf/document.tsx
decisions:
  - "Fix is PDF-scoped only; format.ts unchanged (browsers render U+202F correctly)"
  - "sanitizePdfNumber uses split/join not regex for maximum readability and intent"
  - "Coefficient % suffix appended outside sanitize call so the space before % stays a regular space"
  - "Binary repro test reuses inflate+bfchar/TJ reconstruction from no-commission.test.ts"
metrics:
  duration: "~10min"
  completed: "2026-05-30"
  tasks: 2
  files: 3
---

# Phase 23 Plan 01: PDF-Scoped Number Sanitizer Summary

**One-liner:** PDF-scoped `sanitizePdfNumber` helper replaces U+202F/U+00A0 with U+0020 in all three numeric `<Text>` sites in `document.tsx`, eliminating the `.notdef` glyph overlap artifact in generated proposals without touching `format.ts` or web rendering.

## What Was Built

### `src/lib/pdf/sanitize-number.ts`

Pure string function `sanitizePdfNumber(value: string): string` that replaces every U+202F (NARROW NO-BREAK SPACE) and U+00A0 (NO-BREAK SPACE) with U+0020 (regular space). Documented with a header comment explaining why the fix is PDF-scoped rather than in `format.ts` (browsers have U+202F; only the Plus Jakarta Sans TTF subset is missing it).

### `src/lib/pdf/sanitize-number.test.ts`

11 tests in 3 describe blocks:
- Unit tests (7): replacement of U+202F, U+00A0, no mutation on plain spaces, EUR symbol preserved, digits/comma/period preserved, empty string, combined.
- Reproduction guard (2): `formatCurrency(1771.88, 'fr')` and `formatNumber(1234567.8901, 'fr', ...)` round-trips through the sanitizer assert no U+202F/U+00A0.
- Binary repro test (2): renders a real PDF via `renderProposalPdf` with a `fr` and `en` fixture, decompresses streams, reconstructs visible text, asserts no U+202F/U+00A0 in the TJ glyph stream.

### `src/lib/pdf/document.tsx` (3 call sites)

Three `formatCurrency`/`formatNumber` outputs wrapped in `sanitizePdfNumber(...)`:
- Line 239: `sanitizePdfNumber(formatCurrency(Number(inputs.amountHT), lang))` — Montant HT KeyValueRow
- Line 248: `` `${sanitizePdfNumber(formatNumber(Number(computed.coeff), lang, {...}))} %` `` — Coefficient KeyValueRow (` %` suffix appended outside sanitize call)
- Line 282: `sanitizePdfNumber(formatCurrency(Number(computed.loyerHT), lang))` — Loyer feature card Text

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED (unit test) | 53e541b | test(23-01): add failing reproduction test for PDF U+202F sanitizer |
| GREEN (implementation) | 1a6f73c | feat(23-01): implement PDF-scoped U+202F/U+00A0 number sanitizer |
| RED (binary test) | 2a9b026 | test(23-01): add failing binary repro test for PDF glyph sanitizer wiring |
| GREEN (wiring) | 0d918e5 | feat(23-01): route all PDF numeric values through sanitizePdfNumber in document.tsx |

## Verification Results

| Check | Result |
|-------|--------|
| `npm test -- src/lib/pdf/sanitize-number.test.ts` | 11/11 passed |
| `npm test -- src/lib/pdf/no-commission.test.ts` | 42/42 passed (no regression) |
| `git diff src/lib/i18n/format.ts` | empty (format.ts unchanged) |
| `grep -n "sanitizePdfNumber" src/lib/pdf/document.tsx` | 3 call sites confirmed |

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None. All three numeric values (loyerHT, amountHT, coeff) are real computed values flowing through the sanitizer into the PDF render tree.

## Threat Flags

None. The sanitizer is a pure string transform on already-rendered values. No new network endpoints, auth paths, or schema changes introduced.

## Self-Check

- [x] `src/lib/pdf/sanitize-number.ts` exists
- [x] `src/lib/pdf/sanitize-number.test.ts` exists
- [x] `src/lib/pdf/document.tsx` modified with 3 sanitizePdfNumber call sites
- [x] Commits 53e541b, 1a6f73c, 2a9b026, 0d918e5 exist in history
- [x] `src/lib/i18n/format.ts` byte-identical to pre-plan state

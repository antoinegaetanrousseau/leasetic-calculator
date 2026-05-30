---
phase: 23-pdf-rendering-fixes
plan: "02"
subsystem: pdf
tags: [bug-fix, pdf, i18n, dead-code-removal]
dependency_graph:
  requires: [PDF-01-fix]
  provides: [PDF-02-fix]
  affects: [src/lib/pdf/document.tsx, src/lib/i18n/dictionaries.ts, src/lib/i18n/dictionaries.test.ts]
tech_stack:
  added: []
  patterns: [pdf-block-removal, i18n-key-cleanup]
key_files:
  created: []
  modified:
    - src/lib/pdf/document.tsx
    - src/lib/i18n/dictionaries.ts
    - src/lib/i18n/dictionaries.test.ts
decisions:
  - "Recipient block removed entirely from render tree; client contact fields kept in ProposalDocumentProps interface (persisted, not rendered)"
  - "LABELS const map and lbl() helper removed as dead code (exclusively used by the deleted block)"
  - "pdf.section.recipient key removed from both FR and EN dictionaries; key count comment updated from (14) to (13)"
  - "sanitizePdfNumber wiring from Plan 23-01 preserved unchanged"
metrics:
  duration: "~8min"
  completed: "2026-05-30"
  tasks: 2
  files: 3
---

# Phase 23 Plan 02: Remove Destinataire/Recipient Block Summary

**One-liner:** Deleted the `Recipient <View>` block from `document.tsx` (SectionLabel + all KeyValueRows for partner/client contact), removed the now-dead `LABELS` const and `lbl()` helper, and stripped `pdf.section.recipient` from both FR/EN dictionaries and the parity test — keeping client fields in the data interface and the FR/EN parity proof green at 297/297.

## What Was Built

### `src/lib/pdf/document.tsx`

- Deleted the `{/* Recipient block */}` `<View style={{ marginBottom: 12 }}>` block in its entirety (previously lines 183–205): the `SectionLabel` with `pdf.section.recipient`, the partner rows (`partnerCo`, `partnerName`), the inner divider `<View>`, and the conditional client rows (`clientCo`, `clientName`, `clientRole`, `clientTel`, `clientEmail`, `clientSiren`).
- The Project block (`{/* Project block */}`) now follows the Title row directly. The title's `marginBottom: 24` provides the vertical spacing — no orphaned gap.
- Removed the `LABELS` const map (8-key bilingual record) and the `lbl()` helper function; both were exclusively used by the deleted block.
- `SectionLabel` and `KeyValueRow` imports retained (still used by Project, Interests, and Computation blocks).
- `clientName`, `clientRole`, `clientTel`, `clientEmail`, `clientSiren` fields kept in the `ProposalDocumentProps` data interface — still persisted in `params_snapshot`, just no longer rendered.

### `src/lib/i18n/dictionaries.ts`

- Removed `'pdf.section.recipient': 'DESTINATAIRE'` from the FR dictionary (section 7.8).
- Removed `'pdf.section.recipient': 'RECIPIENT'` from the EN dictionary (section 7.8).
- Updated the section-count comment from `(14 keys)` to `(13 keys)` in both FR and EN blocks.

### `src/lib/i18n/dictionaries.test.ts`

- Removed `'pdf.section.recipient'` from the `phase8Keys` list.
- Updated the section-count comment from `// 7.8 PDF document copy (14)` to `// 7.8 PDF document copy (13)`.

## Verification Results

| Check | Result |
|-------|--------|
| `grep -c "pdf.section.recipient" src/lib/pdf/document.tsx` | 0 |
| `grep -c "lbl(" src/lib/pdf/document.tsx` | 0 |
| `grep -c "const LABELS" src/lib/pdf/document.tsx` | 0 |
| `grep -c "pdf.section.project" src/lib/pdf/document.tsx` | 1 (Project block intact) |
| `grep -c "SectionLabel\|KeyValueRow" src/lib/pdf/document.tsx` | 7 (imports + usages remain) |
| `grep -c "clientSiren" src/lib/pdf/document.tsx` | 1 (interface field retained) |
| `grep -rn "pdf.section.recipient" src/` | no matches |
| `npm test -- src/lib/i18n/dictionaries.test.ts` | 297/297 passed |
| `npx tsc --noEmit` | exits 0 |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. The layout reflows cleanly from the title into the Project block. No placeholder content introduced.

## Threat Flags

None. Removing the recipient block reduces PII surfaced in the PDF (net-positive per T-23-04). The `ProposalDocumentProps` interface retains all client contact fields so the persisted `params_snapshot` shape is unchanged (T-23-05 mitigation confirmed by `grep -c "clientSiren"` returning 1).

## Self-Check

- [x] `src/lib/pdf/document.tsx` modified — Recipient block gone, LABELS/lbl() gone
- [x] `src/lib/i18n/dictionaries.ts` modified — pdf.section.recipient removed from FR + EN
- [x] `src/lib/i18n/dictionaries.test.ts` modified — entry removed, count updated to (13)
- [x] Commit 576dc78 exists (Task 1 — document.tsx)
- [x] Commit fa0485a exists (Task 2 — dictionaries + test)
- [x] sanitizePdfNumber wiring from 23-01 (3 call sites) preserved intact
- [x] Byte-determinism fixture regeneration intentionally deferred to Plan 23-03

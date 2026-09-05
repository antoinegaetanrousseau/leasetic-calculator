---
phase: "19"
plan: "01"
subsystem: xlsx-export
tags: [xlsx, exceljs, export, admin-09, server-action, client-component]
dependency_graph:
  requires:
    - "12-*: proposal lifecycle (status, deriveDisplayStatus)"
    - "14-06: ADMIN-09 grep-contract suite (gates 1-9)"
    - "17-04: /proposals page route (PageHero, buildListResponse)"
    - "08-07: paramsSnapshot + computed jsonb shape"
  provides:
    - "src/lib/xlsx/render.ts: generateProposalsXlsx()"
    - "src/lib/xlsx/types.ts: XlsxExportRow (ADMIN-09 boundary type)"
    - "app/(authed)/proposals/_actions/exportProposals.action.ts: exportProposalsAction()"
    - "app/(authed)/proposals/_components/ExportButton.tsx: 3-state export button"
    - "tests/admin-09-grep-contracts.test.ts: Gate 10 (ExcelJS parser-based scan)"
  affects:
    - "src/lib/api/proposals/list.ts: buildExportQuery + MAX_EXPORT_ROWS added"
    - "src/lib/i18n/dictionaries.ts: 30 new keys (15 FR + 15 EN)"
    - "eslint.config.mjs: exceljs no-restricted-imports guard added"
    - "app/(authed)/proposals/page.tsx: ExportButton mounted in PageHero actions slot"
tech_stack:
  added:
    - "exceljs ^4.4.0 (MIT, pure-Node — production dependency)"
  patterns:
    - "Server adapter isolation: exceljs confined to src/lib/xlsx/** (mirrors pdf pattern)"
    - "ADMIN-09 boundary via TypeScript type: XlsxExportRow has no commission field"
    - "Binary Response from Server Action: Content-Disposition attachment pattern"
    - "3-state client machine: idle → loading → idle/error with sonner toasts"
key_files:
  created:
    - "src/lib/xlsx/types.ts"
    - "src/lib/xlsx/render.ts"
    - "src/lib/xlsx/render.test.ts"
    - "src/lib/xlsx/index.ts"
    - "app/(authed)/proposals/_actions/exportProposals.action.ts"
    - "app/(authed)/proposals/_actions/exportProposals.action.test.ts"
    - "app/(authed)/proposals/_components/ExportButton.tsx"
    - "app/(authed)/proposals/_components/ExportButton.test.tsx"
  modified:
    - "eslint.config.mjs"
    - "package.json / package-lock.json"
    - "src/lib/i18n/dictionaries.ts"
    - "src/lib/api/proposals/list.ts"
    - "app/(authed)/proposals/page.tsx"
    - "tests/admin-09-grep-contracts.test.ts"
decisions:
  - "D-02: exceljs isolated to src/lib/xlsx/** via ESLint no-restricted-imports (mirrors @react-pdf/renderer guard)"
  - "D-03: XLSX buffer ephemeral — returned as Response body, not stored in blob storage"
  - "D-05/EXPORT-02: XlsxExportRow type IS the ADMIN-09 commission scrub boundary — no commission field exists structurally"
  - "D-09: durationMonths rendered as '{N} mois' string; coefficient as '{X.XX}%' string to avoid LibreOffice decimal confusion"
  - "D-09: expiresAt computed from pdfGeneratedAt + paramsSnapshot.validityDays (not stored)"
  - "D-10: ExportButton disabled with aria-label tooltip when resultCount === 0"
  - "D-21: chip.active/draft/expired/deleted keys reused for status column (no duplication)"
  - "Projection-A: buildExportQuery returns raw rows mapped to XlsxExportRow; status resolved via t(chip.{status}, locale)"
metrics:
  duration: "~40 minutes (Tasks 1-2 resumed from previous session + Task 3)"
  completed: "2026-05-26"
  tasks_completed: 3
  tasks_total: 3
  files_created: 8
  files_modified: 6
  tests_added: 36
  tests_total_after: 1082
---

# Phase 19 Plan 01: XLSX Export Summary

**One-liner:** ExcelJS workbook adapter with ADMIN-09 commission scrub via TypeScript type boundary, binary Response Server Action, and 3-state ExportButton with sonner toasts.

## What Was Built

Per-partner XLSX export from `/proposals`. Partners click "Exporter en XLSX" → server action runs `buildExportQuery` (respecting `?q=` + `?archived=` URL state) → `generateProposalsXlsx` produces a 10-column workbook → browser triggers a file download attachment.

**Architecture:**
- `src/lib/xlsx/types.ts` — `XlsxExportRow` type: 10 fields, zero commission-bearing fields. The type IS the ADMIN-09 boundary.
- `src/lib/xlsx/render.ts` — ExcelJS adapter: `import 'server-only'` on line 1, frozen header row, currency numFmt (`# ##0.00 €`), locale-aware date cells, `durationMonths` as string `"{N} mois"`.
- `src/lib/xlsx/index.ts` — barrel re-export (consumers import from `@/lib/xlsx`, never directly from render).
- `src/lib/api/proposals/list.ts` — `buildExportQuery` + `MAX_EXPORT_ROWS = 10000` added; same IDOR discipline as `buildListResponse` (userId from session, not params).
- `app/(authed)/proposals/_actions/exportProposals.action.ts` — `'use server'` on line 1, `requireUser()` first (PITFALLS §7.3), returns binary `Response` with `Content-Disposition: attachment; filename="propositions-YYYY-MM-DD.xlsx"`.
- `app/(authed)/proposals/_components/ExportButton.tsx` — 3-state machine (idle/loading/error), `.btn-out` CSS class, `Loader2` spinner in `var(--teal)`, sonner success/error toasts, disabled with tooltip when `resultCount === 0`.
- `tests/admin-09-grep-contracts.test.ts` — Gate 10 added: parser-based ExcelJS scan asserting `/commission/i` matches zero cells, headers, or sheet names.

## Test Results

| Suite | Tests | Result |
|-------|-------|--------|
| `src/lib/xlsx/render.test.ts` | 9 | All pass |
| `app/(authed)/proposals/_actions/exportProposals.action.test.ts` | 10 | All pass |
| `app/(authed)/proposals/_components/ExportButton.test.tsx` | 7 | All pass |
| `tests/admin-09-grep-contracts.test.ts` (Gate 10) | 1 | All pass |
| **Full suite** | **1082** | **All pass** |

## Commits

| Hash | Description |
|------|-------------|
| `3be6c08` | feat(19-01): XLSX adapter + export action (Tasks 1-2) |
| `6765b6f` | feat(19-01): ExportButton + ADMIN-09 Gate 10 (Task 3) |

## Deviations from Plan

None — plan executed exactly as written.

Key implementation choices within spec:
- `computed.loyerHT` → `monthlyRent` (field name confirmed from finalize-wizard.ts)
- `computed.coeff` → coefficient formatted as `(value * 100).toFixed(2) + '%'`
- `inputs.durationMonths` → raw number, rendered as `"{N} mois"` string in workbook
- `expiresAt` computed at export time from `pdfGeneratedAt + paramsSnapshot.validityDays`

## Known Stubs

None. All 10 columns are wired to real data from the `proposals` table.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: new-export-endpoint | `exportProposals.action.ts` | New binary data export path — IDOR mitigated: userId from session only, `requireUser()` first |
| threat_flag: admin-09-boundary | `src/lib/xlsx/types.ts` | XlsxExportRow enforces commission scrub structurally; Gate 10 verifies at runtime |

## Self-Check

All files created/committed verified via git log. 1082 tests pass with 0 failures.

## Self-Check: PASSED

- `src/lib/xlsx/types.ts` — FOUND (commit 3be6c08)
- `src/lib/xlsx/render.ts` — FOUND (commit 3be6c08)
- `src/lib/xlsx/render.test.ts` — FOUND (commit 3be6c08)
- `src/lib/xlsx/index.ts` — FOUND (commit 3be6c08)
- `app/(authed)/proposals/_actions/exportProposals.action.ts` — FOUND (commit 3be6c08)
- `app/(authed)/proposals/_actions/exportProposals.action.test.ts` — FOUND (commit 3be6c08)
- `app/(authed)/proposals/_components/ExportButton.tsx` — FOUND (commit 6765b6f)
- `app/(authed)/proposals/_components/ExportButton.test.tsx` — FOUND (commit 6765b6f)
- Commits 3be6c08 and 6765b6f — FOUND in git log
- Full suite 1082 tests — PASSED

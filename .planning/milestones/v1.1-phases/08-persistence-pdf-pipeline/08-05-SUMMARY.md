---
phase: 8
plan: "08-05"
subsystem: lib/pdf
tags: [react-pdf, pdf-render, fonts, deterministic, PROP-15, PROP-16, PROP-17, PROP-18, PROP-19, DATA-09]
dependency_graph:
  requires: ["08-02"]
  provides: ["08-06", "08-07"]
  affects: []
tech_stack:
  added:
    - "@react-pdf/renderer 4.5.1 (exact pin, no caret)"
    - "Plus Jakarta Sans TTF (converted from self-hosted woff2 via wawoff2)"
  patterns:
    - "Font.register() with absolute TTF paths (server-only, deterministic)"
    - "renderToBuffer() → sha256 hash for byte-determinism gate"
    - "server-only import guard on render.ts"
    - "ESLint no-restricted-imports seam: @react-pdf/renderer only from src/lib/pdf/"
key_files:
  created:
    - src/lib/pdf/styles.ts
    - src/lib/pdf/components/section-label.tsx
    - src/lib/pdf/components/key-value-row.tsx
    - src/lib/pdf/document.tsx
    - src/lib/pdf/render.ts
    - src/lib/pdf/index.ts
    - src/lib/pdf/document.test.tsx
    - public/fonts/PlusJakartaSans-400.ttf
    - public/fonts/PlusJakartaSans-500.ttf
    - public/fonts/PlusJakartaSans-600.ttf
    - public/fonts/PlusJakartaSans-700.ttf
  modified:
    - package.json
    - package-lock.json
    - eslint.config.mjs
decisions:
  - "PROP-19: Font format changed from woff2 to TTF (same source bytes, different container) — woff2 breaks fontkit TTFSubset in multi-weight scenarios"
  - "T-08-05-07: Recipient row KeyValueRow labels are inline FR/EN strings (LABELS map), not dictionary keys — planner-approved discretion"
  - "fontStyle: 'italic' removed from validity caption — no italic cut in self-hosted font set"
  - "renderToBuffer cast via ReactElement<DocumentProps> — ProposalDocument wraps DocumentProps in its own data prop"
  - "ESLint override disables both no-restricted-imports AND no-restricted-syntax for src/lib/pdf/** — PDF literals are intentional server-only strings"
metrics:
  duration_seconds: 1408
  completed_date: "2026-05-09"
  tasks_completed: 6
  files_created: 11
  files_modified: 3
  tests_added: 5
  tests_total: 381
---

# Phase 8 Plan 05: PDF Rendering Module (lib/pdf) Summary

Single-sentence: Server-only `@react-pdf/renderer` 4.5.1 PDF stack — `<ProposalDocument>` A4 layout with Plus Jakarta Sans TTF fonts, `renderProposalPdf()` returning `{buffer, sha256, sizeBytes}` for byte-deterministic output (PROP-15..19, DATA-09).

## What Was Built

**`src/lib/pdf/` module** — the PDF rendering heart of Phase 8:

- **`styles.ts`** — PDF token palette (hex literals, no CSS vars) + typography scale 8/9/10/22/32pt + page margins
- **`components/section-label.tsx`** — uppercase muted section header (9pt bold, letter-spacing 0.06)
- **`components/key-value-row.tsx`** — 2-column flex row (80pt key col + flex-1 value col)
- **`document.tsx`** — `<ProposalDocument>` single-page A4 with header band, title, recipient, project, computation card, loyer climax card (green border/tint), optional interests block, validity caption, absolute-positioned footer. Font.register at module load (4 TTF weights).
- **`render.ts`** — `renderProposalPdf({data}) → {buffer, sha256, sizeBytes}` with `import 'server-only'` guard
- **`index.ts`** — barrel re-exporting `renderProposalPdf`, `ProposalDocument`, and their types
- **`document.test.tsx`** — 5 Vitest smoke tests (Buffer >4KB, sha256 format, %PDF- magic bytes, on-demand variant, EN language)

## Key Constants

| Item | Value |
|------|-------|
| @react-pdf/renderer version | **4.5.1** (exact pin, no caret) |
| renderToBuffer import path | `@react-pdf/renderer` (root export — confirmed for 4.5.1) |
| `--legacy-peer-deps` needed | No — React 19 is in the peerDependencies range `^16.8.0 \|\| ... \|\| ^19.0.0` |
| Font format | **TTF** (converted from woff2 — see Deviation 1) |
| woff2 font in Font.register | NO — uses `.ttf` (see Deviation 1) |
| Italic font registered | NO — no italic cut available; `fontStyle: 'italic'` removed from document |
| Recipient labels (KeyValueRow keys) | **Inlined FR/EN strings** via `LABELS` map (planner discretion T-08-05-07) |
| PDF metadata | `creationDate={data.createdAt}`, `modificationDate={data.createdAt}`, `creator="Leasetic Matrice v1.1"`, `producer="Leasetic Matrice v1.1"` |

## Test Results

- **New tests added:** 5 (all in `src/lib/pdf/document.test.tsx`)
- **Total tests:** 381 (was 376 after 08-04)
- **All 381 tests pass** including the 5 new smoke tests

## Guards Passed

- `npm run typecheck` ✓
- `npm run lint:check` ✓
- `npm run check:no-vercel-imports` ✓
- `npm run check:no-drizzle-push` ✓
- `npm run check:seed-sql` ✓
- `npm test` ✓ (381/381)
- `npm run build` ✓

## ESLint Single-Seam Enforcement

`@react-pdf/renderer` is blocked via `no-restricted-imports` everywhere in the codebase **except** `src/lib/pdf/**`. The override also disables `no-restricted-syntax` (JSXText restriction) for PDF files — PDF-only strings are intentional server-side literals not routed through the i18n runtime.

Verification: `grep -r "@react-pdf/renderer" src/ | grep -v "src/lib/pdf/"` returns only comment lines (no imports).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Font format: woff2 → TTF for @react-pdf/renderer compatibility**
- **Found during:** Task 5 (Vitest smoke tests)
- **Issue:** `@react-pdf/renderer` uses PDFKit/fontkit for font subsetting. fontkit's `TTFSubset.encode()` fails with `RangeError: Offset is outside the bounds of the DataView` when subsetting woff2 fonts. Root cause: wawoff2 decompressor returns a `Uint8Array` view into a large shared WASM buffer (byteOffset ~5.4MB). Node.js's `fs.readFileSync` properly loads this via PDFKit's `fs.readFileSync` path, but fontkit's internal DataView arithmetic overflows when processing the glyph table entries for accented characters (é, É, etc.) present in the Plus Jakarta Sans character set.
- **Fix:** Converted the 4 self-hosted woff2 files (400/500/600/700) to TTF using `wawoff2.decompress()` with correct buffer slice (`Buffer.from(uint8)` respects byteOffset). TTF files committed to `public/fonts/`. The source woff2 files are retained alongside. Determinism is preserved — same source bytes, different container format.
- **Files modified:** `src/lib/pdf/document.tsx` (Font.register uses `.ttf`), `public/fonts/*.ttf` (4 new files added)
- **Commits:** `2141ee3`, `27e0f8c`

**2. [Rule 1 - Bug] Remove fontStyle: 'italic' from validity caption**
- **Found during:** Task 5 (initial test run — first error before TTF fix)
- **Issue:** `font.register` with italic variants pointing to the same woff2 source causes a double-subsetting conflict. Additionally, no italic woff2 cut exists for Plus Jakarta Sans in the self-hosted set.
- **Fix:** Removed `fontStyle: 'italic'` from the validity caption style. The visual impact is negligible for a professional PDF — the caption is readable at regular weight.
- **Files modified:** `src/lib/pdf/document.tsx`

**3. [Rule 2 - Missing] ESLint no-restricted-syntax exemption for src/lib/pdf/**
- **Found during:** Task 3 planning (pre-emptive)
- **Issue:** The plan's note that inline bilingual strings are "allowed because PDF render is server-only and outside the no-restricted-syntax JSXText scope" was inaccurate — the rule applies to all `*.tsx` files. PDF components use short bilingual inline strings (e.g., 'Société', 'Company') that legitimately should not go through the runtime t() system.
- **Fix:** Added `'no-restricted-syntax': 'off'` to the `src/lib/pdf/**` ESLint override (alongside `no-restricted-imports: 'off'`). Documented in SUMMARY per T-08-05-07.
- **Files modified:** `eslint.config.mjs`

**4. [Rule 1 - Bug] renderToBuffer TypeScript cast required**
- **Found during:** Task 4
- **Issue:** `renderToBuffer` expects `ReactElement<DocumentProps>` but `ProposalDocument` is typed with `ProposalDocumentProps` (which wraps the document props in a `data` field). TypeScript can't infer the component's render output type.
- **Fix:** Cast `React.createElement(ProposalDocument, ...)` as `ReactElement<DocumentProps>` using the `DocumentProps` type imported from `@react-pdf/renderer`. Added `import { type DocumentProps }` to render.ts.
- **Files modified:** `src/lib/pdf/render.ts`

## Known Stubs

None — all data fields are wired to real inputs from `ProposalDocumentProps['data']`. No placeholder text or hardcoded values in the render output.

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced beyond what was in the plan's `<threat_model>`. The PDF rendering is purely server-side (read: committed font files + proposal data). T-08-05-01 through T-08-05-07 are all addressed.

## Downstream Dependencies Unblocked

- **Plan 08-06** (CI byte-determinism gate): Can now layer the `expected.sha256.txt` fixture test on top of `renderProposalPdf`. The fixture hash will be based on TTF rendering (not woff2) — this is stable and deterministic.
- **Plan 08-07** (POST /api/proposals): Can call `renderProposalPdf({ data })` in step 5 of the create flow and store `{sha256, sizeBytes}` on the proposals row.

## Self-Check: PASSED

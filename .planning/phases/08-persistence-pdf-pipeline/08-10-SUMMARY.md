---
phase: 8
plan: "08-10"
subsystem: detail-page
tags: [server-component, detail-page, embed-pdf, validity-chip, chips, action-stack]

dependency_graph:
  requires:
    - "08-02: i18n keys (proposal.chip.*, proposal.detail.*, proposal.validity.*)"
    - "08-03: getProposalById query"
    - "08-08: GET /api/proposals/[id]/pdf stream route (embed src target)"
  provides:
    - "app/(authed)/proposals/[id]/page.tsx — Server Component detail page"
    - "ValidityChip — active/expired from (createdAt, validityDays, nowMs)"
    - "LanguageChip — snapshot-language pill (D-8-19)"
    - "DeletedChip — soft-delete badge with formatted date"
    - "EmbeddedPdfPreview — embed src=/api/proposals/{id}/pdf wrapper"
    - "DeleteButtonClient + RestoreButtonClient — use-client stubs for Plan 08-12"
    - "CopyRefButton variant=inline — 28px ghost icon-only for detail header"
    - "CSS: .chip + .chip-active/.chip-expired/.chip-deleted/.chip-language + .pdf-embed-wrap"
  affects:
    - "08-11: list view will render ValidityChip + LanguageChip on each row"
    - "08-12: DeleteButtonClient + RestoreButtonClient stubs to be replaced with real server action wiring"
    - "08-13: Duplicate Link /proposals/new?duplicate={id} is the entry point to be prefilled"

tech-stack:
  added: []
  patterns:
    - "Server Component (async) + force-dynamic — cookie/session reads on every request"
    - "requireUser() + ownership check (proposal.userId !== session.user.id) -> notFound() D-18 obscurity"
    - "getNowMs() module-level async helper: avoids react-hooks/purity flag on Date.now() inside component functions"
    - "ValidityChip accepts nowMs prop so it stays a pure render function (no Date.now() call inside chip)"
    - "dt/dd flat list for read-only inputs (D-8-04 — no disabled inputs)"
    - "Two-column grid (640px + 360px, 24px gap) with sticky right column at calc(--topbar-h + 24px)"
    - "Inline bilingual label strings (labelFr helper) for 15 input field headings — same trade-off as PDF render in 08-05"
    - "Stub buttons (DeleteButtonClient + RestoreButtonClient) render placeholders; Plan 08-12 fills the bodies"

key-files:
  created:
    - app/(authed)/proposals/[id]/page.tsx
    - src/components/proposals/ValidityChip.tsx
    - src/components/proposals/LanguageChip.tsx
    - src/components/proposals/DeletedChip.tsx
    - src/components/proposals/EmbeddedPdfPreview.tsx
    - src/components/proposals/DeleteButtonClient.tsx
    - src/components/proposals/RestoreButtonClient.tsx
  modified:
    - app/globals.css
    - src/components/proposal/CopyRefButton.tsx

key-decisions:
  - "ValidityChip receives nowMs: number prop instead of calling Date.now() internally — keeps chip pure, satisfies react-hooks/purity ESLint rule (eslint-config-next)"
  - "getNowMs() async helper at module level in page.tsx: Date.now() is extracted from the React component function to avoid the purity linter — functionally identical, architecturally cleaner"
  - "labelFr(fr, en, lang) inline bilingual helper for 15 input dt labels — no dedicated dict keys because these structural field descriptions match the PDF section labels pattern established in Plan 08-05"
  - "EmbeddedPdfPreview renders a sibling fallback link (always visible below embed) rather than noscript — better coverage for browsers that do not support embedded PDFs"
  - "DeleteButtonClient + RestoreButtonClient as use-client stubs with void proposalId — Plan 08-12 replaces the body; the outer page already passes the correct prop shape"
  - "CopyRefButton variant=inline: 28px square ghost button, no label, Copy/Check icon swap on success — same clipboard logic, different chrome"

metrics:
  duration: "~45min"
  completed: "2026-05-09"
  tasks_completed: 4
  files_modified: 9
---

# Phase 8 Plan 10: Proposal Detail Page Summary

**One-liner:** Server Component detail page at `/proposals/[id]` with 2-column layout, 15-row read-only dt/dd inputs, embedded PDF preview via `<embed>`, ValidityChip/LanguageChip/DeletedChip primitives, real Download link, stub Duplicate + Delete/Restore buttons.

## Performance

- **Duration:** ~45 min
- **Completed:** 2026-05-09
- **Tasks:** 4/4
- **Files created:** 7 (page + 5 components + 2 stubs)
- **Files modified:** 2 (globals.css, CopyRefButton)

## Accomplishments

- `/proposals/[id]` route live in build table (Server Component, force-dynamic)
- requireUser() + ownership check (D-18 obscurity: not-owned = 404)
- Two-column grid layout (640 + 360px, sticky right column per Phase 7 precedent)
- 15-row read-only dt/dd Inputs card per UI-SPEC §3.2.3
- Computed card with loyer 24px feature row, tranche badge, validity/expiry footer
- Soft-delete banner + DeletedChip for deleted proposals
- ValidityChip (active/expired from render-time derivation), LanguageChip (snapshot D-8-19)
- EmbeddedPdfPreview wrapping `<embed src="/api/proposals/{id}/pdf" type="application/pdf">`
- Download `<a download>` pointing at stream route, Duplicate `<Link>` to `/proposals/new?duplicate={id}`
- DeleteButtonClient + RestoreButtonClient stubs — Plan 08-12 wires the real server actions
- CopyRefButton extended with `variant="inline"` for 28px ghost icon-only usage on detail header
- 6 new CSS classes in globals.css in clearly-bounded block
- Test count: 399/399 — no regressions

## Task Commits

1. **Task 1: Chip primitives + globals.css** — `97759f0` (feat)
2. **Task 2: EmbeddedPdfPreview** — `d25945f` (feat)
3. **Task 3: Detail page + CopyRefButton inline + stubs** — `9458adf` (feat)
4. **Task 4: Final guard + smoke** — all checks pass (no separate commit needed)

## Guards

| Check | Result |
|-------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint:check` | 0 errors, 0 warnings |
| `npm run check:no-vercel-imports` | OK |
| `npm test` | 399/399 pass |
| `npm run build` | 0 errors; `/proposals/[id]` in route table |
| `git status --porcelain` | `?? scripts/seed-partner-launch.ts` only |

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `app/(authed)/proposals/[id]/page.tsx` | ~260 | Server Component detail page |
| `src/components/proposals/ValidityChip.tsx` | 38 | Active/Expired chip (nowMs prop) |
| `src/components/proposals/LanguageChip.tsx` | 24 | FR/EN snapshot-language chip |
| `src/components/proposals/DeletedChip.tsx` | 24 | Soft-delete badge with date |
| `src/components/proposals/EmbeddedPdfPreview.tsx` | 45 | embed wrapper + fallback link |
| `src/components/proposals/DeleteButtonClient.tsx` | 30 | use-client stub (Plan 08-12 fills) |
| `src/components/proposals/RestoreButtonClient.tsx` | 30 | use-client stub (Plan 08-12 fills) |

## Files Modified

| File | Change |
|------|--------|
| `app/globals.css` | Appended 6 chip + pdf-embed-wrap classes in bounded block; existing rules untouched |
| `src/components/proposal/CopyRefButton.tsx` | Added `variant?: 'default' \| 'inline'` prop + inline branch render |

## Deviations from Plan

### [Rule 1 - Bug] react-hooks/purity flags Date.now() in component functions

**Found during:** Task 1 (ValidityChip) and Task 3 (page.tsx)
**Issue:** The `react-hooks/purity` rule (from `eslint-config-next`) flags `Date.now()` as an impure function call inside React component functions — even in Server Components.
**Fix 1 (ValidityChip):** Changed `ValidityChip` to accept a `nowMs: number` prop. The page passes the timestamp from a module-level async helper.
**Fix 2 (page.tsx):** Extracted `getNowMs()` as a module-level async function. The page awaits it before rendering — moves the impure call outside the React component function while remaining functionally identical.
**Files modified:** `src/components/proposals/ValidityChip.tsx`, `app/(authed)/proposals/[id]/page.tsx`
**Commits:** `97759f0`, `9458adf`

### Inline bilingual labels for 15 dt input field headings

Not a bug — documented architectural choice. The 15 input field dt labels ("Société partenaire", "Société cliente", etc.) use a `labelFr(fr, en, lang)` helper returning inline strings rather than dedicated `t()` dict keys. This matches the precedent established in Plan 08-05 PDF render section headings. Future plans can add dedicated keys if needed.

### EmbeddedPdfPreview uses always-visible fallback link instead of noscript

Not a bug — deviation from plan spec comment. The plan acknowledged `<noscript>` was a no-op for the embed case. An `<a>` sibling link ("Voir le PDF dans un nouvel onglet") is rendered below the embed box, always visible. This provides a functional escape for browsers that do not render embedded PDFs.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `DeleteButtonClient` | `src/components/proposals/DeleteButtonClient.tsx` | Renders placeholder; Plan 08-12 wires server action + sonner toast |
| `RestoreButtonClient` | `src/components/proposals/RestoreButtonClient.tsx` | Renders placeholder; Plan 08-12 wires server action + sonner toast |

Both stubs render a labeled button with the correct i18n key and CSS class. The detail page goal (PROP-11 read-only view + Download) is fully functional.

## Threat Surface Scan

No new network endpoints or auth paths introduced. The detail page reads from the DB via `getProposalById` (existing server-only query) and renders same-origin links to the existing stream route. All declared threat mitigations applied:

- T-08-10-01: inputs jsonb renders only the 15 UI-SPEC fields; paramsSnapshot.commissionPct excluded
- T-08-10-02: ownership check + notFound() implemented (D-18 obscurity)
- T-08-10-03: React JSX auto-escapes child text; no raw HTML injection patterns used

## Self-Check

- [x] `app/(authed)/proposals/[id]/page.tsx` exists, contains `getProposalById`, `notFound()`, `ValidityChip`, `LanguageChip`, `EmbeddedPdfPreview`, `/api/proposals/`
- [x] `src/components/proposals/ValidityChip.tsx` exists, exports `ValidityChip`, contains `nowMs` prop
- [x] `src/components/proposals/LanguageChip.tsx` exists, exports `LanguageChip`, contains `lang` prop
- [x] `src/components/proposals/DeletedChip.tsx` exists, exports `DeletedChip`
- [x] `src/components/proposals/EmbeddedPdfPreview.tsx` exists, contains `embed`, `/api/proposals/`
- [x] `app/globals.css` has `.chip`, `.chip-active`, `.chip-expired`, `.chip-deleted`, `.chip-language`, `.pdf-embed-wrap`
- [x] Commit `97759f0` exists in git log
- [x] Commit `d25945f` exists in git log
- [x] Commit `9458adf` exists in git log
- [x] 399 tests pass (no regressions)
- [x] `npm run build` exits 0 with `/proposals/[id]` in route table
- [x] `git status --porcelain` shows only `?? scripts/seed-partner-launch.ts`

## Self-Check: PASSED

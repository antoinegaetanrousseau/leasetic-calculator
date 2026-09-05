---
phase: "19"
plan: "02"
subsystem: lc-references-dashboard
tags: [admin, lc-references, tdd, cursor-pagination, admin-09, server-component]
dependency_graph:
  requires:
    - "14-06: ADMIN-09 grep-contract suite (gates 1-10)"
    - "17-04: proposals page route pattern (PageHero, cursor pagination)"
    - "18-02: Admin Home page (AdminNavCard grid, requireAdmin AUTH-15)"
    - "18-03: PartnersList chrome (TH_BASE_STYLE/TD_BASE_STYLE verbatim)"
    - "08-07: paramsSnapshot + deriveDisplayStatus"
  provides:
    - "src/lib/db/queries/lc-references.ts: listLcReferences(), encodeLcRefCursor(), decodeLcRefCursor()"
    - "app/(admin)/[adminSegment]/lc-references/page.tsx: LC reference dashboard SSR route"
    - "app/(admin)/[adminSegment]/lc-references/_components/LcReferencesList.tsx: 6-col read-only table"
    - "tests/admin-09-grep-contracts.test.ts: Gates 11+12 (LcReferencesList commission scan)"
  affects:
    - "src/components/ui/AdminNavCard.tsx: lc-references variant added"
    - "app/(admin)/[adminSegment]/page.tsx: grid 3→4 cards + 4th AdminNavCard"
    - "src/lib/i18n/dictionaries.ts: 30 new keys (15 FR + 15 EN)"
tech_stack:
  added: []
  patterns:
    - "Cross-partner admin query: no userId filter, requireAdmin() upstream gate"
    - "TDD RED→GREEN→commit per task (3 tasks, 6 commits)"
    - "Cursor pagination: base64url({createdAt: ISO, id: UUID}) — mirrors proposals.ts"
    - "ADMIN-09 boundary via TypeScript: LcReferenceRow has no commission-bearing field"
    - "Read-only table: no Link wrapper on rows (D-13)"
key_files:
  created:
    - "src/lib/db/queries/lc-references.ts"
    - "src/lib/db/queries/lc-references.test.ts"
    - "app/(admin)/[adminSegment]/lc-references/page.tsx"
    - "app/(admin)/[adminSegment]/lc-references/page.test.tsx"
    - "app/(admin)/[adminSegment]/lc-references/_components/LcReferencesList.tsx"
    - "app/(admin)/[adminSegment]/lc-references/_components/LcReferencesList.test.tsx"
  modified:
    - "src/components/ui/AdminNavCard.tsx"
    - "app/(admin)/[adminSegment]/page.tsx"
    - "app/(admin)/[adminSegment]/page.test.tsx"
    - "src/lib/i18n/dictionaries.ts"
    - "tests/admin-09-grep-contracts.test.ts"
decisions:
  - "D-13: LC dashboard rows read-only — no Link wrapper, no onClick, no cursor:pointer"
  - "D-14: ILIKE search on 3 fields — lcRef, users.name, inputs->>'clientName' (Drizzle bind-param)"
  - "D-15: ORDER BY createdAt DESC, id DESC (stable cursor sort)"
  - "D-16: Cursor pagination via (createdAt, id) composite tuple — mirrors proposals.ts"
  - "D-18: LC dashboard reachable ONLY via 4th AdminNavCard — NOT added to sidebar (Phase 18 D-27 lock)"
  - "AdminNavCard lc-references variant uses same teal accent as partners (rgb 45,122,140) — no new color token"
  - "Admin Home grid changed from repeat(3,1fr) inline style to Tailwind grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
metrics:
  duration: "~35 minutes (Tasks 1-3, 2 sessions)"
  completed: "2026-05-26"
  tasks_completed: 3
  tasks_total: 3
  files_created: 6
  files_modified: 5
  tests_added: 23
  tests_total_after: 1105
---

# Phase 19 Plan 02: Centralized LC Reference Dashboard Summary

**One-liner:** Cross-partner LC reference list with Drizzle cursor pagination, ILIKE 3-field search, read-only table mirroring PartnersList chrome, and ADMIN-09 Gates 11+12 via TDD RED→GREEN.

## What Was Built

Admin-only dashboard at `/<adminSegment>/lc-references` listing all issued LC references across all partners. Reachable only via a new 4th AdminNavCard on the Admin Home page (D-18 — sidebar unchanged per Phase 18 D-27 lock).

**Architecture:**
- `src/lib/db/queries/lc-references.ts` — Cross-partner query helper (no userId filter, `requireAdmin()` is the upstream gate). `listLcReferences()` with `WHERE lc_ref IS NOT NULL`, soft-delete visibility window (30-day), D-14 ILIKE search on 3 fields, D-16 cursor pagination, D-15 ORDER BY. `encodeLcRefCursor` / `decodeLcRefCursor` mirror `encodeCursor`/`decodeCursor` from proposals.ts (base64url, UUID regex, null-on-invalid). `LcReferenceRow` type has zero commission-bearing fields (ADMIN-09 boundary).
- `app/(admin)/[adminSegment]/lc-references/_components/LcReferencesList.tsx` — Server component: 6-col read-only table (Référence/Partenaire/Client/Montant HT/Statut/Créée le). TH_BASE_STYLE and TD_BASE_STYLE copied verbatim from PartnersList. Référence cell uses `fontFamily: monospace`. Montant HT via `formatCurrency`. Statut via `StatusChip` (all 4 variants: active/draft/expired/deleted). Créée le via `formatDate`. No `<Link>` on rows (D-13). Cursor pagination footer mirrors PartnersList. Two empty states: firstRun + search-empty with clear link.
- `app/(admin)/[adminSegment]/lc-references/page.tsx` — SSR route: `requireAdmin()` first (AUTH-15), `getCurrentLang()`, `listLcReferences({q, cursorEncoded, limit:20})`, `PageHero` (no actions slot) + `LcReferencesList`. `export const dynamic = 'force-dynamic'`.
- `src/components/ui/AdminNavCard.tsx` — Variant union extended to include `'lc-references'`; `ACCENT_BY_VARIANT` entry added (teal: `rgb 45,122,140`).
- `app/(admin)/[adminSegment]/page.tsx` — Admin Home grid changed from `repeat(3,1fr)` to Tailwind `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`. Added 4th `AdminNavCard` with `variant="lc-references"` and `Hash` icon.
- `tests/admin-09-grep-contracts.test.ts` — Gate 11: all 4 `displayStatus` variants render with zero `/commission_pct/` or `/_pct/` tokens. Gate 12: both empty states (firstRun + search-empty) render with zero commission tokens.

## TDD Gate Compliance

| Phase | Commit | Note |
|-------|--------|------|
| Task 1 RED+GREEN | `dd5a832` | RED inline (single commit per plan spec for Task 1) |
| Task 2 RED | `511e8b5` | `test(19-02):` — import errors confirmed failure |
| Task 2 GREEN | `e94bb72` | `feat(19-02):` — 15/15 pass |
| Task 3 RED | `a5b41ed` | `test(19-02):` — Test 7 fails (3 cards asserted, expected 4) |
| Task 3 GREEN | `f93f2b9` | `feat(19-02):` — all pass |

## Test Results

| Suite | Tests | Result |
|-------|-------|--------|
| `src/lib/db/queries/lc-references.test.ts` | 5 | All pass |
| `app/(admin)/[adminSegment]/lc-references/_components/LcReferencesList.test.tsx` | 11 | All pass |
| `app/(admin)/[adminSegment]/lc-references/page.test.tsx` | 4 | All pass |
| `app/(admin)/[adminSegment]/page.test.tsx` (Test 7 updated) | 12 | All pass |
| `tests/admin-09-grep-contracts.test.ts` (Gates 11+12 added) | 13 | All pass |
| **Full suite** | **1105** | **All pass** |

## Commits

| Hash | Description |
|------|-------------|
| `dd5a832` | feat(19-02): LC query helper + i18n keys (Task 1) |
| `511e8b5` | test(19-02): add failing tests for LcReferencesList + lc-references page (Task 2 RED) |
| `e94bb72` | feat(19-02): LcReferencesList + lc-references page + AdminNavCard lc-references variant (Task 2 GREEN) |
| `a5b41ed` | test(19-02): update Admin Home Test 7 to expect 4 cards + add Gates 11+12 (Task 3 RED) |
| `f93f2b9` | feat(19-02): Admin Home grid 3→4 cards + lc-references AdminNavCard (Task 3 GREEN) |

## Deviations from Plan

None — plan executed exactly as written.

Key implementation choices within spec:
- `decodeLcRefCursor` UUID regex: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` — matches proposals.ts
- Créée le formatted with `{ year: 'numeric', month: '2-digit', day: '2-digit' }` (numeric short format)
- Grid responsive classes: `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4` (no breakpoint at `lg` — 4-up only at xl to avoid 2+1 orphan layout)
- `chip.${status}` i18n key reuse for StatusChip labels (no new chip keys)

## Known Stubs

None. All 6 columns in LcReferencesList are wired to real data from the `proposals` + `users` join via `listLcReferences`.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: admin-only-cross-partner-query | `src/lib/db/queries/lc-references.ts` | Cross-partner query (no userId filter) — mitigated: `requireAdmin()` in page.tsx + admin layout gate; helper is `import 'server-only'` |
| threat_flag: admin-09-boundary | `LcReferenceRow` type | No commission-bearing field; `paramsSnapshot` consumed by `deriveDisplayStatus` internally, never exposed; Gates 11+12 verify at render time |

## Self-Check: PASSED

- `src/lib/db/queries/lc-references.ts` — FOUND (commit dd5a832)
- `src/lib/db/queries/lc-references.test.ts` — FOUND (commit dd5a832)
- `app/(admin)/[adminSegment]/lc-references/_components/LcReferencesList.tsx` — FOUND (commit e94bb72)
- `app/(admin)/[adminSegment]/lc-references/_components/LcReferencesList.test.tsx` — FOUND (commit 511e8b5)
- `app/(admin)/[adminSegment]/lc-references/page.tsx` — FOUND (commit e94bb72)
- `app/(admin)/[adminSegment]/lc-references/page.test.tsx` — FOUND (commit 511e8b5)
- Commits dd5a832, 511e8b5, e94bb72, a5b41ed, f93f2b9 — all FOUND in git log
- Full suite 1105 tests — PASSED

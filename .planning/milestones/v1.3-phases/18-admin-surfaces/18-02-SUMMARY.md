---
phase: 18
plan: 02
subsystem: admin-surfaces
tags: [admin-home, metric-tile, recent-activity, page-rewrite, ADMIN-09, D-04, D-29]
dependency_graph:
  requires:
    - src/components/ui/MetricTile.tsx (Phase 11 COMP-03)
    - src/components/ui/PageHero.tsx (Phase 16)
    - src/components/ui/AdminNavCard.tsx (Phase 14)
    - src/lib/db/queries/partner-aggregates.ts (Plan 18-01)
    - src/lib/db/queries/proposal-aggregates.ts getMonthlyProposalCountAll (Plan 18-01)
    - src/lib/db/queries/admin-activity.ts getRecentAdminActivity + ActivityRow (Plan 18-01)
    - src/lib/db/queries/coefficient-history.ts listCoefficientHistory (Phase 12)
    - src/lib/i18n/dictionaries.ts ~70 net-new keys (Plan 18-01)
    - src/lib/auth/require.ts requireAdmin (Phase 6)
  provides:
    - MetricTile.valueColor prop — additive Phase 18 D-04 override (var(--teal) for admin stat values)
    - RecentActivityRow component (read-only D-07; avatar + sentence + relative timestamp)
    - getInitials(name?, email?) avatar helper — exported
    - Admin Home v1.3 layout (PageHero + 3 stat tiles + 3 nav cards + recent activity card)
  affects:
    - app/(admin)/[adminSegment]/page.tsx — full structural rewrite (Phase 14 → Phase 18 contract)
    - tests/admin-09-grep-contracts.test.ts — Surface 3 now mocks 5 DB helpers (page is DB-coupled post-rewrite)
tech_stack:
  added: []
  patterns:
    - Additive prop pattern on existing primitive (MetricTile.valueColor — no variant explosion)
    - Server component aggregate fan-out via Promise.all (5 parallel DB reads on Admin Home render)
    - Europe/Paris month label via Intl.DateTimeFormat({ timeZone "Europe/Paris" }) — explicit-timezone discipline
    - Read-only activity row pattern (no anchor, no button, no role=link, no cursor pointer) — D-07 enforcement
    - Positional placeholder interpolation via String.split/join (avoids regex-escape concerns for arbitrary inputs)
key_files:
  created:
    - app/(admin)/[adminSegment]/_components/RecentActivityRow.tsx
    - app/(admin)/[adminSegment]/_components/RecentActivityRow.test.tsx
  modified:
    - src/components/ui/MetricTile.tsx (added optional valueColor prop)
    - src/components/ui/MetricTile.test.tsx (3 new tests: default preserved, teal override, all variants)
    - app/(admin)/[adminSegment]/page.tsx (full rewrite per Figma 41:46 + D-01..D-07 + D-29)
    - app/(admin)/[adminSegment]/page.test.tsx (12 new behavior tests replace Phase 14 contract)
    - tests/admin-09-grep-contracts.test.ts (added 5 DB-helper mocks for Surface 3)
decisions:
  - D-04 enforced — all 3 stat tile values render in var(--teal). Figma's gold rendering for "Dernière modif. coeffs" overridden per user-confirmed deviation. --gold reserved for warnings only.
  - Reused existing MetricTile primitive via additive valueColor prop. Decided NOT to create AdminStatTile.tsx variant — additive prop kept the API minimal and avoided variant-explosion.
  - relativeTime helper bucket selection — under 60min → minutesAgo, under 24h → hoursAgo, 24h or more → daysAgo. Future-dated timestamps (clock skew) clamp to "1 min" rather than rendering "il y a -N min".
  - getInitials whitespace-only split (compound names like Jean-Luc stay one word → "J"). Multi-word names take first 2 letters of first 2 whitespace-delimited words.
  - Empty coefficient_history → tile value "—" + empty sublabel. No crash. D-03 empty-state contract.
  - Voir tout link rendered in BOTH the activity card header AND footer (when rows present). When empty, only header link is rendered. UI-SPEC §Admin Home lines 236+244 both specify a Voir tout link.
  - tests/admin-09-grep-contracts Surface 3 was previously DB-free (Phase 14 was server component with no queries). After the Phase 18 rewrite the page does 5 DB reads on render. Mocked all 5 helpers to keep the gate green; mocks return non-empty data so the grep contract scans the maximum surface.
metrics:
  duration_min: 9
  completed_date: 2026-05-24
  tasks_complete: 3
  tests_added: 24
  files_created: 2
  files_modified: 4
---

# Phase 18 Plan 02: Admin Home Rewrite Summary

Admin Home `/(admin)/[adminSegment]/page.tsx` rewritten per Figma 41:46 + UI-SPEC §Admin Home component contract. PageHero with ADMIN eyebrow + Nouvelle proposition CTA, three teal-valued stat tiles consuming Wave-1 cross-partner helpers, three AdminNavCards (Historique retained), and a read-only Recent activity card. MetricTile gained an additive valueColor prop (D-04); a new RecentActivityRow component implements the D-07 read-only contract.

## What Built

### Task 1 — MetricTile valueColor prop (D-04)

- `MetricTileProps.valueColor?: string` — optional override. When provided, wins over the variant-driven default color on the value element. Existing Phase 11/17 partner-home callers untouched (additive only).
- JSDoc cites D-04 as the trigger — ALL three Admin Home stat tile values render in `var(--teal)`, deviating from Figma's gold rendering for "Dernière modif. coeffs". `--gold` reserved for warnings only — palette discipline per Phase 16 D-04 / Phase 18 D-30.
- 3 new tests — default preserved when prop omitted, teal override applied when present, override works across all 3 variants. 8/8 MetricTile tests green. Partner Home consumer (`app/(authed)/page.test.tsx`) verified unaffected — 8/8 green.

### Task 2 — RecentActivityRow component (D-06 / D-07)

- `app/(admin)/[adminSegment]/_components/RecentActivityRow.tsx` — server component. Props `{ row: ActivityRow, lang: Lang }`. Imports `ActivityRow` from `src/lib/db/queries/admin-activity.ts` (no type redefinition).
- Layout — 32px initials avatar (left, `var(--gd-text)` background, white text, 12.5px/600) + interpolated sentence (middle, flex:1, 14.5px/400/`--ink`) + relative timestamp (right, 12.5px/500/`--muted`). `padding 8px 0; gap 12px`.
- **D-07 enforcement** — no anchor element, no button element, no `role="link"`, no `onClick`, no `cursor: pointer`. Asserted by Test 2's recursive style scan.
- Exported `getInitials(actorName?, actorEmail?)` helper — first letter of first 2 whitespace-separated words uppercase; falls back to email[0] then `?`. Compound names (Jean-Luc) stay one word → "J".
- `relativeTime` helper buckets — under 60min → `admin.home.activity.time.minutesAgo`, under 24h → `.hoursAgo`, 24h or more → `.daysAgo` (Plan 18-01 i18n keys). Clamps negative/future deltas to "1 min" — never "il y a -N min".
- `interpolateSentence` does positional `{N}` replacement via String.split/join (defense in depth even though sentenceArgs are server-derived).
- 9 tests cover — rendered sentence + initials + timestamp, no clickable elements, initials edge cases (whitespace, compound, multi-word, email fallback, `?`), avatar style (jsdom serializes `#ffffff` → `rgb(255,255,255)` — regex accepts both), relative timestamp unit selection (FR + EN), partner-status sentence target name interpolation, getInitials punctuation/email edge cases.

### Task 3 — Admin Home page rewrite (D-01..D-07, D-29)

- Full rewrite of `app/(admin)/[adminSegment]/page.tsx`. SSR ordering — `requireAdmin()` first (AUTH-15 defense in depth) → `Promise.all` of 5 parallel queries → render. Five parallel reads: `getActivePartnerCount`, `getTotalPartnerAccountCount`, `getMonthlyProposalCountAll`, `getRecentAdminActivity({limit:5})`, `listCoefficientHistory({limit:1})`.
- **Section 1 — PageHero** — eyebrow `t('admin.home.eyebrow', lang)` = "ADMIN", title = "Administration", subtitle, and `<Link href="/proposals/new/parametres" className="btn-green">` CTA with `+ Nouvelle proposition` content in the actions slot.
- **Section 2 — 3-up stat-tile grid** — `gridTemplateColumns: repeat(3,1fr); gap: 24; marginBottom: 32`. All 3 MetricTile instances pass `valueColor="var(--teal)"` per D-04. D-01 — `Partenaires actifs` value=activeCount, sublabel=`sur {totalCount} comptes`. D-02 — `Propositions ce mois` value=monthlyCount, sublabel = Europe/Paris current month (Intl with explicit `timeZone`). D-03 — `Dernière modif. coeffs` value = `il y a Xj` (Math.floor age in days from latest coefficient_history row), sublabel = `{formattedDate} — {authorName}`. Empty history → value `—`, sublabel `''`.
- **Section 3 — 3-up AdminNavCard grid** — Coefficients / Partenaires / Historique (icons Sliders / Users / History). Hrefs `/<seg>/coefficients`, `/<seg>/partners`, `/<seg>/history`. Historique RETAINED per UI-SPEC §Admin Home lines 203-204 — single-entry-point to /history now that the sidebar item is gone (D-27).
- **Section 4 — Recent activity card** — `.card` chrome with header (`● ACTIVITÉ RÉCENTE` left + `Voir tout →` link right). When rows present — stack of `<RecentActivityRow>` children + bottom-right `Voir tout →` footer link. When empty — `Aucune activité récente.` (`var(--muted)`, 14.5px). Both Voir tout links target `/<seg>/history`.
- 12 new behavior tests cover all 10 plan contracts + lang=en parity + requireAdmin call assertion. The previous Phase 14 page test (which asserted only 3 AdminNavCards + no PageHero actions) was rewritten end-to-end to match the new contract.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] tests/admin-09-grep-contracts.test.ts Surface 3 needed DB mocks**

- **Found during** — Task 3 verification — running the 9-gate ADMIN-09 suite after the page rewrite.
- **Issue** — The Phase 14 Admin Home was DB-free (just 3 AdminNavCards). The Phase 18 rewrite does 5 DB reads on render via `Promise.all`. The ADMIN-09 Surface 3 test calls `AdminHomePage()` and `renderToString` directly without a live DB, so it threw `DbError: DATABASE_URL env var is not set`. Pre-existing 8/9 ADMIN-09 gates green; Surface 3 broke as a side-effect of the rewrite.
- **Fix** — Added `vi.mock()` stubs for the 5 helpers (`requireAdmin`, `getActivePartnerCount`, `getTotalPartnerAccountCount`, `getMonthlyProposalCountAll`, `getRecentAdminActivity`, `listCoefficientHistory`) at the top of `tests/admin-09-grep-contracts.test.ts`. Mocks return non-empty data (1 coefficient row, 2 activity rows) so the grep contract scans the FULL render path — both activity-card header and footer, all 3 stat tiles, all 3 nav cards. The contract assertions (`commission_pct` and `_pct` regexes) still apply unchanged.
- **Files modified** — `tests/admin-09-grep-contracts.test.ts` (added 5 mock blocks).
- **Commit** — 7b55699.

**2. [Rule 1 - Test refinement] getInitials hyphenated-name behavior locked to whitespace-split only**

- **Found during** — Task 2 GREEN — initial impl split on `[\s-]+` which made "Jean-Luc Picard" → "JL" but my edge-case test expected "JP". The plan didn't specify either way.
- **Fix** — Changed impl to split on whitespace only (`/\s+/`). "Jean-Luc Picard" → words ["Jean-Luc", "Picard"] → first letters "JP". This matches French naming conventions where compound first names take a single initial. Documented in JSDoc + edge-case test.
- **Commit** — 334656e.

**3. [Rule 1 - Test refinement] Avatar color regex accepts jsdom's rgb() serialization**

- **Found during** — Task 2 GREEN — original test asserted `/color: (?:#fff|white)/` but jsdom serializes inline `color: '#ffffff'` to `color: rgb(255, 255, 255)`. Caught by Test 4.
- **Fix** — Updated regex to accept both forms with a comment explaining the jsdom behavior.
- **Commit** — 334656e.

### Known Stubs (carry-forward from 18-01)

No new stubs introduced by Plan 02. Plan 18-01's documented partials still apply —
- Recent activity invitations source (c) — DEFERRED, ships as 2-source union per D-05 partial. Admin Home renders whatever the helper returns; no behavior change here.
- Partner status sentence actor = "Admin" literal — Plan 02's RecentActivityRow renders the sentence as-is via the i18n template (`{0} a activé le compte de {1}` etc.), so the "Admin" literal flows through unchanged.

## Threat Flags

No new security-relevant surface introduced. T-18-02-* mitigations as planned —

- **T-18-02-01 (commission via Admin Home)** — mitigated. Stat tiles project only counts + a relative-day integer. AdminNavCard titles include the chrome label "Coefficients & commission" but NO commission VALUES cross the page. ADMIN-09 9-gate suite (incl. Surface 3 strict `commission_pct` + `_pct` regex absence) verified green post-change with full render path scanned.
- **T-18-02-02 (XSS via author name in Recent activity sentence)** — mitigated. `interpolateSentence` does positional `{N}` replacement via String.split/join (no `eval`, no raw-HTML sinks), and the result is rendered as a React text child (auto-escaped). Avatar initials are derived from actorName via the dedicated `getInitials` helper which strips non-letters defensively.
- **T-18-02-03 (empty-state leak)** — accepted. Showing "Aucune activité récente." reveals there's no recent admin activity; this is the intended UX and does not leak partner-side data.
- **T-18-02-04 (DoS via large coefficient_history row)** — accepted. The page reads `listCoefficientHistory({limit:1})` — bounded scan; coefficient_history is admin-write-only and audit-trail bounded.

## Verification

```
npx vitest run \
  src/components/ui/MetricTile.test.tsx \
  app/\(admin\)/\[adminSegment\]/_components/RecentActivityRow.test.tsx \
  app/\(admin\)/\[adminSegment\]/page.test.tsx \
  tests/admin-09-grep-contracts.test.ts
→ Test Files  4 passed (4)
  Tests       38 passed (38)

# Broader regression sweep (partner home + all admin pages + MetricTile primitive)
npx vitest run app/\(authed\)/page.test.tsx 'app/(admin)' src/components/ui/MetricTile.test.tsx
→ Test Files  11 passed (11)
  Tests       83 passed (83)

npx tsc --noEmit
→ exits 0 (TS + _EnHasAllFrKeys parity proof green)

grep -c 'valueColor="var(--teal)"' app/\(admin\)/\[adminSegment\]/page.tsx
→ 3   (one per stat tile per D-04)

grep -n "RecentActivityRow\|admin.home.activity.empty" app/\(admin\)/\[adminSegment\]/page.tsx
→ 9:  import { RecentActivityRow } from './_components/RecentActivityRow';
→ 229: {t('admin.home.activity.empty', lang)}
→ 235: <RecentActivityRow key={row.id} row={row} lang={lang} />

grep -cn "AdminNavCard" app/\(admin\)/\[adminSegment\]/page.tsx
→ 8  (1 import + 1 JSDoc + 3 usages × 2 mentions in surrounding context)

grep -n "onClick\|cursor:.*pointer\|href" \
  'app/(admin)/[adminSegment]/_components/RecentActivityRow.tsx' | grep -v '^#'
→ 5:  // NO onClick, NO hover affordance, NO row-level link (D-07).
→ 115: // NO cursor:pointer (D-07 read-only).
   (both hits are negating comments — no code-level matches)
```

ADMIN-09 9-gate suite — 9/9 green post-change. The page rewrite triggered Surface 3 to need DB mocks (Phase 14 was DB-free); mocks added in the same commit (7b55699). All other 8 surfaces unchanged.

## Commits

| Hash    | Task   | Summary                                                                                  |
| ------- | ------ | ---------------------------------------------------------------------------------------- |
| dcf1bb6 | Task 1 | feat(18-02): extend MetricTile with valueColor prop (D-04) — 3 new tests, additive API   |
| 334656e | Task 2 | feat(18-02): add RecentActivityRow component (D-06 / D-07) — 9 new tests, getInitials helper exported |
| 7b55699 | Task 3 | feat(18-02): rewrite Admin Home page per Figma 41:46 (D-01..D-07, D-29) — 12 new behavior tests, ADMIN-09 Surface 3 mocks added to keep 9-gate suite green |

## Self-Check: PASSED

Files verified to exist —
- ✓ `src/components/ui/MetricTile.tsx` — contains `valueColor?: string` interface member + `resolvedValueColor` style binding
- ✓ `src/components/ui/MetricTile.test.tsx` — contains 3 new tests under `'Phase 18 valueColor prop (D-04)'` describe
- ✓ `app/(admin)/[adminSegment]/_components/RecentActivityRow.tsx` — contains `RecentActivityRow` + exported `getInitials`
- ✓ `app/(admin)/[adminSegment]/_components/RecentActivityRow.test.tsx` — 9 tests
- ✓ `app/(admin)/[adminSegment]/page.tsx` — full Phase 18 rewrite (PageHero + 3 stat tiles + 3 nav cards + recent activity card)
- ✓ `app/(admin)/[adminSegment]/page.test.tsx` — 12 new behavior tests
- ✓ `tests/admin-09-grep-contracts.test.ts` — 5 new vi.mock blocks for the Admin Home query helpers

Commits verified to exist (via `git log --oneline | grep`) —
- ✓ dcf1bb6
- ✓ 334656e
- ✓ 7b55699

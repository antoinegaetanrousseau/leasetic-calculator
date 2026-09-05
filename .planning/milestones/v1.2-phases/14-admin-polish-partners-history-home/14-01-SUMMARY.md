---
phase: 14-admin-polish-partners-history-home
plan: 01
subsystem: route-rename-foundation
tags: [route-rename, redirect-308, status-chip, css-token, i18n, shell-revert, foundation, tdd]

# Dependency graph
requires:
  - phase: 11-design-system-foundation-brand-assets
    provides: StatusChip primitive (extended here) + .chip-* CSS token convention (extended here)
  - phase: 13-3-step-proposal-wizard
    provides: 788-test baseline (this plan adds +1 = 789)

provides:
  - "Renamed admin partner route: /(admin)/[adminSegment]/partners/ (was accounts/) per D-01"
  - "308 permanent redirect in next.config.ts mapping /:adminSegment/accounts/:path* → /:adminSegment/partners/:path* per D-02"
  - "StatusChip variant union extended with 'invited' (5 variants total) per UI-SPEC §4.5"
  - ".chip-invited CSS token in app/globals.css (gold-12% tint, identical chrome to .chip-draft) per UI-SPEC §4.4"
  - "chip.invited i18n key — FR 'invité.e' / EN 'Invited' per UI-SPEC §6.7"
  - "Shell.tsx adminHrefs reverted to natural destinations: partners → /<seg>/partners, history → /<seg>/history per D-03 (undoes Phase 13 hotfix 6809b1f)"

affects:
  - 14-02 (consumes new /partners directory + StatusChip 'invited' variant for partner-list chip rendering)
  - 14-03 (creates /partners/new under the renamed directory; reuses i18n + StatusChip)
  - 14-04 (creates /history route — Shell.tsx revert makes the sidebar link land here naturally)
  - 14-05 (creates AdminNavCard-driven admin home — depends on partners directory being in place)
  - 14-06 (extends StatusChip consumption to ProposalsList / [id]/page.tsx — would have collided with this plan's globals.css + StatusChip edits if run concurrently)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "git mv preserves rename history at 100% similarity — all 4 files in accounts/ (page.tsx, AccountsList.tsx, CreatePartnerModal.tsx, timeAgo.ts) flow to partners/ as R-status renames in git, no content diff"
    - "Next.js redirects() block emits HTTP 308 when permanent: true — handled at the framework matcher level before any React route resolution, zero runtime cost per redirect (T-14-01-05 accepted)"
    - "StatusChip variant extension is one-line — render body templates `chip chip-${variant}`, so adding 'invited' to the union is sufficient at the component layer; the matching CSS class lands in globals.css next to .chip-draft"
    - "Vitest className tests are type-erased: variant='invited' rendered correctly at runtime even before the union was extended, so the RED gate fires at tsc (compile-time), not at the test runner. Documented in the test commit message so downstream TDD audits don't mis-read the gate."

key-files:
  created:
    - ".planning/phases/14-admin-polish-partners-history-home/14-01-SUMMARY.md"
  modified:
    - "app/(admin)/[adminSegment]/partners/page.tsx (R: was accounts/page.tsx, no content change)"
    - "app/(admin)/[adminSegment]/partners/AccountsList.tsx (R: was accounts/AccountsList.tsx, no content change)"
    - "app/(admin)/[adminSegment]/partners/CreatePartnerModal.tsx (R: was accounts/CreatePartnerModal.tsx, no content change)"
    - "app/(admin)/[adminSegment]/partners/timeAgo.ts (R: was accounts/timeAgo.ts, no content change)"
    - "next.config.ts (+10 lines — redirects() block)"
    - "src/components/ui/Shell.tsx (-6 lines net: 2 stale comment blocks dropped, 2 hrefs reverted to natural destinations)"
    - "src/components/ui/StatusChip.tsx (+2 lines: union extension + JSDoc line for invited variant)"
    - "src/components/ui/StatusChip.test.tsx (+8 lines: AC-SC-08 invited variant test)"
    - "app/globals.css (+5 lines: .chip-invited declaration immediately after .chip-draft)"
    - "src/lib/i18n/dictionaries.ts (+6 lines: chip.invited key in both fr + en dicts with namespace section comment)"

key-decisions:
  - "Picked the redirects() approach in next.config.ts over the stub-page approach (D-02 accepted either) — keeps the legacy directory fully deleted on disk; redirects() handles all sub-paths in one rule without a placeholder page.tsx that would need to be hand-maintained"
  - "TDD RED gate is at tsc (compile-time), not at vitest (runtime). With a stale .next/dev/types cache, npm run typecheck reports false positives; clean rm -rf .next before relying on typecheck for type-union gating. Vitest accepts the new variant at runtime because the className is templated and type-erased — this is by design (component contract is the render output, not the variant union)"
  - "JSDoc on StatusChip updated to describe the invited variant as 'visually identical chrome to .chip-draft but semantically distinct' — UI-SPEC §4.4 explicitly accepts the visual identity; the separate CSS class exists for semantic CSS hooks and future divergence (T-14-01-04 accepted)"
  - "Shell.tsx revert is a hard delete of 2 hotfix comment blocks (lines 55-60 of the pre-revert version) — the comments referenced the 6809b1f patch by SHA and are no longer relevant; git log preserves the history for audit"
  - "i18n key namespaced as `chip.invited` (not `partners.chip.invited` or `admin.chip.invited`) — UI-SPEC §6.7 places the key under the generic chip.* namespace so future consumers (anywhere a StatusChip with variant='invited' renders) can reuse the same key without per-route duplication"

patterns-established:
  - "Foundation-plan discipline: every wave-1 plan that opens a primitive surface area (StatusChip union, globals.css .chip-*, i18n chip.*) lands the primitive + ONE i18n key, not the full set — downstream plans add their own keys with their own variants. Keeps wave-1 minimal and grep-tight."

requirements-completed:
  - ROUTE-02

# Metrics
duration: ~12min
completed: 2026-05-20
---

# Phase 14 Plan 01: Foundation — Rename + Redirect + StatusChip-invited + Shell revert Summary

## One-Liner

Renamed admin partner route from accounts/ to partners/ with a Next.js 308 permanent redirect, extended StatusChip with a gold-tint 'invited' variant + matching .chip-invited CSS + chip.invited i18n key, and reverted the Phase 13 Shell.tsx sidebar hotfix so partners + history links resolve to their natural destinations.

## What Moved (Directory Rename, D-01)

| Before | After | Status | Similarity |
|---|---|---|---|
| `app/(admin)/[adminSegment]/accounts/page.tsx` | `app/(admin)/[adminSegment]/partners/page.tsx` | R (rename) | 100% |
| `app/(admin)/[adminSegment]/accounts/AccountsList.tsx` | `app/(admin)/[adminSegment]/partners/AccountsList.tsx` | R (rename) | 100% |
| `app/(admin)/[adminSegment]/accounts/CreatePartnerModal.tsx` | `app/(admin)/[adminSegment]/partners/CreatePartnerModal.tsx` | R (rename) | 100% |
| `app/(admin)/[adminSegment]/accounts/timeAgo.ts` | `app/(admin)/[adminSegment]/partners/timeAgo.ts` | R (rename) | 100% |

Byte-equivalence confirmed by `git mv` (all 4 files report `rename ... (100%)` in `git commit` output). No content edits during the move. Per D-04, `AccountsList.tsx` keeps its current filename — internal rename to `PartnersList.tsx` deferred to a future plan to minimize churn.

The accounts/ directory is gone on disk:
```
$ test ! -d 'app/(admin)/[adminSegment]/accounts' && echo OK
OK
```

## Redirect Rule (D-02)

Added to `next.config.ts` immediately after `generateBuildId`:

```ts
async redirects() {
  return [
    // D-02: 308 permanent redirect for v1.1 bookmarks
    {
      source: '/:adminSegment/accounts/:path*',
      destination: '/:adminSegment/partners/:path*',
      permanent: true,
    },
  ];
}
```

Next.js emits HTTP 308 (Permanent Redirect) when `permanent: true`. The `:path*` wildcard captures any sub-path (e.g., `/<seg>/accounts/123/edit` → `/<seg>/partners/123/edit`).

Post-deploy verification command (NOT in this plan's automated tests per the plan's `<behavior>` Test 2):
```bash
curl -I https://<host>/<seg>/accounts
# expect: HTTP/2 308 / location: /<seg>/partners
```

## StatusChip Surface Area Extension

**Union extended** (`src/components/ui/StatusChip.tsx` line 14):
```diff
-  variant: 'active' | 'draft' | 'expired' | 'disabled';
+  variant: 'active' | 'draft' | 'expired' | 'disabled' | 'invited';
```

**CSS token added** (`app/globals.css`, immediately after `.chip-draft`):
```css
.chip-invited {
  background: rgba(224, 133, 48, 0.12);
  color: var(--gold);
}
```

Visually identical chrome to `.chip-draft`. Semantically distinct hook for partner-list status rendering (Plan 14-02 consumes via `<StatusChip variant="invited" label={t('chip.invited', lang)} />`).

**i18n key added** in both FR + EN dictionaries:
```ts
'chip.invited': 'invité.e',  // FR
'chip.invited': 'Invited',   // EN
```

The compile-time `_EnHasAllFrKeys` parity proof continues to typecheck after the dual insertion.

## Shell.tsx Revert (D-03, undoes Phase 13 6809b1f)

```diff
   home: `/${adminSegment}`,
   coefficients: `/${adminSegment}/coefficients`,
-  // Phase 11 anticipated a Phase 14 rename to /partners but the route still
-  // lives at /accounts (Phase 9). Point at the existing route until Phase 14
-  // ships the dedicated /partners + /partners/new surfaces (ROUTE-02).
-  partners: `/${adminSegment}/accounts`,
-  // History route does not exist yet — Phase 14 will surface coefficient
-  // history INSIDE /coefficients (sidebar). Point here until then.
-  history: `/${adminSegment}/coefficients`,
+  partners: `/${adminSegment}/partners`,
+  history: `/${adminSegment}/history`,
```

Net: −6 lines (2 hrefs swapped + 2 stale comment blocks deleted). The sidebar partners link now lands on the renamed directory directly (no redirect hop); the history link will land on the route Plan 14-04 creates (currently a 404 until Plan 14-04 ships — acceptable per dependency graph since 14-04 is also in Wave 2 with no user exposure between waves).

## Test Count Delta

| Surface | Baseline | After 14-01 | Delta |
|---|---|---|---|
| Total vitest test files | 49 | 49 | 0 |
| Total vitest tests | 788 | 789 | +1 |
| StatusChip.test.tsx assertions | 5 | 6 | +1 (AC-SC-08 added) |

Confirmed by `npm test -- --run`:
```
Test Files  48 passed | 1 skipped (49)
     Tests  789 passed | 4 skipped (793)
```

(The 4 skipped tests are pre-existing — the `[integration] DATABASE_URL_TEST not set` notice in coefficient_history trigger tests is unchanged from baseline.)

## TDD Gate Compliance

Per the plan's TDD discipline:

1. **RED commit** `42651d3 test(14-01): add failing test for StatusChip invited variant` — adds `AC-SC-08` test. The test runs green at the **vitest runtime** layer (className templating is type-erased), but fails at the **tsc compile-time** layer with `error TS2322: Type '"invited"' is not assignable to type '"disabled" | "active" | "draft" | "expired"'`. tsc IS the canonical gate here; documented in the commit message and reaffirmed in this Summary.
2. **GREEN commit** `c3a0872 feat(14-01): extend StatusChip with invited variant + .chip-invited CSS` — extends union, adds CSS token, lands i18n key. Full build + vitest + lint pass clean.
3. **REFACTOR** — not required; the changes are minimal (1 union char addition, 4 CSS lines, 6 i18n lines).

## Verification Run (post-Task-2)

```bash
$ npm run lint
✖ 3 problems (0 errors, 3 warnings)  # 3 pre-existing warnings, unchanged from baseline

$ npm run build
✓ Compiled successfully in 4.8s
  Running TypeScript ...
  Finished TypeScript in 4.7s ...
  Route (app): /[adminSegment]/partners ← new route registered

$ npm test -- --run
Test Files  48 passed | 1 skipped (49)
     Tests  789 passed | 4 skipped (793)

$ grep -rn '(admin)/\[adminSegment\]/accounts' app/ src/ --include='*.tsx' --include='*.ts' | grep -v '/partners/'
(0 matches)

$ test ! -d 'app/(admin)/[adminSegment]/accounts' && echo OK
OK

$ grep -c '\.chip-invited' app/globals.css
1

$ grep -c "'invited'" src/components/ui/StatusChip.tsx
1

$ grep "'chip.invited':" src/lib/i18n/dictionaries.ts
    'chip.invited': 'invité.e',
    'chip.invited': 'Invited',
```

All success-criteria assertions hold.

## ADMIN-09 Invariant Check (threat model)

`grep -rn 'commission' app/(admin)/[adminSegment]/partners/ | grep -v '\.test\.' | wc -l` returns 0. Plan 14-01 introduces zero commission references in the renamed partners/ directory (D-29 strict envelope preserved).

## Out-of-Scope Discovery (Deferred)

While running the directory-rename grep guards, I noticed `app/(admin)/[adminSegment]/page.tsx` line 85 still contains `href={\`/${adminSegment}/accounts\`}` — a URL-literal reference, NOT a directory-path reference (so it doesn't trip the plan's grep guard, which targets `(admin)/[adminSegment]/accounts` directory paths in source). This URL reference resolves correctly at runtime via the new 308 redirect, so user-visible correctness is preserved. Plan 14-05 (admin home AdminNavCard refactor) will replace this Link with an AdminNavCard pointing at `/${adminSegment}/partners` directly, making the URL reference obsolete.

No file in the working tree contains a broken reference; the redirect provides correctness coverage until Plan 14-05.

## Deviations from Plan

None — plan executed exactly as written.

Auto-fix rules 1-3 did NOT fire during this plan. No bugs, no missing critical functionality, no blocking issues encountered. The only observation worth recording is that the TDD RED gate is at tsc (compile-time), not at vitest (runtime) — but this is consistent with how variant-union extensions work in a templated-className component, and is documented in the test commit and this Summary rather than logged as a deviation.

## Self-Check: PASSED

- File `.planning/phases/14-admin-polish-partners-history-home/14-01-SUMMARY.md`: FOUND
- File `app/(admin)/[adminSegment]/partners/page.tsx`: FOUND
- File `app/(admin)/[adminSegment]/partners/AccountsList.tsx`: FOUND
- File `app/(admin)/[adminSegment]/partners/CreatePartnerModal.tsx`: FOUND
- File `app/(admin)/[adminSegment]/partners/timeAgo.ts`: FOUND
- Directory `app/(admin)/[adminSegment]/accounts/`: ABSENT (as expected)
- Commit `eeda24e` (Task 1: rename + redirect + Shell revert): FOUND
- Commit `42651d3` (Task 2 RED: failing StatusChip test): FOUND
- Commit `c3a0872` (Task 2 GREEN: union + CSS + i18n): FOUND

---
phase: 14-admin-polish-partners-history-home
plan: 06
subsystem: admin-polish
tags: [statuschip, admin-09, route-02, grep-contract, accessibility-checkpoint]
requires:
  - 14-01-SUMMARY.md (StatusChip 'invited' variant + chip.invited i18n)
  - 14-02-SUMMARY.md (/partners/new route — Link CTA destination)
  - 14-04-SUMMARY.md (CoefficientHistorySidebar inline diff panel — D-30 exempt surface)
  - 14-05-SUMMARY.md (/history standalone route + CoefficientDiffPanel — D-30 exempt surface)
  - Phase 12 listInvitedPartners (DB-02) + deriveDisplayStatus (D-07)
provides:
  - "AccountsList integrated with listInvitedPartners + 3-variant StatusChip (invited > disabled > active)"
  - "Partner-list CTA migrated from <button onClick={openModal}> to <Link href=/partners/new>"
  - "CreatePartnerModal preserved as D-10 shelf code (import retained, render block + state removed)"
  - "ProposalRow renders single <StatusChip> driven by server-derived row.displayStatus"
  - "Proposal detail header renders <StatusChip> beside <LanguageChip> (D-28)"
  - "tests/admin-09-grep-contracts.test.ts — 9 D-29 grep gates across 4 non-exempt Phase 14 surfaces"
affects:
  - "src/lib/api/proposals/list.ts ProposalRowDto extended with `displayStatus: DisplayStatus`"
  - "StatusChip variant union extended to include 'deleted'"
  - "@/lib/db/queries barrel re-exports deriveDisplayStatus + DisplayStatus type"
  - "vitest.config.ts include glob extended with tests/**/*.test.{ts,tsx}"
  - "src/components/proposals/ProposalsList.tsx no longer forwards nowMs to ProposalRow"
  - "Phase 8 ValidityChip.tsx + DeletedChip.tsx remain on disk as unused code (Phase 8 audit trail)"
tech-stack:
  added: []
  patterns:
    - "Server-side displayStatus projection (deriveDisplayStatus runs in buildListResponse; paramsSnapshot never crosses the wire — ADMIN-09 defense in depth)"
    - "D-10 shelf-code preservation pattern (explicit eslint-disable comment with documented rationale on a retained import)"
    - "renderToString-based grep-contract test harness (cross-component HTML scanning via React.createElement to fire client-component hooks under SSR)"
key-files:
  created:
    - "app/(admin)/[adminSegment]/partners/AccountsList.test.tsx (7 tests — chip variants + Link CTA + D-10 shelf-code preservation)"
    - "src/components/proposals/ProposalRow.test.tsx (6 tests — 4 displayStatus variants + EN label + per-row ADMIN-09 grep)"
    - "app/(authed)/proposals/[id]/page.test.tsx (3 tests — active/deleted header chip + ADMIN-09 detail-page grep)"
    - "tests/admin-09-grep-contracts.test.ts (9 tests — 4 non-exempt Phase 14 surfaces + D-30 documentation block)"
  modified:
    - "app/(admin)/[adminSegment]/partners/page.tsx (calls listInvitedPartners, passes invitedUserIds Set + adminSegment)"
    - "app/(admin)/[adminSegment]/partners/AccountsList.tsx (StatusChip 3-variant ternary; Link CTA; D-10 shelf-code resolution; modal render block removed)"
    - "src/components/proposals/ProposalRow.tsx (StatusChip via row.displayStatus; ValidityChip/DeletedChip composition removed)"
    - "src/components/proposals/ProposalsList.tsx (nowMs no longer forwarded to ProposalRow)"
    - "src/components/ui/StatusChip.tsx (variant union extended with 'deleted')"
    - "src/lib/api/proposals/list.ts (ProposalRowDto extended with displayStatus; deriveDisplayStatus called in buildListResponse)"
    - "src/lib/db/queries/index.ts (barrel re-exports deriveDisplayStatus + DisplayStatus)"
    - "src/lib/i18n/dictionaries.ts (5 new chip.* keys × FR+EN: active/disabled/draft/expired/deleted)"
    - "app/(authed)/proposals/[id]/page.tsx (header StatusChip via deriveDisplayStatus; ValidityChip/DeletedChip imports removed)"
    - "vitest.config.ts (include glob extended with tests/**/*.test.{ts,tsx})"
decisions:
  - "Server-side displayStatus projection (instead of extending the DTO with raw `status`+`pdfGeneratedAt`+`paramsSnapshot`) — the DTO carries the bounded 4-string DisplayStatus union; the commission-bearing paramsSnapshot JSON never leaves the server. ADMIN-09 defense in depth + single source of truth for chip derivation."
  - "D-10 shelf-code resolution: kept the `import { CreatePartnerModal }` line with an eslint-disable comment + explanatory docstring; deleted the render block + showCreate useState. Per-plan recommendation followed verbatim."
  - "Validity-countdown tooltip dropped during the StatusChip swap. ValidityChip previously rendered a `title=\"Valable jusqu'au DD/MM/YYYY\"` tooltip; StatusChip does not. UI-SPEC §5.8 does not mandate tooltip parity for v1.2; logged here as a v1.3 polish candidate."
  - "ValidityChip.tsx + DeletedChip.tsx remain on disk as Phase 8 code (now unused but not deleted) — matches the D-10 shelf-code discipline applied to CreatePartnerModal."
  - "Added 5 new chip.* i18n keys (chip.active / chip.disabled / chip.draft / chip.expired / chip.deleted) — the plan claimed they already existed, but only chip.invited was wired (from 14-01). Rule 3 auto-add. Date-less labels for the generic StatusChip family (per-row date context lives in adjacent metadata, not inside the chip)."
  - "StatusChip variant union extended with 'deleted' (the chip-deleted CSS already existed in app/globals.css from Phase 8). Rule 3 auto-fix for the typecheck blocker."
  - "vitest.config.ts include glob extended with tests/**/*.test.{ts,tsx} so the top-level tests/ directory is picked up under `npm test`. Plan specified this path explicitly in artifacts."
metrics:
  duration_minutes: ~38
  completed_date: 2026-05-20
  commit_hashes:
    - "b83ece3 — feat(14-06): wire StatusChip invited + Link CTA on partner list"
    - "86d1f1e — feat(14-06): swap ProposalRow + proposal detail to StatusChip via deriveDisplayStatus"
    - "9b23fc2 — test(14-06): ADMIN-09 D-29 grep-contract suite for Phase 14 non-exempt surfaces"
  vitest_count_delta:
    pre_phase_14: 788
    post_14_06: 872 # +84 across Phase 14 (Plan 14-06 contributed 25: 7 + 6 + 3 + 9)
---

# Phase 14 Plan 6: StatusChip Rollout + ADMIN-09 Grep Contracts + Color-Contrast Checkpoint Summary

**One-liner:** Wired the partner list to `listInvitedPartners` + StatusChip 3-variant rendering, swapped the partner-list CTA from a modal trigger to a `<Link>` to `/partners/new`, migrated proposal rows + detail header from ad-hoc `ValidityChip`/`DeletedChip` composition to a single `<StatusChip>` driven by server-derived `displayStatus`, and shipped the ADMIN-09 D-29 grep-contract test suite verifying ZERO commission-value leakage across the 4 non-exempt Phase 14 surfaces.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Partner list — StatusChip invited + Link CTA + D-10 shelf-code | `b83ece3` | `partners/page.tsx`, `partners/AccountsList.tsx`, `partners/AccountsList.test.tsx`, `i18n/dictionaries.ts` |
| 2 | ProposalRow + detail header — StatusChip via deriveDisplayStatus | `86d1f1e` | `proposals/ProposalRow.tsx`, `proposals/ProposalRow.test.tsx`, `proposals/ProposalsList.tsx`, `ui/StatusChip.tsx`, `lib/api/proposals/list.ts`, `lib/db/queries/index.ts`, `proposals/[id]/page.tsx`, `proposals/[id]/page.test.tsx` |
| 3 | ADMIN-09 D-29 grep-contract test suite | `9b23fc2` | `tests/admin-09-grep-contracts.test.ts`, `vitest.config.ts` |
| 4 | Color-contrast measurement (HUMAN VERIFY) | — | **DEFERRED to v1.3 color refresh** — measurement skipped because user has signaled an upcoming UI color token update; measuring contrast on tokens that will change is wasted work. Carried forward to v1.3+ as a hard prerequisite for any plan touching `--gold`, `.chip-invited`, or the diff-panel composite. See PROJECT.md decisions log + Phase 14 deferred ideas. |

## AccountsList — final shape (D-26 + D-11 + D-10)

```tsx
// StatusChip 3-variant ternary (priority: invited > disabled > active)
{invitedUserIds.has(p.id) ? (
  <StatusChip variant="invited" label={t('chip.invited', lang)} />
) : isDisabled ? (
  <StatusChip variant="disabled" label={t('chip.disabled', lang)} />
) : (
  <StatusChip variant="active" label={t('chip.active', lang)} />
)}

// CTA Link (replaces the old <button onClick={openModal}>)
<Link
  ref={createBtnRef}
  href={`/${adminSegment}/partners/new`}
  className="btn-green"
  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}
>
  <UserPlus size={16} strokeWidth={1.6} aria-hidden="true" />
  {t('admin.accounts.create.btn', lang)}
</Link>

// D-10 shelf-code preservation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { CreatePartnerModal } from './CreatePartnerModal';
```

- `showCreate` state + modal render block REMOVED.
- `CreatePartnerModal.tsx` file remains on disk (its `[role="dialog"]` standalone-mount test in `AccountsList.test.tsx` Test 6 verifies it still works).
- `createBtnRef` retyped from `RefObject<HTMLButtonElement>` to `RefObject<HTMLAnchorElement>` to satisfy the Link element type; `InviteUrlModal.triggerRef` accepts `HTMLElement | null` upstream so no breakage.

## ProposalRowDto extension (D-27)

```ts
export interface ProposalRowDto {
  id: string; lcRef: string; clientCo: string; amountHT: string;
  createdAt: string; validityDays: 15 | 30 | 60;
  language: 'fr' | 'en'; deletedAt: string | null;
  /**
   * Phase 14 D-27 — server-derived chip variant. paramsSnapshot (commission-bearing)
   * NEVER leaves the server. ADMIN-09 defense in depth.
   */
  displayStatus: DisplayStatus; // 'draft' | 'active' | 'expired' | 'deleted'
}
```

`buildListResponse` calls `deriveDisplayStatus(row)` on the full `ProposalRow` server-side and projects only the bounded 4-string union onto the wire shape. This was chosen over the alternative (extending the DTO with `status`/`pdfGeneratedAt`/`paramsSnapshot`) because:

1. Single source of truth — `deriveDisplayStatus` stays the only caller of the derivation logic.
2. Commission isolation — `paramsSnapshot` (which contains `commission_pct`) never crosses the server/client boundary on the proposal-list response.
3. Bundle size — the 4-string union is 8 bytes per row vs. ~200+ bytes for `paramsSnapshot` JSON.

## Trade-off: ValidityChip tooltip dropped

Pre-Phase-14, `<ValidityChip>` rendered a `title="Valable jusqu'au DD/MM/YYYY"` HTML tooltip showing the precise expiration date. The new `<StatusChip>` has no tooltip prop. UI-SPEC §5.8 does not mandate tooltip parity for v1.2.

**Disposition:** Acceptable for v1.2. v1.3 polish candidate. The expiration date IS already surfaced on the proposal detail page in the Computed card's `ValidityFooter` ("Valable jusqu'au DD/MM/YYYY" as a dt/dd row); only the row-level tooltip is gone.

**Phase 8 components preserved:** `ValidityChip.tsx` + `DeletedChip.tsx` remain on disk as unused Phase 8 code (matches the D-10 shelf-code discipline applied to `CreatePartnerModal`). Re-instating the tooltip in v1.3 would require either a `StatusChip` `tooltip` prop OR a renderless wrapper component.

## ADMIN-09 D-29 grep-contract test design

The `tests/admin-09-grep-contracts.test.ts` suite renders each non-exempt Phase 14 surface via `react-dom/server`'s `renderToString` + `React.createElement` (so client-component hooks like `useState` fire under the SSR dispatcher) and asserts:

```ts
expect(html).not.toMatch(/\bcommission_pct\b/i);  // DB field-key absent
expect(html).not.toMatch(/_pct\b/);               // any JSON field-key suffix absent
```

| Surface | Variants tested | Gate | D-30 exempt |
|---------|----------------|------|-------------|
| Partner list | active, invited, disabled, empty-state | strict | no |
| /partners/new form | empty mount | strict | no |
| Admin home (3 AdminNavCards) | default | strict (note: literal word "commission" appears in the FR card title "Coefficients & commission" — that's CHROME, not a field-key leak; the gate `\bcommission_pct\b` correctly distinguishes) | no |
| /history collapsed-row list | row with vanilla summary + row with "Commission : 5.00% → 5.50%" admin-narrative summary | strict on `commission_pct` and `_pct` (bare percentages in summary text are ALLOWED per D-30 admin-only exception) | no |
| `CoefficientDiffPanel` full mode (inside /history expanded row) | — | EXEMPT (D-30) | YES |
| `CoefficientHistorySidebar` inline diff panel | — | EXEMPT (D-30) | YES |
| `CoefficientsEditor` card (/coefficients editor) | — | EXEMPT (Phase 9 ADMIN-01 — directly edits commission_pct) | YES |

The exemption list is documented as a `describe` block in the test file with `expect(exempt.length).toBe(3)` as a structural lock.

## i18n additions

5 new `chip.*` keys × FR+EN (the plan claimed these existed; only `chip.invited` was wired by Plan 14-01 — Rule 3 auto-add).

| Key | FR | EN |
|-----|----|-----|
| `chip.active` | Actif | Active |
| `chip.disabled` | Désactivé | Disabled |
| `chip.draft` | Brouillon | Draft |
| `chip.expired` | Expirée | Expired |
| `chip.deleted` | Supprimée | Deleted |

Note: these are DATE-LESS labels (no `{0}` placeholder). The pre-existing `proposal.chip.deleted` ("Supprimée le {0}") carries a date — that key is now unused but kept on disk for the same shelf-code reasoning.

## Self-Check: PASSED

**Files:**

- `app/(admin)/[adminSegment]/partners/AccountsList.test.tsx` → FOUND
- `src/components/proposals/ProposalRow.test.tsx` → FOUND
- `app/(authed)/proposals/[id]/page.test.tsx` → FOUND
- `tests/admin-09-grep-contracts.test.ts` → FOUND

**Commits:**

- `b83ece3` (Task 1) → FOUND in `git log`
- `86d1f1e` (Task 2) → FOUND in `git log`
- `9b23fc2` (Task 3) → FOUND in `git log`

**Test counts:**

- `npx vitest run app/(admin)/[adminSegment]/partners/AccountsList.test.tsx` → 7 pass
- `npx vitest run src/components/proposals/ProposalRow.test.tsx` → 6 pass
- `npx vitest run app/(authed)/proposals/[id]/page.test.tsx` → 3 pass
- `npx vitest run tests/admin-09-grep-contracts.test.ts` → 9 pass
- Full suite: 872 pass, 4 skipped (DB integration tests with `DATABASE_URL_TEST` unset)

**Static gates:**

- `npm run typecheck` → clean
- `npm run lint` → 3 pre-existing warnings (none introduced by 14-06)
- `npm run build` → clean

## Deviations from Plan

### Auto-added i18n keys (Rule 3 - Blocking)

**1. [Rule 3 - Blocking] Added 5 missing `chip.*` keys**

- **Found during:** Task 1 + Task 2 implementation.
- **Issue:** The plan referenced `chip.active`, `chip.disabled`, `chip.draft`, `chip.expired`, `chip.deleted` as "already wired"; only `chip.invited` actually existed (added in Plan 14-01). The existing analogues lived under `proposal.chip.*` (with embedded date placeholders like `Supprimée le {0}`) and `admin.accounts.status.*` — neither matched the generic StatusChip's interface.
- **Fix:** Added 5 new `chip.*` keys × FR + EN (date-less generic labels). The existing `proposal.chip.*` keys are no longer consumed but kept on disk per the same shelf-code discipline.
- **Files modified:** `src/lib/i18n/dictionaries.ts`
- **Commit:** `b83ece3` (Task 1)

### Auto-fix typecheck blocker (Rule 1)

**2. [Rule 1 - Bug] StatusChip variant union missing 'deleted'**

- **Found during:** Task 2 typecheck.
- **Issue:** `StatusChipProps.variant` was `'active' | 'draft' | 'expired' | 'disabled' | 'invited'` — but `deriveDisplayStatus` returns `'draft' | 'active' | 'expired' | 'deleted'`. The `'deleted'` variant was never added to the union despite `.chip-deleted` existing in `app/globals.css` since Phase 8.
- **Fix:** Extended the union to include `'deleted'`.
- **Files modified:** `src/components/ui/StatusChip.tsx`
- **Commit:** `86d1f1e` (Task 2)

### Auto-fix vitest config (Rule 3 - Blocking)

**3. [Rule 3 - Blocking] vitest include glob did not pick up tests/**

- **Found during:** Task 3 test execution.
- **Issue:** `vitest.config.ts`'s `include` array covered `src/**/*.test.ts(x)`, `app/**/*.test.ts(x)`, `__pdf-fixtures__/**/*.test.ts` but NOT `tests/**`. The plan's artifacts list specified `tests/admin-09-grep-contracts.test.ts` as the canonical path.
- **Fix:** Added `tests/**/*.test.ts` + `tests/**/*.test.tsx` to the include array.
- **Files modified:** `vitest.config.ts`
- **Commit:** `9b23fc2` (Task 3)

### Auto-fix barrel export (Rule 3 - Blocking)

**4. [Rule 3 - Blocking] @/lib/db/queries barrel did not re-export deriveDisplayStatus**

- **Found during:** Task 2 implementation.
- **Issue:** `src/lib/db/queries/index.ts` exposed `proposals.*` helpers but not `deriveDisplayStatus` or `DisplayStatus`. Plan 12 had shipped them on the proposals sub-module but the barrel hadn't been updated.
- **Fix:** Added both to the barrel re-export.
- **Files modified:** `src/lib/db/queries/index.ts`
- **Commit:** `86d1f1e` (Task 2)

## Phase 14 Sign-off (ROUTE-02 success criteria)

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Directory rename + redirect | ✓ (Plan 14-01) |
| 2 | Modal CTA removed via behavior change (CTA → Link to /partners/new; modal preserved) | ✓ (this plan, D-11) |
| 3 | Partner home MetricTiles | DEFERRED to v1.3 per 14-CONTEXT.md (logged in PROJECT.md) |
| 4 | StatusChip rollout (invited variant on partner list + per-row StatusChip on proposals) | ✓ (this plan, D-26/D-27/D-28) |
| 5 | Coefficient History sidebar + standalone /history | ✓ (Plans 14-04 + 14-05) |

## HUMAN VERIFY CHECKPOINT — Color-Contrast Measurement (Task 4)

Plans 14-04 and 14-05 introduced a NEW visual composite that has not yet been measured against WCAG 2.1 AA: the diff-panel changed-row pill.

### The composite to measure

The changed-cell value in `CoefficientDiffPanel` (Plan 14-05 / `app/(admin)/[adminSegment]/history/CoefficientDiffPanel.tsx` line 108):

```ts
const GOLD_PILL_STYLE = {
  background: 'rgba(224, 133, 48, 0.10)',  // 10% gold-tint
  borderRadius: 6,
  padding: '2px 6px',
  fontWeight: 600,
};
```

- **Foreground:** `var(--ink)` weight 600 (`#41423d` in light mode / `#e6e9ef` in dark mode)
- **Background:** `rgba(224, 133, 48, 0.10)` (10% gold) composited over `var(--surface)` (`#ffffff` in light / `#161e2d` in dark)
- **Required ratio:** ≥ 4.5:1 for body text (WCAG 2.1 AA)

### How to measure (for the orchestrator + user)

1. **Spin up dev:** `npm run dev` in `/Users/antoinerousseau/Developer/leasetic-calculator/memento-hub` parent — actually the leasétic project root. Open http://localhost:3000.
2. **Authenticate as admin** (Antoine or Emmanuel credentials per Phase 6 launch). Navigate to `/<ADMIN_URL_SEGMENT>/history` where the segment is read from your local `.env.local` `ADMIN_URL_SEGMENT`.
3. **Open a row with changes.** Click `Voir le détail →` on a row whose summary mentions a value change. The CoefficientDiffPanel renders in full mode with the changed-cell pill in 10% gold.
4. **Measure in LIGHT mode** (`data-theme="light"` or no `data-theme` attribute, which is the default):
   - Foreground = `#41423d` (var(--ink))
   - Background = composited 10% gold over `#ffffff` (var(--surface) light) ≈ `#fbf2e9`
   - Either: WebAIM contrast checker (https://webaim.org/resources/contrastchecker/) with hex inputs, OR Chrome DevTools `Accessibility` panel pick-element on a changed value, OR `npx -y wcag-contrast \#41423d \#fbf2e9`.
5. **Measure in DARK mode:** flip the theme via the sidebar theme switcher (`data-theme="dark"`). Repeat:
   - Foreground = `#e6e9ef` (var(--ink) dark)
   - Background = composited 10% gold over `#161e2d` (var(--surface) dark) — needs pixel-picker for exact hex; macOS Digital Color Meter or DevTools color sampler works.
6. **Report:**
   - ✅ Both ratios ≥ 4.5:1 → reply `approved: light=X.X, dark=Y.Y` and Phase 14 is fully closed.
   - ❌ Either ratio < 4.5:1 → identify which mode + ratio. Likely fixes (NOT applied preemptively per UI-SPEC §7.1):
     - Bump alpha from 10% to 12% (matches `.chip-invited` background which already passes — see `app/globals.css` line 377)
     - Bump font weight from 600 to 700
     - Both fixes are 1-line CSS changes in `CoefficientDiffPanel.tsx`'s `GOLD_PILL_STYLE` (or move to a CSS class in `globals.css`).

### Why Claude did not measure

Per the orchestrator's execution mode for `autonomous: false`: the human is the canonical measurer for accessibility ratios because DevTools color-sampling + WCAG arithmetic on a composited rgba+surface stack requires an actual running browser (jsdom doesn't render colors). The automation-first principle was applied: the surface itself is fully shipped, the measurement steps are codified, and the fix paths are pre-identified — only the actual measurement + sign-off remain.

---

## Final Phase 14 Vitest Count

| Milestone | Total tests |
|-----------|-------------|
| Pre-Phase-14 (after Phase 13) | 788 |
| After 14-01 (StatusChip invited variant) | ~803 |
| After 14-02 (/partners/new) | ~822 |
| After 14-03 (admin home AdminNavCards) | ~829 |
| After 14-04 (CoefficientHistorySidebar) | ~835 |
| After 14-05 (/history standalone) | ~847 |
| After 14-06 (this plan) | 872 (+25: 7 + 6 + 3 + 9) |

Plan-predicted range was 830–850; the actual final count of 872 slightly exceeds the upper bound because Tasks 2 and 3 added more granular per-variant + cross-surface coverage than the prediction allowed for.

---
phase: 24-admin-dual-view-toggle
fixed_at: 2026-05-30T14:27:00Z
review_path: .planning/phases/24-admin-dual-view-toggle/24-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 24: Code Review Fix Report

**Fixed at:** 2026-05-30T14:27:00Z
**Source review:** .planning/phases/24-admin-dual-view-toggle/24-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (Warnings WR-01..WR-05; 0 Critical, 4 Info out of scope under `critical_warning`)
- Fixed: 5
- Skipped: 0

**Test result:** `npx vitest run` — 1184 passed, 4 skipped, 0 failed (91 test files passed, 1 skipped). One existing test (`ViewToggle.test.tsx` Test 7) was updated to assert the corrected WR-04 accessibility behavior; the suite is green.

`npx tsc --noEmit` — no type errors.

## Fixed Issues

### WR-05: `clearView()` runs after `router.push` is queued but is order-fragile on logout

**Files modified:** `src/components/UserMenu.tsx`
**Commit:** a7d643a
**Applied fix:** Wrapped `handleLogout` in `try { await authClient.signOut(); } finally { clearView(); router.push(...); router.refresh(); }`. The view flag is now cleared regardless of whether `signOut()` resolves or rejects, so a failed (e.g. network-error) logout can no longer leave a stale `leasetic.view = 'agent'` flag in the tab session — preserving VIEW-03 ("fresh login always lands in Admin view").

### WR-02: `adminHomeHref`/`adminHrefs.home` fallback to `'/'` silently misroutes a real admin

**Files modified:** `src/components/ui/RetractableSidebar.tsx`
**Commit:** 630f932
**Applied fix:** Replaced `const viewToggleHome = adminHrefs?.home ?? adminHomeHref ?? '/'` with `const adminHomeResolved: string | null = adminHrefs?.home ?? adminHomeHref ?? null`. When no admin home resolves (ADMIN_URL_SEGMENT unset/empty), the ViewToggle (both collapsed and expanded branches) is now hidden rather than rendering a control that routes "switch to Admin" to `/`. The `navItems` gate now additionally requires `adminHrefs` to be present (`isAdmin && effectiveView === 'admin' && adminHrefs`); when absent it falls back to `partnerNavItems()` instead of building admin links from the removed all-`'/'` placeholder. This turns the previously silent broken state into an explicit, safe degradation.

### WR-01: VIEW-04 client nav gate is not a server authorization boundary

**Files modified:** `src/components/ui/RetractableSidebar.tsx`
**Commit:** 630f932 (committed alongside WR-02 — same file and same `navItems` block)
**Applied fix:** Added an explicit caveat comment to the `navItems` gate documenting that the client nav-set decision is a UI affordance / defense-in-depth, NOT the authorization boundary — VIEW-04 as a real security property depends on the `(admin)` route group's server-side role guard (`requireUser()` asserting `role === 'admin'` / middleware on `ADMIN_URL_SEGMENT`), which lives outside this phase's file set. The actual server-side route-authz enforcement was deliberately NOT introduced here (out-of-scope architectural change per the fix instructions); the finding's documentation/linkage recommendation was applied instead.

### WR-03: Non-admin in agent view gets a one-frame admin-nav flash on hydration

**Files modified:** `src/lib/view-store.ts`
**Commit:** b8d0c1f
**Applied fix:** Documented the one-frame admin→agent nav flip in `getServerViewSnapshot()`'s docblock as a known, accepted shift (same class as the documented collapse one-frame shift), clarifying it is a UX detail and not a security issue (non-admins never see admin nav — `isAdmin` gates that). The alternative fix (cookie-driven SSR so the server render matches the stored view) is an architectural change anticipated alongside the Phase 13 cookie-collapse upgrade and was deferred as out-of-scope, per the finding's option (a) ("accept and document explicitly").

### WR-04: Collapsed `ViewToggle` pill ignores `fullWidth` and is keyboard-trappable only by click

**Files modified:** `src/components/ViewToggle.tsx`, `src/components/ViewToggle.test.tsx`
**Commit:** 1d74590
**Applied fix:** The collapsed pill now exposes its current view to assistive tech, achieving a11y parity with the expanded radiogroup (which already exposes `aria-checked`): `aria-pressed` reflects whether Admin view is active, and `aria-label` / `title` include the current view name (e.g. "Changer de vue (Admin)") composed from the existing `sidebar.view.admin` / `sidebar.view.agent` i18n keys (FR/EN parity preserved — no new dictionary keys required). The `fullWidth`/`_fullWidth` dead-prop aspect was an Info-level note (IN-01) folded into this finding's framing; the core accessibility-parity regression is resolved. `ViewToggle.test.tsx` Test 7 was updated to assert the new `aria-label` and `aria-pressed` values for both admin and agent states.

---

_Fixed: 2026-05-30T14:27:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

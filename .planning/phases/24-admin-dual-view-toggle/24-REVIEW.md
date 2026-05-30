---
phase: 24-admin-dual-view-toggle
reviewed: 2026-05-30T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - app/(authed)/layout.tsx
  - src/components/UserMenu.tsx
  - src/components/ViewToggle.tsx
  - src/components/ViewToggle.test.tsx
  - src/components/ui/RetractableSidebar.tsx
  - src/components/ui/RetractableSidebar.test.tsx
  - src/components/ui/Shell.tsx
  - src/lib/i18n/dictionaries.ts
  - src/lib/view-store.ts
  - src/lib/view-store.test.ts
findings:
  critical: 0
  warning: 5
  info: 4
  total: 9
status: issues_found
---

# Phase 24: Code Review Report

**Reviewed:** 2026-05-30
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Reviewed the admin-only Admin/Agent view toggle: the `sessionStorage`-backed `useSyncExternalStore` view store, the `ViewToggle` component, `RetractableSidebar` nav-set selection via `effectiveView`, and the `adminHomeHref` server plumbing.

**Security verdict on VIEW-04 (the stated critical property): the authorization boundary holds for the sidebar nav-set decision.** In `RetractableSidebar.tsx:235-238` the admin nav is gated on `isAdmin && effectiveView === 'admin'`, where `isAdmin` is server-derived (`role === 'admin'` in `app/(authed)/layout.tsx:42`). A non-admin who forges `sessionStorage['leasetic.view'] = 'admin'` still receives `partnerNavItems()` because `isAdmin` short-circuits the `&&`. The `RetractableSidebar.test.tsx` AC-RS-24-02 test confirms `isAdmin=false` yields no ViewToggle. **One important caveat (WR-01): the sidebar nav is only a UI affordance. This review found no server-side route authorization in the reviewed file set, so VIEW-04 as a true security property depends on out-of-scope route guards. The client gate is necessary but not sufficient — flagged so it is not mistaken for the whole boundary.**

No Critical defects were found. Five Warnings concern dead/misleading plumbing, a hydration-driven flash for non-admins in agent view, and a redirect fallback that can silently land an admin on the wrong page. Four Info items cover dead props, a magic color literal, and an unused dictionary key.

## Warnings

### WR-01: VIEW-04 client nav gate is not a server authorization boundary

**File:** `src/components/ui/RetractableSidebar.tsx:232-238`
**Issue:** The nav-set decision correctly gates on the server-derived `isAdmin`, so a forged `sessionStorage` flag cannot surface the admin nav links for a non-admin. However, this is a *rendering* decision only. Hiding the `adminHrefs` links does not prevent a non-admin from navigating directly to an admin URL (e.g. by typing `/${ADMIN_URL_SEGMENT}/coefficients`). If the actual admin routes are not independently guarded server-side (no such guard exists in the reviewed file set), VIEW-04 is satisfied cosmetically but not as a real authorization boundary. The phase brief frames VIEW-04 as "a non-admin must NOT be able to obtain the admin nav" — the *links* are gated, but link-gating is defense-in-depth, not the gate.
**Fix:** Confirm the `(admin)` route group has a server-side role check (layout `requireUser()` asserting `role === 'admin'`, or middleware on `ADMIN_URL_SEGMENT`). Do not rely on the sidebar omission as the enforcement point. If such a guard already exists outside this phase's files, document that linkage in the plan so the client gate is not misread as the boundary.

### WR-02: `adminHomeHref`/`adminHrefs.home` fallback to `'/'` silently misroutes a real admin

**File:** `src/components/ui/RetractableSidebar.tsx:209` (and `:237`)
**Issue:** `const viewToggleHome = adminHrefs?.home ?? adminHomeHref ?? '/';`. The `'/'` fallback is described in the comment as "a safe no-op (should not occur for real admins)." But it *can* occur for a real admin: `adminHomeHref` in `app/(authed)/layout.tsx:25-28` is `undefined` whenever `process.env.ADMIN_URL_SEGMENT` is unset/empty. In that configuration an admin on a non-admin route who clicks "Admin" in the ViewToggle calls `router.push('/')` — staying on the agent home while `setView('admin')` flips the stored flag. The sidebar then shows the admin nav but the user did not move to the admin surface, and `effectiveView` on `/` is now `'admin'` with `adminHrefs` undefined, so `adminNavItems` is built from the `{ home: '/', coefficients: '/', partners: '/', history: '/' }` placeholder (line 237) — every admin nav link points to `/`. This is a broken-but-silent state, not a no-op.
**Fix:** Treat a missing admin home as a hard configuration error rather than silently degrading. Either assert `ADMIN_URL_SEGMENT` is present at boot (fail fast in the layout), or when `viewToggleHome` would be `'/'` for an admin, disable/hide the Admin segment instead of rendering links that all resolve to `/`. At minimum, do not build `adminNavItems` from an all-`'/'` placeholder — if `adminHrefs` is absent while `effectiveView === 'admin'`, fall back to `partnerNavItems()`.

### WR-03: Non-admin in agent view gets a one-frame admin-nav flash on hydration

**File:** `src/lib/view-store.ts:43-45`, `src/components/ui/RetractableSidebar.tsx:194-238`
**Issue:** `getServerViewSnapshot()` always returns `'admin'`. For an admin this is intended (VIEW-03). But the `effectiveView` value feeds the nav-set selection for *every* user. Consider the timing: server render and the first client render both use `effectiveView = 'admin'` (server snapshot). For a non-admin, `isAdmin === false` keeps the nav on `partnerNavItems()`, so no leak — good. For a real admin whose stored view is `'agent'`, however, the server/initial-client render produces the 6-item admin nav, then `useSyncExternalStore` re-renders to the 4-item agent nav once `getViewSnapshot()` reads `sessionStorage`. That is a visible nav flip on every page load for an admin working in agent view (the documented "one-frame shift" was scoped to sidebar *collapse*, not nav-set). It is a UX defect, not a security one.
**Fix:** Accept and document explicitly that admins in agent view see a one-frame admin→agent nav flip (same class as the collapse shift), or drive the initial view from a cookie (as the collapse store comment anticipates for Phase 13) so SSR matches the stored view. If left as-is, add the caveat to the plan's known-shifts list so it is not later filed as a regression.

### WR-04: Collapsed `ViewToggle` pill ignores `fullWidth` and is keyboard-trappable only by click

**File:** `src/components/ViewToggle.tsx:58-81`
**Issue:** Two problems in the collapsed branch. (1) The collapsed pill cycles on every click with no `role`/`aria-pressed` state, so a screen-reader user gets only the generic "Changer de vue" label with no indication of the current view (A vs G) — the expanded branch exposes `aria-checked`, the collapsed one exposes nothing. (2) Unlike the expanded segmented control, there is no keyboard affordance beyond the implicit button activation, and the visible text "A"/"G" is not surfaced to assistive tech as state. This is an accessibility-parity regression against the expanded control in the same component.
**Fix:** Add `aria-label` that includes the *current* view (e.g. `t('sidebar.view.cycle', lang)` + current mode), or use `aria-pressed`/an `aria-live` announcement on toggle so the new view is announced. Mirror the state-exposure the expanded `role="radio"` branch already provides.

### WR-05: `clearView()` runs after `router.push` is queued but is order-fragile on logout

**File:** `src/components/UserMenu.tsx:55-63`
**Issue:** `handleLogout` does `await authClient.signOut(); clearView(); router.push('/login?logged_out=1'); router.refresh();`. `clearView()` only removes the key in the current tab — it dispatches no event (by design). That is fine for this tab, but if `signOut()` rejects (network error), the `await` throws and `clearView()` never runs, leaving `leasetic.view` populated. On the next successful login in the same tab session, VIEW-03's "fresh login always lands in Admin view" guarantee is violated for an admin who had switched to agent and then hit a failed logout — the stale `'agent'` flag persists for the tab session. There is no `try/catch`, so the stale flag is a real edge case, not hypothetical.
**Fix:** Clear the view flag in a `finally` (or before `signOut`) so it is removed regardless of `signOut` success: wrap the body in `try { await authClient.signOut(); } finally { clearView(); router.push(...); }`, or call `clearView()` before awaiting signOut since the flag has no server dependency.

## Info

### IN-01: `fullWidth` prop is accepted but unused (dead prop)

**File:** `src/components/ViewToggle.tsx:17-18, 38`
**Issue:** `fullWidth` is destructured into `_fullWidth` and never read. Callers in `RetractableSidebar.tsx:430` pass `fullWidth`, implying it controls layout, but the expanded branch hardcodes `width: '100%'` regardless. The prop is misleading dead surface — a reader expects it to do something.
**Fix:** Remove the `fullWidth` prop from the interface and call sites, or actually branch on it. If retained for API symmetry with `LocaleToggle`/`ThemeToggle`, add a comment stating it is intentionally inert.

### IN-02: `adminHrefs.history` / placeholder `history` field is threaded but never consumed

**File:** `src/components/ui/RetractableSidebar.tsx:74, 237`, `src/components/ui/Shell.tsx:67`
**Issue:** `adminNavItems` (lines 156-165) builds 6 items and does not reference `hrefs.history` — Historique was removed from the sidebar in Phase 18 D-27 (per the comment). Yet `history` is still a required field of `adminHrefs`, is built in `Shell.tsx:67`, and is included in the all-`'/'` placeholder at line 237. It is dead plumbing carried across three files.
**Fix:** Drop `history` from the `adminHrefs` type and from `Shell`'s constructed map unless another consumer needs it. If retained for `getRouteMeta`/future use, comment why it survives in the prop despite no sidebar consumer.

### IN-03: Magic color literal duplicated for the active/selected tint

**File:** `src/components/ViewToggle.tsx:131` and `src/components/ui/RetractableSidebar.tsx:353`
**Issue:** `'rgba(18, 150, 87, 0.10)'` is hardcoded in at least two components as the green active tint. The same value also appears in the test files. A theme change requires editing multiple literals, and the test already had to special-case browser normalization of `0.10` → `0.1`.
**Fix:** Extract to a CSS custom property (e.g. `--active-tint`) or a shared constant so the active-state tint is defined once.

### IN-04: `sidebar.nav.history` / `sidebar.nav.adminHistory` keys retained but unreferenced by this phase's nav

**File:** `src/lib/i18n/dictionaries.ts:53, 58` (FR; EN mirrors)
**Issue:** Per the D-27 comment in `RetractableSidebar.tsx:146-154`, Historique was removed from both nav variants and `sidebar.nav.adminHome` is "no longer referenced from the sidebar nav." These keys remain in the dictionary. This is acceptable (the file documents back-compat retention), but the accumulation of intentionally-dead keys makes the dictionary harder to audit for true orphans.
**Fix:** No action required for correctness. Optionally add a lightweight "retained: back-compat, no current consumer" marker convention so dead-key audits can distinguish deliberate retention from accidental orphans.

---

_Reviewed: 2026-05-30_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

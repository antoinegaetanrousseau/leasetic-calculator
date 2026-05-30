---
phase: 24
slug: admin-dual-view-toggle
status: secured
threats_open: 0
threats_total: 7
threats_closed: 7
asvs_level: 1
auditor: gsd-security-auditor
created: 2026-05-30
---

# SECURITY.md — Phase 24: admin-dual-view-toggle

**Audited:** 2026-05-30
**ASVS Level:** 1 (applied focus: access-control / authorization)
**Auditor:** gsd-security-auditor (Claude Sonnet 4.6)
**Verdict:** SECURED — all threats CLOSED

---

## Threat Verification

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-24-01 | Elevation of Privilege | accept | CLOSED | view-store.ts imported ONLY by: UserMenu.tsx, ViewToggle.tsx, RetractableSidebar.tsx — all `'use client'` components. Zero imports in require.ts, middleware, (admin) layout, (authed) layout, or any server/route-guard path. `app/(authed)/layout.tsx` references `ADMIN_URL_SEGMENT` as a plain string; it never imports view-store. |
| T-24-02 | Information Disclosure | mitigate | CLOSED | `UserMenu.tsx:61-65` — `try { await authClient.signOut(); } finally { clearView(); router.push('/login?logged_out=1'); router.refresh(); }`. WR-05 fix (commit a7d643a) confirmed present. `clearView()` runs in `finally`, so it fires even if `signOut()` rejects. `clearView()` at `view-store.ts:96` calls `window.sessionStorage.removeItem(VIEW_STORAGE_KEY)` with no event dispatch (session ending, no subscriber needed). |
| T-24-03 | Elevation of Privilege | mitigate | CLOSED | `RetractableSidebar.tsx:250-253` — `const navItems = isAdmin && effectiveView === 'admin' && adminHrefs ? adminNavItems(adminHrefs) : partnerNavItems()`. `isAdmin` is server-derived (`role === 'admin'` in `app/(authed)/layout.tsx:42`, `isAdmin={true}` hardcoded in `app/(admin)/[adminSegment]/layout.tsx:64`). ViewToggle rendered only behind `{isAdmin && adminHomeResolved && <ViewToggle .../>}` at lines 401 and 450. A forged flag fails the `isAdmin &&` short-circuit for non-admins; they receive `partnerNavItems()` and no ViewToggle renders. |
| T-24-04 | Elevation of Privilege | mitigate | CLOSED | `require.ts` unchanged (imports `server-only`, `requireUser` and `requireAdmin` unmodified). `app/(admin)/[adminSegment]/layout.tsx` unchanged — Layer 1 URL-segment check + Layer 2 `requireAdmin()` both intact (lines 42-43, 49). No view-store import or reference anywhere in server authz paths. `effectiveView` is computed only in the client `RetractableSidebar` and feeds only nav rendering, not any data query or route gate. |
| T-24-05 | Information Disclosure | mitigate | CLOSED | `RetractableSidebar.tsx:250-253` — agent view unconditionally resolves to `partnerNavItems()`, the same 4-item set that already existed. No new route, data endpoint, query, or prop was added to the agent-view path. Phase 22 ADMIN-09 commission-invisibility invariant untouched (confirmed by 91-file test suite pass with 0 regressions per 24-02-SUMMARY.md). |
| T-24-06 | Information Disclosure | accept | CLOSED | `app/(authed)/layout.tsx:25-28` — `adminHomeHref` computed only when `role === 'admin'` (server-gated via `requireUser()` DB re-check). A non-admin session never receives the prop; their Shell invocation omits `adminHomeHref` entirely. Admins already know the segment (it is their own admin home URL). URL obscurity is documented as NOT the security control; `requireAdmin()` is. |
| T-24-SC | Tampering | mitigate | CLOSED | Zero phase 24 commits (3b3af5d, 5e1d212, 261f43c, 94565bc, 1656f95, 6e9c8ce, 6c8c0a6, a7d643a, 630f932, b8d0c1f, 1d74590) touched `package.json` or any lockfile. No new runtime dependencies introduced. |

---

## Unregistered Flags

None. Both SUMMARY files (`24-01-SUMMARY.md §Threat Flags`, `24-02-SUMMARY.md §Threat Flags`) explicitly state no new threat surface beyond the plan's threat model. No mapping gap found.

---

## Authorization Boundary Note (WR-01, not a new threat)

The `24-REVIEW.md` WR-01 finding and the `24-REVIEW-FIX.md` resolution are on record. The sidebar nav-set decision (`isAdmin && effectiveView === 'admin'`) is correctly characterized as a UI affordance / defense-in-depth, NOT the primary authorization boundary. The real gate is:

- `app/(admin)/[adminSegment]/layout.tsx` — Layer 1: URL-segment match; Layer 2: `requireAdmin()` (which calls `requireUser()` with DB re-check, then asserts `role === 'admin'`, returning `notFound()` for non-admins).
- `src/lib/auth/require.ts` — `requireAdmin()` / `requireUser()` verified unchanged by this phase.

Both layers were verified intact and unmodified by phase 24. The comment at `RetractableSidebar.tsx:237-245` now documents the WR-01 caveat inline. This is a closed finding, not an open threat.

---

## Accepted Risks Log

| Risk ID | Category | Rationale |
|---------|----------|-----------|
| T-24-01 | Elevation of Privilege (accept) | `sessionStorage['leasetic.view']` is a NAV-ONLY hint. Any user can forge it via devtools. It cannot produce the admin nav for a non-admin (isAdmin gate) and cannot reach any server authz path (view-store has no server imports). Accepted posture per plan threat model. |
| T-24-06 | Information Disclosure (accept) | `adminHomeHref` (`/[ADMIN_URL_SEGMENT]`) forwarded to admin-role clients only. Admins already know this URL. URL obscurity is explicitly not the security control; `requireAdmin()` is. Accepted posture per plan threat model. |

---

_Generated by gsd-security-auditor — 2026-05-30_

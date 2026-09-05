---
phase: 06-auth-shell
plan: "07"
subsystem: admin-shell
tags: [auth-shell, admin-route-group, hidden-admin-url, defense-in-depth, invite-modal, clipboard]
dependency_graph:
  requires: [06-04, 06-02, 06-06]
  provides: [admin-route-group, admin-layout, admin-home-placeholder, invite-url-modal]
  affects: [09-admin-ui]
tech_stack:
  added: []
  patterns: [dynamic-segment-gate, dual-layer-auth, client-modal-focus-trap, clipboard-api]
key_files:
  created:
    - app/(admin)/[adminSegment]/layout.tsx
    - app/(admin)/[adminSegment]/page.tsx
    - src/components/InviteUrlModal.tsx
  modified: []
decisions:
  - "Layer order in AdminLayout: segment check (notFound) first, requireAdmin() second — URL obscurity fires before any role reveal per D-18"
  - "ADMIN_URL_SEGMENT unset → notFound() (fail-closed) — safe operational failure, no admin reach possible"
  - "InviteUrlModal uses inline backdrop + panel siblings at z-index 200/201 (no ReactDOM.createPortal) — adequate for Phase 6 since no stacking-context-creating ancestors exist"
  - "auth.modal.* i18n keys already in dictionaries.ts from Phase 06-02 — no dictionary changes needed"
  - "triggerRef typed as React.RefObject<HTMLElement | null> to match React 19 ref typing"
metrics:
  duration: "10 minutes"
  completed: "2026-05-08T18:00:00Z"
  tasks_completed: 2
  files_changed: 3
---

# Phase 06 Plan 07: Admin Route Group + InviteUrlModal Summary

**One-liner:** Hidden admin URL gate with dual-layer defense (env-segment 404 + requireAdmin role check) + reusable InviteUrlModal client primitive with focus trap, clipboard copy, and one-time-URL warning banner.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Build (admin)/[adminSegment]/layout.tsx + page.tsx | 0f0dda5 | app/(admin)/[adminSegment]/layout.tsx, app/(admin)/[adminSegment]/page.tsx |
| 2 | Build src/components/InviteUrlModal.tsx | c82eb6a | src/components/InviteUrlModal.tsx |

## What Was Built

### Task 1: Admin Route Group with Dual-Layer Gate

**`app/(admin)/[adminSegment]/layout.tsx`:**

Two-layer defense per AUTH-14 / AUTH-15 / D-18:

- **Layer 1 (URL obscurity):** `params.adminSegment` is compared against `process.env.ADMIN_URL_SEGMENT` at request time. If absent (unset env var) or mismatched → `notFound()`. Returns 404, NOT 403, NOT redirect — preserving URL secrecy (D-18). Guesser cannot distinguish "admin URL exists, unauthorized" from "URL doesn't exist at all."
- **Layer 2 (role check):** `await requireAdmin()` follows immediately. Even if a partner learns the correct segment, they receive a 404 via `requireAdmin()`'s `notFound()` path.

Layout structure mirrors `(authed)/layout.tsx` exactly: same 2-col × 3-row grid, same CSS variable tokens, same sidebar/footer patterns. The only difference is `isAdmin={true}` is hardcoded (not inferred from session role) — this layout is ONLY reachable by admin-authenticated users, so the badge is always appropriate.

Both `layout.tsx` and `page.tsx` have `export const dynamic = 'force-dynamic'` (PITFALLS §1.6).

**`app/(admin)/[adminSegment]/page.tsx`:**

Admin home placeholder with independent `await requireAdmin()` call (AUTH-15: defense in depth, every admin page calls requireAdmin separately). Phase 9 will replace the placeholder content with the coefficients editor + accounts list + audit log table.

### Task 2: InviteUrlModal Client Component

**`src/components/InviteUrlModal.tsx`:**

Reusable "URL displayed once" modal primitive for Phase 9 admin partner-create and reset-trigger flows (D-10 / 06-UI-SPEC.md §Admin URL Display Modal).

Key implementation details:
- **Accessibility floor (UI-SPEC §NON-NEGOTIABLE):** `role="dialog"` `aria-modal="true"` `aria-labelledby="invite-modal-title"`, on-mount focus to X close button, Escape closes + focus restores to `triggerRef.current`, Tab cycles inside panel (focus trap with `querySelectorAll` of all focusable elements), backdrop click closes.
- **Copy flow:** `navigator.clipboard.writeText(url)` in try/catch. On success: switches to "Lien copié" + Check icon for 2 seconds + Sonner success toast. On failure (T-06-07-08 mitigation): Sonner error toast, URL stays visible for manual copy.
- **Warning banner:** gold-tint bg + left border `--gold` + `AlertTriangle` icon + `auth.modal.warning` i18n key.
- **URL block:** `--paper` bg, monospace font, `userSelect: 'all'`, `tabIndex=0` (focusable in tab cycle).
- **Strings:** all via `t()` — no hardcoded text.
- **Portal:** not used — backdrop + panel are siblings at z-index 200/201. Adequate for Phase 6 context.
- **`RedeemKind` import:** type-only import from `src/lib/auth/redeem.ts` — does not trigger server-action bundling.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Implementation Notes

**`auth()` call pattern:** Same pattern as established in 06-06. `requireAdmin()` internally uses `auth()` (function call) not `auth` (object). Confirmed in `require.ts` — no changes needed.

**`auth.modal.*` i18n keys:** Already in `dictionaries.ts` from Plan 06-02. No dictionary changes were needed.

**Focus trap selector:** The `querySelectorAll` selector covers `button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])`. This correctly captures the X button, the URL block (`tabIndex={0}`), the Copy button, and the Close button — the exact 4 focusable elements specified in UI-SPEC. No elements are missed.

**`triggerRef` typing:** Typed as `React.RefObject<HTMLElement | null>` to match React 19's updated ref typing (avoids `strictNullChecks` error with `useRef<HTMLElement>(null)`).

## Stub Tracking

**`app/(admin)/[adminSegment]/page.tsx`** is an intentional plan-documented placeholder. It renders `t('shell.topbar.admin.badge', lang)` (the string "ADMIN") as an h1 and `t('welcomeSubtext', lang)` as a body paragraph — both are valid dictionary keys with real content, not empty stubs. Phase 9 replaces this page with the full admin UI.

**`src/components/InviteUrlModal.tsx`** is a complete implementation, not a stub. Phase 9 wires the trigger (admin partner-create form mounts the modal and passes the URL from `createInvitation`/`createPasswordReset` actions).

No unintended stubs exist.

## Threat Surface Scan

All surfaces match the plan's declared `<threat_model>`:

| Threat | Status |
|--------|--------|
| T-06-07-01: wrong segment → 403 (would confirm admin URL) | Mitigated — `notFound()` returns 404 |
| T-06-07-02: partner reaches admin if requireAdmin not called per-page | Mitigated — both layout and page independently call `requireAdmin()` |
| T-06-07-03: ADMIN_URL_SEGMENT in error/log/referrer | Mitigated — only `notFound()` fires; segment never in response body |
| T-06-07-04: env var unset → 404 | Accepted — safe failure mode; .env.example documents it |
| T-06-07-05: URL visible to shoulder-surfer | Accepted — warning banner instructs admin to use secure channel |
| T-06-07-06: URL in browser history | Accepted — 24h TTL bounds damage |
| T-06-07-07: clipboard persists after session ends | Accepted — OS-level, TTL bounds |
| T-06-07-08: clipboard.writeText rejected | Mitigated — try/catch, toast.error, URL stays in DOM |

No new threat surface beyond what was declared.

## Requirements Satisfied

- **AUTH-07**: Admin can create partner accounts — `InviteUrlModal` primitive ready for Phase 9 to wire to `createInvitation` server action (shipped in 06-04)
- **AUTH-08**: One-time invitation URL displayed once to admin in modal with copy button — `InviteUrlModal` ships this UI contract
- **AUTH-10**: Admin-triggered password reset URL surface — `InviteUrlModal` covers `kind='reset'` via shared primitive
- **AUTH-14**: Admin URL segment 404 on mismatch — `layout.tsx` Layer 1 gate (`notFound()` on segment mismatch or env unset)
- **AUTH-15**: Defense in depth — every admin handler independently calls `requireAdmin()` — both `layout.tsx` and `page.tsx` satisfy this

## Verification Results

All 9 plan `<verification>` checks passed:

1. `npm run build` exits 0 — admin route group compiles as `ƒ /[adminSegment]` (dynamic)
2. All 3 files exist at the specified paths
3. `grep -c "process.env.ADMIN_URL_SEGMENT" "app/(admin)/[adminSegment]/layout.tsx"` = 2 (code + comment; ≥ 1 ✓)
4. `grep -c "notFound()" "app/(admin)/[adminSegment]/layout.tsx"` = 5 (code + comments; ≥ 1 ✓)
5. `grep -c "await requireAdmin()" layout.tsx` = 1, `grep -c "await requireAdmin()" page.tsx` = 1
6. `head -1 src/components/InviteUrlModal.tsx | grep -c "'use client'"` = 1
7. `grep -c 'aria-modal="true"' src/components/InviteUrlModal.tsx` = 2 (both backdrop + panel)
8. `grep -c 'navigator.clipboard.writeText' src/components/InviteUrlModal.tsx` = 1
9. `npm run typecheck && npm run lint:check` — both exit 0

## Self-Check: PASSED

Files created:
- app/(admin)/[adminSegment]/layout.tsx: FOUND
- app/(admin)/[adminSegment]/page.tsx: FOUND
- src/components/InviteUrlModal.tsx: FOUND

Commits:
- 0f0dda5: feat(06-07): build (admin)/[adminSegment] route group with dual-layer auth gate
- c82eb6a: feat(06-07): build InviteUrlModal client component (D-10, AUTH-07/08/10)

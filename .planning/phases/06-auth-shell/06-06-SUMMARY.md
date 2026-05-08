---
phase: 06-auth-shell
plan: "06"
subsystem: shell
tags: [auth-shell, topbar, user-menu, theme-persistence, locale-persistence, route-group]
dependency_graph:
  requires: [06-04, 06-02, 06-03, 06-05]
  provides: [authenticated-app-shell, topbar, user-menu, db-theme-persistence, db-locale-persistence]
  affects: [07-proposal-shell]
tech_stack:
  added: []
  patterns: [route-group-authed, server-component-layout, client-component-menu, db-preference-persistence]
key_files:
  created:
    - app/(authed)/layout.tsx
    - app/(authed)/page.tsx
    - src/components/Topbar.tsx
    - src/components/UserMenu.tsx
  modified:
    - src/lib/theme/actions.ts
    - src/lib/i18n/actions.ts
  deleted:
    - app/page.tsx
decisions:
  - "auth() is a lazy singleton function (not a named object); all callers use auth().api.getSession() — matched require.ts pattern"
  - "displayName fallback chain: session.user.displayName ?? session.user.name ?? session.user.email — covers all user states"
  - "DB write in setTheme/setLang wrapped in try/catch so transient DB failures never block cookie-only path"
  - "Deleted app/page.tsx: (authed)/page.tsx cleanly resolves / in Next.js route group; no conflict"
metrics:
  duration: "3 minutes"
  completed: "2026-05-08T17:17:00Z"
  tasks_completed: 3
  files_changed: 7
---

# Phase 06 Plan 06: Auth Shell — Topbar + UserMenu + DB Persistence Summary

**One-liner:** Authenticated app shell with sticky Topbar (ADMIN badge slot, LocaleToggle, ThemeToggle, UserMenu) + (authed) route group layout backed by requireUser() + DB persistence for theme/locale preferences via extended server actions.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Build Topbar (server) + UserMenu (client) | a951b16 | src/components/Topbar.tsx, src/components/UserMenu.tsx |
| 2 | Extend theme + i18n actions for DB persistence (D-27) | b848302 | src/lib/theme/actions.ts, src/lib/i18n/actions.ts |
| 3 | Build (authed) layout + page; delete app/page.tsx | 125d91a | app/(authed)/layout.tsx, app/(authed)/page.tsx, [deleted] app/page.tsx |

## What Was Built

### Task 1: Topbar + UserMenu

**Topbar (server component):**
- Fixed layout order per D-25: page-title slot → ADMIN badge (when `isAdmin` prop is true) → `flex: 1` spacer → LocaleToggle → ThemeToggle → UserMenu
- ADMIN badge: 9px uppercase, navy bg, white text, 9999px border-radius — shown only when `isAdmin === true`
- Page title: 16.5px / weight 600 / `--ink`, truncated at 60% width, defaults to `t('header.home', lang)`
- Optional `pageTitle` prop for Phase 7+ pages to override the default
- All strings via `t()` — no hardcoded JSX text literals

**UserMenu (client component):**
- Initials avatar: first+last word initials (or first 2 chars for single word), 28px circle, `var(--gd)` bg, white text
- Pill trigger: display name (max-width 160px truncated) + ChevronDown caret
- Dropdown: display name + email header (non-clickable), then logout item with LogOut icon
- Accessibility: `aria-haspopup="menu"`, `aria-expanded` reflects state, Escape closes and refocuses trigger, outside-click closes
- Logout: `await authClient.signOut()` then `router.push('/login?logged_out=1')` — AUTH-18/D-24 compliant

### Task 2: DB Persistence for Theme + Locale (D-27)

Both `setTheme` and `setLang` server actions extended:
1. Cookie write path **preserved unchanged** (Phase 5 behavior — works unauthenticated)
2. After cookie write: `auth().api.getSession({ headers: await headers() })`
3. If session present: `db().update(schema.users).set({ theme/language }).where(eq(schema.users.id, session.user.id))`
4. DB write wrapped in `try/catch` — failure logs `console.error` server-side but never surfaces to user
5. `revalidatePath('/')` still runs at end

**Key pattern deviation from plan spec:** The plan showed `auth.api.getSession` but the actual `src/lib/auth/index.ts` exports `auth` as a lazy singleton **function** (not an object). All callers correctly use `auth().api.getSession()` — matching the `require.ts` pattern.

### Task 3: (authed) Layout + Home Page

**`app/(authed)/layout.tsx`:**
- First `await`: `requireUser()` — redirects unauthenticated visitors to `/login` before rendering
- Reads `lang` + `theme` from cookies
- `displayName` fallback chain: `session.user.displayName ?? session.user.name ?? session.user.email`
- Grid: 2-col × 3-row (sidebar / topbar / main / footer) using Phase 5 CSS variable tokens
- Sidebar: Leasétic wordmark 22px/700/`--navy`, no nav items (Phase 7+ adds them)
- Topbar receives `isAdmin={role === 'admin'}` — evaluated per-request from DB via `requireUser()`
- Footer: `t('shell.footer.copyright', lang)`, centered, 10.5px, `--muted`
- `export const dynamic = 'force-dynamic'` (PITFALLS §1.6)

**`app/(authed)/page.tsx`:**
- Minimal Phase 6 placeholder using legacy `welcomeHeading` + `welcomeSubtext` keys
- Phase 7 will replace with proposal CTA + recent proposals list (PROP-01/PROP-02)
- `export const dynamic = 'force-dynamic'`

**`app/page.tsx` deleted:**
- The `(authed)` route group's `page.tsx` cleanly owns `/`
- Next.js build confirms route as `ƒ /` (dynamic, via authed group)

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Behavioral Note: auth() Call Pattern

The plan's action code snippets showed `auth.api.getSession(...)` (treating `auth` as an object), but `src/lib/auth/index.ts` exports `auth` as a lazy singleton **function** following the same pattern as `db()`. The correct call is `auth().api.getSession(...)`. This matches `require.ts` exactly and is not a deviation from intent — just a snippet simplification in the plan docs.

## Stub Tracking

The `app/(authed)/page.tsx` home page is intentionally minimal (plan-documented stub). It renders `t('welcomeHeading', lang)` + `t('welcomeSubtext', lang)` which are valid dictionary keys with real content, not empty stubs. Phase 7 (PROP-01) will replace this with the proposal CTA + list.

No unintended stubs exist in other files.

## Threat Surface Scan

All new surfaces were declared in the plan's threat model (`<threat_model>`):
- T-06-06-01: ADMIN badge elevation (mitigated — badge is cosmetic; admin layout independently calls `requireAdmin()`)
- T-06-06-02: display_name leakage (accepted — unauthenticated users never receive this HTML)
- T-06-06-03: cross-origin signOut tampering (mitigated — `authClient.signOut` uses Better Auth CSRF)
- T-06-06-04: DB failure leaking errors (mitigated — try/catch logs server-side only)
- T-06-06-05: session.user spoofed locally (mitigated — `requireUser()` does in-band DB re-read)
- T-06-06-06: email visible in dropdown (accepted — user's own email, post-auth)
- T-06-06-07: avatar initials enumeration (accepted — post-auth only)

No new threat surface beyond what was declared.

## Requirements Satisfied

- **AUTH-03**: Logout wired via UserMenu → authClient.signOut → /login?logged_out=1 → Sonner toast
- **AUTH-06**: / resolves to (authed) shell; unauthenticated → middleware + requireUser() gate → /login
- **SHELL-01**: Full topbar shell (sidebar + topbar + main + footer) wraps every (authed) route
- **SHELL-02**: User's display name visible in UserMenu trigger (with initials avatar)
- **SHELL-04**: FR/EN locale toggle now persists to BOTH cookie AND users.language (DB) when authenticated
- **SHELL-07**: Theme toggle now persists to BOTH cookie AND users.theme (DB) when authenticated
- **SHELL-08**: No-flash initial paint preserved — Phase 5 root layout's no-flash script unchanged
- **SHELL-10**: Toast: logout flows through ?logged_out=1 → LoginForm picks up and fires auth.toast.logout.success
- **SHELL-14**: Mobile graceful degrade — grid layout uses fixed sidebar width + 1fr main; horizontal scroll on narrow viewports (v1.2 will add real responsive breakpoint per plan spec)

## Verification Results

All plan `<verification>` checks passed:
1. `npm run build` exits 0 — route shows `ƒ /` (authed group)
2. `app/page.tsx` deleted
3. `app/(authed)/layout.tsx` + `app/(authed)/page.tsx` exist
4. `grep -c 'await requireUser()' "app/(authed)/layout.tsx"` = 1
5. `head -1 src/components/UserMenu.tsx | grep -c "'use client'"` = 1
6. Topbar has no `'use client'` directive (server component)
7. `grep -c "auth().api.getSession" src/lib/theme/actions.ts` = 1
8. `grep -c "auth().api.getSession" src/lib/i18n/actions.ts` = 1
9. `npm run typecheck` exits 0
10. `npm run lint:check` exits 0
11. `npm test` — 83/83 tests pass

## Self-Check: PASSED

Files created/exist:
- app/(authed)/layout.tsx: FOUND
- app/(authed)/page.tsx: FOUND
- src/components/Topbar.tsx: FOUND
- src/components/UserMenu.tsx: FOUND
- src/lib/theme/actions.ts: FOUND (modified)
- src/lib/i18n/actions.ts: FOUND (modified)
- app/page.tsx: DELETED (confirmed)

Commits exist:
- a951b16: feat(06-06): build Topbar (server) + UserMenu (client) components
- b848302: feat(06-06): extend theme + i18n actions for DB persistence (D-27)
- 125d91a: feat(06-06): build (authed) layout + home page; delete legacy app/page.tsx

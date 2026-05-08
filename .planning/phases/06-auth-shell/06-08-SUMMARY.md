---
phase: 06-auth-shell
plan: "08"
subsystem: error-boundary-404
tags: [error-boundary, 404, i18n, client-component, server-component, security]
dependency_graph:
  requires:
    - 06-02  # dictionaries.ts with error.* keys
  provides:
    - app/error.tsx  # SHELL-12 error boundary
    - app/not-found.tsx  # SHELL-13 404 page
  affects:
    - 06-07  # admin layout's notFound() calls land on not-found.tsx
    - 06-09  # CLI smoke test visits admin URL with wrong segment → 404 page
tech_stack:
  added: []
  patterns:
    - useState lazy initialiser for cookie reads in Client Components
    - Server Component cookie-based i18n via getCurrentLang()
    - Next.js error.tsx 'use client' convention
    - Next.js not-found.tsx Server Component convention
key_files:
  created:
    - app/error.tsx
    - app/not-found.tsx
  modified: []
decisions:
  - "useState lazy initialisers instead of useEffect setState: readLangCookie and readThemeCookie passed as initialiser functions to avoid react-hooks/set-state-in-effect lint error"
  - "console.error(error) without eslint-disable: project has no active no-console rule; comment added for v1.2 when the rule ships"
  - "Leasétic wordmark in error.tsx uses JSX string literal in braces ({'Leasétic'}) rather than t() — ESLint exemption covers the file; this is the bilingual fallback by design (D-30)"
metrics:
  duration_minutes: 15
  tasks_completed: 2
  files_created: 2
  files_modified: 0
  completed_date: "2026-05-08"
---

# Phase 6 Plan 8: Error Boundary + 404 Page Summary

**One-liner:** Next.js App Router error.tsx (Client, bilingual cookie-read) and not-found.tsx (Server, server-side i18n via cookies()) implementing D-30 redaction and D-31 URL secrecy.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Build app/error.tsx (Client Component error boundary) | 0ead79e | app/error.tsx |
| 2 | Build app/not-found.tsx (Server Component 404) | e3f5011 | app/not-found.tsx |

## What Was Built

### app/error.tsx (SHELL-12)

Generic error boundary for the entire app. Key design decisions:

- **`'use client'` directive:** Required by Next.js App Router convention — error boundaries are React client-side class components under the hood; Next.js wraps them in a Client Component.
- **Bilingual STR constant:** Cannot call server-only `getCurrentLang()` (which reads cookies via `next/headers`) from a Client Component. Instead, a plain `STR = { fr: {...}, en: {...} }` constant holds both languages and the rendered copy is selected at runtime.
- **Cookie reads via lazy useState initialisers:** `useState(readLangCookie)` and `useState(readThemeCookie)` pass the reader functions as lazy initialisers — they run once on first render client-side. This avoids calling `setState` synchronously inside a `useEffect` body, which the `react-hooks/set-state-in-effect` ESLint rule correctly flags.
- **D-30 enforcement:** `error.message`, `error.digest`, and the full stack are never rendered to the DOM. Only the generic bilingual `STR[lang].title` + `STR[lang].body` copy is shown.
- **Operator forensics:** `console.error('[error.tsx]', error)` inside a `useEffect` captures the full error in the Vercel runtime log without exposing it to the user.
- **UI-SPEC compliance:** Centered card on `--paper`, top-right LocaleToggle + ThemeToggle (absolute position: top 24px right 24px), Leasétic wordmark (22px weight 700 `--navy`), AlertTriangle (size 38 strokeWidth 1.3 `--gold` opacity 0.6), `.btn-green` retry button calling `reset()`.

### app/not-found.tsx (SHELL-13)

Localised 404 page as a Server Component. Key design decisions:

- **Server Component (no `'use client'`):** Unlike error.tsx, not-found.tsx renders server-side where `cookies()` from `next/headers` is available. This lets `getCurrentLang()` read the `lt_lang` cookie and pass the correct `lang` to `t()`.
- **`export const dynamic = 'force-dynamic'`:** Cookie reads opt out of static rendering per PITFALLS §1.6.
- **All strings via t():** `error.404.display`, `error.404.title`, `error.404.body`, `error.404.button.home` — no hardcoded JSX text literals. ESLint's `no-restricted-syntax` rule validates this.
- **Unified 404 destination:** Used by three paths — (a) any unmatched URL (Next.js convention), (b) admin segment mismatch (`notFound()` in admin layout, D-18: 404 not 403), (c) `requireAdmin()` role-mismatch (`notFound()` per PITFALLS §7.1).
- **D-31 URL secrecy:** Does not read `params` or `pathname` — renders only localised static copy. The home link is hardcoded to `/`; middleware handles auth redirect for unauthenticated users.
- **UI-SPEC compliance:** Same centered layout as error.tsx. 404 display at fontSize 48px weight 700 `--navy` lineHeight 1.1. `.btn-green` `<Link href="/">` for the home button.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed react-hooks/set-state-in-effect lint error in error.tsx**
- **Found during:** Task 1 verification (lint:check)
- **Issue:** The plan's provided code called `setLang()` and `setTheme()` synchronously inside a `useEffect` body. The `react-hooks/set-state-in-effect` ESLint rule (from eslint-config-next) flags this as a cascading-render risk.
- **Fix:** Changed to `useState(readLangCookie)` and `useState(readThemeCookie)` lazy initialiser syntax — the functions run once on first client-side render without needing `useEffect`.
- **Files modified:** `app/error.tsx`
- **Commit:** 0ead79e

**2. [Rule 1 - Bug] Removed unused eslint-disable directive in error.tsx**
- **Found during:** Task 1 verification (lint:check, 1 warning = failure at --max-warnings=0)
- **Issue:** The plan's code included `// eslint-disable-next-line no-console` but the project has no active `no-console` ESLint rule in v1.1. ESLint flagged the directive as unused (warning → error at --max-warnings=0).
- **Fix:** Removed the eslint-disable comment; added a prose comment explaining that a disable directive should be added when a no-console rule is introduced in v1.2.
- **Files modified:** `app/error.tsx`
- **Commit:** 0ead79e (same commit as fix 1)

## Future Consideration: Locale Context Provider

The bilingual fallback in `error.tsx` introduces a brief language mismatch: the page initially renders in FR, then switches to the user's preferred language after the first render (when `readLangCookie` runs). On a stable connection this flash is imperceptible (one render cycle), but it is theoretically observable.

A future refactor option (v1.2+) is to introduce a React Context that wraps the root layout and holds the `lang` value — then `error.tsx` could consume the context instead of reading the cookie directly. However:

1. Next.js App Router error.tsx is rendered OUTSIDE the app's route tree when it catches an error, so the context from `app/layout.tsx` may not be available.
2. Adding a Context provider to the root layout solely to handle the error boundary edge case is disproportionate engineering for a rare occurrence.
3. The current approach (lazy initialiser → minimal flash) is the accepted pattern per `06-RESEARCH.md §16`.

**Recommendation:** Keep as-is for v1.1. If user research shows the language flash on error pages is a real UX problem, revisit at v1.2 (may require a cookie-forwarded header approach or a `suspense-error-boundary` wrapper pattern).

## Known Stubs

None. Both pages render real localised content from the dictionary; no placeholder data or TODO strings.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. Both files are rendering-only UI components. The threat model in the plan covers all relevant surface:

| Mitigation | Status |
|-----------|--------|
| T-06-08-01: error.message not rendered to user | Implemented — STR[lang].title/body only |
| T-06-08-02: error.digest not displayed | Implemented — console.error only, never DOM |
| T-06-08-04: not-found.tsx does not read params/pathname | Implemented — only localised static copy |

## Self-Check: PASSED

| Item | Result |
|------|--------|
| app/error.tsx exists | FOUND |
| app/not-found.tsx exists | FOUND |
| Commit 0ead79e (error.tsx) | FOUND |
| Commit e3f5011 (not-found.tsx) | FOUND |

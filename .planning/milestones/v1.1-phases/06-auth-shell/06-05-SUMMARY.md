---
phase: "06-auth-shell"
plan: "05"
subsystem: "auth"
tags: ["better-auth", "auth-screens", "login", "invitation", "reset", "server-actions", "react-hook-form", "zod"]
dependency_graph:
  requires:
    - phase: "06-04"
      provides: "proxy.ts (public path bypass), requireUser, createInvitation, createPasswordReset"
    - phase: "06-02"
      provides: "i18n dictionary (225 keys × 2 languages), ESLint no-hardcoded-jsx rule"
    - phase: "06-03"
      provides: "auth() singleton, authClient, loginSchema, setPasswordSchema, hashToken"
  provides:
    - "app/(public)/layout.tsx — minimal route-group layout (SHELL-03)"
    - "app/(public)/login/page.tsx — login page (server, D-21 redirect)"
    - "app/(public)/invite/[token]/page.tsx — invitation redemption page"
    - "app/(public)/reset/[token]/page.tsx — reset redemption page"
    - "src/components/LoginForm.tsx — client island (RHF + Zod + authClient)"
    - "src/components/SetPasswordForm.tsx — client island (RHF + Zod + redeemToken)"
    - "src/lib/auth/redeem.ts — atomic server action for token redemption"
  affects:
    - "06-06 (authed shell layout — login is proven entry point)"
    - "06-07 (admin InviteUrlModal — /invite/<token> route is ready on the other side)"
tech_stack:
  added:
    - "react-hook-form + @hookform/resolvers (already installed; wired in forms)"
    - "lucide-react Eye/EyeOff icons (new usage in SetPasswordForm)"
  patterns:
    - "Client Component i18n: import t() from @/lib/i18n/dictionaries (pure), NOT @/lib/i18n (server-only next/headers)"
    - "useWatch over watch() for React Compiler compatibility in client forms"
    - "Server action discriminated union return: RedeemResult = {ok:true} | {ok:false, reason}"
    - "4-condition token lookup: hash + kind + usedAt IS NULL + expiresAt > NOW"
key_files:
  created:
    - "app/(public)/layout.tsx"
    - "app/(public)/login/page.tsx"
    - "app/(public)/invite/[token]/page.tsx"
    - "app/(public)/reset/[token]/page.tsx"
    - "src/components/LoginForm.tsx"
    - "src/components/SetPasswordForm.tsx"
    - "src/lib/auth/redeem.ts"
    - "src/lib/auth/redeem.test.ts"
  modified:
    - "src/lib/i18n/dictionaries.ts (added t() export so client components can import without next/headers)"
    - "src/lib/i18n/index.ts (re-exports t() from dictionaries.ts)"
decisions:
  - "Moved t() from i18n/index.ts to i18n/dictionaries.ts: client components cannot import next/headers (Rule 3 blocking fix). Re-exported from index.ts for backward compat."
  - "useWatch over watch() for strength meter: React Compiler lint rule flags watch() as incompatible-library warning; useWatch is the recommended alternative."
  - "Direct @node-rs/argon2 call in redeem.ts: better-auth's configured hasher is not exposed via a public API; calling argon2 directly with identical parameters produces interchangeable hashes."
  - "auth() not auth: auth() is the lazy singleton factory (from Plan 06-03); all server code must call auth() not auth."
  - "sidebar.brand dictionary key for logo text: the ESLint no-hardcoded-jsx rule fires on 'Leasétic' in JSXText; using t('sidebar.brand', lang) satisfies the rule."
metrics:
  duration: "~8 minutes"
  completed: "2026-05-08T17:06:40Z"
  tasks: 3
  files_created: 8
  files_modified: 2
  tests_added: 7
  tests_total: 83
---

# Phase 6 Plan 05: Public Auth Screens Summary

**Three public-facing auth screens (login, invite, reset) + minimal layout + LoginForm + SetPasswordForm + atomic redeemToken server action with TDD RED/GREEN cycle**

## Performance

- **Duration:** ~8 minutes
- **Started:** 2026-05-08T16:58:35Z
- **Completed:** 2026-05-08T17:06:40Z
- **Tasks:** 3 (Task 1 used TDD RED/GREEN)
- **Files created:** 8
- **Files modified:** 2
- **Tests added:** 7 (total: 83, was 76)

## Accomplishments

- `redeem.ts`: `redeemToken(plaintext, kind, password, confirmPassword)` atomic server action; Zod validation before DB; 4-condition token lookup; argon2id hash via `@node-rs/argon2`; accounts row upsert; usedAt mark; sessionVersion bump + revokeUserSessions for kind='reset'; all 7 tests passing
- `LoginForm.tsx`: `'use client'`, react-hook-form + zodResolver(loginSchema), `authClient.signIn.email` (AUTH-18), always-generic error (AUTH-04/D-22), `?next=` open-redirect protection (T-06-05-08), mount-time toasts for `?invited=1`/`?reset=1`/`?logged_out=1`
- `SetPasswordForm.tsx`: `'use client'`, zodResolver(setPasswordSchema), `useWatch` (React Compiler compatible), 4-segment strength meter, eye-toggle (Lucide Eye/EyeOff), calls `redeemToken` server action
- `app/(public)/layout.tsx`: minimal layout (SHELL-03), top-right LocaleToggle + ThemeToggle, Leasétic logo, footer with privacy link, `force-dynamic`
- `app/(public)/login/page.tsx`: server-side `auth().api.getSession` → `redirect('/')` for authenticated users (D-21), passes lang to LoginForm
- `app/(public)/invite/[token]/page.tsx` and `app/(public)/reset/[token]/page.tsx`: 4-condition token lookup per kind; expired-token card or SetPasswordForm

## Task Commits

1. **test(06-05): add failing tests for redeemToken server action (RED)** — `e095d08`
2. **feat(06-05): implement redeemToken server action + fix tests (GREEN)** — `6cb2568`
3. **feat(06-05): implement LoginForm + SetPasswordForm client components** — `08fe0e4`
4. **feat(06-05): build (public) layout + login/invite/reset pages + fix i18n client import** — `8d2268a`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `next/headers` cannot be imported in Client Component bundle**
- **Found during:** Task 3 — `npm run build` failed with "You're importing a module that depends on `next/headers`… but you are using it in the Pages Router [Client Component]"
- **Issue:** `@/lib/i18n/index.ts` imports `cookies` from `next/headers` for `getCurrentLang()`. LoginForm and SetPasswordForm both imported `t` and `Lang` from `@/lib/i18n` — this pulled `next/headers` into the client bundle, which Next.js rejects.
- **Fix:** Extracted the pure `t()` function into `src/lib/i18n/dictionaries.ts` (which has no I/O). Re-exported `t` from `index.ts` for server components' one-stop import. Client components now import from `@/lib/i18n/dictionaries` only.
- **Files modified:** `src/lib/i18n/dictionaries.ts`, `src/lib/i18n/index.ts`, `src/components/LoginForm.tsx`, `src/components/SetPasswordForm.tsx`
- **Commit:** `8d2268a`

**2. [Rule 1 - Bug] `watch()` from react-hook-form triggers React Compiler incompatibility warning**
- **Found during:** Task 2 lint:check
- **Issue:** `react-hooks/incompatible-library` warning from React Compiler for `watch()` returned by `useForm()`. With `--max-warnings=0`, this is a hard build failure.
- **Fix:** Replaced `watch('password')` with `useWatch({ control, name: 'password' })` — the React Compiler-compatible pattern for observing field values.
- **Files modified:** `src/components/SetPasswordForm.tsx`
- **Commit:** `08fe0e4`

**3. [Rule 1 - Bug] ESLint no-hardcoded-jsx fires on 'Leasétic' in layout JSXText**
- **Found during:** Task 3 lint:check
- **Issue:** `JSXText[value=/[a-zA-ZÀ-ÿ]{2,}/]` selector in `no-restricted-syntax` fires on the Leasétic brand name rendered as JSXText in the public layout.
- **Fix:** Used `{t('sidebar.brand', lang)}` — `sidebar.brand` = `'Leasétic'` in both FR and EN (identical translation; correct behavior since it is a brand name).
- **Files modified:** `app/(public)/layout.tsx`
- **Commit:** `8d2268a`

**4. [Rule 3 - Blocking] Vitest `vi.mock` hoisting reference error in redeem.test.ts**
- **Found during:** Task 1 RED phase
- **Issue:** `vi.mock('@/lib/db', ...)` factory referenced top-level variables (`fakeSchema`, `fakeDb`) that were not yet initialized due to `vi.mock` hoisting.
- **Fix:** Moved the full `fakeDb` and `fakeSchema` definitions inside the `vi.mock` factory callback. Exposed `__fakeDb` for test access. Changed `revokeUserSessions` mock to a module-level `vi.fn()` proxy to enable cross-call assertion.
- **Files modified:** `src/lib/auth/redeem.test.ts`
- **Commit:** `6cb2568`

## Security Threat Mitigations Implemented

All mitigations from the plan's threat register (`T-06-05-01` through `T-06-05-10`) implemented:

| Threat | Mitigation |
|--------|-----------|
| T-06-05-01: Login enumeration | `auth.error.invalid.credentials` always shown (single string, no branching per error type) |
| T-06-05-02: CSRF on sign-in | `authClient.signIn.email()` used (Better Auth Origin validation, AUTH-18) |
| T-06-05-03: Token replay | `isNull(schema.passwordResets.usedAt)` in 4-condition WHERE; `usedAt = NOW()` on success |
| T-06-05-04: Wrong-kind redemption | `eq(schema.passwordResets.kind, kind)` in WHERE (both redeem.ts + page-level lookup) |
| T-06-05-08: Open-redirect via ?next= | `next.startsWith('/') && !next.startsWith('//')` check before using as callbackURL |
| T-06-05-09: Authenticated bypass /login | `auth().api.getSession()` + `redirect('/')` server-side (belt to proxy.ts) |
| T-06-05-10: Hash leakage | `accounts.password` never returned from redeemToken; only `{ok:true}` on success |

## Direct-Call vs useActionState (Plan Note)

The plan mentioned considering `useActionState` (React 19) vs direct `await redeemToken(...)`. The direct-call pattern was used:
- `startTransition(async () => { const result = await redeemToken(...); })` — wraps in transition to avoid blocking the UI
- This works correctly in React 19 as a server action invoked from a client component
- No `useActionState` needed for this single-shot mutation pattern

## argon2 Cold-Start Note

`@node-rs/argon2` is called directly in `redeem.ts` with `memoryCost: 19456, timeCost: 2, parallelism: 1` — identical to the `auth()` configuration in `index.ts`. On local Node, `hash()` completes in ~15–40ms (p50). On Vercel cold start, expect 80–150ms p95 (per RESEARCH §9 P10 tuning rationale). This is acceptable for one-time password-set flows; the 8h session means hash calls are infrequent.

## Known Stubs

None — all form flows call real endpoints. Toasts fire from real query params. Strength meter uses real scoring. No placeholder data wired to UI.

## Threat Flags

None beyond the threat model in the plan. No new network surfaces introduced beyond the 3 public routes explicitly planned.

---

## Self-Check: PASSED

- [x] `src/lib/auth/redeem.ts` starts with `'use server'`
- [x] `redeemToken` validates via `setPasswordSchema.safeParse` before any DB call
- [x] 4-condition WHERE: `tokenHash + kind + isNull(usedAt) + gt(expiresAt, now)`
- [x] On success: accounts row upserted (INSERT if absent, UPDATE if present)
- [x] On success: `passwordResets.usedAt = NOW()`
- [x] For kind='reset': `sessionVersion + 1` + `revokeUserSessions` called
- [x] Returns `RedeemResult` discriminated union
- [x] 7/7 redeem tests pass (`npx vitest run src/lib/auth/redeem.test.ts`)
- [x] `LoginForm.tsx` starts with `'use client'` on line 1
- [x] `SetPasswordForm.tsx` starts with `'use client'` on line 1
- [x] `authClient.signIn.email` in LoginForm (AUTH-18)
- [x] `redeemToken` called in SetPasswordForm
- [x] `auth.error.invalid.credentials` is the ONLY inline error string in LoginForm (AUTH-04)
- [x] `?next=` validated: `startsWith('/') && !startsWith('//')` (T-06-05-08)
- [x] All 4 route files exist at correct paths
- [x] All pages export `dynamic = 'force-dynamic'`
- [x] login/page.tsx: `auth().api.getSession` + `redirect('/')` (D-21)
- [x] invite + reset pages: `await params` (PITFALL §1.1)
- [x] Both token pages: `hashToken` + 4-condition lookup
- [x] Both token pages: expired-token card or SetPasswordForm
- [x] `(public)/layout.tsx`: LocaleToggle + ThemeToggle + footer
- [x] Commits `e095d08`, `6cb2568`, `08fe0e4`, `8d2268a` all exist in git log
- [x] `npm run typecheck` exits 0
- [x] `npm test` 83/83 passing
- [x] `npm run lint:check` exits 0
- [x] `npm run build` exits 0 — `/login`, `/invite/[token]`, `/reset/[token]` in route list

*Phase: 06-auth-shell*
*Completed: 2026-05-08*

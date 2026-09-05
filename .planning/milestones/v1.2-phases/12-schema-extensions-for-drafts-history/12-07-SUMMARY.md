---
phase: 12-schema-extensions-for-drafts-history
plan: 07
status: complete
completed: 2026-05-12
requirements: [DB-02]
files_changed:
  - src/lib/auth/index.ts (+44 lines — updateLastLoginAt helper + session.create.after hook + eq import)
  - src/lib/auth/index.test.ts (new, 78 lines)
commits:
  - feat(12-07) add updateLastLoginAt helper + session.create.after hook
  - test(12-07) vitest tests for updateLastLoginAt (4 cases)
---

# Plan 12-07 Summary — Better Auth `last_login_at` write hook

## What shipped

Closes **Phase 6 follow-up #3 / WR-AUDIT-01** — the operational gap noted in STATE.md where `users.last_login_at` was registered as a Better Auth `additionalField` (input: false) but never actually written. Per CONTEXT.md D-11 this had to land inside Phase 12 because DB-02 (`listInvitedPartners`) derives `invited` from `last_login_at IS NULL` — without the write, every partner would forever appear as "invited."

**Two changes in `src/lib/auth/index.ts`:**

1. New exported helper `updateLastLoginAt(userId: string): Promise<void>`. Pure write path: `db().update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, userId))` wrapped in try/catch. Logs to `console.error` on failure but does NOT throw.

2. New `databaseHooks.session.create.after` hook alongside the existing `user.create.before` hook (email lowercasing). Hook body calls `updateLastLoginAt(session.userId)` — that's it. The existing user.create.before hook is preserved verbatim.

Added `import { eq } from 'drizzle-orm';` — first use of `eq` in this file (other auth files already use it).

## Approach: refactored to a testable helper

The plan's recommended path (refactor for testability) was taken — instead of inlining the DB write inside the hook closure, the work lives in an exported `updateLastLoginAt` helper that the hook delegates to. This makes the unit test trivial (`await updateLastLoginAt('u-abc')` directly, no Better Auth instance needed).

Rejected the alternative: testing the hook through a full `betterAuth({...})` instance would have required mocking the entire Better Auth surface, which is brittle and adds coverage of Better Auth's internals rather than our code.

## TypeScript surprises

None. `databaseHooks.session.create.after` is typed in Better Auth 1.6.9; no `@ts-expect-error` or `as any` needed. `npx tsc --noEmit` exits 0.

## Verification

```
$ npx vitest run src/lib/auth/index.test.ts
 ✓ src/lib/auth/index.test.ts (4 tests) 5ms
 Test Files  1 passed (1)
      Tests  4 passed (4)
```

**Test cases:**
- `writes users.lastLoginAt = a Date when called with a userId` — happy path; `expect.any(Date)` asserts the payload shape
- `targets users.id with the eq predicate via .where()` — confirms the `.where()` call is made (predicate text is opaque to the stub-builder, consistent with `actions.test.ts` pattern)
- `does NOT throw when the underlying DB call rejects (best-effort)` — toggles `shouldReject=true` and asserts `await ... resolves.toBeUndefined()`
- `logs to console.error when the underlying DB call rejects` — `vi.spyOn(console, 'error')` + assertion on the first arg containing `'last_login_at'`

## Operational note for v1.2 launch runbook

After deploy, monitor Vercel logs for any `'[auth] failed to update users.last_login_at:'` entries. Transient failures are acceptable (the next successful login will write the value), but a sustained pattern indicates a DB connectivity issue or schema drift — investigate immediately.

## Anti-pattern compliance

- ✅ Existing `databaseHooks.user.create.before` hook preserved verbatim (grep `email: user.email.toLowerCase` returns 1 hit)
- ✅ No `--no-verify` on commits
- ✅ Helper is exported (`export async function updateLastLoginAt`)
- ✅ Try/catch wraps the DB call (login does not fail on transient write failure)
- ✅ Best-effort error path logs to `console.error` (Vercel runtime logs)

## Threat-model dispositions (from PLAN.md)

All accepted/mitigated as planned:
- T-12-07-01 (EoP racy concurrent logins) — accepted; now() is monotonic enough
- T-12-07-02 (Repudiation silent failure) — mitigated by console.error; tolerated for DB-02
- T-12-07-03 (Tampering spoofed userId) — mitigated; session.userId comes from Better Auth's validated credential
- T-12-07-04 (DoS via DB unavailability) — mitigated by try/catch; login still succeeds
- T-12-07-05 (Info disclosure) — accepted; last_login_at only surfaces in admin Liste des partenaires (requireAdmin gated)

## Downstream contract

`updateLastLoginAt` is exported but production callers should NOT call it directly — the session.create.after hook is the canonical entry point. Direct invocation is reserved for unit tests and any future "force re-classify" admin tool (out of scope for v1.2).

Plan 12-03's `listInvitedPartners()` predicate `last_login_at IS NULL` is now load-bearingly honest in production after this hook ships.

— Inline-executed by orchestrator after the spawned subagent returned asking for Bash permission approval (subagent permission model didn't auto-grant Bash). Commits are on `worktree-agent-a29d508756dc3c9f2` and will merge to main as part of the Wave 1 post-execution cleanup.

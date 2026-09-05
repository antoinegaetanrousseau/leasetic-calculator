---
phase: 09-admin-surface
plan: "03"
subsystem: admin-accounts-ui
tags: [admin, partners, modal, invite-url-modal, commission-invisibility, react-hook-form, zod, sonner-confirm-toast]
dependency_graph:
  requires:
    - 09-01 (adminDisableUser, adminReEnableUser, adminCreateInvitation, adminCreatePasswordReset, adminReissueInvitation, createPartnerSchema, listPartnersWithCounts, i18n keys, CSS classes)
    - 06-auth-shell (InviteUrlModal, RedeemKind, requireAdmin, getCurrentLang)
  provides:
    - app/(admin)/[adminSegment]/accounts/page.tsx (route: /[adminSegment]/accounts)
    - app/(admin)/[adminSegment]/accounts/AccountsList.tsx
    - app/(admin)/[adminSegment]/accounts/CreatePartnerModal.tsx
    - app/(admin)/[adminSegment]/accounts/timeAgo.ts
  affects:
    - src/components/InviteUrlModal.tsx (fixed import path — Rule 1)
tech_stack:
  added: []
  patterns:
    - Sonner confirm-toast with action+cancel buttons (D-09-11 / UI-SPEC §4.3)
    - InviteUrlModal reuse from Phase 6 — triggered from 3 new entry points
    - useForm<Input, unknown, Output> with z.input/z.infer split for z.enum().default() types
    - useWatch instead of watch() for React Compiler compatibility
    - Module-level async getNowMs() helper to satisfy react-hooks/purity lint rule
    - focus trap + Escape handler copied from InviteUrlModal (Phase 6 06-07)
    - timeAgo pure helper — 5-bucket relative-time (just now / min / hr / days / formatDate)
    - ADMIN-09 commission redaction (zero references on entire accounts surface)
key_files:
  created:
    - app/(admin)/[adminSegment]/accounts/page.tsx (54 lines)
    - app/(admin)/[adminSegment]/accounts/AccountsList.tsx (516 lines)
    - app/(admin)/[adminSegment]/accounts/CreatePartnerModal.tsx (302 lines)
    - app/(admin)/[adminSegment]/accounts/timeAgo.ts (37 lines)
  modified:
    - src/components/InviteUrlModal.tsx (import path fix: @/lib/i18n → @/lib/i18n/dictionaries)
decisions:
  - "Sonner confirm-toast uses native action+cancel API (not custom JSX) — confirmed from sonner's TypeScript Action interface with label+onClick shape"
  - "useWatch({ control, name: 'language' }) instead of watch('language') to satisfy React Compiler / react-hooks/incompatible-library warning"
  - "useForm<CreatePartnerInput, unknown, CreatePartnerValues> three-generic pattern for z.enum().default() which produces undefined as input type (same fix as Plan 02 CoefficientsEditor)"
  - "Date.now() wrapped in module-level async getNowMs() helper to satisfy react-hooks/purity ESLint rule (same pattern as app/(authed)/page.tsx)"
  - "t() interpolation uses .replace('{0}', value) pattern — t() only takes 2 args; no variadic support in the existing implementation"
  - "InviteUrlModal import path corrected (Rule 1): importing from @/lib/i18n pulls in next/headers via the server-only barrel, breaking client bundle"
metrics:
  duration_minutes: 6
  completed_date: "2026-05-10"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 1
---

# Phase 9 Plan 03: Accounts Page UI Summary

**One-liner:** Partners-management accounts page with 6-column table, sonner confirm-toast disable/re-enable, re-issue invitation and password-reset via existing Phase 6 InviteUrlModal, and RHF+Zod CreatePartnerModal with inline email-exists error handling.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Page server component + AccountsList + timeAgo | a5ef27b | page.tsx, AccountsList.tsx, timeAgo.ts, InviteUrlModal.tsx (fix) |
| 2 | CreatePartnerModal | 7aec715 | CreatePartnerModal.tsx |

## Files Created

| File | Lines | Description |
|------|-------|-------------|
| `app/(admin)/[adminSegment]/accounts/page.tsx` | 54 | Server component: requireAdmin → getCurrentLang → listPartnersWithCounts → getNowMs → AccountsList |
| `app/(admin)/[adminSegment]/accounts/AccountsList.tsx` | 516 | Client orchestrator: toolbar (search + New partner CTA) + 6-column table + per-row action buttons + InviteUrlModal + CreatePartnerModal mount |
| `app/(admin)/[adminSegment]/accounts/CreatePartnerModal.tsx` | 302 | Modal form: email + displayName + language segmented; RHF+Zod; inline email-exists error; Loader2 submit spinner |
| `app/(admin)/[adminSegment]/accounts/timeAgo.ts` | 37 | Pure timeAgo(date, lang, nowMs) helper — 5 bucket cases |

## Sonner Confirm-Toast API Choice

**Decision:** Used native `action` + `cancel` fields on the sonner toast options object (NOT `toast.custom(jsx)`).

**Rationale:** Confirmed from sonner's TypeScript `Action` interface (`{ label: React.ReactNode; onClick: ... }`) and from existing call sites (`DeleteJustToast.tsx`) that use `{ action: { label, onClick }, duration: 6000 }` syntax. The `cancel` field is the same `Action | React.ReactNode` shape. This avoids custom JSX and keeps the confirm-toast implementation clean.

**Call pattern:**
```typescript
toast(t('admin.accounts.toast.disable.confirm', lang).replace('{0}', displayName), {
  duration: 6000,
  action: { label: t('admin.coefficients.modal.confirm', lang), onClick: async () => { ... } },
  cancel: { label: t('admin.coefficients.modal.cancel', lang), onClick: () => {} },
});
```

## ADMIN-09 Commission Invisibility Verification

```
grep -c "commission_pct|commissionPct" accounts/AccountsList.tsx  → 0 ✓
grep -c "commission_pct|commissionPct" accounts/page.tsx          → 0 ✓
grep -c "commission_pct|commissionPct" accounts/timeAgo.ts        → 0 ✓
grep -c "commission_pct|commissionPct" accounts/CreatePartnerModal.tsx → 0 ✓
```

Zero commission references across the entire accounts surface — D-09-09b / ADMIN-09 satisfied.

## adminReissueInvitation Behavior with Active Users

The re-issue button is conditionally rendered: `{p.hasUnredeemedInvite && <button onClick={() => onReissue(p)} />}`. This predicate enforces D-09-11b at the UI layer.

The Plan 01 implementation uses a temporary-disable workaround for `adminReissueInvitation` (documented in 09-01-SUMMARY.md). When the button is visible, the user is in the unredeemed-invite state, so the workaround is semantically correct. If Phase 6's `createInvitation` throws for an unexpected reason after the temporary disable, the error is caught and surfaced as `admin.accounts.toast.reissue.error`. This is expected behavior per the Plan 01 LIMITATION note.

## lastLoginAt Updates

Confirmed by reading Phase 6 `src/lib/auth/actions.ts`: `lastLoginAt` is NOT wired at login time in Phase 6. The `redeemToken()` function updates `accounts.password` but does not touch `users.lastLoginAt`. For all partners at first verification, `lastLoginAt` will be `null` and `timeAgo()` will render `'—'`. This is a Phase 6 follow-up (not a Phase 9 regression) — tracked as a known gap.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] InviteUrlModal imported from @/lib/i18n instead of @/lib/i18n/dictionaries**
- **Found during:** Task 1 — `npm run build` after creating AccountsList
- **Issue:** `src/components/InviteUrlModal.tsx` imported `t, type Lang` from `@/lib/i18n`, which transitively imports `next/headers` via the server-only barrel. When `AccountsList.tsx` (a client component) imported `InviteUrlModal`, Turbopack bundled `next/headers` into the client bundle, causing a build error. The bug was latent in InviteUrlModal since Plan 06-07 but only manifested when InviteUrlModal was first used from a client component in a route included in the build graph.
- **Fix:** Changed `import { t, type Lang } from '@/lib/i18n'` to `import { t, type Lang } from '@/lib/i18n/dictionaries'` in InviteUrlModal.tsx.
- **Files modified:** src/components/InviteUrlModal.tsx
- **Commit:** a5ef27b

**2. [Rule 2 - Missing] t() has no variadic interpolation support — plan code assumed extra args**
- **Found during:** Task 1 implementation
- **Issue:** The plan's code used `t('key', lang, String(value))` syntax for interpolation, but the actual `t()` implementation in `dictionaries.ts` only takes 2 arguments and returns a raw string with `{0}` placeholders. No variadic support exists.
- **Fix:** Applied the existing project pattern of `.replace('{0}', String(value))` after the `t()` call, consistent with all other call sites (ValidityChip, ProposalRow, LiveLoyerPreview, etc.).
- **Files modified:** AccountsList.tsx, timeAgo.ts
- **Commit:** a5ef27b

**3. [Rule 1 - Bug] Date.now() called inside React component — react-hooks/purity ESLint error**
- **Found during:** Task 1 lint
- **Issue:** `const nowMs = Date.now()` inside `AccountsPage` component body triggered `react-hooks/purity` ESLint error. The project enforces this rule (same as app/(authed)/page.tsx).
- **Fix:** Extracted `Date.now()` into a module-level `async function getNowMs(): Promise<number>` helper and called `const nowMs = await getNowMs()` instead.
- **Files modified:** app/(admin)/[adminSegment]/accounts/page.tsx
- **Commit:** a5ef27b

**4. [Rule 1 - Bug] watch('language') React Compiler incompatibility warning**
- **Found during:** Task 2 lint
- **Issue:** `watch('language')` from `useForm()` triggered `react-hooks/incompatible-library` ESLint warning (React Compiler cannot memoize safely across React Hook Form's watch API).
- **Fix:** Replaced `watch` with `useWatch({ control, name: 'language' })` — the React Compiler-compatible alternative, consistent with `SetPasswordForm.tsx` and `LiveLoyerPreview.tsx` patterns.
- **Files modified:** CreatePartnerModal.tsx
- **Commit:** 7aec715

**5. [Rule 1 - Bug] useForm generic type mismatch with z.enum().default()**
- **Found during:** Task 2 typecheck
- **Issue:** `z.enum(['fr', 'en']).default('fr')` produces `language?: 'fr' | 'en' | undefined` as Zod's input type, causing Resolver type incompatibility when using `CreatePartnerValues` (output type) as the form generic.
- **Fix:** Applied the three-generic `useForm<CreatePartnerInput, unknown, CreatePartnerValues>` pattern using `z.input<typeof createPartnerSchema>` as `TFieldValues` — same fix as Plan 02's CoefficientsEditor.
- **Files modified:** CreatePartnerModal.tsx
- **Commit:** 7aec715

## Verification Results

```
npm run typecheck  → exit 0 ✓
npm run lint       → exit 0 ✓
npm run build      → exit 0 ✓ (/[adminSegment]/accounts appears as ƒ dynamic route)
npm run test       → exit 0 ✓ (399/399 tests, including dictionaries.test.ts parity check)
```

## Threat Flags

No new threat surface beyond what the plan's threat model covers. All routes are admin-gated (layout + independent requireAdmin). The InviteUrlModal fix removes a latent client-bundle contamination (no security surface change, only correctness fix).

## Self-Check

Verifying created files exist:
- app/(admin)/[adminSegment]/accounts/page.tsx — FOUND (54 lines)
- app/(admin)/[adminSegment]/accounts/AccountsList.tsx — FOUND (516 lines)
- app/(admin)/[adminSegment]/accounts/CreatePartnerModal.tsx — FOUND (302 lines)
- app/(admin)/[adminSegment]/accounts/timeAgo.ts — FOUND (37 lines)

Verifying commits exist:
- a5ef27b — FOUND (Task 1: page + AccountsList + timeAgo)
- 7aec715 — FOUND (Task 2: CreatePartnerModal)

## Self-Check: PASSED

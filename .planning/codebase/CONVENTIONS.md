# Coding Conventions

**Analysis Date:** 2026-05-24

## Naming Patterns

**Files:**
- **React components (.tsx):** `PascalCase.tsx` — one default/named exported component per file. Examples: `src/components/ui/StatusChip.tsx`, `src/components/proposal/NumberInputAmount.tsx`, `src/components/LoginForm.tsx`, `src/components/ui/Stepper.tsx`.
- **Library / utility / pure modules (.ts):** `kebab-case.ts` or single-word lowercase. Examples: `src/lib/calc/seed-params.ts`, `src/lib/i18n/no-flash-script.ts`, `src/lib/auth/require.ts`, `src/lib/storage/vercel-blob.ts`. One-word filenames stay lowercase: `formula.ts`, `tokens.ts`, `redeem.ts`, `health.ts`.
- **Co-located legacy camelCase utility files exist** for wizard helpers: `src/lib/wizard/completedSteps.ts`, `src/lib/wizard/stepperBehavior.ts`. Prefer kebab-case for net-new lib modules; do not rename existing ones.
- **Next.js App Router files:** lowercase, framework-prescribed names — `page.tsx`, `layout.tsx`, `route.ts`, `error.tsx`, `not-found.tsx`.
- **Server Actions:** suffix `.action.ts` — examples: `app/(authed)/proposals/new/_actions/saveAndAdvance.action.ts`, `saveAsDraft.action.ts`, `persistAccordionOpen.action.ts`, `app/(admin)/[adminSegment]/coefficients/history-load-more.action.ts`. They MUST start with `'use server';` on line 1.
- **Tests:** co-located, suffix `.test.ts` / `.test.tsx`. Example: `src/lib/calc/formula.ts` ↔ `src/lib/calc/formula.test.ts`.
- **Private route segments:** Next.js underscore-prefixed segments group server actions next to the routes that use them — `app/(authed)/proposals/new/_actions/`.
- **Route groups:** parenthesized — `app/(public)/`, `app/(authed)/`, `app/(admin)/`.

**Functions / variables:**
- `camelCase` everywhere: `computeLoyer`, `applyFormula`, `parseNumeric`, `requireUser`, `requireAdmin`, `createInvitation`, `generateLcRef`.
- Boolean predicates: `is*` / `has*` / `should*`. Examples: `isOnDemand`, `showBadge`.
- Async functions returning a `Promise<T>` are declared `async function`; no `_async` suffix on the name.
- Internal-only helpers prefixed with `_`: `_LOCALES_FOR_TEST` (test-only export), `__resetStorageForTests`, `__resetDbForTests`, `__resetAuthForTests` (double underscore for hard internals). Test-only exports MUST be exported with the underscore prefix and documented as test-only in the JSDoc.

**Types / interfaces:**
- `PascalCase`. Suffix `*Props` for React component props (`StatusChipProps`, `StepperProps`, `TopbarProps`), `*Input` for Zod-inferred form / action input types (`ProposalInput`, `LoginInput`, `SetPasswordInput`), `*Result` for return shapes (`RequireUserResult`, `ComputeLoyerResult`, `HealthCheckResult`, `InviteResult`), `*Error` for typed errors (`SubmitError`, `StorageError`, `DbAuthError`), `*Code` for string-literal-union enum types (`SubmitErrorCode`).
- Discriminated unions key on a `state` field. Example from `src/lib/calc/formula.ts:38-49`:
  ```typescript
  export type ComputeLoyerState =
    | { state: 'idle' }
    | { state: 'on-demand'; trancheKey: TrancheKey | null; isOnDemand: true }
    | { state: 'missing'; trancheKey: TrancheKey }
    | { state: 'computed'; trancheKey: TrancheKey; loyerHT: string; coeff: string; isOnDemand: false; lcRef: string };
  ```

**Constants:**
- `SCREAMING_SNAKE_CASE` for module-level constants. Examples: `TOKEN_TTL_MS`, `SAFE_ERROR_CODES`, `APP_URL`, `DURATION_OPTIONS`, `DEFAULT_LABELS_FR`, `DEFAULT_LABELS_EN`, `NO_FLASH_SCRIPT`, `STR`.
- i18n string-table constants use `const STR = { fr: {...}, en: {...} } as const` pattern (`app/error.tsx:40-51`).

## Code Style

**Formatting:**
- **No Prettier config file** (no `.prettierrc*`, no `.editorconfig`) — formatting is enforced solely via ESLint + the Next/TypeScript flat configs.
- Observed conventions in source: 2-space indentation, single quotes for strings, trailing commas on multi-line arrays/objects, semicolons required.
- Line length ~100 chars (no hard rule; readability-driven).

**Linting:**
- **ESLint 9 flat config** at `eslint.config.mjs`. Uses `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`.
- Run via `npm run lint` (any warnings) or `npm run lint:check` (CI: `--max-warnings=0`).
- **Project-specific rules** (`eslint.config.mjs`):
  1. `no-restricted-imports` (lines 42-92) — forbids `@vercel/blob`, `@vercel/postgres`, `@vercel/kv`, `@vercel/edge-config`, `@neondatabase/serverless`, `postgres`, `@react-pdf/renderer`, `@aws-sdk/*` outside their dedicated adapter directories (`src/lib/storage/`, `src/lib/db/`, `src/lib/pdf/`). Enforces OVH portability (BOOT-06, ARCHITECTURE §9).
  2. `no-restricted-syntax` JSXText rule (lines 110-115) — forbids hardcoded user-facing text in JSX. Every string MUST go through `t(key, lang)` from `src/lib/i18n/dictionaries.ts`. Exempt: `app/error.tsx` (bilingual fallback by design), `app/dev/**` (dev-only routes), `**/*.test.{ts,tsx}`, `src/lib/pdf/**` (intentional bilingual PDF literals).
  3. `no-restricted-syntax` Intl rule (lines 118-124) — forbids zero-arg `new Intl.NumberFormat()` / `new Intl.DateTimeFormat()`. Locale must be explicit. Use `formatCurrency` / `formatNumber` / `formatDate` from `@/lib/i18n/format` instead.
- **Defense-in-depth grep scripts** run in CI alongside ESLint: `scripts/check-no-vercel-only-imports.sh`, `scripts/check-no-drizzle-push.sh`, `scripts/check-no-v10-localstorage.sh`.

**TypeScript:**
- `tsconfig.json` — `strict: true`, `target: ES2022`, `module: esnext`, `moduleResolution: bundler`, `isolatedModules: true`, `jsx: react-jsx`, `noEmit: true`.
- Type-checking is a separate CI gate: `npm run typecheck` (`tsc --noEmit`).
- Path alias: `@/*` → `./src/*` (NOT mapped to `app/*` — tests in `tests/` use relative imports to reach `app/`; see `tests/admin-09-grep-contracts.test.ts:64`).
- `any` is essentially absent in production code (`src/lib/calc/formula.ts` has 1 reference in a comment; `src/lib/auth/actions.ts` has 5, all in JSDoc). Tests use `unknown` and narrow via casts (`as any` only with `// eslint-disable-next-line @typescript-eslint/no-explicit-any`).

## Import Organization

**Observed order** (top-down, blank line between groups):
1. Side-effect imports — `'use client';` / `'use server';` directive (line 1, no semicolon-only line above), then `import 'server-only';`, then `import './globals.css';`.
2. Third-party packages — `react`, `next/*`, `drizzle-orm`, `zod`, `lucide-react`, `sonner`, `react-hook-form`, `@hookform/resolvers/zod`, `better-auth/*`.
3. Internal absolute imports via `@/*` alias — `@/lib/auth/require`, `@/lib/db`, `@/lib/calc`, `@/lib/i18n/dictionaries`.
4. Sibling relative imports — `./index`, `./tokens`, `./StatusChip`.

**Sample from `src/lib/auth/actions.ts:28-32`:**
```typescript
import { eq, sql } from 'drizzle-orm';
import { auth } from './index';
import { requireAdmin } from './require';
import { generateToken } from './tokens';
import { db, schema } from '@/lib/db';
```

**Sample from `app/api/proposals/finalize/route.ts:1-5`:**
```typescript
import { NextResponse, type NextRequest } from 'next/server';

import { finalizeWizard } from '@/lib/api/proposals/finalize-wizard';
import { requireUser } from '@/lib/auth/require';
import { getCurrentLang } from '@/lib/i18n';
```

**Type-only imports:** Use `import type { ... }` or inline `import { type Foo, bar } from '...'`. Examples: `src/components/ui/Stepper.tsx:16` (`import { Fragment, type CSSProperties } from 'react'`), `src/components/proposals/ProposalRow.tsx` style.

**Barrel files:**
- `src/lib/calc/index.ts` is the canonical example (38 lines, re-exports `tKey`, `lookupCoefficient`, `computeLoyer`, `seedParams`, `proposalInputSchema`, etc.). Consumers MUST import from `@/lib/calc`, never sibling files. Documented as D-3.
- Other barrels: `src/lib/db/index.ts`, `src/lib/storage/index.ts`, `src/lib/i18n/index.ts`, `src/lib/admin/index.ts`, `src/lib/pdf/index.ts`, `src/lib/db/queries/index.ts`.

## Error Handling

**Bounded error code envelopes (anti-enumeration):**
- API routes return short string codes — never raw `err.message`. Pattern: `{ error: 'finalize_failed' }` with HTTP status from a `errorHttpStatus` map.
- Example: `app/api/proposals/finalize/route.ts:45-50, 83-89`:
  ```typescript
  const SAFE_ERROR_CODES = new Set([
    'DraftNotFound', 'NoGlobalParams', 'ValidationFailed', 'FinalizeFailed',
  ]);
  // ...
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    const safeCode = SAFE_ERROR_CODES.has(message) ? message : 'finalize_failed';
    return NextResponse.json({ error: safeCode }, { status: 500 });
  }
  ```
- Typed error class: `src/lib/api/proposals/errors.ts` defines `SubmitError extends Error` with `code: SubmitErrorCode`, `httpStatus: number`, plus a `errorHttpStatus` lookup record.

**Custom error classes:**
- `SubmitError` (`src/lib/api/proposals/errors.ts:18`), `StorageError` / `StorageAuthError` / `StorageNotFoundError` (`src/lib/storage/errors.ts`), `DbError` / `DbAuthError` (`src/lib/db/errors.ts`). All extend `Error`, set `this.name`, narrow surface area for callers.

**Auth-first ordering invariant (PITFALLS §7.3):**
- Every server action / route handler that touches data MUST call `requireUser()` or `requireAdmin()` as the FIRST `await`, before any DB read.
- Example: `app/api/proposals/finalize/route.ts:57-63` — `requireUser()` runs before `req.json()`.
- Example: `src/lib/auth/actions.ts:59, 82, 119, 175` — every exported function starts with `await requireAdmin();`.
- Tests assert ordering explicitly: `src/lib/auth/actions.test.ts:84-108` tracks `callSequence` to verify `requireAdmin` precedes `dbUpdate`.

**Server-only enforcement:**
- Server-only modules import `'server-only'` on line 1 (after directives). Build fails if they're transitively imported by a Client Component. Examples: `src/lib/auth/require.ts:26`, `src/lib/db/queries/proposals.ts`, `src/lib/pdf/render.ts`, `src/lib/api/proposals/errors.ts:1`.

**Self-healing silent redirects:**
- Cross-user / not-found / soft-deleted data → `redirect('/path-that-mints-fresh-state')`. Never confirm existence (URL secrecy, AUTH-14).
- Example: `app/(authed)/proposals/new/_actions/saveAndAdvance.action.ts:67-69, 82-85`:
  ```typescript
  if (!prev) redirect('/proposals/new/parametres');
  // ...
  if (!updated) redirect('/proposals/new/parametres');
  ```

**Best-effort logging without throwing:**
- For non-critical side effects (e.g. `last_login_at` write, audit log of an already-succeeded action), wrap in `try { ... } catch (e) { console.error(...); }` and continue. Example: `src/lib/auth/index.ts:47-59`.

**404 over 403:**
- Non-admin hitting admin URL → `notFound()` (404), not `redirect()` or 403. Hides existence of admin paths. `src/lib/auth/require.ts:77`.

## Logging

**Framework:** Native `console.error` only — no winston / pino / structured logger.

**Conventions:**
- Server-side logs are prefixed `[scope]`: `console.error('[healthz] db check failed:', e)`, `console.error('[auth] failed to update users.last_login_at:', err)`, `console.error('[adminDisableUser] failed:', e)`, `console.error('[error.tsx]', error)`.
- Logs go to Vercel/OVH runtime captures only; the user-facing response carries bounded codes.
- Health-check helpers redact raw error messages before returning: `classifyError(e)` maps `ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN` → `'connection failed'`, typed auth errors → `'auth failed'`, else `'unknown error'` (`src/lib/health.ts:27-44`).
- `eslint-disable-next-line no-console` is NOT used in production code — `console.error` is the explicit operator-log channel. A future v1.2 `no-console` rule is planned (see `app/error.tsx:81-82` comment).

## Comments

**Module-level JSDoc block** at top of every non-trivial file. Pattern: brief purpose, then numbered/lettered notes referencing canonical doc tags (D-N decisions from `.planning/PROJECT.md`, `PITFALLS §N.M`, plan IDs like `Plan 07-04`, requirement IDs like `AUTH-15`, `CALC-04`, `SHELL-06`).

**Example from `src/lib/auth/actions.ts:1-26`:**
```typescript
'use server';

/**
 * Admin-mediated user lifecycle server actions.
 *
 * (a) PITFALLS §7.3 ordering — every exported function calls requireAdmin() as
 *     the FIRST await before any DB access. ...
 * (b) D-11 re-issuance discipline — ...
 * (c) Session revocation in disableUser — ...
 * (d) password field NOT set on users insert — Better Auth owns the argon2id hash ...
 */
```

**Inline comments:**
- Reference v10 line numbers when porting (`v10 line 1420-1422`).
- Reference decision tags (`D-7-06`, `AUTH-16`, `CALC-05`).
- Mark intentional ESLint exemptions with rationale comments — never bare `// eslint-disable`.

**Function-level JSDoc:**
- Every exported function has a JSDoc with purpose, parameters, return semantics, and decision references. See `src/lib/auth/actions.ts:47-57, 73-79, 99-114, 167-173`.

## Function Design

**Size:** Single-responsibility — most exported functions are 5-30 lines. The longest in `src/lib/auth/actions.ts` (`createInvitation`) is ~50 lines with a documented 4-step flow.

**Parameters:**
- Multi-arg functions take an options object: `applyFormula({ amount, commissionPct, coefficient })` (`src/lib/calc/formula.ts:114-121`), `computeLoyer(input: ComputeLoyerInput)`, `renderProposalPdf({ data: fixture.data })`.
- 1-2 positional args are acceptable: `requireUser()`, `disableUser(userId)`, `formatCurrency(value, lang)`.

**Return values:**
- Pure functions return discriminated unions over a `state` literal field, never `null` for control flow when more shape is available. `ComputeLoyerResult` and `HealthCheckResult` are the canonical examples.
- DB query helpers return `null` on missing/cross-user — callers translate to `redirect()` (`getDraftById`, `updateDraft`).
- Type guards via discriminator: `if (r.computed.state === 'computed') { /* r.computed.loyerHT is now typed */ }`.

**Purity discipline:**
- Mark pure modules in the module-level JSDoc ("Pure module — no I/O, no React, no framework imports"). Examples: `src/lib/calc/formula.ts`, `src/lib/calc/schema.ts`, `src/lib/i18n/format.ts`, `src/lib/auth/schemas.ts`.
- Pure modules NEVER carry `'use server'` / `'use client'` / `import 'server-only'` directives.

**String-typed numeric boundaries (D-4):**
- Postgres-numeric-compatible values cross module boundaries as strings; arithmetic happens internally as JS numbers; `parseNumeric` / `formatNumeric` are the explicit boundary helpers (`src/lib/calc/formula.ts:65-78`).

## React / Component Conventions

**Client vs Server:**
- `'use client';` directive on line 1 for interactive components. Found in: `src/components/LoginForm.tsx`, `SetPasswordForm.tsx`, `UserMenu.tsx`, `ThemeToggle.tsx`, `LocaleToggle.tsx`, `InviteUrlModal.tsx`, `src/components/proposal/*.tsx`, `app/error.tsx`, `app/not-found.tsx`.
- All other components are Server Components by default (no directive). Server components must not import `useState`, `useEffect`, `'use client'` modules transitively.
- Server-side i18n uses `getCurrentLang()` (cookies-based); client-side reads `document.cookie` directly (see `app/error.tsx:14-18`).

**Component shape:**
- Named exports preferred (`export function StatusChip(...)`). Default export only when required by Next.js (page/layout/route/error files).
- Props interface declared above the component: `export interface StatusChipProps { variant: ...; label: string; }` then `export function StatusChip({ variant, label }: StatusChipProps) { ... }`.
- Inline styles via `style={{ ... }}` with CSS custom properties from `app/globals.css` (`var(--surface)`, `var(--ink)`, `var(--gold)`, `var(--shadow-card)`). Tailwind v4 also present but inline-style + CSS variable is the established pattern for chrome.

**i18n contract:**
- Every user-facing string flows through `t(key, lang)` from `@/lib/i18n/dictionaries`. The dictionary is fully typed (`DictKey` union); keys not in the dictionary fail typecheck.
- Components accept a `lang: Lang` prop and never read locale themselves. Example: `src/components/Topbar.tsx:14-19`.
- Bilingual exceptions: `app/error.tsx` (no SSR i18n available) and `src/lib/pdf/**` (intentional PDF literals).

## Module Design

**Exports:**
- Named exports for everything except Next.js convention files.
- Test-only exports prefixed `_` / `__` and documented (`__resetStorageForTests`, `_LOCALES_FOR_TEST`).

**Barrel discipline:**
- One `index.ts` per cohesive module (calc, db, storage, i18n, admin, pdf, db/queries). Consumers import from the barrel; siblings inside the module import each other directly.

**Lazy singletons:**
- Heavy / env-dependent resources are wrapped in a memoized `let _x: T | null = null; export function x() { if (_x === null) _x = create(); return _x; }` pattern. Examples: `src/lib/auth/index.ts:184-188` (`auth()`), `src/lib/db/index.ts` (`db()`), `src/lib/storage/index.ts` (`storage()` / `getStorage()`).
- This defers DATABASE_URL / BLOB_READ_WRITE_TOKEN reads until first call, so `next build` static analysis runs against placeholder env.

## Validation

**Zod is the canonical validator.** Single-source schemas live next to the domain:
- `src/lib/calc/schema.ts` — `amountHTSchema`, `durationMonthsSchema`, `validityDaysSchema`, `proposalInputSchema`, `coefficientsSchema`.
- `src/lib/auth/schemas.ts` — `loginSchema`, `setPasswordSchema`.
- `src/lib/admin/schemas.ts` — admin form schemas.

**Single-source discipline (D-29 / SHELL-11):**
- The SAME schema instance is imported by react-hook-form via `zodResolver(schema)` (client) AND by the server action / route for re-validation. Example: `proposalInputSchema` is used in `src/components/proposal/ProposalForm.tsx:54-55` (`useForm({ resolver: zodResolver(proposalInputSchema) })`) AND `app/(authed)/proposals/new/_actions/saveAndAdvance.action.ts:56-61` (`proposalInputSchema.safeParse(nextInputs)`).
- Error messages reference i18n keys, not display strings: `{ message: 'error.field.client.co.required' }` (`src/lib/calc/schema.ts:100`). The RHF resolver returns the key; the JSX layer calls `t(key, lang)`.

**Form integration:**
- `react-hook-form` + `@hookform/resolvers/zod`, `mode: 'onBlur'`, `shouldFocusError: true`. See `src/components/proposal/ProposalForm.tsx:54-78`, `src/components/LoginForm.tsx:23-27`.
- Input vs output types: when a schema applies `.default()`, type the form as `z.input<typeof schema>` for `defaultValues` and `z.infer<typeof schema>` for the parsed/output value. Pattern documented in `src/components/proposal/ProposalForm.tsx:23-36`.

## Patterns to Follow When Adding Code

1. **New server action:** create `<verb><Subject>.action.ts` in the route's `_actions/` directory. First line `'use server';`. First await `requireUser()` or `requireAdmin()`. Validate input with the canonical Zod schema. Throw bounded error codes (`throw new Error('ValidationFailed')`) for the client to translate to toast keys.
2. **New API route:** `app/api/<resource>/route.ts`. Export `runtime = 'nodejs'` (PDF / storage / argon2 require Node), `dynamic = 'force-dynamic'` (cookie/session reads). Wrap handler body in try/catch with a `SAFE_ERROR_CODES` allowlist.
3. **New pure helper:** add to the appropriate barrel module (`src/lib/calc`, `src/lib/i18n`, etc.). No directives. Re-export from `index.ts`. Test file next to the source.
4. **New React component:** PascalCase filename, named export, `Props` interface, `lang: Lang` prop if it renders any text, all strings through `t(key, lang)`.
5. **New typed error:** extend `Error`, set `this.name`, add to the relevant `errors.ts` module, list in `SAFE_ERROR_CODES` or `errorHttpStatus` lookup.

---

*Convention analysis: 2026-05-24*

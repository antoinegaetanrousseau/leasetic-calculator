# Testing Patterns

**Analysis Date:** 2026-05-24

## Test Framework

**Runner:**
- **Vitest 2.1.8** — config: `vitest.config.ts`.
- Default environment: `jsdom` (for component + page tests). Individual files can override via the top-of-file pragma `// @vitest-environment node` — used by `__pdf-fixtures__/render-fixtures.test.ts`, `src/lib/pdf/document.test.tsx`, `src/lib/pdf/no-commission.test.ts`, `src/lib/db/queries/coefficient-history.integration.test.ts`.
- `globals: false` — every test file imports `describe`, `it`, `expect`, `vi`, `beforeEach`, `afterEach` explicitly from `vitest`.
- Setup file: `__tests__/setup-dom.ts` — registers `@testing-library/jest-dom/vitest` matchers (`toBeInTheDocument`, `toHaveAttribute`, `toHaveClass`, `toHaveTextContent`).
- Path alias: `@` → `./src` (mirrors `tsconfig.json`; `app/` is NOT aliased — tests under `tests/` use relative imports to reach `app/`).

**Test discovery globs** (`vitest.config.ts:9`):
```typescript
include: [
  'src/**/*.test.ts',
  'src/**/*.test.tsx',
  'app/**/*.test.ts',
  'app/**/*.test.tsx',
  '__pdf-fixtures__/**/*.test.ts',
  'tests/**/*.test.ts',
  'tests/**/*.test.tsx',
],
```

**Assertion Library:**
- Vitest's built-in `expect` (Jest-compatible).
- Extended by `@testing-library/jest-dom` matchers via setup file.

**DOM rendering:**
- `@testing-library/react` 16.1.0 — `render`, `screen`, `cleanup`.
- `jsdom` 25.0.1 as the DOM implementation.

**Run Commands:**
```bash
npm test            # one-shot: vitest run
npm run test:watch  # interactive: vitest
npm run typecheck   # tsc --noEmit (separate CI gate)
npm run lint:check  # eslint . --max-warnings=0
```

**Test inventory:** 64 `.test.ts` / `.test.tsx` files (per `find` count, 2026-05-24). The grep-contract suite in `tests/admin-09-grep-contracts.test.ts` is a blocking cross-cutting verification.

## Test File Organization

**Location:**
- **Co-located with source files** as the primary pattern. `src/lib/calc/formula.ts` ↔ `src/lib/calc/formula.test.ts`. `src/components/ui/StatusChip.tsx` ↔ `src/components/ui/StatusChip.test.tsx`.
- Server actions: `app/(authed)/proposals/new/_actions/saveAndAdvance.action.ts` ↔ `saveAndAdvance.action.test.ts`.
- Route handlers: `app/api/proposals/finalize/route.ts` ↔ `route.test.ts`.
- Page tests live next to the page: `app/(authed)/proposals/new/calcul/page.tsx` ↔ `page.test.tsx`.

**Top-level test directories:**
- `__tests__/` — Vitest setup file only (`setup-dom.ts`). Not used for test files.
- `__pdf-fixtures__/` — PDF byte-determinism golden corpus (`render-fixtures.test.ts` + `fixtures.ts` + `expected.sha256.txt`).
- `tests/` — cross-cutting integration suites that span multiple modules. Example: `tests/admin-09-grep-contracts.test.ts` (commission-leak strict invariant across 4 admin surfaces).

**Naming:**
- `<sourceName>.test.ts` for pure modules and `.ts` source.
- `<sourceName>.test.tsx` for React component + page tests.
- `.integration.test.ts` suffix for tests gated on a real Postgres connection — only one currently: `src/lib/db/queries/coefficient-history.integration.test.ts` (skips when `DATABASE_URL_TEST` is unset).
- `.golden.test.ts` for parametric golden corpora: `src/lib/calc/calc.golden.test.ts` (38 explicit `it()` calls verifying the v10 formula across tranche / duration / edge-case axes).

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { redirectMock, requireUserMock, /* ... */ } = vi.hoisted(() => ({ /* ... */ }));

vi.mock('next/navigation', () => ({ redirect: redirectMock }));
vi.mock('@/lib/auth/require', () => ({ requireUser: requireUserMock }));

import { saveAndAdvanceAction } from './saveAndAdvance.action';

beforeEach(() => {
  redirectMock.mockClear();
  requireUserMock.mockReset();
  requireUserMock.mockResolvedValue({ session: { user: { id: 'u-1' } } });
});

afterEach(() => vi.clearAllMocks());

describe('saveAndAdvanceAction (D-01, D-03, D-21)', () => {
  it('Test 11: requireUser throws → action surfaces no redirect from this layer', async () => {
    // ...
  });
});
```

**Patterns:**
- **Describe header references decision tags** from the PROJECT.md decisions log: `'saveAndAdvanceAction (D-01, D-03, D-21)'`, `'PDF byte-determinism gate (PROP-17)'`, `'v10 assertCalc port (6 fixtures — CALC-05 suite 1/3)'`.
- **`it()` titles often start with `'Test N:'`** matching numbered behaviour items in the corresponding `PLAN.md` `<behavior>` block. Example: `'Test 11: requireUser throws → ...'`, `'Test 12: invalid nextInputs → ...'`. This is the traceability bridge between PLAN docs and tests.
- **Acceptance criteria tags in titles:** component tests use `'AC-SC-01:'`, `'AC-SC-02:'` (e.g. `src/components/ui/StatusChip.test.tsx`).
- Setup: `beforeEach` resets mocks (`mockReset`) and seeds happy-path return values; `afterEach(() => vi.clearAllMocks())` and `afterEach(() => cleanup())` (for component tests).
- Teardown for env-mutating tests: snapshot `process.env` keys in `beforeEach`, restore in `afterEach` (see `src/lib/storage/s3.test.ts:6-18`, `src/lib/storage/vercel-blob.test.ts:5-10`, `src/lib/storage/index.test.ts:6-22`).

## Mocking

**Framework:** Vitest's built-in `vi.mock` / `vi.hoisted` / `vi.fn` / `vi.spyOn` / `vi.importActual`.

**Universal first mock — `server-only`:**
- Every test that transitively imports a `import 'server-only'` module starts with:
  ```typescript
  vi.mock('server-only', () => ({}));
  ```
- Reason: the `server-only` package throws when imported outside the Next.js bundler. The mock turns it into a no-op so the test runner can load the module.

**`vi.hoisted` pattern for cross-mock state:**
- `vi.mock(...)` calls are hoisted to the top of the file. Any variable referenced from inside the factory must also be hoisted, otherwise it triggers a TDZ (temporal dead zone) error. The codebase uses `vi.hoisted(() => ({ ... }))` to declare mock state that survives hoisting. Example from `app/(authed)/proposals/new/_actions/saveAndAdvance.action.test.ts:17-25`:
  ```typescript
  const { redirectMock, requireUserMock, getDraftByIdMock, updateDraftMock } = vi.hoisted(() => ({
    redirectMock: vi.fn((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    }),
    requireUserMock: vi.fn(),
    getDraftByIdMock: vi.fn(),
    updateDraftMock: vi.fn(),
  }));

  vi.mock('next/navigation', () => ({ redirect: redirectMock }));
  vi.mock('@/lib/auth/require', () => ({ requireUser: requireUserMock }));
  ```

**Mocking `next/navigation.redirect`:**
- The real `redirect()` throws an internal `NEXT_REDIRECT` symbol; tests mimic this by throwing a string-tagged Error:
  ```typescript
  redirectMock: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  ```
- Tests then assert with `.rejects.toThrow(/NEXT_REDIRECT:\/login/)` or `/NEXT_REDIRECT:\/proposals\/new\/parametres$/`. This is the canonical pattern across all server-action / page tests (e.g. `saveAndAdvance.action.test.ts:60`, `calcul/page.test.tsx:170-176`).

**Partial mocking with `vi.importActual`:**
- When a test needs the real implementation of some exports but mocks others, use `vi.importActual<typeof import('...')>('...')`:
  ```typescript
  vi.mock('@/lib/calc', async () => {
    const real = await vi.importActual<typeof import('@/lib/calc')>('@/lib/calc');
    return { ...real, computeLoyer: (...args: unknown[]) => computeLoyerMock(...args) };
  });
  ```
  (`app/(authed)/proposals/new/calcul/page.test.tsx:79-85`)

**DB mocking — chained-builder stub:**
- `src/lib/db/queries/proposals.test.ts:23-58` defines a `stubBuilder` whose `select`, `from`, `where`, `orderBy`, `limit`, `insert`, `values`, `returning`, `update`, `set`, `delete` all return the stub or a recorded promise. The `calls: Array<{ kind, payload }>` array captures the chain for assertion. The `schema` export comes from `vi.importActual<typeof import('@/db/schema')>('@/db/schema')` so real Drizzle column references are preserved.
- For coarser tests, a `fakeDb` object is constructed inline with `update`/`insert`/`delete` returning Promise-resolving thenables (see `src/lib/auth/actions.test.ts:23-50`).

**Auth gate ordering tests:**
- To prove `requireAdmin()` runs before any DB write, tests wire a shared `callSequence: string[]` array and assert the order: `requireAdmin` index < `dbUpdate` index. See `src/lib/auth/actions.test.ts:84-108`.

**Better Auth API mocks:**
- The Better Auth admin plugin is mocked as `auth: () => ({ api: { revokeUserSessions: (a: unknown) => mockRevoke(a) } })` (`src/lib/auth/actions.test.ts:12-14`).

**Sonner / Next router mocks** (for components that import them transitively):
```typescript
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
```
(`tests/admin-09-grep-contracts.test.ts:43-50`)

**What to Mock:**
- All `import 'server-only'` modules (universal `vi.mock('server-only', () => ({}))`).
- `next/navigation` (`redirect`, `useRouter`, `useSearchParams`, `notFound`).
- Auth gates (`requireUser`, `requireAdmin`) — to test ordering and to substitute fake sessions.
- DB query layer (`@/lib/db/queries/*`) — keep the actual SQL out of test runs.
- External SDK calls (`@vercel/blob`, `@aws-sdk/*`, Better Auth API) — mocked at the module boundary.
- `server-only` modules' direct deps when the test wants to exercise only the unit under test.

**What NOT to Mock:**
- Zod schemas — always use the real schema instance (single-source-of-truth discipline, D-29).
- `react-hook-form` itself — Render the real form via Testing Library.
- Pure modules (`src/lib/calc/*`, `src/lib/i18n/format.ts`) — test against the real implementation. The golden corpus (`calc.golden.test.ts`) deliberately uses embedded fixture coefficients, NOT mocks (fixture/seed separation per D-1).
- `@/db/schema` — pulled in via `vi.importActual` when DB queries are mocked, so real column references are available.

## Fixtures and Factories

**Inline fixture factories:**
- Tests define `ROW()` / `makePartner()` factory functions returning a typed fixture with sensible defaults and an `overrides?: Partial<T>` parameter. Example from `app/api/proposals/route-list.test.ts:21-38`:
  ```typescript
  const ROW = (overrides?: Partial<{ id: string; clientCo: string; amountHT: string }>) => ({
    id: overrides?.id ?? 'p-1',
    userId: 'u-1',
    language: 'fr',
    lcRef: 'LC-12345',
    // ...
  });
  ```
- Same pattern in `tests/admin-09-grep-contracts.test.ts:72-86` (`makePartner`).
- Top-level `const COMPLETE_INPUTS = { ... }` constants seed valid proposal payloads at the top of action/page tests (`calcul/page.test.tsx:95-107`, `saveAndAdvance.action.test.ts:36-42`).

**Embedded fixture coefficients (calc engine):**
- `src/lib/calc/formula.test.ts:30-37` and `calc.golden.test.ts:32-39` embed the v10 coefficient table directly in the test file — NOT imported from `seed-params.ts`. This enforces fixture/seed separation per D-1: the formula is testable without ever reading partner data.

**PDF golden fixtures:**
- `__pdf-fixtures__/fixtures.ts` defines the typed fixture corpus.
- `__pdf-fixtures__/expected.sha256.txt` holds the committed expected SHA-256 per fixture name (one `name:sha` per line).
- Regeneration is gated: `npm run pdf:update-fixture -- --confirm UPDATE-FIXTURE`. Tests assert `result.contentHash === expectedHash` with a `toBe` failure message that points at the regeneration command (`__pdf-fixtures__/render-fixtures.test.ts:36-44`).

**Location:**
- Inline at top of the test file (factories, constants).
- Embedded literal data (calc coefficients, expected SHAs).
- Sibling fixtures files when shared across tests (`__pdf-fixtures__/fixtures.ts`).

## Coverage

**Requirements:** No coverage threshold is enforced. The CI gate is the green test run plus the defense-in-depth grep scripts and the byte-determinism PDF gate.

**No `vitest --coverage` invocation in `package.json`.** Coverage reports are not part of CI.

**Quality signals enforced in lieu of coverage:**
- Static lexical `it()` counts for golden corpora (e.g. `calc.golden.test.ts` has 38 `it()` calls; the plan asserted "≥30 cases" with `grep -c "  it("`).
- Grep-contract suite `tests/admin-09-grep-contracts.test.ts` proves a strict invariant ("ZERO commission_pct leakage") across 4 admin surfaces.
- PDF byte-determinism: every fixture's rendered SHA-256 must match the committed hash byte-for-byte.

## Test Types

**Unit / pure-module tests:**
- Scope: a single exported function with no I/O.
- Examples: `src/lib/calc/formula.test.ts` (computeLoyer, applyFormula, parseNumeric, generateLcRef), `src/lib/i18n/format.test.ts` (formatCurrency / formatNumber / formatDate), `src/lib/wizard/completedSteps.test.ts` (deriveCompletedSteps / markStepCompleted), `src/lib/calc/schema.test.ts` (Zod schemas).
- No `vi.mock` other than potentially `server-only`. Direct import + direct assertion.

**Server-action tests:**
- Scope: `*.action.ts` files. Test the auth gate, the merged payload sent to `updateDraft`, and the resulting `redirect()` target.
- Pattern: mock `next/navigation.redirect` (throwing-Error stub), mock auth (`requireUser`), mock DB queries (`getDraftById`, `updateDraft`), import the action, assert with `.rejects.toThrow(/NEXT_REDIRECT:.../)`.
- Examples: `app/(authed)/proposals/new/_actions/saveAndAdvance.action.test.ts`, `saveAsDraft.action.test.ts`, `persistAccordionOpen.action.test.ts`.

**Route-handler tests:**
- Scope: `app/api/**/route.ts`. Construct a minimal `{ json: async () => body }` shim, invoke `POST(req)`, assert `res.status` and `await res.json()`.
- Pattern includes asserting `runtime` and `dynamic` exports (`app/api/proposals/finalize/route.test.ts:48-51`).
- Bounded-error-code tests prove the route never echoes raw internal messages (`JSON.stringify(body).toLowerCase()).not.toContain('commission')`).

**Component tests:**
- Scope: a single React component, rendered via `render(<Component ... />)`.
- Always pair with `afterEach(() => cleanup())` to reset the DOM between cases.
- Query patterns: `container.querySelector('span')`, `screen.queryAllByRole('button')`, `expect(chip).toHaveClass('chip')`.
- Examples: `src/components/ui/StatusChip.test.tsx`, `Stepper.test.tsx`, `MetricTile.test.tsx`, `PageHero.test.tsx`, `RetractableSidebar.test.tsx`, `BrandLogo.test.tsx`, `AdminNavCard.test.tsx`.

**Page tests (Server Component pages):**
- Scope: an `async function Page({ searchParams })` default export.
- Pattern: mock every server-side dep (`requireUser`, `getCurrentLang`, `getDraftById`, `getLatestGlobalParams`, `computeLoyer`, `redirect`), await the page function with a `Promise.resolve(searchParams)` arg, pass the returned JSX to `render(tree)`, assert against `container.textContent` / `container.querySelectorAll('a')` / `[aria-current="step"]`.
- Examples: `app/(authed)/proposals/new/calcul/page.test.tsx` (15 tests), `app/(authed)/proposals/new/verification/page.test.tsx`, `app/(admin)/[adminSegment]/history/page.test.tsx`.

**Integration tests (opt-in):**
- File suffix `.integration.test.ts` + top-of-file `// @vitest-environment node`.
- Gated on env var with `describe.skipIf(!shouldRun)` — CI stays green when the env var is unset. Currently: `src/lib/db/queries/coefficient-history.integration.test.ts` (gated on `DATABASE_URL_TEST`).
- Setup uses `beforeAll` / `afterAll` to open and close a real `postgres()` connection.

**Golden / byte-determinism tests:**
- PDF rendering: `__pdf-fixtures__/render-fixtures.test.ts` — pinned `// @vitest-environment node` because jsdom polyfills shift `@react-pdf/renderer` output bytes by ~1KB. Asserts SHA-256 equality against committed `expected.sha256.txt`.
- Calc engine: `src/lib/calc/calc.golden.test.ts` — 38 explicit `it()` calls covering the 4×3 happy-path matrix, tranche boundaries, on-demand cases, and edge cases.

**Grep-contract / strict-invariant tests:**
- `tests/admin-09-grep-contracts.test.ts` — renders 4 admin surfaces via `renderToString` (React server renderer) and asserts `/\bcommission_pct\b/.test(html) === false` and `/_pct\b/.test(html) === false`. This is a BLOCKING cross-cutting test that catches commission-leak regressions across all admin pages in one suite.

**E2E:** Not used. No Playwright / Cypress dependency. UI is verified via component/page tests + the v10 byte-determinism PDF gate.

## Common Patterns

**Async assertions (rejecting redirects):**
```typescript
await expect(
  saveAndAdvanceAction('d-1', VALID_INPUTS, 1),
).rejects.toThrow(/NEXT_REDIRECT:\/proposals\/new\/calcul\?draft_id=d-1/);
```

**Capturing call payloads via `mock.calls`:**
```typescript
expect(updateDraftMock).toHaveBeenCalledTimes(1);
const [draftIdArg, userIdArg, payloadArg] = updateDraftMock.mock.calls[0];
expect(draftIdArg).toBe('d-1');
expect(userIdArg).toBe('u-1');
expect((payloadArg as { inputs: Record<string, unknown> }).inputs.clientCo).toBe('Acme Corp');
```

**Numeric tolerance for floating-point math:**
- `expect(Number(r.computed.loyerHT)).toBeCloseTo(expected, 2)` — ±0.01 € tolerance, mirroring v10's `Math.abs(actual - expected) < 0.01` (`src/lib/calc/formula.test.ts:140`).

**Regex-tolerant text matching for locale-formatted output:**
- `formatCurrency('fr', 1949.93)` produces `'1 949,93 €'` with U+00A0 (NBSP) separators. Tests use a tolerant regex: `expect(container.textContent).toMatch(/1\s*949[.,]\s*93\s*€/);` (`calcul/page.test.tsx:200`).

**Anti-leak assertions:**
```typescript
// Bounded error-code echo, no raw message leak (route.test.ts:84-85)
expect(JSON.stringify(body).toLowerCase()).not.toContain('commission');
expect(JSON.stringify(body)).not.toContain('some_internal_failure');

// Commission value appears EXACTLY once in rendered page (calcul/page.test.tsx:434-456)
const matches = (container.textContent ?? '').match(/1\s*500[.,]\s*00\s*€/g);
expect(matches!.length).toBe(1);
const hiddenInputs = container.querySelectorAll('input[type="hidden"]');
for (const inp of hiddenInputs) {
  expect((inp.getAttribute('name') ?? '').toLowerCase()).not.toContain('commission');
}
```

**Singleton-reset hook in `beforeEach`:**
- Modules with memoized singletons expose `__resetXForTests()` so each test gets a fresh instance.
  ```typescript
  beforeEach(() => {
    __resetStorageForTests();
    delete process.env.STORAGE_DRIVER;
  });
  ```
  (`src/lib/storage/index.test.ts:7-17`)

**Error-class testing:**
- Construction-time validation: `expect(() => new S3Storage()).toThrow(StorageError)` (`src/lib/storage/s3.test.ts:30-32`). Tests both the error class and the message content (`.toThrow(/S3_ENDPOINT/)`).

## CI Gates (`.github/workflows/ci.yml`)

Sequential gates that must pass on every PR + push to `main`:
1. `npm run typecheck` — `tsc --noEmit` against strict TypeScript.
2. `npm run lint:check` — ESLint flat config with `--max-warnings=0`.
3. `npm run check:no-vercel-imports` — defense-in-depth grep script.
4. `npm run check:no-drizzle-push` — forbid `drizzle-kit push` invocations.
5. `npm run check:seed-sql` — assert `drizzle/_seed.sql` is in sync with `seedParams`.
6. `npm run check:no-v10-localstorage` — forbid v10 localStorage keys (CUT-03).
7. `npm test` — Vitest run (full suite, no coverage threshold).
8. `npm run build` — Next.js production build with placeholder env (STORAGE_DRIVER=vercel, DATABASE_URL=postgres://placeholder).
9. Verify `.next/standalone/server.js` exists (BOOT-07 sanity).

**Concurrency:** `cancel-in-progress: true` on PRs (`ci-${{ github.workflow }}-${{ github.ref }}` group).
**Node:** `node-version: '22'` with `cache: 'npm'`.
**Timeout:** 10 minutes per job.
**Permissions:** `contents: read` (least privilege).

---

*Testing analysis: 2026-05-24*

# Plan 20-01 — Better Auth `trustedOrigins` (INFRA-03) — Summary

**Plan:** 20-01
**Requirements:** INFRA-03
**Wave:** 1
**Status:** Complete
**Started:** 2026-05-26
**Completed:** 2026-05-26
**Tests:** 1106 baseline → 1112 (+6 new trusted-origins tests)
**Commits:** 1 atomic commit covering both tasks (helper refactor + tests)

---

## What was built

**File modified:**
- `src/lib/auth/index.ts` — replaced the existing stub `trustedOrigins: []` clause at line 173 (now resolves to `allowedOrigins` variable derived from a new exported helper). Added `__resolveTrustedOriginsForTests()` exported pure function at line 71 — derives the origin list from `process.env.APP_URL` + `process.env.NEXT_PUBLIC_APP_URL` + the Vercel preview wildcard `https://leasetic-matrice-*.vercel.app` + `http://localhost:3000`.

**File created:**
- `src/lib/auth/trusted-origins.test.ts` — 6 Vitest cases asserting the helper returns the expected list under env-var permutations.

**File NOT modified (D-11 hard constraint):**
- `proxy.ts` — verified byte-identical to pre-plan state via `git diff --stat proxy.ts` returning empty.

---

## Key decisions made during execution

1. **Extracted the derivation as an exported pure helper** (`__resolveTrustedOriginsForTests`) rather than testing through the live Better Auth instance. Rationale: booting Better Auth requires DATABASE_URL, AUTH_SECRET, storage adapter, drizzle adapter, and the admin plugin — all to read back a static array of strings. A pure-function test is 6 lightweight cases vs. a heavyweight integration boot. Follows the existing `__resetAuthForTests()` `__`-prefix convention for test-internal exports.

2. **Used Better Auth's wildcard support** (`https://leasetic-matrice-*.vercel.app`) per 20-RESEARCH.md §1 instead of computing `VERCEL_URL` at runtime. This pattern covers every Vercel preview URL the project will ever generate (PR-scoped, branch-scoped, etc.) without per-deployment dynamism.

3. **Did NOT include `resolveBaseUrl()` output in `trustedOrigins`** — Better Auth auto-trusts `baseURL`. Duplicating it would be no-op but adds maintenance noise.

4. **Did NOT assert Better Auth's exact rejection response shape in tests.** Per RESEARCH §1, the rejection status varies between paths (e.g., `discovery_untrusted_origin` for SSO; generic 4xx otherwise) and between point releases. Tests assert the input list is correct; Better Auth's rejection behavior is the library's contract, not ours.

---

## Acceptance criteria — all met

- [x] Stub `trustedOrigins: []` replaced (not duplicated) — verified via `grep -c "trustedOrigins" src/lib/auth/index.ts` returning 1 occurrence in the betterAuth() config
- [x] Wildcard `https://leasetic-matrice-*.vercel.app` present in derivation — verified by Test 5 (regression guard)
- [x] proxy.ts byte-identical — `git diff --stat proxy.ts` returns empty
- [x] 6 new unit tests covering env-var permutations + wildcard inclusion — Tests 1–6 in trusted-origins.test.ts
- [x] All 1106+ tests pass (1112 total now; +6 net) — full suite green
- [x] ADMIN-09 12-gate suite green throughout — gate count unchanged at 12 (13 vitest tests = 12 grep gates + 1 describe setup); no commission surfaces touched
- [x] No new env vars introduced (D-13) — derivation reads existing APP_URL + NEXT_PUBLIC_APP_URL only
- [x] No `--no-verify` bypasses — pre-commit hooks ran on the commit

---

## Threat-model verdict

| Threat | Severity | Mitigation | Status |
|---|---|---|---|
| T-20-01-01 Origin spoofing on Better Auth mutations | High | New `trustedOrigins` list with wildcard for Vercel previews | ✓ Mitigated |
| T-20-01-02 Preview URL rotation breaking auth | Medium | Wildcard pattern absorbs all Vercel preview URL variations | ✓ Mitigated |
| T-20-01-03 Test bypass via env stubs in production | Low | `__` prefix on exported helper signals test-internal; production reads `auth()` only | ✓ Mitigated |
| T-20-01-04 Stale auth instance after env change | Low | `__resetAuthForTests()` already exists (Phase 6) — unchanged | ✓ Pre-existing |
| T-20-01-05 Misconfigured baseURL trusted by accident | Low | `resolveBaseUrl()` private + auto-trusted by Better Auth — no surface to misconfigure here | ✓ Pre-existing |
| T-20-01-SC Supply-chain risk from better-auth package | Medium | Version-pinned at 1.6.9 in package-lock.json; wildcard support stable across 1.6.x line | ✓ Pre-existing |

No high-severity threats open. All mitigations verified by tests or by structural file constraints.

---

## Coverage

- INFRA-03 requirement: ✓ delivered (trustedOrigins list now active; CSRF Origin gate is on by Better Auth default)

---

## Notes for downstream plans

- **20-02 (INFRA-02)** does not touch `src/lib/auth/index.ts` — zero file overlap with this plan. Safe to run in any order; project's `use_worktrees=false` config still serializes them.
- **20-03 (INFRA-01)** does not touch this file either.
- Better Auth's exact rejection-response shape was deliberately NOT pinned to a status code in tests. If a future plan needs to detect rejection in client code, the cleanest approach is to log Better Auth's actual response body once in production to capture the shape, then pin it.

---

## Deviations from plan

- **Helper name:** plan suggested `resolveTrustedOrigins()` (no prefix); shipped as `__resolveTrustedOriginsForTests()` to match the existing `__` test-internal convention from `__resetAuthForTests`. Functionally identical; nomenclature consistent with file precedent.

No other deviations.

---

## Files in final state

```
src/lib/auth/index.ts                       — modified (helper extracted + exported + stub replaced)
src/lib/auth/trusted-origins.test.ts        — new (6 tests)
proxy.ts                                    — UNCHANGED (D-11 enforced)
.planning/STATE.md                          — plan-progress write (this commit)
.planning/ROADMAP.md                        — plan-progress write (via SDK after commit)
```

---
phase: 39
slug: database-guard-correctness
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-09-07
---

# Phase 39 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

**Requirement:** OPS-05 (single requirement across all 5 plans)
**Reconstructed from artifacts** (State B — no VALIDATION.md existed at execution time).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/neon-endpoints.test.ts tests/neon-target.test.ts tests/env-precedence.test.ts tests/load-env-contracts.test.ts tests/load-env-attribution.test.ts tests/db-branch-guard.test.ts tests/db-guard-differential.test.ts tests/db-guard-exit-codes.test.ts tests/db-guard-endpoint-list.test.ts tests/development-target.test.ts tests/npm-guard-hooks.test.ts` |
| **Full suite command** | `npm test` (`vitest run`) |
| **Additional gates** | `npm run typecheck` (`tsc --noEmit`) · `npm run lint:check` (`eslint . --max-warnings=0`) |
| **Estimated runtime** | ~23 s full suite; ~15 s phase-39 subset |

> `lint:check` runs at `--max-warnings=0`. An unused variable passes `tsc` and `vitest`
> but fails CI — always run all three gates, never just the tests.

---

## Sampling Rate

- **After every task commit:** phase-39 subset (quick run command above)
- **After every plan wave:** `npm test && npm run typecheck && npm run lint:check`
- **Before `/gsd-verify-work`:** full suite must be green
- **Max feedback latency:** ~23 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 39-01-01 | 01 | 1 | OPS-05 | T-39-01-01/02/05 | endpoint list is read as text, never eval'd; malformed record throws at parse | unit | `npx vitest run tests/neon-endpoints.test.ts tests/neon-target.test.ts` | ✅ | ✅ green |
| 39-01-02 | 01 | 1 | OPS-05 | T-39-01-03 | `_neon-target.ts` keeps the `.neon.tech` pre-gate; seed-fiche on shared list | unit | `npx vitest run tests/neon-target.test.ts tests/neon-endpoints.test.ts && npm run typecheck && npm run lint:check` | ✅ | ✅ green |
| 39-01-03 | 01 | 1 | OPS-05 | T-39-01-04/06 | pipeline + reconciliation seeders gated by allowlist, no override hatch | unit | `npm run typecheck && npm run lint:check && npx vitest run tests/neon-endpoints.test.ts tests/development-target.test.ts` | ✅ | ✅ green |
| 39-02-01 | 02 | 1 | OPS-05 | T-39-02-01/02/05/06 | resolver parses with `dotenv.parse`, prints nothing, returns explicit null | typecheck | `npm run typecheck && npm run lint:check` | ✅ (test in 39-02-02) | ✅ green |
| 39-02-02 | 02 | 1 | OPS-05 | T-39-02-03/04 | every precedence case proven on mkdtemp fixtures, no real credentials | unit | `npx vitest run tests/env-precedence.test.ts` | ✅ | ✅ green |
| 39-03-01 | 03 | 2 | OPS-05 | T-39-03-03/04/05/06 | guard refuses via `onRefuse` not throw; `.hostname` not `.host`; lookalike domain refuses | unit | `npx vitest run tests/db-branch-guard.test.ts && npm run typecheck && npm run lint:check` | ✅ | ✅ green |
| 39-03-02 | 03 | 2 | OPS-05 | T-39-03-01/02 | precedence fix and guard call land in the same file/commit; SKIP on empty `filesFound` | integration | `npm run typecheck && npm run lint:check && npx vitest run` | ✅ | ✅ green |
| 39-03-03 | 03 | 2 | OPS-05 | T-39-03-07/08 | D-03 sequencing pinned; probe-write-isolation exemption pinned; 14-consumer census | contract | `npx vitest run tests/load-env-contracts.test.ts && npm run typecheck && npm run lint:check` | ✅ | ✅ green |
| 39-04-01 | 04 | 2 | OPS-05 | T-39-04-01/02/03/04/08/09 | bash guard parses-not-sources; hostname stripped at `/` or `:`; exact-hostname match | shell + unit | `bash -n scripts/check-local-db-branch.sh` + `npx vitest run tests/db-guard-exit-codes.test.ts tests/db-guard-endpoint-list.test.ts` | ✅ | ✅ green |
| 39-04-02 | 04 | 2 | OPS-05 | T-39-04-06 | `prebuild`/`prestart` pass `--node-env production` **and** invoke the guard | contract | `npx vitest run tests/npm-guard-hooks.test.ts` | ✅ **(added 2026-09-07)** | ✅ green |
| 39-04-02 | 04 | 2 | OPS-05 | T-39-04-07 / AR-39-02 | no npm script anywhere passes `--root` (accepted-risk bound) | contract | `npx vitest run tests/npm-guard-hooks.test.ts` | ✅ **(added 2026-09-07)** | ✅ green |
| 39-05-01 | 05 | 3 | OPS-05 | T-39-05-01/02/04/07 | spawn harness uses argv array + mkdtemp; no fixture credential reaches output | integration | `npx vitest run tests/db-guard-exit-codes.test.ts` | ✅ | ✅ green |
| 39-05-02 | 05 | 3 | OPS-05 | T-39-05-03/05 | bash and TS guards cannot drift; suite proven to bite by perturbation | differential | `npx vitest run tests/db-guard-differential.test.ts tests/db-guard-exit-codes.test.ts` | ✅ | ✅ green |
| 39-05-03 | 05 | 3 | OPS-05 | T-39-05-06 | routing doc names `_neon-endpoints.list`, `OPS-05`, `prebuild`, `--node-env` | contract | `npx vitest run tests/npm-guard-hooks.test.ts` | ✅ **(added 2026-09-07)** | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Phase-39 test surface: 98 tests across 11 suites.** Full repo suite: 2509 passed / 61 skipped.

| Suite | Tests | Suite | Tests |
|---|---|---|---|
| `neon-endpoints` | 18 | `db-branch-guard` | 17 |
| `neon-target` | 7 | `db-guard-differential` | 7 |
| `env-precedence` | 12 | `db-guard-exit-codes` | 4 |
| `load-env-contracts` | 6 | `db-guard-endpoint-list` | 9 |
| `load-env-attribution` | 2 | `development-target` | 10 |
| `npm-guard-hooks` | 6 | | |

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. vitest was already configured; no
framework install was needed.

---

## Validation Audit 2026-09-07

| Metric | Count |
|--------|-------|
| Gaps found | 4 |
| Resolved | 4 |
| Escalated | 0 |

**Gap class.** All four were checks that ran exactly once inside a plan's `<automated>`
verify block during execution and left no standing test. `grep -rln "package.json" tests/`
returned nothing — no test in this repo asserted anything about `package.json`, so the npm
lifecycle-hook wiring had zero regression coverage.

| Gap | Task | Threat | What was unguarded |
|-----|------|--------|--------------------|
| G-1 | 39-04-02 | T-39-04-06 | `prebuild`/`prestart` passing `--node-env production` — the exact NODE_ENV mismatch behind the 2026-09-06 production incident |
| G-2 | 39-04-02 | T-39-04-06 | the hooks actually invoking `check:local-db-branch` — deleting the hook body would have passed CI green |
| G-3 | 39-04-02 | T-39-04-07 / AR-39-02 | no npm script passing `--root` — the accepted-risk *bound* for the `--root` bypass |
| G-4 | 39-05-03 | T-39-05-06 | routing doc cross-linking the machine-readable endpoint list |

**Resolution.** One new file, `tests/npm-guard-hooks.test.ts` (6 tests), written in the
repo's established contract-test style (`tests/load-env-contracts.test.ts`): a file-header
comment explaining what each gate protects and what a red test means, then one `it()` per
contract with an assertion message a future developer can act on. No implementation file,
`package.json`, or doc was modified.

**Bite proof.** Each contract was perturbed against the *shipped* test file (not a scratch
copy) and observed to fail, then reverted — `git diff --exit-code` clean afterwards:

| Gap | Perturbation | Observed |
|-----|--------------|----------|
| G-1 | dropped `--node-env production` from `prebuild` only | 1 failed / 5 passed — only the `prebuild` case, confirming the two hooks are checked independently |
| G-2 | replaced `prebuild` with `echo guard-disabled --node-env production` (no-op that *keeps* the flag string) | 1 failed / 5 passed — **G-1 still passed on this mutant**, proving G-2 catches what G-1 structurally cannot |
| G-3 | added `--root /tmp/scratch` to `purge:test-data` (an unrelated script) | 1 failed / 5 passed — confirms the check scans every script, not just the two hooks |
| G-4 | replaced every `_neon-endpoints.list` in the routing doc | 1 failed / 5 passed — `Missing tokens: ["_neon-endpoints.list"]` |

---

## Manual-Only Verifications

All phase behaviors have automated verification.

One residual risk is tracked outside this map and is **not** a validation gap — it is an
open finding with a scheduled fix:

| Behavior | Requirement | Why not covered here | Reference |
|----------|-------------|----------------------|-----------|
| Guard SKIP rule under `NODE_ENV=test` with `.env.local` on disk | OPS-05 | Known fail-open, deliberately *pinned as current behaviour* by `tests/db-branch-guard.test.ts:137` rather than fixed. Recording it as a validation gap would imply a missing test; the test exists and passes — it is the behaviour that needs changing. | WR-07 · `39-SECURITY.md` Residual Risks · `.planning/todos/pending/wr-07-db-guard-skip-rule.md` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Every plan-time one-off check converted to a standing test
- [x] Each new test proven to bite by perturbation against the shipped file
- [x] Full suite + `typecheck` + `lint:check` green
- [x] `nyquist_compliant: true` confirmed

**Approval:** verified 2026-09-07

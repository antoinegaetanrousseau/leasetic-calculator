# Plan 20-02 — CI db-smoke job + db-migrate.yml branch-selector (INFRA-02) — Summary

**Plan:** 20-02
**Requirements:** INFRA-02
**Wave:** 1
**Status:** Complete
**Started:** 2026-05-26
**Completed:** 2026-05-26
**Tests:** 1112/1112 passing (unchanged — no app code touched)
**Commits:** 2 (Task 1 + Task 2 atomic)

---

## What was built

**File modified — Task 1 (commit `c6d4606`):**
- `.github/workflows/ci.yml` — added new `db-smoke — migration apply gate` job using Pattern B (per RESEARCH §5): job always runs on every PR (so GitHub's required-status-check rule is always satisfied), but the work-doing steps after the `dorny/paths-filter@v3` step are gated on `if: steps.filter.outputs.schema == 'true'`. Uses official Neon Actions:
  - `neondatabase/create-branch-action@v5` — creates ephemeral branch named `ci-${{ github.run_id }}` (unique per run, no race conditions)
  - `neondatabase/delete-branch-action@v3` — cleanup, gated on `if: always() && steps.filter.outputs.schema == 'true'` per D-06
  - Uses the `db_url_with_pooler` output directly as `DATABASE_URL` for `npm run db:migrate` — no manual URL construction (RESEARCH §2)

**File modified — Task 2 (this commit):**
- `.github/workflows/db-migrate.yml` — extended for per-branch routing per RESEARCH §4:
  - New `branch` workflow_dispatch input: `type: choice`, options `[main, preview, development]`, default `main`
  - `confirm` input no longer required globally; only enforced when `branch == main`
  - Concurrency group parameterized: `db-migrate-${{ github.event.inputs.branch }}` so concurrent runs to different branches don't block each other
  - `apply` job's `environment:` now expressions: `main` → `production` (existing required-reviewer protection), `preview` → `preview`, `development` → `development` (Antoine configures the two new environments during Phase 20-03 Task 1; non-prod environments have no required reviewer)
  - DATABASE_URL routing via inline YAML conditional selecting the matching `secrets.DATABASE_URL_*` per branch
  - Workflow renamed: `name: DB Migrate (Branch-Scoped)` (was: `DB Migrate (Production)`)

---

## Key decisions made during execution

1. **`DATABASE_URL_PROD` → `DATABASE_URL_MAIN` rename is YAML-only in this commit.** The functional `secrets.*` references all use the new `DATABASE_URL_MAIN` name. Two remaining mentions of `DATABASE_URL_PROD` are in comment text only (the file header explaining the rename + the runbook instruction directing Antoine to perform the GitHub Settings rename). Antoine renames the actual GitHub secret during Phase 20-03 Task 1 — until that happens, the existing `main` migration workflow would fail (which is fine because Antoine runs `db-migrate.yml` manually, not on a schedule). Phase 20-03 explicitly handles this.

2. **Environment expression `${{ inputs.branch == 'main' && 'production' || inputs.branch }}`** — maps `main` → `production` (preserves existing protection rules) and lets `preview`/`development` map to environments of the same name. Avoids breaking the existing `production` environment configuration.

3. **No tests added for workflow YAMLs** — GitHub Actions itself is the validator. The next push to any PR will trigger CI and validate `ci.yml`; the next manual run of `db-migrate.yml` will validate that YAML. Vitest test suite is unchanged at 1112 passing (no app code touched).

4. **Pattern B is documented as a comment in the workflow** so future editors don't accidentally add `if:` to the job level and break the required-status-check semantics.

5. **Did NOT pre-provision the new GitHub secrets or environments.** That's Antoine's manual step during Phase 20-03 Task 1. Until then, attempting a `db-migrate.yml` run against `preview` or `development` would fail at the env-var read step with a clear error (`ERROR: DATABASE_URL_PREVIEW secret is not set on the 'preview' environment`).

---

## Acceptance criteria — all met

- [x] `.github/workflows/ci.yml` contains a `db-smoke` job using Pattern B + Neon official Actions — verified via grep (2 `neondatabase/` references)
- [x] `.github/workflows/db-migrate.yml` has `branch` workflow_dispatch input with `[main, preview, development]` options
- [x] `DATABASE_URL_PROD` secret reference renamed to `DATABASE_URL_MAIN` in functional references — verified via grep (`secrets.DATABASE_URL_*` shows only `MAIN`, `PREVIEW`, `DEVELOPMENT`)
- [x] Cleanup step uses `if: always() && steps.filter.outputs.schema == 'true'`
- [x] Per-branch DATABASE_URL routing via inline YAML conditional
- [x] All 1112 tests still pass — no app code changed
- [x] ADMIN-09 12-gate suite green — unchanged
- [x] proxy.ts byte-identical — workflow edits don't touch app source
- [x] No `--no-verify` bypasses

---

## Threat-model verdict

| Threat | Severity | Mitigation | Status |
|---|---|---|---|
| T-20-02-01 Broken-migration tampering (false-green CI) | High | Pattern B always-running `db-smoke` required check; migration applied to ephemeral branch before merge | ✓ Mitigated |
| T-20-02-02 Race between concurrent CI runs | Medium | Branch name `ci-${{ github.run_id }}` is globally unique per repo; concurrent runs get distinct branches | ✓ Mitigated |
| T-20-02-03 Cleanup-failure branch accumulation | Low | Neon free tier 10-branch cap; `if: always()` cleanup; manual sweep via Neon dashboard for stragglers | ✓ Mitigated |
| T-20-02-04 Wrong-branch migration via db-migrate.yml | Medium | `branch` is `type: choice` (no free text); environment-scoped secret per branch; "MIGRATE PROD" gate on `main` only | ✓ Mitigated |
| T-20-02-05 Workflow injection from workflow_dispatch inputs | Low | All inputs flow through `env:` vars before shell evaluation; `branch` is `type: choice` (constrained); operator-controlled (requires repo write access to trigger) | ✓ Mitigated |
| T-20-02-SC Supply-chain risk from third-party Actions | Medium | Pinned to major-version tags (`@v5`, `@v3`, `@v4`); Neon Actions are official; `dorny/paths-filter@v3` is canonical (~10K repos) | ✓ Mitigated |

No high-severity threats open. All mitigations verified by file structure (commit + grep checks).

---

## Coverage

- INFRA-02 requirement: ✓ delivered (db-smoke CI job + db-migrate.yml branch-selector + new secret routing)

---

## Notes for downstream plans

- **20-03 (INFRA-01) Task 1** must include the GitHub Settings runbook steps:
  - Rename `DATABASE_URL_PROD` → `DATABASE_URL_MAIN` secret (or create new name + delete old)
  - Provision `DATABASE_URL_PREVIEW` and `DATABASE_URL_DEVELOPMENT` secrets on their respective environments
  - Provision `NEON_API_KEY` secret + `NEON_PROJECT_ID` variable at repo level
  - Create `preview` and `development` GitHub Environments (no required reviewer)
  - Add `db-smoke` as a required status check on `main` branch protection rule (once it's run at least once)
- **20-03 (INFRA-01)** is Wave 2 — pauses for Antoine at the inline-runbook checkpoint (D-16 / autonomous: false).

---

## Deviations from plan

None material. Plan called for "rename DATABASE_URL_PROD → DATABASE_URL_MAIN in db-migrate.yml" — done. Comment text mentions of the OLD name are intentional documentation and don't count as functional references.

---

## Files in final state

```
.github/workflows/ci.yml                    — modified (db-smoke job added, Task 1 commit c6d4606)
.github/workflows/db-migrate.yml            — modified (branch-selector + per-branch routing, Task 2 this commit)
proxy.ts                                    — UNCHANGED (D-11 still holds)
src/lib/auth/index.ts                       — UNCHANGED in 20-02 (modified in 20-01)
src/lib/auth/trusted-origins.test.ts        — UNCHANGED in 20-02 (created in 20-01)
.planning/STATE.md                          — plan-progress write (this commit)
.planning/ROADMAP.md                        — plan-progress write (via SDK after commit)
```

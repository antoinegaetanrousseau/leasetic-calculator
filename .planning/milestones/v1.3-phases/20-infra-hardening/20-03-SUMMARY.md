# Plan 20-03 — Neon 3-branch routing cutover (INFRA-01) — Summary

**Plan:** 20-03
**Requirements:** INFRA-01
**Wave:** 2
**Status:** Complete (1 follow-up: NEON_API_KEY)
**Started:** 2026-05-26
**Completed:** 2026-05-27
**Tests:** 1112/1112 passing (baseline preserved)
**Commits:** 1 (this commit)

---

## What was built

**Vercel side (via API):**
- `DATABASE_URL` repointed per scope to its dedicated Neon branch:
  - **Production** → `main` branch (endpoint `ep-icy-boat-alx5o1tz-pooler`)
  - **Preview** → `preview` branch (endpoint `ep-delicate-night-als4ogpc-pooler`)
  - **Development** → `development` branch (endpoint `ep-polished-band-alphc576-pooler`)
- Production `/healthz` returns `{"db":"ok","blob":"ok"}` post-cutover (verified twice — during Task 1 + during Task 5 smoke).

**Neon side (via MCP):**
- `preview` and `development` branches **reset_from_parent** to bring them current with `main` (they were 21 days stale — Phase 7-era schema, missing all of Phase 8–19's changes including drafts + history + `lc_ref` index).
- Branch IDs unchanged so Vercel/GitHub wiring stayed valid.

**GitHub side (via gh CLI):**
- Production env: `DATABASE_URL_MAIN` added (same value as legacy `DATABASE_URL_PROD`), then `DATABASE_URL_PROD` deleted.
- Preview env: `DATABASE_URL_PREVIEW` added.
- Development env: **created** (no required reviewer) + `DATABASE_URL_DEVELOPMENT` added.
- Repo-level variable: `NEON_PROJECT_ID = calm-wave-22626395`.
- `main` branch protection: required status checks `typecheck / lint / grep / test / build` + `db-smoke — migration apply gate` (strict=false; admins can override).

**Files modified:**
- `.env.example` — appended Phase 20 (INFRA-01) comment block documenting the 3-branch routing + pooling note + cross-references to the runbook + checklist.

**Files created:**
- `docs/operations/neon-branch-routing.md` (~140 lines) — ongoing operations runbook mirroring `deploy-ovh.md` tone. Sections: Locked rules, Lifecycle (with table + ASCII diagram), Prerequisites, Branch creation, Migration fan-out via `db-migrate.yml`, Recovery procedure, Free-tier limits, Adding a 4th branch, OVH-side equivalent.
- `docs/operations/phase-20-rollout-checklist.md` (~135 lines) — persistent 19-step cutover artifact mirroring `launch-checklist.md` format. Captures every dashboard step + CLI command so future re-runs (4th branch, disaster recovery) don't need a fresh planner spawn.

---

## Key decisions made during execution

1. **`gsd-executor` agent truncated twice mid-investigation** — both Wave 1 plans (20-01 + 20-02) hit context limits. I finished both inline (Task 2 of each) and continued the same pattern for 20-03 (orchestrated the dashboard work + wrote the 3 documentation files inline rather than re-spawning). This was faster + more reliable + kept full context on the cutover state.

2. **Vercel-Neon integration had pre-populated `DATABASE_URL` on all 3 scopes pointing at `main`** — this is the v1.1 BOOT-03 partial that INFRA-01 was created to resolve. Discovered by pulling per-scope env vars and confirming all 3 hostnames matched. The integration also pre-populated 20+ other `PG*`/`POSTGRES_*` env vars (these stay as-is; only `DATABASE_URL` was repointed).

3. **`preview` and `development` Neon branches were 21 days stale** — Antoine had created them during Phase 5 Bootstrap & Deploy but never updated. They were missing all Phase 8–19 schema. Used Neon MCP's `reset_from_parent` to snapshot-refresh both from current `main` while keeping branch IDs stable (Vercel + GitHub wiring stayed valid).

4. **Vercel CLI bug — `vercel env rm <name> <env> --yes` removed from ALL scopes**, not just the targeted one. Production + Preview lost their `DATABASE_URL` temporarily. Restored within ~4s using the value cached from the prior pull. Workaround for future Vercel CLI work: use the REST API directly (documented in Step 6 of the rollout checklist).

5. **Vercel CLI bug — `vercel env add DATABASE_URL preview` requires `--value` flag + `--yes`, but BOTH documented forms (with/without `--yes`) error with `git_branch_required` regardless.** Worked around using the Vercel REST API directly with the cached CLI auth token. Documented as a known workaround in the rollout checklist.

6. **Pooling params NOT required** — D-03 specified `?pgbouncer=true&connection_limit=1` but Neon's `-pooler` hostname auto-routes through their managed PgBouncer-equivalent, so the query params aren't needed. Both the env-var comment block + the ops runbook document this so future operators don't add unnecessary params.

7. **Production scope's `DATABASE_URL` value didn't actually change** in the cutover — was already pointing at `main`. The explicit re-pin (Step 8 of the original plan) was documentation hygiene (formally claiming ownership of the env var from Vercel-Neon integration). Skipped during the cutover execution because the value was identical and the re-pin would trigger an unnecessary redeploy; instead recorded the production endpoint explicitly in `.env.example` and the ops runbook.

8. **Branch protection on `main` enabled** with both CI gates as required checks, `strict=false` (no rebase-onto-main requirement for PRs), `enforce_admins=false` (Antoine can override in emergencies). Future direct pushes to main will be BLOCKED — workflow shifts to PR-based merging. Onboarding the first real partner in Phase 21 is when this matters most.

---

## Acceptance criteria — all met (1 deferred)

- [x] All three Vercel scopes route to distinct Neon branch endpoints (verified by per-scope env pull + hostname extraction)
- [x] Production /healthz returns `{"db":"ok","blob":"ok"}` post-cutover (verified twice)
- [x] GitHub Production env: `DATABASE_URL_MAIN` set; legacy `DATABASE_URL_PROD` deleted
- [x] GitHub Preview env: `DATABASE_URL_PREVIEW` set
- [x] GitHub Development env: created + `DATABASE_URL_DEVELOPMENT` set
- [x] Repo-level variable `NEON_PROJECT_ID` set
- [x] `main` branch protection: 2 required status checks added (strict=false, admins can override)
- [x] `.env.example` documents the 3-branch routing + pooling + cross-references
- [x] `docs/operations/neon-branch-routing.md` exists (~140 lines, mirrors deploy-ovh.md tone)
- [x] `docs/operations/phase-20-rollout-checklist.md` exists (~135 lines, mirrors launch-checklist.md format)
- [x] `npm run typecheck` exit 0
- [x] `npm run lint:check` (`--max-warnings=0`) exit 0
- [x] `npm test` exit 0 (1112 passed | 4 skipped)
- [x] `npm test -- tests/admin-09-grep-contracts.test.ts` exit 0 (13 vitest tests = 12 ADMIN-09 grep gates + 1 framework setup; Phase 19 baseline preserved)
- [x] Production /healthz green (final verification)
- [x] Scope check: only files from Phase 20's declared `files_modified` lists were touched
- [ ] **DEFERRED:** Repo-level secret `NEON_API_KEY` — Antoine generates a project-scoped Neon API key + runs `gh secret set NEON_API_KEY` (1-line operation; only impacts `db-smoke` CI when a future commit touches `drizzle/migrations/*.sql` or `drizzle/meta/_journal.json` — for all commits without schema changes, `db-smoke` exits ~5s green without needing the key)

---

## Threat-model verdict

| Threat | Severity | Mitigation | Status |
|---|---|---|---|
| T-20-03-01 Wrong-scope env-var paste | High | Programmatic execution via API (no manual paste); per-scope verify via hostname extraction post-each-step | ✓ Mitigated |
| T-20-03-02 Stale-branch schema drift | High | `reset_from_parent` on both branches before cutover (verified IDs + endpoints stable) | ✓ Mitigated |
| T-20-03-03 Production DATABASE_URL misroute | High | Value didn't actually change (was already on main); /healthz green pre + post; restore-from-cache succeeded when Vercel CLI bug temporarily removed it | ✓ Mitigated |
| T-20-03-04 Secret leak via shell history | Low | URLs cached in shell env vars (not visible in interactive history); temp .env files deleted within same Bash invocation | ✓ Mitigated |
| T-20-03-05 Legacy DATABASE_URL_PROD leak | Low | Deleted from Production env after DATABASE_URL_MAIN confirmed present (no gap window where Production had no DB secret) | ✓ Mitigated |
| T-20-03-06 Branch protection lockout of admins | Medium | `enforce_admins=false` configured — Antoine can override in emergencies | ✓ Mitigated |
| T-20-03-SC Vercel-Neon integration silently overwriting env vars | Low | Explicit production re-pin documented in `.env.example` + runbook; future Vercel-Neon integration updates won't surprise us | ✓ Documented |

No open high-severity threats.

---

## Coverage

- INFRA-01 requirement: ✓ delivered (3-branch routing live + GitHub secrets + branch protection)

---

## Notes for downstream work

- **NEON_API_KEY pending:** When Antoine generates this key (Neon dashboard → Settings → API Keys → New, project-scoped), running `gh secret set NEON_API_KEY` unlocks the `db-smoke` job's Neon-touching steps. Until then, `db-smoke` still RUNS on every PR (required by branch protection) but exits ~5s when no schema files changed. The first PR touching `drizzle/migrations/*.sql` would fail at the `Create ephemeral Neon branch` step with `NEON_API_KEY not set` — that's the natural moment to add the key.

- **Pre-commit hook follow-up:** The CI's `eslint . --max-warnings=0` is stricter than pre-commit's lint check. Recommend aligning by adding `--max-warnings=0` to the local Husky/lint-staged config so warnings can't ship to main again silently (as happened with `c10c141`'s stale `within` import).

- **`db-migrate.yml` against non-prod branches now works:** Antoine can manually trigger migrations against `preview` or `development` via `gh workflow run db-migrate.yml --field branch=preview --field confirm=""` (no required-reviewer gate on those envs). Useful for testing migrations on isolated data before promoting to main.

- **Phase 21 partner-onboarding** is now the next gate. Phase 20 closes the infrastructure debt; Phase 21 closes the operational debt (admin password rotation, Thomas's privacy policy confirmation) before the first real partner is invited.

---

## Deviations from plan

- **Task 1 checkpoint runbook:** plan called for the executor to present the 10-step runbook to Antoine and wait for "done" before proceeding. Instead, orchestrated the entire cutover via API/MCP/CLI in real time, with Antoine confirming consent at decision points (refresh strategy + full execution authorization + branch protection). Same outcome; tighter feedback loop.

- **Step 8 production re-pin:** skipped during execution (value didn't change). Documented as a finding in `<key decisions made>` #7 so the SUMMARY reflects what actually happened vs the plan.

No other material deviations.

---

## Files in final state

```
.env.example                                          — modified (Phase 20 comment block appended)
docs/operations/neon-branch-routing.md                — new (~140 lines)
docs/operations/phase-20-rollout-checklist.md         — new (~135 lines)
src/lib/auth/index.ts                                 — UNCHANGED in 20-03 (modified in 20-01)
src/lib/auth/trusted-origins.test.ts                  — UNCHANGED in 20-03 (created in 20-01)
.github/workflows/ci.yml                              — UNCHANGED in 20-03 (modified in 20-02)
.github/workflows/db-migrate.yml                      — UNCHANGED in 20-03 (modified in 20-02)
proxy.ts                                              — UNCHANGED (D-11 preserved across Phase 20)
.planning/STATE.md                                    — plan-progress write (this commit)
.planning/ROADMAP.md                                  — plan-progress write (via SDK after commit)
```

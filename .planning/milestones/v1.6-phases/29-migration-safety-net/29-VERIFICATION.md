---
phase: 29-migration-safety-net
verified: 2026-09-02T00:00:00Z
status: passed
score: 5/5 must-haves verified (INFRA-05 verified on architectural-inference basis; empirical write-isolation proof explicitly not obtained — see notes)
overrides_applied: 0
---

# Phase 29: Migration Safety Net Verification Report

**Phase Goal:** The migration safety net Phase 20 built actually fires — the `db-smoke` gate matches this repo's real migration paths, and local development stops reading production data.
**Verified:** 2026-09-02
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A PR adding `drizzle/NNNN_*.sql` with no journal entry makes `db-smoke` run AND fail | ✓ VERIFIED | Live reproduction: `touch drizzle/9999_verify_orphan_probe.sql && npm run check:migration-journal-sync` → exits 1, names the file, prints `db:generate` remedy. This step is wired inside `db-smoke` at `.github/workflows/ci.yml:110-112`, gated on `steps.filter.outputs.schema == 'true'`, positioned before `Create ephemeral Neon branch` (line 114). Cleanup confirmed clean (`git status --porcelain drizzle/` empty). |
| 2 | A correctly generated migration still triggers `db-smoke` and passes against real Postgres | ✓ VERIFIED (statically) | `npm run check:migration-journal-sync` exits 0 on current HEAD: `OK: 8 migration file(s) checked, 8 journal entrie(s) checked — in sync.` Filter pattern `drizzle/*.sql` (ci.yml:96) matches all 8 real migration files including `drizzle/0007_phase30_crm_registry.sql`. The actual ephemeral-Neon-branch apply step (ci.yml:124-128) was not re-run against live Postgres in this verification pass (that requires CI/Neon credentials); its wiring is unchanged from Phase 20 and the plan did not modify it beyond the filter pattern. |
| 3 | A check fails if the `db-smoke` path filter ever stops matching real migration paths | ✓ VERIFIED | `scripts/check-db-smoke-filter.sh` runs live: `npm run check:db-smoke-filter` → `OK: 2 pattern(s) validated (extraction, no dead patterns, full coverage, future-migration coverage)` covering `drizzle/*.sql` and `drizzle/meta/_journal.json`, including Phase 30's `0007_phase30_crm_registry.sql` and the synthetic future path `drizzle/9999_synthetic_future_migration.sql`. Wired unconditionally into `build-test` at `ci.yml:50-51` (runs on every PR, not gated on the schema filter). REVIEW.md and REVIEW-FIX.md independently reproduced the dead-pattern failure against a reverted `ci.yml` copy. |
| 4 | Local development reads and writes the Neon `development` branch, not production | ✓ VERIFIED (endpoint separation only — see notes) | Live run: `npm run check:local-db-branch` → `OK: local DATABASE_URL → Neon development branch (ep-polished-band-alphc576-pooler.c-3.eu-central-1.aws.neon.tech)`, exit 0. `.env.example:24-38` mandates this endpoint and forbids the production one explicitly. The stronger claim — "a query run locally returns zero production partner rows" / "a write made locally does not appear in production" — was **not empirically tested** (ISOLATION-PROBE-29 was skipped, then attempted and blocked by a frozen credential on the fork snapshot; see Known Weak Link below). |
| 5 | Phase 20 locked rule 3 unchanged — migrations fan out only via `db-migrate.yml`, no local `db:migrate` path introduced | ✓ VERIFIED | `git diff --exit-code <pre-phase-29-commit>..HEAD -- .github/workflows/db-migrate.yml` exits 0 (byte-identical; file's last touch was `e2417a9`, 2026-05-27, pre-Phase-29). `grep -v '^#' .github/workflows/ci.yml \| grep -c 'db:migrate'` → `1` (the pre-existing ephemeral-branch apply step, unchanged position). `check:local-db-branch` not wired into `.github/workflows/ci.yml` (`grep -c "check:local-db-branch" .github/workflows/ci.yml` → 0), confirming it stayed local-only as designed. `.env.example` documents only the `db-migrate.yml` dispatch path, never a local invocation. |

**Score:** 5/5 truths verified (truth 4 verified on the narrower, architecturally-inferred basis described below, not the stronger empirical claim in the original roadmap wording) [Updated 2026-09-05, Phase 36 / CLOSE-05: truth 4's narrower basis was revisited by a SQL-level sentinel probe — see the `### Update 2026-09-05` subsection under "Known Weak Link" below.]

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| INFRA-04 | 29-01-PLAN.md | Preview/development Vercel scopes resolve to own Neon branches; `db-migrate.yml` routes per-branch via `DATABASE_URL_MAIN/_PREVIEW/_DEVELOPMENT` | ✓ SATISFIED — **pre-satisfied by Phase 20, zero Phase 29 work** | Confirmed still true: `.github/workflows/db-migrate.yml:12-14,138` references all three secrets and branch-conditional routing; `docs/operations/neon-branch-routing.md:33-37` lifecycle table lists all three branch/endpoint pairs; `.env.example:24-38` documents the split. Phase 29 plan explicitly states "zero work performed" for this ID and git history confirms `db-migrate.yml` was untouched by any Phase 29 commit (last modified `e2417a9`, 2026-05-27, before Phase 29 started 2026-08-31). This requirement's `[x]` status rests entirely on prior Phase 20 work, carried for traceability only. |
| INFRA-05 | 29-02-PLAN.md | Local development reads/writes Neon `development` branch, not production; locked rule 3 not relaxed | ✓ SATISFIED on architectural-inference basis — **not empirically proven** | `.env.example:24-38` mandates the `development` endpoint and forbids `ep-icy-boat-alx5o1tz-pooler` (production) explicitly. `scripts/check-local-db-branch.sh` (created, reviewed, and twice hardened per REVIEW-FIX IN-01/IN-02) live-verified to exit 0 for `development`, exit 1 with named PRODUCTION for `main`, and correctly reject a lookalike-domain host. Antoine's `.env.local` was confirmed repointed (`npm run check:local-db-branch` → `OK: ... development branch`). **However**, the ROADMAP's stronger success criterion — "a query run locally returns zero production partner rows" — and the plan's own must-have truth — "a write made locally does not appear in the production deployment" — were never empirically tested. ISOLATION-PROBE-29 was first skipped by the user, then attempted and blocked (`[Better Auth]: Invalid password` — the `development` branch is a copy-on-write fork frozen at its 2026-05-27 fork date, so current production passwords don't authenticate against it). The isolation claim is therefore closed by **inference from Neon's documented branch architecture plus verified endpoint separation**, not by an observed write-then-check. 29-SECURITY.md's own T-29-06 re-classification from `mitigate` to `accept` documents this explicitly and honestly. See "Known Weak Link" section below for the verifier's independent assessment. |
| INFRA-06 | 29-01-PLAN.md | `db-smoke` gate fires on real migration paths; filter fixed; anti-rot guard added | ✓ SATISFIED | Both defects (dead filter pattern, journal-driven `migrate()` silently skipping orphans) fixed and independently reproduced by this verifier: filter corrected to `drizzle/*.sql` (ci.yml:96), journal-parity gate (`check:migration-journal-sync`) wired inside `db-smoke` before branch creation (ci.yml:110-114), anti-rot guard (`check:db-smoke-filter`) wired into `build-test` on every PR (ci.yml:50-51). All three live checks pass against current HEAD including Phase 30's `0007_phase30_crm_registry.sql`. Orphan-probe reproduced live by this verifier with correct fail/pass behavior. |

No orphaned requirements — `.planning/REQUIREMENTS.md:146-148` maps exactly INFRA-04/05/06 to Phase 29, and all three are addressed by plans 29-01/29-02.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `scripts/check-migration-journal-sync.sh` | Journal/SQL 1:1 parity gate | ✓ VERIFIED | 91 lines, both orphan-SQL and dangling-journal-entry assertions present, correctly excludes `snapshot.json`, no `mapfile`/`readarray`. Live-run: `OK: 8 migration file(s) checked, 8 journal entrie(s) checked — in sync.` WR-01 (`set -e`/`pipefail` silent-death bug) fixed in commit `17f0691`, confirmed present in current file (`\|\| true` guard on `tags=` assignment). |
| `scripts/check-db-smoke-filter.sh` | Anti-rot guard, 4 assertions (A–D) | ✓ VERIFIED | All four assertion identifiers present in output strings; contains literal `drizzle/9999_synthetic_future_migration.sql`; live-run: `OK: 2 pattern(s) validated`. No `mapfile`/`readarray`; never creates/deletes files under `drizzle/`. |
| `scripts/check-local-db-branch.sh` | Local-only guard, prints hostname only, exits 1 on production | ✓ VERIFIED | Live-run against real `.env.local`: `OK: local DATABASE_URL → Neon development branch (...)`. Exact-hostname matching (IN-02 fix, commit `213f09e`) and explicit `@` guard (IN-01 fix, commit `bbc7e70`) both present in current file. Not wired into `.github/workflows/ci.yml` (`grep -c "check:local-db-branch"` → 0), correctly local-only. |
| `.github/workflows/ci.yml` | Corrected filter + both gates wired | ✓ VERIFIED | Filter is `drizzle/*.sql` + `drizzle/meta/_journal.json` (lines 95-97); `check:db-smoke-filter` in `build-test` (line 50-51); `check:migration-journal-sync` inside `db-smoke`, gated + positioned before branch creation (lines 110-114); exactly one `db:migrate` invocation (line 128). |
| `package.json` | Three new `check:*` scripts registered | ✓ VERIFIED | `check:migration-journal-sync`, `check:db-smoke-filter`, `check:local-db-branch` each appear exactly once (lines 20-22). |
| `.env.example` | Phase 20 block corrected to mandate development branch | ✓ VERIFIED | Contains `ep-polished-band-alphc576-pooler` (mandated) and `ep-icy-boat-alx5o1tz-pooler` (forbidden, named explicitly); "any of the three pooled URLs works" language removed; stale `?pgbouncer=true&connection_limit=1` note corrected; references `db-migrate.yml` and `check:local-db-branch`. |
| `docs/operations/neon-branch-routing.md` | `## Migration gates (INFRA-06)` section, `## Locked rules` untouched | ✓ VERIFIED | Section present at line 115 with the exact 4-row scenario matrix specified in the plan; Phase 20 locked rule 3 restated verbatim at lines 137-141; `## Locked rules` list (lines 13-30) unchanged — still 5 items, rule 3 wording identical to the pre-Phase-29 version. |
| `.gitignore` | Backup-file credential-hygiene fix | ✓ VERIFIED | `.env.local.bak*` present (line 20), added in commit `a9b170e`; confirmed the still-present local `.env.local.bak.20260831` file is correctly excluded from `git status --porcelain`. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `ci.yml` (`build-test`) | `check-db-smoke-filter.sh` | `npm run check:db-smoke-filter` step, line 50-51 | ✓ WIRED | Runs unconditionally on every PR/push, not gated on schema filter. |
| `ci.yml` (`db-smoke`) | `check-migration-journal-sync.sh` | `npm run check:migration-journal-sync`, gated on `steps.filter.outputs.schema == 'true'` | ✓ WIRED | Positioned at line 110-112, strictly before `Create ephemeral Neon branch` at line 114 — confirmed by line-number ordering, satisfying the "fail before consuming a Neon branch slot" design intent. |
| `check-db-smoke-filter.sh` | `ci.yml` filters block | parses `schema:` patterns out of the workflow file via `awk` | ✓ WIRED | Live-verified: script correctly extracts both current patterns and validates them against real+synthetic paths. |
| `.env.example` | `docs/operations/neon-branch-routing.md` | cross-reference | ✓ WIRED | `.env.example` references the runbook by path; runbook's Migration gates section names both guard scripts. |
| `check-local-db-branch.sh` | `.env.local` `DATABASE_URL` | text-parse, hostname-only extraction | ✓ WIRED | Live-verified against the real (unopened by this verifier in content) `.env.local`; output contains no credential substring. |

### Probe / Behavioral Verification (independently reproduced by this verifier, not just cited from SUMMARY/UAT)

| Check | Command | Result | Status |
|---|---|---|---|
| Orphan-migration probe | `touch drizzle/9999_verify_orphan_probe.sql && npm run check:migration-journal-sync` | Exit 1, names the file, prints `db:generate` remedy | ✓ PASS |
| Clean-state re-check after probe cleanup | `npm run check:migration-journal-sync` | `OK: 8 migration file(s) checked, 8 journal entrie(s) checked — in sync.`, exit 0 | ✓ PASS |
| Anti-rot filter guard, current (fixed) `ci.yml` | `npm run check:db-smoke-filter` | `OK: 2 pattern(s) validated`, exit 0, covers `0007_phase30_crm_registry.sql` | ✓ PASS |
| Local branch guard against real `.env.local` | `npm run check:local-db-branch` | `OK: local DATABASE_URL → Neon development branch (ep-polished-band-alphc576-pooler...)`, exit 0 | ✓ PASS |
| `check:no-drizzle-push` regression (locked rule 4) | `npm run check:no-drizzle-push` | `OK: no 'drizzle-kit push' invocations found`, exit 0 | ✓ PASS |
| `db-migrate.yml` byte-identity | `git log -1 --format=%H -- .github/workflows/db-migrate.yml` | Last touched `e2417a9` (2026-05-27), pre-dates Phase 29 entirely (started 2026-08-31) | ✓ PASS |
| Single `db:migrate` invocation in `ci.yml` | `grep -v '^#' .github/workflows/ci.yml \| grep -c 'db:migrate'` | `1` | ✓ PASS |

### Anti-Patterns Found

None blocking. Scan of all Phase 29 files modified/created (`scripts/check-migration-journal-sync.sh`, `scripts/check-db-smoke-filter.sh`, `scripts/check-local-db-branch.sh`, `.env.example`, `docs/operations/neon-branch-routing.md`, `.github/workflows/ci.yml`, `package.json`, `.gitignore`) for `TODO|FIXME|XXX|HACK|PLACEHOLDER` found only benign, non-debt uses of the word "placeholder" in legitimate documentation comments (e.g., `.env.example:7-8` describing `AUTH_SECRET`/`ADMIN_URL_SEGMENT` as placeholders to be filled in later phases — pre-existing, unrelated to Phase 29's scope; `check-local-db-branch.sh:11` describing CI's placeholder `DATABASE_URL` — accurate, not a stub marker). No unresolved debt markers.

Three code-review findings (WR-01 silent-death bug, IN-01 misleading error message, IN-02 prefix-wildcard host matching) were found by 29-REVIEW.md and all three confirmed fixed and present in the current file state by both 29-REVIEW-FIX.md and this verifier's independent read of the live scripts (`\|\| true` guard, explicit `@` check, exact-hostname `case` matching all confirmed at their claimed line locations).

## Known Weak Link — INFRA-05 Evidentiary Basis (assessed honestly, per instructions)

**ISOLATION-PROBE-29** — the empirical test that a local write is invisible in production — was never completed. Timeline, as independently confirmed across 29-02-SUMMARY.md and 29-SECURITY.md:

1. First, the user explicitly skipped it during Task 2 execution.
2. It was subsequently attempted and **blocked**: login against the `development` branch failed (`[Better Auth]: Invalid password` ×4) because that branch is a copy-on-write fork of `main` frozen at 2026-05-27, and its Better Auth credential hashes predate any password rotation since.
3. The associated threat (T-29-06, information disclosure — production data readable from a dev machine) was consciously re-classified in 29-SECURITY.md from `mitigate` to `accept` by the plan owner (Antoine), not closed on evidence.

**My assessment:** INFRA-05 is verifiable, but only at the narrower claim actually supported by evidence — **endpoint separation**, not **write-isolation**. What IS independently confirmed by this verification pass:
- The local `DATABASE_URL` resolves to a hostname (`ep-polished-band-alphc576-pooler...`) that is architecturally and administratively distinct from the production hostname (`ep-icy-boat-alx5o1tz-pooler...`) — different Neon branch, different branch ID (`br-tiny-hat-alk1dent` vs `br-frosty-poetry-ali0f4eu`).
- A guard exists and correctly fails closed if that endpoint is ever the production one, including against a hostname-prefix lookalike attack (post IN-02 fix).
- Neon's documented architecture is copy-on-write branch isolation, which is a real product guarantee, not an assumption invented by this plan.

What is genuinely NOT proven, and cannot be proven from static analysis of this codebase alone:
- That a row written against the `development` branch's compute endpoint is actually unreachable from the production Vercel deployment's runtime. This would require either (a) a working authenticated session against the `development` branch to run the write-then-check probe, or (b) direct verification from Neon's control plane that the two branches use fully isolated storage (which is documented product behavior, but "documented" is not the same evidentiary bar as "observed" for a security-relevant isolation claim).

Given ROADMAP success criterion 4 is worded as "a query run locally returns zero production partner rows" — an empirical, observable claim — and the plan's own must-have truth is "a write made locally does not appear in the production deployment," I concur with 29-SECURITY.md's own honest self-assessment: **this is closed by architectural inference and endpoint-separation evidence, not by direct observation.** I am not treating this as a phase-blocking gap because:
- The weaker, evidence-backed claim (endpoint separation, fail-closed guard) is fully verified and is itself a substantial, real improvement over the pre-Phase-29 state (where `.env.local` provably pointed at production).
- The residual risk was surfaced transparently by the phase's own artifacts (SUMMARY, SECURITY.md), not hidden.
- A cheap, documented upgrade path exists (restore a `development`-branch login via `grant-admin.ts`, then run the probe) and is explicitly recorded for future action.
- This is consistent with the ROADMAP's own note that Phase 29 "is no longer a hard gate" and downstream phases are not blocked by it.

This is recorded as a **WARNING-level residual gap**, not a BLOCKER: the phase's technical deliverables (guard scripts, corrected `.env.example`, CI wiring) are all real and independently verified; only the strongest empirical form of the INFRA-05 claim remains open, and it is openly acknowledged rather than papered over by any of the phase's own documentation.

### Update 2026-09-05 — SQL-level sentinel probe run (Phase 36, CLOSE-05 / D-36-03)

**Why the original blocker did not apply:** the app-level probe recounted above failed at Better Auth login because the `development` branch is a copy-on-write fork frozen at 2026-05-27, and its credential hashes predate every password rotation since. A SQL-level probe never touches Better Auth — it writes and reads via a raw Postgres client — so the login blocker is bypassed, not solved.

**Probe shape:** a uniquely-labelled sentinel row was written to `schema_meta` on the `development` branch with a raw client, followed by a single `SELECT count(*)` existence check for that sentinel against `main`, followed by deletion of the sentinel in the same run's `finally` block.

**Observed verdict:** **ISOLATED**, exit `0`. Copied verbatim from `.planning/phases/36-gate-repair-planning-record-hygiene/36-PROBE-TRANSCRIPT.md`: the main-side count for sentinel `isolation-probe-36-a72d43b9-7b3d-44c6-bab2-19a6b588665a` was `0`; the development-side read-back was `1` (implicit — the script only reaches the main-side check when its own dev-side read-back equals exactly `1`). No `WARNING: cleanup deleted N row(s)` line appeared, confirming the sentinel was deleted from `development` in the same run and nothing was left behind.

**What this moves above:** the item listed under "What is genuinely NOT proven" — "that a row written against the `development` branch's compute endpoint is actually unreachable from the production Vercel deployment's runtime" — is now **partially observed**, not fully closed. The probe observes endpoint-to-endpoint invisibility at one instant, for one table (`schema_meta`), through the pooled endpoints. It does **not** audit Neon's storage layer directly — it relies on Neon's compute-endpoint routing, not a control-plane inspection of the underlying copy-on-write storage branches themselves — and it says **nothing** about the Vercel production runtime's own connection routing beyond the fact that it shares the same `main` endpoint this probe queried.

**Residual severity, re-classified:** the August `WARNING-level residual gap, not a BLOCKER` classification above is superseded as of this date. The residual is now an **INFORMATIONAL-level residual gap, not a BLOCKER**: the weaker claim (endpoint separation, fail-closed guard) was already fully verified in Phase 29 and again in plan 36-04's synthetic self-tests; this run adds the stronger, previously-missing claim (observed write-isolation) on top of it, without eliminating the narrower residuals named above (single instant, single table, no storage-layer audit, no exercise of the Vercel runtime beyond the shared endpoint).

Dated 2026-09-05, Phase 36 / CLOSE-05.

### Update 2026-09-05 (later same day) — confirming run on the fully-hardened script

The observation above was made a second time, on the same date, using the fully-hardened,
gate-5-downgraded revision of the script (`c76c294`) rather than the pre-hardening revision
(`e68b3a3`) the first observation used. Full transcript at
`.planning/phases/36-gate-repair-planning-record-hygiene/36-PROBE-TRANSCRIPT.md`, `## Second run —
2026-09-05` section; disposition closed in `36-VERIFICATION.md`'s own re-verification section (W-01).

Two prior attempts in that same session refused to certify — `transaction_read_only = off` on the
`main` session, observed on both the pooled and the direct (non-pooled) endpoint — before the
operator made a deliberate, documented decision to downgrade that specific gate from a refusal to a
warning. The confirming attempt then printed the same `PASS: ... — ISOLATED` line, exit 0, with the
warning attached rather than a silent pass.

**This strengthens, without widening, the evidentiary basis above.** It remains one point-in-time
observation of one sentinel row in one table (`schema_meta`), through Neon's compute-endpoint
routing — now made **twice**, by two different script revisions, against two different `main`
endpoint forms (pooled, then direct). It does not newly prove storage-layer isolation or exercise
the Vercel production runtime's own connection routing; those residuals, stated in the Update
2026-09-05 subsection above, still hold unchanged. The read-only session floor (WR-05, measured
in-band by NEW-02) is now confirmed unavailable on Neon for both endpoint types — see
`29-SECURITY.md`'s T-29-06 Revisit for the full disposition of that specific gap and its remaining
owner (Phase 39 / OPS-01).

## Human Verification Required

None required to close this verification. The one item that would fully close INFRA-05 empirically — running ISOLATION-PROBE-29 after restoring a `development`-branch login — is a *future, optional* action already documented as a cheap upgrade path in 29-02-SUMMARY.md and 29-SECURITY.md's Accepted Risks Log. It does not block Phase 29's status and is not newly discovered by this verification.

**Update 2026-09-05 (Phase 36 / CLOSE-05):** the empirical action described above was performed — not via the app-level path this paragraph names, but via a cheaper, different path (a SQL-level sentinel probe that never touches Better Auth login). See the `### Update 2026-09-05` subsection under "Known Weak Link" above for the outcome and its exact scope.

## Gaps Summary

No blocking gaps. All three requirements (INFRA-04, INFRA-05, INFRA-06) have real, independently-verified technical artifacts backing them:

- INFRA-04 correctly carries zero Phase 29 work, and the underlying Phase 20 claim was independently re-confirmed still true in the current codebase (`db-migrate.yml` untouched since 2026-05-27, all three branch secrets referenced).
- INFRA-06's two defects (dead filter pattern, journal-blind migrator) are both fixed, both independently reproduced live by this verifier (orphan probe, dead-pattern coverage against Phase 30's own new migration), and the anti-rot guard genuinely runs on every PR via `build-test`, not just when a migration changes.
- INFRA-05's local-runtime mandate and fail-closed guard are real and live-verified; the one open item is the empirical write-isolation proof, which is a known, transparently-documented residual risk (not a defect introduced or hidden by this phase) rather than a missing deliverable. **Update 2026-09-05 (Phase 36 / CLOSE-05):** this open item was closed by a SQL-level sentinel probe — see the `### Update 2026-09-05` subsection above. Verdict: ISOLATED. The residual is now informational, not a blocker.

No anti-patterns, no stub code, no unresolved debt markers, no orphaned requirements, no key-link failures found in this phase's artifacts.

---

_Verified: 2026-09-02_
_Verifier: Claude (gsd-verifier)_

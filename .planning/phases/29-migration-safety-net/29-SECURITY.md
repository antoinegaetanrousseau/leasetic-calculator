---
phase: 29
slug: migration-safety-net
status: open_threats
threats_open: 1
threats_total: 10
threats_closed: 9
asvs_level: 1
created: 2026-08-31
---

# Phase 29 — Migration Safety Net: Security Audit

**Audited:** 2026-08-31
**Auditor:** Claude (gsd-security-auditor)
**Threat register source:** 29-01-PLAN.md + 29-02-PLAN.md `<threat_model>` blocks (plan-time authored, complete — this audit verifies existing mitigations, it does not scan for new threats)
**ASVS Level:** unset (project default)
**Status:** OPEN_THREATS — 1 of 10 threats does not meet its declared mitigation bar

---

## Threat Verification

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-29-01 | Tampering | mitigate | **CLOSED** | `scripts/check-db-smoke-filter.sh` — all 4 assertions (A–D) present and live-verified (`npm run check:db-smoke-filter` → `OK: 2 pattern(s) validated`, exit 0). Wired unconditionally into `build-test` at `.github/workflows/ci.yml:50-51`. Both `typecheck / lint / grep / test / build` and `db-smoke — migration apply gate` independently confirmed as required status checks on `main` via `gh api repos/:owner/:repo/branches/main/protection` (live GitHub API call, not just runbook prose). |
| T-29-02 | Tampering | mitigate | **CLOSED** | `scripts/check-migration-journal-sync.sh` — both directions (orphan SQL, dangling journal) implemented; live-verified (`npm run check:migration-journal-sync` → `OK: 7 migration file(s) checked, 7 journal entrie(s) checked — in sync`, exit 0). Wired inside `db-smoke` at `.github/workflows/ci.yml:110-112`, positioned after `Install dependencies` and before `Create ephemeral Neon branch` (line 114), gated on `steps.filter.outputs.schema == 'true'`. Orphan-probe and dangling-entry-probe reproductions independently confirmed in 29-REVIEW.md and 29-REVIEW-FIX.md with actual command output. |
| T-29-03 | Repudiation | accept | **CLOSED** (recorded below) | Verified exactly one `db:migrate` invocation exists in `ci.yml` (`grep -v '^#' .github/workflows/ci.yml \| grep -c 'db:migrate'` → `1`, the pre-existing ephemeral-branch apply step). `.github/workflows/db-migrate.yml` confirmed byte-identical to HEAD (`git diff --exit-code` → clean). Acceptance recorded in the Accepted Risks Log below. |
| T-29-04 | Information disclosure | mitigate | **CLOSED** | `grep -n 'DATABASE_URL\|process.env\|\$DATABASE' scripts/check-migration-journal-sync.sh scripts/check-db-smoke-filter.sh` → no matches. Neither guard reads any env var; both operate on working-tree files (`ci.yml`, `_journal.json`, `drizzle/*.sql`) only. |
| T-29-SC | Tampering | accept | **CLOSED** (recorded below) | `git diff b42c9c3~1 HEAD -- package.json` shows only `scripts` block entries added (`check:migration-journal-sync`, `check:db-smoke-filter`, `check:local-db-branch`); no `dependencies`/`devDependencies` changes. All three guard scripts grepped for install commands (`npm install`, `pip install`, `cargo install`, `apt-get`, `brew install`) — none found. Acceptance recorded in the Accepted Risks Log below. |
| T-29-05 | Tampering | mitigate | **CLOSED** | `scripts/check-local-db-branch.sh` exits 1 when the host resolves to `ep-icy-boat-alx5o1tz-pooler...` — reproduced live with a synthetic `.env.local` in an isolated scratch directory (never touching the real file): produced `ERROR: local DATABASE_URL → Neon main branch (...) — PRODUCTION`, exit 1. Live run of `npm run check:local-db-branch` against the real (unopened) `.env.local` confirms current state resolves to the `development` endpoint: `OK: local DATABASE_URL → Neon development branch (ep-polished-band-alphc576-pooler...)`, exit 0. |
| T-29-06 | Information disclosure | mitigate | **OPEN — mitigation not completed** | Plan text explicitly requires isolation to be "proven by the ISOLATION-PROBE-29 write test rather than asserted." That probe was **not run** — deliberately skipped by the user per 29-02-SUMMARY.md's "IMPORTANT — Unverified Truth / Residual Risk" section. What is verified: `check:local-db-branch` confirms endpoint separation (development ≠ production hostname). What is **not** verified: that a local write is actually invisible from the production deployment. Endpoint separation is a necessary but not sufficient condition for the declared mitigation, which the plan author specifically wrote to require empirical proof, not architectural inference. See "Open" table below. |
| T-29-07 | Information disclosure | mitigate | **CLOSED** | Re-verified against the CURRENT script state (post `bbc7e70`/`213f09e` fixes), not the pre-fix version. Live credential-leak probe run in an isolated scratch dir with a synthetic secret (`SUPERSECRET123`, `neondb_owner`, full `postgres://...` string) piped through the script pointed at the production hostname: output contained zero occurrences of the password, username, or `postgres://` scheme — only the bare hostname and static messaging. `grep -n 'source \|^\. \|mapfile\|readarray'` across the script → no matches, confirming it never sources `.env.local`. |
| T-29-08 | Elevation of privilege | mitigate | **CLOSED** | `.env.example:35-38` restates Phase 20 locked rule 3 inline at the repoint point ("Pointing local dev at `development` does NOT create a local migration path... migrations fan out ONLY via `db-migrate.yml`"). `grep -n "db:migrate" .env.example scripts/check-local-db-branch.sh` → no matches for a literal local invocation (the only workflow reference is `db-migrate.yml`, which does not match the `db:migrate` pattern). |
| T-29-09 | Repudiation | accept | **CLOSED** (recorded below) | Same evidence as T-29-03 — `db-migrate.yml` confirmed as the sole fan-out path, byte-identical to HEAD, single `db:migrate` invocation total across `ci.yml`. Acceptance recorded in the Accepted Risks Log below. |

**Note on T-29-SC duplication:** T-29-SC appears in both 29-01-PLAN.md and 29-02-PLAN.md with identical disposition and near-identical wording ("no packages installed"). Verified as a single unique threat across both plans' combined diff (`b42c9c3~1..HEAD`), not double-counted.

---

## Open

| Threat ID | Category | Mitigation Expected | Files Searched | Why Still Open |
|-----------|----------|---------------------|-----------------|-----------------|
| T-29-06 | Information disclosure | ISOLATION-PROBE-29 empirical write-then-check test: create a uniquely named local partner, confirm it is absent from the production partners list, delete it | `.planning/phases/29-migration-safety-net/29-02-PLAN.md` (Task 2 `<how-to-verify>` step 5), `.planning/phases/29-migration-safety-net/29-02-SUMMARY.md` ("IMPORTANT — Unverified Truth / Residual Risk" section) | The plan's own mitigation-plan text deliberately specifies proof-by-write-test over proof-by-architecture-assertion. The write test was skipped by explicit user decision. Endpoint separation (confirmed) narrows the threat surface but does not satisfy the disposition as declared — Neon's copy-on-write branch isolation is asserted platform behavior, not observed in this phase. |

**Remedy:** Run the ISOLATION-PROBE-29 write-and-check manually (per 29-02-SUMMARY.md's own recommendation) — create a uniquely-named local partner, confirm absence from the production `/[adminSegment]/partners` list, then delete it — and record the result in a follow-up SUMMARY addendum or a new phase note. Alternatively, formally downgrade T-29-06's disposition to `accept` with a written justification in this file's Accepted Risks Log (Neon's documented branch-isolation architecture as the accepted basis), which would require conscious re-classification by the plan owner, not silent inheritance from the mitigate disposition as originally declared.

---

## Accepted Risks Log

| Threat ID | Disposition Rationale | Accepted By | Date |
|-----------|------------------------|--------------|------|
| T-29-03 | Ad-hoc migration application outside `db-migrate.yml` remains structurally possible (anyone with local `DATABASE_URL_MAIN` and shell access could run `db:migrate` by hand) but is unchanged risk carried forward from Phase 20 locked rule 3, which keeps an audit trail via GitHub Actions run history and a required-reviewer gate for `branch=main`. This plan introduces no new invocation path; the single-invocation count was independently re-verified. | Phase 29 plan author (pre-existing Phase 20 acceptance, restated) | 2026-08-31 |
| T-29-09 | Same rationale as T-29-03 — `db-migrate.yml` remains the single fan-out path with its audit trail intact. | Phase 29 plan author (pre-existing Phase 20 acceptance, restated) | 2026-08-31 |
| T-29-SC | No package manager installs introduced by either plan; both guards use only bash builtins + coreutils/grep/sed/awk, verified via package.json diff and script content grep. Supply-chain risk from this phase is nil by construction. | Phase 29 plan author | 2026-08-31 |

---

## Unregistered Flags

One new attack-surface item surfaced during implementation with no corresponding threat-register ID:

- **`.env.local.bak*` gitignore gap** (documented in 29-02-SUMMARY.md's "Deviations from Plan" section, commit `a9b170e`). Antoine's manual `.env.local` repoint (Task 2, T-29-05/06/07/08's human-verify checkpoint) left an untracked backup file, `.env.local.bak.20260831`, containing a live production credential, that was not matched by any existing `.gitignore` pattern (`.env.local`, `.env*.local`, `.env.*.local` all require a literal `.local` suffix; the backup ends in a date). This is adjacent to T-29-07's information-disclosure category but was not a scenario the original threat register anticipated (the register covers guard-script leakage, not backup-file leakage from the human's own edit). The executing agent self-detected and closed this gap by adding `.env.local.bak*` to `.gitignore` (verified present at `.gitignore:20`; `git check-ignore -v .env.local.bak.20260831` confirmed matching per 29-REVIEW.md). Logged here as informational per the `unregistered_flag` protocol — not a blocker, already mitigated, but the threat register should be amended in a future phase to include "local credential backup files" as an explicit component under the `.env.local` trust boundary.

---

## Recent-Fix Re-Verification (post-REVIEW-FIX commits)

Per audit instructions, the CURRENT state of the guard scripts was audited, not the SUMMARY narrative:

- `17f0691` (`\|\| true` guard on `tags=` grep pipeline, `check-migration-journal-sync.sh:35`) — present in current file; live-verified the script produces named, actionable `ERROR:` output rather than silent death (re-confirmed via the standing orphan/dangling probes above, which exercise the same code path).
- `bbc7e70` (explicit `*@*` userinfo guard, `check-local-db-branch.sh:54-62`) — present in current file; live-verified with a `DATABASE_URL` containing no userinfo segment produces the specific "no user@host segment" error rather than the misleading fallback.
- `213f09e` (exact-hostname `case` matching, `check-local-db-branch.sh:76-104`) — present in current file; confirmed each `case` arm now matches the full FQDN (`ep-polished-band-alphc576-pooler.c-3.eu-central-1.aws.neon.tech`, no trailing wildcard), closing the lookalike-domain misclassification risk the reviewer flagged.
- T-29-07 credential-leak properties re-verified against this post-fix state (see T-29-07 row above) — the new error paths added by `bbc7e70` do not introduce a leak; still only the bare hostname (or a specific guard message) reaches stdout.

---

## Summary

**Closed:** 9/10 | **Open:** 1/10 (BLOCKER)

Phase 29 should **not** be considered fully secured until T-29-06 is resolved — either by running the ISOLATION-PROBE-29 empirical write test the plan itself specified, or by a conscious, documented re-classification of the disposition from `mitigate` to `accept` with an explicit rationale added to the Accepted Risks Log above. Endpoint separation is real and independently confirmed; the specific empirical claim the plan required is not.

All other 9 threats (including the two accept-disposition repudiation threats and the supply-chain accept) are verified CLOSED against live command output, not documentation or intent — every `mitigate` threat was exercised with a synthetic negative-case probe (dead pattern, orphan file, dangling journal entry, production hostname, missing userinfo) and confirmed to fail closed with no credential leakage.

---
*Audited: 2026-08-31*
*SECURITY.md: .planning/phases/29-migration-safety-net/SECURITY.md*

---
phase: 29-migration-safety-net
plan: 02
subsystem: infra
tags: [neon, database, env, bash, gitignore, credential-hygiene]

# Dependency graph
requires:
  - phase: 29-migration-safety-net
    plan: 01
    provides: "Migration journal/SQL parity gate + db-smoke anti-rot guard (INFRA-04/06)"
provides:
  - "scripts/check-local-db-branch.sh — local-only guard naming which Neon branch DATABASE_URL resolves to, exit 1 on the production endpoint"
  - ".env.example Phase 20 routing block corrected from a permission ('any of the three pooled URLs works') to a mandate (development branch only)"
  - "Antoine's .env.local repointed from the Neon `main` (production) pooled endpoint to the `development` branch pooled endpoint"
  - ".gitignore hardened against a discovered gap: .env.local.bak* backup files were not covered by any existing .env* pattern"
affects: [30, 31, 32, 33, 34]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Local-only bash guard (SKIP: 0 exit when .env.local absent) kept out of CI by design — same house style as scripts/check-no-drizzle-push.sh"
    - "Guard scripts print only the derived hostname, never source the env file or echo the connection string"

key-files:
  created:
    - scripts/check-local-db-branch.sh
  modified:
    - .env.example
    - package.json
    - .gitignore

key-decisions:
  - "Task 2's human action (repointing .env.local) produced no repo-tracked artifact by design — the credential lives outside git. The only repo-side output of this continuation is the .gitignore hardening for the backup file Antoine's edit left behind."
  - "ISOLATION-PROBE-29 (the empirical local-write-invisible-in-production check) was explicitly SKIPPED by the user. This is recorded as an unverified truth below, not asserted as tested."
  - "Stale fork-snapshot data (development branch forked from main on 2026-05-27) — user selected option (a): accept as local test data. No purge, no follow-up item, no Neon 'Reset from parent'."

requirements-completed: [INFRA-05]

# Metrics
duration: ~10min (Task 2 continuation only; Task 1 completed in the prior session)
completed: 2026-08-31
---

# Phase 29 Plan 02: Local Neon Branch Isolation Summary

**`.env.local` repointed from the Neon `main` (production) pooled endpoint to the `development` branch endpoint, enforced going forward by `scripts/check-local-db-branch.sh`; the end-to-end write-isolation proof (ISOLATION-PROBE-29) was skipped by the user and remains unverified.**

## Performance

- **Duration:** ~10 min (this continuation — Task 1 was committed in a prior session as `9044a9d`)
- **Tasks:** 2/2 (Task 1 previously committed; Task 2 human-action resolved in this session)
- **Files modified:** 1 (`.gitignore` — this session's only repo change)

## Accomplishments

- Confirmed Task 1's guard and `.env.example` mandate are intact and passing (`b42c9c3`-lineage commit `9044a9d`, re-verified not re-executed).
- Confirmed Antoine repointed `.env.local`'s `DATABASE_URL` to the Neon `development` branch pooled endpoint. `npm run check:local-db-branch` now exits 0:
  ```
  OK: local DATABASE_URL → Neon development branch (ep-polished-band-alphc576-pooler.c-3.eu-central-1.aws.neon.tech)
  ```
  Output contains no credential (`postgres://` / `neondb_owner` both absent), matches the orchestrator's independently-reported re-run.
- Discovered and closed a credential-hygiene gap surfaced by Task 2's human action: Antoine's repoint left a pre-change backup file, `.env.local.bak.20260831`, in the working tree. Neither `.env.local` nor `.env*.local` nor `.env.*.local` in the existing `.gitignore` matches that filename (all three patterns require a literal `.local` suffix; the backup ends `.20260831`). The file was untracked and one `git add -A` away from entering history. Added `.env.local.bak*` to `.gitignore` (Rule 2 — missing critical functionality: this is a credential-disclosure gap directly adjacent to Task 2's scope). **The file itself was never opened, read, or deleted by this agent** — only the `.gitignore` pattern was added, without inspecting the backup's contents.
- Re-ran every plan-level `<verification>` step that is actually executable without opening `.env.local`: `check:no-drizzle-push`, `check:db-smoke-filter`, `check:migration-journal-sync`, `lint:check`, `typecheck`, `npm test` (1184 passed / 4 skipped), `git diff --exit-code .github/workflows/db-migrate.yml` (unchanged), and the `db:migrate` grep sweep (no local invocation found, only the `db-migrate.yml` workflow-dispatch guidance in `.env.example`).

## Task Commits

Each task was committed atomically:

1. **Task 1: Mandate the development branch in .env.example and add a local guard** - `9044a9d` (feat) — completed in a prior session, NOT re-executed here; re-verified only.
2. **Task 2 continuation: gitignore hardening for the backup file left by the repoint** - `a9b170e` (fix)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified

- `.env.example` - (Task 1, prior session) Phase 20 routing block mandates the `development` branch; stale pooling note corrected. Unmodified this session.
- `scripts/check-local-db-branch.sh` - (Task 1, prior session) Local-only guard. Unmodified this session.
- `package.json` - (Task 1, prior session) `check:local-db-branch` script registered. Unmodified this session.
- `.gitignore` - (this session) Added `.env.local.bak*` to prevent the pre-repoint backup file from ever being staged.

## Decisions Made

- Task 2 is a `checkpoint:human-verify` task whose sole action is Antoine editing `.env.local` — a file this agent is contractually forbidden from opening. Its only legitimate repo-side output was therefore the incidental `.gitignore` fix for the backup file the human action left behind; no other file changes were made for "Task 2" itself.
- Recorded Antoine's two decisions verbatim rather than interpreting them: (1) ISOLATION-PROBE-29 skipped, (2) stale fork-snapshot data accepted as-is (option a).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] `.env.local.bak*` not covered by `.gitignore`**
- **Found during:** Task 2 continuation, while confirming `git status --porcelain` showed no `.env.local` entry per the plan's Task 2 acceptance criteria.
- **Issue:** Antoine's manual repoint of `.env.local` left an untracked backup file, `.env.local.bak.20260831`, in the working tree. It is not matched by `.env.local`, `.env*.local`, or `.env.*.local` — all three require the filename to end in `.local`, and the backup ends in a date suffix. The file was one broad `git add` away from committing a Neon connection string to history.
- **Fix:** Added `.env.local.bak*` to `.gitignore`. The file's contents were never opened, read, or otherwise inspected — the fix was made purely by adding a glob pattern and confirming with `git check-ignore -v` that the backup file now matches.
- **Files modified:** `.gitignore`
- **Verification:** `git check-ignore -v .env.local.bak.20260831` → matches the new pattern; `git status --porcelain` no longer lists the backup file.
- **Committed in:** `a9b170e` (fix)

---

**Total deviations:** 1 auto-fixed (1 missing critical / credential-hygiene)
**Impact on plan:** Necessary, narrowly-scoped fix directly adjacent to Task 2's human action; no scope creep. The backup file itself is still present on disk (untracked, now ignored) — Antoine should delete it manually once he confirms it is no longer needed, since this agent will not touch it further.

## Issues Encountered

None beyond the deviation documented above.

## User Setup Required

None further — the external configuration this plan required (fetching and pasting the `development` branch's pooled connection string into `.env.local`) was completed by Antoine before this continuation began.

## IMPORTANT — Unverified Truth / Residual Risk

The plan's `must_haves.truths` list includes:

> "A write made locally does not appear in the production deployment"

**This was NOT empirically verified in this execution.** The plan's Task 2 step 5 (create partner `ISOLATION-PROBE-29` locally, confirm it is absent from the production partners list, then delete it) was explicitly skipped by the user — this was a deliberate choice, not an omission by the agent.

What IS confirmed, and what is not:

- **Confirmed:** `npm run check:local-db-branch` reports the local `DATABASE_URL` resolves to `ep-polished-band-alphc576-pooler.c-3.eu-central-1.aws.neon.tech`, which per `docs/operations/neon-branch-routing.md`'s branch/endpoint table is the Neon `development` branch (`br-tiny-hat-alk1dent`) — a distinct branch and distinct pooled endpoint from production `main` (`ep-icy-boat-alx5o1tz-pooler.c-3.eu-central-1.aws.neon.tech`, `br-frosty-poetry-ali0f4eu`).
- **NOT confirmed:** that a write against the `development` branch is actually invisible from the production deployment. Neon branches are architecturally isolated (copy-on-write forks with independent compute endpoints), so isolation logically follows from the endpoint separation above — but this was asserted by the platform's documented behavior, not observed end-to-end by an actual write-then-check probe in this phase.
- **Also accepted, not purged:** the `development` branch was forked from `main` on 2026-05-27 and very likely still carries a copy-on-write snapshot of production rows as of that date. Antoine explicitly chose option (a) — accept this as local test data, no purge, no follow-up item, no Neon "Reset from parent."

**Recommendation:** if this residual risk needs closing later, run the ISOLATION-PROBE-29 write-and-check manually (create a uniquely-named local partner, confirm it is absent from the production `/[adminSegment]/partners` list, then delete it) — a low-cost, few-minute check that would upgrade this from "isolation follows from architecture" to "isolation empirically confirmed."

### Addendum — 2026-08-31: probe attempted, blocked, risk formally accepted

The probe above was subsequently **attempted and found blocked**, then the risk was formally
accepted. Recording the outcome here so this file and `29-SECURITY.md` do not drift apart.

The attempt failed at login: `[Better Auth]: Invalid password` (×4 in the dev server log). This is
not an infrastructure fault — Better Auth reached the `development` database and rejected the
credential. The cause is the third bullet above cashing in earlier than expected: because the
branch is a copy-on-write fork snapshot taken 2026-05-27, its Better Auth credential hashes are
frozen at that date, so any password rotated since is rejected. The accepted stale-data trade-off
therefore also froze the ability to authenticate against the branch — a consequence worth noting
if option (a) is ever revisited.

Given the block, the corresponding threat **T-29-06** was consciously re-classified in
`29-SECURITY.md` from `mitigate` to `accept` by the plan owner, with the accepted basis (Neon's
documented copy-on-write branch isolation plus the two verified endpoint facts) and the residual
risk recorded in that file's Accepted Risks Log. Phase 29 security status is now
`threats_open: 0` — but T-29-06 is closed **by acceptance, not by evidence**. The truth quoted at
the top of this section remains empirically unproven.

**Upgrade path, unchanged and still cheap:** restore a `development`-branch login (`grant-admin.ts`
issues an invitation URL so a password can be set directly against that branch), then run the
probe. That would move T-29-06 from accepted-risk to empirically-closed.

## Next Phase Readiness

- `INFRA-05` is closed for the scope it actually covers — local *runtime* data isolation via endpoint separation, enforced on demand by `check:local-db-branch`. It is NOT closed on the stronger claim of an empirically-verified write-isolation proof; see the section above.
- Phase 20 locked rule 3 (migrations fan out only via `db-migrate.yml`) is unchanged — no local `db:migrate` path was introduced or documented anywhere in this plan.
- No `db-migrate.yml` dispatch was needed or run in this session.
- Phase 29 (both plans) is complete. Phase 30+ can proceed.

---
*Phase: 29-migration-safety-net*
*Completed: 2026-08-31*

## Self-Check: PASSED

All claimed files found on disk (`scripts/check-local-db-branch.sh`, this SUMMARY.md,
`.gitignore` pattern `.env.local.bak*`) and all three commits (`9044a9d`, `a9b170e`,
`49bb2f5`) found in git log. Honesty caveat stands: this PASSED status covers claims
actually made in the SUMMARY (files exist, commits exist, guard output matches) — it
does NOT assert that the end-to-end write-isolation truth was empirically verified,
which the SUMMARY explicitly records as skipped.

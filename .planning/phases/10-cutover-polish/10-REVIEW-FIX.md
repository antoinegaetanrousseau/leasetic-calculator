---
phase: 10-cutover-polish
fixed_at: 2026-05-10T22:41:00Z
review_path: .planning/phases/10-cutover-polish/10-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 10: Code Review Fix Report

**Fixed at:** 2026-05-10T22:41:00Z
**Source review:** `.planning/phases/10-cutover-polish/10-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (CR-01, CR-02, WR-01, WR-02, WR-03, WR-04, WR-05)
- Fixed: 7
- Skipped: 0

Post-fix validation: `typecheck` clean, `lint:check` clean (0 warnings), `vitest run` 399/399 passing, `next build` successful.

## Fixed Issues

### CR-01: Vercel Cron silently 401s — PURGE_CRON_SECRET vs CRON_SECRET mismatch

**Files modified:** `app/api/internal/purge-soft-deleted/route.ts`
**Commit:** df6fdae
**Applied fix:** Renamed the env var read from `process.env.PURGE_CRON_SECRET` to
`process.env.CRON_SECRET` (with an inline comment explaining it is Vercel's reserved
name). Updated the JSDoc Gate A comment accordingly. Gate logic, `timingSafeEqual`
comparison, and dual-auth pattern are unchanged.

---

### CR-02: Audit log failure miscounts a successfully-purged row as an error

**Files modified:** `src/lib/admin/purge.ts`, `scripts/purge-test-data.ts`
**Commit:** 45da28a
**Applied fix:** Split the single `try/catch` covering both the purge operation and
`writeAuditLog` into two independent blocks. In `purge.ts`, `purged += 1` is now
incremented immediately after `hardPurgeProposal` returns true, before the audit write.
`writeAuditLog` is wrapped in its own `try/catch` that logs a console warning on failure
without propagating to the error counter. In `purge-test-data.ts`, the same pattern:
`usersPurged`, `totalProposalsPurged`, and `totalBlobsDeleted` are incremented before the
audit write; `proposalIds` and `blobsDeleted` are now declared outside the try block
(`purgedProposalCount`, `purgedBlobCount`) so the audit-log block can reference them.

---

### WR-01: JSON.stringify coefficient comparison is fragile against JSONB key-order variation

**Files modified:** `app/(admin)/[adminSegment]/coefficients/page.tsx`
**Commit:** 8f8c51a
**Applied fix:** Added a `coefficientsEqual(a: Coefficients, b: Coefficients): boolean`
helper at module scope that compares all 12 leaf string values (t1..t4 × 36/48/60) directly.
Replaced the `JSON.stringify(a) === JSON.stringify(b)` expression in `isStillSeed` with
`coefficientsEqual(latestParams.coefficients as Coefficients, seedParams.coefficients)`.
Added `import type { Coefficients }` from `@/lib/calc/coefficients`.

---

### WR-02: purge:soft-deleted:dry npm script is identical to purge:soft-deleted

**Files modified:** `package.json`
**Commit:** 5cc5490
**Applied fix:** Prepended `CONFIRM= ` to the `:dry` npm script to actively unset the
`CONFIRM` env var before invoking the script. This ensures dry-run-by-default behavior
holds regardless of what the caller has set in their shell, defeating the foot-gun where
a prior `CONFIRM=PURGE-SOFT-DELETED` session variable would cause the `:dry` alias to
execute a live purge.

---

### WR-03: grep -rEnF uses mutually exclusive flags

**Files modified:** `scripts/check-no-v10-localstorage.sh`
**Commit:** cf6f841
**Applied fix:** Removed the `-E` flag (extended regex) from `grep -rEnF`, leaving
`grep -rnF` (fixed strings + recursive + line numbers). Added an inline comment above
the grep invocation explaining that all five v10 key patterns are literals and `-F` is
the correct and intentional choice, so future maintainers do not re-add `-E` expecting
regex support.

---

### WR-04: smoke-ovh.ts assumes admin language is fr — step 4 fails if DB has en

**Files modified:** `scripts/smoke-ovh.ts`
**Commit:** ea5ed46
**Applied fix:** Replaced the single `expectedSha256` (hard-coded to `happy-path-fr`)
with two nullable variables `expectedSha256Fr` and `expectedSha256En`, both loaded from
`expected.sha256.txt` (which already contains both entries). Step 4 now passes if the
actual SHA-256 matches either the `fr` or the `en` fixture hash. The dry-run output
shows both hashes with context. The failure message distinguishes a language-mismatch
cause from a true byte-determinism regression.

---

### WR-05: .env.example missing CRON_SECRET guidance

**Files modified:** `.env.example`, `docs/operations/deploy-ovh.md`
**Commit:** 65383af
**Applied fix:** Renamed `PURGE_CRON_SECRET=` to `CRON_SECRET=` in `.env.example` and
replaced its comment with a detailed block explaining: (a) Vercel requires this exact
reserved name for cron auto-injection; (b) OVH must also set `CRON_SECRET` and pass it
manually as a Bearer header in crontab/systemd. Updated all `PURGE_CRON_SECRET`
references in `docs/operations/deploy-ovh.md` (Locked Rules §4, Prerequisites,
Configuration block, Cron Setup Option A/B, final checklist) to `CRON_SECRET`. Verified
no remaining `PURGE_CRON_SECRET` references outside the `.planning/` directory.

---

_Fixed: 2026-05-10T22:41:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

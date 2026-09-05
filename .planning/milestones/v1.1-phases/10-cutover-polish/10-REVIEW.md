---
phase: 10-cutover-polish
reviewed: 2026-05-10T00:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - .env.example
  - .github/workflows/ci.yml
  - app/(admin)/[adminSegment]/coefficients/SeedBanner.tsx
  - app/(admin)/[adminSegment]/coefficients/page.tsx
  - app/api/internal/purge-soft-deleted/route.ts
  - app/globals.css
  - docs/legal/privacy-coverage-confirmation.md
  - docs/operations/deploy-ovh.md
  - docs/operations/launch-checklist.md
  - package.json
  - scripts/check-no-v10-localstorage.sh
  - scripts/purge-soft-deleted.ts
  - scripts/purge-test-data.ts
  - scripts/seed-partner-launch.ts
  - scripts/smoke-ovh.ts
  - src/components/LoginForm.tsx
  - src/lib/admin/purge.ts
  - src/lib/calc/seed-params.ts
  - src/lib/db/queries/audit-log.ts
  - src/lib/i18n/dictionaries.ts
findings:
  critical: 2
  warning: 5
  info: 2
  total: 9
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-05-10
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Phase 10 delivers the scheduled soft-delete purge cron, pre-launch test-data scrub, OVH
portability runbook and smoke script, coefficient verification banner, privacy link, and launch
checklist. The dual-auth route pattern (`timingSafeEqual`, never-logged secret) and typed-confirmation
gates on destructive scripts are correctly implemented. The audit log schema, email-pattern
discriminator, and `SeedBanner` comparison logic are sound. Two blockers were found: the Vercel Cron
integration is broken by an env-var name mismatch that causes every scheduled invocation to return
401 silently, and a purge error-counting bug in `src/lib/admin/purge.ts` misclassifies
successfully-deleted rows as failures when the audit log write throws. Five warnings and two
info items are also recorded below.

---

## Critical Issues

### CR-01: Vercel Cron silently 401s — PURGE_CRON_SECRET vs CRON_SECRET mismatch

**File:** `app/api/internal/purge-soft-deleted/route.ts:29` and `vercel.json:5`

**Issue:** Vercel Cron auto-injects `Authorization: Bearer <value>` using exactly the env var
named `CRON_SECRET` (Vercel's reserved name). The route reads `process.env.PURGE_CRON_SECRET`.
`vercel.json` supports no custom headers on cron entries. Result: every scheduled invocation
arrives without a valid Bearer token, Gate A fails (`hasCronSecret = false`), Gate B fails (no
session cookie from cron), the route returns 401, and — because v1.1 defers alerting (CUT-07) —
the failure is invisible unless the operator manually checks Vercel logs. The cron as shipped
provides zero purge coverage on Vercel.

**Fix:** Two options:

Option A (minimal change — rename the env var the route reads):
```typescript
// route.ts line 29 — change PURGE_CRON_SECRET to CRON_SECRET
const cronSecret = process.env.CRON_SECRET ?? '';
```
Then update `.env.example`, `docs/operations/deploy-ovh.md` (OVH side still sets it manually as
`Authorization: Bearer $CRON_SECRET`), and set `CRON_SECRET=<secret>` in the Vercel dashboard.

Option B (keep PURGE_CRON_SECRET; add CRON_SECRET alias):
Set `CRON_SECRET` in Vercel dashboard to the same value as `PURGE_CRON_SECRET`, and document
in `.env.example` that both must be set to the same value for Vercel Cron to work. Add a comment
in `route.ts` explaining the aliasing.

Either option must be accompanied by a launch checklist update (step 1 or a new step) so the
operator knows to verify: `curl -X POST -H "Authorization: Bearer $CRON_SECRET"
https://<deployment>/api/internal/purge-soft-deleted` returns `{"purged":0,"errors":0}` (not 401).

---

### CR-02: Audit log failure miscounts a successfully-purged row as an error in `purgeSoftDeleted`

**File:** `src/lib/admin/purge.ts:40-63`

**Issue:** The try/catch covers blob delete, `hardPurgeProposal`, and `writeAuditLog` as a single
block. If `hardPurgeProposal` succeeds (the row is permanently removed from the DB) but
`writeAuditLog` subsequently throws (transient DB connection error, constraint violation, etc.),
the catch fires, pushes to `errors[]`, and does NOT increment `purged`. The caller (HTTP route,
line 77-78 in `route.ts`) sees `purged=0, errors=1` and may return 500 to Vercel Cron, even
though the row was successfully deleted. The audit trail is silent on a completed purge, and the
misleading `errors` count causes the CLI (`purge-soft-deleted.ts`) to exit 1 and log a spurious
"re-run to retry" message for a row that no longer exists. On the next run, `listPurgeCandidates`
returns no row for the now-deleted proposal — the "error" is silently swallowed and never retried,
making the audit gap permanent.

The same issue exists in `scripts/purge-test-data.ts:131-204` (outer try/catch covers both the
cascade deletes and `writeAuditLog`): if `writeAuditLog` throws after all six cascade-delete
statements succeed, the user is deleted but counted as `usersFailed`.

**Fix for `src/lib/admin/purge.ts`:**
```typescript
for (const row of candidates) {
  try {
    if (row.pdfBlobKey) {
      await storage().delete(row.pdfBlobKey);
    }
    const deleted = await hardPurgeProposal(row.id);
    if (!deleted) {
      continue; // race condition — already purged
    }
    purged += 1; // count the purge BEFORE the audit write
  } catch (err) {
    errors.push({ id: row.id, error: err instanceof Error ? err.message : String(err) });
    continue;
  }
  // Audit log write is best-effort: failure here does NOT undo the purge.
  try {
    await writeAuditLog({
      actorId,
      action: 'proposal.purge',
      targetType: 'proposal',
      targetId: row.id,
      payload: {
        lcRef: row.lcRef,
        deletedAt: row.deletedAt?.toISOString() ?? null,
        blobKey: row.pdfBlobKey ?? null,
      },
    });
  } catch (auditErr) {
    console.error(
      `[purgeSoftDeleted] audit log write failed for proposal ${row.id}:`,
      auditErr instanceof Error ? auditErr.message : String(auditErr),
    );
  }
}
```

Apply the same pattern in `scripts/purge-test-data.ts`: increment `usersPurged` after the user
row is deleted, then wrap `writeAuditLog` in a separate best-effort try/catch.

---

## Warnings

### WR-01: `JSON.stringify` coefficient comparison is fragile against JSONB key-order variation

**File:** `app/(admin)/[adminSegment]/coefficients/page.tsx:48-49`

**Issue:** `isStillSeed` is computed as:
```typescript
JSON.stringify(latestParams.coefficients) === JSON.stringify(seedParams.coefficients)
```
The `seedParams.coefficients` object has keys `{t1, t2, t3, t4}` each with `{36, 48, 60}`,
inserted in that order. The PostgreSQL JSONB type stores objects as parsed trees — it normalizes
key order (sorted lexicographically by key name at storage time). When Drizzle reads the JSONB
column back and JSON.parse deserializes it, V8 restores insertion order from the parsed
representation, which for integer-like keys (`36`, `48`, `60`) V8 sorts numerically before
string keys. The seedParams constant defines `36`, `48`, `60` as numeric-index keys in the same
order, so the round-trip is currently stable. However, this is an implicit dependency on JSONB
normalization behavior, V8's object key ordering rules for integer-like keys, and the fact that
no future migration changes the serialization shape. A spurious false-negative (banner stuck
permanently visible even after a legitimate save) would occur if a future schema migration
reorders JSONB keys, or if the coefficients object is reconstructed with a different insertion
order by the editor's `save` action before being re-read.

**Fix:** Perform the comparison at the leaf value level rather than relying on `JSON.stringify`:
```typescript
// server-side deep equality on leaf numeric values — immune to key-order drift
function coefficientsEqual(a: Coefficients, b: Coefficients): boolean {
  const tranches = ['t1', 't2', 't3', 't4'] as const;
  const durations = [36, 48, 60] as const;
  return tranches.every((t) =>
    durations.every((d) => a[t]?.[d] === b[t]?.[d])
  );
}
const isStillSeed = coefficientsEqual(latestParams.coefficients, seedParams.coefficients);
```

---

### WR-02: `purge:soft-deleted:dry` npm script is identical to `purge:soft-deleted` — silent foot-gun

**File:** `package.json:24-25`

**Issue:** Both scripts run exactly:
```
tsx -r ./scripts/_preload-mock-server-only.cjs scripts/purge-soft-deleted.ts
```
Neither passes `--dry-run` or any flag. The dry-run behaviour is implicit (absence of
`--confirm PURGE-SOFT-DELETED`). An operator who runs `npm run purge:soft-deleted:dry` with
`CONFIRM=PURGE-SOFT-DELETED` already set in their shell (e.g., from a previous apply run)
will execute a live purge, falsely believing the `:dry` variant prevents it. The `:dry` alias
provides false safety assurance.

**Fix:** Either remove the `:dry` alias (document the default-dry-run behavior in the script
header, which already does so), or make the alias explicitly enforce dry-run:
```json
"purge:soft-deleted:dry": "tsx -r ./scripts/_preload-mock-server-only.cjs scripts/purge-soft-deleted.ts --dry-run-only"
```
and add a `--dry-run-only` flag check in the script that overrides `CONFIRM` env var.

---

### WR-03: `grep -rEnF` uses mutually exclusive flags — CI behaviour depends on platform

**File:** `scripts/check-no-v10-localstorage.sh:43`

**Issue:** The grep invocation combines `-E` (extended regex) and `-F` (fixed strings). These
flags are mutually exclusive; in GNU grep (used on the `ubuntu-24.04` CI runner), when both are
specified, the last one wins — here `-F` wins because the combined flag `-EnF` processes left to
right, so the patterns are treated as fixed strings, which is the correct behaviour for these
literal key names. However, the `-E` flag is misleading noise and the interaction is
implementation-defined. On BSD grep (macOS), the behaviour differs. The script is fragile to
any future maintainer adding a regex-style pattern (e.g., `lt_p.*`) expecting `-E` to activate;
`-F` would silently treat it as a literal and miss matches.

**Fix:** Remove the redundant `-E` flag since all five patterns are fixed strings:
```bash
grep -rnF \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' --include='*.cjs' \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=drizzle --exclude-dir=dist \
  "$p" "${SEARCH_PATHS[@]}" 2>/dev/null \
```

---

### WR-04: `smoke-ovh.ts` assumes admin language is `fr` — step 4 will fail if admin's DB language is `en`

**File:** `scripts/smoke-ovh.ts:168-177`

**Issue:** Step 4 asserts the PDF SHA-256 against the `happy-path-fr` fixture entry. The
comment at line 169 says "Better Auth defaults to 'fr' for this deployment." This assumption is
not enforced — it depends on the admin account seeded in the target DB having `language='fr'`.
If the admin account was seeded with `language='en'`, or if the `language` column defaults to
`null` and the proposal PDF is generated in English, step 4 will fail with a SHA-256 mismatch
and the operator will be misled into thinking there is a byte-determinism regression rather than
a language configuration issue.

**Fix:** Either: (a) explicitly set a `lang` header or query param when posting to
`/api/proposals` in step 3 so the PDF language is fixed regardless of account preference; or (b)
check both `happy-path-fr` and `happy-path-en` hashes against the actual SHA-256 (try both, pass
if either matches). Document which account language is required for the smoke to pass.

---

### WR-05: `.env.example` has no note that Vercel requires `CRON_SECRET` in addition to `PURGE_CRON_SECRET`

**File:** `.env.example:83-89`

**Issue:** This is the operational consequence of CR-01. Even after fixing the code (`route.ts`
reading `CRON_SECRET`), the `.env.example` comment block documents only `PURGE_CRON_SECRET`.
An operator setting up the Vercel environment for the first time will correctly set
`PURGE_CRON_SECRET` but not know to also set `CRON_SECRET` (Vercel's reserved env var that it
injects into cron invocations). This will cause silent cron failures until the operator discovers
the discrepancy from Vercel logs.

**Fix (contingent on CR-01 resolution):** Update the `PURGE_CRON_SECRET` comment block in
`.env.example` to document that on Vercel, the env var must also be registered as `CRON_SECRET`
(or the route must be changed to read the Vercel-reserved name). Example:
```
# PURGE_CRON_SECRET (D-10-05/07): shared secret for unattended invocation.
# On Vercel: set CRON_SECRET=<same value> in Vercel Project Settings → Environment Variables
#   (Vercel injects Authorization: Bearer <CRON_SECRET> for cron jobs — not PURGE_CRON_SECRET).
# On OVH: crontab sends Authorization: Bearer $PURGE_CRON_SECRET manually.
PURGE_CRON_SECRET=
```

---

## Info

### IN-01: `seed-partner-launch.ts` has no `npm run` script entry — invocation relies on `npx tsx` directly

**File:** `package.json` (absent entry), `scripts/seed-partner-launch.ts:22-24`

**Issue:** Every other operational script (`purge:soft-deleted`, `purge:test-data`, `smoke:ovh`,
`grant:admin`) is wired into `package.json` `scripts`. `seed-partner-launch.ts` is invoked with
`npx tsx scripts/seed-partner-launch.ts <email>` directly. The script uses `import 'dotenv/config'`
at line 39 and lazy imports at lines 135-137, which rely on the same `_preload-mock-server-only.cjs`
preload that other scripts use (to mock `server-only`). Without the `-r ./scripts/_preload-mock-server-only.cjs`
preload, the script will fail at the lazy `import('../src/lib/db/index')` if that module's
transitive imports include `server-only`. The script header documents `npx tsx ...` without the
preload flag.

**Fix:** Add an npm script entry consistent with the other scripts:
```json
"seed:partner": "tsx -r ./scripts/_preload-mock-server-only.cjs scripts/seed-partner-launch.ts"
```
Update the script's usage comment to reference `npm run seed:partner`.

---

### IN-02: `launch-checklist.md` step 9 mentions `seed-partner-launch.ts` for non-test use

**File:** `docs/operations/launch-checklist.md:86-87`

**Issue:** Step 9 says: "Includes the invitation URL for each partner (generate via admin UI or
`scripts/seed-partner-launch.ts` **for test accounts only**)." The parenthetical clarification is
present, but naming the test-only script in the context of batch-onboarding production partners
is confusing and may lead an operator to use it for production partners by mistake. The script
correctly refuses non-`@test.leasetic.com` emails (Gate 0), so there is no security risk, but
the UX is confusing and the refusal message at exit code 2 could alarm an operator during a
time-pressured launch day.

**Fix:** Remove the mention of `seed-partner-launch.ts` from step 9. Production partner
onboarding is exclusively via the admin UI invitation flow; the test-only script need not appear
in the batch-onboard section.

---

_Reviewed: 2026-05-10_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

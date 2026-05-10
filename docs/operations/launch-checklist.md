# Launch Checklist — v1.1 Pre-launch + Pilot + Batch-onboard

Antoine ticks each box in order. This file is committed in its checked state on launch day as the
audit artifact (D-10-19). If a step is skipped or deferred, document the reason in the commit
message rather than ticking the box.

## Pre-launch

- [ ] **1.** Apply migrations 0002 + 0003 to production. Run from the Actions tab on GitHub:
  ```bash
  gh workflow run db-migrate.yml --field confirm="MIGRATE PROD"
  ```
  Approve the `production` environment gate when prompted. Verify:
  ```bash
  psql $DATABASE_URL_PROD -c "\dt"
  ```
  Expected: 7+ tables including `global_params`, `audit_log`. Migration is idempotent — safe to
  re-run if the first attempt times out.

- [ ] **2.** Verify production `/healthz` returns `{db: ok, blob: ok}`.
  ```bash
  curl -s https://matrice.leasetic.fr/healthz | jq .
  ```
  Expected output: `{ "db": "ok", "blob": "ok" }`. If `"db": "error"` → check `DATABASE_URL`
  Vercel env + Neon connection pool. If `"blob": "error"` → check `BLOB_READ_WRITE_TOKEN` Vercel
  env. Do not proceed until both are green.

- [ ] **3.** Admin login at `https://matrice.leasetic.fr/${ADMIN_URL_SEGMENT}`, navigate to
  Coefficients. Confirm the yellow "Vérifier les coefficients" SeedBanner is visible (D-10-13/14)
  — this confirms the admin is still on placeholder D-D1 values from the seed migration. Customize
  coefficients, commission rate, and max threshold to Leasétic's actual values. Save. Confirm the
  banner disappears after save.
  Verify row inserted:
  ```bash
  psql $DATABASE_URL_PROD -c "SELECT id, effective_from FROM global_params ORDER BY effective_from DESC LIMIT 2"
  ```
  Expected: 2 rows — the seed row (2025-01-01) + the new customized row (today).

- [ ] **4.** Seed 2-3 pilot partners via the regular invitation flow (NOT `scripts/seed-partner-launch.ts`
  which is for `@test.leasetic.com` test accounts only — D-10-10). Use the admin UI at
  `/${ADMIN_URL_SEGMENT}/accounts` → Invite Partner. Thomas provides the pilot partner email
  addresses. Partners receive the invitation link, set their password, and can log in immediately.

- [ ] **5.** Confirm Thomas's privacy-coverage signoff at
  `docs/legal/privacy-coverage-confirmation.md`. The `## Response` section MUST be filled in with
  Thomas's verbatim reply and a confirmed date before any partner is onboarded. If Thomas replies
  "needs counsel review" (Open Q3), STOP — launch path adjusts. Do not onboard partners until
  this is resolved.

- [ ] **6.** Send pilot partner comms. Antoine drafts and sends directly. Thomas reviews tone if
  needed. Email content: invitation URL flow, password setup steps, "Leasétic Matrice has moved
  to a hosted version" framing. v10 remains accessible (partners have the HTML file) during pilot
  — pilot partners are explicit early adopters (D-10-20).

## Pilot observation (1-2 weeks)

- [ ] **7.** Daily spot-checks during the 1-2 week pilot window. Verify:
  - `/healthz` still green: `curl -s https://matrice.leasetic.fr/healthz | jq .`
  - Vercel logs: no 5xx spike, no auth errors
  - Audit log row counts growing as expected:
    ```bash
    psql $DATABASE_URL_PROD -c "SELECT action, count(*) FROM audit_log GROUP BY action ORDER BY count DESC"
    ```
  - Soft-delete activity: `psql $DATABASE_URL_PROD -c "SELECT count(*) FROM proposals WHERE deleted_at IS NOT NULL"`
  - v10 file stays accessible (file in partners' possession) — no action needed.

## Batch-onboard

- [ ] **8.** Post-pilot: scrub any test partner accounts created during pilot debugging.
  ```bash
  # Dry-run first — inspect candidates
  DATABASE_URL=$DATABASE_URL_PROD STORAGE_DRIVER=vercel \
  BLOB_READ_WRITE_TOKEN=$BLOB_READ_WRITE_TOKEN \
    npm run purge:test-data

  # Apply when candidates look correct
  DATABASE_URL=$DATABASE_URL_PROD STORAGE_DRIVER=vercel \
  BLOB_READ_WRITE_TOKEN=$BLOB_READ_WRITE_TOKEN \
  CONFIRM=PURGE-TEST-DATA \
    npm run purge:test-data
  ```
  Predicate: `LIKE '%@test.leasetic.com'`. Cascade: blob → proposals → sessions → accounts →
  users. Per-user audit log entry written (action: `user.purge`). See 10-03 for cascade details.

- [ ] **9.** Send batch-onboard email to remaining channel partners. Antoine sends directly.
  Same framing as step 6 but without the "pilot" qualifier. Includes the invitation URL for
  each partner (generate via admin UI or `scripts/seed-partner-launch.ts` for test accounts only).

## Notes & vacuous resolutions

- **CUT-02 — Resolved vacuously.** v10 was never deployed at a hosted URL — partners received it
  as an emailed HTML file (D-10-15). CUT-02's "redirect old hosted URL to new" requirement is moot.
  There is no v10 hosted URL to redirect from. See also `.planning/PROJECT.md`.

- **CUT-01 — Communicated, not technically enforced.** v10 retirement is carried by partner comms
  (steps 6 + 9 above). Antoine tells partners to use v1.1 going forward. v10 file remains in their
  possession — no technical kill-switch.

- **CUT-03 — Defended by CI.** v1.1 has no v10 localStorage read paths (Phase 6 clean-slate flow).
  `scripts/check-no-v10-localstorage.sh` runs in CI on every PR — catches accidental future
  regressions. See `.github/workflows/ci.yml`.

---

*Last updated: 2026-05-10 (Phase 10 plan 10-06). Antoine commits this file in its checked state on launch day.*

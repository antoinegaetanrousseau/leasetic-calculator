# OVH Deployment Runbook — Phase 10 / September 2026 Target

v1.1 ships on Vercel. September 2026 lands the same git ref on OVH. The portability invariant
(D-10-01/04): `lib/storage` and `lib/db` already abstract over every hosting primitive — the OVH
cutover is an env-var-only swap, no code changes. This runbook is the frame; September fills in
the provider-specific blanks.

See `docs/operations/launch-checklist.md` for the pre-launch operator checklist (the 9 steps
Antoine ticks off before announcing v1.1 to partners).

## Locked rules

1. **Adapter discipline (BOOT-05).** `lib/storage` and `lib/db` are the only surfaces that touch
   Vercel Blob, Neon, or any OVH equivalent. App routes, scripts, and server actions use the
   adapter interfaces only. CI grep gate (`check:no-vercel-imports`) enforces this on every PR.
   OVH cutover swaps `STORAGE_DRIVER`, `DATABASE_URL`, and S3 credentials — zero source changes.

2. **No automated rollback — forward-only.** Same as DB migrations (see `docs/operations/migrations.md`).
   If OVH smoke fails, DNS reverts to Vercel and a fix is deployed. OVH and Vercel/Neon remain
   separate databases — there is no automatic data sync between them during the transition window.

3. **Smoke script is the proof.** `npm run smoke:ovh` (D-10-02/03) is the FIRST thing run against
   the OVH target post-provisioning, before announcing to partners. If `smoke:ovh` fails on OVH,
   the cutover is blocked. A passing smoke on OVH is the portability proof (CUT-09).

4. **OVH-side cron replaces Vercel Cron.** `vercel.json`'s twice-monthly purge schedule
   (D-10-05/06) doesn't apply on OVH. Wire the same `/api/internal/purge-soft-deleted` endpoint
   to an OVH-side scheduler using `Authorization: Bearer ${CRON_SECRET}`. See
   `## Cron Setup` below.

## Lifecycle

```
TODAY (Vercel/Neon)              SEPTEMBER: provisioning          CUTOVER DAY
────────────────────             ──────────────────────────       ──────────────────────────
git ref: v1.1.x                  git clone + checkout v1.1.x      DNS: matrice.leasetic.fr
Vercel hosts the app             npm ci + npm run build               → OVH IP
Neon hosts the DB                OVH DB provisioned                announce to partners
Vercel Blob holds PDFs           OVH Blob bucket created
Vercel Cron fires purge          Migrations applied locally
                                 npm run smoke:ovh (7/7 green)
                                 Cron wired on OVH side
                                 Pilot 1-2 weeks on OVH
                                 Batch-onboard on OVH
```

## Prerequisites

Before beginning provisioning in September:

- **Open Q5 resolved.** Provider choice (OVH Managed PG, Scaleway Postgres, self-host) confirmed
  with Leasétic IT. Specific CLI invocations depend on this choice — they are TBD in this runbook
  and will be filled in before September (see `## Provisioning` below).
- **S3-compatible blob provider chosen.** OVH Object Storage or Scaleway Object Storage both
  expose an S3-compatible endpoint. Credentials: `accessKeyId`, `secretAccessKey`, `endpoint`,
  `bucketName`.
- **Domain + TLS plan.** DNS for `matrice.leasetic.fr` controlled by Leasétic IT. TLS termination
  plan (OVH CDN, nginx with Certbot, or managed endpoint) decided before cutover.
- **Secrets generated.** Run before provisioning:
  ```bash
  openssl rand -hex 32  # AUTH_SECRET
  openssl rand -hex 32  # CRON_SECRET (Vercel's reserved name; same value on OVH)
  openssl rand -hex 16  # ADMIN_URL_SEGMENT (e.g. "a8f3c2e1d9b4f0a7")
  ```
  Store in a password manager — never commit.
- **Privacy URLs finalized with Thomas (D-10-17/18).** `NEXT_PUBLIC_PRIVACY_URL_FR` and
  `NEXT_PUBLIC_PRIVACY_URL_EN` confirmed before build. Thomas's coverage confirmation filed at
  `docs/legal/privacy-coverage-confirmation.md`.

## Provisioning

### Postgres

Three candidate providers — exact commands TBD before September per D-10-04:

| Provider | Approach | Command |
|----------|----------|---------|
| OVH Managed PG | Managed PaaS, standard `postgres://` URL | `(TBD; OVH CLI command before September)` |
| Scaleway | Managed Postgres, S3-compat storage | `(TBD; Scaleway CLI command before September)` |
| Self-host | Postgres 15+ on OVH VPS | `apt install postgresql-15` + config |

After provisioning, record the `DATABASE_URL` (pooled) and `DIRECT_URL` (direct connection for
migrations). The app runtime uses the pooled URL; `npm run db:migrate` uses the direct URL.

### Blob storage

S3-compatible object store. OVH Object Storage and Scaleway Object Storage both work with
`STORAGE_DRIVER=s3`. Required credentials:

```bash
AWS_ACCESS_KEY_ID=<access-key>
AWS_SECRET_ACCESS_KEY=<secret-key>
AWS_S3_BUCKET=<bucket-name>
AWS_S3_ENDPOINT=https://<provider-s3-endpoint>   # e.g., s3.de-muc.perf.cloud.ovh.net
AWS_S3_REGION=<region>                            # e.g., de
```

Bucket must be in an EU region (data residency). Set bucket ACL to private; presigned URL
access is handled by `src/lib/storage/s3.ts`.

### Node host

OVH VPS or Dedicated Server running Node.js 22+. The app outputs a Next.js standalone bundle
(`node .next/standalone/server.js`) — no Vercel runtime required.

Reverse-proxy nginx → localhost:3000 with TLS termination. systemd service unit for the Node process.

## Configuration

All env vars at runtime. Cross-reference `.env.example` (the canonical inventory).

```bash
# === Core ===
# App base URL — must match the public hostname.
APP_URL=https://matrice.leasetic.fr
NEXT_PUBLIC_APP_URL=https://matrice.leasetic.fr

# === DB (BOOT-09) ===
# Pooled connection for app runtime; direct for migrations.
DATABASE_URL=postgres://<user>:<password>@<ovh-pg-host>:5432/<db>?sslmode=require
DIRECT_URL=postgres://<user>:<password>@<ovh-pg-host-direct>:5432/<db>?sslmode=require

# === Blob storage (BOOT-04 / BOOT-05) ===
STORAGE_DRIVER=s3
AWS_ACCESS_KEY_ID=<access-key>
AWS_SECRET_ACCESS_KEY=<secret-key>
AWS_S3_BUCKET=leasetic-matrice-pdfs
AWS_S3_ENDPOINT=https://<provider-s3-endpoint>
AWS_S3_REGION=<region>

# === Auth (Phase 6) ===
AUTH_SECRET=<openssl rand -hex 32>
ADMIN_URL_SEGMENT=<openssl rand -hex 16>

# === Phase 10 (D-10-05/17) ===
# Privacy policy URLs — supplied by Thomas. No code change to update.
NEXT_PUBLIC_PRIVACY_URL_FR=https://leasetic.fr/mentions-legales
NEXT_PUBLIC_PRIVACY_URL_EN=https://leasetic.fr/privacy-policy
# Cron secret — the route reads CRON_SECRET (Vercel's reserved env var name).
# On OVH, set CRON_SECRET and inject it manually via crontab/systemd (see ## Cron Setup).
# Generate: openssl rand -hex 32. Production scope only.
CRON_SECRET=<openssl rand -hex 32>
```

## Build & Deploy

```bash
# Clone the release ref
git clone https://github.com/<org>/leasetic-matrice.git
git checkout v1.1.<release-tag>

# Install and build (set env vars from Configuration section first)
npm ci
npm run build
# Output: .next/standalone/ (self-contained Node bundle)

# Run (OVH VPS — systemd service or screen session for initial smoke)
node .next/standalone/server.js
# Reverse-proxy nginx → localhost:3000
```

systemd unit template (`/etc/systemd/system/leasetic-matrice.service`):
```ini
[Unit]
Description=Leasetic Matrice v1.1
After=network.target

[Service]
Type=simple
WorkingDirectory=/srv/leasetic-matrice
ExecStart=/usr/bin/node .next/standalone/server.js
Restart=on-failure
RestartSec=5
EnvironmentFile=/srv/leasetic-matrice/.env.production
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable: `systemctl enable --now leasetic-matrice`.

## Migration Application

Apply migrations from your local workstation (same as the Phase 5 pattern — no GitHub Actions
required for OVH if the Actions workflow isn't pointed at OVH yet):

```bash
DATABASE_URL=<ovh-direct-postgres-url> \
DIRECT_URL=<ovh-direct-postgres-url> \
  npm run db:migrate -- --confirm "MIGRATE PROD"
```

Expected output: each migration file logged as applied. Final line: "All migrations applied."

Subsequent migrations: re-point `.github/workflows/db-migrate.yml`'s `DATABASE_URL_PROD` secret
at the OVH direct URL, then trigger via `gh workflow run db-migrate.yml`.

Verify: `psql $DATABASE_URL -c "\dt"` — should list all 6+ tables (users, proposals, global_params,
audit_log, sessions, accounts, password_resets, ...).

## Smoke Test

Run `scripts/smoke-ovh.ts` against the OVH target immediately after provisioning and migration
application. This is the CUT-09 portability proof (D-10-02/03).

```bash
APP_URL=https://matrice.leasetic.fr \
ADMIN_EMAIL=<seeded-admin-email> \
ADMIN_PASSWORD=<seeded-admin-password> \
CONFIRM=SMOKE-OVH \
  npm run smoke:ovh
```

The script exercises the full 7-step proposal lifecycle:

| Step | Endpoint | Assertion |
|------|----------|-----------|
| 1 | GET /healthz | `{ db: ok, blob: ok }` |
| 2 | POST /api/auth/sign-in/email | 200 + session cookie |
| 3 | POST /api/proposals | `{ id, pdfUrl, idempotent }` |
| 4 | GET /api/proposals/{id}/pdf | `X-Content-SHA256` matches committed `happy-path-fr` hash |
| 5 | POST /api/proposals/{id}/delete | `{ ok: true }` |
| 6 | POST /api/proposals/{id}/restore | `{ ok: true }` |
| 7 | POST /api/proposals/{id}/delete | `{ ok: true }` (cleanup) |

Expected terminal output: 7 `[ok]` lines + `OVH-portability: PROVEN`.

**PDF SHA-256 drift = catastrophic, BLOCKS cutover.** Step 4 fails if coefficients were
customized on OVH (different from the seeded fixture values). If drift occurs, either:
- Restore the OVH DB to seed-params state, OR
- Update the fixture: `npm run pdf:update-fixture -- --confirm UPDATE-FIXTURE` and re-commit
  `__pdf-fixtures__/expected.sha256.txt` before cutover.

The same `npm run smoke:ovh` command runs against the current Vercel deployment today as a
sanity check that the script itself works (D-10-03). Run it before September with `APP_URL`
pointing at Vercel to prove the script is healthy.

## Cron Setup (replaces Vercel Cron)

`vercel.json`'s cron schedule (`0 3 1,15 * *`) triggers `POST /api/internal/purge-soft-deleted`
on Vercel automatically. On OVH, you wire the same HTTP call using OVH-side scheduling.

**Option A — cron job** (simplest for a VPS):

```bash
crontab -e
```

Add:
```cron
0 3 1,15 * * curl -s -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://matrice.leasetic.fr/api/internal/purge-soft-deleted \
  >> /var/log/leasetic-purge.log 2>&1
```

Set `CRON_SECRET` in the crontab environment (`CRON_SECRET=<value>` above the job
line) or via `/etc/environment`. Never hardcode the literal value in the crontab.

After wiring, fire a manual test: `curl -s -X POST -H "Authorization: Bearer <secret>" https://matrice.leasetic.fr/api/internal/purge-soft-deleted` → expected `{ "purged": 0, "errors": 0 }` (no candidates if DB is freshly provisioned).

**Option B — systemd timer** (more robust restart semantics):

`/etc/systemd/system/leasetic-purge.service`:
```ini
[Unit]
Description=Leasetic Matrice — soft-delete purge

[Service]
Type=oneshot
ExecStart=/usr/bin/curl -s -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  https://matrice.leasetic.fr/api/internal/purge-soft-deleted
```

`/etc/systemd/system/leasetic-purge.timer`:
```ini
[Unit]
Description=Leasetic purge — twice monthly at 03:00 UTC

[Timer]
OnCalendar=*-*-1,15 03:00:00 UTC
Persistent=true

[Install]
WantedBy=timers.target
```

Enable: `systemctl enable --now leasetic-purge.timer`.
Verify: `systemctl list-timers leasetic-purge.timer`.

**Option C — OVH Cloud Scheduler:** TBD before September. OVH Cloud Scheduler can invoke a URL
on a cron schedule. Same `Authorization: Bearer` header approach applies.

## Rollback

OVH cutover is **forward-only**. There is no automated rollback.

If OVH smoke fails (any of 7 steps red): DNS reverts to Vercel. Partners notice nothing.

```bash
# DNS revert — matrice.leasetic.fr CNAME or A record back to Vercel
# TBD: exact DNS command depends on Leasétic IT DNS provider
```

**Critical:** OVH and Vercel/Neon are SEPARATE databases during the transition window. Any partner
data written to OVH during the brief transition window must be reconciled manually before declaring
OVH the primary. Mitigation: keep the transition window < 24 hours, verified clean by smoke,
before flipping DNS.

Don't cut over until smoke passes + 1-week OVH pilot with a single trusted partner.

## Smoke Test Failure Diagnosis

| Mode | Symptom | Recovery |
|------|---------|----------|
| Step 1 FAIL — healthz down | `{ db: "error" }` or `{ blob: "error" }` or ECONNREFUSED | Check OVH DB + blob credentials in `.env.production`; verify DB migrations applied; verify blob bucket ACL |
| Step 2 FAIL — sign-in fails | 401 or no session cookie | Admin account not seeded on OVH DB; run `npm run seed-admins` against OVH `DATABASE_URL` |
| Step 3 FAIL — proposal create fails | 500 or `invalid_idempotency_key` | Check `DATABASE_URL` write access; verify `STORAGE_DRIVER=s3` + all `AWS_*` vars set |
| Step 4 FAIL — SHA-256 mismatch | `expected ... got ...` diagnostic | Coefficients differ from fixture; restore OVH DB to seed-params state OR update fixture and re-commit |
| Step 4 FAIL — header absent | `X-Content-SHA256 header missing` | Blob endpoint not returning header; check `src/lib/storage/s3.ts` presigned URL vs direct download path |
| Step 5/6 FAIL — soft-delete / restore | Non-`{ ok: true }` response | Auth session cookie not propagated; admin `requireAdmin()` rejecting; check `AUTH_SECRET` matches seeded value |
| Step 7 FAIL — cleanup delete | Same as 5/6 | Same recovery; safe to re-run smoke (proposal will be in soft-deleted state) |
| ECONNREFUSED | Script cannot reach `APP_URL` | OVH Node process not running; nginx not proxying; check `systemctl status leasetic-matrice` |

## Final pre-cutover checklist

- [ ] OVH DB migrations applied — `psql $DATABASE_URL -c "\dt"` shows all tables
- [ ] Blob bucket policies set — private ACL, EU region, presigned URL access working
- [ ] Smoke 7/7 green — `npm run smoke:ovh` exits 0 with `OVH-portability: PROVEN`
- [ ] Cron wired + manual fire-test — `curl -X POST -H "Authorization: Bearer $CRON_SECRET" .../api/internal/purge-soft-deleted` returns 200
- [ ] DNS TTL reduced 24 hours before cutover — Leasétic IT action
- [ ] Antoine login + admin coefficients verification on OVH — confirm SeedBanner visible (seed values), then customize

Cross-reference `docs/operations/launch-checklist.md` for the full pre-launch 9-step checklist.

---

*Runbook last updated: 2026-05-10. Phase 10 ships the capability; September 2026 runs the proof. — Antoine*

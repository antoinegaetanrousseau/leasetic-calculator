# Phase 20 Rollout Checklist — INFRA-01 Neon 3-branch Cutover

Antoine ticks each box in order during the cutover. This file is the persistent
artifact of the Task 1 checkpoint runbook — committed in checked state on
cutover day as the audit trail (D-17). If re-running for a 4th branch or after
a restore-from-disaster, copy this file to a new dated version + tick fresh.

Cutover order rationale (D-02): **dev → preview → prod**, least-risk-first. A
broken dev scope blocks nobody; a broken preview scope only affects open PRs;
a broken prod scope is user-visible. Verifying each scope before advancing
keeps the blast radius contained.

For ongoing operations after this checklist completes (recovery, migrations,
adding a 4th branch), see [`docs/operations/neon-branch-routing.md`](./neon-branch-routing.md).

## Pre-flight

- [ ] **1.** Confirm 20-02's `db-smoke` CI job has run green at least once on
  `main`. Open
  [the Actions tab](https://github.com/antoinegaetanrousseau/leasetic-calculator/actions)
  and find the workflow run for the most recent commit. The
  `db-smoke — migration apply gate` job must be green. It exits in ~5s when
  no schema files changed (Pattern B per RESEARCH §5).
  ```bash
  gh run list --branch main --workflow "CI" -L 3
  ```
  If `db-smoke` is missing or red, **STOP** and resume here only after that's
  resolved — the safety net should be operational BEFORE production migration
  paths change (D-15 wave order rationale).

## Neon branch creation

- [ ] **2.** Create `preview` Neon branch from `main`. Open
  [Neon Console](https://console.neon.tech) → project `leasetic-matrice` →
  **Branches** → **New branch** → Name: `preview` → Source: `main` → **Create**.
  Then **Settings** → **Connection details** → enable "Pooled connection" →
  copy the URL ending in `-pooler...neon.tech/neondb?...`. Save the URL for
  Steps 6 and 11.
  - **Pooling note (D-03):** the `-pooler` hostname auto-routes through Neon's
    managed PgBouncer-equivalent; no `?pgbouncer=true&connection_limit=1`
    query params are needed (the `-pooler` host substitutes for those params).

- [ ] **3.** Create `development` Neon branch from `main`. Same dashboard path
  as Step 2 with Name: `development`. Copy its pooled connection string for
  Steps 4 and 12.

## Vercel scope cutover (dev → preview → prod)

- [ ] **4.** Update Vercel **Development** scope's `DATABASE_URL` to the
  `development` branch URL from Step 3. Either via the Vercel dashboard
  (Settings → Environment Variables → DATABASE_URL → Edit → Development scope
  only) OR via the Vercel CLI:
  ```bash
  vercel env rm DATABASE_URL development --yes
  printf "%s" "$DEV_URL" | vercel env add DATABASE_URL development
  ```
  **WARNING (Vercel CLI bug):** `vercel env rm <name> <env>` may remove from
  ALL scopes in some CLI versions. After the `rm` step, verify with
  `vercel env ls | grep DATABASE_URL` — if Production or Preview also lost
  their values, restore them from the previous values BEFORE proceeding.

- [ ] **5.** Verify Development scope. Run `vercel dev` locally OR open a
  development preview URL. Smoke check: log in, view `/proposals`, confirm
  no DB errors in the Vercel logs. If anything fails: revert the env var to
  the previous value (Vercel keeps history), then debug. **Do NOT proceed to
  Step 6.**

- [ ] **6.** Update Vercel **Preview** scope's `DATABASE_URL` to the `preview`
  branch URL from Step 2. The Vercel CLI's `add` command for Preview scope
  requires explicit flags (CLI bug — `--yes` alone insufficient):
  ```bash
  vercel env rm DATABASE_URL preview --yes
  vercel env add DATABASE_URL preview --value "$PREVIEW_URL" --yes
  ```
  If the `add` step fails with `git_branch_required`, fall through to the
  Vercel REST API:
  ```bash
  TOKEN=$(python3 -c "import json; print(json.load(open(\"$HOME/Library/Application Support/com.vercel.cli/auth.json\"))[\"token\"])")
  curl -X POST "https://api.vercel.com/v10/projects/<projectId>/env?teamId=<teamId>" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"key\":\"DATABASE_URL\",\"value\":\"$PREVIEW_URL\",\"type\":\"encrypted\",\"target\":[\"preview\"]}"
  ```

- [ ] **7.** Verify Preview scope. Open a draft PR or visit a recent preview
  deployment. Smoke check: log in, view `/proposals`, confirm no DB errors.

- [ ] **8.** Update Vercel **Production** scope's `DATABASE_URL`. The value
  doesn't change (still points to `main`) but explicit re-pinning documents
  ownership and prevents future Vercel-Neon integration updates from silently
  overwriting it. Same CLI/API pattern as Step 6 with `target=["production"]`.

- [ ] **9.** Verify Production scope. Run:
  ```bash
  curl -s https://leasetic-matrice.vercel.app/healthz | jq .
  ```
  Expected output: `{"db":"ok","blob":"ok","checked_at":"<iso8601>"}`.
  Also smoke-check `/coefficients` in the browser (read-heavy admin surface).

## GitHub Environment secrets

- [ ] **10.** Rename Production env secret `DATABASE_URL_PROD` →
  `DATABASE_URL_MAIN`. GitHub doesn't support rename; add the new name with
  the same value, then delete the old:
  ```bash
  printf "%s" "$MAIN_URL" | gh secret set DATABASE_URL_MAIN --env Production
  gh secret delete DATABASE_URL_PROD --env Production
  ```

- [ ] **11.** Add Preview env secret `DATABASE_URL_PREVIEW`:
  ```bash
  printf "%s" "$PREVIEW_URL" | gh secret set DATABASE_URL_PREVIEW --env Preview
  ```

- [ ] **12.** Create Development env + add `DATABASE_URL_DEVELOPMENT`:
  ```bash
  gh api -X PUT repos/<owner>/<repo>/environments/Development
  printf "%s" "$DEV_URL" | gh secret set DATABASE_URL_DEVELOPMENT --env Development
  ```

- [ ] **13.** Add repo-level variable `NEON_PROJECT_ID`:
  ```bash
  gh variable set NEON_PROJECT_ID --body "<your-neon-project-id>"
  ```
  (For `leasetic-matrice`: `calm-wave-22626395`.)

- [ ] **14.** Add repo-level secret `NEON_API_KEY`. Generate at
  [Neon Console](https://console.neon.tech) → Settings → API Keys → New →
  scope: **Project** → name: `GitHub Actions CI` → copy. Then:
  ```bash
  gh secret set NEON_API_KEY
  # paste the napi_... value when prompted
  ```

## Branch protection

- [ ] **15.** Add `db-smoke — migration apply gate` and
  `typecheck / lint / grep / test / build` as required status checks on
  `main`. Either via the dashboard
  (https://github.com/<owner>/<repo>/settings/branches) OR via API:
  ```bash
  gh api -X PUT repos/<owner>/<repo>/branches/main/protection \
    --input - <<'EOF'
  {
    "required_status_checks": {"strict": false, "checks": [
      {"context": "typecheck / lint / grep / test / build"},
      {"context": "db-smoke — migration apply gate"}
    ]},
    "enforce_admins": false,
    "required_pull_request_reviews": null,
    "restrictions": null
  }
  EOF
  ```

## Verification

- [ ] **16.** Confirm all three Vercel scopes point to different Neon endpoints:
  ```bash
  for env in production preview development; do
    vercel env pull /tmp/check.env --environment "$env" --yes >/dev/null 2>&1
    HOST=$(grep "^DATABASE_URL=" /tmp/check.env | sed -E 's|^DATABASE_URL="postgresql://[^@]+@([^/?]+).*|\1|')
    echo "$env: $HOST"
  done
  rm -f /tmp/check.env
  ```
  Expected: three distinct hostnames, each containing `-pooler.c-3.eu-central-1.aws.neon.tech`.

- [ ] **17.** Re-run production smoke + record output for the audit trail:
  ```bash
  curl -s https://leasetic-matrice.vercel.app/healthz | jq .
  ```
  Expected: `{"db":"ok","blob":"ok","checked_at":"<iso>"}`.

- [ ] **18.** Confirm the 12-gate ADMIN-09 baseline is still green (Phase 19
  closure — Phase 20 adds zero commission surfaces):
  ```bash
  npm test -- tests/admin-09-grep-contracts.test.ts
  ```
  Expected: 12 tests passing.

- [ ] **19.** Tick this checklist's commit in the audit trail.

## Cross-references

- [`docs/operations/neon-branch-routing.md`](./neon-branch-routing.md) — ongoing operations
- [`docs/operations/migrations.md`](./migrations.md) — general migration mechanics
- [`.env.example`](../../.env.example) — DATABASE_URL placeholder + 3-branch comment block
- [`.planning/phases/20-infra-hardening/20-CONTEXT.md`](../../.planning/phases/20-infra-hardening/20-CONTEXT.md) — D-01..D-18 decisions
- [`.planning/phases/20-infra-hardening/20-03-PLAN.md`](../../.planning/phases/20-infra-hardening/20-03-PLAN.md) — original plan + Task 1 checkpoint content this checklist mirrors

---

*Last updated: 2026-05-27. Phase 20 / INFRA-01 — Antoine*

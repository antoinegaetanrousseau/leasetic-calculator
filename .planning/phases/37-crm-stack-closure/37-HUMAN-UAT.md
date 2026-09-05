---
status: partial
phase: 37-crm-stack-closure
source: [37-VERIFICATION.md]
started: 2026-09-06T01:35:00Z
updated: 2026-09-06T01:35:00Z
---

## Current Test

[awaiting verification]

## Tests

### 1. Admin PDF path on `/proposals/[id]` after the `7999759` fix

expected: |
  Signed in as an admin, open a proposal that the admin does NOT own — e.g. the
  `LC-SEED-PIPE-05b` proposal owned by `delphine.specht@leasetic.com`, reachable via
  Sociétés → Garage Central Mercier → relations row → "Voir →" → the proposal.

  The **APERÇU PDF** panel must render the actual PDF preview, **not** the raw body
  `{"error":"not_found"}`. Both "Voir le PDF dans un nouvel onglet" and "Télécharger le PDF"
  must succeed rather than 404.

why_human: |
  The pre-fix failure was reproduced empirically during the Phase 37 walk — a direct
  `GET /api/proposals/17d8cc9e-1348-4db9-8bea-ba04346e2212/pdf` as an admin returned
  `{"error":"not_found"}`. The fix (`7999759`) carries 6 tests proven non-vacuous: with the
  flat ownership check restored, Test 3 fails `AssertionError: expected 404 to be 200`.

  But nobody re-loaded that page in a browser after the fix landed. The automated evidence is
  strong; the live-render confirmation was never captured. This is a disclosed residual, not a
  fabricated one — see `30-UAT.md` scenario 9 and `37-05-SUMMARY.md`.

how_to_run: |
  `.env.production.local` outranks `.env.local` under NODE_ENV=production and points at the
  PRODUCTION Neon branch, so it MUST be moved aside before building or serving locally:

      mv .env.production.local .env.production.local.OFF
      npm run check:local-db-branch          # must print: development branch
      rm -rf .next
      APP_URL=http://localhost:3001 NEXT_PUBLIC_APP_URL=http://localhost:3001 npm run build
      PORT=3001 APP_URL=http://localhost:3001 NEXT_PUBLIC_APP_URL=http://localhost:3001 npm run start

  Then sign in as an admin and open the proposal above. Afterwards:

      mv .env.production.local.OFF .env.production.local

  Note: `check:local-db-branch` reads only `.env.local` and is blind to
  `.env.production.local` — it will report "development" even when a production build is
  connected to PRODUCTION. That guard defect is filed separately as Phase 39 / OPS work.

result: [pending]

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps

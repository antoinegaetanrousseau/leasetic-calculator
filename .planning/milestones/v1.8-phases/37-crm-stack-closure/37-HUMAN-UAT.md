---
status: resolved
phase: 37-crm-stack-closure
source: [37-VERIFICATION.md]
started: 2026-09-06T01:35:00Z
updated: 2026-09-06T01:52:00Z
---

## Current Test

[complete]

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

result: pass
verified: |
  2026-09-06, agent browser automation (Claude in Chrome) at the operator's direction, against
  a production build (`npm run build && npm run start`, Next 16.2.4) on http://localhost:3001,
  Neon development branch, with `.env.production.local` moved aside for the duration.

  Signed in as antoine.rousseau@leasetic.com (ADMIN). Opened
  /proposals/f54f6b24-509b-4222-8a67-8053112221ae — LC-2026-002, owned by
  delphine.specht@leasetic.com, NOT the admin. The APERÇU PDF panel rendered the ACTUAL PDF
  ("LEASETIC — Proposition de location financière", montant 123 000,00 €, loyer 3 068,48 €)
  with the PDF viewer's download and print controls. No `{"error":"not_found"}`.

  CORRECTION captured while closing this item: the original walk attributed the not_found on
  LC-SEED-PIPE-05b to the ownership check, but that route emits the same body from
  `!proposal.pdfBlobKey` (step 5) as from the ownership arm (step 3), and every seeded
  LC-SEED-PIPE-* proposal has a NULL pdf_blob_key. The observed 404 was almost certainly step 5.
  The ownership defect was still real — pinned by route.test.ts Test 3, which fails
  `expected 404 to be 200` with the flat check restored — and the fixed path is now confirmed
  live. A live PRE-fix reproduction against a PDF-bearing proposal was never captured.

## Summary

total: 1
passed: 1
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

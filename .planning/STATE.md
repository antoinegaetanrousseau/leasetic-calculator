---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: — Hosted Web App Foundation
status: executing
last_updated: "2026-05-06T14:15:00.000Z"
last_activity: 2026-05-06 -- 05-05 complete: ESLint flat config + grep scripts (BOOT-06) + CI pipeline (BOOT-11)
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 7
  completed_plans: 5
  percent: 24
---

# State — Matrice Commerciale

## Project Reference

See `.planning/PROJECT.md` (last updated 2026-05-05 — milestone v1.1 started).

**Core value (v1.0, still standing):** A partner fills client info + amount + duration and gets a pixel-correct PDF proposal with the v9 calculation formula intact.

**v1.1 evolution:** Same core value, delivered through a Vercel-hosted Next.js multi-page app instead of a standalone HTML file. Per-partner persistent PDF proposals. Admin-only global financial parameters. OVH-portable architecture.

**Current focus:** Phase 5 — bootstrap-deploy

## Current Position

Phase: 5 (bootstrap-deploy) — EXECUTING
Plan: 6 of 7
Status: Executing Phase 5
Last activity: 2026-05-06 -- 05-05 complete: ESLint flat config + grep scripts (BOOT-06) + .github/workflows/ci.yml (BOOT-11)

## Progress

```
v1.0 ████████████████████ 4/4 phases complete (shipped 2026-04-30)
v1.1 ░░░░░░░░░░░░░░░░░░░░ 0/6 phases complete
       └─ Phase 5: Bootstrap & Deploy        ▶ executing (5/7 plans done)
       └─ Phase 6: Auth & Shell              ◯ blocked on P5
       └─ Phase 7: Calc Engine + Form        ◯ blocked on P6
       └─ Phase 8: Persistence + PDF         ◯ blocked on P7
       └─ Phase 9: Admin Surface             ◯ blocked on P8
       └─ Phase 10: Cutover & Polish         ◯ blocked on P9
```

## v1.0 Closure Status

✅ **v1.0 complete** — shipped 2026-04-30

- 4 phases, 11 plans, 69/69 requirements complete
- Detailed archives in `.planning/milestones/v1.0-*.md`
- Living log in `.planning/MILESTONES.md`

⚠ **`FINAL-TEST-v11.md` master ship-gate runbook was never executed.** v10 is a prepared-but-undistributed prototype. v1.1 supersedes it; v10 will be retired at v1.1 launch (CUT-01) without ever reaching production partners. The runbook can be skipped — partners go straight from v9 → v1.1.

## Accumulated Context

### Locked architectural decisions (carried into v1.1 planning)

| Decision | Source | Status |
|---|---|---|
| Stack: Next.js (App Router) + Postgres (Neon) + Vercel Blob + Drizzle + Tailwind v4 | research/SUMMARY.md | Locked |
| ORM: Drizzle 0.45.x over Prisma | research/SUMMARY.md | Locked |
| Migrations: versioned SQL, GitHub Action on prod, never auto on Vercel deploy | BOOT-09/10 | Locked |
| Auth library: Better Auth 1.6.x (over NextAuth v5) | research/SUMMARY.md | Locked unless Phase 6 verification flips it |
| PDF library: `@react-pdf/renderer` (over Puppeteer) | research/SUMMARY.md + REQ PROP-16 | Locked — chosen for byte-determinism, OVH portability, smaller bundle |
| Hidden admin URL: env-driven dynamic segment, layout 404s on mismatch | architecture §2.3, AUTH-14/15 | Locked |
| PDF immutability: `params_snapshot` + `inputs` + `computed` + `schema_version` jsonb on the proposals row (Stripe pattern, Option A) | architecture §2.5, DATA-01..04 | Locked |
| OVH portability: `lib/storage` + `lib/db` adapters; `STORAGE_DRIVER=vercel\|s3`; ESLint + CI grep on Vercel-only imports | architecture §9, BOOT-05/06 | Locked |
| `output: 'standalone'` from first commit | BOOT-07 | Locked |
| No SMTP in v1.1: invitation + password reset are admin-mediated only | architecture §4.4 | Locked |
| Single-page PDF: v10's RSE second page removed in v1.1 | PROP-15 | Locked |
| Cookie-based dark mode (no flash, SSR-rendered) over `next-themes` | architecture §7 | Locked |
| Hand-rolled FR/EN dictionary over `next-intl` | architecture §6 | Locked |
| Commission invisibility extends to logs / traces / admin views | research PITFALLS, ADMIN-09 | Locked |
| 10-year PDF retention; partner deactivation never deletes PDFs | DATA-11 | Locked (pending legal counsel confirmation per Open Q3) |
| Hard cutover from v10 — no localStorage migration | CUT-03 | Locked |

### Open questions (to resolve before relevant phase)

1. **Cutover ownership** — Antoine vs Thomas for partner comms. Decide before Phase 10.
2. **Existing v10 form schema** — does it capture a structured "client name" field? Verify by reading v10 HTML at start of Phase 7.
3. **Legal counsel sign-off** on 10-year retention (DATA-11). Resolve before Phase 10.
4. **Auth library version pinning matrix** — exact Better Auth + Drizzle adapter + Next.js + React versions. Pin no-carets at Phase 5 bootstrap.
5. **OVH side stack** — managed Postgres provider, S3-compatible blob endpoint. Confirm with Leasétic IT before Phase 10 smoke deploy.
6. **Admin role provisioning** — Antoine + Thomas at launch, or Antoine first? Affects AUTH-12 CLI script payload.

## Carry-Forward Notes (from v1.0)

- v10 standalone HTML is the *source* for the v1.1 calc engine port (Phase 7) and i18n dictionary (Phase 6). Read it before planning those phases.
- Phase summaries proved the most durable artifact during v1.0's git-corruption incident (see Session Notes). Same discipline applies to v1.1: durable summaries first, commit log second.
- v1.0 phase directories are still in place under `.planning/phases/`. Use `/gsd-cleanup` to archive them later if the working directory feels cluttered.

## Decisions Log

| Decision | Source | Added |
|---|---|---|
| Exact version pins without carets (all direct deps in package.json) | Open Q4 resolution | 05-01 |
| tsconfig jsx: preserve → react-jsx (Next.js 16 mandates it; accepted as expected) | Next.js build auto-update | 05-01 |
| Tailwind v4 at 4.2.4 (not 4.0.0) — @tailwindcss/postcss@4.0.0 sub-depends on tailwindcss@4.2.4; coherent 4.2.4 set required | Build-time version mismatch (ScannerOptions.sources) | 05-02 |
| @custom-variant dark uses :where() selector to match [data-theme=dark] and descendants | UI-SPEC + Tailwind v4 docs | 05-02 |
| display: swap for next/font/local (avoids invisible text on slow networks) | deliberate adjustment from plan note | 05-02 |
| Static ESM imports in lib/storage/index.ts instead of require() — Vitest ESM context rejects dynamic require() for adjacent .ts modules | Vitest compatibility requirement | 05-03 |
| Vercel Blob proxy architecture (access:'public' + cacheControlMaxAge:0 + proxy route) — @vercel/blob 0.27.3 has no stable access:'private' option | PITFALLS §5.2 mitigation per plan spec | 05-03 |
| Drizzle DB adapter mirrors storage adapter pattern (memoized singleton + factory + __resetForTests) — architectural consistency | plan 05-04 design decision | 05-04 |
| parseDatabaseUrl error message uses 'invalid URL' to match test regex — auto-fixed mismatch between plan spec wording and implementation | Rule 1 auto-fix | 05-04 |
| eslint-config-next 16.x exports flat config arrays natively — FlatCompat NOT needed (causes circular JSON errors) | ESLint 9 flat config investigation | 05-05 |
| lint script changed from next lint (removed in Next.js 16) to eslint . | Next.js 16 CLI change | 05-05 |
| check-no-drizzle-push.sh excludes .planning/ and drizzle.config.ts to avoid self-tripping on documentation comments | grep script self-trip fix | 05-05 |

## Session Notes

- **Git history was lost during a directory move on 2026-04-30** (cloud-sync corruption). Working tree intact; planning artifacts preserved. Fresh git history initialized at v1.0 close, tagged `v1.0`. The corrupted `.git.corrupted-backup/` directory remains in the project root (gitignored).
- **2026-05-06:** 05-01 executed — Next.js 16.2.4 scaffold committed (24a9bae). All pinned versions matched registry exactly. Standalone build artifact confirmed.
- **2026-05-06:** 05-02 executed — Tailwind v4.2.4 token spine, Plus Jakarta Sans (5 weights) self-hosted, no-flash script, FR/EN i18n helpers, layout shell placeholder. 3 task commits: c2e884e, fce0f98, 0775ffa.
- **2026-05-06:** 05-03 executed — lib/storage adapter spine: StorageAdapter interface (5 methods), VercelBlobStorage + S3Storage full implementations, STORAGE_DRIVER selector factory, 13 Vitest tests passing. Vitest 2.1.8 installed. OVH portability seam locked. 2 task commits: 2b5af73, c134955.
- **2026-05-06:** 05-04 executed — lib/db Drizzle adapter spine: drizzle-orm@0.45.2 + @neondatabase/serverless@0.10.4 + postgres@3.4.5 + drizzle-kit@0.30.1 installed (exact pins). DB adapter with Neon HTTP / postgres-js driver selection by DATABASE_URL host. schema_meta baseline migration SQL committed to git. 9 db tests + 13 storage tests all passing. generate-only discipline locked. 3 task commits: 1b9fc8c, c9ab5e6, a4ddfe9.
- **2026-05-06:** 05-05 executed — ESLint flat config (eslint.config.mjs) with no-restricted-imports blocking 7 forbidden packages outside lib/ adapters. Two grep scripts for defense-in-depth (check-no-vercel-only-imports.sh + check-no-drizzle-push.sh). .github/workflows/ci.yml: typecheck + lint + grep + vitest + build on every PR. All 22 tests pass. Negative test confirmed both layers fire. 2 task commits: 61b43e0, 54ffa4d.

## Open Blockers

(none — Phase 5 is ready to plan)

## Deferred Items

None at v1.1 planning start. v1.2+ candidates documented in `.planning/REQUIREMENTS.md` "Future Requirements" section (SMTP-driven self-service password reset, OVH production cutover, mobile layout, Excel export, automated browser tests, etc.).

---

*Last updated: 2026-05-06 — 05-05 complete: ESLint flat config + grep scripts (BOOT-06) + .github/workflows/ci.yml (BOOT-11).*

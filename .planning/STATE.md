---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: — Hosted Web App Foundation
status: phase-context-gathered
last_updated: "2026-05-07T00:00:00.000Z"
last_activity: 2026-05-07 -- Phase 6 context gathered; user accepted all soft-locks as final without discussion ("keep going with the build"). 06-CONTEXT.md + 06-DISCUSSION-LOG.md written. Ready for /gsd-ui-phase 6 then /gsd-plan-phase 6 --research.
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 7
  completed_plans: 7
  percent: 17
---

# State — Matrice Commerciale

## Project Reference

See `.planning/PROJECT.md` (last updated 2026-05-05 — milestone v1.1 started).

**Core value (v1.0, still standing):** A partner fills client info + amount + duration and gets a pixel-correct PDF proposal with the v9 calculation formula intact.

**v1.1 evolution:** Same core value, delivered through a Vercel-hosted Next.js multi-page app instead of a standalone HTML file. Per-partner persistent PDF proposals. Admin-only global financial parameters. OVH-portable architecture.

**Current focus:** Phase 6 — Auth & Shell. Context gathered 2026-05-07; ready for UI design contract + planning.

## Current Position

Phase: 6 (auth-shell) — ◯ Context gathered, awaiting UI-SPEC + plan
Plan: 0 of TBD
Status: 06-CONTEXT.md committed; user accepted all soft-locks as final without discussion. Better Auth 1.6.x is no longer "soft-locked unless flipped" — it is fully locked. Schema scope, invitation/reset UX, and CLI grant-admin script have sensible defaults captured in CONTEXT.md.
Next: `/gsd-ui-phase 6` then `/gsd-plan-phase 6 --research`
Last activity: 2026-05-07 -- Phase 6 context gathered; 06-CONTEXT.md + 06-DISCUSSION-LOG.md written under .planning/phases/06-auth-shell/

## Progress

```
v1.0 ████████████████████ 4/4 phases complete (shipped 2026-04-30)
v1.1 ███░░░░░░░░░░░░░░░░░ 1/6 phases complete
       └─ Phase 5: Bootstrap & Deploy        ✅ complete (7/7 plans, 12/12 BOOT reqs, /healthz live)
       └─ Phase 6: Auth & Shell              ◐ context gathered (06-CONTEXT.md), needs UI-SPEC + plan
       └─ Phase 7: Calc Engine + Form        ◯ blocked on P6
       └─ Phase 8: Persistence + PDF         ◯ blocked on P7
       └─ Phase 9: Admin Surface             ◯ blocked on P8
       └─ Phase 10: Cutover & Polish         ◯ blocked on P9
```

## Phase 5 follow-ups (non-blocking, deferred)

1. **Neon branch split**: currently 1 shared `main` branch across 3 Vercel scopes. Create `preview` and `development` branches off `main`, scope `DATABASE_URL` per env. Required before Phase 8 PDF persistence ships real partner data.
2. **GitHub Environment protection rules**: free-plan + private-repo can't enforce required-reviewer or branch policy on the `production` Environment. Either upgrade to Pro ($4/user/mo) or make repo public. The workflow's typed-confirmation gate (`MIGRATE PROD`) is the meaningful confirmation today.
3. **Vercel project ownership**: project lives in personal scope `antoinerousseau-5272s-projects`. Transfer to `memento` team for v1.1 launch (no code change required, just dashboard transfer).

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
| Auth library: Better Auth 1.6.x (over NextAuth v5) | research/SUMMARY.md + user 2026-05-07 accept | Locked (verification deferred to Phase 6 research) |
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
| Admin roles at v1.1 launch: **Antoine + Emmanuel** seeded via AUTH-12 CLI script (resolves Open Q6) | user decision 2026-05-07 | Locked |

### Open questions (to resolve before relevant phase)

1. **Cutover ownership** — Antoine vs Thomas for partner comms. Decide before Phase 10.
2. **Existing v10 form schema** — does it capture a structured "client name" field? Verify by reading v10 HTML at start of Phase 7.
3. **Legal counsel sign-off** on 10-year retention (DATA-11). Resolve before Phase 10.
4. **Auth library version pinning matrix** — exact Better Auth + Drizzle adapter + Next.js + React versions. Pin no-carets at Phase 5 bootstrap.
5. **OVH side stack** — managed Postgres provider, S3-compatible blob endpoint. Confirm with Leasétic IT before Phase 10 smoke deploy.
6. ~~**Admin role provisioning** — Antoine + Thomas at launch, or Antoine first? Affects AUTH-12 CLI script payload.~~ ✓ Resolved 2026-05-07: **Antoine + Emmanuel** at launch (see Decisions Log).

## Carry-Forward Notes (from v1.0)

- v10 standalone HTML is the *source* for the v1.1 calc engine port (Phase 7) and i18n dictionary (Phase 6). Read it before planning those phases.
- Phase summaries proved the most durable artifact during v1.0's git-corruption incident (see Session Notes). Same discipline applies to v1.1: durable summaries first, commit log second.
- v1.0 phase directories are still in place under `.planning/phases/`. Use `/gsd-cleanup` to archive them later if the working directory feels cluttered.

## Decisions Log

| Decision | Source | Added |
|---|---|---|
| Admin roles at v1.1 launch: **Antoine + Emmanuel** (AUTH-12 CLI script seeds both rows) | Open Q6 resolution (user 2026-05-07) | pre-06 |
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
| Exclude scripts/migrate.ts from check-no-drizzle-push.sh — file documents the prohibition in a comment (same rationale as drizzle.config.ts exclusion) | Rule 1 auto-fix | 05-06 |
| Route placed at app/healthz/route.ts (URL: /healthz) — plan artifact listed app/api/healthz/route.ts (URL: /api/healthz); must_haves URL spec overrides | Rule 1 auto-fix (plan inconsistency) | 05-07 |
| runtime: nodejs on /healthz — aws-sdk/client-s3 requires Node APIs; consistent with Phase 8 PDF rendering | Plan spec + PITFALLS §6.1 | 05-07 |
| classifyError() maps ALL exceptions to bounded 4-string set; raw error.message server-side only | PITFALLS §9.4 security discipline | 05-07 |
| Wrap workflow_dispatch input in CONFIRM_INPUT env var instead of direct shell interpolation — GitHub Actions injection safety best practice | Rule 2 security fix | 05-06 |

## Session Notes

- **Git history was lost during a directory move on 2026-04-30** (cloud-sync corruption). Working tree intact; planning artifacts preserved. Fresh git history initialized at v1.0 close, tagged `v1.0`. The corrupted `.git.corrupted-backup/` directory remains in the project root (gitignored).
- **2026-05-06:** 05-01 executed — Next.js 16.2.4 scaffold committed (24a9bae). All pinned versions matched registry exactly. Standalone build artifact confirmed.
- **2026-05-06:** 05-02 executed — Tailwind v4.2.4 token spine, Plus Jakarta Sans (5 weights) self-hosted, no-flash script, FR/EN i18n helpers, layout shell placeholder. 3 task commits: c2e884e, fce0f98, 0775ffa.
- **2026-05-06:** 05-03 executed — lib/storage adapter spine: StorageAdapter interface (5 methods), VercelBlobStorage + S3Storage full implementations, STORAGE_DRIVER selector factory, 13 Vitest tests passing. Vitest 2.1.8 installed. OVH portability seam locked. 2 task commits: 2b5af73, c134955.
- **2026-05-06:** 05-04 executed — lib/db Drizzle adapter spine: drizzle-orm@0.45.2 + @neondatabase/serverless@0.10.4 + postgres@3.4.5 + drizzle-kit@0.30.1 installed (exact pins). DB adapter with Neon HTTP / postgres-js driver selection by DATABASE_URL host. schema_meta baseline migration SQL committed to git. 9 db tests + 13 storage tests all passing. generate-only discipline locked. 3 task commits: 1b9fc8c, c9ab5e6, a4ddfe9.
- **2026-05-06:** 05-05 executed — ESLint flat config (eslint.config.mjs) with no-restricted-imports blocking 7 forbidden packages outside lib/ adapters. Two grep scripts for defense-in-depth (check-no-vercel-only-imports.sh + check-no-drizzle-push.sh). .github/workflows/ci.yml: typecheck + lint + grep + vitest + build on every PR. All 22 tests pass. Negative test confirmed both layers fire. 2 task commits: 61b43e0, 54ffa4d.
- **2026-05-06:** 05-06 tasks 1+2 executed — tsx@4.19.2 installed; scripts/migrate.ts migration runner (postgres-js, --dry-run flag, URL hostname masking, max=1+prepare=false); .github/workflows/db-migrate.yml (workflow_dispatch-only, 2-job pipeline: dry-run→apply, production environment gate, concurrency guard); docs/operations/migrations.md (91-line operator runbook). BOOT-10 satisfied. Task 3 checkpoint pending Antoine's GitHub Settings configuration. 2 task commits: 595ceeb, 930d3c0.
- **2026-05-06:** 05-07 tasks 1+2 executed — src/lib/health.ts (checkDatabaseHealth + checkBlobHealth + buildHealthResponse, classifyError() redaction); src/lib/health.test.ts (6 tests including error-redaction assertions); app/healthz/route.ts (Node-runtime, force-dynamic, unauthenticated GET /healthz); .env.example updated with Vercel+Neon wiring docs. 28/28 tests pass. Smoke: HTTP 503 valid JSON. Task 3 human-action checkpoint: Vercel/Neon/Blob provisioning + production /healthz verify. 2 task commits: 512461f, 1e1ccec.
- **2026-05-07:** Phase 6 context-gathering session — analyzed 32 requirements (AUTH-01..18 + SHELL-01..14) against PROJECT.md, REQUIREMENTS.md, STATE.md locked decisions, ARCHITECTURE.md, PITFALLS.md, STACK.md, and Phase 5 UI-SPEC. Surfaced 4 gray areas (auth library re-verification, schema scope, invitation/reset UX, CLI admin-grant script). User responded "none, I want to keep going with the build and commit to these changes" — accepted all soft-locks as final. CONTEXT.md captures: Better Auth 1.6.x final-locked, schema scope tight to users + password_resets only, 24h token TTL with admin-side modal + copy button + "won't be shown again" warning, scripts/grant-admin.ts mirrors scripts/migrate.ts typed-confirmation pattern (idempotent, can upgrade existing or create + emit invitation URL). 06-CONTEXT.md + 06-DISCUSSION-LOG.md written.

## Open Blockers

(none — Phase 5 is ready to plan)

## Deferred Items

None at v1.1 planning start. v1.2+ candidates documented in `.planning/REQUIREMENTS.md` "Future Requirements" section (SMTP-driven self-service password reset, OVH production cutover, mobile layout, Excel export, automated browser tests, etc.).

---

*Last updated: 2026-05-06 — 05-07 tasks 1+2 complete: /healthz route + health helpers + tests (BOOT-12 code ready). Checkpoint pending: Vercel project + Neon DB + Blob provisioning + baseline migration apply + production /healthz verification. ALSO still pending: 05-06 Task 3 (GitHub Environment 'production' + DATABASE_URL_PROD secret).*

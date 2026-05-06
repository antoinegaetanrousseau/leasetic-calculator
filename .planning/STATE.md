---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: — Hosted Web App Foundation
status: executing
last_updated: "2026-05-06T11:25:24.679Z"
last_activity: 2026-05-06 -- Phase 5 execution started
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 7
  completed_plans: 0
  percent: 0
---

# State — Matrice Commerciale

## Project Reference

See `.planning/PROJECT.md` (last updated 2026-05-05 — milestone v1.1 started).

**Core value (v1.0, still standing):** A partner fills client info + amount + duration and gets a pixel-correct PDF proposal with the v9 calculation formula intact.

**v1.1 evolution:** Same core value, delivered through a Vercel-hosted Next.js multi-page app instead of a standalone HTML file. Per-partner persistent PDF proposals. Admin-only global financial parameters. OVH-portable architecture.

**Current focus:** Phase 5 — bootstrap-deploy

## Current Position

Phase: 5 (bootstrap-deploy) — EXECUTING
Plan: 2 of 7
Status: Executing Phase 5
Last activity: 2026-05-06 -- 05-01 complete: Next.js 16.2.4 App Router scaffold with standalone output

## Progress

```
v1.0 ████████████████████ 4/4 phases complete (shipped 2026-04-30)
v1.1 ░░░░░░░░░░░░░░░░░░░░ 0/6 phases complete
       └─ Phase 5: Bootstrap & Deploy        ▶ executing (1/7 plans done)
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

## Session Notes

- **Git history was lost during a directory move on 2026-04-30** (cloud-sync corruption). Working tree intact; planning artifacts preserved. Fresh git history initialized at v1.0 close, tagged `v1.0`. The corrupted `.git.corrupted-backup/` directory remains in the project root (gitignored).
- **2026-05-06:** 05-01 executed — Next.js 16.2.4 scaffold committed (24a9bae). All pinned versions matched registry exactly. Standalone build artifact confirmed.

## Open Blockers

(none — Phase 5 is ready to plan)

## Deferred Items

None at v1.1 planning start. v1.2+ candidates documented in `.planning/REQUIREMENTS.md` "Future Requirements" section (SMTP-driven self-service password reset, OVH production cutover, mobile layout, Excel export, automated browser tests, etc.).

---

*Last updated: 2026-05-05 — v1.1 roadmap approved, ready to plan Phase 5.*

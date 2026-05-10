# Phase 10: Cutover & Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-10
**Phase:** 10-cutover-polish
**Areas discussed:** OVH smoke deploy target, Purge cron mechanism, Test data discriminator (CUT-04 + CUT-06), Cutover plan + v10 redirect + legal hookup

---

## OVH smoke deploy target

### Q1: Where does the OVH portability smoke deploy actually run?

| Option | Description | Selected |
|--------|-------------|----------|
| OVH Managed PG + Object Storage (Recommended) | Matches eventual prod target. Closes Open Q5 by *doing* it. Requires Leasétic IT involvement. | |
| Local docker-compose (PG + MinIO) | Cheapest proof; doesn't catch OVH-specific quirks. | |
| Scaleway PG + Object Storage | Different vendor, same EU footprint. Faster provisioning than OVH. | |
| Two-stage: docker first then OVH-confirm | Build smoke against docker first, then run same stack against OVH. Best of both. | |

**User's choice (freeform):** "I only plan on looking at moving the app to OVH later this year in September. For now. Let's just create the documentation for this transfer and leave it like that."
**Notes:** Reframes Phase 10 cleanly — Phase 10 ships docs + script (capability), September runs the proof (execution). Locked as D-10-01. Removes Open Q5 from Phase 10 critical path; runbook covers generic shape, specific provider TBD before September.

### Q2: What does the smoke deploy actually exercise?

| Option | Description | Selected |
|--------|-------------|----------|
| Full proposal lifecycle (Recommended) | Login → create proposal → PDF SHA-256 → soft-delete → restore. Matches ROADMAP success criterion #2. | ✓ |
| Healthz + one round-trip | /healthz + single proposal create+download. Less coverage. | |
| Minimal (DB + blob round-trip only) | /healthz only. Doesn't validate app code path portability. | |

**User's choice:** Full proposal lifecycle
**Notes:** D-10-02. Smoke script asserts SHA-256 match against committed `__pdf-fixtures__/expected.sha256.txt`.

### Q3: What runs the smoke (manual or scripted)?

| Option | Description | Selected |
|--------|-------------|----------|
| Scripted in scripts/smoke-ovh.ts (Recommended) | Re-runnable, regression-friendly, CI-friendly. Asserts each step. | ✓ |
| Manual checklist in deploy-ovh.md | Faster to write, harder to re-run reliably. | |
| Both — scripted + checklist | Defense in depth. | |

**User's choice:** Scripted in scripts/smoke-ovh.ts
**Notes:** D-10-03. Script is parametrized via APP_URL + ADMIN_EMAIL + ADMIN_PASSWORD env vars; runnable against current Vercel today as sanity check.

### Q4: Open Q5 (OVH side stack) — when do we resolve it?

| Option | Description | Selected |
|--------|-------------|----------|
| Now — fire ask alongside planning (Recommended) | Email Leasétic IT today. Phase 10 planner waits for answer. | |
| Defer — use docker-compose proof, document v1.2 follow-up | Phase 10 ships docker proof; OVH retest in v1.2. | ✓ |
| Block Phase 10 until Open Q5 resolved | Stalls progress on CUT-01..08 which don't depend on Open Q5. | |

**User's choice:** Defer
**Notes:** D-10-04. Consistent with September timeline. Runbook describes generic shape; specific provider before September.

---

## Purge cron mechanism

### Q1: Which scheduler runs scripts/purge-soft-deleted.ts on a recurring basis?

| Option | Description | Selected |
|--------|-------------|----------|
| Vercel Cron (Recommended) | Native Vercel mechanism; runs in same project. Operational tier — doesn't violate no-Vercel-only-primitives rule (which applies to lib/). OVH swap-out path documented. | ✓ |
| GitHub Actions schedule | Portable across hosts. Heavier setup; needs DATABASE_URL accessible to GH runners. | |
| Defer scheduling — manual only until v1.2 | Keeps existing manual operator step. Weakens CUT-08's "scheduled" claim. | |

**User's choice:** Vercel Cron
**Notes:** D-10-05. OVH swap-out: Vercel cron → OVH-side scheduler (cron job, systemd timer, or OVH Cloud Scheduler) hitting same `/api/internal/purge-soft-deleted` route.

### Q2: How often should the purge run?

| Option | Description | Selected |
|--------|-------------|----------|
| Daily 03:00 UTC (Recommended) | Soft-deleted rows hard-purged within ~24h of crossing threshold. Minimal load. | |
| Weekly Sunday 03:00 UTC | Up to ~37 day persistence. Acceptable per "after 30 days" reading. | |
| Twice-monthly (1st + 15th) | Up to ~46 day persistence. Outside DATA-10's strict spirit but compliant with "after 30 days" minimum reading. | ✓ |

**User's choice:** Twice-monthly (1st + 15th)
**Notes:** D-10-06. Vercel cron syntax `"0 3 1,15 * *"`. Worst-case persistence ~46 days. Satisfies DATA-10's "after 30 days" as minimum threshold.

### Q3: What does the cron actually invoke?

| Option | Description | Selected |
|--------|-------------|----------|
| Existing CLI script via npx tsx (Recommended) | Cron hits HTTP route that imports + invokes the existing script's purge logic. | ✓ |
| New HTTP endpoint that re-implements the logic | Two implementations to keep in sync. Drift risk. | |
| Refactor: extract pure function, share between CLI + HTTP | Cleaner architecture; one source of truth. | |

**User's choice:** Existing CLI script via npx tsx
**Notes:** D-10-07. Refactor the loop into `src/lib/admin/purge.ts` as pure function called by both CLI and HTTP route. Single source of truth; tested at both layers.

### Q4: What if the cron fails or partially fails?

| Option | Description | Selected |
|--------|-------------|----------|
| Best-effort + log (Recommended) | Per-row failures continue; failures visible in Vercel/GH-Actions logs. | ✓ |
| Stop on first failure + alert | Avoids cascading damage. Blocks subsequent valid rows. | |
| Best-effort + email/Slack alert on any failure | Adds alerting infra dependency; conflicts with CUT-07 defer. | |

**User's choice:** Best-effort + log
**Notes:** D-10-08. Pure function returns `{purged, errors}`; HTTP handler returns 200 if any row succeeded, 500 if all failed.

---

## Test data discriminator (CUT-04 + CUT-06)

### Q1: How do we discriminate test data?

| Option | Description | Selected |
|--------|-------------|----------|
| Email pattern, no schema change (Recommended) | Tag test partners by email convention `*@test.leasetic.com`. No schema migration. Cleanest — leaves no discriminator artifact post-launch. | ✓ |
| Add `is_test boolean DEFAULT false` to users | Schema migration. Persists in schema forever. Literal CUT-04 interpretation. | |
| Hardcoded list in scripts/purge-test-data.ts | Brittle when new test partners added. | |

**User's choice:** Email pattern, no schema change
**Notes:** D-10-09. Reserved domain: `@test.leasetic.com`. seed-partner-launch.ts validates pattern. REQUIREMENTS.md update opportunity to clarify the email-pattern realization.

### Q2: Where does the 'Vérifier les coefficients' first-login tool live?

| Option | Description | Selected |
|--------|-------------|----------|
| Banner on /[adminSegment]/coefficients (Recommended) | Yellow banner above editor card. Visible while latest global_params row equals seedParams. Reuses Phase 9's editor + diff-modal flow. | ✓ |
| Standalone CLI: scripts/verify-coefficients.ts | CI / pre-deploy gate. Doesn't gate admin UI. | |
| Both: banner + CLI | Defense in depth. Slight duplication. | |

**User's choice:** Banner on coefficients page
**Notes:** D-10-13/14. Server component computes `isStillSeed: boolean`; passes as prop to `<SeedBanner>`. Closes existing seed-params.ts TODO via the banner mechanism.

### Q3: What is 'the v10 baseline' the diff tool compares against?

| Option | Description | Selected |
|--------|-------------|----------|
| v10 fixture coefficients from seed-params.ts (Recommended) | Existing seedParams from `src/lib/calc/seed-params.ts`. Closes TODO. | ✓ |
| Antoine-supplied canonical values (separate constant) | Splits placeholder vs true v10 baseline. Requires data gathering. | |
| External JSON committed to repo | Same content as option 2; separate from TS code. | |

**User's choice:** seed-params.ts fixtures
**Notes:** D-10-14. The verification mechanism is the banner; once admin saves a non-seed row, the TODO is satisfied by data, not code edit.

### Q4: When does the pre-launch test-data purge actually run?

| Option | Description | Selected |
|--------|-------------|----------|
| Manual operator step pre-launch (Recommended) | Antoine runs `npm run purge:test-data` post-pilot, before batch-onboard. Documented in launch-checklist. | ✓ |
| Automatic on first non-test partner creation | More magic; risk of accidental purge. | |
| GitHub Action workflow_dispatch | Heavier; matches BOOT-10 production-mutations-via-CI pattern. | |

**User's choice:** Manual operator step pre-launch
**Notes:** D-10-12. Step in launch-checklist.md. Typed-confirmation gate (`CONFIRM=PURGE-TEST-DATA`).

---

## Cutover plan + v10 redirect + legal hookup

### Q1: Who owns partner comms during cutover (Open Q1)?

| Option | Description | Selected |
|--------|-------------|----------|
| Thomas (Leasétic) (Recommended) | Owns partner relationship today. Cleanest separation: tech vs human. | |
| Antoine (you) | Direct involvement. Faster (no coordination). New sender to partners. | ✓ |
| Joint — Thomas signs, Antoine drafts | Combines technical accuracy + relationship continuity. | |

**User's choice:** Antoine (direct)
**Notes:** D-10-21. Reflects Antoine's preference for direct technical voice during cutover. Implication: deploy-ovh.md runbook written assuming Antoine-context.

### Q2: Rollout shape on launch day?

| Option | Description | Selected |
|--------|-------------|----------|
| Phased pilot (Recommended) | 2-3 trusted partners first. 1-2 weeks observation. Then batch. v10 stays accessible during pilot. | ✓ |
| Hard cutover — all partners day 1 | Clean break. Higher blast radius. | |
| Soft cutover — v1.1 available, v10 stays for opt-out | Conflicts with CUT-01. | |

**User's choice:** Phased pilot
**Notes:** D-10-20. 2-3 partners first, 1-2 week observation, then batch-onboard. Documented in launch-checklist.md.

### Q3: v10 redirect (CUT-02) — was v10 ever hosted at a URL?

| Option | Description | Selected |
|--------|-------------|----------|
| No — v10 was file-only (Recommended) | Per PROJECT.md, "prepared but undistributed prototype" — emailed file, not URL. CUT-02 vacuous. | ✓ |
| Yes — there's a URL we need to handle | Would need DNS / static-page redirect. | |

**User's choice:** No — v10 was file-only
**Notes:** D-10-15. CUT-02 collapses vacuously. Document one-line note in launch-checklist or PROJECT.md. REQUIREMENTS.md update opportunity.

### Q4: Privacy notice + legal counsel sign-off (CUT-05 + Open Q3)?

| Option | Description | Selected |
|--------|-------------|----------|
| Use existing Leasétic privacy policy + ask Thomas (Recommended) | Login page links existing policy. Antoine asks Thomas this week. Confirmation → docs/legal/privacy-coverage-confirmation.md. | ✓ |
| Draft a v1.1-specific addendum | More work; paper trail. Thomas may still need legal counsel review. | |
| Defer legal review to v1.2 (launch with main policy link) | No formal sign-off in v1.1. Acceptable for closed-network admin-invited partners. | |

**User's choice:** Existing policy + ask Thomas
**Notes:** D-10-17/18. Privacy URLs configured via NEXT_PUBLIC_PRIVACY_URL_FR/EN env vars. If Thomas escalates, legal counsel review becomes potential v1.2 blocker.

---

## Claude's Discretion

The following Phase 10 decisions are left to the planner per the "Implicit decisions" section of CONTEXT.md:

- Cron secret naming + generation (`PURGE_CRON_SECRET`, 32-byte hex via `openssl rand -hex 32`).
- `/api/internal/*` route convention for ops-only routes.
- `.env.example` updates (privacy URLs, cron secret).
- Banner accessibility (role="status", aria-live="polite", no focus management).
- Smoke script idempotency (cleans up after itself — soft-deletes the proposal it created).
- REQUIREMENTS.md updates: planner decides whether to inline the email-pattern note in CUT-04 + the "vacuous" note in CUT-02, or capture in a separate addendum.
- Migration application: launch-checklist step, not a Phase 10 plan task.
- Optional post-launch checklist mirror for during/after pilot observation.

## Deferred Ideas

- Actual OVH provisioning + smoke-deploy execution (September 2026).
- Sentry / APM observability beyond Vercel logs (CUT-07 explicit defer).
- Email/Slack alerting for cron failures.
- Legal counsel formal sign-off if Thomas escalates Open Q3.
- OVH provider lock-in decision (Managed PG vs Scaleway vs self-host) — runbook generic.
- Phase 5 follow-up: Neon branch split — separate ops task.
- Phase 6 follow-ups: admin password rotation, Better Auth trustedOrigins hardening, APP_URL env-var docs.
- Audit log viewer beyond coefficient history.
- Mobile-optimized layouts.
- `is_test boolean` schema column (explicitly chosen against in D-10-09).
- Email transport (Resend, OVH SMTP) for partner self-service password reset.

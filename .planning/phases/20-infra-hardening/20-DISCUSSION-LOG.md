# Phase 20: Infra Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 20-infra-hardening
**Areas discussed:** INFRA-01 rollout choreography, INFRA-02 CI db-smoke design, INFRA-03 middleware Origin gate, Phase mechanics + plan split

---

## INFRA-01 rollout choreography

### Q1: How should the new Neon branches start — what schema state inherits, and how do future migrations apply?

| Option | Selected |
|--------|----------|
| Branch from main NOW, then all 3 branches receive migrations independently going forward (Recommended) | ✓ |
| Branch from main NOW; only `main` ever gets migrations, others stay frozen | |
| Recreate preview/dev from main on every migration PR | |

### Q2: Which Vercel scope should we repoint first?

| Option | Selected |
|--------|----------|
| Development first → Preview → Production last (Recommended) | ✓ |
| All three at once | |
| Production first | |

### Q3: How should the pooled-connection config differ per branch?

| Option | Selected |
|--------|----------|
| All 3 branches use the same `?pgbouncer=true&connection_limit=1` (Recommended) | ✓ |
| Production gets pgbouncer, preview + dev get direct (non-pooled) | |
| Verify Vercel current first | |

### Q4: Where does the new env-var contract get documented?

| Option | Selected |
|--------|----------|
| Update .env.example + add docs/operations/neon-branch-routing.md (Recommended) | ✓ |
| Update .env.example only | |
| Add to deploy-ovh.md as Vercel-side parallel section | |

---

## INFRA-02 CI db-smoke design

### Q1: When should the db-smoke CI step fire?

| Option | Selected |
|--------|----------|
| Only on PRs touching drizzle/migrations/*.sql or drizzle/meta/_journal.json (Recommended) | ✓ |
| On every PR | |
| On every PR, but only if drizzle/* files changed (broader path match) | |

### Q2: What's the ephemeral Neon branch lifecycle?

| Option | Selected |
|--------|----------|
| Per-CI-run: create at job start, delete at job end (Recommended) | ✓ |
| Per-PR (reused across pushes to same PR) | |
| Long-lived `ci` branch (recreated nightly) | |

### Q3: What does the smoke step actually validate?

| Option | Selected |
|--------|----------|
| Run migrations + assert apply succeeds (Recommended) | ✓ |
| Migrations + run a small smoke query against each touched table | |
| Migrations + full vitest integration test suite | |

### Q4: What are the failure semantics?

| Option | Selected |
|--------|----------|
| Required status check that blocks PR merge (Recommended) | ✓ |
| Informational only — reports status but doesn't block merge | |

---

## INFRA-03 middleware Origin gate

### Q1: Where does the Origin check live?

| Option | Selected |
|--------|----------|
| Better Auth `trustedOrigins` config (Recommended) | ✓ |
| Extend proxy.ts with a pre-exclusion Origin check for /api/auth/sign-in/* | |
| Both layers (defense in depth) | |

### Q2: What's the enforcement scope?

| Option | Selected |
|--------|----------|
| All Better Auth mutation endpoints (Recommended via trustedOrigins config) | ✓ |
| Only /api/auth/sign-in/* (spec-literal) | |
| All mutations sitewide | |

### Q3: Where does the `trustedOrigins` list come from?

| Option | Selected |
|--------|----------|
| Derived from APP_URL + NEXT_PUBLIC_APP_URL env vars (Recommended) | ✓ |
| Hardcoded list in src/lib/auth/index.ts (per environment) | |
| New TRUSTED_ORIGINS env var (comma-separated) | |

### Q4: What does a rejected request return?

| Option | Selected |
|--------|----------|
| Better Auth default response (Recommended) | ✓ |
| Customize to return 403 with bounded code `{ error: 'forbidden_origin' }` | |

---

## Phase mechanics + plan split

### Q1: How should Phase 20 split into plans + waves?

| Option | Selected |
|--------|----------|
| 3 plans: 20-01 INFRA-03 + 20-02 INFRA-02 + 20-03 INFRA-01 (Recommended) | ✓ |
| 2 plans: 20-01 INFRA-02 + INFRA-03 bundled + 20-02 INFRA-01 standalone | |
| 1 bundled plan covering all 3 | |

### Q2: Should we skip /gsd-ui-phase 20?

| Option | Selected |
|--------|----------|
| Yes — skip (Recommended) | ✓ |
| Run /gsd-ui-phase 20 anyway | |

### Q3: How should the INFRA-01 checkpoint work?

| Option | Selected |
|--------|----------|
| Step-by-step Neon dashboard runbook in the checkpoint message (Recommended) | ✓ |
| Checkpoint just says 'do the Neon + Vercel work, type done when ready' | |
| Generate the runbook as a separate docs/operations/ file, executor references it | |

**Refinement on Q3:** the runbook is BOTH inline in the checkpoint AND persisted to `docs/operations/phase-20-rollout-checklist.md` — best of both options. The persistent doc is valuable if INFRA-01 has to be repeated (e.g., adding a 4th branch later).

---

## Claude's Discretion

- NEON_API_KEY GitHub secret provisioning (Antoine provisions; planner can't automate)
- Branch naming convention in Neon (recommend short form: `preview`, `development`)
- db-migrate.yml `branch` input default (recommend `main` default to preserve current production-only manual workflow semantics)
- Exact format of the rollout checklist Markdown (planner picks; `deploy-ovh.md` is the closest analog)
- Test approach for INFRA-03 trustedOrigins (recommend end-to-end forge-Origin Vitest)
- Whether to test VERCEL_URL fallback resolution (recommend yes for preview deploy coverage)

## Deferred Ideas

See CONTEXT.md `<deferred>` section. Notable items:
- OVH-side equivalent of Phase 20 features (v1.4+ migration)
- Integration test execution in CI db-smoke (currently-skipped `*.integration.test.ts` files; v1.4+ unlock)
- Origin gate on non-Better-Auth routes (covered by SameSite=Lax + `__Secure-` cookies)
- Custom trustedOrigins rejection response shape
- Per-partner subdomain allowlisting (v1.4+)
- 4th + Nth Neon branches for partner-tier data isolation
- Permanent dev-data seeding in `development` Neon branch
- Slack/email notification on db-smoke failure
- Auto-generation of the rollout checklist
- Per-PR ephemeral `development` branch lifecycle (DX upgrade; v1.4+)

---
